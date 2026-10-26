#!/usr/bin/env node
/**
 * 后处理：把已导出 SVG 里的 rgba()/rgb() 落成 #rrggbb + *-opacity
 * AE 的 SVG 导入器不认 CSS 颜色函数，未转换会整块变黑。
 */
const fs = require("fs");
const path = require("path");

const SVG_DIR = path.resolve(__dirname, "../../ae-assets/svg");
if (!fs.existsSync(SVG_DIR)) {
  console.error("没有 svg 目录");
  process.exit(1);
}

const hex2 = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");

let files = 0;
let hits = 0;

function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith(".svg")) convert(p);
  }
}

function convert(p) {
  const before = fs.readFileSync(p, "utf8");
  const after = before.replace(
    /\b(fill|stroke|stop-color|flood-color)="rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+))?\s*\)"/g,
    (m, prop, r, g, b, a) => {
      const hex = `#${hex2(+r)}${hex2(+g)}${hex2(+b)}`;
      const alpha = a === undefined ? 1 : parseFloat(a);
      if (alpha >= 0.999) return `${prop}="${hex}"`;
      return `${prop}="${hex}" ${prop === "stop-color" ? "stop-opacity" : prop + "-opacity"}="${+alpha.toFixed(3)}"`;
    }
  );
  files++;
  if (after !== before) {
    hits++;
    fs.writeFileSync(p, after, "utf8");
  }
}

walk(SVG_DIR);

// 复查残留
let residual = 0;
function scan(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) scan(p);
    else if (e.name.endsWith(".svg")) {
      const s = fs.readFileSync(p, "utf8");
      if (/rgba?\(|currentColor|var\(--|oklab\(|lab\(/.test(s)) residual++;
    }
  }
}
scan(SVG_DIR);

console.log(`SVG 后处理：${files} 个文件，改写 ${hits} 个`);
console.log(`残留 CSS 颜色函数 / currentColor / var() 的文件：${residual}`);
