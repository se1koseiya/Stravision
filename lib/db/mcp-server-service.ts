import { query, queryOne, execute, initDB } from './database'

// ========== Types ==========
export interface MCPServer {
  id: string
  name: string
  displayName: string
  description: string
  category: string
  icon: string
  iconBg: string
  provider: string
  requiresApiKey: boolean
  apiKeyUrl?: string
  apiKeyInstructions?: string
  command: string
  args: string
  envVars?: string
  features: string
  popularity: number
  official: boolean
  priority: number
  is_published: number
  cover_image?: string
  created_at?: number
  updated_at?: number
}

// ========== Init Tables ==========
export async function initMCPStoreTables(): Promise<void> {
  await initDB()

  const statements = [
    `CREATE TABLE IF NOT EXISTS mcp_servers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      display_name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT 'web',
      icon TEXT NOT NULL DEFAULT '',
      icon_bg TEXT NOT NULL DEFAULT 'bg-white',
      provider TEXT NOT NULL DEFAULT '',
      requires_api_key INTEGER NOT NULL DEFAULT 0,
      api_key_url TEXT,
      api_key_instructions TEXT,
      command TEXT NOT NULL DEFAULT 'npx',
      args TEXT NOT NULL DEFAULT '[]',
      env_vars TEXT NOT NULL DEFAULT '{}',
      features TEXT NOT NULL DEFAULT '',
      popularity INTEGER NOT NULL DEFAULT 0,
      official INTEGER NOT NULL DEFAULT 0,
      priority INTEGER NOT NULL DEFAULT 0,
      is_published INTEGER NOT NULL DEFAULT 1,
      cover_image TEXT,
      created_at BIGINT NOT NULL,
      updated_at BIGINT NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_mcp_servers_category ON mcp_servers(category)`,
    `CREATE INDEX IF NOT EXISTS idx_mcp_servers_published ON mcp_servers(is_published)`
  ]

  for (const sql of statements) {
    try {
      await execute(sql)
    } catch (e: any) {
      if (e.code !== '42P07' && e.code !== '42710') {
        console.error('[MCPStore] Init error:', e.message)
      }
    }
  }

  // Column migration
  try {
    await execute(`ALTER TABLE mcp_servers ADD COLUMN IF NOT EXISTS cover_image TEXT`)
  } catch(e) {}
}

// ========== Admin CRUD ==========

export async function getAllMCPServers(): Promise<MCPServer[]> {
  await initMCPStoreTables()
  const rows = await query<any>('SELECT * FROM mcp_servers ORDER BY priority DESC, created_at DESC')
  return rows.map((r: any) => ({
    ...r,
    displayName: r.display_name,
    iconBg: r.icon_bg,
    requiresApiKey: r.requires_api_key === 1,
    official: r.official === 1,
    features: r.features ? r.features.split(',') : [],
    args: r.args ? JSON.parse(r.args) : [],
    envVars: r.env_vars ? JSON.parse(r.env_vars) : {},
    cover_image: r.cover_image
  }))
}

export async function getPublishedMCPServers(): Promise<MCPServer[]> {
  await initMCPStoreTables()
  const rows = await query<any>('SELECT * FROM mcp_servers WHERE is_published = 1 ORDER BY priority DESC, popularity DESC')
  return rows.map((r: any) => ({
    ...r,
    displayName: r.display_name,
    iconBg: r.icon_bg,
    requiresApiKey: r.requires_api_key === 1,
    official: r.official === 1,
    features: r.features ? r.features.split(',') : [],
    args: r.args ? JSON.parse(r.args) : [],
    envVars: r.env_vars ? JSON.parse(r.env_vars) : {},
    cover_image: r.cover_image
  }))
}

export async function createMCPServer(server: Omit<MCPServer, 'created_at' | 'updated_at'>): Promise<MCPServer> {
  await initMCPStoreTables()
  const now = Date.now()
  const result = await execute(
    `INSERT INTO mcp_servers (id, name, display_name, description, category, icon, icon_bg, provider, requires_api_key, api_key_url, api_key_instructions, command, args, env_vars, features, popularity, official, priority, is_published, cover_image, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
     RETURNING *`,
    [
      server.id, 
      server.name, 
      server.displayName, 
      server.description, 
      server.category, 
      server.icon, 
      server.iconBg, 
      server.provider, 
      server.requiresApiKey ? 1 : 0, 
      server.apiKeyUrl || null, 
      server.apiKeyInstructions || null, 
      server.command, 
      server.args, 
      server.envVars || '{}', 
      server.features || '', 
      server.popularity || 0, 
      server.official ? 1 : 0, 
      server.priority || 0, 
      server.is_published, 
      server.cover_image || null,
      now, 
      now
    ]
  )
  return result.rows[0]
}

export async function updateMCPServer(id: string, updates: Partial<MCPServer>): Promise<MCPServer | null> {
  await initMCPStoreTables()
  const mapping: Record<string, string> = {
    displayName: 'display_name',
    iconBg: 'icon_bg',
    requiresApiKey: 'requires_api_key',
    official: 'official',
    envVars: 'env_vars',
    apiKeyUrl: 'api_key_url',
    apiKeyInstructions: 'api_key_instructions'
  }
  
  const allowedFields = ['name', 'displayName', 'description', 'category', 'icon', 'iconBg', 'provider', 'requiresApiKey', 'apiKeyUrl', 'apiKeyInstructions', 'command', 'args', 'envVars', 'features', 'popularity', 'official', 'priority', 'is_published', 'cover_image']
  const sets: string[] = []
  const values: any[] = []
  let idx = 1

  for (const [key, val] of Object.entries(updates)) {
    if (allowedFields.includes(key) && val !== undefined) {
      const fieldName = mapping[key] || key
      sets.push(`${fieldName} = $${idx}`)
      values.push(key.includes('requiresApiKey') || key.includes('official') ? (val ? 1 : 0) : val)
      idx++
    }
  }
  if (sets.length === 0) return null

  sets.push(`updated_at = $${idx}`)
  values.push(Date.now())
  idx++

  values.push(id)
  const result = await execute(
    `UPDATE mcp_servers SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  )
  return result.rows[0] || null
}

export async function deleteMCPServer(id: string): Promise<boolean> {
  await initMCPStoreTables()
  const result = await execute('DELETE FROM mcp_servers WHERE id = $1', [id])
  return (result.rowCount ?? 0) > 0
}

// ========== Seed from static data ==========
export async function seedMCPServers(): Promise<void> {
  await initMCPStoreTables()
  const { MCP_SERVERS } = require('../data/mcp-servers')
  
  for (const server of MCP_SERVERS) {
    const existing = await queryOne('SELECT id FROM mcp_servers WHERE id = $1', [server.id])
    if (existing) continue

    await createMCPServer({
      ...server,
      args: JSON.stringify(server.args),
      envVars: JSON.stringify(server.envVars || {}),
      features: server.features.join(','),
      is_published: 1,
      priority: server.id === 'spectrum-stravision' ? 100 : 0,
      cover_image: server.id === 'spectrum-stravision' ? 'https://images.unsplash.com/photo-1579546678183-a84bc53bd177?auto=format&fit=crop&q=80&w=2070' : null
    })
  }
}
