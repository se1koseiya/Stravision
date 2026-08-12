import { getCurrentUser } from "@/lib/auth"
import { initDB, queryOne, execute } from "@/lib/db/database"
import { publishUserEvent } from "@/lib/server/user-event-bus"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { targetId, groupId } = await req.json()
    await initDB()

    // Ensure typing_status table exists
    await execute(
      `CREATE TABLE IF NOT EXISTS typing_status (
         user_id INTEGER NOT NULL,
         target_id INTEGER,
         group_id INTEGER,
         updated_at INTEGER NOT NULL,
         PRIMARY KEY (user_id, target_id, group_id)
       )`
    )

    // Update typing status
    // We use INSERT OR REPLACE to update the timestamp
    await execute(
      `INSERT INTO typing_status (user_id, target_id, group_id, updated_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, target_id, group_id)
       DO UPDATE SET updated_at = EXCLUDED.updated_at`,
      [user.id, targetId || 0, groupId || 0, Date.now()]
    )

    // 通过 SSE 推送 typing 事件给对方/群其他成员
    // 注意：typing 频率高，不广播给群全员，只推给对方/或群（前端按 peerId 路由）
    if (groupId) {
      // 群场景：每个群成员都可能想感知 typing，这里只推一次给"群"，前端订阅时按 groupId 过滤
      // 但 SSE 是按 userId 订阅的，我们无法群发——退化为不推 SSE，前端继续用 GET 轮询（2s）
      // 这样既保持兼容，又不增加复杂度
    } else if (targetId) {
      // 私聊场景：直接推给对方
      publishUserEvent({
        type: "chat_typing",
        userId: targetId,
        peerId: user.id,
        chatKind: "direct",
        isTyping: true,
        senderName: (user as any).username
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Typing status error:", error)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}

export async function GET(req: Request) {
    const user = await getCurrentUser()
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const targetId = searchParams.get('targetId')
    const groupId = searchParams.get('groupId')

    await initDB()
    const now = Date.now()
    const THRESHOLD = 3000 // 3 seconds

    try {
        let isTyping = false

        if (groupId) {
            // Check if anyone else is typing in the group
            const res = await queryOne<{ count: string | number }>(
                `SELECT COUNT(*) as count FROM typing_status 
                 WHERE group_id = $1 AND user_id != $2 AND updated_at > $3`,
                [groupId, user.id, now - THRESHOLD]
            )
            isTyping = Number(res?.count ?? 0) > 0
        } else if (targetId) {
            // Check if the specific friend is typing to us
            // target_id in DB is the receiver. So if Friend is typing to Me:
            // Friend's user_id = FriendID, Friend's target_id = MeID
            const res = await queryOne<{ count: string | number }>(
                `SELECT COUNT(*) as count FROM typing_status 
                 WHERE user_id = $1 AND target_id = $2 AND updated_at > $3`,
                [targetId, user.id, now - THRESHOLD]
            )
            isTyping = Number(res?.count ?? 0) > 0
        }

        return NextResponse.json({ isTyping })

    } catch (error) {
        return NextResponse.json({ isTyping: false })
    }
}
