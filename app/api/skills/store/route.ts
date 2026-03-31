import { NextRequest, NextResponse } from 'next/server'
import { getAllSkills, getPublishedSkills, createSkill, seedBuiltinSkills } from '@/lib/db/skill-store-service'
import { getCurrentUser } from '@/lib/auth'

async function getUser() {
  return getCurrentUser()
}

// GET /api/skills/store - List skills (published for users, all for admin)
export async function GET(req: NextRequest) {
  try {
    const user = await getUser()
    const { searchParams } = new URL(req.url)
    const isAdmin = searchParams.get('admin') === '1'

    // Seed on first access
    await seedBuiltinSkills()

    if (isAdmin && user?.role && ['admin', 'super_admin'].includes(user.role)) {
      const skills = await getAllSkills()
      return NextResponse.json(skills)
    }

    const skills = await getPublishedSkills()
    return NextResponse.json(skills)
  } catch (e: any) {
    console.error('[SkillStore API] GET error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// POST /api/skills/store - Create a new skill (admin only)
export async function POST(req: NextRequest) {
  try {
    const user = await getUser()
    if (!user?.role || !['admin', 'super_admin'].includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await req.json()
    const { skill_id, name, description, icon, category, author, version, keywords, examples, effects, content, is_published } = body

    if (!skill_id || !name) {
      return NextResponse.json({ error: 'skill_id and name are required' }, { status: 400 })
    }

    const skill = await createSkill({
      skill_id,
      name,
      description: description || '',
      icon: icon || '🧩',
      category: category || '工具',
      author: author || 'StravisionAI',
      version: version || '1.0.0',
      keywords: keywords || '',
      examples: examples || '',
      effects: effects || '',
      content: content || '',
      is_published: is_published ?? 0,
      is_builtin: 0
    })

    return NextResponse.json(skill)
  } catch (e: any) {
    if (e.code === '23505') {
      return NextResponse.json({ error: 'Skill ID already exists' }, { status: 409 })
    }
    console.error('[SkillStore API] POST error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
