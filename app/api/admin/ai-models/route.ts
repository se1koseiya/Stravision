import { NextRequest, NextResponse } from 'next/server'
import fs from 'node:fs/promises'
import path from 'node:path'
import { getCurrentUser } from '@/lib/auth'
import { IS_DESKTOP_APP } from '@/lib/desktop-mode'

const CONFIG_PATH = path.join(process.cwd(), 'data', 'ai-models-config.json')

// 统一 admin 授权校验：仅 admin / super_admin 可访问
// 桌面端放行：本地单用户形态，无平台角色概念（Web 构建恒 false，角色校验照常生效）
async function requireAdmin() {
  const currentUser = await getCurrentUser()
  if (!currentUser) {
    return null
  }
  if (IS_DESKTOP_APP) {
    return currentUser
  }
  if (currentUser.role !== 'admin' && currentUser.role !== 'super_admin') {
    return null
  }
  return currentUser
}

// 默认配置
const DEFAULT_CONFIG = {
  models: [
    {
      id: "auto",
      name: "智能模型 (Auto)",
      description: "根据任务自动选择最佳模型",
      category: "featured",
      icon: "sparkles",
      enabled: true,
      order: 0
    }
  ],
  categories: [
    {
      id: "featured",
      name: "精选国产模型",
      order: 0
    }
  ]
}

export async function GET() {
  const auth = await requireAdmin()
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  try {
    // 尝试读取配置文件
    const data = await fs.readFile(CONFIG_PATH, 'utf-8')
    const config = JSON.parse(data)
    return NextResponse.json(config)
  } catch (error: any) {
    console.error('[AI Models API] Failed to read config:', error)
    
    // 如果文件不存在，尝试创建默认配置
    if (error.code === 'ENOENT') {
      try {
        // 确保 data 目录存在
        const dataDir = path.dirname(CONFIG_PATH)
        await fs.mkdir(dataDir, { recursive: true })
        
        // 写入默认配置
        await fs.writeFile(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2), 'utf-8')
        console.log('[AI Models API] Created default config file')
        
        return NextResponse.json(DEFAULT_CONFIG)
      } catch (writeError) {
        console.error('[AI Models API] Failed to create default config:', writeError)
        // 如果无法写入，返回默认配置（只读模式）
        return NextResponse.json(DEFAULT_CONFIG)
      }
    }
    
    // 其他错误，返回默认配置
    return NextResponse.json(DEFAULT_CONFIG)
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  try {
    const body = await request.json()
    
    // 验证数据结构
    if (!body.models || !Array.isArray(body.models)) {
      return NextResponse.json({ error: 'Invalid data structure' }, { status: 400 })
    }
    
    // 确保 data 目录存在
    const dataDir = path.dirname(CONFIG_PATH)
    await fs.mkdir(dataDir, { recursive: true })
    
    // 写入文件
    await fs.writeFile(CONFIG_PATH, JSON.stringify(body, null, 2), 'utf-8')
    
    console.log('[AI Models API] Config updated successfully')
    return NextResponse.json({ success: true, message: 'Models config updated successfully' })
  } catch (error: any) {
    console.error('[AI Models API] Failed to update config:', error)
    
    // 如果是权限错误，返回更友好的提示
    if (error.code === 'EACCES' || error.code === 'EPERM') {
      return NextResponse.json({ 
        error: 'Permission denied. The data directory may be read-only in production.',
        code: 'PERMISSION_DENIED'
      }, { status: 403 })
    }
    
    return NextResponse.json({ error: 'Failed to update models config' }, { status: 500 })
  }
}
