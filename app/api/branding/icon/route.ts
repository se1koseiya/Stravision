import { NextRequest, NextResponse } from "next/server"
import { promises as fs } from "node:fs"
import { resolveAppIcon } from "@/lib/app-icon"

/**
 * 应用图标对外输出端点（公开，无需登录）。
 *
 * 由 next.config.ts 的 `beforeFiles` rewrite 接管 `/logo.png`，因此本端点即是
 * 全站 favicon、PWA manifest 图标、侧边栏品牌位、邮件模板中 logo 的统一来源。
 * 管理员在 admin UI 更换图标后，此处自动返回新图。
 *
 * 缓存策略：`max-age=0, must-revalidate` + ETag。
 * 浏览器每次都会带 If-None-Match 校验，未变更时命中 304（无响应体，极轻量），
 * 变更后立即拿到新图——既保证即时生效，又避免重复传输图片本体。
 */

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

async function buildIconResponse(req: NextRequest, withBody: boolean): Promise<NextResponse> {
  const icon = await resolveAppIcon()
  const etag = `"${icon.version}"`

  const headers = new Headers({
    "Content-Type": icon.mimeType,
    ETag: etag,
    // 不设长期强缓存：图标必须能被即时替换，刷新依赖 ETag 校验
    "Cache-Control": "public, max-age=0, must-revalidate",
    // 图标内容随管理员操作变化，声明为可变资源，避免被中间层按 URL 长期缓存
    Vary: "Accept-Encoding",
    "X-App-Icon-Source": icon.custom ? "custom" : "default",
  })

  // 命中协商缓存直接返回 304，避免重复传输图片
  const ifNoneMatch = req.headers.get("if-none-match")
  if (ifNoneMatch && ifNoneMatch.split(",").some((v) => v.trim() === etag)) {
    return new NextResponse(null, { status: 304, headers })
  }

  let buffer: Buffer
  try {
    buffer = await fs.readFile(icon.filePath)
  } catch (error) {
    console.error("[AppIcon] Failed to read icon file:", error)
    // 图标缺失会导致全站品牌位空白，明确返回 404 以便快速定位
    return new NextResponse(withBody ? "Icon not found" : null, { status: 404 })
  }

  headers.set("Content-Length", String(buffer.byteLength))

  if (!withBody) {
    return new NextResponse(null, { status: 200, headers })
  }

  return new NextResponse(buffer, { status: 200, headers })
}

export async function GET(req: NextRequest) {
  return buildIconResponse(req, true)
}

export async function HEAD(req: NextRequest) {
  return buildIconResponse(req, false)
}
