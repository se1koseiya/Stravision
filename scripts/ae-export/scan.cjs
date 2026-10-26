#!/usr/bin/env node
/**
 * AE 素材导出 · 第 1 阶段：扫描分类
 * 扫 components/ 下全部 .tsx，筛出「有视觉输出」的组件，产出 manifest.json
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../..");
const COMP = path.join(ROOT, "components");
const OUT = path.join(__dirname, "out");
fs.mkdirSync(OUT, { recursive: true });

/** 纯逻辑 / 无视觉：按「文件名结尾」判定，避免误杀 mcp-store-content / message-context-menu */
const LOGIC_SUFFIX =
  /-(provider|providers|listener|register|guard|hooks?|context|adapter|observer|worker|types?|utils?|helpers?|constants?|registry|config|script|injector|bridge|boundary|directive|watcher)$/i;
/** 精确排除的纯逻辑文件（无画面） */
const LOGIC_EXACT = new Set([
  "scroll-activity",
  "smooth-scroll",
  "root-scrollbar",
  "scrollbar",
  "lazy-providers",
  "toaster-wrapper",
  "sw-register",
  "scheduler-init",
  "wheel-scroll-guard",
  "message-notification-listener",
  "page-transition",
  "smooth-transition",
  "motion-provider",
  "use-toast",
  "tool-calls-section-utils",
]);
/** 明确排除：非组件目录（纯数据/工具） */
const SKIP_DIR = /[\\/](node_modules|\.next|__tests__|tests?)[\\/]/;

const VISUAL_HINT =
  /(<[A-Za-z][\w.]*[\s/>]|className\s*=|style\s*=\{|<svg|motion\.|return\s*\(\s*<)/;

function walk(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (SKIP_DIR.test(p)) continue;
    if (ent.isDirectory()) walk(p, acc);
    else if (/\.tsx$/.test(ent.name) && !/\.(test|spec|stories)\.tsx$/.test(ent.name)) acc.push(p);
  }
  return acc;
}

/** 抽取主导出名 */
function pickExportName(src, base) {
  const names = [];

  // 1) 具名 / 默认函数导出
  for (const re of [
    /export\s+default\s+function\s+([A-Z]\w*)/g,
    /export\s+default\s+([A-Z]\w*)\s*(?:;|$)/gm,
    /export\s+function\s+([A-Z]\w*)/g,
    /export\s+const\s+([A-Z]\w*)\s*[:=]/g,
    /export\s+class\s+([A-Z]\w*)/g,
  ]) {
    let m;
    while ((m = re.exec(src))) names.push(m[1]);
  }

  // 2) export { A, B } / export { A, B, } 多行块
  const blockRe = /export\s*\{([^}]*)\}/g;
  let bm;
  while ((bm = blockRe.exec(src))) {
    bm[1]
      .split(",")
      .map((s) => s.trim().split(/\s+as\s+/).pop().trim())
      .filter((s) => /^[A-Z]\w*$/.test(s))
      .forEach((s) => names.push(s));
  }

  if (!names.length) return { name: null, confident: false };

  const kebab = base.replace(/-([a-zA-Z0-9])/g, (_, c) => c.toUpperCase());
  const pascal = kebab.charAt(0).toUpperCase() + kebab.slice(1);

  // 优先与文件名同名的导出（最可能是该组件的主体）
  if (names.includes(pascal)) return { name: pascal, confident: true };

  // 其次：形如 XxxYyy 的 PascalCase，且不是 Variants/Context/Props 之类附件
  const main = names.find((n) => !/(Variants|Context|Props|State|Type|Config|Options|Styles?)$/.test(n));
  return { name: main || names[0], confident: false };
}

function main() {
  const files = walk(COMP);
  const items = [];
  const skipped = [];

  for (const f of files) {
    const rel = path.relative(ROOT, f).replace(/\\/g, "/");
    const src = fs.readFileSync(f, "utf8");
    const base = path.basename(f, ".tsx");
    const dir = path.basename(path.dirname(f)) || "root";
    const slug = (path.dirname(rel) === "components" ? "root" : path.relative("components", path.dirname(rel)).replace(/[\\/]/g, "-")) + "__" + base;

    const { name, confident } = pickExportName(src, base);
    const hasJsx = VISUAL_HINT.test(src);
    const hasSvg = /<svg/.test(src);
    const isLogic = LOGIC_SUFFIX.test(base) || LOGIC_EXACT.has(base);
    const noExport = !name;
    const onlyTypes = /^\s*(export\s+)?(type|interface)\s/m.test(src) && !hasJsx;

    if (!hasJsx || onlyTypes || noExport) {
      skipped.push({ rel, reason: !hasJsx ? "no-jsx" : onlyTypes ? "types-only" : "no-explicit-export" });
      continue;
    }
    if (isLogic) {
      skipped.push({ rel, reason: "logic-only-name" });
      continue;
    }

    items.push({
      slug,
      dir,
      file: rel,
      name,
      confident,
      hasSvg,
      // isDefault: 是否 default 导出（决定 import 写法）
      isDefault: /export\s+default/.test(src),
      needsChildren: /children/.test(src),
      needsProps: /(\bprops\b|:\s*\w+Props)/.test(src),
      loc: src.split("\n").length,
    });
  }

  const byDir = {};
  for (const it of items) byDir[it.dir] = (byDir[it.dir] || 0) + 1;

  const manifest = {
    generatedAt: new Date().toISOString(),
    total: items.length,
    withSvg: items.filter((i) => i.hasSvg).length,
    byDir,
    items,
  };
  fs.writeFileSync(path.join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
  fs.writeFileSync(path.join(OUT, "skipped.json"), JSON.stringify(skipped, null, 2), "utf8");

  console.log(`总计扫描: ${files.length}`);
  console.log(`可导出:   ${items.length}  (含 SVG: ${manifest.withSvg})`);
  console.log(`已跳过:   ${skipped.length}`);
  console.log("\n按目录:");
  Object.entries(byDir)
    .sort((a, b) => b[1] - a[1])
    .forEach(([d, n]) => console.log(`  ${String(n).padStart(4)}  ${d}`));
  console.log("\n跳过原因分布:");
  const reasons = {};
  skipped.forEach((s) => (reasons[s.reason] = (reasons[s.reason] || 0) + 1));
  console.log(reasons);
}

main();
