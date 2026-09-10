/**
 * 内置技能工坊工具包（Skill Forge）
 *
 * 提供 AI 助手两个工具：
 * - create_skill_from_doc  读技术文档 → 分析 → 生成技能 → 自测 → 注册/发布，
 *                          全流程自动完成，助手只需把用户给的文档原文传入
 * - refine_skill           按用户反馈修订已注册技能（可补充新资料），对应
 *                          "结果不满意可反复提醒修改"的多轮调试体验
 *
 * 设计说明：
 * - 不走 HTTP 自调用，直接 import skill-forge-service（与 deep-research 同模式）
 * - 依赖 agentContext.userId 确定安装归属；缺 userId 时仍可注册但不自动安装
 * - 锻造管线含多次 LLM 调用（分析/生成/彩排/评分 + 自动修订轮），耗时约 1-3 分钟，
 *   工具描述中已向模型说明，避免在简单请求上滥用
 * - 阶段进度通过 agentContext.onProgress 实时推给前端思维链
 */

import {
  forgeSkillFromDocument,
  refineRegisteredSkill,
  type ForgeResult,
} from "../ai/skill-forge-service"
import type { AgentToolContext } from "./mcp-tool-executor"
import type { ToolCallResult } from "./mcp-tool-executor"

/** 归一用户 ID：DB 用 BIGSERIAL(int8)，pg 运行时返回字符串 —— 统一转数字再校验 */
function normalizeUserId(raw: unknown): number | null {
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : null
}

export async function executeSkillForgeTool(
  functionName: string,
  args: Record<string, any>,
  agentContext?: AgentToolContext
): Promise<ToolCallResult> {
  switch (functionName) {
    case "create_skill_from_doc":
      return await executeCreateSkillFromDoc(args, agentContext)
    case "refine_skill":
      return await executeRefineSkill(args, agentContext)
    default:
      return { success: false, error: `未知的技能工坊工具: ${functionName}` }
  }
}

function summarizeResult(result: ForgeResult): Record<string, any> {
  const data: Record<string, any> = {
    success: result.success,
    skillId: result.skillId,
    rounds: result.rounds,
  }
  if (result.error) data.error = result.error

  // 信息不足：返回待补充问题，指示 AI 主动向用户追问
  if (result.needsInput) {
    data.needs_user_input = true
    data.questions = result.questions || []
    if (result.analysis) {
      data.analysis = {
        subject: result.analysis.subject_name,
        summary: result.analysis.summary,
        missingInfo: result.analysis.missing_info,
      }
    }
    data.note =
      `⚠️ 文档关键信息不足，已中止生成（避免产出编造的技能）。\n` +
      `🚨 你必须立即向用户追问，优先调用 ask_user_question 工具把以下待补充项列成结构化表单让用户填写（也可以在回复中逐条提问），禁止直接重试本工具：\n` +
      (result.questions || []).map((q, i) => `${i + 1}. ${q}`).join('\n') +
      `\n用户补充后，把原始文档与补充信息合并，再次调用 create_skill_from_doc。`
    return data
  }

  if (result.analysis) {
    data.analysis = {
      subject: result.analysis.subject_name,
      summary: result.analysis.summary,
      capabilities: result.analysis.capabilities.map(c => c.name),
      properties: result.analysis.properties.map(p => p.name),
      rules: result.analysis.rules,
      missingInfo: result.analysis.missing_info,
    }
  }
  if (result.skill) {
    data.skill = {
      skill_id: result.skill.skill_id,
      name: result.skill.name,
      description: result.skill.description,
      icon: result.skill.icon,
      category: result.skill.category,
      keywords: result.skill.keywords,
      examples: result.skill.examples,
      effects: result.skill.effects,
      contentPreview: result.skill.content.slice(0, 800),
      contentLength: result.skill.content.length,
    }
  }
  if (result.validation) {
    data.validation = {
      passed: result.validation.passed,
      issues: result.validation.issues,
    }
  }
  if (result.selfTest) {
    data.selfTest = {
      overallPassed: result.selfTest.overallPassed,
      score: result.selfTest.score,
      matchTests: result.selfTest.matchTests,
      rehearsalTests: result.selfTest.rehearsalTests.map(t => ({
        question: t.question,
        passed: t.passed,
        reason: t.reason,
      })),
    }
  }
  data.registered = result.registered

  // 生成对话内业务卡片的紧凑 JSON——AI 必须原样放进 <SKILL_FORGE> 标签输出
  const card: Record<string, any> = {
    status: result.success ? "success" : result.registered ? "draft" : "failed",
    skillId: result.skillId,
    name: result.skill?.name,
    icon: result.skill?.icon,
    category: result.skill?.category,
    description: result.skill?.description,
    subject: result.analysis?.subject_name,
    capabilities: result.analysis?.capabilities.map(c => c.name).slice(0, 8),
    propertyCount: result.analysis?.properties.length,
    missingInfo: result.analysis?.missing_info.slice(0, 3),
    keywords: result.skill?.keywords.slice(0, 10),
    examples: result.skill?.examples.slice(0, 3),
    score: result.selfTest?.score,
    rounds: result.rounds,
    published: result.success,
    matchTests: result.selfTest?.matchTests.map(t => ({ q: t.query, ok: t.passed })),
    rehearsalTests: result.selfTest?.rehearsalTests.map(t => ({ q: t.question, ok: t.passed, why: t.reason })),
    error: result.error,
  }
  data.ui_card = card

  data.note = result.success
    ? `技能「${result.skill?.name}」已${result.alreadyExisted ? "更新" : "注册"}并发布，用户后续提问提到相关关键词时，你会通过技能清单自动路由到它。\n` +
      `🚨 回复用户时必须：1. 先简短汇报识别到的能力/属性、自测结果；2. 然后在回复末尾原样输出以下业务卡片标签（不要改动 JSON 内容）：\n<SKILL_FORGE>${JSON.stringify(card)}</SKILL_FORGE>`
    : result.registered
      ? `技能「${result.skill?.name}」自测未达标，已保存为草稿（未发布）。\n` +
        `🚨 回复用户时必须：1. 说明失败原因、建议用户补充资料或反馈修订（用户反馈后调用 refine_skill）；2. 然后在回复末尾原样输出以下业务卡片标签：\n<SKILL_FORGE>${JSON.stringify(card)}</SKILL_FORGE>`
      : `技能锻造失败：${result.error || '未知原因'}。\n` +
        `🚨 回复用户时必须：1. 说明失败原因与解决建议；2. 然后在回复末尾原样输出以下业务卡片标签：\n<SKILL_FORGE>${JSON.stringify(card)}</SKILL_FORGE>`
  return data
}

async function executeCreateSkillFromDoc(
  args: Record<string, any>,
  agentContext?: AgentToolContext
): Promise<ToolCallResult> {
  const document = String(args?.document ?? "").trim()
  if (!document) {
    return { success: false, error: "document 不能为空：请把用户提供的文档原文/报文示例完整传入" }
  }
  if (document.length < 100) {
    return { success: false, error: `文档内容过短（${document.length} 字符），至少需要 100 字符的技术文档才能锻造技能` }
  }

  const userId = normalizeUserId(agentContext?.userId)

  const result = await forgeSkillFromDocument({
    document,
    documentName: args?.document_name ? String(args.document_name) : undefined,
    userId: userId ?? undefined,
    publish: args?.publish === false ? false : true,
    autoInstall: true,
    onProgress: (p) => agentContext?.onProgress?.(p.stage, p.detail),
  })

  // ⚠️ 关键：只要产出了「可行动结果」就必须 success=true，否则 chat 路由会走
  // `result.success ? result.data : { error: result.error }` 分支，
  // 而这里若没设 error 就会变成 JSON.stringify({error: undefined}) === "{}"，
  // 模型收到的就是一个空对象——既没有 note 也没有卡片 JSON，看不到任何结果。
  // 自测未达标只是"存为草稿"，不是工具执行失败，必须把 data 回传。
  const actionable = result.registered || result.needsInput === true
  return {
    success: actionable,
    data: summarizeResult(result),
    error: actionable ? undefined : (result.error || '技能锻造失败：服务未返回有效结果'),
  }
}

async function executeRefineSkill(
  args: Record<string, any>,
  agentContext?: AgentToolContext
): Promise<ToolCallResult> {
  const skillId = String(args?.skill_id ?? "").trim()
  const feedback = String(args?.feedback ?? "").trim()
  if (!skillId) return { success: false, error: "skill_id 不能为空" }
  if (!feedback) return { success: false, error: "feedback 不能为空：请描述用户要求修改的内容" }

  const userId = normalizeUserId(agentContext?.userId)

  const result = await refineRegisteredSkill({
    skillId,
    feedback,
    extraDocument: args?.extra_document ? String(args.extra_document) : undefined,
    userId: userId ?? undefined,
    publish: args?.publish === false ? false : true,
    onProgress: (p) => agentContext?.onProgress?.(p.stage, p.detail),
  })

  // 同 create_skill_from_doc：registered 即为可行动结果，不能因自测未达标就把 data 丢掉
  const actionable = result.registered || result.needsInput === true
  return {
    success: actionable,
    data: summarizeResult(result),
    error: actionable ? undefined : (result.error || '技能修订失败：服务未返回有效结果'),
  }
}
