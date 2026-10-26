#!/usr/bin/env node
/**
 * AE 素材导出 · 第 4 阶段：打包索引
 * 读 out/export-report.json + out/manifest.json → ae-assets/index.html / README.md / manifest.csv / ae-manifest.json
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../..");
const OUT = path.join(__dirname, "out");
const ASSETS = path.join(ROOT, "ae-assets");

const report = JSON.parse(fs.readFileSync(path.join(OUT, "export-report.json"), "utf8"));
const manifest = JSON.parse(fs.readFileSync(path.join(OUT, "manifest.json"), "utf8"));
const fileOf = new Map(manifest.items.map((i) => [i.slug, i.file]));

/** 疑似空壳：渲染出来几乎只有注入的 children */
const WEAK_H = 56;
const pngItems = report.png.map((p) => ({
  slug: p.slug,
  dir: p.dir,
  w: p.w,
  h: p.h,
  src: p.out,
  file: p.file,
  weak: p.h <= WEAK_H,
  svg: report.svg.some((s) => s.slug === p.slug),
}));

// ── manifest.csv ────────────────────────────────────────────
const csv = ["slug,category,width,height,scale,png,svg,source_file"]
  .concat(
    pngItems.map((p) =>
      [p.slug, p.dir, p.w, p.h, "2x", p.src, p.svg ? p.src.replace(/\.png$/, ".svg").replace("/png/", "/svg/") : "", p.file || ""]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",")
    )
  )
  .join("\n");
fs.writeFileSync(path.join(ASSETS, "manifest.csv"), "\uFEFF" + csv, "utf8");

// ── ae-manifest.json ────────────────────────────────────────
fs.writeFileSync(
  path.join(ASSETS, "ae-manifest.json"),
  JSON.stringify(
    {
      generatedAt: report.generatedAt,
      theme: report.theme,
      pixelRatio: 2,
      counts: { png: pngItems.length, svg: report.svg.length, failed: report.failed.length, empty: report.empty.length },
      categories: [...new Set(pngItems.map((p) => p.dir))].sort(),
      assets: pngItems,
      failed: report.failed,
      empty: report.empty,
    },
    null,
    2
  ),
  "utf8"
);

// ── README.md ───────────────────────────────────────────────
const byDir = {};
pngItems.forEach((p) => (byDir[p.dir] = (byDir[p.dir] || 0) + 1));
const dirRows = Object.entries(byDir)
  .sort((a, b) => b[1] - a[1])
  .map(([d, n]) => `| \`${d}\` | ${n} |`)
  .join("\n");

const readme = `# AE 素材库 · berry-realm

由项目组件自动导出，可直接导入 After Effects。

- 生成时间：${new Date(report.generatedAt).toLocaleString("zh-CN")}
- 主题：${report.theme}
- 像素比：**2x**（导入后如需 1:1，在 AE 里缩放 50%）
- 总数：**${pngItems.length}** 张 PNG（含 alpha） · **${report.svg.length}** 个 SVG 矢量

## 目录结构

\`\`\`
ae-assets/
├── png/<分类>/<组件名>@2x.png    透明背景位图，2 倍分辨率
├── svg/<分类>/<组件名>.svg       真矢量（仅本身含 SVG 图元的组件）
├── index.html                    可视化验收画廊（浏览器打开）
├── manifest.csv                  Excel 可读清单
└── ae-manifest.json              结构化清单（含尺寸、失败项）
\`\`\`

## 分类统计

| 分类 | 数量 |
|---|---|
${dirRows}

## 在 AE 里怎么用

**1. 单张位图**
\`文件 > 导入 > 文件\` → 选 PNG，直接拖进合成。已含透明通道，无需抠图。

**2. 批量导入一整个分类**
\`文件 > 导入 > 文件\` → 多选 → 勾选 **「PNG 序列」**（若文件名非序列会按其为独立素材，逐个导入即可）。
更快的做法：直接把 \`png/<分类>/\` 文件夹拖进项目面板，作为「文件夹」导入。

**3. SVG 转矢量形状（可做路径动画 / 无损缩放）**
导入 SVG → 在时间轴选中该图层 → 右键 **Create Shapes from Vector Layer**。
注意：仅对 \`svg/\` 目录下的文件有效；纯 HTML/CSS 组件（按钮、卡片等）没有矢量源，只有位图。

**4. 分层动效建议**
素材已按组件粒度切好，建议在 AE 里一个组件一个合成，再用预合成拼装，避免单合成图层过多。

## 已知限制

- 组件按「默认状态」渲染（无真实数据、无用户会话），依赖后端数据的面板会显示空态。
- 需要外部数据的组件（图表、执行链等）无法自动实例化，见 \`ae-manifest.json#failed\`。
- \`h ≤ 56px\` 的素材多为空壳或纯包裹组件，\`ae-manifest.json\` 里 \`weak: true\` 标注。
- 亮色主题导出。需要暗色可跑 \`node scripts/ae-export/shoot.cjs --theme dark\`。

## 重新导出

\`\`\`bash
node scripts/ae-export/scan.cjs                       # 扫描分类
node scripts/ae-export/gen-registry.cjs               # 生成画廊 registry
NEXT_DIST_DIR=.next/ae npx next dev -p 3200           # 起隔离 dev 实例
node scripts/ae-export/shoot.cjs                      # 全量截图 + SVG 提取
node scripts/ae-export/make-index.cjs                 # 打包索引
\`\`\`
`;
fs.writeFileSync(path.join(ASSETS, "README.md"), readme, "utf8");

// ── index.html ──────────────────────────────────────────────
const data = JSON.stringify(pngItems);
const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>AE 素材库 · berry-realm (${pngItems.length})</title>
<style>
  :root{
    --bg:#fafafa; --panel:#fff; --line:#e4e4e7; --fg:#18181b; --dim:#71717a;
    --accent:#059669; --chip:#f4f4f5;
    --checker-a:#f0f0f1; --checker-b:#fafafa;
  }
  [data-bg="dark"]{ --bg:#0b0b0d; --panel:#141417; --line:#27272a; --fg:#f4f4f5; --dim:#a1a1aa; --chip:#1f1f23; --checker-a:#1a1a1e; --checker-b:#101013; }
  [data-bg="solid"]{ --checker-a:#fff; --checker-b:#fff; }
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--fg);font:13px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif}
  header{position:sticky;top:0;z-index:20;background:var(--panel);border-bottom:1px solid var(--line);padding:14px 20px;display:flex;align-items:center;gap:14px;flex-wrap:wrap}
  h1{font-size:15px;margin:0;font-weight:600;letter-spacing:-.01em}
  .stat{color:var(--dim);font-size:12px;display:flex;gap:12px}
  .stat b{color:var(--accent);font-weight:600}
  .grow{flex:1}
  input[type=search]{background:var(--chip);border:1px solid var(--line);color:var(--fg);border-radius:8px;padding:7px 11px;font-size:12px;width:230px;outline:none}
  input[type=search]:focus{border-color:var(--accent)}
  .seg{display:flex;border:1px solid var(--line);border-radius:8px;overflow:hidden}
  .seg button{background:transparent;border:0;color:var(--dim);padding:6px 11px;font-size:12px;cursor:pointer;font-family:inherit}
  .seg button[aria-pressed=true]{background:var(--chip);color:var(--fg)}
  main{display:flex;align-items:flex-start}
  nav{position:sticky;top:57px;width:186px;flex:0 0 186px;max-height:calc(100vh - 57px);overflow:auto;padding:14px 10px;border-right:1px solid var(--line)}
  nav button{display:flex;justify-content:space-between;width:100%;background:transparent;border:0;color:var(--fg);font:inherit;padding:6px 9px;border-radius:7px;cursor:pointer;text-align:left}
  nav button:hover{background:var(--chip)}
  nav button[aria-pressed=true]{background:var(--chip);color:var(--accent);font-weight:600}
  nav span{color:var(--dim);font-size:11px}
  section{padding:18px 20px 70px;flex:1;min-width:0}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(184px,1fr));gap:14px}
  .card{border:1px solid var(--line);border-radius:11px;overflow:hidden;background:var(--panel);cursor:zoom-in;transition:border-color .12s,transform .12s}
  .card:hover{border-color:var(--accent);transform:translateY(-1px)}
  .box{height:126px;display:grid;place-items:center;padding:12px;
    background-image:linear-gradient(45deg,var(--checker-a) 25%,transparent 25%),linear-gradient(-45deg,var(--checker-a) 25%,transparent 25%),linear-gradient(45deg,transparent 75%,var(--checker-a) 75%),linear-gradient(-45deg,transparent 75%,var(--checker-a) 75%);
    background-size:14px 14px;background-position:0 0,0 7px,7px -7px,-7px 0;background-color:var(--checker-b)}
  .box img{max-width:100%;max-height:100%;object-fit:contain;image-rendering:auto}
  .meta{padding:8px 10px;border-top:1px solid var(--line)}
  .name{font-size:11.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .sub{font-size:10.5px;color:var(--dim);display:flex;gap:7px;margin-top:2px}
  .tag{color:var(--accent)}
  .weak{opacity:.55}
  #lb{position:fixed;inset:0;z-index:50;background:rgba(0,0,0,.72);display:none;place-items:center;padding:40px;cursor:zoom-out}
  #lb.on{display:grid}
  #lb img{max-width:92vw;max-height:86vh;background:#fff;border-radius:8px;box-shadow:0 20px 60px rgba(0,0,0,.4)}
  #lbi{position:fixed;bottom:22px;left:0;right:0;text-align:center;color:#fff;font-size:12px;font-family:ui-monospace,monospace}
  .empty{padding:60px;text-align:center;color:var(--dim)}
</style>
</head>
<body data-bg="checker">
<header>
  <h1>AE 素材库 · berry-realm</h1>
  <div class="stat"><span><b id="s1">0</b> 张 PNG</span><span><b id="s2">0</b> 个 SVG</span><span id="s3"></span></div>
  <div class="grow"></div>
  <div class="seg" id="bgseg">
    <button data-bg="checker" aria-pressed="true">棋盘</button>
    <button data-bg="dark" aria-pressed="false">深色</button>
    <button data-bg="solid" aria-pressed="false">白底</button>
  </div>
  <input type="search" id="q" placeholder="搜索组件名 / 分类…" autocomplete="off">
</header>
<main>
  <nav id="nav"></nav>
  <section><div class="grid" id="grid"></div><div class="empty" id="none" style="display:none">没有匹配的素材</div></section>
</main>
<div id="lb"><img alt=""><div id="lbi"></div></div>
<script>
const DATA = ${data};
const A = ${JSON.stringify(report.failed.length)};
let cat = "__all__", q = "";

const counts = {};
DATA.forEach(d => counts[d.dir] = (counts[d.dir]||0)+1);
const dirs = Object.keys(counts).sort((a,b)=>counts[b]-counts[a]);

document.getElementById("s1").textContent = DATA.length;
document.getElementById("s2").textContent = ${report.svg.length};
document.getElementById("s3").textContent = ${report.failed.length} ? ${report.failed.length} + " 个需 props 未导出" : "";

const nav = document.getElementById("nav");
const mk = (id, label, n) => {
  const b = document.createElement("button");
  b.innerHTML = '<span style="max-width:120px;overflow:hidden;text-overflow:ellipsis">'+label+'</span><span>'+n+'</span>';
  b.setAttribute("aria-pressed", id === cat);
  b.onclick = () => { cat = id; q = ""; document.getElementById("q").value = ""; paint(); syncNav(); };
  b.dataset.cat = id;
  return b;
};
nav.appendChild(mk("__all__", "全部", DATA.length));
dirs.forEach(d => nav.appendChild(mk(d, d, counts[d])));
function syncNav(){ [...nav.children].forEach(b => b.setAttribute("aria-pressed", b.dataset.cat === cat)); }

const grid = document.getElementById("grid");
function paint(){
  const kw = q.trim().toLowerCase();
  const list = DATA.filter(d =>
    (cat === "__all__" || d.dir === cat) &&
    (!kw || d.slug.toLowerCase().includes(kw) || d.dir.toLowerCase().includes(kw))
  );
  grid.innerHTML = "";
  list.forEach(d => {
    const c = document.createElement("div");
    c.className = "card" + (d.weak ? " weak" : "");
    c.innerHTML =
      '<div class="box"><img loading="lazy" src="' + d.src + '" alt=""></div>' +
      '<div class="meta"><div class="name" title="' + d.slug + '">' + d.slug + '</div>' +
      '<div class="sub"><span>' + d.w + '×' + d.h + '</span>' + (d.svg ? '<span class="tag">SVG</span>' : '') + (d.weak ? '<span>空壳</span>' : '') + '</div></div>';
    c.onclick = () => { const lb = document.getElementById("lb"); lb.classList.add("on"); lb.querySelector("img").src = d.src; document.getElementById("lbi").textContent = d.slug + "  ·  " + d.w + "×" + d.h + "  ·  " + d.src; };
    grid.appendChild(c);
  });
  document.getElementById("none").style.display = list.length ? "none" : "block";
}
document.getElementById("q").oninput = e => { q = e.target.value; paint(); };
document.getElementById("lb").onclick = () => document.getElementById("lb").classList.remove("on");
document.addEventListener("keydown", e => { if (e.key === "Escape") document.getElementById("lb").classList.remove("on"); });
document.getElementById("bgseg").onclick = e => {
  const b = e.target.closest("button"); if (!b) return;
  document.body.dataset.bg = b.dataset.bg;
  [...document.getElementById("bgseg").children].forEach(x => x.setAttribute("aria-pressed", x === b));
};
paint();
</script>
</body>
</html>`;
fs.writeFileSync(path.join(ASSETS, "index.html"), html, "utf8");

console.log(`打包完成：`);
console.log(`  PNG ${pngItems.length} · SVG ${report.svg.length} · 失败 ${report.failed.length} · 空 ${report.empty.length}`);
console.log(`  空壳素材（h≤${WEAK_H}）：${pngItems.filter((p) => p.weak).length}`);
console.log(`  → ae-assets/{index.html, README.md, manifest.csv, ae-manifest.json}`);
