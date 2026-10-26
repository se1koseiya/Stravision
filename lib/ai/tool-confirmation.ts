/**
 * 高风险工具的「执行前确认」—— 唯一源
 *
 * ── 场景（2026-10-14 用户）────────────────────────────────────────────
 * 用户原话：
 *   「一般不输出设备卡片了啊，询问文案一般交由 ai 控制了啊，而不是直接输出卡片让用户点。
 *     现在改成在 sender 上方出现确认」
 *
 * 于是链路变成：**不再给用户输出任何可点的设备卡片**，而是
 *   AI 调高风险工具 → 后端在同一条 SSE 连接内挂起、不执行
 *   → 前端在 sender（输入框）上方浮出一枚确认胶囊
 *   → 用户点「执行」才真正下发；点「忽略」则把「用户拒绝」如实交回模型。
 *
 * 「哪些工具需要确认」不在这里定义 —— 唯一源是
 * `agent-budget.ts#TOOL_RISK_REGISTRY[*].requiresConfirmation`，
 * 本文件只负责**文案**与**裁决令牌**这两件与传输层无关的事。
 *
 * 🚨 别在别处再写一份工具名单。新增工具请在登记表里加 `requiresConfirmation: true`，
 *    本文件（以及 `CONFIRMATION_REQUIRED_TOOLS`）自动跟上。
 */

import { CONFIRMATION_REQUIRED_TOOLS } from './agent-budget'

/**
 * 工具 → 短标签（给确认胶囊做前缀，例如「设备控制 · 开启 1 号继电器」）。
 *
 * 标签只描述**动作类别**，不描述参数 —— 参数由 `describeToolArguments()` 汇总，
 * 而用户真正读的那句话优先取 AI 自己的说明文字（见 `app/api/chat/route.ts`）。
 */
export const TOOL_CONFIRM_LABELS: Record<string, string> = {
  toggle_relay: '设备启停',
  set_led: '补光灯',
  control_camera: '云台转动',
  reset_camera: '摄像头归位',
  move_camera_and_look: '云台移动',
  delete_device: '删除设备',
  cron_create: '定时任务',
  automation_strategy_create: '新建策略',
  automation_strategy_update: '修改策略',
  automation_strategy_delete: '删除策略',
  automation_canvas_apply: '应用自动化画布',
  update_medical_record: '更新病历',
  delete_medical_record: '删除病历',
}

/** 兜底标签：登记表里新增了工具但忘记补文案时用得上（比空白好） */
export const TOOL_CONFIRM_FALLBACK_LABEL = '高风险操作'

/** 胶囊左键（拒绝）文案 */
export const TOOL_CONFIRM_REJECT_TEXT = '忽略'
/** 胶囊右键（同意）文案 */
export const TOOL_CONFIRM_APPROVE_TEXT = '执行'
/** 执行中文案 */
export const TOOL_CONFIRM_RUNNING_TEXT = '执行中'
/** 已完成文案 */
export const TOOL_CONFIRM_DONE_TEXT = '已执行'

/**
 * 裁决令牌 —— 前端点按钮后回传 /api/chat/respond 的 `reply`。
 *
 * 🚨 必须是**机器可判定的哨兵**，不能是「执行」「是」这类自然语言：
 *    同一条 `waitForUserInput` 通道也被 CHECKPOINT / CLARIFY 表单复用，
 *    用户手打的「执行」与按钮回传的「执行」无法区分，会导致误判。
 */
export const TOOL_CONFIRM_APPROVE_REPLY = '__tool_confirm_approve__'
export const TOOL_CONFIRM_REJECT_REPLY = '__tool_confirm_reject__'

/** 该工具是否需要「执行前确认」（转发登记表派生集，方便消费方只 import 一处） */
export function isToolConfirmationRequired(toolName: string): boolean {
  return CONFIRMATION_REQUIRED_TOOLS.has(toolName)
}

/** 按工具名取短标签（未知工具走兜底） */
export function getToolConfirmLabel(toolName: string): string {
  return TOOL_CONFIRM_LABELS[toolName] || TOOL_CONFIRM_FALLBACK_LABEL
}

/**
 * 把工具参数压成一句人话摘要（用于 AI 没给说明文字时的兜底）。
 *
 * ⚠️ 只挑已知字段，**不要** `JSON.stringify(args)` —— 那会把整坨参数砸到胶囊上，
 *    既读不懂又撑爆 sender 上方这条窄条。
 */
export function describeToolArguments(toolName: string, args: unknown): string {
  const a = (args && typeof args === 'object' ? args : {}) as Record<string, any>
  const pick = (...keys: string[]) => {
    for (const k of keys) {
      const v = a[k]
      if (v !== undefined && v !== null && v !== '') return v
    }
    return undefined
  }
  const device = pick('device', 'device_name', 'deviceId', 'device_id', 'target', 'name')

  switch (toolName) {
    case 'toggle_relay': {
      const v = a.value
      const on = v === true || v === 1 || v === 'on' || v === 'true'
      return `${on ? '开启' : '关闭'}${device ? `「${device}」` : ''}继电器`
    }
    case 'set_led': {
      const rgb = [a.r, a.g, a.b].filter((x) => typeof x === 'number').join(', ')
      return rgb ? `把补光灯设为 rgb(${rgb})` : '调整补光灯'
    }
    case 'control_camera': {
      const dir = pick('direction')
      const pulses = pick('pulses')
      return `${dir ? `向 ${dir} 转动` : '转动云台'}${pulses ? ` ${pulses} 步` : ''}`
    }
    case 'reset_camera':
      return '让摄像头回到初始位置'
    case 'move_camera_and_look': {
      const dir = pick('direction')
      return `移动云台${dir ? `（${dir}）` : ''}并观察画面`
    }
    case 'delete_device':
      return `删除设备${device ? `「${device}」` : ''}`
    case 'cron_create':
      return `创建定时任务${device ? `：${device}` : ''}`
    case 'automation_strategy_create':
      return `新建自动化策略${device ? `：${device}` : ''}`
    case 'automation_strategy_update':
      return `修改自动化策略${device ? `：${device}` : ''}`
    case 'automation_strategy_delete':
      return `删除自动化策略${device ? `：${device}` : ''}`
    case 'automation_canvas_apply':
      return '把当前自动化画布部署到设备'
    case 'update_medical_record':
      return `更新病历${device ? `：${device}` : ''}`
    case 'delete_medical_record':
      return `删除病历${device ? `：${device}` : ''}`
    default:
      return getToolConfirmLabel(toolName)
  }
}

/**
 * AI 的说明文字 → 可上胶囊的一句话。
 *
 * 取**最后一段非空正文**（AI 通常在调工具前的那句话里说明自己要干什么），
 * 去掉标签/代码块，压平空白，按 `maxLength` 收尾加省略号。
 */
/**
 * ⚠️ 默认 40 字是**版面预算**，不是随意取值：确认胶囊是单行 `whitespace-nowrap` 的
 *    浮层（见 `components/ui/toast-confirm.tsx`），加上短标签与两个按钮后总宽必须
 *    收在 sender 宽度内。AI 的完整说明本来就同时出现在上方消息气泡里，
 *    这里只取一个「够认出是哪件事」的片段即可。
 */
export function condenseAssistantNote(raw: string, maxLength = 40): string {
  if (!raw) return ''
  let text = String(raw)
    // 去掉结构化标签（它们已经由各自的渲染器消费，不该出现在确认文案里）
    .replace(/<(CHECKPOINT|CLARIFY|TASK_LIST|PLAN|DIAGNOSIS|DEVICE_FORGE|SCHEDULE_TASK)>[\s\S]*?<\/\1>/g, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/<[^>]{0,40}>/g, '')
    .trim()

  const paragraphs = text.split(/\n{2,}/).map((p) => p.replace(/\s+/g, ' ').trim()).filter(Boolean)
  if (paragraphs.length === 0) return ''
  text = paragraphs[paragraphs.length - 1]

  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength).trimEnd()}…`
}

/**
 * 拼最终上胶囊的文案：`{短标签} · {说明}`。
 *
 * 说明优先取 AI 自己那句话（用户明确要求「询问文案交给 AI 控制」），
 * 拿不到才回落到参数摘要。
 */
export function buildToolConfirmText(
  toolName: string,
  args: unknown,
  assistantNote?: string,
): string {
  const label = getToolConfirmLabel(toolName)
  const note = condenseAssistantNote(assistantNote || '')
  let detail = note || describeToolArguments(toolName, args)

  // 参数摘要常常以短标签开头（`删除设备` / `删除设备「旧传感器」`），
  // 直接拼会得到「删除设备 · 删除设备…」这种复读。剥掉前缀；剥空了就只留标签。
  if (detail.startsWith(label)) detail = detail.slice(label.length).trim()

  return detail ? `${label} · ${detail}` : label
}

/** 用户回传的 reply 是否代表「同意执行」 */
export function isToolConfirmApproved(reply: string): boolean {
  return String(reply || '').trim() === TOOL_CONFIRM_APPROVE_REPLY
}
