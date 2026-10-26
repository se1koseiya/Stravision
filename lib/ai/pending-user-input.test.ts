/**
 * pending-user-input 注册表回归测试
 *
 * 背景（2026-10-09 修复）：
 * AI 助手的 ask_user_question / <CLARIFY> 澄清卡在用户提交答案后长时间无响应。
 *
 * 根因有两层：
 *  A. 注册表用的是模块级 `new Map()`，而 Next.js App Router 会按路由入口分别打包 ——
 *     `/api/chat`（挂起方）与 `/api/chat/respond`（恢复方）各持一份互不相干的 Map，
 *     respond 永远查不到挂起点，Agent Loop 只能等到 5 分钟超时。
 *  B. 上一版修 A 时引入的解析函数 `resolvePendingUserInputByCheckpointId` 在**未命中**时
 *     无条件返回 true（把回复塞进「早到回复」缓冲），导致 respond 路由里的
 *     `resolvePendingUserInputByUserId` 兜底变成**死代码** —— 一旦 checkpoint_id 对不上
 *     （模型复用同名 checkpoint / 前端残留陈旧 id / 跨会话重名），服务端就返回 200「假成功」
 *     却什么都没恢复，Agent Loop 原地干等到 5 分钟。
 *
 * 本测试锁定六条不变量：
 *   1. 本地 waiter 挂在 globalThis 上（跨 bundle 实例共享）
 *   2. 精确匹配能命中；**未命中必须返回 false**（绝不假成功吞掉）
 *   3. 未命中时 `ByUserId` 自愈路径可用（id 失配也能恢复用户当前真正在等的那一个）
 *   4. 「用户 + checkpointId」双重匹配不会误伤别的会话的同名 checkpoint
 *   5. 【2026-10-14】跨实例：索引里**持有者进程已死**的挂起不得被当作成功恢复
 *   6. 【2026-10-14】跨实例投递能把远端答复落到本地挂起上；AbortSignal 能立刻释放挂起
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  waitForUserInput,
  resolvePendingUserInputByCheckpointId,
  resolvePendingUserInputByUserId,
  resolvePendingUserInputByUserIdAndCheckpoint,
  cancelPendingUserInput,
  getPendingUserInput,
  countPendingUserInput,
  __resetPendingUserInputForTests,
} from './pending-user-input'
import { HITL_INSTANCE_ID, getHitlTransport, __setHitlTransportForTests } from './hitl'
import { RedisTransport } from './hitl/redis-transport'
import { createFakeRedisFactory, createFakeRedisStore } from './hitl/fake-redis'
import { __resetInProcessIndexForTests } from './hitl/in-process-transport'

// 每个用例前清空注册表（globalThis 是进程级共享，必须手动复位）
beforeEach(() => {
  __retransport(undefined)
  __resetPendingUserInputForTests()
  __resetInProcessIndexForTests()
})

afterEach(() => {
  __retransport(undefined)
  __resetPendingUserInputForTests()
  __resetInProcessIndexForTests()
})

/** 便捷：替换 HITL 传输层单例（undefined = 恢复默认选择逻辑） */
function __retransport(t: ReturnType<typeof getHitlTransport> | undefined): void {
  __setHitlTransportForTests(t)
}

describe('pending-user-input registry', () => {
  it('注册表挂在 globalThis 上，跨路由 bundle 实例共享', () => {
    const g = globalThis as any
    expect(g.__berryPendingUserInput).toBeDefined()
    expect(g.__berryPendingUserInput.map).toBeInstanceOf(Map)
  })

  it('按 checkpointId 精确解析：挂起方与恢复方共享同一份 Map', async () => {
    const p = waitForUserInput('session-4-1', 'clarify-abc', 'clarify', '测试', 5000)
    expect(getPendingUserInput('session-4-1')).toBeTruthy()

    const ok = await resolvePendingUserInputByCheckpointId('clarify-abc', '我选方案A')
    expect(ok).toBe(true)
    await expect(p).resolves.toBe('我选方案A')
    expect(getPendingUserInput('session-4-1')).toBeUndefined()
  })

  // 🎯 核心回归：未命中必须返回 false，否则 respond 路由的 ByUserId 兜底永远执行不到，
  //    前端会收到 200「假成功」然后静默挂到 5 分钟超时。
  it('未命中的 checkpointId 必须返回 false（不得假成功吞掉回复）', async () => {
    const p = waitForUserInput('session-4-7', 'clarify-real', 'clarify', '测试', 5000)
    p.catch(() => {}) // 收尾 cancel 会 reject，先挂上 catch 避免未处理拒绝
    // 用错误的 id 解析
    expect(await resolvePendingUserInputByCheckpointId('clarify-WRONG', '走错门的回复')).toBe(false)
    // 真挂起点必须还在（不能被假的回复消费掉）
    expect(getPendingUserInput('session-4-7')).toBeTruthy()
    expect(countPendingUserInput()).toBe(1)
    cancelPendingUserInput('session-4-7', 'cleanup')
  })

  // 🎯 自愈路径：id 失配时，ByUserId 仍能把该用户当前真正在等的那一个恢复
  it('id 失配时按 userId 自愈：仍可恢复用户当前挂起的 checkpoint', async () => {
    const p = waitForUserInput('session-4-8', 'cp_light_retry', 'checkpoint', '如何处理', 5000)
    // 前端回传了一个对不上的 id（陈旧 / 被模型复用）
    expect(await resolvePendingUserInputByCheckpointId('cp_stale_name', '确认')).toBe(false)
    // 自愈：按 userId 前缀命中真正在等的那一个
    expect(await resolvePendingUserInputByUserId(4, '确认')).toBe(true)
    await expect(p).resolves.toBe('确认')
  })

  it('「userId + checkpointId」双重匹配：不会误伤别的会话的同名 checkpoint', async () => {
    // 用户 4 的会话在等 A；另一个会话（用户 9）也在等同名 id
    const mine = waitForUserInput('session-4-9', 'cp_same_name', 'checkpoint', '我的', 5000)
    const other = waitForUserInput('session-9-9', 'cp_same_name', 'checkpoint', '别人的', 5000)
    other.catch(() => {}) // 收尾 cancel 会 reject，先挂上 catch 避免未处理拒绝

    // 精确双匹配必须命中用户 4 自己的那一个
    expect(await resolvePendingUserInputByUserIdAndCheckpoint(4, 'cp_same_name', '我的答复')).toBe(true)
    await expect(mine).resolves.toBe('我的答复')
    // 另一个会话的挂起必须原封不动
    expect(getPendingUserInput('session-9-9')).toBeTruthy()
    cancelPendingUserInput('session-9-9', 'cleanup')
    void other
  })

  it('checkpoint 类型同样支持按 id 精确解析', async () => {
    const p = waitForUserInput('session-4-3', 'cp-xyz', 'checkpoint', '确认执行', 5000)
    expect(await resolvePendingUserInputByCheckpointId('cp-xyz', '确认')).toBe(true)
    await expect(p).resolves.toBe('确认')
  })

  it('超时后 reject，且不残留条目', async () => {
    const p = waitForUserInput('session-4-4', 'clarify-timeout', 'clarify', '测试', 30)
    await expect(p).rejects.toBeTruthy()
    expect(getPendingUserInput('session-4-4')).toBeUndefined()
  })

  it('同 session 新挂起会拒绝旧挂起（防并发污染）', async () => {
    const first = waitForUserInput('session-4-5', 'clarify-1', 'clarify', 'A', 5000)
    const second = waitForUserInput('session-4-5', 'clarify-2', 'clarify', 'B', 5000)
    await expect(first).rejects.toContain('superseded')
    expect(await resolvePendingUserInputByCheckpointId('clarify-2', '答B')).toBe(true)
    await expect(second).resolves.toBe('答B')
  })

  it('cancelPendingUserInput 会 reject 并清理', async () => {
    const p = waitForUserInput('session-4-6', 'clarify-cancel', 'clarify', '测试', 5000)
    cancelPendingUserInput('session-4-6', 'stream_closed')
    await expect(p).rejects.toContain('stream_closed')
    expect(getPendingUserInput('session-4-6')).toBeUndefined()
  })

  // 🎯 根因回归：模拟 Next.js App Router 的两个 route bundle 各自实例化本模块。
  // vi.resetModules() 会让下次 import 重新执行模块顶层代码（等价于第二个打包实例）。
  // 修复前：两个实例各持一份模块级 Map，挂起方注册的 promise 恢复方永远看不到。
  // 修复后：都挂到 globalThis，跨实例共享。
  it('跨模块实例（模拟双 bundle）：A 实例挂起，B 实例可 resolve', async () => {
    const p = waitForUserInput('session-9-1', 'clarify-bundle', 'clarify', '测试', 5000)
    expect(getPendingUserInput('session-9-1')).toBeTruthy()

    vi.resetModules()
    const second = await import('./pending-user-input')
    expect(second.PENDING_USER_INPUT_INSTANCE_ID).toBeTruthy()

    const ok = await second.resolvePendingUserInputByCheckpointId('clarify-bundle', '跨实例回复')
    expect(ok).toBe(true)
    await expect(p).resolves.toBe('跨实例回复')
  })

  // ───────────────────────── 2026-10-14 新增：水平扩展相关 ─────────────────────────

  it('跨实例投递：远端实例认领后送来的 resolve 能落到本地挂起上', async () => {
    const p = waitForUserInput('session-4-11', 'cp_remote', 'checkpoint', '远端', 5000)
    // 这正是在另一个容器上响应 POST /api/chat/respond 时会做的事：
    // 认领索引项 → deliver({ instanceId: 持有者, action: 'resolve', reply })
    getHitlTransport().deliver({
      kind: 'user-input',
      key: 'session-4-11',
      instanceId: HITL_INSTANCE_ID,
      action: 'resolve',
      reply: '远端答复',
    })
    await expect(p).resolves.toBe('远端答复')
    expect(getPendingUserInput('session-4-11')).toBeUndefined()
  })

  it('跨实例投递：instanceId 不匹配时不得动别人的挂起', async () => {
    const p = waitForUserInput('session-4-12', 'cp_other', 'checkpoint', '别人的', 5000)
    p.catch(() => {})
    getHitlTransport().deliver({
      kind: 'user-input',
      key: 'session-4-12',
      instanceId: 'i-someone-else',
      action: 'resolve',
      reply: '不该送达',
    })
    expect(getPendingUserInput('session-4-12')).toBeTruthy()
    cancelPendingUserInput('session-4-12', 'cleanup')
  })

  // 🎯 「绝不假成功」的跨实例版本：索引里有条目，但持有它的进程已经没了。
  //    此时若返回 true，用户会看到「已送达」而 AI 永远不动 —— 比 404 更糟。
  it('持有者进程已死（无心跳）的索引项：必须返回 false 而不是假成功', async () => {
    const store = createFakeRedisStore()
    __setHitlTransportForTests(
      new RedisTransport('redis://fake:6379', createFakeRedisFactory(store))
    )
    const transport = getHitlTransport()
    // 冒充一个已经消失的实例留下的残留索引（没有 heartbeat key）
    await transport.upsert({
      kind: 'user-input',
      key: 'session-4-dead',
      instanceId: 'i-vanished',
      sessionId: 'session-4-dead',
      checkpointId: 'cp_dead',
      createdAt: Date.now(),
      expiresAt: Date.now() + 60_000,
    })
    store.strings.delete('berry:hitl:alive:i-vanished')

    expect(await resolvePendingUserInputByCheckpointId('cp_dead', '答复')).toBe(false)
    // 未被消费：残留索引仍在（等它自己过期）
    expect(await transport.claim('user-input', 'session-4-dead')).not.toBeNull()
  })

  it('AbortSignal：连接断开时立刻释放挂起（不再空占 5 分钟）', async () => {
    const controller = new AbortController()
    const p = waitForUserInput('session-4-13', 'cp_abort', 'checkpoint', '断线', 5000, controller.signal)
    expect(getPendingUserInput('session-4-13')).toBeTruthy()

    controller.abort('client_disconnected')
    await expect(p).rejects.toContain('client_disconnected')
    expect(getPendingUserInput('session-4-13')).toBeUndefined()
  })

  it('AbortSignal：已中止的 signal 直接拒绝，不注册挂起', async () => {
    const controller = new AbortController()
    controller.abort()
    await expect(
      waitForUserInput('session-4-14', 'cp_already_aborted', 'checkpoint', '已断线', 5000, controller.signal)
    ).rejects.toBeTruthy()
    expect(getPendingUserInput('session-4-14')).toBeUndefined()
  })

  it('正常 resolve 后不再响应 abort（解绑监听，避免误伤后续挂起）', async () => {
    const controller = new AbortController()
    const p = waitForUserInput('session-4-15', 'cp_ok', 'checkpoint', '正常', 5000, controller.signal)
    expect(await resolvePendingUserInputByCheckpointId('cp_ok', '答')).toBe(true)
    await expect(p).resolves.toBe('答')
    expect(() => controller.abort()).not.toThrow()
  })
})
