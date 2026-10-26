/**
 * 并行工具执行器 · 批次规划测试
 *
 * 锁定的是「什么情况下必须串行」这条安全底线 —— 一旦有人不小心放宽，
 * 后果是电机行程互相打断、同一继电器被并发重复动作、或读到中间态数据。
 *
 * 同时反过来锁住「什么情况下应该并行」，避免有人为了省事一刀切全串行。
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

import {
  planToolBatches,
  executeToolCallsInParallel,
  canExecuteInParallel,
} from './parallel-tool-executor'
import { hasResourceConflict, isToolDeclared, TOOL_CAPABILITIES } from './tool-capabilities'
import type { ToolCall } from './agent-orchestrator/types'

let seq = 0
function call(name: string, id?: string): ToolCall {
  return { id: id ?? `call-${++seq}`, name, arguments: {}, timestamp: Date.now() }
}

/** 批次里每个批次的工具名 */
function batchNames(calls: ToolCall[]): string[][] {
  return planToolBatches(calls).batches.map(b => b.map(tc => tc.name))
}

beforeEach(() => {
  seq = 0
})

describe('资源冲突判定', () => {
  it('写-写冲突：两个动摄像头的工具不能并发', () => {
    expect(hasResourceConflict('control_camera', 'move_camera_and_look')).toBe(true)
    expect(hasResourceConflict('reset_camera', 'control_camera')).toBe(true)
  })

  it('写-读冲突：抓帧不能与移动摄像头并发（旧实现会误判为可并行）', () => {
    expect(hasResourceConflict('take_camera_snapshot', 'move_camera_and_look')).toBe(true)
    expect(hasResourceConflict('take_camera_snapshot', 'control_camera')).toBe(true)
  })

  it('读-读不冲突：两个只读工具可以并发', () => {
    expect(hasResourceConflict('list_devices', 'task_list')).toBe(false)
    expect(hasResourceConflict('get_sensor_history', 'task_list')).toBe(false)
  })

  it('互不相干的资源可以并发', () => {
    expect(hasResourceConflict('toggle_relay', 'control_camera')).toBe(false)
    expect(hasResourceConflict('set_led', 'update_medical_record')).toBe(false)
  })

  it('同一个工具多次调用一律串行（防重复动作）', () => {
    expect(hasResourceConflict('toggle_relay', 'toggle_relay')).toBe(true)
    expect(hasResourceConflict('get_sensor_history', 'get_sensor_history')).toBe(true)
  })
})

describe('planToolBatches · 应当并行', () => {
  it('纯查询工具全部并到一批', () => {
    const calls = [
      call('get_sensor_history'),
      call('mcp_gaode_weather'),
      call('web_search'),
      call('task_list'),
    ]
    expect(batchNames(calls)).toEqual([
      ['get_sensor_history', 'mcp_gaode_weather', 'web_search', 'task_list'],
    ])
    expect(canExecuteInParallel(calls)).toBe(true)
  })

  it('不同资源的写操作可以并发', () => {
    const calls = [call('toggle_relay'), call('set_led'), call('update_task')]
    expect(batchNames(calls)).toEqual([['toggle_relay', 'set_led', 'update_task']])
  })

  it('不同的未登记工具（第三方 MCP）仍可并行', () => {
    const calls = [call('mcp_custom_alpha'), call('mcp_custom_beta')]
    expect(batchNames(calls)).toEqual([['mcp_custom_alpha', 'mcp_custom_beta']])
  })
})

describe('planToolBatches · 应当串行', () => {
  it('两个 control_camera 被拆成两批（旧版会被判为可并行）', () => {
    expect(batchNames([call('control_camera'), call('control_camera')])).toEqual([
      ['control_camera'],
      ['control_camera'],
    ])
  })

  it('先移动后抓帧：保持模型给出的顺序', () => {
    expect(batchNames([call('move_camera_and_look'), call('take_camera_snapshot')])).toEqual([
      ['move_camera_and_look'],
      ['take_camera_snapshot'],
    ])
  })

  it('写者与读者不同槽时不串行', () => {
    expect(batchNames([call('task_create'), call('cron_list')])).toEqual([
      ['task_create', 'cron_list'],
    ])
  })

  it('写者与同一槽的读者串行', () => {
    expect(batchNames([call('update_task'), call('task_list')])).toEqual([
      ['update_task'],
      ['task_list'],
    ])
  })

  it('dependsOn：诊断排在联网检索之后（迁移期规则）', () => {
    expect(batchNames([call('diagnose_plant_image'), call('web_search')])).toEqual([
      ['web_search'],
      ['diagnose_plant_image'],
    ])
  })

  it('dependsOn 只对本批次内存在的前置工具生效', () => {
    // web_search 不在本次批次里 → 依赖视为已满足（跨 turn 的依赖不该在这里管）
    expect(batchNames([call('diagnose_plant_image'), call('get_sensor_history')])).toEqual([
      ['diagnose_plant_image', 'get_sensor_history'],
    ])
  })

  it('同名未登记工具被拆成两批', () => {
    expect(batchNames([call('mcp_custom_alpha'), call('mcp_custom_alpha')])).toEqual([
      ['mcp_custom_alpha'],
      ['mcp_custom_alpha'],
    ])
  })
})

describe('planToolBatches · 不变量', () => {
  const cases: ToolCall[][] = [
    [call('control_camera'), call('take_camera_snapshot'), call('toggle_relay')],
    [call('update_task'), call('task_list'), call('cron_create'), call('task_create')],
    [call('web_search'), call('diagnose_plant_image'), call('take_camera_snapshot')],
    [call('unknown_tool'), call('unknown_tool'), call('unknown_tool')],
    [call('reset_camera'), call('move_camera_and_look'), call('control_camera')],
  ]

  it('每个工具恰好被分配一次，不多不少（含去重与顺序）', () => {
    for (const calls of cases) {
      const { batches } = planToolBatches(calls)
      const flattened = batches.flat()
      expect(flattened.map(tc => tc.id).sort()).toEqual(calls.map(tc => tc.id).sort())
    }
  })

  it('批次非空且总批数不超过工具数', () => {
    for (const calls of cases) {
      const { batches } = planToolBatches(calls)
      expect(batches.length).toBeGreaterThan(0)
      expect(batches.length).toBeLessThanOrEqual(calls.length)
      for (const b of batches) expect(b.length).toBeGreaterThan(0)
    }
  })

  it('空输入不炸', () => {
    expect(planToolBatches([]).batches).toEqual([])
  })

  it('canExecuteInParallel 与「是否只一批」语义一致', () => {
    expect(canExecuteInParallel([])).toBe(true)
    expect(canExecuteInParallel([call('get_sensor_history')])).toBe(true)
    expect(canExecuteInParallel([call('control_camera'), call('take_camera_snapshot')])).toBe(false)
  })
})

describe('executeToolCallsInParallel · 真实执行时序', () => {
  it('冲突的工具不会真正并发（并发峰值为 1），且顺序正确', async () => {
    let concurrent = 0
    let peak = 0
    const order: string[] = []

    const orchestrator = {
      executeToolCall: vi.fn(async (tc: ToolCall) => {
        concurrent++
        peak = Math.max(peak, concurrent)
        // 故意沿用真实竞态窗口，确保不是靠"刚好碰巧"通过
        await new Promise(r => setTimeout(r, 10))
        order.push(tc.name)
        concurrent--
        return { id: tc.id, success: true, executionTime: 10 }
      }),
    } as unknown as any

    const calls = [call('move_camera_and_look'), call('take_camera_snapshot')]
    const results = await executeToolCallsInParallel(calls, orchestrator, {} as any)

    expect(orchestrator.executeToolCall).toHaveBeenCalledTimes(2)
    // 两批串行 → 任意时刻只有一个在执行
    expect(peak).toBe(1)
    expect(order).toEqual(['move_camera_and_look', 'take_camera_snapshot'])
    expect(results.size).toBe(2)
  })

  it('无冲突的工具真正并行（并发峰值 = 2）', async () => {
    let concurrent = 0
    let peak = 0

    const orchestrator = {
      executeToolCall: vi.fn(async (tc: ToolCall) => {
        concurrent++
        peak = Math.max(peak, concurrent)
        await new Promise(r => setTimeout(r, 10))
        concurrent--
        return { id: tc.id, success: true, executionTime: 10 }
      }),
    } as unknown as any

    const calls = [call('toggle_relay'), call('get_sensor_history')]
    await executeToolCallsInParallel(calls, orchestrator, {} as any)

    expect(peak).toBe(2)
  })

  it('工具抛异常时收敛为失败结果，不会掀掉整批', async () => {
    const orchestrator = {
      executeToolCall: vi.fn(async (tc: ToolCall) => {
        if (tc.name === 'get_sensor_history') throw new Error('boom')
        return { id: tc.id, success: true, executionTime: 1 }
      }),
    } as unknown as any

    // 结果按 toolCall.id 索引（不是工具名）
    const relay = call('toggle_relay', 'id-relay')
    const sensor = call('get_sensor_history', 'id-sensor')
    const results = await executeToolCallsInParallel([relay, sensor], orchestrator, {} as any)

    expect(results.size).toBe(2)
    expect(results.get('id-relay').success).toBe(true)
    expect(results.get('id-sensor').success).toBe(false)
    expect(results.get('id-sensor').error).toBe('boom')
  })

  it('onProgress 在每个工具完成后各回调一次', async () => {
    const orchestrator = {
      executeToolCall: vi.fn(async (tc: ToolCall) => ({ id: tc.id, success: true, executionTime: 1 })),
    } as unknown as any

    const progress: Array<[number, number, string]> = []
    const calls = [call('update_task'), call('task_list')]
    await executeToolCallsInParallel(calls, orchestrator, {} as any, (c, t, n) => {
      progress.push([c, t, n])
    })

    expect(progress.map(p => p[0])).toEqual([1, 2])
    expect(progress.every(p => p[1] === 2)).toBe(true)
  })
})

describe('能力表完整性', () => {
  it('已登记的工具不得出现空壳条目（既无读写也无依赖）', () => {
    // 空壳条目 = 有人登记了但什么都没声明，等于"看着登记了、实际按未知工具处理"
    for (const [name, cap] of Object.entries(TOOL_CAPABILITIES)) {
      expect(!cap.writes && !cap.reads && !cap.dependsOn, `${name} 登记了但没有声明任何读写/依赖`).toBe(false)
    }
  })

  it('几个高频工具必须已登记（防止误删表项导致退化成"未知工具"策略）', () => {
    for (const name of [
      'control_camera',
      'take_camera_snapshot',
      'toggle_relay',
      'update_task',
      'automation_strategy_create',
      'update_medical_record',
    ]) {
      expect(isToolDeclared(name), `${name} 应登记在 TOOL_CAPABILITIES`).toBe(true)
    }
  })
})
