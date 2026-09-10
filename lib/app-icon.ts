import { promises as fs } from "node:fs"
import path from "node:path"
import { getAppIconConfig } from "@/lib/db/settings-service"

/**
 * 应用图标（品牌图标）服务端解析。
 *
 * 背景：全站图标引用统一为 `/logo.png`（app/layout.tsx 的 metadata.icons、
 * public/manifest.json、侧边栏品牌位、邮件模板等），这些位置无法逐个读取数据库。
 * 因此 next.config.ts 通过 `beforeFiles` rewrite 把 `/logo.png` 重写到
 * `/api/branding/icon`，由本模块决定实际返回哪张图。
 *
 * 这样管理员在 admin UI 上传新图标后，全站（含 favicon、PWA 图标、邮件）即时生效，
 * 无需改动任何一处调用点。
 */

/** 顶级 public 目录（standalone 模式下 process.cwd() 即应用根目录） */
const PUBLIC_DIR = path.join(process.cwd(), "public")

/** 内置默认图标（随镜像发布，作为兜底） */
export const DEFAULT_ICON_FILE_PATH = path.join(PUBLIC_DIR, "logo.png")

/** 上传文件根目录（docker-compose 已挂载持久化：./public/uploads:/app/public/uploads） */
export const UPLOAD_ROOT_DIR = path.join(PUBLIC_DIR, "uploads")

/** 品牌图标专用上传子目录 */
export const BRANDING_DIR = path.join(UPLOAD_ROOT_DIR, "branding")

/** 品牌图标公开 URL 前缀 */
export const BRANDING_URL_PREFIX = "/uploads/branding/"

/** 允许的图标扩展名（与 /api/admin/upload 的白名单保持一致，仅限光栅位图） */
const MIME_BY_EXT: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".bmp": "image/bmp",
}

export interface ResolvedAppIcon {
  /** 磁盘绝对路径 */
  filePath: string
  /** MIME 类型 */
  mimeType: string
  /** 版本标识（用于 ETag / 缓存判定），等于配置更新时间戳或内置默认标记 */
  version: string
  /** 是否为用户自定义图标 */
  custom: boolean
}

/**
 * 将公开 URL 安全地解析为磁盘绝对路径。
 * 仅接受 `/uploads/` 前缀且扩展名在白名单内的路径；任何越界访问返回 null。
 */
export function resolveUploadUrlToPath(url: string): string | null {
  if (typeof url !== "string" || !url.startsWith("/uploads/")) return null

  let decoded: string
  try {
    decoded = decodeURIComponent(url)
  } catch {
    return null
  }

  // 先做显式拒绝：任何含 .. 的路径一律不合法（防路径遍历）
  if (decoded.includes("..") || decoded.includes("\0")) return null

  const ext = path.extname(decoded).toLowerCase()
  if (!MIME_BY_EXT[ext]) return null

  const target = path.resolve(PUBLIC_DIR, "." + decoded)

  // 双重防御：最终路径必须仍位于 uploads 根目录之内
  const rel = path.relative(UPLOAD_ROOT_DIR, target)
  if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) return null

  return target
}

/** 由文件扩展名推断 MIME；未知类型回退 PNG */
export function mimeTypeForPath(filePath: string): string {
  return MIME_BY_EXT[path.extname(filePath).toLowerCase()] ?? "image/png"
}

// ===========================================================================
// 内存缓存：/logo.png 会被每个页面加载，避免每次请求都查库 + stat 磁盘。
// TTL 兜底 15s；管理员保存图标时通过 invalidateAppIconCache() 立即失效。
// ===========================================================================

const CACHE_TTL_MS = 15_000

let cache: { value: ResolvedAppIcon; expiresAt: number } | null = null

/** 清除缓存（上传/重置图标后调用，保证即时生效） */
export function invalidateAppIconCache(): void {
  cache = null
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(filePath)
    return stat.isFile()
  } catch {
    return false
  }
}

/**
 * 解析当前应对外输出的应用图标。
 * 优先级：管理员自定义图标 → 内置默认图标（配置丢失或文件被删时自动降级）。
 */
export async function resolveAppIcon(): Promise<ResolvedAppIcon> {
  if (cache && cache.expiresAt > Date.now()) return cache.value

  const config = await getAppIconConfig()
  let resolved: ResolvedAppIcon | null = null

  if (config.url) {
    const filePath = resolveUploadUrlToPath(config.url)
    // 文件可能被运维误删，或配置来自旧环境；此时静默降级到默认图标
    if (filePath && (await fileExists(filePath))) {
      resolved = {
        filePath,
        mimeType: mimeTypeForPath(filePath),
        version: `c${config.updatedAt || 1}`,
        custom: true,
      }
    }
  }

  if (!resolved) {
    resolved = {
      filePath: DEFAULT_ICON_FILE_PATH,
      mimeType: "image/png",
      version: "default",
      custom: false,
    }
  }

  cache = { value: resolved, expiresAt: Date.now() + CACHE_TTL_MS }
  return resolved
}
