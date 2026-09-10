/**
 * 内置用户记忆工具测试
 *
 * 验证 AI 通过工具（而非正则穷举）管理用户记忆的核心闭环：
 *   - remember_user_info：记住/纠错覆盖（同 key 覆盖旧值）
 *   - list_user_memory：列出已记住信息
 *   - forget_user_info：删除单项 / 清空全部
 */

import { describe, it, expect, afterEach } from 'vitest'
import { executeUserMemoryTool } from '../builtin-user-memory'
import { readUserMemory, clearUserMemory } from '@/lib/ai/user-memory-file-service'

// 用一个不会与真实用户冲突、且不与其它测试文件共享的 userId
// （user-memory-file-service.test.ts 用了 999999999，这里用 888888888 避免并行冲突）
const TEST_USER_ID = 888888888

afterEach(async () => {
  await clearUserMemory(TEST_USER_ID)
})

describe('executeUserMemoryTool - 记住与纠错覆盖', () => {
  it('记住用户称呼', async () => {
    const res = await executeUserMemoryTool('remember_user_info', { key: 'user_name', value: '小朱' }, { userId: TEST_USER_ID })
    expect(res.success).toBe(true)

    const memory = await readUserMemory(TEST_USER_ID)
    expect(memory.user_name).toBe('小朱')
  })

  it('纠错：同 key 覆盖旧值（记错名字后改回）', async () => {
    await executeUserMemoryTool('remember_user_info', { key: 'user_name', value: '小张' }, { userId: TEST_USER_ID })
    // 用户纠错
    await executeUserMemoryTool('remember_user_info', { key: 'user_name', value: '小朱' }, { userId: TEST_USER_ID })

    const memory = await readUserMemory(TEST_USER_ID)
    expect(memory.user_name).toBe('小朱')
    expect(memory.user_name).not.toBe('小张')
  })

  it('支持中文 key 别名（"称呼"→user_name）', async () => {
    const res = await executeUserMemoryTool('remember_user_info', { key: '称呼', value: '老王' }, { userId: TEST_USER_ID })
    expect(res.success).toBe(true)

    const memory = await readUserMemory(TEST_USER_ID)
    expect(memory.user_name).toBe('老王')
  })

  it('支持中文 key 别名（"品种"→strawberry_variety）', async () => {
    await executeUserMemoryTool('remember_user_info', { key: '品种', value: '红颜' }, { userId: TEST_USER_ID })
    const memory = await readUserMemory(TEST_USER_ID)
    expect(memory.strawberry_variety).toBe('红颜')
  })

  it('缺少参数时失败而非抛异常', async () => {
    const res = await executeUserMemoryTool('remember_user_info', { key: 'user_name' }, { userId: TEST_USER_ID })
    expect(res.success).toBe(false)
  })

  it('无 userId 时失败', async () => {
    const res = await executeUserMemoryTool('remember_user_info', { key: 'user_name', value: '小朱' }, {})
    expect(res.success).toBe(false)
  })

  it('清洗 value 的主语前缀（"我小朱"→"小朱"）', async () => {
    await executeUserMemoryTool('remember_user_info', { key: 'user_name', value: '我小朱' }, { userId: TEST_USER_ID })
    const memory = await readUserMemory(TEST_USER_ID)
    expect(memory.user_name).toBe('小朱')
  })

  it('清洗 value 的"我的名字叫"前缀', async () => {
    await executeUserMemoryTool('remember_user_info', { key: 'user_name', value: '我的名字叫老王' }, { userId: TEST_USER_ID })
    const memory = await readUserMemory(TEST_USER_ID)
    expect(memory.user_name).toBe('老王')
  })

  it('正常值不受清洗影响', async () => {
    await executeUserMemoryTool('remember_user_info', { key: 'strawberry_variety', value: '红颜' }, { userId: TEST_USER_ID })
    const memory = await readUserMemory(TEST_USER_ID)
    expect(memory.strawberry_variety).toBe('红颜')
  })
})

describe('executeUserMemoryTool - 列出与删除', () => {
  it('空记忆时返回 total=0', async () => {
    const res = await executeUserMemoryTool('list_user_memory', {}, { userId: TEST_USER_ID })
    expect(res.success).toBe(true)
    expect(res.data.total).toBe(0)
  })

  it('记住多条后可列出', async () => {
    await executeUserMemoryTool('remember_user_info', { key: 'user_name', value: '小朱' }, { userId: TEST_USER_ID })
    await executeUserMemoryTool('remember_user_info', { key: 'strawberry_variety', value: '红颜' }, { userId: TEST_USER_ID })

    const res = await executeUserMemoryTool('list_user_memory', {}, { userId: TEST_USER_ID })
    expect(res.data.total).toBe(2)
    expect(res.data.entries.map((e: any) => e.key)).toEqual(expect.arrayContaining(['user_name', 'strawberry_variety']))
  })

  it('删除单项后该项消失，其他保留', async () => {
    await executeUserMemoryTool('remember_user_info', { key: 'user_name', value: '小朱' }, { userId: TEST_USER_ID })
    await executeUserMemoryTool('remember_user_info', { key: 'strawberry_variety', value: '红颜' }, { userId: TEST_USER_ID })

    const del = await executeUserMemoryTool('forget_user_info', { key: 'user_name' }, { userId: TEST_USER_ID })
    expect(del.success).toBe(true)

    const memory = await readUserMemory(TEST_USER_ID)
    expect(memory.user_name).toBeUndefined()
    expect(memory.strawberry_variety).toBe('红颜')
  })

  it('清空全部记忆', async () => {
    await executeUserMemoryTool('remember_user_info', { key: 'user_name', value: '小朱' }, { userId: TEST_USER_ID })
    await executeUserMemoryTool('remember_user_info', { key: 'strawberry_variety', value: '红颜' }, { userId: TEST_USER_ID })

    const res = await executeUserMemoryTool('forget_user_info', { key: '*' }, { userId: TEST_USER_ID })
    expect(res.success).toBe(true)

    const memory = await readUserMemory(TEST_USER_ID)
    expect(Object.keys(memory).length).toBe(0)
  })
})
