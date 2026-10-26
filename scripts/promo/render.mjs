#!/usr/bin/env node
/**
 * 逐帧渲染驱动 —— 用 CDP 驱动 headless Chrome，把 /promo-video 的虚拟时间轴
 * 一帧一帧地"定格 + 截图"。
 *
 * 为什么不用 rAF 录屏：CSS 动画和 rAF 跑在 wall clock 上，截图时机不可控，
 * 成片会抖。这里页面内部已把 rAF / performance.now / Web Animations
 * 全部改接到 window.__seek(ms) 的虚拟时钟上，所以每一帧都是纯函数输出。
 *
 * 用法：node scripts/promo/render.mjs --out DIR [--fps 30] [--duration 42000]
 */

import { spawn } from "node:child_process"
import { mkdir, writeFile, rm } from "node:fs/promises"
import { existsSync } from "node:fs"
import path from "node:path"
import os from "node:os"

const argv = process.argv.slice(2)
const arg = (k, d) => {
  const i = argv.indexOf(`--${k}`)
  return i >= 0 ? argv[i + 1] : d
}

const URL_ = arg("url", "http://localhost:3123/promo-video")
const OUT = arg("out", path.join(os.tmpdir(), "berry-promo-frames"))
const FPS = Number(arg("fps", 30))
const DURATION = Number(arg("duration", 42000))
const W = Number(arg("width", 1920))
const H = Number(arg("height", 1080))
const FORMAT = arg("format", "png")
const QUALITY = Number(arg("quality", 100))
const ONLY = arg("only", "")          // 只渲指定帧序号，逗号分隔（调试用）
const STRIDE = Number(arg("stride", 1)) // 跳帧（快速预览用）
const PROBE = argv.includes("--probe")  // 打印每帧的 DOM 时间戳（排查时间轴断链）

const CHROME_CANDIDATES = [
  path.join(os.homedir(), ".cache/puppeteer/chrome/win64-131.0.6778.204/chrome-win64/chrome.exe"),
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
]
const chromePath = process.env.CHROME_PATH || CHROME_CANDIDATES.find((p) => existsSync(p))
if (!chromePath) throw new Error("找不到 Chrome/Edge 可执行文件，可用 CHROME_PATH 指定")

const profileDir = path.join(os.tmpdir(), `berry-promo-profile-${Date.now()}`)
const port = 9222 + Math.floor(Math.random() * 800)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// ── 启动 ────────────────────────────────────────────────────────────────────
const chrome = spawn(chromePath, [
  "--headless=new",
  "--disable-gpu",
  "--no-sandbox",
  "--no-first-run",
  "--no-default-browser-check",
  "--disable-extensions",
  "--disable-background-timer-throttling",
  "--disable-renderer-backgrounding",
  "--hide-scrollbars",
  "--force-color-profile=srgb",
  "--force-device-scale-factor=1",
  `--window-size=${W},${H}`,
  `--user-data-dir=${profileDir}`,
  `--remote-debugging-port=${port}`,
  "about:blank",
], { stdio: ["ignore", "pipe", "pipe"] })

let chromeErr = ""
chrome.stderr.on("data", (d) => { chromeErr += d.toString() })

// ── 等 CDP 就绪 ─────────────────────────────────────────────────────────────
async function cdpTarget() {
  for (let i = 0; i < 120; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/json/list`)
      const list = await r.json()
      const page = list.find((t) => t.type === "page")
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl
    } catch { /* 还没起来 */ }
    await sleep(250)
  }
  throw new Error("CDP 未就绪。stderr:\n" + chromeErr.slice(-2000))
}

const wsUrl = await cdpTarget()
const ws = new WebSocket(wsUrl)
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej })

let msgId = 0
const pending = new Map()
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data)
  if (m.id && pending.has(m.id)) {
    const { res, rej } = pending.get(m.id)
    pending.delete(m.id)
    m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result)
  }
}
function send(method, params = {}) {
  const id = ++msgId
  return new Promise((res, rej) => {
    pending.set(id, { res, rej })
    ws.send(JSON.stringify({ id, method, params }))
  })
}

// ── 渲染 ────────────────────────────────────────────────────────────────────
await send("Page.enable")
await send("Runtime.enable")
await send("Emulation.setDeviceMetricsOverride", {
  width: W, height: H, deviceScaleFactor: 1, mobile: false,
})

const consoleErrors = []
ws.addEventListener("message", (ev) => {
  const m = JSON.parse(ev.data)
  if (m.method === "Runtime.exceptionThrown") {
    consoleErrors.push(m.params.exceptionDetails?.exception?.description || JSON.stringify(m.params))
  }
})

console.log(`[render] ${URL_}`)
await send("Page.navigate", { url: URL_ })

// 等页面自报就绪
let ready = false
for (let i = 0; i < 240; i++) {
  await sleep(250)
  try {
    const r = await send("Runtime.evaluate", { expression: "!!window.__ready", returnByValue: true })
    if (r.result?.value === true) { ready = true; break }
  } catch { /* not yet */ }
}
if (!ready) throw new Error("页面未就绪（window.__ready 一直为 false）。异常:\n" + consoleErrors.join("\n").slice(0, 3000))
console.log("[render] ready")

// 预热：跑几帧，让字体、图片、布局稳定下来
for (const t of [0, 1200, 2600, 5000, DURATION - 1]) {
  await send("Runtime.evaluate", { expression: `window.__seek(${t})`, awaitPromise: false })
  await sleep(90)
}
await send("Runtime.evaluate", { expression: "document.fonts.ready.then(()=>1)", awaitPromise: true })

const total = Math.floor((DURATION / 1000) * FPS)
const onlySet = ONLY ? new Set(ONLY.split(",").map(Number)) : null

await rm(OUT, { recursive: true, force: true })
await mkdir(OUT, { recursive: true })

const t0 = Date.now()
let written = 0
for (let i = 0; i < total; i += STRIDE) {
  if (onlySet && !onlySet.has(i)) continue
  const t = Math.round((i / FPS) * 1000)
  await send("Runtime.evaluate", {
    expression: `window.__seek(${t})`,
    returnByValue: true,
  })
  // 探针：确认这一帧的 t 真的落到了 DOM 上（时间轴没生效时会立刻暴露）
  if (PROBE) {
    const r = await send("Runtime.evaluate", {
      expression: `document.querySelector('[data-promo-root]')?.getAttribute('data-promo-t')`,
      returnByValue: true,
    })
    console.log(`[probe] 请求 t=${t}  DOM t=${r.result?.value}`)
  }
  const shot = await send("Page.captureScreenshot", {
    format: FORMAT,
    ...(FORMAT === "jpeg" ? { quality: QUALITY } : {}),
    captureBeyondViewport: false,
    fromSurface: true,
  })
  const name = String(i).padStart(6, "0") + (FORMAT === "jpeg" ? ".jpg" : ".png")
  await writeFile(path.join(OUT, name), Buffer.from(shot.data, "base64"))
  written++
  if (written % 60 === 0 || i === 0) {
    const el = (Date.now() - t0) / 1000
    const per = el / written
    const eta = per * ((total - i) / STRIDE)
    console.log(`[render] ${i}/${total} 帧  ${per.toFixed(2)}s/帧  已用 ${el.toFixed(0)}s  预计剩余 ${eta.toFixed(0)}s`)
  }
}

ws.close()
chrome.kill()
await sleep(400)
try { await rm(profileDir, { recursive: true, force: true }) } catch { /* ignore */ }

if (consoleErrors.length) {
  console.log(`[render] 页面异常 ${consoleErrors.length} 条：\n` + consoleErrors.slice(0, 6).join("\n"))
}
console.log(`[render] 完成：${written} 帧 → ${OUT}（用时 ${((Date.now() - t0) / 1000).toFixed(0)}s）`)
