import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'

const CONFIG_PATH = path.join(process.cwd(), 'data', 'ai-models-config.json')

export async function GET() {
  try {
    const data = await fs.readFile(CONFIG_PATH, 'utf-8')
    const config = JSON.parse(data)
    return NextResponse.json(config)
  } catch (error) {
    console.error('[AI Models API] Failed to read config:', error)
    return NextResponse.json({ error: 'Failed to load models config' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // 验证数据结构
    if (!body.models || !Array.isArray(body.models)) {
      return NextResponse.json({ error: 'Invalid data structure' }, { status: 400 })
    }
    
    // 写入文件
    await fs.writeFile(CONFIG_PATH, JSON.stringify(body, null, 2), 'utf-8')
    
    return NextResponse.json({ success: true, message: 'Models config updated successfully' })
  } catch (error) {
    console.error('[AI Models API] Failed to update config:', error)
    return NextResponse.json({ error: 'Failed to update models config' }, { status: 500 })
  }
}
