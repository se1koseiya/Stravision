import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { execute } from '@/lib/db/database'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const messageId = parseInt(params.id)
    if (isNaN(messageId)) {
      return NextResponse.json({ error: 'Invalid message ID' }, { status: 400 })
    }

    // Get message details
    const messageResult = await execute(
      'SELECT * FROM direct_messages WHERE id = $1 UNION ALL SELECT * FROM group_messages WHERE id = $1',
      [messageId]
    )

    if (messageResult.rows.length === 0) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    const message = messageResult.rows[0]

    // Check if user is the sender
    if (message.sender_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized to delete this message' }, { status: 403 })
    }

    // Check if message is within 2 minutes
    const messageTime = new Date(message.created_at).getTime()
    const now = Date.now()
    const twoMinutes = 2 * 60 * 1000

    if (now - messageTime > twoMinutes) {
      return NextResponse.json({ error: 'Message can only be recalled within 2 minutes' }, { status: 400 })
    }

    // Update message content to indicate it was recalled
    if (message.receiver_id) {
      // Direct message
      await execute(
        'UPDATE direct_messages SET content = $1, type = $2 WHERE id = $3',
        ['[消息已撤回]', 'recalled', messageId]
      )
    } else {
      // Group message
      await execute(
        'UPDATE group_messages SET content = $1, type = $2 WHERE id = $3',
        ['[消息已撤回]', 'recalled', messageId]
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Message recalled successfully'
    })
  } catch (error) {
    console.error('Error recalling message:', error)
    return NextResponse.json({ error: 'Failed to recall message' }, { status: 500 })
  }
}
