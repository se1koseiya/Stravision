/**
 * 博客 / 用户手册 - 服务端加载器
 *
 * ⚠️ 此文件依赖 node:fs / node:path，仅可在 Server Component / API Route 中使用。
 * 不可被 "use client" 组件直接或间接 import。
 *
 * 客户端需要的类型与常量请从 ./manuals-shared 引入。
 *
 * 设计要点：
 * - 数据源统一为 docs-manifest.json（与后台 DocsManager 同源）
 * - 在构建/请求时按 manifest 中的 filePath 读取 Markdown 文件
 * - 自动生成 Table of Contents（基于 ## 与 ###）
 * - 计算阅读时间、字数等元信息
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import type {
  ManualMeta,
  ManualContent,
  ManualCategory,
  ManualIcon,
  ManualTocItem,
} from "./manuals-shared";
import { slugify } from "./manuals-shared";

// 重导出共享层，方便服务端调用方单一入口
export type {
  ManualMeta,
  ManualContent,
  ManualCategory,
  ManualIcon,
  ManualTocItem,
};
export { CATEGORY_LABELS, ICON_EMOJI, slugify } from "./manuals-shared";

// ============== 配置 ==============

const PROJECT_ROOT = path.resolve(process.cwd());

// ============== 解析工具（服务端纯函数） ==============

/** 从引用块（> ...）中提取 key: value 字段 */
function parseBlockQuoteMeta(raw: string): Record<string, string> {
  const meta: Record<string, string> = {};
  const lines = raw.split("\n");
  for (const line of lines) {
    const m = line.match(/^>\s*([^：:]+)[：:]\s*(.+)$/);
    if (m) {
      const key = m[1].trim().toLowerCase().replace(/\s+/g, "_");
      meta[key] = m[2].trim();
    }
  }
  return meta;
}

/** 从 markdown 文本中提取首个引用块 */
function extractFirstBlockQuote(md: string): string | undefined {
  const m = md.match(/(^>\s.*(?:\n>\s.*)*)/m);
  return m?.[1];
}

/**
 * 提取首个「真正的正文段落」作为摘要。
 *
 * 旧实现只看「第一个非标题行」，但本仓的手册正文结构普遍是
 * `# 标题` → `> 版本/适用对象` → `***` → `## 目录` → TOC 链接列表 → 正文，
 * 于是摘要会被抓成 `***` 或一整段 `1. [xxx](#anchor)` 目录，卡片上非常难看。
 * 这里改成按「段落块」扫描：遇到标题/引用/分隔线/表格/代码块就收尾当前块，
 * 块不合格则丢弃继续找下一块。
 */
function extractExcerpt(md: string): string {
  const lines = md.split("\n");
  let inCodeBlock = false;
  let block: string[] = [];

  /** 收尾当前段落；目录 / 纯符号 / 太短 / 引出句都判为不合格返回 null */
  const flush = (): string | null => {
    if (block.length === 0) return null;
    const text = block.join(" ").trim();
    block = [];
    if (!text) return null;
    // 纯链接列表 = 目录（`1. [标题](#锚点)` / `- [标题](url)`）
    if (/^(?:([-*+]|\d+[.)])\s+\[[^\]]*\]\([^)]*\)\s*)+$/.test(text)) {
      return null;
    }
    const plain = text
      .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/[*_`~$]/g, "")
      .replace(/\s+/g, " ")
      .trim();
    // 表头分隔线、纯符号行都不算正文
    if (!/[\u4e00-\u9fa5a-zA-Z0-9]/.test(plain)) return null;
    if (plain.length < 20) return null;
    // 以冒号收尾的是「引出下文」的句子，单独当摘要读起来是断的
    if (/[:：]$/.test(plain)) return null;
    // 带文件路径 + 扩展名的多是「代码位置在 xxx」这类实现说明，不是文档摘要
    if (/[\w./-]+\.(?:tsx?|jsx?|mjs|cjs|py|md|json|prisma|ya?ml)\b/.test(plain)) {
      return null;
    }
    return plain.slice(0, 220);
  };

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, "");
    if (line.trimStart().startsWith("```")) {
      if (!inCodeBlock) {
        const hit = flush();
        if (hit) return hit;
      }
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    const trimmed = line.trim();
    if (
      trimmed === "" ||
      trimmed.startsWith("#") ||
      trimmed.startsWith(">") ||
      trimmed.startsWith("|") ||
      /^[*_=-]{3,}$/.test(trimmed)
    ) {
      const hit = flush();
      if (hit) return hit;
      continue;
    }
    block.push(trimmed);
  }

  return flush() ?? "";
}

/** 提取目录 (## 与 ###) */
function extractToc(md: string): ManualTocItem[] {
  const toc: ManualTocItem[] = [];
  const lines = md.split("\n");
  let inCodeBlock = false;
  for (const line of lines) {
    if (line.startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;
    const m = line.match(/^(#{2,3})\s+(.+?)\s*$/);
    if (!m) continue;
    const level = (m[1].length as 2 | 3);
    const text = m[2].replace(/[`*_~]/g, "").trim();
    if (!text) continue;
    // 跳过"目录"自身
    if (/^目录$|^table of contents$/i.test(text)) continue;
    // 提取章节号（如 "1.2" 或 "1"）
    const numMatch = text.match(/^(\d+(?:\.\d+)*)\.?\s+/);
    toc.push({
      id: slugify(text),
      level,
      text: text.replace(/^\d+(?:\.\d+)*\.?\s+/, ""),
      number: numMatch?.[1],
    });
  }
  return toc;
}

/** 估算字数（中文按字符算，英文按单词算） */
function countWords(md: string): number {
  // 移除代码块
  const cleaned = md.replace(/```[\s\S]*?```/g, "");
  const chineseChars = (cleaned.match(/[\u4e00-\u9fa5]/g) || []).length;
  const englishWords = (cleaned.match(/[a-zA-Z]+/g) || []).length;
  return chineseChars + englishWords;
}

/** 估算阅读时间（中文 300 字/分，英文 200 词/分） */
function estimateReadingTime(wordCount: number): number {
  return Math.max(1, Math.ceil(wordCount / 300));
}

/** 尝试从内容中找出日期 */
function extractDateFromContent(md: string): string | undefined {
  const m = md.match(/(20\d{2}[-/]\d{1,2}[-/]\d{1,2})/);
  return m?.[1];
}

// ============== 公开 API（含 fs 操作） ==============

/** 读取单个手册的完整内容 */
export async function getManualBySlug(
  slug: string
): Promise<ManualContent | null> {
  const { getManifestDoc, readDocContent } = await import("./docs-manifest");
  const doc = await getManifestDoc(slug);
  if (!doc) return null;

  // 可编辑文档（md/html/zip）走 markdown 渲染
  if (doc.fileType === "md" || doc.fileType === "html" || doc.fileType === "zip") {
    const content = await readDocContent(slug);
    if (content === null) return null;
    const rawMarkdown = content;
    // md 与 zip（内部也是 md）都提取 TOC；html 不提取
    const toc = doc.fileType === "html" ? [] : extractToc(rawMarkdown);
    const wordCount = countWords(rawMarkdown);
    const blockQuote = extractFirstBlockQuote(rawMarkdown);
    const inlineMeta = blockQuote ? parseBlockQuoteMeta(blockQuote) : {};
    const manualMeta: ManualMeta = {
      slug: doc.slug,
      title: doc.title,
      description: doc.description,
      version: inlineMeta.version || inlineMeta["版本"],
      audience: inlineMeta.audience || inlineMeta["适用对象"],
      category: doc.category,
      tags: doc.tags,
      icon: doc.icon,
      readingTimeMin: estimateReadingTime(wordCount),
      wordCount,
      chapterCount: toc.filter((t) => t.level === 2).length,
      toc,
      excerpt: extractExcerpt(rawMarkdown),
      updatedAt: doc.updatedAt,
      createdAt: doc.createdAt,
      author: doc.author,
      authorAvatar: doc.authorAvatar,
      cover: doc.cover,
      attachments: doc.attachments,
    };
    return {
      ...manualMeta,
      rawMarkdown,
      htmlPreview: rawMarkdown
        .replace(/```[\s\S]*?```/g, "")
        .replace(/[#>*`_-]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 500),
      fileType: doc.fileType,
    };
  }

  // 上传类文档（pdf/ppt/doc）— 返回元信息，正文由前端预览组件处理
  const meta: ManualMeta = {
    slug: doc.slug,
    title: doc.title,
    description: doc.description,
    category: doc.category,
    tags: doc.tags,
    icon: doc.icon,
    readingTimeMin: 0,
    wordCount: 0,
    chapterCount: 0,
    toc: [],
    excerpt: doc.description,
    updatedAt: doc.updatedAt,
    createdAt: doc.createdAt,
    author: doc.author,
    authorAvatar: doc.authorAvatar,
    cover: doc.cover,
    attachments: doc.attachments,
  };
  // 构造公开访问 URL（filePath 形如 "public/uploads/docs/xxx.pdf"）
  // 同时兼容 Windows 反斜杠路径的历史数据
  const fileUrl = doc.filePath
    .replace(/^public/, "")
    .replace(/\\/g, "/");
  return {
    ...meta,
    rawMarkdown: "",
    htmlPreview: "",
    fileType: doc.fileType,
    fileUrl,
  };
}

/** 列出所有手册的元信息（不含正文） */
export async function listManuals(): Promise<ManualMeta[]> {
  const { listManifestDocs } = await import("./docs-manifest");
  const manifestDocs = await listManifestDocs();
  const results: ManualMeta[] = [];

  for (const doc of manifestDocs) {
    let toc: ManualTocItem[] = [];
    let wordCount = 0;
    let excerpt = doc.description;
    let updatedAt: string | undefined = doc.updatedAt;

    if (doc.fileType === "md" || doc.fileType === "zip") {
      // 读取 md/zip 文档的正文提取 toc
      try {
        const absPath = path.join(PROJECT_ROOT, doc.filePath);
        const raw = await fs.readFile(absPath, "utf-8");
        toc = extractToc(raw);
        wordCount = countWords(raw);
        excerpt = extractExcerpt(raw);
        // 若 manifest 没写 updatedAt，尝试从内容提取
        if (!updatedAt) updatedAt = extractDateFromContent(raw);
      } catch {
        // ignore
      }
    }

    results.push({
      slug: doc.slug,
      title: doc.title,
      description: doc.description,
      category: doc.category,
      tags: doc.tags,
      icon: doc.icon,
      readingTimeMin: wordCount > 0 ? estimateReadingTime(wordCount) : 0,
      wordCount,
      chapterCount: toc.filter((t) => t.level === 2).length,
      toc,
      excerpt,
      updatedAt,
      createdAt: doc.createdAt,
      author: doc.author,
      authorAvatar: doc.authorAvatar,
      cover: doc.cover,
      attachments: doc.attachments,
    });
  }

  // 按类别排序：user → admin → developer → release
  const order: Record<ManualCategory, number> = {
    user: 0,
    admin: 1,
    developer: 2,
    release: 3,
  };
  results.sort((a, b) => order[a.category] - order[b.category]);
  return results;
}

/** 获取所有可用的 slug（用于 generateStaticParams） */
export async function getManualSlugs(): Promise<string[]> {
  const { listManifestDocs } = await import("./docs-manifest");
  const manifest = await listManifestDocs();
  return manifest.map((d) => d.slug);
}
