/**
 * 文档管理 API - 列表 / 创建 / 上传
 * GET    /api/admin/docs         列出所有 manifest 文档
 * POST   /api/admin/docs         创建新文档（md/html，在线编辑）或上传文件（pdf/ppt/doc/zip）
 * POST   /api/admin/docs/upload  上传文档（pdf/ppt/doc/html/zip）
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  listManifestDocs,
  createDoc,
  uploadDoc,
  uploadZipDoc,
  UPLOAD_TYPES,
  EDITABLE_TYPES,
  type DocFileType,
} from "@/lib/blog/docs-manifest";
import type { ManualCategory, ManualIcon } from "@/lib/blog/manuals-shared";
import { v4 as uuidv4 } from "uuid";

// ============== 权限校验 ==============
async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "super_admin")) {
    return null;
  }
  return user;
}

// ============== MIME 映射（文档类型） ==============
const DOC_MIME_MAP: Record<string, DocFileType> = {
  "text/markdown": "md",
  "text/x-markdown": "md",
  "text/html": "html",
  "application/pdf": "pdf",
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/zip": "zip",
  "application/x-zip-compressed": "zip",
};

const MAX_UPLOAD_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_ZIP_SIZE = 100 * 1024 * 1024; // zip 包较大，放宽到 100MB

// ============== GET: 列表 ==============
export async function GET() {
  const auth = await requireAdmin();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  try {
    const docs = await listManifestDocs();
    return NextResponse.json({ docs });
  } catch (e) {
    console.error("[admin/docs] list error:", e);
    return NextResponse.json({ error: "Failed to list docs" }, { status: 500 });
  }
}

// ============== POST: 创建 / 上传 ==============
export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const contentType = req.headers.get("content-type") || "";

    // ---------- 分支 1: multipart 上传（文件） ----------
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      const title = (formData.get("title") as string) || "";
      const description = (formData.get("description") as string) || "";
      const category = (formData.get("category") as ManualCategory) || "user";
      const tagsStr = (formData.get("tags") as string) || "";
      const icon = (formData.get("icon") as ManualIcon) || "book";
      const author = (formData.get("author") as string) || "";
      const authorAvatar = (formData.get("authorAvatar") as string) || "";
      const cover = (formData.get("cover") as string) || "";
      const summary = (formData.get("summary") as string) || "";

      if (!author.trim()) {
        return NextResponse.json({ error: "作者不能为空" }, { status: 400 });
      }
      if (!file) {
        return NextResponse.json({ error: "未选择文件" }, { status: 400 });
      }

      // 从 MIME 或扩展名确定文件类型
      let fileType: DocFileType | undefined =
        DOC_MIME_MAP[file.type] ||
        DOC_MIME_MAP[file.type.toLowerCase()];

      if (!fileType) {
        // 从文件名扩展名推断
        const ext = file.name.split(".").pop()?.toLowerCase();
        if (ext && [...UPLOAD_TYPES, ...EDITABLE_TYPES].includes(ext as DocFileType)) {
          fileType = ext as DocFileType;
        }
      }

      if (!fileType) {
        return NextResponse.json(
          { error: `不支持的文件类型: ${file.type || file.name}` },
          { status: 400 }
        );
      }

      // zip 单独走分支（更大尺寸 + 解压处理）
      if (fileType === "zip") {
        if (file.size > MAX_ZIP_SIZE) {
          return NextResponse.json(
            { error: "ZIP 包大小超过 100MB 限制" },
            { status: 413 }
          );
        }
        const buffer = Buffer.from(await file.arrayBuffer());
        const tags = tagsStr
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean);
        try {
          const entry = await uploadZipDoc({
            title: title || file.name.replace(/\.[^.]+$/, ""),
            description,
            category,
            tags,
            icon,
            originalFileName: file.name,
            buffer,
            author: author.trim(),
            authorAvatar: authorAvatar || undefined,
            cover: cover || undefined,
            summary: summary || undefined,
          });
          return NextResponse.json({ success: true, doc: entry });
        } catch (e: any) {
          return NextResponse.json(
            { error: e?.message || "ZIP 解析失败" },
            { status: 400 }
          );
        }
      }

      if (file.size > MAX_UPLOAD_SIZE) {
        return NextResponse.json({ error: "文件大小超过 50MB 限制" }, { status: 413 });
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const tags = tagsStr
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const entry = await uploadDoc({
        title: title || file.name.replace(/\.[^.]+$/, ""),
        description,
        category,
        tags,
        icon,
        fileType,
        originalFileName: file.name,
        buffer,
        author: author.trim(),
        authorAvatar: authorAvatar || undefined,
        cover: cover || undefined,
        summary: summary || undefined,
      });

      return NextResponse.json({ success: true, doc: entry });
    }

    // ---------- 分支 2: JSON 创建（在线编辑新建） ----------
    const body = await req.json();
    const {
      title,
      description,
      category,
      tags,
      icon,
      fileType,
      content,
      author,
      authorAvatar,
      cover,
      summary,
    } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: "标题不能为空" }, { status: 400 });
    }
    if (!author?.trim()) {
      return NextResponse.json({ error: "作者不能为空" }, { status: 400 });
    }
    if (!["md", "html"].includes(fileType)) {
      return NextResponse.json(
        { error: "在线创建仅支持 md 或 html" },
        { status: 400 }
      );
    }

    const validCategories: ManualCategory[] = ["user", "admin", "developer", "release"];
    if (!validCategories.includes(category)) {
      return NextResponse.json({ error: "无效的分类" }, { status: 400 });
    }

    const entry = await createDoc({
      title: title.trim(),
      description: description || "",
      category,
      tags: Array.isArray(tags) ? tags : [],
      icon: icon || "book",
      fileType,
      content: content || "",
      author: author.trim(),
      authorAvatar: authorAvatar || undefined,
      cover: cover || undefined,
      summary: summary || undefined,
    });

    return NextResponse.json({ success: true, doc: entry });
  } catch (e) {
    console.error("[admin/docs] create/upload error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "操作失败" },
      { status: 500 }
    );
  }
}
