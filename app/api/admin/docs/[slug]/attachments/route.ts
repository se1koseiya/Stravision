/**
 * 文档附件 API
 * GET    /api/admin/docs/[slug]/attachments          列出文档所有附件
 * POST   /api/admin/docs/[slug]/attachments          上传新附件（multipart/form-data，字段 file）
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  getManifestDoc,
  addAttachment,
} from "@/lib/blog/docs-manifest";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "super_admin")) {
    return null;
  }
  return user;
}

// 允许的附件类型白名单（MIME → 安全扩展名映射）
// 严禁 html/htm/svg/js/mjs/json/xml/css 等可被浏览器执行/渲染的类型，
// 因为附件存于 public/ 下，会被 Next.js 作为静态资源直接对外暴露。
const ALLOWED_MIME_TO_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/bmp": "bmp",
  "application/pdf": "pdf",
  "application/zip": "zip",
  "application/x-zip-compressed": "zip",
  "text/plain": "txt",
  "text/markdown": "md",
  "text/csv": "csv",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "video/mp4": "mp4",
  "audio/mpeg": "mp3",
};

// 允许的扩展名白名单（反向校验，防止客户端伪造 MIME）
const ALLOWED_EXTENSIONS = new Set(Object.values(ALLOWED_MIME_TO_EXT));

// 附件大小上限：50 MB（与文档上传单文件限制一致）
const MAX_ATTACHMENT_SIZE = 50 * 1024 * 1024;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const auth = await requireAdmin();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { slug } = await params;
    const doc = await getManifestDoc(slug);
    if (!doc) {
      return NextResponse.json({ error: "文档不存在" }, { status: 404 });
    }
    return NextResponse.json({
      attachments: Array.isArray(doc.attachments) ? doc.attachments : [],
    });
  } catch (e) {
    console.error("[admin/docs/attachments] list error:", e);
    return NextResponse.json({ error: "获取附件列表失败" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const auth = await requireAdmin();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { slug } = await params;
    const doc = await getManifestDoc(slug);
    if (!doc) {
      return NextResponse.json({ error: "文档不存在" }, { status: 404 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "未选择附件文件" }, { status: 400 });
    }

    if (file.size > MAX_ATTACHMENT_SIZE) {
      return NextResponse.json(
        { error: `附件大小超过 ${MAX_ATTACHMENT_SIZE / 1024 / 1024}MB 限制` },
        { status: 413 }
      );
    }

    // 1. MIME 白名单校验（file.type 来自客户端，可被篡改，作为第一道防线）
    const declaredMime = file.type || "";
    let fileExt = ALLOWED_MIME_TO_EXT[declaredMime];

    if (!fileExt) {
      // MIME 不在白名单：尝试从原始文件名取扩展名做反向校验
      const extMatch = file.name.match(/\.([a-zA-Z0-9]{1,8})$/);
      const fallbackExt = extMatch ? extMatch[1].toLowerCase() : "";
      if (!ALLOWED_EXTENSIONS.has(fallbackExt)) {
        return NextResponse.json(
          { error: "不支持的附件类型" },
          { status: 415 }
        );
      }
      fileExt = fallbackExt;
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 2. 文件头魔数校验：验证实际内容与声明类型一致，防止伪造 MIME 绕过
    const magicError = validateMagicBytes(buffer, fileExt);
    if (magicError) {
      return NextResponse.json({ error: magicError }, { status: 415 });
    }

    // 3. 原始文件名安全化（去除路径部分，仅保留文件名）
    const safeFileName = (file.name || `attachment.${fileExt}`)
      .replace(/\\/g, "/")
      .split("/")
      .pop()!
      .replace(/^\.+/, "")
      .slice(0, 200);

    const result = await addAttachment(slug, {
      fileName: safeFileName,
      buffer,
      mimeType: declaredMime || "application/octet-stream",
      ext: fileExt,
    });

    if (!result) {
      return NextResponse.json({ error: "文档不存在" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      attachment: result.attachment,
      doc: result.doc,
    });
  } catch (e) {
    console.error("[admin/docs/attachments] upload error:", e);
    const msg = e instanceof Error ? e.message : "附件上传失败";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * 校验文件头魔数与声明扩展名是否一致。
 * 仅对常见类型做最小校验，不匹配则返回错误描述。
 */
function validateMagicBytes(buf: Buffer, ext: string): string | null {
  if (buf.length < 4) return null; // 太小不做校验，让上游白名单兜底

  switch (ext) {
    case "png":
      if (!(buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47)) {
        return "附件内容与 PNG 格式不匹配";
      }
      break;
    case "jpg":
      if (!(buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff)) {
        return "附件内容与 JPEG 格式不匹配";
      }
      break;
    case "gif":
      if (!(buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38)) {
        return "附件内容与 GIF 格式不匹配";
      }
      break;
    case "pdf":
      if (buf.slice(0, 4).toString("ascii") !== "%PDF") {
        return "附件内容与 PDF 格式不匹配";
      }
      break;
    case "zip":
      if (!(buf[0] === 0x50 && buf[1] === 0x4b && (buf[2] === 0x03 || buf[2] === 0x05 || buf[2] === 0x07))) {
        return "附件内容与 ZIP 格式不匹配";
      }
      break;
    case "mp4":
      if (buf.length < 12 || buf.slice(4, 8).toString("ascii") !== "ftyp") {
        return "附件内容与 MP4 格式不匹配";
      }
      break;
    default:
      // 其他类型不强制魔数校验，依赖 MIME + 扩展名白名单
      break;
  }
  return null;
}
