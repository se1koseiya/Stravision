
import { initDB, query, queryOne, execute } from "./database"
import { v4 as uuidv4 } from 'uuid'

export interface AutomationRule {
  id: string
  name: string
  description?: string
  is_active: boolean
  graph_data: string // JSON string of ReactFlow data { nodes, edges }
  trigger_type: string // 'vlm', 'sensor', 'schedule', etc. (primary trigger)
  created_at: string
  updated_at: string
  last_triggered_at?: string
  execution_count: number
}

// 初始化 automation_rules 表
export async function initAutomationTable() {
  await initDB()
}

// 创建新规则
export async function createRule(rule: Omit<AutomationRule, "id" | "created_at" | "updated_at" | "execution_count">): Promise<AutomationRule> {
  const id = uuidv4()
  const now = new Date().toISOString()
  const newRule: AutomationRule = {
    ...rule,
    id,
    created_at: now,
    updated_at: now,
    execution_count: 0,
    is_active: rule.is_active ?? true
  }
  await execute(
    `INSERT INTO automation_rules (id, name, description, is_active, graph_data, trigger_type, created_at, updated_at, execution_count)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      newRule.id,
      newRule.name,
      newRule.description ?? null,
      newRule.is_active ? 1 : 0,
      newRule.graph_data,
      newRule.trigger_type ?? null,
      newRule.created_at,
      newRule.updated_at,
      newRule.execution_count
    ]
  )
  return newRule
}

// 获取所有规则
export async function getRules(): Promise<AutomationRule[]> {
  const rules = await query<any>("SELECT * FROM automation_rules ORDER BY updated_at DESC")
  return rules.map(r => ({
    ...r,
    is_active: Boolean(r.is_active)
  }))
}

// 获取活跃规则 (For execution engine)
export async function getActiveRules(): Promise<AutomationRule[]> {
  const rules = await query<any>("SELECT * FROM automation_rules WHERE is_active = 1 ORDER BY updated_at DESC")
  return rules.map(r => ({
    ...r,
    is_active: true
  }))
}

// 获取单个规则
export async function getRule(id: string): Promise<AutomationRule | undefined> {
  const rule = await queryOne<any>("SELECT * FROM automation_rules WHERE id = $1", [id])
  if (!rule) return undefined

  return {
    ...rule,
    is_active: Boolean(rule.is_active)
  }
}

// 更新规则
export async function updateRule(id: string, updates: Partial<AutomationRule>): Promise<AutomationRule | undefined> {
  const current = await getRule(id)
  if (!current) return undefined

  const updated = {
    ...current,
    ...updates,
    updated_at: new Date().toISOString()
  }

  await execute(
    `UPDATE automation_rules
     SET name = $1,
         description = $2,
         is_active = $3,
         graph_data = $4,
         trigger_type = $5,
         updated_at = $6,
         last_triggered_at = $7,
         execution_count = $8
     WHERE id = $9`,
    [
      updated.name,
      updated.description ?? null,
      updated.is_active ? 1 : 0,
      updated.graph_data,
      updated.trigger_type ?? null,
      updated.updated_at,
      updated.last_triggered_at ?? null,
      updated.execution_count,
      updated.id
    ]
  )
  return updated
}

// 删除规则
export async function deleteRule(id: string): Promise<boolean> {
  const result = await execute("DELETE FROM automation_rules WHERE id = $1", [id])
  return result.rowCount > 0
}

// 记录执行
export async function recordRuleExecution(id: string): Promise<void> {
  await execute(
    `UPDATE automation_rules
     SET execution_count = execution_count + 1,
         last_triggered_at = $1
     WHERE id = $2`,
    [new Date().toISOString(), id]
  )
}
