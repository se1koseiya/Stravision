/**
 * 公开的 OnlyOffice 预览配置 API
 * GET /api/onlyoffice/config/[slug]
 *
 * 返回 view 模式的 OnlyOffice 编辑器配置（无权限要求）
 */

import { NextResponse } from "next/server";
import { generateEditorConfig, isOnlyOfficeSupported } from "@/lib/onlyoffice/config";
import { getManifestDoc } from "@/lib/blog/docs-manifest";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const doc = await getManifestDoc(slug);
  if (!doc) {
    return NextResponse.json({ error: "文档不存在" }, { status: 404 });
  }

  if (!isOnlyOfficeSupported(doc.fileType)) {
    return NextResponse.json({ error: "该文档类型不支持 OnlyOffice 预览" }, { status: 400 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`;

  const config = await generateEditorConfig(
    slug,
    "view",
    { id: "guest", name: "访客" },
    appUrl
  );

  if (!config) {
    return NextResponse.json({ error: "配置生成失败" }, { status: 500 });
  }

  return NextResponse.json({
    config,
    apiUrl: process.env.NEXT_PUBLIC_ONLYOFFICE_API_URL || "/onlyoffice/",
  });
}
