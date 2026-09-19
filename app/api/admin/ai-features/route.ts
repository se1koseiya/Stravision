import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { IS_DESKTOP_APP } from "@/lib/desktop-mode"
import fs from "node:fs/promises"
import path from "node:path"

// 🚨 桌面端放行：本地单用户形态，无平台角色概念（IS_DESKTOP_APP 构建期内联，Web 构建恒 false）
async function requireAdmin() {
  const user = await getCurrentUser()
  if (!user) return null
  if (IS_DESKTOP_APP) return user
  return user.role === "admin" || user.role === "super_admin" ? user : null
}

const CONFIG_FILE = path.join(process.cwd(), "data", "ai-features-config.json")

interface AIFeatureConfig {
  enableTaskList: boolean
  enableDeviceBento: boolean
  enableControlBento: boolean
  enableMonitor: boolean
  enableScheduledTasks: boolean
  enableChart: boolean
  enableSpectral: boolean
  enableReasoning: boolean
  enableSources: boolean
  enableToolUsed: boolean
  enableScheduleTask: boolean
  enableDeviceControl: boolean
  enableHTMLPreview: boolean
  enableWebPreview: boolean
}

const DEFAULT_CONFIG: AIFeatureConfig = {
  enableTaskList: true,
  enableDeviceBento: true,
  enableControlBento: true,
  enableMonitor: true,
  enableScheduledTasks: true,
  enableChart: true,
  enableSpectral: true,
  enableReasoning: true,
  enableSources: true,
  enableToolUsed: true,
  enableScheduleTask: true,
  enableDeviceControl: true,
  enableHTMLPreview: true,
  enableWebPreview: true,
}

// 确保 data 目录存在
async function ensureDataDir() {
  const dataDir = path.join(process.cwd(), "data")
  try {
    await fs.access(dataDir)
  } catch {
    await fs.mkdir(dataDir, { recursive: true })
  }
}

// 读取配置
async function readConfig(): Promise<AIFeatureConfig> {
  try {
    await ensureDataDir()
    const data = await fs.readFile(CONFIG_FILE, "utf-8")
    return { ...DEFAULT_CONFIG, ...JSON.parse(data) }
  } catch (error) {
    // 文件不存在或读取失败，返回默认配置
    return DEFAULT_CONFIG
  }
}

// 保存配置
async function saveConfig(config: AIFeatureConfig): Promise<void> {
  await ensureDataDir()
  await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8")
}

// GET - 获取配置
export async function GET(req: NextRequest) {
  try {
    const user = await requireAdmin()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const config = await readConfig()
    return NextResponse.json(config)
  } catch (error) {
    console.error("Failed to get AI features config:", error)
    return NextResponse.json(
      { error: "Failed to get configuration" },
      { status: 500 }
    )
  }
}

// POST - 保存配置
export async function POST(req: NextRequest) {
  try {
    const user = await requireAdmin()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    
    // 验证配置格式
    const config: AIFeatureConfig = {
      enableTaskList: body.enableTaskList ?? true,
      enableDeviceBento: body.enableDeviceBento ?? true,
      enableControlBento: body.enableControlBento ?? true,
      enableMonitor: body.enableMonitor ?? true,
      enableScheduledTasks: body.enableScheduledTasks ?? true,
      enableChart: body.enableChart ?? true,
      enableSpectral: body.enableSpectral ?? true,
      enableReasoning: body.enableReasoning ?? true,
      enableSources: body.enableSources ?? true,
      enableToolUsed: body.enableToolUsed ?? true,
      enableScheduleTask: body.enableScheduleTask ?? true,
      enableDeviceControl: body.enableDeviceControl ?? true,
      enableHTMLPreview: body.enableHTMLPreview ?? true,
      enableWebPreview: body.enableWebPreview ?? true,
    }

    await saveConfig(config)
    
    return NextResponse.json({ success: true, config })
  } catch (error) {
    console.error("Failed to save AI features config:", error)
    return NextResponse.json(
      { error: "Failed to save configuration" },
      { status: 500 }
    )
  }
}
