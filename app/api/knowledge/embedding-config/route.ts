/**
 * Embedding 配置测试 API
 *
 * GET  /api/knowledge/embedding-config   - 获取当前生效的 embedding 配置（不暴露 apiKey 明文）
 * POST /api/knowledge/embedding-config   - 用当前配置生成一次测试 embedding，返回向量预览
 */

export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { resolveEmbeddingProvider, generateEmbedding } from "@/lib/ai/embedding-service"
import { getKnowledgeConfig } from "@/lib/ai/provider-resolver"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 })
  try {
    const config = await resolveEmbeddingProvider()
    return NextResponse.json({
      provider: config.provider,
      model: config.model,
      dimension: config.dimension,
      baseUrl: config.baseUrl.replace(/\/+$/, ""),
      apiKeyMasked: config.apiKey
        ? `${config.apiKey.slice(0, 4)}${"*".repeat(Math.max(0, config.apiKey.length - 8))}${config.apiKey.slice(-4)}`
        : "",
      hasApiKey: !!config.apiKey
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 })
  try {
    const body = await req.json().catch(() => ({}))
    // 测试文本最大字符数走 admin knowledgeConfig.embeddingTest.maxTestTextChars
    const kc = await getKnowledgeConfig()
    const maxTestChars = kc.embeddingTest.maxTestTextChars
    const previewCount = kc.embeddingTest.vectorPreviewCount
    const rawText = body?.text ?? "这是一段测试文本，用于验证知识库 embedding 模型是否可用。The quick brown fox jumps over the lazy dog."
    const text = String(rawText).slice(0, maxTestChars)
    const config = await resolveEmbeddingProvider()
    const result = await generateEmbedding(text)
    return NextResponse.json({
      success: true,
      provider: result.provider,
      model: result.model,
      dimension: result.dimension,
      vectorLength: result.vector.length,
      vectorPreview: result.vector.slice(0, previewCount).map(n => Number(n.toFixed(6))),
      // text 字段预览字符数走 admin knowledgeConfig.embeddingTest.previewTextChars
      text: text.slice(0, Math.min(text.length, kc.embeddingTest.previewTextChars))
    })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message || String(e) }, { status: 500 })
  }
}
