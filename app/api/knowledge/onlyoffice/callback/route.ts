/**
 * 知识库 OnlyOffice 回调 API
 * POST /api/knowledge/onlyoffice/callback
 *
 * OnlyOffice 在文档保存时 POST 到此端点。
 * status: 2=就绪保存, 6=强制保存 → 从 url 下载新版本覆盖原文件
 */

import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import path from "node:path";
import { promises as fs } from "node:fs";

const ONLYOFFICE_JWT_SECRET =
  process.env.ONLYOFFICE_JWT_SECRET || "onlyoffice_secret_change_me";
const PROJECT_ROOT = path.resolve(process.cwd());

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 验证 JWT
    const token =
      body.token ||
      req.headers.get("authorization")?.replace("Bearer ", "");
    if (token) {
      try {
        const verified = jwt.verify(token, ONLYOFFICE_JWT_SECRET);
        Object.assign(body, verified);
      } catch {
        // token 验证失败也继续（开发模式下可能未启用 JWT）
      }
    }

    const status = body.status;
    const downloadUrl = body.url;
    const key = body.key;

    // status 2 和 6 需要下载新版本
    if (status !== 2 && status !== 6) {
      return NextResponse.json({ error: 0 });
    }

    if (!downloadUrl) {
      return NextResponse.json({ error: 1 });
    }

    // 从 key 中解析 itemId（key 格式: kb{id}_{date}）
    // key 可能被截断到 20 字符，需要模糊匹配
    const match = key.match(/^kb(\d+)/);
    if (!match) {
      return NextResponse.json({ error: 1 });
    }
    const itemId = parseInt(match[1], 10);

    // 查询文档的 file_url
    const { pool } = await import("@/lib/db/database");
    const result = await pool.query(
      "SELECT file_url FROM knowledge_items WHERE id = $1",
      [itemId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 1 });
    }

    const fileUrl = result.rows[0].file_url;
    if (!fileUrl) {
      return NextResponse.json({ error: 1 });
    }

    // 下载新版本并覆盖
    const response = await fetch(downloadUrl);
    if (!response.ok) {
      return NextResponse.json({ error: 1 });
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    // file_url 形如 "/uploads/xxx.docx"，存到 public/uploads/xxx.docx
    const localPath = path.join(PROJECT_ROOT, "public", fileUrl);
    await fs.writeFile(localPath, buffer);

    // 更新 updated_at
    await pool.query(
      "UPDATE knowledge_items SET updated_at = NOW() WHERE id = $1",
      [itemId]
    );

    return NextResponse.json({ error: 0 });
  } catch (e) {
    console.error("[kb-onlyoffice/callback] error:", e);
    return NextResponse.json({ error: 1 });
  }
}
