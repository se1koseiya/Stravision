import { NextRequest, NextResponse } from 'next/server'
import { getUserInstalledSkills, getUserInstalledSkillIds, installSkill, uninstallSkill } from '@/lib/db/skill-store-service'
import { getCurrentUser } from '@/lib/auth'

async function getUser() {
  return getCurrentUser()
}

// GET /api/skills/user - Get current user's installed skills
export async function GET() {
  try {
    const user = await getUser()
    if (!user?.id) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const skills = await getUserInstalledSkills(user.id as number)
    const ids = await getUserInstalledSkillIds(user.id as number)
    return NextResponse.json({ skills, installedIds: ids })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// POST /api/skills/user - Install a skill
export async function POST(req: NextRequest) {
  try {
    const user = await getUser()
    if (!user?.id) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { skill_id } = await req.json()
    if (!skill_id) return NextResponse.json({ error: 'skill_id is required' }, { status: 400 })

    const ok = await installSkill(user.id as number, skill_id)
    return NextResponse.json({ success: ok })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// DELETE /api/skills/user - Uninstall a skill
export async function DELETE(req: NextRequest) {
  try {
    const user = await getUser()
    if (!user?.id) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { skill_id } = await req.json()
    if (!skill_id) return NextResponse.json({ error: 'skill_id is required' }, { status: 400 })

    const ok = await uninstallSkill(user.id as number, skill_id)
    return NextResponse.json({ success: ok })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
