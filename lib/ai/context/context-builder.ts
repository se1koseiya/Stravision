/**
 * 上下文工程层 · 统一装配器 ContextBuilder
 *
 * 现状问题（本文件要消除的）：
 *   app/api/chat/route.ts 里三处分支（DashScope 兼容 / DashScope 原生 / OpenAI 兼容）
 *   各自把 `generateCompactSystemPrompt(...) + '\n\n' + dynamicSuffix + mcpInstallationHint`
 *   重复拼了一遍 —— 参数一模一样，任何一处改动都要同步三次，已经埋了漂移隐患。
 *
 * 本装配器把「有哪些段」与「段怎么拼」分开：
 *   调用方只负责**提供各段内容**（base prompt / skill / memory / env …），
 *   排布顺序、稳定性分层、预算裁剪、埋点全部在这里统一处理。
 *
 * 输出契约保持与旧代码兼容：
 *   - `systemPrompt` 与旧的 `compactSystemPrompt + '\n\n' + dynamicSuffix + mcpInstallationHint`
 *     语义等价（静态段在前、动态段在后），调用方可以直接替换而不改下游。
 */

import type {
  AssembledContext,
  ContextBudget,
  ContextSection,
  ContextStability,
  ContextTier,
} from './types'
import { buildContextBudget, getTierBudget, truncateToBudget } from './budget'
import { estimateContextTokens } from './token-estimator'

/** 装配输入：调用方提供各段内容，不知道也不需要知道排布顺序 */
export interface ContextInput {
  /** 模型 id（用于推断预算窗口） */
  modelId?: string
  /** 预算覆盖（一般不必传） */
  budget?: Partial<ContextBudget>

  // === identity 段（不可压缩） ===
  /** 基础系统提示词（generateCompactSystemPrompt 的产物） */
  basePrompt: string
  /** 人格前缀（persona-system） */
  persona?: string

  // === pinned 段（用户显式提供） ===
  /** 用户记忆档案（md 文件） */
  memory?: string
  /** 个性化设置（称呼 / 风格 / 自定义指令） */
  personalization?: string
  /** 知识库检索结果 / 强引用条目 */
  knowledge?: string

  // === working 段（可降级） ===
  /** 技能文档（skill-router 产物） */
  skill?: string
  /** 环境与设备状态快照 */
  envSnapshot?: string
  /** 定时任务列表 */
  tasksList?: string
  /** 工具清单（名字 + 一句话用途） */
  toolsIndex?: string
  /** 报告 / 定时任务等按需规则（已按需裁剪过） */
  rules?: string
  /** 功能开关说明 */
  featureFlags?: string

  // === volatile 段（置尾，吃 Recency） ===
  /** 强制工具提示（@工具 / 意图命中） */
  forcedTool?: string
  /** 计划模式提示 */
  planMode?: string
  /** MCP 缺失提示 */
  mcpHint?: string
  /** 历史压缩提示（<CONTEXT_COMPRESSED/> 说明） */
  compressionHint?: string

  /** 额外自定义段（逃生舱，业务侧确需插入时用） */
  extra?: ContextSection[]
}

/** 段位 → 稳定性（决定排布：stable 全部前置以命中 prompt cache） */
function stabilityOf(tier: ContextTier): ContextStability {
  return tier === 'history' ? 'volatile' : 'stable'
}

/**
 * 把 ContextInput 展平成有序的 ContextSection 列表。
 *
 * 顺序即「模型阅读顺序」，也是 prompt cache 前缀的构造顺序：
 *   1. identity（人格 → 基础提示词 → 功能开关）
 *   2. pinned  （记忆 → 个性化 → 知识库）
 *   3. working （技能 → 工具清单 → 环境 → 任务 → 规则）
 *   4. volatile（压缩提示 → 强制工具 → 计划模式 → MCP 提示）
 */
function flatten(input: ContextInput): ContextSection[] {
  const sections: ContextSection[] = []

  const push = (
    id: string,
    tier: ContextTier,
    content: string | undefined,
    extra?: Partial<ContextSection>,
  ) => {
    if (!content || !content.trim()) return
    sections.push({
      id,
      tier,
      stability: stabilityOf(tier),
      content,
      ...extra,
    })
  }

  // ---- identity ----
  push('persona', 'identity', input.persona)
  push('base-prompt', 'identity', input.basePrompt)
  push('feature-flags', 'identity', input.featureFlags)

  // ---- pinned ----
  push('memory', 'pinned', input.memory)
  push('personalization', 'pinned', input.personalization)
  push('knowledge', 'pinned', input.knowledge)

  // ---- working ----
  push('skill', 'working', input.skill)
  push('tools-index', 'working', input.toolsIndex)
  push('env-snapshot', 'working', input.envSnapshot)
  push('tasks-list', 'working', input.tasksList)
  push('rules', 'working', input.rules)

  // ---- volatile ----
  push('compression-hint', 'history', input.compressionHint)
  push('forced-tool', 'history', input.forcedTool)
  push('plan-mode', 'history', input.planMode)
  push('mcp-hint', 'history', input.mcpHint)

  if (input.extra?.length) {
    for (const s of input.extra) {
      if (s.content && s.content.trim()) sections.push(s)
    }
  }

  return sections
}

/**
 * 装配上下文。
 *
 * 逐段检查 token 预算：
 *   - 段内超「段位预算 ÷ 该段位段数」的公平份额 → 先尝试 fallback，再尝试截断
 *   - identity 段永不截断（宁可超预算也不让助手行为漂移）
 */
export function buildContext(input: ContextInput): AssembledContext {
  const budget = buildContextBudget(input.modelId, input.budget)
  const sections = flatten(input)

  // 统计每个段位有几段，用于计算「公平份额」
  const tierCount: Record<ContextTier, number> = { identity: 0, pinned: 0, working: 0, history: 0 }
  for (const s of sections) tierCount[s.tier]++

  const usage: Record<string, number> = {}
  const tierUsage: Record<ContextTier, number> = { identity: 0, pinned: 0, working: 0, history: 0 }
  const truncatedSections: string[] = []
  const finalSections: ContextSection[] = []
  let truncated = false

  for (const section of sections) {
    let content = section.content

    // identity 段：不可压缩，直接计入
    if (section.tier !== 'identity') {
      const tierLimit = getTierBudget(budget, section.tier)
      const fairShare = Math.max(
        256,
        Math.floor((section.maxTokens ?? tierLimit) / Math.max(1, tierCount[section.tier])),
      )
      const measured = estimateContextTokens(content)

      if (measured > fairShare) {
        // 1) 优先用降级形式
        if (section.fallback && estimateContextTokens(section.fallback) <= fairShare) {
          content = section.fallback
          truncatedSections.push(section.id)
          truncated = true
        } else {
          // 2) 再截断
          const res = truncateToBudget(content, fairShare)
          if (res.truncated) {
            content = res.text
            truncatedSections.push(section.id)
            truncated = true
          }
        }
      }
    }

    const tokens = estimateContextTokens(content)
    usage[section.id] = tokens
    tierUsage[section.tier] += tokens
    finalSections.push({ ...section, content })
  }

  const systemPrompt = finalSections.map((s) => s.content).join('\n\n')
  const totalTokens = estimateContextTokens(systemPrompt)

  return {
    systemPrompt,
    sections: finalSections,
    usage,
    tierUsage,
    totalTokens,
    budgetTokens: budget.windowTokens,
    truncated,
    truncatedSections,
  }
}

/** 预算总额（供调用方做历史压缩判断复用，避免重复推断窗口） */
export function inputBudgetFor(modelId?: string, overrides?: Partial<ContextBudget>): number {
  return buildContextBudget(modelId, overrides).windowTokens
}
