import { query, queryOne, execute, initDB } from './database'

// ========== Types ==========
export interface StoreSkill {
  id: number
  skill_id: string        // unique slug, e.g. "agriculture-expert"
  name: string
  description: string
  icon: string            // emoji or icon identifier
  category: string        // 精选 | 农业 | 设备 | 工具 | 生活
  author: string
  version: string
  keywords: string        // comma-separated
  examples: string        // comma-separated or JSON list of examples
  effects: string         // description of what this skill enables
  content: string         // full SKILL.md body (the prompt)
  cover_image?: string    // large hero image URL
  priority: number        // 0-100, higher shows larger/top
  is_published: number    // 1 = visible in store, 0 = draft
  is_builtin: number      // 1 = system skill (cannot be deleted by users)
  install_count: number
  created_at: number
  updated_at: number
}

export interface UserSkillInstall {
  id: number
  user_id: number
  skill_id: string
  installed_at: number
}

// ========== Init Tables ==========
export async function initSkillStoreTables(): Promise<void> {
  await initDB()

  const statements = [
    `CREATE TABLE IF NOT EXISTS store_skills (
      id BIGSERIAL PRIMARY KEY,
      skill_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      icon TEXT NOT NULL DEFAULT '🧩',
      category TEXT NOT NULL DEFAULT '工具',
      author TEXT NOT NULL DEFAULT 'StravisionAI',
      version TEXT NOT NULL DEFAULT '1.0.0',
      keywords TEXT NOT NULL DEFAULT '',
      examples TEXT NOT NULL DEFAULT '',
      effects TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL DEFAULT '',
      cover_image TEXT,
      priority INTEGER NOT NULL DEFAULT 0,
      is_published INTEGER NOT NULL DEFAULT 0,
      is_builtin INTEGER NOT NULL DEFAULT 0,
      install_count INTEGER NOT NULL DEFAULT 0,
      created_at BIGINT NOT NULL,
      updated_at BIGINT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS user_skill_installs (
      id BIGSERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      skill_id TEXT NOT NULL,
      installed_at BIGINT NOT NULL,
      UNIQUE(user_id, skill_id)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_user_skill_installs_user ON user_skill_installs(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_store_skills_category ON store_skills(category)`,
    `CREATE INDEX IF NOT EXISTS idx_store_skills_published ON store_skills(is_published)`
  ]

  for (const sql of statements) {
    try {
      await execute(sql)
    } catch (e: any) {
      if (e.code !== '42P07' && e.code !== '42710') {
        console.error('[SkillStore] Init error:', e.message)
      }
    }
  }

  // Handle migration if columns missing
  try {
    await execute(`ALTER TABLE store_skills ADD COLUMN IF NOT EXISTS examples TEXT NOT NULL DEFAULT ''`)
    await execute(`ALTER TABLE store_skills ADD COLUMN IF NOT EXISTS effects TEXT NOT NULL DEFAULT ''`)
    await execute(`ALTER TABLE store_skills ADD COLUMN IF NOT EXISTS cover_image TEXT`)
    await execute(`ALTER TABLE store_skills ADD COLUMN IF NOT EXISTS priority INTEGER NOT NULL DEFAULT 0`)
  } catch (e) {}
}

// ========== Admin CRUD ==========

export async function getAllSkills(): Promise<StoreSkill[]> {
  await initSkillStoreTables()
  return query<StoreSkill>('SELECT * FROM store_skills ORDER BY priority DESC, created_at DESC')
}

export async function getPublishedSkills(): Promise<StoreSkill[]> {
  await initSkillStoreTables()
  return query<StoreSkill>('SELECT * FROM store_skills WHERE is_published = 1 ORDER BY priority DESC, install_count DESC')
}

export async function getSkillById(skillId: string): Promise<StoreSkill | null> {
  await initSkillStoreTables()
  return queryOne<StoreSkill>('SELECT * FROM store_skills WHERE skill_id = $1', [skillId])
}

export async function createSkill(skill: Omit<StoreSkill, 'id' | 'install_count' | 'created_at' | 'updated_at'>): Promise<StoreSkill> {
  await initSkillStoreTables()
  const now = Date.now()
  const result = await execute(
    `INSERT INTO store_skills (skill_id, name, description, icon, category, author, version, keywords, examples, effects, content, cover_image, priority, is_published, is_builtin, install_count, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 0, $16, $17)
     RETURNING *`,
    [skill.skill_id, skill.name, skill.description, skill.icon, skill.category, skill.author, skill.version, skill.keywords, skill.examples || '', skill.effects || '', skill.content, skill.cover_image || null, skill.priority || 0, skill.is_published, skill.is_builtin, now, now]
  )
  return result.rows[0]
}

export async function updateSkill(skillId: string, updates: Partial<StoreSkill>): Promise<StoreSkill | null> {
  await initSkillStoreTables()
  const allowedFields = ['name', 'description', 'icon', 'category', 'author', 'version', 'keywords', 'examples', 'effects', 'content', 'cover_image', 'priority', 'is_published', 'is_builtin']
  const sets: string[] = []
  const values: any[] = []
  let idx = 1

  for (const [key, val] of Object.entries(updates)) {
    if (allowedFields.includes(key) && val !== undefined) {
      sets.push(`${key} = $${idx}`)
      values.push(val)
      idx++
    }
  }
  if (sets.length === 0) return getSkillById(skillId)

  sets.push(`updated_at = $${idx}`)
  values.push(Date.now())
  idx++

  values.push(skillId)
  const result = await execute(
    `UPDATE store_skills SET ${sets.join(', ')} WHERE skill_id = $${idx} RETURNING *`,
    values
  )
  return result.rows[0] || null
}

export async function deleteSkill(skillId: string): Promise<boolean> {
  await initSkillStoreTables()
  // Also remove all user installs
  await execute('DELETE FROM user_skill_installs WHERE skill_id = $1', [skillId])
  const result = await execute('DELETE FROM store_skills WHERE skill_id = $1', [skillId])
  return (result.rowCount ?? 0) > 0
}

// ========== User Installs ==========

export async function getUserInstalledSkills(userId: number): Promise<StoreSkill[]> {
  await initSkillStoreTables()
  // Combine custom installs and all built-in ones
  return query<StoreSkill>(
    `SELECT DISTINCT s.* FROM store_skills s
     LEFT JOIN user_skill_installs u ON s.skill_id = u.skill_id
     WHERE (u.user_id = $1 OR s.is_builtin = 1) AND s.is_published = 1
     ORDER BY s.is_builtin DESC, s.priority DESC`,
    [userId]
  )
}

export async function getUserInstalledSkillIds(userId: number): Promise<string[]> {
  await initSkillStoreTables()
  const rows = await query<{ skill_id: string }>(
    `SELECT skill_id FROM user_skill_installs WHERE user_id = $1
     UNION
     SELECT skill_id FROM store_skills WHERE is_builtin = 1`, 
    [userId]
  )
  return rows.map(r => r.skill_id)
}

export async function installSkill(userId: number, skillId: string): Promise<boolean> {
  await initSkillStoreTables()
  try {
    await execute(
      'INSERT INTO user_skill_installs (user_id, skill_id, installed_at) VALUES ($1, $2, $3) ON CONFLICT (user_id, skill_id) DO NOTHING',
      [userId, skillId, Date.now()]
    )
    await execute('UPDATE store_skills SET install_count = install_count + 1 WHERE skill_id = $1', [skillId])
    return true
  } catch {
    return false
  }
}

export async function uninstallSkill(userId: number, skillId: string): Promise<boolean> {
  await initSkillStoreTables()
  const result = await execute(
    'DELETE FROM user_skill_installs WHERE user_id = $1 AND skill_id = $2',
    [userId, skillId]
  )
  if ((result.rowCount ?? 0) > 0) {
    await execute('UPDATE store_skills SET install_count = GREATEST(install_count - 1, 0) WHERE skill_id = $1', [skillId])
    return true
  }
  return false
}

// ========== Seed built-in skills from .agents/skills ==========
export async function seedBuiltinSkills(): Promise<void> {
  await initSkillStoreTables()
  const fs = require('fs')
  const path = require('path')

  const skillsDir = path.join(process.cwd(), '.agents', 'skills')
  if (!fs.existsSync(skillsDir)) return

  const ICON_MAP: Record<string, string> = {
    'ai-identity': '🤖',
    'communication-style': '💬',
    'implementation-workflow': '⚙️',
    'agriculture-expert': '🍓',
    'iot-control': '🔌',
    'crop-disease': '🦠',
    'strawberry-sales': '🛍️'
  }

  const CATEGORY_MAP: Record<string, string> = {
    'ai-identity': '系统',
    'communication-style': '系统',
    'implementation-workflow': '工具',
    'agriculture-expert': '农业',
    'iot-control': '设备',
    'crop-disease': '农业',
    'strawberry-sales': '商业'
  }

  const EXAMPLES_MAP: Record<string, string> = {
    'agriculture-expert': '草莓红蜘蛛怎么防治？,帮我写一个草莓花期光照优化方案,当前环境指标是否达标？',
    'iot-control': '打开1号水泵,把所有的补光灯关了,查看温室摄像头 A 的实时画面',
    'implementation-workflow': '制定一个今天下午的巡检计划,优化当前的大棚湿度控制,帮我分析一下环境数据并给出建议',
    'crop-disease': '草莓白粉病怎么治？,最近大棚湿度很高，会有什么病害风险？,我看到叶子上有红点，是红蜘蛛吗？',
    'strawberry-sales': '草莓精品果建议卖多少钱？,帮我写一个草莓采摘节的营销文案,送礼用的草莓包装怎么选？'
  }

  const EFFECTS_MAP: Record<string, string> = {
    'agriculture-expert': '赋予 AI 深厚的草莓种植知识储备，包括病虫害防治、生长标准和施肥建议。',
    'iot-control': '允许 AI 硬件交互，支持直接操作大棚内的继电器、LED灯和摄像头。',
    'implementation-workflow': '增强 AI 的任务拆解能力，能够生成可执行的步骤清单并控制流程安全。',
    'crop-disease': '提供专业的草莓病虫害诊断、诱发环境分析及绿色防控方案。',
    'strawberry-sales': '提供精准的市场定价建议、多渠道销售策略及品牌营销话术。'
  }

  const folders = fs.readdirSync(skillsDir, { withFileTypes: true })
    .filter((d: any) => d.isDirectory())
    .map((d: any) => d.name)

  for (const folder of folders) {
    const skillPath = path.join(skillsDir, folder, 'SKILL.md')
    if (!fs.existsSync(skillPath)) continue

    const existing = await getSkillById(folder)
    if (existing) continue // don't overwrite existing

    const fileContent = fs.readFileSync(skillPath, 'utf8')
    const fmMatch = fileContent.match(/^---\s*([\s\S]*?)\s*---\s*([\s\S]*)$/)

    let metadata: any = {}
    let body = fileContent
    if (fmMatch) {
      body = fmMatch[2]
      fmMatch[1].split('\n').forEach((line: string) => {
        const [key, ...val] = line.split(':')
        if (key && val.length) metadata[key.trim()] = val.join(':').trim()
      })
    }

    await createSkill({
      skill_id: folder,
      name: metadata.name || folder,
      description: metadata.description || '',
      icon: ICON_MAP[folder] || '🧩',
      category: CATEGORY_MAP[folder] || '工具',
      author: 'StravisionAI',
      version: '1.0.0',
      keywords: metadata.keywords || '',
      examples: EXAMPLES_MAP[folder] || '',
      effects: EFFECTS_MAP[folder] || '',
      content: body.trim(),
      priority: 0,
      is_published: 1,
      is_builtin: folder === 'strawberry-sales' ? 0 : 1
    })
  }
}
