/**
 * MCP 工具执行器测试
 *
 * 背景：app/api/chat/route.ts 有 9 处「🔥 Bug 修复」注释，绝大多数源于
 * 工具执行路径的异常逃逸（thrown error 打断 Agent Loop）与返回值形状不一致。
 * 本测试锁定两条硬约束：
 *   1. executeMCPToolCall 任何路径都返回 { success, error? }，绝不 throw
 *   2. 已下架的空壳工具不得重新可路由（防止有人照着旧文档加回来）
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db/device-service', () => ({
  getMultiSensorHistory: vi.fn()
}))

vi.mock('@/lib/ai/skill-system/skill-manager', () => ({
  skillManager: {
    getSkill: vi.fn(),
    loadSkill: vi.fn()
  }
}))

vi.mock('../builtin-device-control', () => ({
  executeDeviceControlTool: vi.fn(),
  isMultimodal: vi.fn(() => false)
}))

vi.mock('../builtin-agent-tasks', () => ({
  executeAgentTaskTool: vi.fn()
}))

vi.mock('../builtin-deep-research', () => ({
  executeDeepResearchTool: vi.fn()
}))

vi.mock('../builtin-skill-forge', () => ({
  executeSkillForgeTool: vi.fn()
}))

vi.mock('../builtin-farm-data', () => ({
  executeFarmTool: vi.fn()
}))

vi.mock('../builtin-user-memory', () => ({
  executeUserMemoryTool: vi.fn()
}))

vi.mock('../spectrum-connection-pool', () => ({
  spectrumConnectionPool: {
    executeToolCall: vi.fn()
  }
}))

import { executeMCPToolCall } from '../mcp-tool-executor'
import { getMCPToolDefinitions } from '../mcp-tool-definitions'
import { getMultiSensorHistory } from '@/lib/db/device-service'
import { executeDeviceControlTool } from '../builtin-device-control'
import { executeFarmTool } from '../builtin-farm-data'
import { executeUserMemoryTool } from '../builtin-user-memory'
import { spectrumConnectionPool } from '../spectrum-connection-pool'

const APP_URL = 'http://localhost:3000'

function makePoints(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    timestamp: new Date(Date.UTC(2026, 8, 1, i)).toISOString(),
    value: 20 + i * 0.1
  }))
}

function sensorResult(pointCount: number) {
  return {
    metrics: [
      {
        key: 'air_temp',
        label: '空气温度',
        unit: '°C',
        stats: { min: 20, max: 25, avg: 22.5, latest: 24 },
        points: makePoints(pointCount)
      }
    ]
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('工具注册表 - 内置能力基线', () => {
  it('未启用任何外部服务时仍注入 47 个内置工具（2026-10-21 新增文档三件套后）', () => {
    const tools = getMCPToolDefinitions([])
    expect(tools).toHaveLength(47)
  })

  it('文档处理三件套始终可用', () => {
    const names = getMCPToolDefinitions([]).map(t => t.function.name)
    for (const docTool of ['document_read', 'document_create', 'document_edit']) {
      expect(names).toContain(docTool)
    }
  })

  it('注册表不含已下架的空壳工具', () => {
    const names = getMCPToolDefinitions([]).map(t => t.function.name)
    for (const removed of [
      'mcp_soil_sensor_query',
      'mcp_crop_disease_diagnose',
      'mcp_irrigation_query',
      'mcp_farm_data_query'
    ]) {
      expect(names).not.toContain(removed)
    }
  })

  it('农业业务核心工具保持可用', () => {
    const names = getMCPToolDefinitions([]).map(t => t.function.name)
    for (const core of [
      'get_sensor_history',
      'list_devices',
      'toggle_relay',
      'control_camera',
      'take_camera_snapshot',
      'move_camera_and_look'
    ]) {
      expect(names).toContain(core)
    }
  })

  it('内置农业工具与巡检工具无需任何外部配置即可调用', () => {
    const names = getMCPToolDefinitions([]).map(t => t.function.name)
    for (const farm of [
      'get_current_conditions',
      'analyze_soil',
      'get_device_activity',
      'generate_inspection_report'
    ]) {
      expect(names).toContain(farm)
    }
  })

  it('内置记忆工具（记住/更新/删除用户信息）无需外部配置即可调用', () => {
    const names = getMCPToolDefinitions([]).map(t => t.function.name)
    for (const mem of ['remember_user_info', 'list_user_memory', 'forget_user_info']) {
      expect(names).toContain(mem)
    }
  })
})

describe('executeMCPToolCall - 路由与降级', () => {
  it('未知工具名返回失败而非抛异常', async () => {
    const res = await executeMCPToolCall('no_such_tool', {}, [], APP_URL)
    expect(res.success).toBe(false)
    expect(res.error).toContain('未知的 MCP 工具')
  })

  it('已下架的农业空壳工具不再可路由（回归防护）', async () => {
    const removed = [
      'mcp_soil_sensor_query',
      'mcp_crop_disease_diagnose',
      'mcp_irrigation_query',
      'mcp_farm_data_query'
    ]
    for (const name of removed) {
      const res = await executeMCPToolCall(name, {}, [], APP_URL)
      expect(res.success).toBe(false)
      expect(res.error).toContain('未知的 MCP 工具')
    }
  })

  it('外部工具未安装时返回明确错误', async () => {
    const res = await executeMCPToolCall('mcp_brave_search', { query: '草莓白粉病' }, [], APP_URL)
    expect(res.success).toBe(false)
    expect(res.error).toContain('未安装或未启用')
  })

  it('外部工具已安装但缺 API Key 时优雅失败，不抛异常', async () => {
    const configs = [{ id: 'brave-search', name: 'brave-search', enabled: true, apiKey: '' }]
    const res = await executeMCPToolCall('mcp_brave_search', { query: 'test' }, configs as any, APP_URL)
    expect(res.success).toBe(false)
    expect(typeof res.error).toBe('string')
  })
})

describe('executeMCPToolCall - get_sensor_history', () => {
  it('metrics 为空时返回参数校验错误，不查库', async () => {
    const res = await executeMCPToolCall('get_sensor_history', { metrics: [] }, [], APP_URL)
    expect(res.success).toBe(false)
    expect(res.error).toContain('至少一个')
    expect(getMultiSensorHistory).not.toHaveBeenCalled()
  })

  it('metrics 超过 5 个时拒绝执行', async () => {
    const res = await executeMCPToolCall(
      'get_sensor_history',
      { metrics: ['a', 'b', 'c', 'd', 'e', 'f'] },
      [],
      APP_URL
    )
    expect(res.success).toBe(false)
    expect(res.error).toContain('最多查询 5 个指标')
    expect(getMultiSensorHistory).not.toHaveBeenCalled()
  })

  it('正常查询返回降采样后的数据点（上限 30）', async () => {
    vi.mocked(getMultiSensorHistory).mockResolvedValue(sensorResult(120) as any)

    const res = await executeMCPToolCall(
      'get_sensor_history',
      { metrics: ['air_temp'], range: '24h' },
      [],
      APP_URL
    )

    expect(res.success).toBe(true)
    expect(res.data.range).toBe('24h')
    expect(res.data.metrics[0].points.length).toBeLessThanOrEqual(30)
    expect(res.data.metrics[0].points[0]).toHaveProperty('time')
    expect(res.data.metrics[0].points[0]).toHaveProperty('value')
  })

  it('数据库抛异常时被捕获，绝不向上抛（保护 Agent Loop）', async () => {
    vi.mocked(getMultiSensorHistory).mockRejectedValue(new Error('connection terminated'))

    await expect(
      executeMCPToolCall('get_sensor_history', { metrics: ['air_temp'] }, [], APP_URL)
    ).resolves.toMatchObject({ success: false })

    const res = await executeMCPToolCall('get_sensor_history', { metrics: ['air_temp'] }, [], APP_URL)
    expect(typeof res.error).toBe('string')
  })
})

describe('executeMCPToolCall - 内置工具委托与异常收敛', () => {
  it('设备控制工具委托给 builtin-device-control 并透传上下文', async () => {
    vi.mocked(executeDeviceControlTool).mockResolvedValue({ success: true, data: { relay: 5, on: true } })
    const ctx = { userId: 4, sessionId: 's1' }

    const res = await executeMCPToolCall('toggle_relay', { relay: 5, state: 'on' }, [], APP_URL, ctx)

    expect(res.success).toBe(true)
    expect(executeDeviceControlTool).toHaveBeenCalledWith('toggle_relay', { relay: 5, state: 'on' }, ctx)
  })

  it('设备控制抛异常时被捕获为失败结果', async () => {
    vi.mocked(executeDeviceControlTool).mockRejectedValue(new Error('MQTT timeout'))

    const res = await executeMCPToolCall('toggle_relay', { relay: 5 }, [], APP_URL)

    expect(res.success).toBe(false)
    expect(res.error).toBe('MQTT timeout')
  })

  it('光谱工具委托连接池执行', async () => {
    vi.mocked(spectrumConnectionPool.executeToolCall).mockResolvedValue({ ch1: 0.42 } as any)
    const configs = [{ id: 'spectrum-stravision', name: 'spectrum-stravision', enabled: true }]

    const res = await executeMCPToolCall('get_all_spectrum', {}, configs as any, APP_URL)

    expect(res.success).toBe(true)
    expect(spectrumConnectionPool.executeToolCall).toHaveBeenCalledWith('get_all_spectrum', {})
  })

  it('农业工具委托给 builtin-farm-data 并在无外部配置时可用', async () => {
    vi.mocked(executeFarmTool).mockResolvedValue({ success: true, data: { summary: 'ok' } })

    // 传空配置列表：证明农业工具不依赖任何用户安装的 MCP 服务
    const res = await executeMCPToolCall('analyze_soil', {}, [], APP_URL)

    expect(res.success).toBe(true)
    expect(executeFarmTool).toHaveBeenCalledWith('analyze_soil', {}, undefined)
  })

  it('农业工具抛异常时收敛为失败结果', async () => {
    vi.mocked(executeFarmTool).mockRejectedValue(new Error('DB down'))

    const res = await executeMCPToolCall('get_current_conditions', {}, [], APP_URL)

    expect(res.success).toBe(false)
    expect(res.error).toBe('DB down')
  })

  it('记忆工具委托给 builtin-user-memory 并透传上下文', async () => {
    vi.mocked(executeUserMemoryTool).mockResolvedValue({ success: true, data: { key: 'user_name', value: '小朱' } })
    const ctx = { userId: 4, sessionId: 's1' }

    const res = await executeMCPToolCall('remember_user_info', { key: 'user_name', value: '小朱' }, [], APP_URL, ctx)

    expect(res.success).toBe(true)
    expect(executeUserMemoryTool).toHaveBeenCalledWith('remember_user_info', { key: 'user_name', value: '小朱' }, ctx)
  })

  it('记忆工具抛异常时收敛为失败结果', async () => {
    vi.mocked(executeUserMemoryTool).mockRejectedValue(new Error('fs write failed'))

    const res = await executeMCPToolCall('remember_user_info', { key: 'user_name', value: '小朱' }, [], APP_URL)

    expect(res.success).toBe(false)
    expect(res.error).toBe('fs write failed')
  })
})
