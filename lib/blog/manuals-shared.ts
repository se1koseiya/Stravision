/**
 * 博客 / 用户手册 - 共享层（客户端安全）
 *
 * 此文件不依赖任何 Node.js 内置模块（无 node:fs / node:path），
 * 可被 "use client" 组件直接 import。
 *
 * 包含：
 * - 所有 TypeScript 类型定义
 * - 类别 / 图标常量
 * - 纯函数：slugify
 *
 * 服务端逻辑（fs 读取、解析）在 manuals.ts 中。
 */

// ============== 类型 ==============

export interface ManualTocItem {
  id: string;
  level: 2 | 3;
  text: string;
  number?: string; // 例如 "1" / "1.2"
}

/** 文档附件元信息（存储于 manifest，与文档同生命周期） */
export interface AttachmentMeta {
  /** 附件唯一 id（uuid） */
  id: string;
  /** 原始文件名（展示 / 下载时使用） */
  fileName: string;
  /** 相对项目根目录的物理路径，如 public/uploads/docs/{slug}/attachments/{id}.pdf */
  filePath: string;
  /** 公开访问 URL，如 /uploads/docs/{slug}/attachments/{id}.pdf */
  fileUrl: string;
  /** 文件大小（字节） */
  fileSize: number;
  /** 声明的 MIME 类型 */
  mimeType: string;
  /** 小写扩展名（无点），如 pdf */
  ext: string;
  /** 上传时间（ISO 字符串） */
  uploadedAt: string;
}

export interface ManualMeta {
  slug: string;
  title: string;
  description: string;
  version?: string;
  audience?: string;
  updatedAt?: string;
  createdAt?: string;
  category: ManualCategory;
  tags: string[];
  icon: ManualIcon;
  readingTimeMin: number;
  wordCount: number;
  chapterCount: number;
  toc: ManualTocItem[];
  excerpt: string;
  /** 作者（必填） */
  author?: string;
  /** 作者头像 URL（可选） */
  authorAvatar?: string;
  /** 封面图 URL（可选） */
  cover?: string;
  /** 文档附件列表（可选） */
  attachments?: AttachmentMeta[];
}

export interface ManualContent extends ManualMeta {
  rawMarkdown: string;
  htmlPreview: string; // 前 500 字纯文本，用于搜索摘要
  /** 动态文档的文件类型（md/html/pdf/ppt/doc 等），硬编码手册默认为 md */
  fileType?: string;
  /** 上传类文档的访问路径（如 /uploads/docs/xxx.pdf） */
  fileUrl?: string;
}

export type ManualCategory =
  | "user"
  | "admin"
  | "developer"
  | "release";

export type ManualIcon =
  | "book"
  | "shield"
  | "code"
  | "rocket"
  | "leaf"
  | "brain";

// ============== 常量 ==============

/** 类别中文标签 */
export const CATEGORY_LABELS: Record<ManualCategory, string> = {
  user: "用户手册",
  admin: "管理员手册",
  developer: "开发文档",
  release: "发布说明",
};

/** 图标 emoji（仅作 fallback，UI 中应使用 lucide 图标） */
export const ICON_EMOJI: Record<ManualIcon, string> = {
  book: "📘",
  shield: "🛡️",
  code: "💻",
  rocket: "🚀",
  leaf: "🍓",
  brain: "🧠",
};

// ============== 纯函数 ==============

/** 将中文/英文标题转换为可用的 anchor id */
export function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "") // 保留字母、数字、空格、连字符
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
