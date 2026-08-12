/**
 * 内置任务管理工具 — update_task 实现
 *
 * 架构变更（重要）：
 * - 旧模式：AI 每次任务状态变更都重新输出完整 <TASK_LIST> JSON 标签，
 *   前端解析后刷新卡片。问题：token 浪费 + 容易跑偏 + 多轮标签污染上下文。
 * - 新模式：AI 首次输出 <TASK_LIST> 建立初始任务列表（一次），
 *   后续状态变更通过 update_task 工具调用，工具在内存中维护 task list，
 *   返回更新后的完整列表，前端监听 tool_result 事件刷新卡片。
 *
 * 数据来源：
 * - 首次 <TASK_LIST> 标签内容会被前端通过 tool 参数传入（task_list 字段），
 *   或者前端直接监听 <TASK_LIST> 标签建立初始状态，工具仅做增量更新。
 * - 简化方案：工具内部维护 sessionTaskLists，首次调用时若不存在则从
 *   AI 输出历史中解析 <TASK_LIST> 初始化（这部分由前端处理）。
 *
 * 状态一致性：
 * - 同一 session 同一时间只有一个活跃的 task list
 * - 工具调用是幂等的：重复设置同一状态不会产生副作用
 */

export interface TaskItem {
  type?: string
  text: string
}

export interface Task {
  id: string
  title: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  items?: TaskItem[]
  note?: string
}

export interface TaskList {
  status: string
  tasks: Task[]
}

export interface ToolCallResult {
  success: boolean
  data?: any
  error?: string
  executionTime?: number
}

// 全局注册表：sessionId -> TaskList
const sessionTaskLists = new Map<string, TaskList>()

/**
 * 初始化 session 的 task list（首次 <TASK_LIST> 标签出现时调用）
 */
export function initSessionTaskList(sessionId: string, taskList: TaskList): void {
  sessionTaskLists.set(sessionId, JSON.parse(JSON.stringify(taskList))) // 深拷贝防污染
  console.log(`[AgentTasks] Initialized task list for session ${sessionId}, ${taskList.tasks.length} tasks`)
}

/**
 * 获取 session 当前的 task list
 */
export function getSessionTaskList(sessionId: string): TaskList | undefined {
  return sessionTaskLists.get(sessionId)
}

/**
 * 清理 session 的 task list（会话结束时调用）
 */
export function clearSessionTaskList(sessionId: string): void {
  sessionTaskLists.delete(sessionId)
}

/**
 * 执行 update_task 工具调用
 *
 * 行为：
 * 1. 若 session 尚无 task list（首次工具调用），返回 error 提示 AI 先输出 <TASK_LIST>
 * 2. 找到 task_id 对应的任务，更新 status 和 note
 * 3. 自动推进：若新状态是 completed/failed，自动把下一个 pending 任务设为 in_progress
 *    （仅当当前没有其他 in_progress 任务时，避免并发污染）
 * 4. 返回更新后的完整 task list
 */
export async function executeUpdateTask(
  args: Record<string, any>,
  agentContext?: { userId?: number; sessionId?: string }
): Promise<ToolCallResult> {
  const startTime = Date.now()
  const sessionId = agentContext?.sessionId

  if (!sessionId) {
    return { success: false, error: '缺少 sessionId，无法更新任务状态', executionTime: Date.now() - startTime }
  }

  const { task_id, status, note } = args as {
    task_id: string
    status: 'pending' | 'in_progress' | 'completed' | 'failed'
    note?: string
  }

  if (!task_id || !status) {
    return { success: false, error: '缺少必需参数 task_id 或 status', executionTime: Date.now() - startTime }
  }

  const validStatuses = ['pending', 'in_progress', 'completed', 'failed']
  if (!validStatuses.includes(status)) {
    return { success: false, error: `无效的 status 值: ${status}，必须是 ${validStatuses.join('/')}`, executionTime: Date.now() - startTime }
  }

  const taskList = sessionTaskLists.get(sessionId)
  if (!taskList) {
    return {
      success: false,
      error: '当前会话尚无任务列表。请先用 <TASK_LIST> 标签输出初始任务规划，再调用 update_task 更新状态。',
      executionTime: Date.now() - startTime,
    }
  }

  const targetTask = taskList.tasks.find(t => t.id === task_id)
  if (!targetTask) {
    return {
      success: false,
      error: `找不到 task_id="${task_id}"。当前任务列表中的 ID: ${taskList.tasks.map(t => t.id).join(', ')}`,
      executionTime: Date.now() - startTime,
    }
  }

  // 更新目标任务状态
  const oldStatus = targetTask.status
  targetTask.status = status
  if (note) targetTask.note = note

  // 自动推进：完成/失败后自动激活下一个 pending 任务
  if ((status === 'completed' || status === 'failed') && oldStatus !== status) {
    const hasOtherInProgress = taskList.tasks.some(t => t.id !== task_id && t.status === 'in_progress')
    if (!hasOtherInProgress) {
      const nextPending = taskList.tasks.find(t => t.status === 'pending')
      if (nextPending) {
        nextPending.status = 'in_progress'
        console.log(`[AgentTasks] Auto-advanced task ${nextPending.id} to in_progress`)
      }
    }
  }

  // 计算整体状态
  const allCompleted = taskList.tasks.every(t => t.status === 'completed')
  const anyFailed = taskList.tasks.some(t => t.status === 'failed')
  taskList.status = allCompleted ? 'completed' : anyFailed ? 'failed' : 'in_progress'

  console.log(`[AgentTasks] Updated task ${task_id}: ${oldStatus} → ${status}, session=${sessionId}`)

  return {
    success: true,
    data: {
      updated_task: {
        id: targetTask.id,
        title: targetTask.title,
        old_status: oldStatus,
        new_status: status,
        note: note || null,
      },
      // 返回完整 task list，前端据此刷新卡片
      task_list: taskList,
      // 同时返回 <TASK_LIST> 标签格式，前端可直接更新 latestTaskListContent
      task_list_tag: `<TASK_LIST>${JSON.stringify(taskList)}</TASK_LIST>`,
      summary: `任务 "${targetTask.title}" 状态已更新为 ${status}。整体进度: ${taskList.tasks.filter(t => t.status === 'completed').length}/${taskList.tasks.length}`,
    },
    executionTime: Date.now() - startTime,
  }
}

/**
 * 任务管理工具分发入口
 */
export async function executeAgentTaskTool(
  functionName: string,
  args: Record<string, any>,
  agentContext?: { userId?: number; sessionId?: string }
): Promise<ToolCallResult> {
  const userId = agentContext?.userId
  console.log(`[AgentTasks] Calling tool: ${functionName}, userId: ${userId || 'none'}, args:`, args)

  try {
    switch (functionName) {
      case 'update_task':
        return await executeUpdateTask(args, agentContext)
      default:
        return { success: false, error: `未知的任务管理工具: ${functionName}` }
    }
  } catch (error: any) {
    console.error(`[AgentTasks] Error executing ${functionName}:`, error)
    return { success: false, error: error.message || '任务管理工具执行失败' }
  }
}
