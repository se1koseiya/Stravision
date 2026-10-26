import { afterEach, describe, expect, it } from 'vitest'
import {
  describeActiveForm,
  listActiveForms,
  patchActiveForm,
  readActiveForm,
  registerFormHost,
  type FormKind,
  type FormSnapshot,
  type PatchOutcome,
} from '../form-state'

/**
 * 表单状态注册表契约
 *
 * 这一层出错的样子很隐蔽：模型「看不到」用户填到哪一步 → 它会凭对话记忆猜 →
 * 猜错就把用户改好的值覆盖回去，用户只觉得「AI 乱填」，日志里没有任何报错。
 * 所以这里把「谁是当前表单 / 没有表单时要如实说 / 补丁只走活跃表单」锁死。
 */

/** 每个用例结束后把注册表清空（模块级 Map 是跨用例共享的） */
const cleanups: Array<() => void> = []
function mount(host: Parameters<typeof registerFormHost>[0]) {
  cleanups.push(registerFormHost(host))
  return host
}
afterEach(() => {
  while (cleanups.length) cleanups.pop()!()
})

function snapshot(kind: FormKind, over: Partial<FormSnapshot> = {}): FormSnapshot {
  return {
    kind,
    title: '测试表单',
    step: null,
    steps: [],
    stepTitle: '',
    fields: [],
    blocks: [],
    missing: [],
    issues: [],
    summary: '',
    hint: '',
    ...over,
  }
}

/** 造一个测试用宿主 */
function host(
  kind: FormKind,
  opts: { active?: boolean; snap?: Partial<FormSnapshot>; throwOnRead?: boolean } = {},
) {
  const seen: Record<string, unknown>[] = []
  return {
    seen,
    impl: {
      kind,
      isActive: () => opts.active ?? true,
      read: () => {
        if (opts.throwOnRead) throw new Error('read 炸了')
        return snapshot(kind, opts.snap)
      },
      patch: (fields: Record<string, unknown>): PatchOutcome => {
        seen.push(fields)
        return { ok: true, applied: Object.keys(fields), ignored: [], issues: [], summary: 'ok' }
      },
    } as const,
  }
}

describe('表单状态注册表 · 当前表单的判定', () => {
  it('没有任何表单打开 → readActiveForm 返回 null（模型不得凭空编造）', () => {
    expect(readActiveForm()).toBeNull()
    expect(describeActiveForm()).toBeNull()
    expect(listActiveForms()).toEqual([])
  })

  it('未打开的表单不算「当前表单」', () => {
    mount(host('access-wizard', { active: false }).impl)
    expect(readActiveForm()).toBeNull()
  })

  it('同时开着多张表 → 取向导（它才是用户正在敲的那一格）', () => {
    mount(host('device-registry').impl)
    mount(host('access-connection').impl)
    mount(host('access-wizard').impl)
    expect(readActiveForm()?.kind).toBe('access-wizard')
  })

  it('向导没开时，连接表单优先于专属硬件表单', () => {
    mount(host('device-registry').impl)
    mount(host('access-connection').impl)
    mount(host('access-wizard', { active: false }).impl)
    expect(readActiveForm()?.kind).toBe('access-connection')
  })

  it('指定 kind 时按 kind 取，不受优先级影响', () => {
    mount(host('device-registry').impl)
    mount(host('access-wizard').impl)
    expect(readActiveForm('device-registry')?.kind).toBe('device-registry')
  })

  it('同一 kind 后注册者覆盖前者（多个页面实例挂载时以最新的为准）', () => {
    mount(host('access-wizard', { snap: { title: '旧实例' } }).impl)
    mount(host('access-wizard', { snap: { title: '新实例' } }).impl)
    expect(readActiveForm()?.title).toBe('新实例')
  })

  it('某张表读状态炸了不影响其它表', () => {
    mount(host('access-wizard', { throwOnRead: true }).impl)
    mount(host('device-registry', { snap: { title: '兜底' } }).impl)
    // 炸掉的那张仍在活跃列表里（优先级最高），但 read 返回 null 而不是把整条链路带崩
    expect(readActiveForm()).toBeNull()
    // 显式指定另一张表仍可用
    expect(readActiveForm('device-registry')?.title).toBe('兜底')
  })

  it('注销后不再被命中', () => {
    const un = registerFormHost(host('access-wizard', { snap: { title: '待注销' } }).impl)
    expect(readActiveForm()?.title).toBe('待注销')
    un()
    expect(readActiveForm()).toBeNull()
  })
})

describe('表单状态注册表 · 增量补丁路由', () => {
  it('补丁打到当前活跃表单', () => {
    const wizard = host('access-wizard')
    mount(host('device-registry').impl)
    mount(wizard.impl)
    const out = patchActiveForm(null, { name: '3 号棚温湿度计' })
    expect(out.ok).toBe(true)
    expect(out.applied).toEqual(['name'])
    expect(wizard.seen).toEqual([{ name: '3 号棚温湿度计' }])
  })

  it('指定 kind 时打到指定的那张表', () => {
    const wizard = host('access-wizard')
    const registry = host('device-registry')
    mount(wizard.impl)
    mount(registry.impl)
    patchActiveForm('device-registry', { node_id: 'node0601' })
    expect(wizard.seen).toEqual([])
    expect(registry.seen).toEqual([{ node_id: 'node0601' }])
  })

  it('没有活跃表单 → ok:false 且给出引导，而不是静默丢弃', () => {
    const out = patchActiveForm(null, { name: 'x' })
    expect(out.ok).toBe(false)
    expect(out.applied).toEqual([])
    expect(out.ignored).toEqual(['name'])
    expect(out.issues.join()).toContain('没有打开任何设备表单')
  })

  it('宿主 patch 抛异常 → 收敛成 ok:false，不让对话断掉', () => {
    mount({
      kind: 'access-wizard',
      isActive: () => true,
      read: () => snapshot('access-wizard'),
      patch: () => {
        throw new Error('boom')
      },
    })
    const out = patchActiveForm(null, { name: 'x' })
    expect(out.ok).toBe(false)
    expect(out.issues.join()).toContain('boom')
  })
})

describe('describeActiveForm · 注入 systemPrompt 的一行现状', () => {
  it('带步骤、已填项与缺失项', () => {
    mount(
      host('access-wizard', {
        snap: {
          step: 1,
          steps: ['基础信息', '设备能力', '上报接入'],
          stepTitle: '设备能力',
          title: '接入第三方设备',
          fields: [
            { key: 'name', label: '设备名称', value: '3 号棚温湿度计', required: true, filled: true },
            { key: 'external_id', label: '外部设备 ID', value: '', required: false, filled: false },
          ],
          missing: ['外部设备 ID'],
        },
      }).impl,
    )
    const line = describeActiveForm()!
    expect(line).toContain('第 2/3 步')
    expect(line).toContain('设备能力')
    expect(line).toContain('设备名称=3 号棚温湿度计')
    expect(line).toContain('还缺：外部设备 ID')
  })

  it('凭证只说「已填写」，绝不把值写进上下文', () => {
    mount(
      host('access-connection', {
        snap: {
          fields: [
            { key: 'secrets.password', label: '密码', value: 'hunter2', required: true, filled: true, secret: true },
          ],
        },
      }).impl,
    )
    const line = describeActiveForm()!
    expect(line).not.toContain('hunter2')
    expect(line).toContain('密码')
  })

  it('一张都没填时如实说「还没有填任何字段」', () => {
    mount(host('device-registry').impl)
    expect(describeActiveForm()).toContain('还没有填任何字段')
  })
})
