/**
 * HTTP 协议适配器
 *
 * 覆盖两类第三方设备：
 *   1. 平台提供 REST API 的设备/云平台（下发 = 调它的接口）
 *   2. 只会上报的网关/固件（上行 = 设备主动 POST 到本平台的 ingest 地址）
 *
 * 因为 IoT 设备大量部署在**局域网**，这里对私网地址采取「显式放行」策略：
 * 连接上必须勾选 allow_private_network 才允许访问内网地址，否则按 SSRF 拦截。
 */

import { assertSafeUrl } from '@/lib/security/ssrf-guard'
import { renderJsonTemplate, renderTemplate } from '../thing-model'
import type {
  ConnectionRecord,
  ProtocolAdapter,
  ProtocolMeta,
  SendContext,
  SendResult,
  TestResult,
} from './types'
import { cfgBool, cfgNum, cfgStr, fetchWithTimeout } from './types'

export const HTTP_META: ProtocolMeta = {
  id: 'http',
  name: 'HTTP / REST',
  summary: '通过 HTTP 接口控制设备，或让设备/网关主动把数据 POST 到平台。适合第三方云平台、支持 REST 的网关。',
  inbound: true,
  outbound: true,
  inboundHint: '两种方式：① 设备/网关 POST 到平台生成的上报地址；② 平台按间隔轮询设备的 GET 接口',
  fields: [
    { key: 'baseUrl', label: '服务地址', type: 'text', required: true, placeholder: 'https://api.example.com 或 http://192.168.1.50:8080', help: '下发的相对路径会拼在这个地址后；只上报的设备也要填，用于凭证校验与展示' },
    { key: 'authType', label: '认证方式', type: 'select', default: 'none', options: [{ label: '无认证', value: 'none' }, { label: 'Bearer Token', value: 'bearer' }, { label: 'Basic 认证', value: 'basic' }, { label: '自定义请求头', value: 'header' }] },
    { key: 'token', label: 'Bearer Token', type: 'password', secret: true, showWhen: { key: 'authType', in: ['bearer'] }, help: '认证方式为 Bearer 时填写' },
    { key: 'username', label: '用户名', type: 'text', secret: true, showWhen: { key: 'authType', in: ['basic'] }, help: '认证方式为 Basic 时填写' },
    { key: 'password', label: '密码', type: 'password', secret: true, showWhen: { key: 'authType', in: ['basic'] }, help: '认证方式为 Basic 时填写' },
    { key: 'authHeaderName', label: '自定义头名', type: 'text', secret: true, showWhen: { key: 'authType', in: ['header'] }, placeholder: 'X-Api-Key' },
    { key: 'authHeaderValue', label: '自定义头值', type: 'password', secret: true, showWhen: { key: 'authType', in: ['header'] } },
    { key: 'headers', label: '固定请求头（JSON）', type: 'textarea', placeholder: '{ "X-Product": "berry" }', advanced: true },
    { key: 'healthPath', label: '测试用路径', type: 'text', placeholder: '/health', advanced: true, help: '点「测试连接」时 GET 这个路径；留空则 GET 服务地址本身' },
    { key: 'pollPath', label: '轮询路径', type: 'text', placeholder: '/api/devices/{{device.external_id}}/state', help: '填写后平台会按间隔 GET 它并把响应当上报报文' },
    { key: 'pollIntervalSec', label: '轮询间隔（秒）', type: 'number', default: 60, help: '仅填写轮询路径时生效，最小 10 秒' },
    { key: 'timeoutMs', label: '超时（毫秒）', type: 'number', default: 8000, advanced: true },
  ],
}

function buildUrl(baseUrl: string, path: string): string {
  const base = baseUrl.trim().replace(/\/+$/, '')
  const p = path.trim()
  if (!p) return base
  if (/^https?:\/\//i.test(p)) return p
  return `${base}/${p.replace(/^\/+/, '')}`
}

function authHeaders(connection: ConnectionRecord): Record<string, string> {
  const type = cfgStr(connection.config, 'authType', 'none')
  const secrets = connection.secrets || {}
  const headers: Record<string, string> = {}
  if (type === 'bearer') {
    const token = typeof secrets.token === 'string' ? secrets.token : ''
    if (token) headers.Authorization = `Bearer ${token}`
  } else if (type === 'basic') {
    const u = typeof secrets.username === 'string' ? secrets.username : ''
    const p = typeof secrets.password === 'string' ? secrets.password : ''
    if (u || p) headers.Authorization = `Basic ${Buffer.from(`${u}:${p}`).toString('base64')}`
  } else if (type === 'header') {
    const name = typeof secrets.authHeaderName === 'string' ? secrets.authHeaderName : ''
    const value = typeof secrets.authHeaderValue === 'string' ? secrets.authHeaderValue : ''
    if (name) headers[name] = value
  }
  return headers
}

function parseHeaders(raw: unknown): Record<string, string> {
  if (!raw) return {}
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    const out: Record<string, string> = {}
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) out[k] = String(v)
    return out
  }
  const text = String(raw).trim()
  if (!text) return {}
  try {
    const parsed = JSON.parse(text)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const out: Record<string, string> = {}
      for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) out[k] = String(v)
      return out
    }
  } catch {
    /* 非法 JSON 交给 validate 报错 */
  }
  return {}
}

async function guardUrl(url: string, connection: ConnectionRecord, allowPrivate: boolean): Promise<string | null> {
  const privateOk = allowPrivate || connection.allow_private_network
  const check = await assertSafeUrl(url, { resolveDNS: !privateOk })
  if (!check.ok) {
    return privateOk
      ? null
      : `${check.reason || '该地址不安全'}。如果这是你的局域网设备，请在连接里勾选「允许访问内网地址」。`
  }
  return null
}

const adapter: ProtocolAdapter = {
  meta: HTTP_META,

  validate(config) {
    const errors: string[] = []
    const baseUrl = cfgStr(config, 'baseUrl').trim()
    if (!baseUrl) errors.push('服务地址必填')
    else if (!/^https?:\/\//i.test(baseUrl)) errors.push('服务地址需以 http:// 或 https:// 开头')
    const authType = cfgStr(config, 'authType', 'none')
    if (!['none', 'bearer', 'basic', 'header'].includes(authType)) errors.push('认证方式不合法')
    const headersRaw = config.headers
    if (headersRaw && typeof headersRaw === 'string' && headersRaw.trim()) {
      try {
        const parsed = JSON.parse(headersRaw)
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) errors.push('固定请求头必须是 JSON 对象')
      } catch {
        errors.push('固定请求头不是合法 JSON')
      }
    }
    const pollPath = cfgStr(config, 'pollPath').trim()
    if (pollPath) {
      const interval = cfgNum(config, 'pollIntervalSec', 60)
      if (interval < 10) errors.push('轮询间隔不能小于 10 秒（避免把设备打挂）')
    }
    return errors
  },

  async test(connection): Promise<TestResult> {
    const started = Date.now()
    const baseUrl = cfgStr(connection.config, 'baseUrl').trim()
    if (!baseUrl) return { ok: false, detail: '缺少服务地址' }
    const url = buildUrl(baseUrl, cfgStr(connection.config, 'healthPath'))
    const blocked = await guardUrl(url, connection, false)
    if (blocked) return { ok: false, detail: blocked }

    const timeout = cfgNum(connection.config, 'timeoutMs', 8000, 1000, 30000)
    try {
      const res = await fetchWithTimeout(
        url,
        { method: 'GET', headers: { Accept: 'application/json', ...parseHeaders(connection.config.headers), ...authHeaders(connection) } },
        timeout
      )
      const text = (await res.text()).slice(0, 300)
      return {
        ok: res.status >= 200 && res.status < 400,
        detail: `HTTP ${res.status}（${Date.now() - started}ms）`,
        extra: { url, status: res.status, bodyPreview: text },
      }
    } catch (e) {
      return { ok: false, detail: e instanceof Error ? e.message : String(e) }
    }
  },

  async send(ctx: SendContext, opts): Promise<SendResult> {
    const started = Date.now()
    const baseUrl = cfgStr(ctx.connection.config, 'baseUrl').trim()
    const spec = ctx.spec
    const target = buildUrl(baseUrl, spec.url ? String(renderTemplate(spec.url, ctx.vars) ?? '') : '')
    if (!target) return { ok: false, error: '该动作没有配置请求地址' }
    const blocked = await guardUrl(target, ctx.connection, !!opts?.allowPrivateNetwork)
    if (blocked) return { ok: false, error: blocked }

    const method = (spec.method || 'POST').toUpperCase()
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...parseHeaders(ctx.connection.config.headers),
      ...authHeaders(ctx.connection),
      ...(spec.headers || {}),
    }

    let body: string | undefined
    const rawBody = spec.body ?? spec.payload
    if (rawBody && method !== 'GET' && method !== 'HEAD') {
      try {
        const rendered = renderJsonTemplate(rawBody, ctx.vars)
        body = typeof rendered === 'string' ? rendered : JSON.stringify(rendered)
        headers['Content-Type'] = headers['Content-Type'] || 'application/json'
      } catch {
        body = String(renderTemplate(rawBody, ctx.vars) ?? '')
      }
    }

    const timeout = cfgNum(ctx.connection.config, 'timeoutMs', 8000, 1000, 30000)
    const request = { protocol: 'http', method, url: target, headers, body }

    try {
      const res = await fetchWithTimeout(target, { method, headers, body }, timeout)
      const text = await res.text()
      let parsed: unknown = text
      try { parsed = text ? JSON.parse(text) : null } catch { /* 保留原文 */ }
      return {
        ok: res.ok,
        request,
        response: typeof parsed === 'string' ? parsed.slice(0, 800) : parsed,
        error: res.ok ? undefined : `HTTP ${res.status}`,
        durationMs: Date.now() - started,
      }
    } catch (e) {
      return {
        ok: false,
        request,
        error: e instanceof Error ? e.message : String(e),
        durationMs: Date.now() - started,
      }
    }
  },
}

export default adapter
export { buildUrl, authHeaders, guardUrl, parseHeaders }
