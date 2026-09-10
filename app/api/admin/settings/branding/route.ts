import { NextRequest, NextResponse } from "next/server"
import { promises as fs } from "node:fs"
import { getCurrentUser } from "@/lib/auth"
import {
  DEFAULT_APP_ICON_CONFIG,
  getAppIconConfig,
  updateAppIconConfig,
} from "@/lib/db/settings-service"
import {
  DEFAULT_ICON_FILE_PATH,
  invalidateAppIconCache,
  resolveUploadUrlToPath,
} from "@/lib/app-icon"
import { z } from "zod"

/**
 * 应用图标管理接口（仅 admin / super_admin）。
 *
 * - GET    读取当前配置
 * - POST   保存新图标（body.url 必须是本站 /uploads/ 下的图片路径）
 * - DELETE 重置为内置默认图标
 *
 * 保存成功后立即失效图标缓存，使 /logo.png 在下一请求即返回新图（全站生效）。
 */

const saveSchema = z.object({
  url: z.string().min(1).max(1024),
})

async function requireAdmin() {
  const user = await getCurrentUser()
  if (!user || (user.role !== "admin" && user.role !== "super_admin")) {
    return null
  }
  return user
}

/** 删除上一张自定义图标文件，避免 uploads 目录堆积孤儿文件 */
async function removePreviousIcon(previousUrl: string | null): Promise<void> {
  if (!previousUrl) return
  const filePath = resolveUploadUrlToPath(previousUrl)
  if (!filePath) return
  // 内置默认图标（public/logo.png）绝不删除
  if (filePath === DEFAULT_ICON_FILE_PATH) return
  try {
    await fs.unlink(filePath)
  } catch {
    // 文件已不存在或被占用时静默忽略，不影响主流程
  }
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  try {
    const config = await getAppIconConfig()
    return NextResponse.json({
      url: config.url,
      updatedAt: config.updatedAt,
      // 前端预览统一使用 /logo.png，便于直接看到"全站实际生效效果"
      previewUrl: config.updatedAt ? `/logo.png?v=${config.updatedAt}` : "/logo.png",
      isCustom: Boolean(config.url),
    })
  } catch (error) {
    console.error("[AppIcon] Failed to load config:", error)
    return NextResponse.json({ error: "Failed to fetch config" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  try {
    const body = await req.json()
    const parsed = saveSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "参数不合法" }, { status: 400 })
    }

    // 服务端二次校验：拒绝站外链接与路径遍历，只接受白名单扩展名的 uploads 文件
    const filePath = resolveUploadUrlToPath(parsed.data.url)
    if (!filePath) {
      return NextResponse.json({ error: "图标地址不合法" }, { status: 400 })
    }

    try {
      const stat = await fs.stat(filePath)
      if (!stat.isFile()) throw new Error("not a file")
    } catch {
      return NextResponse.json({ error: "图标文件不存在，请重新上传" }, { status: 400 })
    }

    const previous = await getAppIconConfig()
    const updatedAt = Date.now()

    await updateAppIconConfig({ url: parsed.data.url, updatedAt })
    invalidateAppIconCache()

    // 清理旧图标：仅当确实换了新文件时执行
    if (previous.url && previous.url !== parsed.data.url) {
      await removePreviousIcon(previous.url)
    }

    return NextResponse.json({
      success: true,
      url: parsed.data.url,
      updatedAt,
      previewUrl: `/logo.png?v=${updatedAt}`,
      isCustom: true,
    })
  } catch (error) {
    console.error("[AppIcon] Failed to update config:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function DELETE() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  try {
    const previous = await getAppIconConfig()

    await updateAppIconConfig(DEFAULT_APP_ICON_CONFIG)
    invalidateAppIconCache()

    await removePreviousIcon(previous.url)

    return NextResponse.json({
      success: true,
      url: null,
      updatedAt: 0,
      previewUrl: "/logo.png",
      isCustom: false,
    })
  } catch (error) {
    console.error("[AppIcon] Failed to reset config:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
