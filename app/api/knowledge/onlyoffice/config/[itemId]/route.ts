/**
 * 知识库 OnlyOffice 配置 API
 * GET /api/knowledge/onlyoffice/config/[itemId]?mode=edit|view
 *
 * 返回 OnlyOffice 编辑器配置（含 JWT）
 * 权限：需登录 + 对应知识库的 read/write 权限
 */

import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { getCurrentUser } from "@/lib/auth";
import { pool } from "@/lib/db/database";

const ONLYOFFICE_JWT_SECRET =
  process.env.ONLYOFFICE_JWT_SECRET || "onlyoffice_secret_change_me";

function getDocumentType(fileName: string): "word" | "cell" | "slide" | null {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (!ext) return null;
  if (["doc", "docx", "txt", "rtf", "html"].includes(ext)) return "word";
  if (["xls", "xlsx", "csv"].includes(ext)) return "cell";
  if (["ppt", "pptx"].includes(ext)) return "slide";
  return null;
}

function generateDocKey(itemId: number, updatedAt: string): string {
  const raw = `kb${itemId}_${updatedAt}`
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .slice(0, 20);
  return raw;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { itemId: itemIdStr } = await params;
  const itemId = parseInt(itemIdStr, 10);
  if (isNaN(itemId)) {
    return NextResponse.json({ error: "无效的 itemId" }, { status: 400 });
  }

  const url = new URL(req.url);
  const mode = (url.searchParams.get("mode") === "view" ? "view" : "edit") as
    | "edit"
    | "view";

  try {
    // 查询文档信息
    const itemResult = await pool.query(
      `SELECT ki.id, ki.title, ki.file_url, ki.content_type, ki.collection_id,
              ki.updated_at, ki.user_id,
              kc.is_marketplace
       FROM knowledge_items ki
       LEFT JOIN knowledge_collections kc ON ki.collection_id = kc.id
       WHERE ki.id = $1`,
      [itemId]
    );

    if (itemResult.rows.length === 0) {
      return NextResponse.json({ error: "文档不存在" }, { status: 404 });
    }

    const item = itemResult.rows[0];

    if (!item.file_url) {
      return NextResponse.json(
        { error: "该文档没有关联文件" },
        { status: 400 }
      );
    }

    const fileName = item.file_url.split("/").pop() || item.title;
    const documentType = getDocumentType(fileName);
    if (!documentType) {
      return NextResponse.json(
        { error: `不支持的文件类型: ${fileName}` },
        { status: 400 }
      );
    }

    // 权限校验：检查协作者权限
    const { resolveRole, hasPermission } = await import(
      "@/lib/db/kb-collaboration-service"
    );
    const role = await resolveRole(user.id, item.collection_id);
    const isOwner = item.user_id === user.id;
    const isAdmin = user.role === "admin" || user.role === "super_admin";

    // 市场 KB 任何人可读，但写需要权限
    const canRead =
      isOwner || isAdmin || role !== null || item.is_marketplace;
    const canWrite =
      isOwner || isAdmin || hasPermission(role, "write");

    if (!canRead) {
      return NextResponse.json({ error: "无权访问此文档" }, { status: 403 });
    }

    const effectiveMode = mode === "edit" && !canWrite ? "view" : mode;
    const isEdit = effectiveMode === "edit";

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.APP_URL ||
      `http://localhost:${process.env.PORT || 3000}`;
    const fileUrl = `${appUrl}${item.file_url}`;
    const docKey = generateDocKey(
      itemId,
      new Date(item.updated_at).toISOString().split("T")[0]
    );
    const fileExt = fileName.split(".").pop()?.toLowerCase() || "docx";

    const config: any = {
      documentType,
      document: {
        fileType: fileExt,
        key: docKey,
        title: fileName,
        url: fileUrl,
        permissions: {
          edit: isEdit,
          download: true,
          print: true,
          review: isEdit,
        },
      },
      editorConfig: {
        mode: effectiveMode,
        lang: "zh-CN",
        callbackUrl: `${appUrl}/api/knowledge/onlyoffice/callback`,
        user: {
          id: String(user.id),
          name: user.username || user.email || "User",
        },
        customization: {
          autosave: true,
          forcesave: true,
          compactHeader: false,
        },
      },
    };

    // JWT 签名
    const token = jwt.sign(config, ONLYOFFICE_JWT_SECRET);

    return NextResponse.json({
      config: { ...config, token },
      apiUrl:
        process.env.NEXT_PUBLIC_ONLYOFFICE_API_URL || "/onlyoffice/",
    });
  } catch (e) {
    console.error("[kb-onlyoffice] config error:", e);
    return NextResponse.json(
      { error: "配置生成失败" },
      { status: 500 }
    );
  }
}
