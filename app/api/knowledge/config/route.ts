/**
 * 知识库配置 API
 *
 * GET  /api/knowledge/config   - 读取当前生效的知识库配置（合并默认值）
 * POST /api/knowledge/config   - admin 更新知识库配置
 *
 * 该接口同时也是知识库侧边面板读取 GLM-OCR / Rerank 开关、上传上限等参数的来源
 */

export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getKnowledgeConfig, DEFAULT_KNOWLEDGE_CONFIG } from "@/lib/ai/provider-resolver"
import fs from "node:fs/promises"
import path from "node:path"

const CONFIG_PATH = path.join(process.cwd(), "data", "ai-providers-config.json")

async function isAdmin(userId: number): Promise<boolean> {
  try {
    const { query } = await import("@/lib/db/database")
    const rows = await query<{ role: string; is_admin: number | boolean }>(
      "SELECT role, is_admin FROM users WHERE id = $1 LIMIT 1",
      [userId]
    )
    if (!rows[0]) return false
    return rows[0].role === "admin" || rows[0].is_admin === 1 || rows[0].is_admin === true
  } catch {
    return false
  }
}

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 })
  const config = await getKnowledgeConfig()
  return NextResponse.json({ config, defaults: DEFAULT_KNOWLEDGE_CONFIG })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 })
  if (!(await isAdmin(user.id))) {
    return NextResponse.json({ error: "无权限" }, { status: 403 })
  }
  try {
    const body = await req.json()
    const updates = body.knowledgeConfig
    if (!updates || typeof updates !== "object") {
      return NextResponse.json({ error: "缺少 knowledgeConfig" }, { status: 400 })
    }
    // 读取 ai-providers-config.json 并更新 knowledgeConfig 字段
    let providersConfig: any = { providers: [] }
    try {
      const raw = await fs.readFile(CONFIG_PATH, "utf-8")
      providersConfig = JSON.parse(raw)
    } catch {
      // 配置文件不存在，等下次 PATCH providers 时再写入；这里直接接受并写最小骨架
    }
    providersConfig.knowledgeConfig = updates
    await fs.mkdir(path.dirname(CONFIG_PATH), { recursive: true })
    await fs.writeFile(CONFIG_PATH, JSON.stringify(providersConfig, null, 2), "utf-8")
    return NextResponse.json({ success: true, config: await getKnowledgeConfig() })
  } catch (e: any) {
    console.error("[knowledge-config update]", e)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
