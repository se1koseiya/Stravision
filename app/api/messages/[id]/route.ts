import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { ChatService } from '@/lib/db/chat-service'

/**
 * 撤回消息 DELETE /api/messages/:id
 * 调用 ChatService.recallMessage，由后者统一处理：
 * - 仅发送者本人可撤回
 * - 2 分钟内可撤回
 * - 更新 messages 表 content/type
 * - 通过 SSE 推送 chat_message_recalled 事件
 *
 * 旧实现错误地引用了 direct_messages/group_messages 不存在的表，已废弃。
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const messageId = parseInt(id)
    if (isNaN(messageId)) {
      return NextResponse.json({ error: 'Invalid message ID' }, { status: 400 })
    }

    const result = await ChatService.recallMessage(messageId, user.id)

    if (!result.success) {
      const status = result.error === 'forbidden' ? 403
        : result.error === 'not_found' ? 404
        : result.error === 'timeout' ? 400
        : 500
      return NextResponse.json({ error: result.message }, { status })
    }

    return NextResponse.json({
      success: true,
      message: result.message
    })
  } catch (error) {
    console.error('Error recalling message:', error)
    return NextResponse.json({ error: 'Failed to recall message' }, { status: 500 })
  }
}
