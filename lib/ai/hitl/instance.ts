/**
 * 本进程实例指纹
 *
 * 用途：
 *  - 索引项记录「谁在等」，投递时按 instanceId 过滤；
 *  - 诊断日志里用于区分「不同 bundle / 不同容器」。
 *
 * 挂在 globalThis 上（与挂起注册表同样的原因）：Next.js App Router 会按路由入口
 * 分别打包同一模块，模块级变量在两个 bundle 里是两个值；挂到 globalThis 后
 * **同一进程**内所有 bundle 共用同一个指纹 —— 这正是我们想要的语义
 * （水平扩展的单元是进程，不是 bundle）。
 */
interface HitlInstanceGlobal {
  id: string
}

const g = globalThis as unknown as { __berryHitlInstance?: HitlInstanceGlobal }
if (!g.__berryHitlInstance) {
  g.__berryHitlInstance = { id: `i-${Math.random().toString(36).slice(2, 10)}` }
}

export const HITL_INSTANCE_ID: string = g.__berryHitlInstance.id
