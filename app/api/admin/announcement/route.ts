
import { getCurrentUser } from "@/lib/auth"
import { initDB, queryOne, query, withTransaction } from "@/lib/db/database"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    await initDB()
    const { content, type = 'text' } = await req.json()
    if (!content) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 })
    }
    
    // Get Bot User
    const bot = await queryOne<{ id: number }>("SELECT id FROM users WHERE email = $1", ["bot@stravision.ai"])
    if (!bot) {
        return NextResponse.json({ error: "Bot user not initialized" }, { status: 500 })
    }

    // Get All Users (excluding bot)
    const users = await query<{ id: number }>("SELECT id FROM users WHERE id != $1", [bot.id])

    // Broadcast Message
    const now = Date.now()
    await withTransaction(async (client) => {
        for (const recipient of users) {
            // Check if they are already friends? 
            // In many systems, system bots can message anyone without being friends.
            // But if the frontend filters by friends, we might need to auto-friend them.
            // Let's assume the frontend fetches all conversations or we auto-add friendship.
            
            // Auto-add friendship if not exists (so it shows in sidebar)
            const existingFriend = await client.query(
              "SELECT id FROM friends WHERE user_id = $1 AND friend_id = $2",
              [recipient.id, bot.id]
            )
            if (existingFriend.rows.length === 0) {
                await client.query(
                  "INSERT INTO friends (user_id, friend_id, created_at) VALUES ($1, $2, $3)",
                  [recipient.id, bot.id, now]
                )
                await client.query(
                  "INSERT INTO friends (user_id, friend_id, created_at) VALUES ($1, $2, $3)",
                  [bot.id, recipient.id, now]
                )
            }

            await client.query(
              "INSERT INTO messages (sender_id, receiver_id, content, type, created_at) VALUES ($1, $2, $3, $4, $5)",
              [bot.id, recipient.id, typeof content === 'string' ? content : JSON.stringify(content), type, now]
            )
        }
    })

    return NextResponse.json({ 
        success: true, 
        message: `Announcement sent to ${users.length} users`,
        recipientCount: users.length 
    })
  } catch (error) {
    console.error("Announcement error:", error)
    return NextResponse.json({ error: "Failed to send announcement" }, { status: 500 })
  }
}
