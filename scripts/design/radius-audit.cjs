/**
 * 同心圆角审计：外层半径应 = 内层半径 + 间距
 * 用法：node _radius_audit.cjs /monitor /dashboard /device-control
 */
const fs = require("fs")
const path = require("path")
const { createRequire } = require("module")
const req = createRequire("file:///C:/Users/24121/.workbuddy/binaries/node/workspace/node_modules/")
const puppeteer = req("puppeteer-core")
const TOKEN = fs.readFileSync(path.join(process.cwd(), "_verify_token.txt"), "utf8").trim()
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe"
const BASE = "http://127.0.0.1:3000"
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

;(async () => {
  const routes = process.argv.slice(2)
  if (!routes.length) routes.push("/monitor")
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: "new",
    args: ["--no-sandbox", "--disable-gpu", "--force-device-scale-factor=1", "--proxy-server=direct://"],
  })
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900 })
  await page.setCookie({ name: "auth", value: TOKEN, domain: "127.0.0.1", path: "/" })
  await page.goto(`${BASE}/monitor`, { waitUntil: "domcontentloaded", timeout: 180000 }).catch(() => {})
  await page.evaluate(() => localStorage.setItem("theme", "light"))

  for (const route of routes) {
    await page.goto(`${BASE}${route}?t=${Date.now()}`, { waitUntil: "domcontentloaded", timeout: 180000 }).catch(() => {})
    await sleep(3500)
    const out = await page.evaluate(() => {
      const parseR = (v) => {
        const m = String(v).match(/^([\d.]+)px/)
        return m ? parseFloat(m[1]) : 0
      }
      const rect = (el) => el.getBoundingClientRect()
      const hasSurface = (el) => {
        const cs = getComputedStyle(el)
        const bg = cs.backgroundColor
        const alpha = (() => {
          const m = bg.match(/rgba?\(([^)]+)\)/)
          if (!m) return 0
          const parts = m[1].split(",").map((s) => parseFloat(s))
          return parts.length > 3 ? parts[3] : 1
        })()
        return (alpha > 0.01 && bg !== "transparent") || (cs.backdropFilter && cs.backdropFilter !== "none")
      }
      const label = (el) => {
        const cls = String(el.className || "").split(/\s+/).filter((c) => c && !/^(dark:|hover:|group|relative|flex|absolute)$/.test(c)).slice(0, 4).join(".")
        return `${el.tagName.toLowerCase()}${el.dataset.cameraId ? "[cam]" : ""}${cls ? "." + cls : ""}`
      }
      const all = Array.from(document.querySelectorAll("body *"))
      const rows = []
      for (const el of all) {
        const cs = getComputedStyle(el)
        if (cs.display === "none" || cs.visibility === "hidden" || Number(cs.opacity) === 0) continue
        const r = rect(el)
        if (r.width < 24 || r.height < 24) continue
        const rad = Math.max(parseR(cs.borderTopLeftRadius), parseR(cs.borderTopRightRadius))
        if (rad < 2) continue
        if (!hasSurface(el)) continue
        // 找最近的有圆角+底色的祖先
        let p = el.parentElement
        let parent = null
        while (p && p !== document.body) {
          const pcs = getComputedStyle(p)
          const pr = Math.max(parseR(pcs.borderTopLeftRadius), parseR(pcs.borderTopRightRadius))
          if (pr >= 2 && hasSurface(p)) { parent = { el: p, rad: pr, cs: pcs }; break }
          p = p.parentElement
        }
        if (!parent) continue
        const prc = rect(parent.el)
        const pbL = parseFloat(parent.cs.borderLeftWidth) || 0
        const pbT = parseFloat(parent.cs.borderTopWidth) || 0
        const gaps = [
          r.left - (prc.left + pbL),
          r.top - (prc.top + pbT),
          (prc.right - pbL) - r.right,
          (prc.bottom - pbT) - r.bottom,
        ]
        const pos = gaps.filter((g) => g > -0.5)
        const gap = Math.round(Math.min(...pos))
        // 「贴边嵌套」= 四边内缩基本一致（= 父级 padding），只有这种才适用同心公式
        const flush =
          Math.max(...pos) - Math.min(...pos) <= 2 &&
          gaps.every((g) => g > -0.5)
        const expect = rad + gap
        const diff = Math.round(Math.abs(parent.rad - expect) * 10) / 10
        const isPillChild = rad >= Math.min(r.width, r.height) / 2 - 0.5
        const isPillParent = parent.rad >= Math.min(prc.width, prc.height) / 2 - 0.5
        rows.push({
          child: label(el),
          childR: Math.round(rad),
          parent: label(parent.el),
          parentR: Math.round(parent.rad),
          gap,
          expect: Math.round(expect),
          diff,
          flush,
          pill: isPillChild || isPillParent,
          bad: flush && diff > 2,
        })
      }
      // 只保留「有底色的子块」= 真正的嵌套面
      return rows.filter((x) => x.gap >= 0)
    })
    const bad = out.filter((x) => x.bad)
    console.log(`\n===== ${route} =====  嵌套对 ${out.length} 组，违例 ${bad.length} 组`)
    const uniq = new Map()
    for (const x of bad) uniq.set(`${x.child}|${x.parent}|${x.childR}|${x.parentR}|${x.gap}`, x)
    for (const x of uniq.values()) {
      console.log(`❌ 内 ${String(x.childR).padStart(3)} (${x.child})  ↗ 外 ${String(x.parentR).padStart(3)} (${x.parent})  间距 ${x.gap} → 应为 ${x.expect}`)
    }
  }
  await browser.close()
})().catch((e) => { console.error(e); process.exit(1) })
