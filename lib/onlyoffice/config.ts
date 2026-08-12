/**
 * OnlyOffice Document Server 配置生成模块
 * 
 * 生成 OnlyOffice 编辑器初始化配置和 JWT token。
 * OnlyOffice DS 通过 JWT 对编辑器配置签名，前端用 token 初始化编辑器。
 */

import jwt from "jsonwebtoken";
import path from "node:path";
import { promises as fs } from "node:fs";
import { getManifestDoc, type DocManifestEntry } from "@/lib/blog/docs-manifest";

const ONLYOFFICE_JWT_SECRET = process.env.ONLYOFFICE_JWT_SECRET || "onlyoffice_secret_change_me";
// 内部访问 OnlyOffice 的 URL（Docker 网络内）
const ONLYOFFICE_INTERNAL_URL = process.env.ONLYOFFICE_URL || "http://onlyoffice";
// 前端访问 OnlyOffice 的 URL（通过 nginx 代理）
const ONLYOFFICE_PUBLIC_URL = process.env.NEXT_PUBLIC_ONLYOFFICE_API_URL || "/onlyoffice/";

const PROJECT_ROOT = path.resolve(process.cwd());

/** 文件类型映射到 OnlyOffice documentType */
function getDocumentType(fileType: string): "word" | "cell" | "slide" | null {
  if (["doc", "docx", "html", "md", "txt"].includes(fileType)) return "word";
  if (["xls", "xlsx", "csv"].includes(fileType)) return "cell";
  if (["ppt", "pptx"].includes(fileType)) return "slide";
  return null;
}

/** OnlyOffice 文件格式映射 */
function getFileExt(fileType: string): string {
  return fileType;
}

/** 判断文件类型是否被 OnlyOffice 支持 */
export function isOnlyOfficeSupported(fileType: string): boolean {
  return getDocumentType(fileType) !== null;
}

/** 生成文档的 key（唯一标识，内容变化时需更新） */
function generateDocKey(slug: string, updatedAt: string): string {
  // OnlyOffice 要求 key 仅包含 a-z 0-9 .-_ 且长度 <= 20
  const raw = `${slug}_${updatedAt}`.replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 20);
  return raw;
}

/** 构造文档的公开访问 URL（OnlyOffice 服务器拉取文档用） */
function buildFileUrl(doc: DocManifestEntry, appUrl: string): string {
  // filePath 形如 "public/uploads/docs/xxx.pdf" 或 "docs/xxx.md"
  const publicPath = doc.filePath.replace(/^public/, "");
  return `${appUrl}${publicPath}`;
}

export interface OnlyOfficeConfig {
  documentType: "word" | "cell" | "slide";
  document: {
    fileType: string;
    key: string;
    title: string;
    url: string;
    permissions: {
      edit: boolean;
      download: boolean;
      print: boolean;
      review: boolean;
    };
  };
  editorConfig: {
    mode: "edit" | "view";
    lang: "zh-CN";
    callbackUrl: string;
    user: {
      id: string;
      name: string;
    };
    customization?: {
      autosave: boolean;
      forcesave: boolean;
      compactHeader: boolean;
      toolbarNoTabs: boolean;
    };
  };
  token: string;
}

/**
 * 生成 OnlyOffice 编辑器配置（含 JWT）
 * @param slug 文档 slug
 * @param mode 编辑模式 "edit" | "view"
 * @param user 用户信息 { id, name }
 * @param appUrl 应用公开 URL（如 https://stravision.site）
 */
export async function generateEditorConfig(
  slug: string,
  mode: "edit" | "view",
  user: { id: string; name: string },
  appUrl: string
): Promise<OnlyOfficeConfig | null> {
  const doc = await getManifestDoc(slug);
  if (!doc) return null;

  const documentType = getDocumentType(doc.fileType);
  if (!documentType) return null;

  const fileUrl = buildFileUrl(doc, appUrl);
  const docKey = generateDocKey(doc.slug, doc.updatedAt);
  const isEdit = mode === "edit";

  const callbackUrl = `${appUrl}/api/onlyoffice/callback`;

  const config: Omit<OnlyOfficeConfig, "token"> = {
    documentType,
    document: {
      fileType: getFileExt(doc.fileType),
      key: docKey,
      title: doc.title + "." + doc.fileType,
      url: fileUrl,
      permissions: {
        edit: isEdit,
        download: true,
        print: true,
        review: isEdit,
      },
    },
    editorConfig: {
      mode,
      lang: "zh-CN",
      callbackUrl,
      user: {
        id: user.id,
        name: user.name,
      },
      customization: {
        autosave: true,
        forcesave: true,
        compactHeader: false,
        toolbarNoTabs: false,
      },
    },
  };

  // JWT 签名
  const token = jwt.sign(config, ONLYOFFICE_JWT_SECRET);

  return { ...config, token };
}

/**
 * 验证 OnlyOffice 回调请求的 JWT
 */
export function verifyCallbackToken(token: string): any | null {
  try {
    return jwt.verify(token, ONLYOFFICE_JWT_SECRET);
  } catch {
    return null;
  }
}

/**
 * 处理 OnlyOffice 回调（保存文档）
 * OnlyOffice 在文档保存时 POST 回调，包含 status 和 url
 * status: 0=未找到, 1=编辑中, 2=就绪保存, 3=保存出错, 4=无变化关闭, 6=正在强制保存, 7=强制保存出错
 * 当 status=2 或 6 时，从 url 下载新版本覆盖原文件
 */
export async function handleCallback(payload: any): Promise<{ error: number }> {
  if (!payload) return { error: 1 };

  const status = payload.status;
  const downloadUrl = payload.url;
  const key = payload.key;

  // status 2 和 6 需要下载新版本
  if (status !== 2 && status !== 6) {
    return { error: 0 };
  }

  if (!downloadUrl) return { error: 1 };

  // 从 key 中解析 slug（key 格式: slug_updatedAt）
  // key 可能被截断到 20 字符，所以需要从 manifest 中匹配
  const { listManifestDocs, saveDocContent } = await import("@/lib/blog/docs-manifest");
  const docs = await listManifestDocs();
  const doc = docs.find((d) => generateDocKey(d.slug, d.updatedAt) === key);
  if (!doc) return { error: 1 };

  try {
    // 下载 OnlyOffice 生成的新版本
    const response = await fetch(downloadUrl);
    if (!response.ok) return { error: 1 };

    const buffer = Buffer.from(await response.arrayBuffer());
    const absPath = path.join(PROJECT_ROOT, doc.filePath);
    await fs.writeFile(absPath, buffer);

    return { error: 0 };
  } catch (e) {
    console.error("[onlyoffice] callback download error:", e);
    return { error: 1 };
  }
}
