import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { generateEditorConfig } from "@/lib/onlyoffice/config";

/**
 * 获取 OnlyOffice 编辑器配置
 * GET /api/admin/docs/[slug]/editor?mode=edit|view
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "super_admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { slug } = await params;
  const url = new URL(req.url);
  const mode = (url.searchParams.get("mode") === "view" ? "view" : "edit") as "edit" | "view";

  // 构造应用公开 URL
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`;

  const config = await generateEditorConfig(
    slug,
    mode,
    { id: String(user.id), name: user.username || user.email || "Admin" },
    appUrl
  );

  if (!config) {
    return NextResponse.json({ error: "文档不存在或格式不支持" }, { status: 404 });
  }

  // 返回前端需要的配置（含 OnlyOffice API URL）
  return NextResponse.json({
    config,
    apiUrl: process.env.NEXT_PUBLIC_ONLYOFFICE_API_URL || "/onlyoffice/",
  });
}
