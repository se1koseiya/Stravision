/**
 * 挂起的用户输入注册表
 *
 * 用于支持 Agent Loop 内的「等待用户输入」机制：
 * - 当 AI 输出 <CHECKPOINT> / <CLARIFY> 时，Agent Loop 不退出，
 *   而是挂起等待用户填表回复
 * - 前端渲染表单 → 用户提交 → POST /api/chat/respond
 * - respond 路由通过 sessionId 找到挂起的 resolve 函数，传回用户回复
 * - Agent Loop 继续下一轮迭代
 *
 * 同一个 session 同一时间只允许一个挂起的 checkpoint（防止并发污染）
 */

export interface PendingUserInput {
  /** 挂起点 ID（CHECKPOINT JSON 的 id 或 CLARIFY 自动生成） */
  checkpointId: string
  /** 挂起类型：checkpoint / clarify */
  type: 'checkpoint' | 'clarify'
  /** 挂起时间戳 */
  createdAt: number
  /** 标题（用于调试） */
  title?: string
  /** resolve 回调：用户回复到达时调用，参数为用户回复文本 */
  resolve: (reply: string) => void
  /** reject 回调：超时或连接断开时调用 */
  reject: (reason: string) => void
}

// 全局注册表：sessionId -> PendingUserInput
const pendingMap = new Map<string, PendingUserInput>()

/**
 * 注册一个挂起的用户输入请求
 *
 * @returns resolve 回调，供 Agent Loop await
 */
export function registerPendingUserInput(
  sessionId: string,
  pending: Omit<PendingUserInput, 'createdAt'>
): void {
  // 如果该 session 已有挂起的请求，先拒绝旧的（防止并发污染）
  const existing = pendingMap.get(sessionId)
  if (existing) {
    existing.reject('superseded_by_new_checkpoint')
    pendingMap.delete(sessionId)
  }
  pendingMap.set(sessionId, { ...pending, createdAt: Date.now() })
  console.log(`[PendingUserInput] Registered ${pending.type} for session ${sessionId}, id=${pending.checkpointId}`)
}

/**
 * 用户回复到达时调用：resolve 挂起的 promise 并移除注册项
 *
 * @returns true 表示成功 resolve，false 表示没有挂起的请求
 */
export function resolvePendingUserInput(
  sessionId: string,
  reply: string
): boolean {
  const pending = pendingMap.get(sessionId)
  if (!pending) {
    console.warn(`[PendingUserInput] No pending input for session ${sessionId}`)
    return false
  }
  pending.resolve(reply)
  pendingMap.delete(sessionId)
  console.log(`[PendingUserInput] Resolved ${pending.type} for session ${sessionId}, reply length=${reply.length}`)
  return true
}

/**
 * 取消挂起的请求（连接断开 / 超时 / 用户主动取消）
 */
export function cancelPendingUserInput(sessionId: string, reason: string): void {
  const pending = pendingMap.get(sessionId)
  if (!pending) return
  pending.reject(reason)
  pendingMap.delete(sessionId)
  console.log(`[PendingUserInput] Cancelled ${pending.type} for session ${sessionId}, reason=${reason}`)
}

/**
 * 查询当前是否有挂起的请求（用于调试 / 健康检查）
 */
export function getPendingUserInput(sessionId: string): PendingUserInput | undefined {
  return pendingMap.get(sessionId)
}

/**
 * 按用户 ID 解析挂起的请求
 *
 * sessionId 格式为 `session-${userId}-${timestamp}`，
 * 前端无法知道完整 sessionId，所以通过 userId 前缀匹配。
 *
 * 同一用户同时只允许一个挂起的 checkpoint（由 registerPendingUserInput 保证），
 * 因此找到的第一个匹配项即为当前活跃的挂起请求。
 *
 * @returns true 表示成功 resolve
 */
export function resolvePendingUserInputByUserId(userId: number, reply: string): boolean {
  const prefix = `session-${userId}-`
  for (const [sessionId, pending] of pendingMap.entries()) {
    if (sessionId.startsWith(prefix)) {
      pending.resolve(reply)
      pendingMap.delete(sessionId)
      console.log(`[PendingUserInput] Resolved by userId ${userId}, session=${sessionId}, reply length=${reply.length}`)
      return true
    }
  }
  return false
}

/**
 * 等待用户输入
 *
 * - 注册挂起请求 → await promise
 * - 超时自动 reject（5 分钟默认）
 * - 外部可通过 resolvePendingUserInput / cancelPendingUserInput 控制
 */
export function waitForUserInput(
  sessionId: string,
  checkpointId: string,
  type: 'checkpoint' | 'clarify',
  title: string,
  timeoutMs: number = 5 * 60 * 1000
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    registerPendingUserInput(sessionId, {
      checkpointId,
      type,
      title,
      resolve,
      reject,
    })

    // 超时清理：5 分钟未回复自动取消，避免长连接资源占用
    setTimeout(() => {
      const stillPending = pendingMap.get(sessionId)
      if (stillPending && stillPending.checkpointId === checkpointId) {
        cancelPendingUserInput(sessionId, `timeout_after_${timeoutMs}ms`)
      }
    }, timeoutMs)
  })
}
