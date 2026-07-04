/**
 * 知识库备份 API
 *
 * GET  /api/knowledge/backup                列出历史备份
 * POST /api/knowledge/backup  body: { name?, include_files?, type?: 'full'|'incremental' }
 *  - 异步导出：生成 JSON（包含 items / versions / tags / chunks 元数据）
 *  - 文件备份到 public/backups/knowledge/[uid]/[timestamp].json
 *  - 记录到 knowledge_backups 表
 *
 * 简化版 MVP：导出为 JSON 包含全部条目元数据 + 文件 URL 引用（不打包文件）
 * 后续可扩展为 ZIP 打包或云端对象存储
 */

export const runtime = "nodejs"

import { NextRequest } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import {
  createBackup,
  updateBackupStatus,
  listBackups
} from "@/lib/db/knowledge-service"
import { listItems } from "@/lib/db/knowledge-service"
import { listVersions } from "@/lib/db/knowledge-service"
import { listTags } from "@/lib/db/knowledge-service"
import { getKnowledgeConfig } from "@/lib/ai/provider-resolver"
import { promises as fs } from "node:fs"
import path from "node:path"

function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status })
}

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return jsonError("未登录", 401)
  // 列表默认 limit 走 admin knowledgeConfig.list.backupDefaultLimit
  const kc = await getKnowledgeConfig()
  const items = await listBackups(user.id, kc.list.backupDefaultLimit)
  return Response.json({ backups: items })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return jsonError("未登录", 401)
  let body: any = {}
  try {
    body = await req.json()
  } catch {}
  const backupType = body?.type === "incremental" ? "incremental" : "full"
  const includeFiles = body?.include_files !== false

  const backupId = await createBackup(user.id, {
    name: body?.name || `${backupType === "full" ? "完整" : "增量"}备份 ${new Date().toISOString()}`,
    backupType,
    includeFiles,
    metadata: JSON.stringify({ trigger: "manual" })
  })

  // 异步执行备份
  void runBackup(backupId, user.id, includeFiles, backupType)

  return Response.json({ id: backupId, success: true })
}

async function runBackup(backupId: number, userId: number, includeFiles: boolean, _type: string) {
  try {
    await updateBackupStatus(backupId, userId, "running")
    // 1) 拉取数据（batch size 走 admin knowledgeConfig.backup.batchSize）
  const kc = await getKnowledgeConfig()
  const batchSize = kc.backup.batchSize
    const { items } = await listItems(userId, { limit: batchSize, is_archived: false, includeMarket: true })
    const { items: archived } = await listItems(userId, { limit: batchSize, is_archived: true, includeMarket: true })
    const allItems = [...items, ...archived]
    const versions: any[] = []
    for (const it of allItems) {
      const vs = await listVersions(it.id, userId)
      versions.push(...vs.map(v => ({ ...v, item_id: it.id })))
    }
    const tags = await listTags(userId)

    const backupData = {
      version: 1,
      user_id: userId,
      created_at: Date.now(),
      include_files: includeFiles,
      items: allItems.map(it => ({
        ...it,
        // 包含文件时存 base64，否则仅 URL
        file_data: null
      })),
      versions,
      tags
    }
    if (includeFiles) {
      // 可选：把每个文件读取为 base64（暂不实现，避免备份文件过大）
    }

    // 2) 写文件
    const dir = path.join(process.cwd(), "public", "backups", "knowledge", String(userId))
    try { await fs.access(dir) } catch { await fs.mkdir(dir, { recursive: true }) }
    const fname = `kb-backup-${userId}-${Date.now()}.json`
    const fpath = path.join(dir, fname)
    const json = JSON.stringify(backupData, null, 2)
    await fs.writeFile(fpath, json, "utf-8")

    await updateBackupStatus(backupId, userId, "completed", {
      filePath: `/backups/knowledge/${userId}/${fname}`,
      fileSize: Buffer.byteLength(json, "utf-8"),
      itemCount: allItems.length
    })
  } catch (e: any) {
    console.error(`[knowledge/backup] failed:`, e)
    await updateBackupStatus(backupId, userId, "failed", {
      errorMessage: e?.message || "未知错误"
    })
  }
}
