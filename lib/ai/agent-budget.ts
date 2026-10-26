/**
 * Agent 运行预算 / 阈值 · 单一配置源
 *
 * 现状问题（本文件要消除的）：
 *   1. 阈值魔数散落在至少 6 个文件：`route.ts`（MAX_AGENT_ITERATIONS=5、GRAND_SUMMARY_THRESHOLD=12000、
 *      LLM 90s / 流式空闲 90s / 强制收尾 60s / keep-alive 5s）、`tool-manager.ts`（默认超时 60s、
 *      TOOL_TIMEOUT_OVERRIDES、NO_RETRY_TOOLS）、`route.ts` 内联的 PLAN_MODE_BLOCKED_TOOLS、
 *      `pending-*.ts` 的挂起超时、`skill-forge-service.ts` 的 180s/300s、`vision-gateway.ts` 的 60s。
 *   2. 更麻烦的是**跨文件隐式契约**：工具级超时必须大于「内层管线预算」，否则内层还没兜住
 *      就被外层判超时（tool-manager 的注释里写着"必须大于管线预算"，但没有任何机制保证）。
 *      两边各写一个字面量 → 改一边忘另一边 = 静默失效。
 *
 * 本文件的做法：
 *   - 所有运行期预算/阈值在此**只定义一次**，消费方 import（不再各自写字面量）；
 *   - 内层管线预算与工具级超时**引用同一个变量** → 契约从"注释里的约定"变成"类型系统里的同一根线"；
 *   - `getAgentBudgetViolations()` / `getAgentBudgetWarnings()` 把散落的设计意图变成**可机器校验**的断言，
 *     由 `agent-budget.test.ts` 锁定；工具风险登记表（TOOL_RISK_REGISTRY）同时充当
 *     「新增 AI 工具同步 5 处」的防漂移护栏。
 *
 * ⚠️ 本文件只做「收敛」，不改任何既有数值 —— 迁移后行为与改造前逐字一致。
 */

import { COMPACTION_THRESHOLDS } from './context/tool-result-compactor'
import { DEFAULT_COMPRESSION } from './context/history-compressor'

// ─────────────────────────────────────────────────────────────
// 一、Agent Loop（消费方：app/api/chat/route.ts）
// ─────────────────────────────────────────────────────────────

/** 单轮请求内最多允许的工具调用轮数（防止无限循环） */
export const AGENT_MAX_ITERATIONS = 5

/** 单次 LLM 调用超时（AbortController） */
export const AGENT_LLM_TIMEOUT_MS = 90_000

/** 流式读取「多久没有新数据」判定为卡死 */
export const AGENT_STREAM_IDLE_TIMEOUT_MS = 90_000

/** 达到轮数上限后，强制收尾那一次「不带 tools」的调用超时（应短于常规调用） */
export const AGENT_FORCE_FINAL_TIMEOUT_MS = 60_000

/** SSE keep-alive 心跳间隔，防止网关长连接超时 */
export const AGENT_KEEPALIVE_INTERVAL_MS = 5_000

/** 旧摘要超过此字符数时，要求 LLM 做「深度精简」而非增量续写 */
export const AGENT_GRAND_SUMMARY_THRESHOLD_CHARS = 12_000

// ─────────────────────────────────────────────────────────────
// 二、工具执行（消费方：lib/ai/agent-orchestrator/tool-manager.ts）
// ─────────────────────────────────────────────────────────────

/** 工具执行默认超时 */
export const TOOL_DEFAULT_TIMEOUT_MS = 60_000

/** 默认重试次数（0 = 不重试） */
export const TOOL_MAX_RETRIES = 2

/** 重试初始延迟（指数退避：delay * 2^attempt） */
export const TOOL_RETRY_DELAY_MS = 1_000

/**
 * 按工具名覆盖超时。
 *
 * 设备控制类工具涉及物理动作（电机移动 / 摄像头抓帧），需要更长超时：
 * - 电机满程 700mm 约 30-40s，加上轮询稳定时间需 90s+
 * - ffmpeg 抓帧最长 15s，但加上移动+组合操作需 120s
 * - 继电器 / LED 近乎瞬时，给 10s 足够
 */
export const TOOL_TIMEOUT_OVERRIDES: Record<string, number> = {
  // 设备控制（builtin-device-control）
  toggle_relay: 10_000, // 继电器动作 + 状态确认
  set_led: 8_000, // LED 设置 + 短暂等待
  control_camera: 90_000, // 电机移动 + 位置稳定轮询
  reset_camera: 90_000, // 电机复位 + 位置稳定轮询
  take_camera_snapshot: 20_000, // ffmpeg 抓帧
  move_camera_and_look: 120_000, // 移动 + 截图组合
  // 任务管理（builtin-agent-tasks）
  update_task: 5_000, // 内存操作，应快速响应
  // 深度研究：多轮 LLM + 搜索 + 抓正文，实测 1-3 分钟，给足 8 分钟
  deep_research: 480_000,
  web_search: 30_000, // 单次联网检索应快速返回，卡住 30s 即视为失败
  // 技能工坊：分析→生成→彩排→评分多轮 LLM，最坏再跑 1 轮自动修订。
  // 外层必须 > SKILL_FORGE_PIPELINE_BUDGET_MS（见下方契约表），否则预算还没兜住就被判超时。
  create_skill_from_doc: 480_000,
  refine_skill: 480_000,
  // 视觉诊断：VLM 读图 + 结构化输出，实测 20~60s。
  // 外层必须 > VISION_DIAGNOSE_DEFAULT_TIMEOUT_MS（见下方契约表）。
  diagnose_plant_image: 120_000,
  // 设备接入工坊：与技能工坊同构的多轮 LLM 管线（内层预算 240s）。
  // 🐛 修复（2026-10-12）：此前无覆盖 → 落到默认 60s，而内层管线要跑 240s，
  //    等于「外层必然先判超时」，用户几乎拿不到结果。现对齐技能工坊给 480s。
  connect_device_from_doc: 480_000,
  // 文档处理：PDF 首次解析要加载 pdfjs 与 cmaps，扫描件还要逐张走多模态；
  // 生成 PDF 需解析 20MB 中文字体（子集化），首字节延迟可达数秒。都给足预算。
  document_read: 180_000,
  document_create: 120_000,
  document_edit: 120_000,
}

// ─────────────────────────────────────────────────────────────
// 三、内层管线预算（与工具级超时构成"必须大于"契约）
// ─────────────────────────────────────────────────────────────

/** 辅助 LLM 调用（非主对话链路，如技能工坊 / 设备语义解析）的默认超时 */
export const AUX_LLM_TIMEOUT_MS = 180_000

/** 技能工坊单次 LLM 调用超时（skill-forge-service 消费） */
export const SKILL_FORGE_LLM_TIMEOUT_MS = AUX_LLM_TIMEOUT_MS

/** 技能工坊整条管线的时间预算，到点收敛输出草稿（skill-forge-service 消费） */
export const SKILL_FORGE_PIPELINE_BUDGET_MS = 300_000

/** 视觉诊断默认超时（vision-gateway 消费；多候选时按候选数均分，下限 20s） */
export const VISION_DIAGNOSE_DEFAULT_TIMEOUT_MS = 60_000

/** 视觉诊断多候选均分后的单候选下限 */
export const VISION_CANDIDATE_MIN_TIMEOUT_MS = 20_000

/** 设备接入工坊整条管线的时间预算（device-integration-service 消费） */
export const DEVICE_FORGE_PIPELINE_BUDGET_MS = 240_000

/**
 * 「外层工具超时 > 内层管线预算」的显式契约表。
 *
 * 内层先兜底、外层后判超时，才不会出现「内层还没收敛，外层已经放弃」。
 * 两个数值都引用上面的同一个常量 / 同一张覆盖表 → 改一处即可，契约由测试守住。
 */
export const PIPELINE_BUDGET_CONTRACTS: ReadonlyArray<{
  /** 外层工具名（TOOL_TIMEOUT_OVERRIDES 的 key） */
  tool: string
  /** 内层管线预算来源（取当前值用于比较） */
  innerBudgetMs: number
  /** 人类可读的内层说明 */
  innerLabel: string
}> = [
  {
    tool: 'create_skill_from_doc',
    innerBudgetMs: SKILL_FORGE_PIPELINE_BUDGET_MS,
    innerLabel: '技能工坊管线预算（PIPELINE_BUDGET_MS）',
  },
  {
    tool: 'refine_skill',
    innerBudgetMs: SKILL_FORGE_PIPELINE_BUDGET_MS,
    innerLabel: '技能工坊管线预算（PIPELINE_BUDGET_MS）',
  },
  {
    tool: 'diagnose_plant_image',
    innerBudgetMs: VISION_DIAGNOSE_DEFAULT_TIMEOUT_MS,
    innerLabel: '视觉诊断默认超时（diagnose 内层）',
  },
  {
    tool: 'connect_device_from_doc',
    innerBudgetMs: DEVICE_FORGE_PIPELINE_BUDGET_MS,
    innerLabel: '设备接入工坊管线预算（PIPELINE_BUDGET_MS）',
  },
]

// ─────────────────────────────────────────────────────────────
// 四、工具风险登记表（唯一源 → 派生禁重试集 / 计划模式屏蔽集）
// ─────────────────────────────────────────────────────────────

/** 风险类别：physical=物理动作，write=写库/写状态，expensive=慢且非幂等（读为主） */
export type ToolRiskCategory = 'physical' | 'write' | 'expensive'

export interface ToolRisk {
  category: ToolRiskCategory
  /** 为什么禁重试（空字符串 = 允许重试） */
  noRetryReason: string
  /** 计划模式是否必须屏蔽（计划模式只出方案、不动数据） */
  blockedInPlanMode: boolean
  /**
   * 「请求批准」模式（approvalMode === 'request'）下，是否必须**执行前**停下来
   * 等用户点确认（见 `CONFIRMATION_REQUIRED_TOOLS`）。
   *
   * 🚨 与 `blockedInPlanMode` 是两件事，别混：
   *    · blockedInPlanMode = 计划模式下**一律不许做**；
   *    · requiresConfirmation = **可以做，但先问一句**（执行前在 sender 上方浮出确认条）。
   *
   * 判定口径（2026-10-14 用户：「所有高风险工具」）：会产生
   * **物理动作**（设备启停 / 云台移动）或**不可逆写**（删设备、删策略、部署自动化、改病历）。
   * 纯读取、纯耗时（研究 / 识图 / 技能工坊）不在此列 —— 那些只是慢，不会动硬件或删数据。
   */
  requiresConfirmation: boolean
}

/**
 * 工具风险登记表。
 *
 * 这张表同时被四处消费：
 *   1. `NO_RETRY_TOOLS`（重试策略）
 *   2. `PLAN_MODE_BLOCKED_TOOLS`（计划模式）
 *   3. `CONFIRMATION_REQUIRED_TOOLS`（请求批准模式下的执行前确认）
 *   4. 「新增 AI 工具同步 5 处」的自检清单
 * ⇒ 往后再加工具，只需在这里登记一次，派生集合自动跟上；漏登记会被测试抓（见 warnings）。
 *
 * ⚠️ 当前成员与改造前**逐字一致**，未做任何行为变更。
 */
export const TOOL_RISK_REGISTRY: Record<string, ToolRisk> = {
  // ── 设备控制：MQTT 指令可能已发出并执行，重试会导致重复物理动作 ──
  toggle_relay: {
    category: 'physical',
    noRetryReason: 'MQTT 指令可能已发出并执行，重试会重复开关继电器',
    blockedInPlanMode: true,
    requiresConfirmation: true,
  },
  set_led: {
    category: 'physical',
    noRetryReason: '同上：灯效指令可能已生效，重试会重复切换',
    blockedInPlanMode: true,
    requiresConfirmation: true,
  },
  control_camera: {
    category: 'physical',
    noRetryReason: '电机可能已在移动，重试会重复下发位移指令',
    blockedInPlanMode: true,
    requiresConfirmation: true,
  },
  reset_camera: {
    category: 'physical',
    noRetryReason: '复位动作不可重复叠加',
    blockedInPlanMode: true,
    requiresConfirmation: true,
  },
  take_camera_snapshot: {
    category: 'physical',
    noRetryReason: '抓帧会占用设备；重试可能产生重复帧与额外耗时',
    blockedInPlanMode: false,
    // 只抓一帧图像，不改物理状态、不写数据 → 不必打断用户
    requiresConfirmation: false,
  },
  move_camera_and_look: {
    category: 'physical',
    noRetryReason: '移动 + 截图组合，重试会重复移动电机',
    blockedInPlanMode: false,
    requiresConfirmation: true,
  },
  /**
   * ⚠️ 已知缺口（登记但**未**改行为，避免静默变更；由 getAgentBudgetWarnings() 提示）：
   *    - 允许自动重试：删除设备失败重试会误报"设备不存在"
   *    - 计划模式未屏蔽：计划模式应只出方案、不动硬件
   */
  delete_device: {
    category: 'write',
    noRetryReason: '',
    blockedInPlanMode: false,
    requiresConfirmation: true,
  },

  // ── 任务 / 自动化：写状态或写库，重试会产生重复记录 ──
  update_task: {
    category: 'write',
    noRetryReason: '状态变更已生效，重试会重复触发自动推进逻辑',
    blockedInPlanMode: false,
    // 任务清单是会话内部的 TODO，改它不动硬件也不删数据
    requiresConfirmation: false,
  },
  task_create: {
    category: 'write',
    // 当前允许重试（未登记为禁重试）—— 见 getAgentBudgetWarnings()
    noRetryReason: '',
    blockedInPlanMode: true,
    requiresConfirmation: false,
  },
  task_update: {
    category: 'write',
    noRetryReason: '',
    blockedInPlanMode: true,
    requiresConfirmation: false,
  },
  /** 定时任务 = 未来某个时刻自动动设备 → 属于「不可逆部署」，必须确认 */
  cron_create: {
    category: 'write',
    noRetryReason: '',
    blockedInPlanMode: true,
    requiresConfirmation: true,
  },
  automation_strategy_create: {
    category: 'write',
    noRetryReason: '写库已生效后重试会产生重复策略或"策略不存在"的误报',
    blockedInPlanMode: true,
    requiresConfirmation: true,
  },
  automation_strategy_update: {
    category: 'write',
    noRetryReason: '同上：写库已生效后重试会误报"策略不存在"',
    blockedInPlanMode: true,
    requiresConfirmation: true,
  },
  automation_strategy_delete: {
    category: 'write',
    noRetryReason: '同上：删除已生效后重试会误报"策略不存在"',
    blockedInPlanMode: true,
    requiresConfirmation: true,
  },
  automation_canvas_apply: {
    category: 'write',
    noRetryReason: '',
    blockedInPlanMode: true,
    requiresConfirmation: true,
  },

  // ── 通用硬件接入 ──
  /**
   * 🚨 它「写」的只是前端表单，不是数据：把 Copilot 整理的草稿灌进接入向导并打开，
   *    真正的设备创建仍要用户点「完成接入」。因此：
   *    · 不 blockedInPlanMode（计划模式里预填一个表单也不会产生副作用）；
   *    · 不需要确认条（多一次点击只会打断「我说完就看到了」的体验）；
   *    · 允许重试（覆盖同一份草稿是幂等的）。
   */
  device_access_apply_draft: {
    category: 'write',
    noRetryReason: '',
    blockedInPlanMode: false,
    requiresConfirmation: false,
  },
  /**
   * 增量填字段（device_form_patch）：同样只写前端表单，不落库。
   * 与上面那份的区别是它是**幂等的增量** —— 重复调同一组字段结果一致，
   * 所以连「禁重试」的理由都没有，也更不需要确认条打断用户。
   */
  device_form_patch: {
    category: 'write',
    noRetryReason: '',
    blockedInPlanMode: false,
    requiresConfirmation: false,
  },
  // device_form_read 是纯查询（与 list_devices 同理），不进风险登记表。

  // ── 慢 + 非幂等：Promise.race 超时不取消后台，重试会重复执行 ──
  // （这一类只是「慢」，不动硬件也不删数据 → 不打断用户）
  deep_research: {
    category: 'expensive',
    noRetryReason: '超时不取消后台执行，研究可能仍完成入库，重试会重复研究 + 重复入库',
    blockedInPlanMode: false,
    requiresConfirmation: false,
  },
  create_skill_from_doc: {
    category: 'expensive',
    noRetryReason: '超时不取消后台管线，重试会整条重跑（多次 LLM + 可能重复注册技能）',
    blockedInPlanMode: false,
    requiresConfirmation: false,
  },
  refine_skill: {
    category: 'expensive',
    noRetryReason: '同技能工坊：超时不取消后台管线',
    blockedInPlanMode: false,
    requiresConfirmation: false,
  },
  diagnose_plant_image: {
    category: 'expensive',
    noRetryReason: 'VLM 按图计费且超时不取消后台，重试 = 双倍耗时 + 双倍额度，且两次结论可能不一致',
    blockedInPlanMode: false,
    requiresConfirmation: false,
  },
  connect_device_from_doc: {
    category: 'expensive',
    noRetryReason: '同技能工坊：超时不取消后台管线，重试会整条重跑（多次 LLM 调用）',
    blockedInPlanMode: false,
    // 本工具只产出「接入卡片」交回前端给用户确认，真正的写入发生在那张卡上
    requiresConfirmation: false,
  },

  // ── 病历写操作：改/删已生效后重试会重复归档或误报"病历不存在" ──
  update_medical_record: {
    category: 'write',
    noRetryReason: '改动已生效，重试会重复归档或误报"病历不存在"',
    blockedInPlanMode: true,
    requiresConfirmation: true,
  },
  delete_medical_record: {
    category: 'write',
    noRetryReason: '删除已生效，重试会误报"病历不存在"',
    blockedInPlanMode: true,
    requiresConfirmation: true,
  },

  // ── 文档处理（PDF/Word/Excel/PPT）──
  /**
   * 读文档：本身只写一条「已读」的本地缓存，不产生业务副作用。
   * 但 `include_images: true` 会把扫描页逐张送多模态模型 → 慢且按图计费，
   * 因此归 expensive 并禁重试（重试 = 双倍模型调用），但计划模式允许读（计划本就要先看材料）。
   */
  document_read: {
    category: 'expensive',
    noRetryReason: '扫描件读取会逐张调用多模态模型；重试会重复计费且可能得到不同转写结果',
    blockedInPlanMode: false,
    requiresConfirmation: false,
  },
  /**
   * 生成文档：写的是「新产物文件」，不覆盖任何现有数据 → 不打断用户；
   * 但重试会在文件列表里堆出多份同名产物，所以禁自动重试。
   * 计划模式屏蔽：计划阶段只出方案，不该往用户文件夹里丢文件。
   */
  document_create: {
    category: 'write',
    noRetryReason: '重试会在文件列表里生成多份重复产物',
    blockedInPlanMode: true,
    requiresConfirmation: false,
  },
  /**
   * 编辑文档：产出新副本（原件保留），不删除任何东西 → 不打断用户；
   * 但重试会基于「同样的 ops」再生成一个副本，且可能叠加上一次的改动。
   */
  document_edit: {
    category: 'write',
    noRetryReason: '编辑已产出新副本，重试会重复生成并可能叠加改动',
    blockedInPlanMode: true,
    requiresConfirmation: false,
  },
}

/** 禁止自动重试的工具（由风险登记表派生） */
export const NO_RETRY_TOOLS: ReadonlySet<string> = new Set(
  Object.entries(TOOL_RISK_REGISTRY)
    .filter(([, r]) => r.noRetryReason !== '')
    .map(([name]) => name),
)

/** 计划模式下屏蔽的工具（由风险登记表派生） */
export const PLAN_MODE_BLOCKED_TOOLS: ReadonlySet<string> = new Set(
  Object.entries(TOOL_RISK_REGISTRY)
    .filter(([, r]) => r.blockedInPlanMode)
    .map(([name]) => name),
)

/**
 * 「请求批准」模式下**执行前必须停下来等用户点确认**的工具（由风险登记表派生）。
 *
 * 消费方 = `app/api/chat/route.ts`：Agent Loop 执行服务端工具**之前**，若本轮是
 * `approvalMode === 'request'` 且工具落在此集合内 → 不执行，先推 SSE
 * `tool_confirmation_required`，前端据此在 **sender 上方**浮出确认条；
 * 用户点「执行」才真正下发，点「忽略」则把「用户拒绝执行」作为工具结果交回 AI。
 *
 * 2026-10-14 用户：「设备启停 / 删除 / 自动化部署等高风险操作，不要输出卡片让用户点，
 * 改成在 sender 上方出现确认」。
 */
export const CONFIRMATION_REQUIRED_TOOLS: ReadonlySet<string> = new Set(
  Object.entries(TOOL_RISK_REGISTRY)
    .filter(([, r]) => r.requiresConfirmation)
    .map(([name]) => name),
)

// ─────────────────────────────────────────────────────────────
// 五、人机挂起（HITL）超时
// ─────────────────────────────────────────────────────────────

/** `waitForUserInput` 默认超时：CHECKPOINT / CLARIFY 等用户回复 */
export const HITL_USER_INPUT_TIMEOUT_MS = 5 * 60 * 1000

/** 前端工具结果等待超时（与用户输入分开：浏览器工具通常更快） */
export const HITL_CLIENT_TOOL_TIMEOUT_MS = 2 * 60 * 1000

// ─────────────────────────────────────────────────────────────
// 六、上下文阈值（再导出，供一处查阅；真正定义仍在 context/）
// ─────────────────────────────────────────────────────────────

export { COMPACTION_THRESHOLDS, DEFAULT_COMPRESSION }

// ─────────────────────────────────────────────────────────────
// 七、契约校验（由 agent-budget.test.ts 锁定）
// ─────────────────────────────────────────────────────────────

/**
 * 硬约束校验：返回的每条 = 必须立即修的 bug。
 * 用字符串返回（而非直接 throw），便于测试断言与 dev 面板展示。
 */
export function getAgentBudgetViolations(): string[] {
  const out: string[] = []

  // 1. 工具覆盖超时必须是有限正整数
  for (const [name, ms] of Object.entries(TOOL_TIMEOUT_OVERRIDES)) {
    if (!Number.isFinite(ms) || ms <= 0) {
      out.push(`TOOL_TIMEOUT_OVERRIDES["${name}"] = ${ms} 不是有限正整数`)
    }
  }

  // 2. 「外层工具超时 > 内层管线预算」契约
  for (const { tool, innerBudgetMs, innerLabel } of PIPELINE_BUDGET_CONTRACTS) {
    const outer = TOOL_TIMEOUT_OVERRIDES[tool]
    if (outer === undefined) {
      out.push(`契约断裂：${tool} 未在 TOOL_TIMEOUT_OVERRIDES 中登记，但存在内层预算「${innerLabel}」`)
    } else if (outer <= innerBudgetMs) {
      out.push(
        `契约断裂：${tool} 外层超时 ${outer}ms <= 内层预算 ${innerBudgetMs}ms（${innerLabel}）` +
          ` —— 内层来不及兜底就会被外层判超时`,
      )
    }
  }

  // 3. 登记为「禁重试」的工具必须有非空理由（防止无理由地放宽）
  for (const [name, risk] of Object.entries(TOOL_RISK_REGISTRY)) {
    if (risk.noRetryReason === '' && risk.category === 'expensive') {
      out.push(`风险登记表：${name} 属 expensive 类但未给出禁重试理由`)
    }
  }

  // 4. 压缩阈值必须严格递增（tiny < small < large），否则分支不可达
  const t = COMPACTION_THRESHOLDS
  if (!(t.tiny < t.small && t.small < t.large)) {
    out.push(`COMPACTION_THRESHOLDS 未严格递增：tiny=${t.tiny} small=${t.small} large=${t.large}`)
  }

  // 5. 压缩配置：近端保留条数应少于中段保留条数
  if (DEFAULT_COMPRESSION.recentKeepCount >= DEFAULT_COMPRESSION.middleKeepCount) {
    out.push(
      `DEFAULT_COMPRESSION 近端保留(${DEFAULT_COMPRESSION.recentKeepCount}) ` +
        `应小于中段保留(${DEFAULT_COMPRESSION.middleKeepCount})`,
    )
  }

  return out
}

/**
 * 软约束提醒：不是 bug，但值得复核的设计缺口。
 * 典型用途 = 「新增 AI 工具同步 5 处」时，暴露漏登记的写操作。
 */
export function getAgentBudgetWarnings(): string[] {
  const out: string[] = []

  // 有副作用但当前允许重试 → 需人工确认上游是否幂等
  for (const [name, risk] of Object.entries(TOOL_RISK_REGISTRY)) {
    const isSideEffect = risk.category === 'physical' || risk.category === 'write'
    if (isSideEffect && risk.noRetryReason === '') {
      out.push(
        `${name} 属 ${risk.category} 类（有副作用）但当前允许自动重试 —— ` +
          `若上游非幂等，重试会产生重复记录 / 重复动作`,
      )
    }
  }

  // 物理动作类工具应一律在计划模式屏蔽
  for (const [name, risk] of Object.entries(TOOL_RISK_REGISTRY)) {
    if (risk.category === 'physical' && !risk.blockedInPlanMode) {
      out.push(`${name} 是物理动作类，但未在计划模式屏蔽 —— 计划模式应只出方案、不动硬件`)
    }
  }

  // 禁重试的工具若有超时覆盖，覆盖值应足够大（>= 默认）
  for (const name of NO_RETRY_TOOLS) {
    const override = TOOL_TIMEOUT_OVERRIDES[name]
    if (override !== undefined && override > TOOL_DEFAULT_TIMEOUT_MS) {
      continue // 慢工具，正常
    }
    if (override === undefined) {
      const risk = TOOL_RISK_REGISTRY[name]
      if (risk?.category === 'expensive') {
        out.push(`${name} 属 expensive 类但没有超时覆盖，将落到默认 ${TOOL_DEFAULT_TIMEOUT_MS}ms`)
      }
    }
  }

  return out
}

/** 断言式入口：契约断裂时抛错（供脚本 / 启动自检调用，测试环境外用） */
export function assertAgentBudget(): void {
  const violations = getAgentBudgetViolations()
  if (violations.length > 0) {
    throw new Error(`[agent-budget] 契约校验失败：\n- ${violations.join('\n- ')}`)
  }
}
