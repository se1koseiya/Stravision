import { NextResponse } from "next/server";
import { verifyCallbackToken, handleCallback } from "@/lib/onlyoffice/config";

/**
 * OnlyOffice Document Server 回调端点
 * OnlyOffice 在文档保存时会 POST 到这个 URL
 * 
 * 请求体包含 JWT token（在 authorization header 或 body.token 中）
 * status: 0=未找到, 1=编辑中, 2=就绪保存, 3=保存出错, 4=无变化关闭, 6=强制保存, 7=强制保存出错
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // 验证 JWT（OnlyOffice 签名）
    const token = body.token || req.headers.get("authorization")?.replace("Bearer ", "");
    if (token) {
      const verified = verifyCallbackToken(token);
      if (verified) {
        // 用验证后的 payload 替换
        Object.assign(body, verified);
      }
    }

    const result = await handleCallback(body);
    return NextResponse.json(result);
  } catch (e) {
    console.error("[onlyoffice/callback] error:", e);
    return NextResponse.json({ error: 1 });
  }
}
