#!/usr/bin/env node
/**
 * AE 素材导出 · 第 2 阶段：生成画廊 registry
 * 为每个组件生成 next/dynamic(ssr:false) 条目，单页挂载、互不牵连。
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../..");
const OUT = path.join(__dirname, "out");
const manifest = JSON.parse(fs.readFileSync(path.join(OUT, "manifest.json"), "utf8"));

const ROUTE = path.join(ROOT, "app", "dev-ae-export");
fs.mkdirSync(ROUTE, { recursive: true });

const entries = manifest.items.map((it) => {
  const spec = it.file.replace(/^components\//, "@/components/").replace(/\.tsx$/, "");
  return `  { slug: ${JSON.stringify(it.slug)}, dir: ${JSON.stringify(it.dir)}, file: ${JSON.stringify(
    it.file
  )}, hasSvg: ${it.hasSvg}, Comp: d(() => import(${JSON.stringify(spec)}).then((m: any) => pick(m, ${JSON.stringify(
    it.name
  )}))) }`;
});

const src = `// ⚠️ 自动生成，请勿手改 —— scripts/ae-export/gen-registry.cjs
"use client";
import type * as React from "react";
import dynamic from "next/dynamic";

const d = (loader: any) =>
  dynamic(loader, { ssr: false, loading: () => null });

/** 解析导出：目标名 → default → 首个 PascalCase 函数导出 */
const pick = (m: any, name: string) => {
  if (!m) return () => null;
  if (typeof m[name] === "function") return m[name];
  if (typeof m.default === "function") return m.default;
  for (const k of Object.keys(m)) {
    if (/^[A-Z]/.test(k) && typeof m[k] === "function") return m[k];
  }
  return () => null;
};

export type AeEntry = {
  slug: string;
  dir: string;
  file: string;
  hasSvg: boolean;
  Comp: React.ComponentType<any>;
};

export const COMPONENTS: AeEntry[] = [
${entries.join(",\n")}
];
`;

fs.writeFileSync(path.join(ROUTE, "registry.tsx"), src, "utf8");
console.log(`registry.tsx 已生成：${manifest.items.length} 条 → ${path.relative(ROOT, path.join(ROUTE, "registry.tsx"))}`);
