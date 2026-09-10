/**
 * 内置设备接入工坊工具包（Device Integration）
 *
 * 提供 AI 助手工具 connect_device_from_doc：
 *   读设备接入文档 → 分析 → 生成接入配置草稿 → 校验 + 报文干跑 → 交付可编辑表单
 *
 * 设计说明：
 * - 与 skill-forge 同模式：不走 HTTP 自调用，直接 import device-integration-service
 * - 阶段进度通过 agentContext.onProgress 实时推给前端思维链/右面板
 * - ⚠️ 本工具只生成「草稿」不落库 —— 用户在前端 DEVICE_FORGE 卡片里确认/修改后，
 *   由卡片「装入莓小智」按钮 POST /api/devices 真正写入 devices 表
 * - 工具产出 ui_card（紧凑 JSON），note 强制 AI 原样输出 <DEVICE_FORGE>{json}</DEVICE_FORGE> 标签
 */

import {
  integrateDeviceFromDocument,
  type DeviceIntegrationResult,
} from "../ai/device-integration-service"
import type { AgentToolContext } from "./mcp-tool-executor"
import type { ToolCallResult } from "./mcp-tool-executor"

function summarizeResult(result: DeviceIntegrationResult): Record<string, any> {
  const data: Record<string, any> = {
    success: result.success,
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
      `⚠️ 设备接入文档关键信息不足，已中止生成（避免产出编造的接入配置）。\n` +
      `🚨 你必须立即向用户追问，优先调用 ask_user_question 工具把以下待补充项列成结构化表单让用户填写（也可以在回复中逐条提问），禁止直接重试本工具：\n` +
      (result.questions || []).map((q, i) => `${i + 1}. ${q}`).join('\n') +
      `\n用户补充后，把原始文档与补充信息合并，再次调用 connect_device_from_doc。`
    return data
  }

  if (result.analysis) {
    data.analysis = {
      subject: result.analysis.subject_name,
      typeHint: result.analysis.device_type_hint,
      summary: result.analysis.summary,
      capabilities: result.analysis.capabilities.map(c => c.name),
      topicHints: result.analysis.topic_hints.slice(0, 5),
      payloadSamples: result.analysis.payload_samples.slice(0, 2),
      missingInfo: result.analysis.missing_info.slice(0, 5),
    }
  }
  if (result.draft) {
    data.draft = {
      name: result.draft.name,
      type: result.draft.type,
      category: result.draft.category,
      icon: result.draft.icon,
      color: result.draft.color,
      subscribe_topic: result.draft.subscribe_topic,
      publish_topic: result.draft.publish_topic,
      node_id: result.draft.node_id,
      relay_num: result.draft.relay_num,
      metrics: result.draft.metrics,
      extra_config: result.draft.extra_config,
      description: result.draft.description,
      usage_doc: result.draft.usage_doc,
      test_payload: result.draft.test_payload,
    }
  }
  if (result.validation) {
    data.validation = {
      passed: result.validation.passed,
      issues: result.validation.issues,
    }
  }
  if (result.dryRun) {
    data.dryRun = {
      payloadValid: result.dryRun.payloadValid,
      payloadError: result.dryRun.payloadError,
      metrics: result.dryRun.metrics,
      controlChecked: result.dryRun.controlChecked,
      passed: result.dryRun.passed,
    }
  }

  // 对话内业务卡片紧凑 JSON —— AI 必须原样放进 <DEVICE_FORGE> 标签输出
  // ⚠️ card 必须自包含：前端「可编辑表单」直接渲染 card.draft，「发布技能」需要 card.usageDoc 全文，
  //    因此不做精简（与 skill-forge 不同——后者卡片只展示，不承担编辑/二次生成）
  const draft = result.draft
  const card: Record<string, any> = {
    status: result.success ? 'ready' : 'failed',   // ready = 草稿就绪待确认，failed = 生成失败
    error: result.error,
    // 识别摘要（展示用）
    subject: result.analysis?.subject_name,
    description: draft?.description,
    // 校验/干跑结果（失败原因逐条展示）
    issues: result.validation?.issues.map(i => ({ field: i.field, message: i.message, level: i.level })) ?? [],
    dryRun: result.dryRun
      ? {
          passed: result.dryRun.passed,
          payloadError: result.dryRun.payloadError,
          metrics: result.dryRun.metrics.map(m => ({ key: m.key, label: m.label, field: m.mqtt_field, ok: m.found, err: m.error })),
        }
      : undefined,
    // 可编辑草稿（全量表单字段）
    draft: draft
      ? {
          name: draft.name,
          type: draft.type,
          category: draft.category,
          icon: draft.icon,
          color: draft.color,
          subscribe_topic: draft.subscribe_topic,
          publish_topic: draft.publish_topic,
          node_id: draft.node_id,
          relay_num: draft.relay_num,
          metrics: draft.metrics,
          extra_config: draft.extra_config,
        }
      : undefined,
    // 面向技能工坊的接入能力文档（发布按钮需要；不在表单区展示）
    usageDoc: draft?.usage_doc,
  }
  data.ui_card = card

  data.note = result.success
    ? `设备接入配置草稿已就绪：设备「${draft?.name}」(${draft?.type}${draft?.subscribe_topic ? `，订阅 ${draft.subscribe_topic}` : ''}${draft?.metrics?.length ? `，${draft.metrics.length} 个数据点已映射` : ''})。\n` +
      `🚨 回复用户时必须：1. 简要汇报识别到的设备/数据点/校验与干跑结果（通过/存在警告）；2. 提醒用户核对表单后可点「装入莓小智」写入平台（也可直接修改）；3. 然后在回复末尾原样输出以下业务卡片标签（不要改动 JSON 内容）：\n<DEVICE_FORGE>${JSON.stringify(card)}</DEVICE_FORGE>`
    : result.needsInput
      ? data.note || `信息不足，请按上方向用户追问。`
      : `设备接入配置生成失败：${result.error || '未知原因'}。\n` +
        `🚨 回复用户时必须：1. 说明失败原因与解决建议（补充文档/修正字段后重试）；2. 然后在回复末尾原样输出以下业务卡片标签：\n<DEVICE_FORGE>${JSON.stringify(card)}</DEVICE_FORGE>`
  return data
}

export async function executeDeviceForgeTool(
  functionName: string,
  args: Record<string, any>,
  agentContext?: AgentToolContext
): Promise<ToolCallResult> {
  if (functionName !== 'connect_device_from_doc') {
    return { success: false, error: `未知的设备接入工坊工具: ${functionName}` }
  }
  const document = String(args?.document ?? '').trim()
  if (!document) {
    return { success: false, error: 'document 不能为空：请把用户提供的设备接入文档/协议原文完整传入' }
  }
  if (document.length < 100) {
    return { success: false, error: `接入文档内容过短（${document.length} 字符），至少需要 100 字符才能生成可靠配置` }
  }

  // 忽略 userId —— 本工具只生成草稿不落库，无需归属
  const result = await integrateDeviceFromDocument({
    document,
    documentName: args?.document_name ? String(args.document_name) : undefined,
    onProgress: (p) => agentContext?.onProgress?.(p.stage, p.detail),
  })

  // 只要产出了可行动结果（草稿 / needsInput）就必须 success=true，
  // 否则 chat 路由走 { error } 分支会把 data 丢掉，模型看不到卡片
  const actionable = result.draft !== null || result.needsInput === true
  return {
    success: actionable,
    data: summarizeResult(result),
    error: actionable ? undefined : (result.error || '设备接入配置生成失败：服务未返回有效结果'),
  }
}
