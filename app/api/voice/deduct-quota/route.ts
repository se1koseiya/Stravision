import { NextResponse } from 'next/server'
import { initDB } from '@/lib/db/database'
import { getCurrentUser } from '@/lib/auth'
import { incrementAiUsage, getUserAiQuota } from '@/lib/db/ai-quota-service'

export const runtime = 'nodejs'

/**
 * POST /api/voice/deduct-quota
 * Deducts 1 quota point for voice interaction
 * Called by ws-server.js when AI response completes
 */
export async function POST(req: Request) {
  try {
    await initDB()
    const user = await getCurrentUser()
    
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const success = await incrementAiUsage(user.id as number)
    
    if (!success) {
      return NextResponse.json({ 
        error: 'Quota exceeded',
        quota: await getUserAiQuota(user.id as number)
      }, { status: 429 })
    }

    // Return updated quota info
    const quota = await getUserAiQuota(user.id as number)
    
    return NextResponse.json({ 
      success: true,
      quota
    })
  } catch (error) {
    console.error('[Voice Quota] Deduction error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
