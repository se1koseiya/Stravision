/**
 * Agent 预算/阈值单一配置源 · 契约测试
 *
 * 本文件锁定的不是"功能",而是**架构约束** —— 把原本散落在注释里的约定变成可回归的断言：
 *   1. 「外层工具超时 > 内层管线预算」的跨文件契约（tool-manager 注释里写死的那条）
 *   2. 工具风险登记表 → NO_RETRY_TOOLS / PLAN_MODE_BLOCKED_TOOLS 的派生关系
 *      （改成"逐字等于改造前的成员"当回归锁，防止顺手改动行为）
 *   3. 已知的设计缺口必须出现在 warnings 里（漏了就说明有人把警告删了）
 */

import { describe, it, expect } from 'vitest'

import {
  AGENT_MAX_ITERATIONS,
  AGENT_LLM_TIMEOUT_MS,
  AGENT_STREAM_IDLE_TIMEOUT_MS,
  AGENT_FORCE_FINAL_TIMEOUT_MS,
  AGENT_KEEPALIVE_INTERVAL_MS,
  TOOL_DEFAULT_TIMEOUT_MS,
  TOOL_MAX_RETRIES,
  TOOL_TIMEOUT_OVERRIDES,
  NO_RETRY_TOOLS,
  PLAN_MODE_BLOCKED_TOOLS,
  CONFIRMATION_REQUIRED_TOOLS,
  TOOL_RISK_REGISTRY,
  PIPELINE_BUDGET_CONTRACTS,
  HITL_USER_INPUT_TIMEOUT_MS,
  HITL_CLIENT_TOOL_TIMEOUT_MS,
  SKILL_FORGE_PIPELINE_BUDGET_MS,
  VISION_DIAGNOSE_DEFAULT_TIMEOUT_MS,
  DEVICE_FORGE_PIPELINE_BUDGET_MS,
  getAgentBudgetViolations,
  getAgentBudgetWarnings,
  assertAgentBudget,
} from './agent-budget'

/**
 * 归集后的 NO_RETRY_TOOLS 成员。
 *
 * = 改造前 tool-manager.ts 的原始字面量 **+ 1 处有意的修复**：
 *   `connect_device_from_doc` —— 与技能工坊同构的背景管线，超时不取消后台，
 *   重试会整条重跑；此前漏登记。除它之外必须与改造前逐字一致。
 */
const EXPECTED_NO_RETRY = [
  'toggle_relay',
  'set_led',
  'control_camera',
  'reset_camera',
  'take_camera_snapshot',
  'move_camera_and_look',
  'update_task',
  'automation_strategy_create',
  'automation_strategy_update',
  'automation_strategy_delete',
  'deep_research',
  'create_skill_from_doc',
  'refine_skill',
  'diagnose_plant_image',
  'connect_device_from_doc',
  'update_medical_record',
  'delete_medical_record',
  // 2026-10-21 新增文档处理：读/生成/编辑都会产生重复产物或重复模型计费
  'document_read',
  'document_create',
  'document_edit',
]

/**
 * 需要「执行前确认」的工具（回归锁）。
 *
 * 判定口径（2026-10-14 用户：「所有高风险工具」）：会产生**物理动作**或**不可逆写**。
 * 纯读取 / 纯耗时（研究、识图、技能工坊、抓帧）不在此列 —— 那些只是慢，不动硬件也不删数据。
 *
 * ⚠️ 这是一份**快照**，不是"照着实现抄的清单"。新增工具时若确实需要确认，
 *    请连同本数组一起改 —— 改这个数组的人会被迫读一遍上面这段口径。
 */
const EXPECTED_CONFIRMATION_REQUIRED = [
  // 物理动作
  'toggle_relay',
  'set_led',
  'control_camera',
  'reset_camera',
  'move_camera_and_look',
  // 不可逆写
  'delete_device',
  'cron_create',
  'automation_strategy_create',
  'automation_strategy_update',
  'automation_strategy_delete',
  'automation_canvas_apply',
  'update_medical_record',
  'delete_medical_record',
]

/** 改造前 PLAN_MODE_BLOCKED_TOOLS 的成员（route.ts 原始字面量） */
const LEGACY_PLAN_MODE_BLOCKED = [
  'toggle_relay',
  'set_led',
  'control_camera',
  'reset_camera',
  'cron_create',
  'task_create',
  'task_update',
  'automation_strategy_create',
  'automation_strategy_update',
  'automation_strategy_delete',
  'automation_canvas_apply',
  'update_medical_record',
  'delete_medical_record',
  // 2026-10-21：文档生成/编辑属于「往用户文件库写产物」，计划模式（只出方案）不该做
  'document_create',
  'document_edit',
]

describe('agent-budget · 硬契约', () => {
  it('没有任何契约断裂', () => {
    expect(getAgentBudgetViolations()).toEqual([])
  })

  it('assertAgentBudget() 在契约完好时不抛错', () => {
    expect(() => assertAgentBudget()).not.toThrow()
  })
})

describe('agent-budget · 外层超时 > 内层预算（跨文件契约）', () => {
  it('契约表非空且每条的 tool 都在超时覆盖表里', () => {
    expect(PIPELINE_BUDGET_CONTRACTS.length).toBeGreaterThan(0)
    for (const c of PIPELINE_BUDGET_CONTRACTS) {
      expect(TOOL_TIMEOUT_OVERRIDES[c.tool]).toBeDefined()
    }
  })

  it('技能工坊：工具超时 480s 严格大于管线预算', () => {
    expect(TOOL_TIMEOUT_OVERRIDES.create_skill_from_doc).toBeGreaterThan(SKILL_FORGE_PIPELINE_BUDGET_MS)
    expect(TOOL_TIMEOUT_OVERRIDES.refine_skill).toBeGreaterThan(SKILL_FORGE_PIPELINE_BUDGET_MS)
  })

  it('视觉诊断：工具超时 120s 严格大于内层 diagnose 超时', () => {
    expect(TOOL_TIMEOUT_OVERRIDES.diagnose_plant_image).toBeGreaterThan(VISION_DIAGNOSE_DEFAULT_TIMEOUT_MS)
  })

  it('设备接入工坊：工具超时 480s 严格大于管线预算 240s（修复前为默认 60s）', () => {
    expect(TOOL_TIMEOUT_OVERRIDES.connect_device_from_doc).toBeGreaterThan(DEVICE_FORGE_PIPELINE_BUDGET_MS)
    expect(TOOL_TIMEOUT_OVERRIDES.connect_device_from_doc).toBeGreaterThan(TOOL_DEFAULT_TIMEOUT_MS)
  })

  it('内层预算数值与消费方一致（技能工坊 300s / 视觉 60s）', () => {
    expect(SKILL_FORGE_PIPELINE_BUDGET_MS).toBe(300_000)
    expect(VISION_DIAGNOSE_DEFAULT_TIMEOUT_MS).toBe(60_000)
  })
})

describe('agent-budget · 工具风险登记表派生集合（回归锁）', () => {
  it('NO_RETRY_TOOLS 成员符合预期（含 1 处有意修复）', () => {
    expect([...NO_RETRY_TOOLS].sort()).toEqual([...EXPECTED_NO_RETRY].sort())
  })

  it('PLAN_MODE_BLOCKED_TOOLS 成员与改造前逐字一致', () => {
    expect([...PLAN_MODE_BLOCKED_TOOLS].sort()).toEqual([...LEGACY_PLAN_MODE_BLOCKED].sort())
  })

  it('禁重试集合 ⊆ 风险登记表键集合', () => {
    for (const name of NO_RETRY_TOOLS) {
      expect(TOOL_RISK_REGISTRY[name]).toBeDefined()
    }
  })

  it('每个禁重试的工具都给出了非空理由', () => {
    for (const name of NO_RETRY_TOOLS) {
      expect(TOOL_RISK_REGISTRY[name].noRetryReason.length).toBeGreaterThan(0)
    }
  })

  it('计划模式屏蔽的工具都是 device/write 类（不能屏蔽纯查询）', () => {
    for (const name of PLAN_MODE_BLOCKED_TOOLS) {
      expect(['physical', 'write']).toContain(TOOL_RISK_REGISTRY[name].category)
    }
  })

  // ── 执行前确认（sender 上方的确认条）──────────────────────────────
  it('CONFIRMATION_REQUIRED_TOOLS 成员符合预期口径', () => {
    expect([...CONFIRMATION_REQUIRED_TOOLS].sort()).toEqual([...EXPECTED_CONFIRMATION_REQUIRED].sort())
  })

  it('登记表每一项都显式声明了 requiresConfirmation（不许漏）', () => {
    for (const [name, risk] of Object.entries(TOOL_RISK_REGISTRY)) {
      expect(typeof risk.requiresConfirmation, `${name} 缺 requiresConfirmation`).toBe('boolean')
    }
  })

  it('需要确认的工具必须有副作用（physical/write），不能把纯查询也拦下来', () => {
    for (const name of CONFIRMATION_REQUIRED_TOOLS) {
      expect(['physical', 'write']).toContain(TOOL_RISK_REGISTRY[name].category)
    }
  })

  it('不需要确认的工具不含"物理动作"（物理动作一律要问一句）', () => {
    for (const [name, risk] of Object.entries(TOOL_RISK_REGISTRY)) {
      if (risk.category === 'physical') {
        // 唯一豁免：抓帧只取一张图，不改物理状态、不写数据
        if (name === 'take_camera_snapshot') continue
        expect(risk.requiresConfirmation, `${name} 是物理动作但未要求确认`).toBe(true)
      }
    }
  })
})

describe('agent-budget · 已知缺口必须出现在 warnings 里', () => {
  const warnings = getAgentBudgetWarnings()

  it('有副作用却允许重试的写操作被点名', () => {
    for (const name of [
      'task_create',
      'task_update',
      'cron_create',
      'automation_canvas_apply',
    ]) {
      expect(warnings.some(w => w.includes(name))).toBe(true)
    }
  })

  it('未在计划模式屏蔽的物理动作被点名', () => {
    for (const name of ['take_camera_snapshot', 'move_camera_and_look']) {
      expect(warnings.some(w => w.includes(name))).toBe(true)
    }
  })

  it('登记为"已知缺口"的 delete_device 被点名', () => {
    expect(warnings.some(w => w.includes('delete_device'))).toBe(true)
  })
})

describe('agent-budget · 数值健全性', () => {
  it('所有超时都是正数', () => {
    for (const ms of Object.values(TOOL_TIMEOUT_OVERRIDES)) {
      expect(ms).toBeGreaterThan(0)
    }
    for (const ms of [
      AGENT_LLM_TIMEOUT_MS,
      AGENT_STREAM_IDLE_TIMEOUT_MS,
      AGENT_FORCE_FINAL_TIMEOUT_MS,
      AGENT_KEEPALIVE_INTERVAL_MS,
      TOOL_DEFAULT_TIMEOUT_MS,
      HITL_USER_INPUT_TIMEOUT_MS,
      HITL_CLIENT_TOOL_TIMEOUT_MS,
    ]) {
      expect(ms).toBeGreaterThan(0)
    }
  })

  it('Agent 轮数上限在合理区间（防止被误改到 1 或 100）', () => {
    expect(AGENT_MAX_ITERATIONS).toBeGreaterThanOrEqual(3)
    expect(AGENT_MAX_ITERATIONS).toBeLessThanOrEqual(20)
  })

  it('强制收尾超时不超过常规调用超时（收尾应当更快）', () => {
    expect(AGENT_FORCE_FINAL_TIMEOUT_MS).toBeLessThanOrEqual(AGENT_LLM_TIMEOUT_MS)
  })

  it('重试次数与默认超时为正数', () => {
    expect(TOOL_MAX_RETRIES).toBeGreaterThanOrEqual(0)
    expect(TOOL_DEFAULT_TIMEOUT_MS).toBeGreaterThan(0)
  })

  it('用户输入挂起超时应长于前端工具超时（人在回路更慢）', () => {
    expect(HITL_USER_INPUT_TIMEOUT_MS).toBeGreaterThan(HITL_CLIENT_TOOL_TIMEOUT_MS)
  })
})
