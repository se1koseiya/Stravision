/**
 * 工具能力元数据（并行调度的唯一依据）
 *
 * 为什么要这张表 —— 旧实现（parallel-tool-executor 里的猜测式启发）错在哪：
 *
 *   1. `argsStr.includes(prevTool.name)`
 *      把整个 arguments JSON 串起来做子串匹配：参数值里写了另一个工具名就凭空产生一条依赖。
 *      反过来，**真正的依赖不会有名字重合**，于是被漏判 → 并行顺序出错。
 *
 *   2. 根因：OpenAI 式 function calling **没有任何机制**让同一个 assistant turn 里的
 *      一个 tool_call 引用另一个 tool_call 的结果。既然引用不了，"数据依赖"在这一层
 *      **不可能存在**。真正存在、且必须串行的只有一件事 —— **资源冲突**：
 *         - 两个写同一资源（写-写）
 *         - 一个写、另一个读同一资源（写-读）
 *      典型现实例子：`move_camera_and_look`（把电机移到某地）必须排在
 *      `take_camera_snapshot`（就位后抓帧）之前 —— 二者竞争同一个 `device:camera`。
 *
 *   3. `canExecuteInParallel` 的白名单写法 `name.includes('get_channel')`，
 *      会命中任何含该子串的工具；而且白名单是「看起来无害」的手工枚举，
 *      新增工具忘了登记就静默退化。
 *
 * 于是：把「谁读写什么资源」**显式登记**成这张表，串行 / 并行由 conflicts 做确定性推导，
 * 不再靠猜字符串。新增有副作用的工具必须来这里登记；未登记工具也有明确的兜底策略
 * （见 UNKNOWN_TOOL_POLICY）。
 */

/** 可被竞争的资源槽 */
export type ResourceSlot =
  /** 继电器状态 */
  | 'device:relay'
  /** LED 状态 */
  | 'device:led'
  /** 摄像头位置（云台/滑轨）—— 移动与抓帧共享 */
  | 'device:camera'
  /** 设备注册表（列表 / 删除 / 接入） */
  | 'device:registry'
  /** 接入向导里的草稿表单（Copilot 预填的目标；不落库） */
  | 'device:access-draft'
  /** Agent 任务清单 */
  | 'tasks'
  /** 自动化策略 */
  | 'automation:strategy'
  /** 自动化画布 */
  | 'automation:canvas'
  /** 定时任务 */
  | 'cron'
  /** 病历档案 */
  | 'medical'
  /** 知识库 */
  | 'knowledge'
  /** 用户记忆档案 */
  | 'user:memory'
  /** 技能库 */
  | 'skills'
  /**
   * 文档文件库（上传件 + AI 生成的产物）。
   *
   * 冲突判定依据：`document_edit` 会基于某文件产新副本，与「同 turn 内再编辑同一批文件」
   * 构成写-写；`document_read` 读的是磁盘现状，与编辑并发会读到改动前的版本。
   * 注意 read-read 不冲突（hasResourceConflict 只判写-写 / 写-读），所以一次读多份文件仍可并行。
   */
  | 'documents'

export interface ToolCapability {
  /** 本工具会**写入**（改变状态）的资源槽 */
  writes?: ResourceSlot[]
  /** 本工具依赖（读取）的资源槽；与写者并发会读到中间态 */
  reads?: ResourceSlot[]
  /**
   * 显式声明的前置工具名。
   *
   * 用于表达「模型无法在同一个 turn 里体现、但我们确实希望排顺序」的场景。
   * 目前唯一的来源是历史启发式规则（analyze / diagnose 排在联网检索之后），
   * 保留它是为了迁移期行为不作变更 —— 确认无副作用后可清空。
   */
  dependsOn?: readonly string[]
}

/**
 * 「联网检索 / 抓正文」类工具。
 * 与旧启发式（工具名包含 search / scrape）等价，供下面两条 dependsOn 引用。
 */
export const SEARCH_TOOLS: readonly string[] = [
  'web_search',
  'mcp_brave_search',
  'mcp_exa_search',
  'mcp_anysearch_search',
  'mcp_anysearch_batch_search',
  'mcp_firecrawl_scrape',
]

/**
 * 显式工具能力表。
 *
 * ⚠️ 只有「写争用资源」或「读被写争用的资源」的工具才需要登记。
 *    纯查询类工具（传感器历史、天气、联网检索等）不登记 —— 它们与任何工具都无冲突。
 */
export const TOOL_CAPABILITIES: Record<string, ToolCapability> = {
  // ── 设备控制（互斥资源：同一硬件同一时刻只能做一件事）──
  // 并发下发会互相打断电机行程，必须串行。
  toggle_relay: { writes: ['device:relay'] },
  set_led: { writes: ['device:led'] },
  control_camera: { writes: ['device:camera'] },
  reset_camera: { writes: ['device:camera'] },
  move_camera_and_look: { writes: ['device:camera'] },
  /** 关键：抓帧依赖摄像头已就位，不得与上面任一个移动动作并发 */
  take_camera_snapshot: { reads: ['device:camera'] },
  delete_device: { writes: ['device:registry'] },
  list_devices: { reads: ['device:registry'] },

  // ── 任务清单 ──
  task_create: { writes: ['tasks'] },
  task_update: { writes: ['tasks'] },
  update_task: { writes: ['tasks'] },
  task_list: { reads: ['tasks'] },

  // ── 定时任务 ──
  cron_create: { writes: ['cron'] },
  cron_delete: { writes: ['cron'] },
  cron_list: { reads: ['cron'] },

  // ── 自动化 ──
  automation_strategy_create: { writes: ['automation:strategy'] },
  automation_strategy_update: { writes: ['automation:strategy'] },
  automation_strategy_delete: { writes: ['automation:strategy'] },
  automation_strategy_list: { reads: ['automation:strategy'] },
  automation_strategy_detail: { reads: ['automation:strategy'] },
  automation_canvas_apply: { writes: ['automation:canvas'] },

  // ── 通用硬件接入（前端工具）──
  // 只把草稿灌进「接入向导」并打开它，**不写设备表**（用户仍需点「完成接入」）。
  // 登记它只是为了与自身串行：连着两轮灌草稿会把用户正在核对的内容覆盖掉。
  device_access_apply_draft: { writes: ['device:access-draft'] },
  /** 读「用户此刻在填哪张表/第几步/填了什么」：与任何写表单的动作互斥，否则读到中间态 */
  device_form_read: { reads: ['device:access-draft'] },
  /** 增量填字段：与整包预填争同一份表单状态，必须串行（否则后写的把先写的覆盖掉） */
  device_form_patch: { writes: ['device:access-draft'] },

  // ── 持久化数据 ──
  knowledge_save: { writes: ['knowledge'] },
  deep_research: { writes: ['knowledge'] },
  create_skill_from_doc: { writes: ['skills'] },
  refine_skill: { writes: ['skills'] },
  load_skill: { reads: ['skills'] },
  remember_user_info: { writes: ['user:memory'] },
  forget_user_info: { writes: ['user:memory'] },
  list_user_memory: { reads: ['user:memory'] },
  update_medical_record: { writes: ['medical'] },
  delete_medical_record: { writes: ['medical'] },
  query_medical_records: { reads: ['medical'] },
  get_medical_record: { reads: ['medical'] },

  // ── 文档处理（builtin-document）──
  document_read: { reads: ['documents'] },
  document_create: { writes: ['documents'] },
  document_edit: { reads: ['documents'], writes: ['documents'] },

  // ── 迁移期保留的顺序偏好（由历史启发式迁移而来，见 ToolCapability.dependsOn）──
  analyze_soil: { dependsOn: SEARCH_TOOLS },
  diagnose_plant_image: { dependsOn: SEARCH_TOOLS },
}

/**
 * 未登记工具（多为第三方 MCP 服务器提供的工具）的冲突策略。
 *
 * `self` —— 未登记工具隐含「写一个只有自己名的资源槽」：
 *   ・同一个未登记工具被调用多次 → 互相串行（避免重复动作）
 *   ・不同的未登记工具 → 仍可并行（保持与改造前一致的吞吐）
 * 之所以不全量串行，是因为那会让装了 MCP 的用户请求整体退化成串行。
 */
export const UNKNOWN_TOOL_POLICY = 'self' as const

/** 未登记工具的隐式写槽：只与「同名工具」冲突 */
function unknownSlot(toolName: string): string {
  return `tool:${toolName}`
}

/** 判断两个自定义槽是否相同（避免把 implicit slot 混进 ResourceSlot 类型） */
function hasIntersection(a: readonly string[], b: readonly string[]): boolean {
  if (a.length === 0 || b.length === 0) return false
  const set = new Set(b)
  return a.some(x => set.has(x))
}

/** 取某工具实际参与冲突判定的读写槽（字符串形式，含未登记工具的隐式槽） */
export function getResourceFootprint(toolName: string): { reads: string[]; writes: string[] } {
  const declared = TOOL_CAPABILITIES[toolName]
  if (declared) {
    return {
      reads: (declared.reads ?? []) as string[],
      writes: (declared.writes ?? []) as string[],
    }
  }
  return { reads: [], writes: [unknownSlot(toolName)] }
}

/** 该工具是否在能力表里显式登记过（用于测试与审计） */
export function isToolDeclared(toolName: string): boolean {
  return Object.prototype.hasOwnProperty.call(TOOL_CAPABILITIES, toolName)
}

/**
 * 两个工具是否存在资源冲突（写-写 / 写-读），冲突则不可并发。
 * 同名工具一律视为冲突 —— 同一个工具同 turn 多次调用应当串行，防止重复动作。
 */
export function hasResourceConflict(a: string, b: string): boolean {
  if (a === b) return true
  const fa = getResourceFootprint(a)
  const fb = getResourceFootprint(b)
  return (
    hasIntersection(fa.writes, fb.writes) ||
    hasIntersection(fa.writes, fb.reads) ||
    hasIntersection(fb.writes, fa.reads)
  )
}

/**
 * 已调度的工具里，哪些是 `tool` 尚未满足的前置依赖。
 *
 * @param tool 待调度的工具名
 * @param presentToolNames 本批次全部工具名
 * @param scheduledToolNames 已被排入之前批次的（本批次内的）工具名
 */
export function unsatisfiedDependencies(
  tool: string,
  presentToolNames: ReadonlySet<string>,
  scheduledToolNames: ReadonlySet<string>,
): string[] {
  const declared = TOOL_CAPABILITIES[tool]?.dependsOn ?? []
  return declared.filter(
    name => name !== tool && presentToolNames.has(name) && !scheduledToolNames.has(name),
  )
}
