/**
 * 动态文档管理 - Manifest 服务端模块
 *
 * 管理通过 admin UI 上传/创建的文档，是 blog 文档库与后台文档管理的统一数据源。
 * Manifest 存储在 lib/blog/docs-manifest.json，文件存储在：
 *   - Markdown/HTML: docs/ 目录
 *   - PDF/PPT/DOC: public/uploads/docs/ 目录
 *   - ZIP 文档包（md + attachment）: public/uploads/docs/{slug}/
 *       ├─ {slug}.md            正文
 *       └─ attachment/...       图片等静态资源
 *
 * ⚠️ 仅可在 Server Component / API Route 中使用（依赖 node:fs）。
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import JSZip from "jszip";
import { v4 as uuidv4 } from "uuid";
import type { ManualCategory, ManualIcon, AttachmentMeta } from "./manuals-shared";

// ============== 类型 ==============

export type DocFileType =
  | "md"
  | "html"
  | "pdf"
  | "ppt"
  | "pptx"
  | "doc"
  | "docx"
  | "zip";

export interface DocManifestEntry {
  slug: string;
  title: string;
  description: string;
  category: ManualCategory;
  tags: string[];
  icon: ManualIcon;
  fileType: DocFileType;
  /** 相对于项目根目录的路径 */
  filePath: string;
  /** 上传文件的原始文件名（上传类文档才有） */
  originalFileName?: string;
  /** 作者（必填） */
  author: string;
  /** 作者头像 URL（可选） */
  authorAvatar?: string;
  /** 封面图 URL（可选） */
  cover?: string;
  /** 摘要（可选，比 description 更长，用于卡片展示） */
  summary?: string;
  createdAt: string;
  updatedAt: string;
  /** 文档附件列表（可选，通过 admin 上传，存储于 public/uploads/docs/{slug}/attachments/） */
  attachments?: AttachmentMeta[];
}

export interface DocsManifest {
  docs: DocManifestEntry[];
}

export type { AttachmentMeta };

// ============== 常量 ==============

const PROJECT_ROOT = path.resolve(process.cwd());
const MANIFEST_PATH = path.join(PROJECT_ROOT, "lib", "blog", "docs-manifest.json");
const DOCS_DIR = path.join(PROJECT_ROOT, "docs");
const UPLOADS_DIR = path.join(PROJECT_ROOT, "public", "uploads", "docs");

const EDITABLE_TYPES: DocFileType[] = ["md", "html", "zip"];
const UPLOAD_TYPES: DocFileType[] = ["pdf", "ppt", "pptx", "doc", "docx"];

// ============== 内部工具 ==============

async function ensureDirs() {
  await fs.mkdir(DOCS_DIR, { recursive: true });
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
}

async function readManifest(): Promise<DocsManifest> {
  try {
    const raw = await fs.readFile(MANIFEST_PATH, "utf-8");
    return JSON.parse(raw) as DocsManifest;
  } catch {
    return { docs: [] };
  }
}

async function writeManifest(manifest: DocsManifest): Promise<void> {
  await ensureDirs();
  await fs.writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2), "utf-8");
}

/** 生成唯一 slug（基于标题，去重） */
function generateSlug(title: string, existing: string[]): string {
  const base = title
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "untitled";
  let slug = base;
  let i = 2;
  while (existing.includes(slug)) {
    slug = `${base}-${i}`;
    i++;
  }
  return slug;
}

// ============== 公开 API ==============

/** 列出所有 manifest 文档 */
export async function listManifestDocs(): Promise<DocManifestEntry[]> {
  const manifest = await readManifest();
  return manifest.docs;
}

/** 获取单个 manifest 文档 */
export async function getManifestDoc(slug: string): Promise<DocManifestEntry | null> {
  const manifest = await readManifest();
  return manifest.docs.find((d) => d.slug === slug) ?? null;
}

/** 读取文档内容（仅对 md/html/zip 有效） */
export async function readDocContent(slug: string): Promise<string | null> {
  const doc = await getManifestDoc(slug);
  if (!doc) return null;
  if (!EDITABLE_TYPES.includes(doc.fileType)) return null;
  const filePath = path.join(PROJECT_ROOT, doc.filePath);
  try {
    return await fs.readFile(filePath, "utf-8");
  } catch {
    return null;
  }
}

/** 创建新文档（md/html，在线编辑用） */
export async function createDoc(params: {
  title: string;
  description: string;
  category: ManualCategory;
  tags: string[];
  icon: ManualIcon;
  fileType: "md" | "html";
  content: string;
  author: string;
  authorAvatar?: string;
  cover?: string;
  summary?: string;
}): Promise<DocManifestEntry> {
  const manifest = await readManifest();
  const slug = generateSlug(params.title, manifest.docs.map((d) => d.slug));
  const now = new Date().toISOString().split("T")[0];
  const fileName = `${slug}.${params.fileType}`;
  // 使用 POSIX 分隔符存储相对路径，确保跨平台一致且可被浏览器直接访问
  const filePath = `docs/${fileName}`;

  await ensureDirs();
  const absPath = path.join(PROJECT_ROOT, filePath);
  await fs.writeFile(absPath, params.content, "utf-8");

  const entry: DocManifestEntry = {
    slug,
    title: params.title,
    description: params.description,
    category: params.category,
    tags: params.tags,
    icon: params.icon,
    fileType: params.fileType,
    filePath,
    author: params.author,
    authorAvatar: params.authorAvatar,
    cover: params.cover,
    summary: params.summary,
    createdAt: now,
    updatedAt: now,
  };

  manifest.docs.push(entry);
  await writeManifest(manifest);
  return entry;
}

/** 保存编辑后的文档内容（md/html） */
export async function saveDocContent(
  slug: string,
  params: {
    title?: string;
    description?: string;
    category?: ManualCategory;
    tags?: string[];
    content?: string;
    author?: string;
    authorAvatar?: string;
    cover?: string;
    summary?: string;
  }
): Promise<DocManifestEntry | null> {
  const manifest = await readManifest();
  const idx = manifest.docs.findIndex((d) => d.slug === slug);
  if (idx === -1) return null;
  const doc = manifest.docs[idx];
  if (!EDITABLE_TYPES.includes(doc.fileType)) return null;

  if (params.content !== undefined) {
    const absPath = path.join(PROJECT_ROOT, doc.filePath);
    await fs.writeFile(absPath, params.content, "utf-8");
  }
  if (params.title !== undefined) doc.title = params.title;
  if (params.description !== undefined) doc.description = params.description;
  if (params.category !== undefined) doc.category = params.category;
  if (params.tags !== undefined) doc.tags = params.tags;
  if (params.author !== undefined) doc.author = params.author;
  if (params.authorAvatar !== undefined) doc.authorAvatar = params.authorAvatar;
  if (params.cover !== undefined) doc.cover = params.cover;
  if (params.summary !== undefined) doc.summary = params.summary;
  doc.updatedAt = new Date().toISOString().split("T")[0];

  manifest.docs[idx] = doc;
  await writeManifest(manifest);
  return doc;
}

/** 更新文档元信息（不修改正文，适用于上传类文档 pdf/ppt/doc 等） */
export async function updateDocMeta(
  slug: string,
  params: {
    title?: string;
    description?: string;
    category?: ManualCategory;
    tags?: string[];
    icon?: ManualIcon;
    author?: string;
    authorAvatar?: string;
    cover?: string;
    summary?: string;
  }
): Promise<DocManifestEntry | null> {
  const manifest = await readManifest();
  const idx = manifest.docs.findIndex((d) => d.slug === slug);
  if (idx === -1) return null;
  const doc = manifest.docs[idx];

  if (params.title !== undefined) doc.title = params.title;
  if (params.description !== undefined) doc.description = params.description;
  if (params.category !== undefined) doc.category = params.category;
  if (params.tags !== undefined) doc.tags = params.tags;
  if (params.icon !== undefined) doc.icon = params.icon;
  if (params.author !== undefined) doc.author = params.author;
  if (params.authorAvatar !== undefined) doc.authorAvatar = params.authorAvatar;
  if (params.cover !== undefined) doc.cover = params.cover;
  if (params.summary !== undefined) doc.summary = params.summary;
  doc.updatedAt = new Date().toISOString().split("T")[0];

  manifest.docs[idx] = doc;
  await writeManifest(manifest);
  return doc;
}

/** 上传文档（pdf/ppt/doc，也支持 md/html 作为上传而非创建） */
export async function uploadDoc(params: {
  title: string;
  description: string;
  category: ManualCategory;
  tags: string[];
  icon: ManualIcon;
  fileType: DocFileType;
  originalFileName: string;
  buffer: Buffer;
  author: string;
  authorAvatar?: string;
  cover?: string;
  summary?: string;
}): Promise<DocManifestEntry> {
  const manifest = await readManifest();
  const slug = generateSlug(params.title, manifest.docs.map((d) => d.slug));
  const now = new Date().toISOString().split("T")[0];
  const ext = params.fileType;
  const fileName = `${slug}.${ext}`;

  // 上传类文件存到 public/uploads/docs/，可编辑的也允许上传
  // 使用 POSIX 分隔符存储相对路径，确保跨平台一致且可被浏览器直接访问
  const isUploadType = UPLOAD_TYPES.includes(params.fileType);
  const filePath = isUploadType
    ? `public/uploads/docs/${fileName}`
    : `docs/${fileName}`;

  await ensureDirs();
  const absPath = path.join(PROJECT_ROOT, filePath);
  await fs.writeFile(absPath, params.buffer);

  const entry: DocManifestEntry = {
    slug,
    title: params.title,
    description: params.description,
    category: params.category,
    tags: params.tags,
    icon: params.icon,
    fileType: params.fileType,
    filePath,
    originalFileName: params.originalFileName,
    author: params.author,
    authorAvatar: params.authorAvatar,
    cover: params.cover,
    summary: params.summary,
    createdAt: now,
    updatedAt: now,
  };

  manifest.docs.push(entry);
  await writeManifest(manifest);
  return entry;
}

// ============== ZIP 文档包（md + attachment） ==============

/** 在 zip 内查找 Markdown 文件：优先 index.md / README.md / 根目录首个 .md */
function findMdEntry(
  files: { name: string; dir: boolean }[]
): string | null {
  const mdFiles = files.filter((f) => !f.dir && /\.md$/i.test(f.name));
  if (mdFiles.length === 0) return null;
  const root = mdFiles.find((f) => /(^|\/)index\.md$/i.test(f.name));
  if (root) return root.name;
  const readme = mdFiles.find((f) => /(^|\/)readme\.md$/i.test(f.name));
  if (readme) return readme.name;
  // 根目录首个 md
  const top = mdFiles.find((f) => !f.name.includes("/"));
  if (top) return top.name;
  return mdFiles[0].name;
}

/**
 * 上传 zip 文档包：
 * 1) 解析 zip，找到根目录下的 md 与所有资源
 * 2) 解压到 public/uploads/docs/{slug}/
 *    ├─ {slug}.md
 *    └─ 其他原始目录结构（attachment/、images/ 等）
 * 3) 重写 md 中所有相对路径的图片链接为 /uploads/docs/{slug}/xxx
 * 4) 返回的 filePath 指向最终 md 文件
 */
export async function uploadZipDoc(params: {
  title: string;
  description: string;
  category: ManualCategory;
  tags: string[];
  icon: ManualIcon;
  originalFileName: string;
  buffer: Buffer;
  author: string;
  authorAvatar?: string;
  cover?: string;
  summary?: string;
}): Promise<DocManifestEntry> {
  const manifest = await readManifest();
  const slug = generateSlug(params.title, manifest.docs.map((d) => d.slug));
  const now = new Date().toISOString().split("T")[0];

  await ensureDirs();

  const zip = await JSZip.loadAsync(params.buffer);
  const allEntries = Object.values(zip.files);
  const fileEntries = allEntries.filter((f) => !f.dir);

  // 1. 找到 md 文件
  const mdEntry = findMdEntry(
    allEntries.map((f) => ({ name: f.name, dir: f.dir }))
  );
  if (!mdEntry) {
    throw new Error("ZIP 包中未找到任何 .md 文件");
  }

  const docDir = path.join(UPLOADS_DIR, slug); // public/uploads/docs/{slug}
  const mdFileName = `${slug}.md`;
  const mdRelPath = `public/uploads/docs/${slug}/${mdFileName}`; // 写入 manifest

  // 清理目标目录（避免重名残留）
  await fs.rm(docDir, { recursive: true, force: true });
  await fs.mkdir(docDir, { recursive: true });

  // 2. 遍历解压所有文件
  //    - md 文件统一改名为 {slug}.md
  //    - 其他文件按 zip 内原始相对路径解压到 docDir
  for (const entry of fileEntries) {
    // 安全检查：禁止路径穿越（zip slip）
    const safeName = entry.name.replace(/\\/g, "/");
    if (safeName.split("/").some((p) => p === ".." || p === "")) {
      continue;
    }
    const content = await entry.async("nodebuffer");
    if (entry.name === mdEntry) {
      // md 文件特殊处理
      const mdText = content.toString("utf-8");
      // 3. 重写图片相对路径
      const baseDir = path.posix.dirname(safeName); // md 所在目录（可能为空或 "subdir"）
      const rewritten = rewriteMdImagePaths(mdText, slug, baseDir);
      await fs.writeFile(path.join(docDir, mdFileName), rewritten, "utf-8");
    } else {
      const outPath = path.join(docDir, safeName);
      await fs.mkdir(path.dirname(outPath), { recursive: true });
      await fs.writeFile(outPath, content);
    }
  }

  // 4. 写 manifest
  const entry: DocManifestEntry = {
    slug,
    title: params.title,
    description: params.description,
    category: params.category,
    tags: params.tags,
    icon: params.icon,
    fileType: "zip",
    filePath: mdRelPath,
    originalFileName: params.originalFileName,
    author: params.author,
    authorAvatar: params.authorAvatar,
    cover: params.cover,
    summary: params.summary,
    createdAt: now,
    updatedAt: now,
  };
  manifest.docs.push(entry);
  await writeManifest(manifest);
  return entry;
}

/**
 * 重写 md 中图片 / 链接的相对路径为绝对 URL（/uploads/docs/{slug}/xxx）。
 * 处理：
 *   ![alt](attachment/foo.png)        → ![alt](/uploads/docs/{slug}/attachment/foo.png)
 *   <img src="images/a.jpg">          → <img src="/uploads/docs/{slug}/images/a.jpg">
 *   <a href="docs/x.pdf">             → <a href="/uploads/docs/{slug}/docs/x.pdf">
 * 只重写相对路径（不以 http(s)://、data:、/ 开头），md 同目录文件可省略目录前缀。
 */
function rewriteMdImagePaths(
  md: string,
  slug: string,
  baseDir: string
): string {
  const PUBLIC_PREFIX = `/uploads/docs/${slug}/`;

  const rewriteUrl = (raw: string): string => {
    const url = raw.trim();
    if (!url) return raw;
    if (
      url.startsWith("http://") ||
      url.startsWith("https://") ||
      url.startsWith("data:") ||
      url.startsWith("//") ||
      url.startsWith("/")
    ) {
      return raw;
    }
    // 去掉可选的 title: ![alt](url "title")
    const m = url.match(/^(\S+)(\s+["'(].*["')])?$/);
    if (!m) return raw;
    const rel = m[1];
    const suffix = m[2] || "";
    // 计算最终相对路径
    const fullRel =
      baseDir && baseDir !== "."
        ? path.posix.normalize(path.posix.join(baseDir, rel))
        : rel;
    return `${PUBLIC_PREFIX}${fullRel}${suffix}`;
  };

  // markdown 图片语法 ![alt](url)
  let out = md.replace(
    /!\[([^\]]*)\]\(([^)\s]+)(\s+["'][^"']*["'])?\)/g,
    (_m, alt, url, title) =>
      `![${alt}](${rewriteUrl(url)}${title || ""})`
  );
  // markdown 普通链接 [text](url) —— 仅重写指向本地相对路径的
  out = out.replace(
    /(?<!!)\[([^\]]+)\]\(([^)\s]+)(\s+["'][^"']*["'])?\)/g,
    (m, text, url, title) => {
      const rewritten = rewriteUrl(url);
      if (rewritten === url) return m;
      return `[${text}](${rewritten}${title || ""})`;
    }
  );
  // HTML <img src="..."> / <a href="...">
  out = out.replace(
    /(<img\b[^>]*?\bsrc=)(["'])([^"']+)\2/gi,
    (m, pre, q, url) => `${pre}${q}${rewriteUrl(url)}${q}`
  );
  out = out.replace(
    /(<a\b[^>]*?\bhref=)(["'])([^"']+)\2/gi,
    (m, pre, q, url) => `${pre}${q}${rewriteUrl(url)}${q}`
  );
  // 部分 Markdown 编辑器输出的 <image src="..."> / <source src="...">
  out = out.replace(
    /(<(image|source|video|audio)\b[^>]*?\bsrc=)(["'])([^"']+)\3/gi,
    (m, pre, _tag, q, url) => `${pre}${q}${rewriteUrl(url)}${q}`
  );
  return out;
}

/** 删除文档 */
export async function deleteDoc(slug: string): Promise<boolean> {
  const manifest = await readManifest();
  const idx = manifest.docs.findIndex((d) => d.slug === slug);
  if (idx === -1) return false;
  const doc = manifest.docs[idx];

  // 删除物理文件
  if (doc.fileType === "zip") {
    // zip 包：删除整个目录 public/uploads/docs/{slug}/
    const docDir = path.join(UPLOADS_DIR, slug);
    try {
      await fs.rm(docDir, { recursive: true, force: true });
    } catch {
      // 目录不存在也继续
    }
  } else {
    const absPath = path.join(PROJECT_ROOT, doc.filePath);
    try {
      await fs.unlink(absPath);
    } catch {
      // 文件不存在也继续
    }
    // 清理附件目录（如果存在，public/uploads/docs/{slug}/）
    const docDir = path.join(UPLOADS_DIR, slug);
    try {
      await fs.rm(docDir, { recursive: true, force: true });
    } catch {
      // 目录不存在也继续
    }
  }

  manifest.docs.splice(idx, 1);
  await writeManifest(manifest);
  return true;
}

// ============== 文档附件 ==============

/**
 * 为文档添加附件。
 * 附件存储于 public/uploads/docs/{slug}/attachments/{id}.{ext}，元信息写入 manifest。
 * ext 已由调用方（API 层）完成 MIME 白名单 + 魔数校验。
 */
export async function addAttachment(
  slug: string,
  params: {
    fileName: string;
    buffer: Buffer;
    mimeType: string;
    /** 已校验的小写扩展名（无点） */
    ext: string;
  }
): Promise<{ doc: DocManifestEntry; attachment: AttachmentMeta } | null> {
  const manifest = await readManifest();
  const idx = manifest.docs.findIndex((d) => d.slug === slug);
  if (idx === -1) return null;
  const doc = manifest.docs[idx];

  const id = uuidv4();
  const storedFileName = `${id}.${params.ext}`;
  const attachmentsDir = path.join(UPLOADS_DIR, slug, "attachments");
  await fs.mkdir(attachmentsDir, { recursive: true });
  const absPath = path.join(attachmentsDir, storedFileName);
  await fs.writeFile(absPath, params.buffer);

  const attachment: AttachmentMeta = {
    id,
    fileName: params.fileName,
    filePath: `public/uploads/docs/${slug}/attachments/${storedFileName}`,
    fileUrl: `/uploads/docs/${slug}/attachments/${storedFileName}`,
    fileSize: params.buffer.length,
    mimeType: params.mimeType,
    ext: params.ext,
    uploadedAt: new Date().toISOString(),
  };

  if (!Array.isArray(doc.attachments)) doc.attachments = [];
  doc.attachments.push(attachment);
  doc.updatedAt = new Date().toISOString().split("T")[0];

  manifest.docs[idx] = doc;
  await writeManifest(manifest);
  return { doc, attachment };
}

/** 删除文档附件（含物理文件 + manifest 元信息） */
export async function removeAttachment(
  slug: string,
  attachmentId: string
): Promise<DocManifestEntry | null> {
  const manifest = await readManifest();
  const idx = manifest.docs.findIndex((d) => d.slug === slug);
  if (idx === -1) return null;
  const doc = manifest.docs[idx];
  if (!Array.isArray(doc.attachments)) return null;

  const attIdx = doc.attachments.findIndex((a) => a.id === attachmentId);
  if (attIdx === -1) return null;

  const attachment = doc.attachments[attIdx];
  try {
    const absPath = path.join(PROJECT_ROOT, attachment.filePath);
    await fs.unlink(absPath);
  } catch {
    // 文件不存在也继续
  }

  doc.attachments.splice(attIdx, 1);
  doc.updatedAt = new Date().toISOString().split("T")[0];

  manifest.docs[idx] = doc;
  await writeManifest(manifest);
  return doc;
}

export { EDITABLE_TYPES, UPLOAD_TYPES };
