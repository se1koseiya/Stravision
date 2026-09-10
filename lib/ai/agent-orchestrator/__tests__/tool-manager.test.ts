/**
 * 工具管理器测试
 *
 * 锁定三条硬约束：
 *   1. 超时定时器必须清理 —— 否则 Promise.race 结束后仍会 reject，
 *      产生 unhandled rejection，可直接打挂 Node 进程
 *   2. 工具返回 success:false 时应与抛异常同等对待，走重试判定
 *      （executeToolInternal 把所有异常吞成 success:false，
 *       若不再判定一次，重试机制对工具内部错误完全失效）
 *   3. NO_RETRY_TOOLS 绝不重试 —— MQTT 指令重复下发会造成物理误动作
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/mcp/mcp-tool-executor', () => ({
  executeMCPToolCall: vi.fn()
}))

import { ToolManager, DEFAULT_TOOL_CONFIG } from '../tool-manager'
import { executeMCPToolCall } from '@/lib/mcp/mcp-tool-executor'

const APP_URL = 'http://localhost:3000'
const FAST_CONFIG = { retryDelay: 1, enableLogging: false }

function makeCall(name: string, id = 'call-1') {
  return { id, name, arguments: {} }
}

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('ToolManager - 基本执行', () => {
  it('工具成功时透传结果并记录耗时', async () => {
    vi.mocked(executeMCPToolCall).mockResolvedValue({ success: true, data: { ok: 1 } })
    const tm = new ToolManager()

    const res = await tm.executeTool(makeCall('get_sensor_history') as any, [], APP_URL, FAST_CONFIG)

    expect(res.success).toBe(true)
    expect(res.data).toEqual({ ok: 1 })
    expect(typeof res.executionTime).toBe('number')
  })

  it('工具抛异常时收敛为失败结果而非向上抛', async () => {
    vi.mocked(executeMCPToolCall).mockRejectedValue(new Error('boom'))
    const tm = new ToolManager()

    const res = await tm.executeTool(makeCall('get_sensor_history') as any, [], APP_URL, {
      ...FAST_CONFIG,
      maxRetries: 0
    })

    expect(res.success).toBe(false)
    expect(res.error).toBe('boom')
  })
})

describe('ToolManager - 重试策略', () => {
  it('网络类错误（不可重试工具除外）应触发重试', async () => {
    vi.mocked(executeMCPToolCall)
      .mockResolvedValueOnce({ success: false, error: 'fetch failed' })
      .mockResolvedValueOnce({ success: true, data: { ok: 2 } })
    const tm = new ToolManager()

    const res = await tm.executeTool(makeCall('web_search') as any, [], APP_URL, {
      ...FAST_CONFIG,
      maxRetries: 2
    })

    expect(res.success).toBe(true)
    expect(executeMCPToolCall).toHaveBeenCalledTimes(2)
  })

  it('NO_RETRY_TOOLS 即使遇到网络错误也只执行一次', async () => {
    vi.mocked(executeMCPToolCall).mockResolvedValue({ success: false, error: 'network error' })
    const tm = new ToolManager()

    await tm.executeTool(makeCall('toggle_relay') as any, [], APP_URL, {
      ...FAST_CONFIG,
      maxRetries: 2
    })

    expect(executeMCPToolCall).toHaveBeenCalledTimes(1)
  })

  it('参数错误不重试', async () => {
    vi.mocked(executeMCPToolCall).mockResolvedValue({ success: false, error: '必须指定至少一个指标' })
    const tm = new ToolManager()

    await tm.executeTool(makeCall('get_sensor_history') as any, [], APP_URL, {
      ...FAST_CONFIG,
      maxRetries: 2
    })

    expect(executeMCPToolCall).toHaveBeenCalledTimes(1)
  })
})

describe('ToolManager - 超时与资源清理', () => {
  it('执行超时时抛出错误', async () => {
    vi.mocked(executeMCPToolCall).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ success: true }), 500))
    )
    const tm = new ToolManager()

    // 注意：web_search 有 30000ms 的超时覆盖，这里必须用无覆盖的工具名才能测到传入的 timeout
    await expect(
      tm.executeTool(makeCall('get_sensor_history') as any, [], APP_URL, {
        ...FAST_CONFIG,
        maxRetries: 0,
        timeout: 30
      })
    ).rejects.toThrow(/timeout/i)
  })

  it('超时按工具名覆盖，设备控制类工具用更长超时', async () => {
    vi.mocked(executeMCPToolCall).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ success: true, data: {} }), 60))
    )
    const tm = new ToolManager()

    // move_camera_and_look 覆盖为 120s，60ms 的执行不该超时
    const res = await tm.executeTool(makeCall('move_camera_and_look') as any, [], APP_URL, {
      ...FAST_CONFIG,
      maxRetries: 0,
      timeout: 30
    })

    expect(res.success).toBe(true)
  })

  it('竞态结束后不残留定时器，不产生 unhandled rejection', async () => {
    const unhandled: unknown[] = []
    const onUnhandled = (reason: unknown) => unhandled.push(reason)
    process.on('unhandledRejection', onUnhandled)

    vi.mocked(executeMCPToolCall).mockResolvedValue({ success: true, data: {} })
    const tm = new ToolManager()

    await tm.executeTool(makeCall('web_search') as any, [], APP_URL, {
      ...FAST_CONFIG,
      maxRetries: 0,
      timeout: 40
    })

    // 等待超过 timeout，确认没有迟到的 rejection 逃逸
    await new Promise(r => setTimeout(r, 150))

    process.off('unhandledRejection', onUnhandled)
    expect(unhandled).toHaveLength(0)
  })
})
