import { describe, expect, it } from 'vitest'
import {
  getClientToolDefinitions,
  getClientToolDefinitionsByNames,
  isClientSideTool,
} from '../mcp-tool-definitions'

/**
 * 前端工具注入契约
 *
 * 这一层最容易出的错是「静默」的：工具没被注入 → 模型根本看不到它 →
 * 它会转而用文字教用户操作，看起来像「AI 不肯帮我做」，而不是报错。
 * 所以这里锁三件事：能力门控、多组工具都在扫描范围内、按名字兜底能命中。
 */

const DEVICE_ACCESS_TOOLS = [
  'device_access_catalog',
  'device_access_apply_draft',
  'device_form_read',
  'device_form_patch',
]

describe('前端工具（client tool）注入', () => {
  it('未声明能力 → 一个前端工具都不下发', () => {
    expect(getClientToolDefinitions([])).toEqual([])
  })

  it('声明 device-access → 下发四个接入工具', () => {
    const names = getClientToolDefinitions(['device-access']).map((t) => t.function.name)
    expect(names.sort()).toEqual([...DEVICE_ACCESS_TOOLS].sort())
  })

  it('声明 automation-canvas 不会顺带下发接入工具（能力互不串门）', () => {
    const names = getClientToolDefinitions(['automation-canvas']).map((t) => t.function.name)
    expect(names).toContain('automation_canvas_apply')
    for (const n of DEVICE_ACCESS_TOOLS) expect(names).not.toContain(n)
  })

  it('接入工具都登记为「前端执行」（否则会被送进服务端 executor 报 missing）', () => {
    for (const n of DEVICE_ACCESS_TOOLS) expect(isClientSideTool(n)).toBe(true)
    expect(isClientSideTool('list_devices')).toBe(false)
  })

  it('load_tool_schema 兜底：按名字能取回，且不受能力门控影响', () => {
    const one = getClientToolDefinitionsByNames(['device_access_apply_draft'])
    expect(one.map((t) => t.function.name)).toEqual(['device_access_apply_draft'])
  })

  it('schema 自洽：必填参数声明齐全（模型据此才能填对）', () => {
    const [catalog, apply] = ['device_access_catalog', 'device_access_apply_draft'].map(
      (n) => getClientToolDefinitionsByNames([n])[0].function
    )
    expect(catalog.parameters?.properties).toHaveProperty('protocol')
    expect(apply.parameters?.required).toEqual(['device'])
    const device = (apply.parameters?.properties as Record<string, { required?: string[] }>).device
    expect(device.required).toEqual(['name', 'thing_model'])
  })

  it('表单读写工具：kind 枚举一致，patch 必填 fields（否则模型会空手调用）', () => {
    const [read, patch] = ['device_form_read', 'device_form_patch'].map(
      (n) => getClientToolDefinitionsByNames([n])[0].function
    )
    const kinds = ['access-wizard', 'access-connection', 'device-registry']
    const readKind = read.parameters?.properties?.kind as { enum?: string[] }
    const patchKind = patch.parameters?.properties?.kind as { enum?: string[] }
    expect(readKind.enum?.sort()).toEqual([...kinds].sort())
    expect(patchKind.enum?.sort()).toEqual([...kinds].sort())
    expect(patch.parameters?.required).toEqual(['fields'])
    // read 无必填参数：不传 kind 就读「用户当前在填的那张」
    expect(read.parameters?.required ?? []).toEqual([])
  })
})
