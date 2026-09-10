/**
 * AI 记忆档案查询 API
 *
 * GET /api/ai/memory-profile
 *   返回当前用户被 AI 记住的信息（优先读用户 md 记忆文件，回退到 db），
 *   供前端在对话首页展示"AI 已记住你"的感知条。
 */
export const runtime = "nodejs"

import { getCurrentUser } from "@/lib/auth"
import { getAllUserPreferences } from "@/lib/db/agent-memory-service"
import { readUserMemory } from "@/lib/ai/user-memory-file-service"

// 记忆 key → 中文标签（与 memory-prompt-enhancer 保持一致）
const MEMORY_KEY_LABELS: Record<string, string> = {
  user_name: '称呼',
  greenhouse_info: '大棚/场地',
  strawberry_variety: '草莓品种',
  growth_stage: '生育期',
  focus_area: '关注重点',
  preferred_temperature: '偏好温度',
  preferred_humidity: '偏好湿度',
  preferred_light: '偏好光照',
  preferred_watering_time: '习惯浇水时间',
  preferred_watering_duration: '习惯浇水时长',
  watering_habit: '浇水习惯',
  preferred_strawberry_variety: '草莓品种',
  notification_preference: '通知偏好',
  response_detail_level: '回复详细度',
  response_style: '回复风格',
  automation_preference: '自动化倾向',
  language_style: '语言风格',
  preference: '其他偏好',
}

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return Response.json({ error: "未登录" }, { status: 401 })
  }

  try {
    const userId = user.id as number

    // 🔥 优先读用户 md 记忆文件（唯一真相源）
    const memoryMap = await readUserMemory(userId)

    if (Object.keys(memoryMap).length > 0) {
      // md 文件有记忆 → 直接用它（无 confidence，前端按中性处理）
      const memories = Object.entries(memoryMap)
        .map(([key, value]) => ({
          key,
          label: MEMORY_KEY_LABELS[key] || key,
          value,
          confidence: 0.95, // md 文件为已确认记忆，给高置信度
        }))
      return Response.json({ memories })
    }

    // 回退：无 md 文件时读 db（老数据 / 设备模式等）
    const all = await getAllUserPreferences(userId)
    const memories = all
      .filter(p => p.confidence >= 0.6)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 8)
      .map(p => ({
        key: p.preference_key,
        label: MEMORY_KEY_LABELS[p.preference_key] || p.preference_key,
        value: p.preference_value,
        confidence: p.confidence,
      }))

    return Response.json({ memories })
  } catch (error) {
    console.error("[MemoryProfile] Failed to fetch:", error)
    return Response.json({ memories: [] })
  }
}
