import { NextRequest, NextResponse } from 'next/server'
import fs from 'node:fs/promises'
import path from 'node:path'
import { getCurrentUser } from '@/lib/auth'
import { IS_DESKTOP_APP } from '@/lib/desktop-mode'

/**
 * 探测 AI 提供商连通性 + 拉取上游可用模型列表
 *
 * 存在的意义（2026-10-01，用户反馈「添加提供商不便用户设置」）：
 *   旧表单让用户手敲 Base URL / API Key / 模型 ID（如 kimi-k2.6），填完还要保存后到聊天页试才知道对不对。
 *   这里提供「一次探测」：拿用户的 baseUrl + apiKey 请求上游 `/models`，
 *   既验证 Key 是否有效，又把上游真实模型清单带回来给用户勾选。
 *
 * 🚨 业务失败一律返回 HTTP 200 + `{ ok: false, error }`：调用方只需判断 ok，
 *    不必区分「网络失败 / 401 / 404」，减少前端分支。只有鉴权失败才用 401。
 */

const CONFIG_PATH = path.join(process.cwd(), 'data', 'ai-providers-config.json')

async function checkAdminAuth(_request: NextRequest) {
  // getCurrentUser() 不接受参数（内部自行 await cookies()），传 request 会 TS2554
  const user = await getCurrentUser()
  if (!user) return null
  // 桌面端放行（本地单用户形态，与 app/api/admin/ai-providers/route.ts 保持一致）
  if (IS_DESKTOP_APP) return user
  if (user.role !== 'admin' && user.role !== 'super_admin') return null
  return user
}

/** 前端回显的是脱敏 Key（前4 + 星号 + 后4），不能直接拿去请求上游 */
function looksMasked(k: string) {
  return /^.{1,4}\*{2,}.{1,4}$/.test(k)
}

function normalizeBaseUrl(u: string) {
  return u.trim().replace(/\/+$/, '')
}

export async function POST(request: NextRequest) {
  const user = await checkAdminAuth(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ ok: false, error: '请求体不是合法 JSON' })
  }

  const baseUrl = typeof body.baseUrl === 'string' ? body.baseUrl : ''
  const rawKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : ''
  const providerId = typeof body.providerId === 'string' ? body.providerId : ''

  if (!baseUrl.trim()) {
    return NextResponse.json({ ok: false, error: '请先填写 Base URL' })
  }

  // 编辑既有提供商时，用户可能不重填 Key（前端展示的是脱敏值）→ 回退到已保存的真实 Key
  let apiKey = rawKey
  if ((!apiKey || looksMasked(apiKey)) && providerId) {
    try {
      const raw = JSON.parse(await fs.readFile(CONFIG_PATH, 'utf8'))
      const found = (raw.providers || []).find((p: { id?: string }) => p.id === providerId)
      if (found?.apiKey) apiKey = String(found.apiKey)
    } catch {
      /* 文件不存在或损坏，保持原值 */
    }
  }

  if (!apiKey) {
    return NextResponse.json({ ok: false, error: '请先填写 API Key' })
  }

  const url = `${normalizeBaseUrl(baseUrl)}/models`
  const t0 = Date.now()
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 20000)

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
      signal: ctrl.signal,
      cache: 'no-store',
    })
    const latencyMs = Date.now() - t0
    const text = await res.text()

    let json: Record<string, unknown> | null = null
    try {
      json = JSON.parse(text)
    } catch {
      /* 非 JSON（网关 HTML 错误页等） */
    }

    if (!res.ok) {
      const errObj = json?.error as { message?: string } | undefined
      const detail =
        (typeof errObj?.message === 'string' && errObj.message) ||
        (typeof json?.message === 'string' && json.message) ||
        text.slice(0, 300)
      return NextResponse.json({
        ok: false,
        status: res.status,
        error: `上游返回 ${res.status}`,
        detail,
        latencyMs,
      })
    }

    // OpenAI 兼容返回 { data: [...] }；少数平台用 { models: [...] }
    const list = Array.isArray(json?.data)
      ? (json.data as unknown[])
      : Array.isArray(json?.models)
        ? (json.models as unknown[])
        : []

    const models = list
      .map((m) => {
        const item = m as { id?: unknown; name?: unknown; owned_by?: unknown }
        const id = String(item.id ?? item.name ?? '').trim()
        return {
          id,
          ownedBy: typeof item.owned_by === 'string' ? item.owned_by : undefined,
        }
      })
      .filter((m) => m.id)

    return NextResponse.json({ ok: true, models, count: models.length, latencyMs })
  } catch (e) {
    const latencyMs = Date.now() - t0
    const err = e as { name?: string; message?: string; cause?: { code?: string } }
    let msg = err?.message || '网络请求失败'
    if (err?.name === 'AbortError') msg = '连接超时（20 秒）'
    // 常见 Node fetch 失败的裸信息对用户没意义，翻译成可行动提示
    if (/fetch failed|ENOTFOUND|EAI_AGAIN/i.test(msg)) {
      msg = '域名无法解析，请检查 Base URL 是否写错'
    } else if (/ECONNREFUSED/i.test(msg)) {
      msg = '连接被拒绝，请检查 Base URL 端口或网络'
    } else if (/certificate|self-signed/i.test(msg)) {
      msg = 'TLS 证书校验失败，请检查 Base URL 协议'
    }
    return NextResponse.json({ ok: false, error: msg, latencyMs })
  } finally {
    clearTimeout(timer)
  }
}
