/**
 * 内置自动化策略工具（builtin-automation-strategy）
 *
 * 设计目标：与 builtin-device-control 对齐 —— 把原本"AI 输出 <AUTOMATION_STRATEGY> 标签
 * + 前端正则解析 + 用户手动点保存"的链路，重构为"原生 tool_call + 工具内部直接写库 +
 * 结果回灌 agent loop"。AI 因此具备对自动化策略的完整增删改查能力。
 *
 * 5 个工具：
 *   - automation_strategy_list   列出全部策略摘要（返回 rule_id，供后续操作定位）
 *   - automation_strategy_detail 取单条策略完整图数据（改图前必读）
 *   - automation_strategy_create 新建策略（直接落库，无需用户再点保存）
 *   - automation_strategy_update 改名/改描述/启停/提交完整图
 *   - automation_strategy_delete 删除策略（不可恢复）
 *
 * 权限：自动化策略表（automation_rules）无 owner 字段、全局共享，
 * 因此不做角色限制（与设备控制的 admin-only 不同），只要求已登录；
 * 所有写操作都会记录 userId 便于审计。删除前要求 AI 先 list 确认目标。
 */

interface ToolCallResult {
  success: boolean
  data?: any
  error?: string
}

interface StrategyToolContext {
  userId?: number
  sessionId?: string
}

/** 合法的 ReactFlow 节点类型（与 components/automation/node-types.ts 保持一致） */
const VALID_NODE_TYPES = new Set(['triggerNode', 'logicNode', 'aiNode', 'actionNode'])

/** 节点类型 → 默认列坐标（AI 常不带 position，缺位置时自动分列排布，避免编辑器里全部堆叠在原点） */
const DEFAULT_COLUMN_X: Record<string, number> = {
  triggerNode: 40,
  logicNode: 300,
  aiNode: 560,
  actionNode: 820,
}

const NODE_TYPE_LABEL: Record<string, string> = {
  triggerNode: '触发器',
  logicNode: '逻辑判断',
  aiNode: 'AI 处理',
  actionNode: '执行动作',
}

type AutomationService = typeof import('@/lib/db/automation-service')

let servicePromise: Promise<AutomationService> | null = null

/** 动态加载数据访问层（避免该模块被引入时即触发 DB 初始化） */
async function getService(): Promise<AutomationService> {
  if (!servicePromise) {
    servicePromise = import('@/lib/db/automation-service')
  }
  return servicePromise
}

/**
 * 图数据归一化 + 校验
 *
 * 1. 接受对象或 JSON 字符串两种输入（模型偶尔把对象序列化成字符串传入）
 * 2. 校验 nodes 非空、type 合法、edges 的 source/target 必须存在于 nodes
 * 3. 为缺失 position / label 的节点补齐默认值，保证前端 ReactFlow 能正常渲染
 *
 * @returns 归一化后的 { nodes, edges }；校验失败时返回 { error }
 */
function normalizeGraph(
  raw: any
): { ok: true; nodes: any[]; edges: any[] } | { ok: false; error: string } {
  let graph = raw
  if (typeof graph === 'string') {
    try {
      graph = JSON.parse(graph)
    } catch {
      return { ok: false, error: 'graph_data 是字符串但不是合法 JSON' }
    }
  }
  if (!graph || typeof graph !== 'object' || Array.isArray(graph)) {
    return { ok: false, error: 'graph_data 必须是 {nodes, edges} 对象' }
  }
  if (!Array.isArray(graph.nodes) || graph.nodes.length === 0) {
    return { ok: false, error: 'graph_data 必须包含非空 nodes 数组' }
  }

  const columnCursor: Record<string, number> = {}
  const nodes = (graph.nodes as any[]).map((n: any, index: number) => {
    const node = { ...n }
    if (!node.id) node.id = `node-${index + 1}`
    if (!node.type || !VALID_NODE_TYPES.has(node.type)) {
      return { __invalid: `节点 ${node.id} 的 type 非法（${node.type || '空'}），必须是 triggerNode/logicNode/aiNode/actionNode 之一` }
    }
    node.data = { ...(node.data || {}) }
    if (!node.data.label) {
      node.data.label = NODE_TYPE_LABEL[node.type] || node.type
    }
    if (!node.position || typeof node.position.x !== 'number' || typeof node.position.y !== 'number') {
      const column = DEFAULT_COLUMN_X[node.type] ?? 300
      const row = columnCursor[node.type] ?? 0
      columnCursor[node.type] = row + 1
      node.position = { x: column, y: 80 + row * 150 }
    }
    return node
  })

  const bad = nodes.find((n: any) => n && n.__invalid)
  if (bad) return { ok: false, error: bad.__invalid }

  const nodeIds = new Set(nodes.map((n: any) => n.id))
  const edgesRaw = Array.isArray(graph.edges) ? graph.edges : []
  const edges = edgesRaw.map((e: any, index: number) => ({
    ...e,
    id: e?.id || `e${index + 1}`,
  }))
  const badEdge = edges.find((e: any) => !nodeIds.has(e.source) || !nodeIds.has(e.target))
  if (badEdge) {
    return {
      ok: false,
      error: `边 ${badEdge.id} 的 source/target（${badEdge.source} → ${badEdge.target}）未对应 nodes 中已定义的 id`,
    }
  }

  return { ok: true, nodes, edges }
}

/** 从触发器节点推断 trigger_type，推断不出则回落 manual */
function inferTriggerType(nodes: any[], fallback?: string): string {
  const trigger = nodes.find((n: any) => n.type === 'triggerNode')
  const t = trigger?.data?.type
  if (typeof t === 'string' && t.trim()) return t.trim()
  return fallback || 'manual'
}

/** 统一的登录校验（策略表无 owner，登录用户即可增删改） */
function requireLogin(ctx?: StrategyToolContext): { ok: boolean; error?: string } {
  if (!ctx?.userId) {
    return { ok: false, error: '无法获取用户信息，请重新登录后再操作自动化策略' }
  }
  return { ok: true }
}

// ===========================================================================
// automation_strategy_create
// ===========================================================================

async function executeCreate(
  args: Record<string, any>,
  ctx?: StrategyToolContext
): Promise<ToolCallResult> {
  const auth = requireLogin(ctx)
  if (!auth.ok) return { success: false, error: auth.error }

  const name = String(args.name || '').trim()
  if (!name) {
    return { success: false, error: 'name 不能为空：请给策略起一个简短明确的名称' }
  }
  if (args.graph_data === undefined || args.graph_data === null) {
    return { success: false, error: 'graph_data 不能为空：必须提供完整的 {nodes, edges} 图数据' }
  }

  const normalized = normalizeGraph(args.graph_data)
  if (!normalized.ok) return { success: false, error: normalized.error }

  const { initAutomationTable, createRule } = await getService()
  await initAutomationTable()

  const triggerType =
    typeof args.trigger_type === 'string' && args.trigger_type.trim()
      ? args.trigger_type.trim()
      : inferTriggerType(normalized.nodes)

  const created = await createRule({
    name,
    description: typeof args.description === 'string' ? args.description : '',
    is_active: args.is_active === false ? false : true,
    graph_data: JSON.stringify({ nodes: normalized.nodes, edges: normalized.edges }),
    trigger_type: triggerType,
  })

  console.log(
    `[AutomationStrategy] create: user=${ctx?.userId} rule=${created.id} name="${created.name}" trigger=${created.trigger_type}`
  )

  return {
    success: true,
    data: {
      rule_id: created.id,
      name: created.name,
      description: created.description || '',
      is_active: created.is_active,
      trigger_type: created.trigger_type,
      node_count: normalized.nodes.length,
      message: `策略「${created.name}」已创建并保存（rule_id: ${created.id}）`,
    },
  }
}

// ===========================================================================
// automation_strategy_list
// ===========================================================================

async function executeList(
  args: Record<string, any>,
  ctx?: StrategyToolContext
): Promise<ToolCallResult> {
  const auth = requireLogin(ctx)
  if (!auth.ok) return { success: false, error: auth.error }
  void args

  const { initAutomationTable, getRules } = await getService()
  await initAutomationTable()
  const rules = await getRules()

  return {
    success: true,
    data: {
      total: rules.length,
      rules: rules.map(r => {
        let nodeCount = 0
        let nodesSummary: string[] = []
        try {
          const graph = JSON.parse(r.graph_data || '{}')
          if (Array.isArray(graph.nodes)) {
            nodeCount = graph.nodes.length
            nodesSummary = graph.nodes.map(
              (n: any) => `${n?.type || '?'}|${n?.data?.label || n?.id || '?'}`
            )
          }
        } catch (e) {
          console.warn('[AutomationStrategy] list: graph_data 解析失败', r.id, e)
        }
        return {
          rule_id: r.id,
          name: r.name,
          description: r.description || '',
          is_active: r.is_active,
          trigger_type: r.trigger_type || 'manual',
          execution_count: r.execution_count,
          updated_at: r.updated_at,
          node_count: nodeCount,
          nodes_summary: nodesSummary,
        }
      }),
    },
  }
}

// ===========================================================================
// automation_strategy_detail
// ===========================================================================

async function executeDetail(
  args: Record<string, any>,
  ctx?: StrategyToolContext
): Promise<ToolCallResult> {
  const auth = requireLogin(ctx)
  if (!auth.ok) return { success: false, error: auth.error }

  const ruleId = String(args.rule_id || '').trim()
  if (!ruleId) return { success: false, error: 'rule_id 不能为空' }

  const { initAutomationTable, getRule } = await getService()
  await initAutomationTable()
  const rule = await getRule(ruleId)
  if (!rule) {
    return {
      success: false,
      error: `策略 ${ruleId} 不存在，请先调用 automation_strategy_list 获取有效的 rule_id`,
    }
  }

  let graph: any = null
  try {
    graph = JSON.parse(rule.graph_data || 'null')
  } catch (e) {
    console.error('[AutomationStrategy] detail: graph_data 解析失败', ruleId, e)
    return {
      success: false,
      error: `策略「${rule.name}」的图数据已损坏，无法解析。建议引导用户在自动化策略页面重建`,
    }
  }

  return {
    success: true,
    data: {
      rule_id: rule.id,
      name: rule.name,
      description: rule.description || '',
      is_active: rule.is_active,
      trigger_type: rule.trigger_type || 'manual',
      execution_count: rule.execution_count,
      created_at: rule.created_at,
      updated_at: rule.updated_at,
      graph_data: graph,
    },
  }
}

// ===========================================================================
// automation_strategy_update
// ===========================================================================

async function executeUpdate(
  args: Record<string, any>,
  ctx?: StrategyToolContext
): Promise<ToolCallResult> {
  const auth = requireLogin(ctx)
  if (!auth.ok) return { success: false, error: auth.error }

  const ruleId = String(args.rule_id || '').trim()
  if (!ruleId) return { success: false, error: 'rule_id 不能为空' }

  const updates: Record<string, any> = {}
  if (typeof args.name === 'string' && args.name.trim()) updates.name = args.name.trim()
  if (typeof args.description === 'string') updates.description = args.description
  if (typeof args.is_active === 'boolean') updates.is_active = args.is_active

  if (args.graph_data !== undefined && args.graph_data !== null) {
    const normalized = normalizeGraph(args.graph_data)
    if (!normalized.ok) return { success: false, error: normalized.error }
    updates.graph_data = JSON.stringify({ nodes: normalized.nodes, edges: normalized.edges })
    updates.trigger_type = inferTriggerType(normalized.nodes, args.trigger_type)
  } else if (typeof args.trigger_type === 'string' && args.trigger_type.trim()) {
    updates.trigger_type = args.trigger_type.trim()
  }

  if (Object.keys(updates).length === 0) {
    return {
      success: false,
      error: '未提供任何要修改的字段：name / description / is_active / graph_data / trigger_type 至少传一项',
    }
  }

  const { initAutomationTable, updateRule } = await getService()
  await initAutomationTable()
  const updated = await updateRule(ruleId, updates)
  if (!updated) {
    return {
      success: false,
      error: `策略 ${ruleId} 不存在，请先调用 automation_strategy_list 获取有效的 rule_id`,
    }
  }

  console.log(
    `[AutomationStrategy] update: user=${ctx?.userId} rule=${ruleId} fields=${Object.keys(updates).join(',')}`
  )

  return {
    success: true,
    data: {
      rule_id: updated.id,
      name: updated.name,
      is_active: updated.is_active,
      trigger_type: updated.trigger_type || 'manual',
      updated_at: updated.updated_at,
      changed_fields: Object.keys(updates),
      message: `策略「${updated.name}」已更新（${Object.keys(updates).join('、')}）`,
    },
  }
}

// ===========================================================================
// automation_strategy_delete
// ===========================================================================

async function executeDelete(
  args: Record<string, any>,
  ctx?: StrategyToolContext
): Promise<ToolCallResult> {
  const auth = requireLogin(ctx)
  if (!auth.ok) return { success: false, error: auth.error }

  const ruleId = String(args.rule_id || '').trim()
  if (!ruleId) return { success: false, error: 'rule_id 不能为空' }

  const { initAutomationTable, getRule, deleteRule } = await getService()
  await initAutomationTable()

  const rule = await getRule(ruleId)
  if (!rule) {
    return {
      success: false,
      error: `策略 ${ruleId} 不存在，请先调用 automation_strategy_list 获取有效的 rule_id`,
    }
  }

  const ok = await deleteRule(ruleId)
  if (!ok) return { success: false, error: `策略「${rule.name}」删除失败` }

  console.log(`[AutomationStrategy] delete: user=${ctx?.userId} rule=${ruleId} name="${rule.name}"`)

  return {
    success: true,
    data: {
      rule_id: ruleId,
      name: rule.name,
      message: `策略「${rule.name}」已删除（不可恢复）`,
    },
  }
}

/**
 * 自动化策略工具分发入口
 */
export async function executeAutomationStrategyTool(
  functionName: string,
  args: Record<string, any>,
  agentContext?: StrategyToolContext
): Promise<ToolCallResult> {
  console.log(
    `[AutomationStrategy] Calling tool: ${functionName}, userId: ${agentContext?.userId || 'none'}`
  )

  try {
    switch (functionName) {
      case 'automation_strategy_create':
        return await executeCreate(args, agentContext)
      case 'automation_strategy_list':
        return await executeList(args, agentContext)
      case 'automation_strategy_detail':
        return await executeDetail(args, agentContext)
      case 'automation_strategy_update':
        return await executeUpdate(args, agentContext)
      case 'automation_strategy_delete':
        return await executeDelete(args, agentContext)
      default:
        return { success: false, error: `未知的自动化策略工具: ${functionName}` }
    }
  } catch (error: any) {
    console.error(`[AutomationStrategy] Error executing ${functionName}:`, error)
    return { success: false, error: error?.message || '自动化策略工具执行失败' }
  }
}

/** 供内部复用：图数据校验（update 之外的调用方如需预校验可使用） */
export { normalizeGraph as normalizeAutomationGraph }
