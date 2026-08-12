/**
 * 文档附件 API - 单附件删除
 * DELETE /api/admin/docs/[slug]/attachments/[attachmentId]   删除指定附件
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { removeAttachment } from "@/lib/blog/docs-manifest";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "super_admin")) {
    return null;
  }
  return user;
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ slug: string; attachmentId: string }> }
) {
  const auth = await requireAdmin();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { slug, attachmentId } = await params;
    if (!attachmentId) {
      return NextResponse.json({ error: "缺少附件 id" }, { status: 400 });
    }
    const updated = await removeAttachment(slug, attachmentId);
    if (!updated) {
      return NextResponse.json(
        { error: "文档或附件不存在" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, doc: updated });
  } catch (e) {
    console.error("[admin/docs/attachments] delete error:", e);
    const msg = e instanceof Error ? e.message : "删除附件失败";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
