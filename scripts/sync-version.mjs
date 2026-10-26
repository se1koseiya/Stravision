#!/usr/bin/env node
/**
 * 版本号同步：根 package.json（唯一真源）→ desktop/package.json
 * ---------------------------------------------------------------------------
 * 为什么需要它：
 *   - 网页端版本号 = 根 package.json 的 version（next.config.ts 注入，见 lib/app-meta.ts）
 *   - 桌面端版本号 = desktop/package.json 的 version（electron-builder 的 appDir）
 *     安装包文件名 `Stravision-<version>-win-x64.exe`、latest.yml、app.getVersion()
 *     全都取这一份。两边不同步 → 用户看到「网页 vA / 装的是 vB」。
 *
 * 用法：pnpm version:sync
 *   改版本只改根 package.json，然后跑这个脚本；重复跑是幂等的（一致时不写盘）。
 */
import { readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const ROOT_PKG = path.join(ROOT, "package.json")
const DESKTOP_PKG = path.join(ROOT, "desktop", "package.json")

function readJson(p) {
  return JSON.parse(readFileSync(p, "utf8"))
}

const rootPkg = readJson(ROOT_PKG)
const version = String(rootPkg.version ?? "").trim()

if (!/^\d+\.\d+\.\d+(?:[-+].+)?$/.test(version)) {
  console.error(`[version:sync] ❌ 根 package.json 的 version 不合法："${version}"（期望 x.y.z）`)
  process.exit(1)
}

const desktopPkg = readJson(DESKTOP_PKG)

if (desktopPkg.version === version) {
  console.log(`[version:sync] ✅ 已一致：v${version}（根 package.json / desktop/package.json）`)
  process.exit(0)
}

const previous = desktopPkg.version
desktopPkg.version = version
// 保持原文件的字段顺序与 2 空格缩进 + 末尾换行，减少无意义 diff
writeFileSync(DESKTOP_PKG, `${JSON.stringify(desktopPkg, null, 2)}\n`, "utf8")
console.log(`[version:sync] ✅ desktop/package.json ${previous} → ${version}`)
