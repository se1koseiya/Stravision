import { NextRequest, NextResponse } from 'next/server'
import { getSkillById, updateSkill, deleteSkill } from '@/lib/db/skill-store-service'
import { getCurrentUser } from '@/lib/auth'

async function getUser() {
  return getCurrentUser()
}

// GET /api/skills/store/[id]
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const skill = await getSkillById(id)
    if (!skill) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(skill)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// PUT /api/skills/store/[id]
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUser()
    if (!user?.role || !['admin', 'super_admin'].includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json()
    const updated = await updateSkill(id, body)
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(updated)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// DELETE /api/skills/store/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUser()
    if (!user?.role || !['admin', 'super_admin'].includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { id } = await params
    const deleted = await deleteSkill(id)
    if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
