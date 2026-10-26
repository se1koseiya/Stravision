#!/usr/bin/env node
/**
 * AE 素材导出 · 第 3 阶段：CDP 批量截图 + SVG 提取
 *
 * 用法：
 *   node scripts/ae-export/shoot.cjs                 # 全部批次
 *   node scripts/ae-export/shoot.cjs --batch 0       # 只跑某批
 *   node scripts/ae-export/shoot.cjs --theme dark    # 暗色
 *   node scripts/ae-export/shoot.cjs --only slug     # 单个组件调试
 */
const fs = require("fs");
const path = require("path");
const { createRequire } = require("module");

const NM = "file:///C:/Users/24121/.workbuddy/binaries/node/workspace/node_modules/";
const req = createRequire(NM);
const puppeteer = req("puppeteer-core");

const ROOT = path.resolve(__dirname, "../..");
const OUT = path.join(__dirname, "out");
const ASSETS = path.join(ROOT, "ae-assets");

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const BASE = process.env.AE_BASE || "http://127.0.0.1:3200/dev-ae-export";
const SIZE = 40;

const argv = process.argv.slice(2);
const arg = (k, d = null) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const ONLY = arg("only");
const THEME = arg("theme", "light");
const ONLY_BATCH = arg("batch");
const RETRY = argv.includes("--retry");

const manifest = JSON.parse(fs.readFileSync(path.join(OUT, "manifest.json"), "utf8"));

/** 读旧报告做合并，避免 --only / --retry 覆盖掉已有成果 */
const REPORT_PATH = path.join(OUT, "export-report.json");
let prev = { png: [], svg: [], failed: [], empty: [] };
if ((ONLY || RETRY) && fs.existsSync(REPORT_PATH)) {
  try {
    prev = JSON.parse(fs.readFileSync(REPORT_PATH, "utf8"));
  } catch {}
}
const result = {
  generatedAt: new Date().toISOString(),
  theme: THEME,
  png: [...(prev.png || [])],
  svg: [...(prev.svg || [])],
  failed: [...(prev.failed || [])],
  empty: [...(prev.empty || [])],
};

const dedupe = () => {
  const m = (arr) => {
    const seen = new Map();
    arr.forEach((x) => seen.set(x.slug, x));
    return [...seen.values()];
  };
  result.png = m(result.png);
  result.svg = m(result.svg);
};

function ensure(p) {
  fs.mkdirSync(p, { recursive: true });
}

/**
 * 注入式屏蔽：Next dev 工具气泡 / 全部浮层弹窗 / 页面画布底色
 * 只动「外壳与图层」，组件自身的卡片白底保留
 */
const BLOCK_CSS = `
  html, body { background: transparent !important; }
  html { color-scheme: light; }

  /* ── Next.js dev 指示器（左下角 "N 18 Issues" 气泡）── */
  nextjs-portal,
  [data-nextjs-toast],
  [data-nextjs-dev-tools],
  nextjs-dev-tools-indicator,
  [data-nextjs-dev-tools-button],
  [data-next-badge-root],
  #__next-build-watcher,
  [data-nextjs-error-indicator] { display: none !important; visibility: hidden !important; }

  /* ── 浮层 / 弹窗 / 提示 / 抽屉 ── */
  [role="dialog"],
  [role="alertdialog"],
  [role="tooltip"],
  [data-radix-popper-content-wrapper],
  [data-radix-portal],
  [data-sonner-toaster],
  [data-vaul-drawer],
  .ant-modal-root,
  .ant-message,
  .ant-notification,
  .ant-tooltip,
  [data-sender-popover],
  [data-feedback-host] { display: none !important; }

  /* ── 页面画布：外壳一律透明 ── */
  [data-ae-shell],
  [data-ae-shell] > div { background-color: transparent !important; background-image: none !important; }
`;

/** 删掉已挂载的 portal 节点 + 强制外壳透明（toast 会在组件请求返回后延迟弹出） */
const NUKE = (sel) => {
  document.querySelectorAll(sel).forEach((e) => e.remove());
  document.documentElement.style.setProperty("background", "transparent", "important");
  document.body.style.setProperty("background", "transparent", "important");
  let el = document.querySelector("[data-ae-id]");
  while (el && el !== document.documentElement) {
    const cs = getComputedStyle(el);
    if (cs.backgroundColor !== "rgba(0, 0, 0, 0)" || cs.backgroundImage !== "none") {
      el.style.setProperty("background", "transparent", "important");
    }
    el = el.parentElement;
  }
};

const OVERLAY_SEL = [
  "nextjs-portal",
  "[data-nextjs-toast]",
  "[data-nextjs-dev-tools]",
  "nextjs-dev-tools-indicator",
  "[data-next-badge-root]",
  '[role="dialog"]',
  '[role="alertdialog"]',
  "[data-radix-popper-content-wrapper]",
  "[data-radix-portal]",
  "[data-sonner-toaster]",
  ".ant-modal-root",
  ".ant-message",
  ".ant-notification",
  ".ant-tooltip",
  "[data-sender-popover]",
  "[data-feedback-host]",
].join(",");

/** 元素内所有 <svg> 合并为一个根 SVG；颜色全部落地为可解析 rgb */
const EXTRACT_SVG = `(stage) => {
  const NS = "http://www.w3.org/2000/svg";
  const ctx = document.createElement("canvas").getContext("2d");
  // AE 的 SVG 解析器不认 rgba()/lab()/oklab()，一律落成 #rrggbb + *-opacity
  const toPaint = (c) => {
    if (!c || c === "none" || c === "transparent") return null;
    let v = c;
    try { ctx.fillStyle = "#000000"; ctx.fillStyle = c; v = ctx.fillStyle; } catch (e) {}
    const m = /^rgba?\\(([^)]+)\\)$/.exec(v);
    if (m) {
      const p = m[1].split(",").map((x) => parseFloat(x));
      const hex = "#" + p.slice(0, 3).map((x) => Math.round(x).toString(16).padStart(2, "0")).join("");
      return { hex, a: p.length > 3 ? p[3] : 1 };
    }
    if (/^#[0-9a-f]{3,8}$/i.test(v)) return { hex: v.slice(0, 7), a: 1 };
    return { hex: v, a: 1 };
  };
  const svgs = Array.from(stage.querySelectorAll("svg"));
  if (!svgs.length) return null;
  const sr = stage.getBoundingClientRect();
  const W = Math.ceil(sr.width), H = Math.ceil(sr.height);
  if (!W || !H) return null;

  const root = document.createElementNS(NS, "svg");
  root.setAttribute("xmlns", NS);
  root.setAttribute("width", W);
  root.setAttribute("height", H);
  root.setAttribute("viewBox", "0 0 " + W + " " + H);

  let kept = 0;
  for (const svg of svgs) {
    const r = svg.getBoundingClientRect();
    if (r.width < 0.5 || r.height < 0.5) continue;
    const clone = svg.cloneNode(true);
    const src = svg.querySelectorAll("*");
    const dst = clone.querySelectorAll("*");
    const apply = (el, cs) => {
      const f = toPaint(cs.fill);
      if (f) {
        el.setAttribute("fill", f.hex);
        if (f.a < 1) el.setAttribute("fill-opacity", String(+f.a.toFixed(3)));
        else el.removeAttribute("fill-opacity");
      } else el.setAttribute("fill", "none");
      const s = toPaint(cs.stroke);
      if (s) {
        el.setAttribute("stroke", s.hex);
        if (s.a < 1) el.setAttribute("stroke-opacity", String(+s.a.toFixed(3)));
        el.setAttribute("stroke-width", String(parseFloat(cs.strokeWidth) || 1));
        if (cs.strokeLinecap && cs.strokeLinecap !== "butt") el.setAttribute("stroke-linecap", cs.strokeLinecap);
        if (cs.strokeLinejoin && cs.strokeLinejoin !== "miter") el.setAttribute("stroke-linejoin", cs.strokeLinejoin);
      }
      const op = parseFloat(cs.opacity);
      if (!isNaN(op) && op < 1) el.setAttribute("opacity", String(op));
      el.removeAttribute("class");
      el.removeAttribute("style");
    };
    apply(clone, getComputedStyle(svg));
    for (let i = 0; i < src.length; i++) if (dst[i]) apply(dst[i], getComputedStyle(src[i]));

    // 以「嵌套 svg」定位，保留原始 viewBox 与裁剪
    clone.setAttribute("x", String(r.left - sr.left));
    clone.setAttribute("y", String(r.top - sr.top));
    clone.setAttribute("width", String(r.width));
    clone.setAttribute("height", String(r.height));
    root.appendChild(clone);
    kept++;
  }
  if (!kept) return null;
  return '<?xml version="1.0" encoding="UTF-8"?>\\n' + new XMLSerializer().serializeToString(root);
}`;

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    args: ["--proxy-server=direct://", "--proxy-bypass-list=*", "--no-sandbox", "--force-device-scale-factor=2"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 1000, deviceScaleFactor: 2 });

  const retrySlugs = RETRY
    ? [...new Set([...(prev.failed || []), ...(prev.empty || [])].map((x) => x.slug))].filter((s) => !s.startsWith("__batch_"))
    : [];

  const targets = ONLY
    ? [{ only: ONLY }]
    : RETRY
    ? retrySlugs.map((s) => ({ only: s }))
    : ONLY_BATCH !== null
    ? [{ batch: Number(ONLY_BATCH) }]
    : [...Array(Math.ceil(manifest.items.length / SIZE)).keys()].map((b) => ({ batch: b }));

  if (RETRY) process.stdout.write(`重试 ${targets.length} 个失败/空渲染组件\n`);

  const forget = (slug) => {
    result.failed = result.failed.filter((x) => x.slug !== slug);
    result.empty = result.empty.filter((x) => x.slug !== slug);
  };

  for (const t of targets) {
    const url = t.only ? `${BASE}?only=${encodeURIComponent(t.only)}&theme=${THEME}` : `${BASE}?batch=${t.batch}&size=${SIZE}&theme=${THEME}`;
    process.stdout.write(`\n[batch ${t.batch ?? t.only}] ${url}\n`);
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 180000 });
      await page.addStyleTag({ content: BLOCK_CSS }).catch(() => {});
      await page.waitForSelector('[data-ae-ready="1"]', { timeout: 180000 });
      // 等动态组件全部挂载 + 入场动画跑到终态
      await new Promise((r) => setTimeout(r, 3200));
      // 首次清理：此时组件的 401 toast 已弹出
      await page.evaluate(NUKE, OVERLAY_SEL).catch(() => {});

      const ids = await page.$$eval("[data-ae-id]", (els) => els.map((e) => e.getAttribute("data-ae-id")));
      process.stdout.write(`  元素 ${ids.length} 个\n`);

      for (const id of ids) {
        const handle = await page.$(`[data-ae-id="${id}"]`);
        if (!handle) continue;
        const meta = await page.evaluate((slug) => {
          const el = document.querySelector(`[data-ae-id="${slug}"]`);
          const r = el.getBoundingClientRect();
          const errEl = el.querySelector("[data-ae-error]");
          return {
            w: Math.round(r.width),
            h: Math.round(r.height),
            failed: el.getAttribute("data-ae-failed") === "1",
            err: errEl ? errEl.textContent.slice(0, 160) : null,
            dir: el.getAttribute("data-ae-dir") || "root",
            hasSvg: !!el.querySelector("svg"),
          };
        }, id);

        const entry = manifest.items.find((i) => i.slug === id);
        const dir = meta.dir;

        if (meta.failed) {
          result.failed.push({ slug: id, file: entry?.file, reason: meta.err || "render error" });
          process.stdout.write(`  ✗ ${id} — ${(meta.err || "").slice(0, 60)}\n`);
          await handle.dispose();
          continue;
        }
        if (meta.w <= 8 || meta.h <= 8) {
          result.empty.push({ slug: id, file: entry?.file, w: meta.w, h: meta.h });
          process.stdout.write(`  ○ ${id} — 空渲染 ${meta.w}x${meta.h}\n`);
          await handle.dispose();
          continue;
        }

        const pngPath = path.join(ASSETS, "png", dir, `${id}@2x.png`);
        ensure(path.dirname(pngPath));
        try {
          await handle.screenshot({ path: pngPath, omitBackground: true, captureBeyondViewport: true });
          result.png.push({ slug: id, dir, file: entry?.file, w: meta.w, h: meta.h, out: path.relative(ROOT, pngPath).replace(/\\/g, "/") });
        } catch (e) {
          result.failed.push({ slug: id, file: entry?.file, reason: "screenshot: " + e.message });
          await handle.dispose();
          continue;
        }

        if (meta.hasSvg) {
          try {
            const svgStr = await page.evaluate(`(${EXTRACT_SVG})(document.querySelector('[data-ae-id="${id}"]'))`);
            if (svgStr) {
              const svgPath = path.join(ASSETS, "svg", dir, `${id}.svg`);
              ensure(path.dirname(svgPath));
              fs.writeFileSync(svgPath, svgStr, "utf8");
              result.svg.push({ slug: id, dir, out: path.relative(ROOT, svgPath).replace(/\\/g, "/") });
            }
          } catch (e) {
            result.failed.push({ slug: id, file: entry?.file, reason: "svg: " + e.message });
          }
        }
        process.stdout.write(`  ✓ ${id} ${meta.w}x${meta.h}${meta.hasSvg ? " +svg" : ""}\n`);
        forget(id);
        await handle.dispose();
      }
    } catch (e) {
      process.stdout.write(`  !! batch ${t.batch ?? t.only} 失败: ${e.message}\n`);
      result.failed.push({ slug: `__batch_${t.batch ?? t.only}`, reason: e.message });
    }

    dedupe();
    // 每批落盘，避免中途崩掉全丢
    fs.writeFileSync(REPORT_PATH, JSON.stringify(result, null, 2), "utf8");
  }

  await browser.close();
  console.log(`\n=== 完成 ===`);
  console.log(`PNG: ${result.png.length}  SVG: ${result.svg.length}  失败: ${result.failed.length}  空: ${result.empty.length}`);
  console.log(`报告: ${path.relative(ROOT, path.join(OUT, "export-report.json"))}`);
})().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});
