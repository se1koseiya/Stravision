import { NextRequest, NextResponse } from "next/server"
import fs from "fs/promises"
import path from "path"

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

// 读取配置（公共接口，所有用户都可以访问）
async function readConfig(): Promise<AIFeatureConfig> {
  try {
    const data = await fs.readFile(CONFIG_FILE, "utf-8")
    return { ...DEFAULT_CONFIG, ...JSON.parse(data) }
  } catch (error) {
    // 文件不存在或读取失败，返回默认配置
    return DEFAULT_CONFIG
  }
}

// GET - 获取配置（公共接口）
export async function GET(req: NextRequest) {
  try {
    const config = await readConfig()
    return NextResponse.json(config)
  } catch (error) {
    console.error("Failed to get AI features config:", error)
    return NextResponse.json(DEFAULT_CONFIG)
  }
}
