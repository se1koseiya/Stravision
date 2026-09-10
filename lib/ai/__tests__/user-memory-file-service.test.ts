import { describe, it, expect, afterEach } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import {
  readUserMemory,
  writeUserMemory,
  getUserMemoryForPrompt,
  clearUserMemory,
} from '../user-memory-file-service'

// 用一个不会和真实用户冲突的测试 id
const TEST_USER_ID = 999999999

describe('user-memory-file-service', () => {
  afterEach(async () => {
    await clearUserMemory(TEST_USER_ID)
  })

  it('写入并读回记忆（含姓名置顶）', async () => {
    await writeUserMemory(TEST_USER_ID, [
      { key: 'user_name', value: '小朱' },
      { key: 'strawberry_variety', value: '红颜' },
    ])

    const map = await readUserMemory(TEST_USER_ID)
    expect(map.user_name).toBe('小朱')
    expect(map.strawberry_variety).toBe('红颜')
  })

  it('getUserMemoryForPrompt 返回完整 md 内容', async () => {
    await writeUserMemory(TEST_USER_ID, [{ key: 'user_name', value: '老王' }])

    const promptText = await getUserMemoryForPrompt(TEST_USER_ID)
    expect(promptText).toContain('# 用户记忆档案')
    expect(promptText).toContain('老王')
    expect(promptText).toContain('## 称呼')
  })

  it('无记忆文件时返回空（不抛异常）', async () => {
    await clearUserMemory(TEST_USER_ID)
    const map = await readUserMemory(TEST_USER_ID)
    expect(map).toEqual({})

    const promptText = await getUserMemoryForPrompt(TEST_USER_ID)
    expect(promptText).toBe('')
  })

  it('相同 key 覆盖，不同 key 保留（合并更新）', async () => {
    await writeUserMemory(TEST_USER_ID, [
      { key: 'user_name', value: '小朱' },
      { key: 'strawberry_variety', value: '红颜' },
    ])
    // 更新品种
    await writeUserMemory(TEST_USER_ID, [{ key: 'strawberry_variety', value: '章姬' }])

    const map = await readUserMemory(TEST_USER_ID)
    expect(map.user_name).toBe('小朱') // 姓名保留
    expect(map.strawberry_variety).toBe('章姬') // 品种已更新
  })

  it('md 文件确实落盘到 data/user-memory/', async () => {
    await writeUserMemory(TEST_USER_ID, [{ key: 'user_name', value: '测试' }])
    const filePath = path.join(process.cwd(), 'data', 'user-memory', `${TEST_USER_ID}.md`)
    const stat = await fs.stat(filePath).catch(() => null)
    expect(stat).not.toBeNull()
  })
})
