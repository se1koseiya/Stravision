/**
 * FFmpeg 二进制定位（服务端专用）
 *
 * 背景：RTMP → HTTP-FLV 代理（/api/stream-rtmp）与 AI 抓帧工具
 * （take_camera_snapshot / move_camera_and_look）都依赖外部 ffmpeg 可执行文件。
 * 原先两处都是裸 spawn("ffmpeg")，在**桌面端**（用户机器上没装 FFmpeg、
 * Electron 子进程的 PATH 也不含开发机的安装目录）必然 ENOENT，
 * 表现为「FFmpeg spawn error: spawn ffmpeg ENOENT」+ 500 failed to pipe response。
 *
 * 本模块把「去哪找 ffmpeg」收敛成唯一实现，按优先级依次探测：
 *   1. 显式环境变量     STRAVISION_FFMPEG_PATH / FFMPEG_PATH / STRAVISION_FFMPEG_DIR
 *   2. Electron 资源目录 resources/ffmpeg/<platform-arch>/（打包进安装包，离线可用）
 *   3. 工作目录向上回溯  .cache/ffmpeg/<platform-arch>/（开发态 / 桌面端 dev）
 *   4. node_modules/ffmpeg-static（若开发者安装了该包）
 *   5. 系统常见安装位置（winget / scoop / chocolatey / Homebrew / /usr/bin …）
 *   6. PATH 逐目录查找
 *
 * 命中后会用 `ffmpeg -version` 实跑一次做校验（架构不匹配 / 权限不足的假命中会被剔除），
 * 结果缓存：命中永久缓存，未命中只缓存 15s（用户装完 FFmpeg 不必重启服务）。
 */

import { existsSync, readdirSync, statSync } from "node:fs"
import { delimiter, join } from "node:path"
import { spawnSync } from "node:child_process"

/** 形如 win32-x64 / darwin-arm64 / linux-x64，与 ffmpeg-static 的产物命名一致 */
export const PLATFORM_KEY = `${process.platform}-${process.arch}`

const BIN_NAME = process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg"

export interface FfmpegBinary {
  /** 可执行文件的绝对路径 */
  path: string
  /** 来源标识，用于日志/界面提示 */
  source: string
  /** ffmpeg -version 首行 */
  version?: string
}

export interface FfmpegStatus {
  available: boolean
  path?: string
  source?: string
  version?: string
  platformKey: string
  /** 已探测过的候选路径（缺失时用于排查） */
  searched: string[]
  hint: string
}

export const FFMPEG_MISSING_HINT = [
  "本机未找到可用的 FFmpeg，实时视频（RTMP）预览与 AI 抓帧不可用。",
  `· 桌面端：安装包应自带 resources/ffmpeg/${PLATFORM_KEY}/（打包前执行 pnpm desktop:fetch:ffmpeg）；`,
  `· 开发态：执行 pnpm desktop:fetch:ffmpeg 下载到 .cache/ffmpeg/${PLATFORM_KEY}/；`,
  "· 或者自行安装 FFmpeg 并设置环境变量 STRAVISION_FFMPEG_PATH 指向可执行文件；",
  "· 服务端 Docker：镜像内已装 apk ffmpeg（/usr/bin/ffmpeg），无需额外配置。",
].join("\n")

const IS_WIN = process.platform === "win32"
const CACHE_TTL_MISS = 15_000

let cachedHit: FfmpegBinary | null = null
let cachedMissAt = 0
let cachedSearched: string[] = []

/** 把候选路径去重后返回（保持优先级顺序） */
function uniqueCandidates(items: Array<{ path: string; source: string }>) {
  const seen = new Set<string>()
  const out: Array<{ path: string; source: string }> = []
  for (const item of items) {
    if (!item.path) continue
    const key = IS_WIN ? item.path.toLowerCase() : item.path
    if (seen.has(key)) continue
    seen.add(key)
    out.push(item)
  }
  return out
}

/** 从 cwd 向上找固定目录（覆盖 .next/standalone 这类「工作目录在子目录」的运行形态） */
function walkUpDirs(start: string, maxDepth = 5) {
  const dirs: string[] = []
  let current = start
  for (let i = 0; i <= maxDepth; i++) {
    dirs.push(current)
    const parent = join(current, "..")
    // join 会规范化，直接比较字符串判断是否到根
    if (parent === current) break
    current = parent
  }
  return dirs
}

/** pnpm 的 .pnpm/<pkg>@<ver>/node_modules/<pkg> 真实目录（找不到返回空数组） */
function pnpmPackageDirs(root: string, packageName: string) {
  const results: string[] = []
  try {
    const store = join(root, "node_modules", ".pnpm")
    if (!existsSync(store)) return results
    for (const entry of readdirSync(store)) {
      if (!entry.startsWith(`${packageName}@`)) continue
      const candidate = join(store, entry, "node_modules", packageName)
      if (existsSync(candidate)) results.push(candidate)
    }
  } catch {
    /* ignore */
  }
  return results
}

function collectCandidates(): Array<{ path: string; source: string }> {
  const items: Array<{ path: string; source: string }> = []

  // 1. 显式环境变量优先级最高
  const explicit = process.env.STRAVISION_FFMPEG_PATH?.trim()
  if (explicit) items.push({ path: explicit, source: "env:STRAVISION_FFMPEG_PATH" })

  const legacyEnv = process.env.FFMPEG_PATH?.trim()
  if (legacyEnv) items.push({ path: legacyEnv, source: "env:FFMPEG_PATH" })

  const envDir = process.env.STRAVISION_FFMPEG_DIR?.trim()
  if (envDir) items.push({ path: join(envDir, BIN_NAME), source: "env:STRAVISION_FFMPEG_DIR" })

  // 2. Electron 资源目录（打包后 extraResources → resources/ffmpeg/）
  const resourcesPath = (process as NodeJS.Process & { resourcesPath?: string }).resourcesPath
  if (typeof resourcesPath === "string" && resourcesPath) {
    items.push({ path: join(resourcesPath, "ffmpeg", PLATFORM_KEY, BIN_NAME), source: "electron:resources/ffmpeg" })
    items.push({ path: join(resourcesPath, "ffmpeg", BIN_NAME), source: "electron:resources/ffmpeg(flat)" })
  }

  // 3. 工作目录向上回溯：项目内置缓存 / 仓内 bin
  for (const dir of walkUpDirs(process.cwd())) {
    items.push({ path: join(dir, ".cache", "ffmpeg", PLATFORM_KEY, BIN_NAME), source: ".cache/ffmpeg" })
    items.push({ path: join(dir, "desktop", "ffmpeg", PLATFORM_KEY, BIN_NAME), source: "desktop/ffmpeg" })
    items.push({ path: join(dir, "ffmpeg", PLATFORM_KEY, BIN_NAME), source: "ffmpeg/<platform>" })
    items.push({ path: join(dir, "bin", BIN_NAME), source: "bin/" })
    items.push({ path: join(dir, ".next", "standalone", "bin", BIN_NAME), source: ".next/standalone/bin" })
  }

  // 4. ffmpeg-static（可选依赖）
  //    ⚠️ 不能用 require.resolve("ffmpeg-static")：动态 require 会被 Turbopack 视为
  //    待解析依赖，包不存在时直接判 build 失败（实测报 Module not found，
  //    连带整个 /api/stream-rtmp 路由编译不出来）。改为纯文件系统探测。
  for (const dir of walkUpDirs(process.cwd())) {
    items.push({
      path: join(dir, "node_modules", "ffmpeg-static", BIN_NAME),
      source: "node_modules/ffmpeg-static",
    })
    // pnpm 布局：真实文件在 node_modules/.pnpm/ffmpeg-static@<ver>/node_modules/ffmpeg-static/
    for (const packageDir of pnpmPackageDirs(dir, "ffmpeg-static")) {
      items.push({ path: join(packageDir, BIN_NAME), source: "node_modules/.pnpm/ffmpeg-static" })
    }
  }

  // 5. 系统常见安装位置
  if (IS_WIN) {
    const localAppData = process.env.LOCALAPPDATA ?? ""
    const programFiles = process.env.ProgramFiles ?? "C:\\Program Files"
    const programData = process.env.ProgramData ?? "C:\\ProgramData"
    const userProfile = process.env.USERPROFILE ?? ""
    const winDirs = [
      "C:\\ffmpeg\\bin",
      "C:\\ffmpeg\\ffmpeg\\bin",
      join(programFiles, "ffmpeg", "bin"),
      join(localAppData, "Microsoft", "WinGet", "Links"),
      join(localAppData, "Programs", "ffmpeg", "bin"),
      join(localAppData, "Microsoft", "WindowsApps"),
      join(userProfile, "scoop", "shims"),
      join(userProfile, "scoop", "apps", "ffmpeg", "current", "bin"),
      join(programData, "chocolatey", "bin"),
    ]
    for (const dir of winDirs) items.push({ path: join(dir, BIN_NAME), source: `system:${dir}` })
  } else {
    const unixDirs = [
      "/usr/bin",
      "/usr/local/bin",
      "/opt/homebrew/bin",
      "/opt/local/bin",
      "/snap/bin",
      "/usr/lib/ffmpeg/bin",
      "/data/data/com.termux/files/usr/bin",
    ]
    for (const dir of unixDirs) items.push({ path: join(dir, BIN_NAME), source: `system:${dir}` })
  }

  // 6. PATH
  const pathValue = process.env.PATH ?? ""
  for (const dir of pathValue.split(delimiter)) {
    const trimmed = dir.trim().replace(/^"|"$/g, "")
    if (!trimmed) continue
    items.push({ path: join(trimmed, BIN_NAME), source: "PATH" })
  }

  return uniqueCandidates(items)
}

function isExecutableFile(candidate: string) {
  try {
    if (!existsSync(candidate)) return false
    const stat = statSync(candidate)
    if (!stat.isFile()) return false
    if (!IS_WIN && (stat.mode & 0o111) === 0) return false
    return true
  } catch {
    return false
  }
}

/** 真跑一次 `-version`：排除架构不匹配 / 缺 DLL 的假命中 */
function probeVersion(candidate: string): string | null {
  try {
    const result = spawnSync(candidate, ["-version"], {
      timeout: 5000,
      windowsHide: true,
      encoding: "utf8",
    })
    if (result.error || result.status !== 0) return null
    const firstLine = String(result.stdout ?? "").split(/\r?\n/)[0]?.trim()
    if (!firstLine || !/ffmpeg version/i.test(firstLine)) return null
    return firstLine
  } catch {
    return null
  }
}

/**
 * 定位可用的 ffmpeg 可执行文件。
 * @param force 跳过缓存重新探测
 */
export function resolveFfmpegBinary(force = false): FfmpegBinary | null {
  if (!force) {
    if (cachedHit) return cachedHit
    if (cachedMissAt && Date.now() - cachedMissAt < CACHE_TTL_MISS) return null
  } else {
    // 🚨 强制重探必须先丢弃上次的命中：
    //    否则 FFmpeg 被删除/替换后，预检仍会返回那条失效路径，
    //    直到 spawn 才报 ENOENT（表现为响应体崩在半路、前端只看到空回复）。
    cachedHit = null
  }

  const candidates = collectCandidates()
  const searched: string[] = []

  for (const candidate of candidates) {
    searched.push(candidate.path)
    if (!isExecutableFile(candidate.path)) continue
    const version = probeVersion(candidate.path)
    if (!version) continue
    cachedHit = { path: candidate.path, source: candidate.source, version }
    cachedMissAt = 0
    cachedSearched = searched
    console.log(`[FFmpeg] 已定位可执行文件：${candidate.path}（来源 ${candidate.source}，${version}）`)
    return cachedHit
  }

  cachedMissAt = Date.now()
  cachedSearched = searched
  if (searched.length) {
    console.warn(`[FFmpeg] 未找到可用的 ffmpeg，已探测 ${searched.length} 个候选路径`)
  }
  return null
}

/** 供 API / 界面使用的状态快照（不抛异常） */
export function getFfmpegStatus(force = false): FfmpegStatus {
  const hit = resolveFfmpegBinary(force)
  return {
    available: Boolean(hit),
    path: hit?.path,
    source: hit?.source,
    version: hit?.version,
    platformKey: PLATFORM_KEY,
    searched: hit ? [] : cachedSearched.slice(0, 40),
    hint: hit ? "" : FFMPEG_MISSING_HINT,
  }
}

/** 拿不到就抛错，错误信息包含可操作指引（AI 工具链路用） */
export function requireFfmpegBinary(): FfmpegBinary {
  const hit = resolveFfmpegBinary()
  if (!hit) throw new Error(FFMPEG_MISSING_HINT)
  return hit
}
