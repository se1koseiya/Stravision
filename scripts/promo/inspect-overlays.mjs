/**
 * 出片环境清理：把会干扰截图的浮层找出来并隐藏。
 *
 * 分两类：
 *  ① Next 开发浮层（错误徽标、Turbopack 提示）—— production 构建下不存在；
 *  ② 应用自身的全局浮层（toast 预警、PWA 安装提示）—— production 下照样存在，
 *     必须在出片时一并挡掉，否则会烧进画面。
 *
 * 做法是先枚举 body 下所有"可疑"节点，再逐个判断。
 */

import { spawn } from "node:child_process"
import { existsSync } from "node:fs"
import path from "node:path"
import os from "node:os"

const URL_ = process.argv[2] || "http://localhost:3123/promo-video"
const CHROME = [
  path.join(os.homedir(), ".cache/puppeteer/chrome/win64-131.0.6778.204/chrome-win64/chrome.exe"),
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
].find((p) => existsSync(p))

const port = 9222 + Math.floor(Math.random() * 700)
const profileDir = path.join(os.tmpdir(), `berry-inspect-${Date.now()}`)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const chrome = spawn(CHROME, [
  "--headless=new", "--disable-gpu", "--no-sandbox", "--no-first-run",
  "--hide-scrollbars", "--window-size=1920,1080",
  `--user-data-dir=${profileDir}`, `--remote-debugging-port=${port}`, "about:blank",
], { stdio: "ignore" })

let wsUrl
for (let i = 0; i < 120; i++) {
  try {
    const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
    const p = list.find((t) => t.type === "page")
    if (p?.webSocketDebuggerUrl) { wsUrl = p.webSocketDebuggerUrl; break }
  } catch {}
  await sleep(250)
}

const ws = new WebSocket(wsUrl)
await new Promise((res) => { ws.onopen = res })
let id = 0
const pend = new Map()
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data)
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) }
}
const send = (method, params = {}) => new Promise((res) => {
  const i = ++id
  pend.set(i, res)
  ws.send(JSON.stringify({ id: i, method, params }))
})
const evaluate = async (expr) => {
  const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true })
  return r.result?.result?.value ?? r.result?.exceptionDetails
}

await send("Page.enable")
await send("Runtime.enable")
await send("Page.navigate", { url: URL_ })
for (let i = 0; i < 200; i++) {
  await sleep(300)
  if (await evaluate("!!window.__ready")) break
}
await evaluate("window.__seek && window.__seek(6000)")
await sleep(500)

// 枚举所有"贴着视口边缘 / 悬浮在内容之上"的节点
const suspects = await evaluate(`
(() => {
  const out = []
  const vw = innerWidth, vh = innerHeight
  document.querySelectorAll('body > *, body > * > *').forEach((el) => {
    if (el.hasAttribute('data-promo-root')) return
    const cs = getComputedStyle(el)
    if (cs.display === 'none' || cs.visibility === 'hidden') return
    const r = el.getBoundingClientRect()
    if (r.width < 8 || r.height < 8) return
    const pos = cs.position
    const floating = pos === 'fixed' || pos === 'absolute'
    const z = parseInt(cs.zIndex || '0', 10)
    out.push({
      tag: el.tagName.toLowerCase(),
      id: el.id || null,
      cls: (el.className && typeof el.className === 'string') ? el.className.slice(0, 120) : null,
      attrs: [...el.attributes].map(a => a.name).filter(a => a !== 'class' && a !== 'id').slice(0, 8),
      pos, z,
      rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)],
      text: (el.innerText || '').replace(/\\s+/g,' ').slice(0, 70),
      floating,
    })
  })
  return JSON.stringify(out, null, 1)
})()
`)
console.log(suspects)

ws.close(); chrome.kill(); await sleep(300)
try { (await import("node:fs/promises")).rm(profileDir, { recursive: true, force: true }) } catch {}
