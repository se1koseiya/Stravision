/**
 * 文档管理 API - 单文档操作
 * GET    /api/admin/docs/[slug]  读取文档内容（md/html）
 * PUT    /api/admin/docs/[slug]  保存编辑内容（md/html 可编辑正文；上传类仅改元信息）
 * DELETE /api/admin/docs/[slug]  删除文档
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  getManifestDoc,
  readDocContent,
  saveDocContent,
  updateDocMeta,
  deleteDoc,
  EDITABLE_TYPES,
} from "@/lib/blog/docs-manifest";
import type { ManualCategory } from "@/lib/blog/manuals-shared";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "super_admin")) {
    return null;
  }
  return user;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const auth = await requireAdmin();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { slug } = await params;
  const doc = await getManifestDoc(slug);
  if (!doc) {
    return NextResponse.json({ error: "文档不存在" }, { status: 404 });
  }

  // 对于可编辑文档，返回内容
  const content = await readDocContent(slug);
  return NextResponse.json({
    doc,
    content: content ?? null,
    editable: content !== null,
  });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const auth = await requireAdmin();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { slug } = await params;
  const body = await req.json();
  const {
    title,
    description,
    category,
    tags,
    content,
    author,
    authorAvatar,
    cover,
    summary,
  } = body;

  if (author !== undefined && !author.trim()) {
    return NextResponse.json({ error: "作者不能为空" }, { status: 400 });
  }

  const validCategories: ManualCategory[] = ["user", "admin", "developer", "release"];
  if (category && !validCategories.includes(category)) {
    return NextResponse.json({ error: "无效的分类" }, { status: 400 });
  }

  // 先取一下当前 doc，判断是否可编辑正文
  const existing = await getManifestDoc(slug);
  if (!existing) {
    return NextResponse.json({ error: "文档不存在" }, { status: 404 });
  }

  const canEditContent = EDITABLE_TYPES.includes(existing.fileType);

  let updated = null;
  if (canEditContent) {
    // 可编辑文档：走 saveDocContent（可同时改正文 + 元信息）
    updated = await saveDocContent(slug, {
      title: title?.trim(),
      description,
      category,
      tags: Array.isArray(tags) ? tags : undefined,
      content,
      author: author?.trim(),
      authorAvatar: authorAvatar || undefined,
      cover: cover || undefined,
      summary: summary || undefined,
    });
  } else {
    // 上传类文档（pdf/ppt/doc）：只能改元信息，不能改正文
    updated = await updateDocMeta(slug, {
      title: title?.trim(),
      description,
      category,
      tags: Array.isArray(tags) ? tags : undefined,
      author: author?.trim(),
      authorAvatar: authorAvatar || undefined,
      cover: cover || undefined,
      summary: summary || undefined,
    });
  }

  if (!updated) {
    return NextResponse.json({ error: "文档不存在或不可编辑" }, { status: 404 });
  }

  return NextResponse.json({ success: true, doc: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const auth = await requireAdmin();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { slug } = await params;
  const ok = await deleteDoc(slug);
  if (!ok) {
    return NextResponse.json({ error: "文档不存在" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
