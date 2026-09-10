/**
 * 内置深度研究工具包
 *
 * 提供两个工具：
 * - web_search     快速联网搜索：只返回搜索结果摘要，适合「今天天气」「最新消息」这类即时问题
 * - deep_research  深度研究并入库：多轮搜索+融合成带引用的知识条目，写入调用者知识库，
 *                  下次对话即可被知识库检索召回。适合「帮我研究一下 XX 并记住」这类沉淀型请求
 *
 * 设计说明：
 * - 不走 HTTP 自调用（研究逻辑直接 import deep-research-service，省一层网络与鉴权）
 * - deep_research 依赖 agentContext.userId 确定入库归属；缺 userId 时降级为只研究不入库
 * - deep_research 耗时约 1-3 分钟（多轮 LLM + 搜索），工具描述里已向模型说明，
 *   避免模型在简单问题上滥用
 */

import { researchAndIngest, researchTopic, saveKnowledgeEntry, type ResearchOptions } from "../ai/deep-research-service"
import { webSearch, isWebSearchAvailable } from "../ai/web-search-service"
import type { AgentToolContext } from "./mcp-tool-executor"
import type { ToolCallResult } from "./mcp-tool-executor"

export async function executeDeepResearchTool(
  functionName: string,
  args: Record<string, any>,
  agentContext?: AgentToolContext
): Promise<ToolCallResult> {
  switch (functionName) {
    case "web_search":
      // 联网检索依赖搜索源配置，未配置时给出明确提示而不是静默失败
      if (!(await isWebSearchAvailable())) {
        return {
          success: false,
          error: "联网检索不可用：请先在管理后台「AI 提供商 → 联网搜索源」配置搜索源（智谱 provider 或直接粘贴 Exa API Key），或设置 SYSTEM_GLM_API_KEY 环境变量"
        }
      }
      return await executeWebSearch(args)
    case "deep_research":
      if (!(await isWebSearchAvailable())) {
        return {
          success: false,
          error: "联网检索不可用：请先在管理后台「AI 提供商 → 联网搜索源」配置搜索源（智谱 provider 或直接粘贴 Exa API Key），或设置 SYSTEM_GLM_API_KEY 环境变量"
        }
      }
      return await executeDeepResearch(args, agentContext)
    case "knowledge_save":
      // 直接保存用户给定的内容，不依赖联网检索
      return await executeKnowledgeSave(args, agentContext)
    default:
      return { success: false, error: `未知的深度研究工具: ${functionName}` }
  }
}

/** 快速联网搜索 */
async function executeWebSearch(args: Record<string, any>): Promise<ToolCallResult> {
  const query = String(args?.query ?? "").trim()
  if (!query) return { success: false, error: "query 不能为空" }

  const recency = args?.recency as "day" | "week" | "month" | "year" | undefined

  const results = await webSearch(query, {
    count: Math.min(Math.max(Number(args?.count) || 6, 1), 20),
    recency: recency ?? "noLimit",
    contentSize: "high"
  })

  if (results.length === 0) {
    return { success: true, data: { results: [], note: "未搜索到相关结果，可尝试更换关键词" } }
  }

  return {
    success: true,
    data: {
      query,
      results: results.map(r => ({
        title: r.title,
        url: r.url,
        snippet: r.snippet,
        site: r.siteName,
        publishDate: r.publishDate
      }))
    }
  }
}

/** 归一用户 ID：DB 用 BIGSERIAL(int8)，pg 运行时返回字符串，TS 类型却标 number —— 统一转数字再校验 */
function normalizeUserId(raw: unknown): number | null {
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : null
}

/** 把用户直接给定的内容存入知识库并向量化 */
async function executeKnowledgeSave(
  args: Record<string, any>,
  agentContext?: AgentToolContext
): Promise<ToolCallResult> {
  const title = String(args?.title ?? "").trim()
  const content = String(args?.content ?? "").trim()
  if (!title || !content) return { success: false, error: "title 和 content 不能为空" }

  const userId = normalizeUserId(agentContext?.userId)
  if (userId === null) {
    return { success: false, error: "当前会话缺少用户上下文，无法写入知识库" }
  }

  const tags = Array.isArray(args?.tags)
    ? args.tags.map((t: any) => String(t).trim()).filter(Boolean).slice(0, 10)
    : []

  const result = await saveKnowledgeEntry(userId, {
    title,
    content,
    tags,
    collectionId: args?.collectionId ? Number(args.collectionId) : null
  })

  return {
    success: true,
    data: {
      itemId: result.itemId,
      title,
      contentLength: content.length,
      tagCount: tags.length,
      embedded: result.embed
        ? `${result.embed.chunkCount} 个分块（${result.embed.model}）`
        : "embedding 失败，可在知识库中手动重新生成",
      note: "已存入知识库，后续对话可被知识库检索召回"
    }
  }
}

/** 深度研究并沉淀入库 */
async function executeDeepResearch(
  args: Record<string, any>,
  agentContext?: AgentToolContext
): Promise<ToolCallResult> {
  const topic = String(args?.topic ?? "").trim()
  if (!topic) return { success: false, error: "topic 不能为空" }

  // 没有 userId（如定时任务上下文缺失）时降级为只研究不入库，避免数据归属错乱
  const userId = normalizeUserId(agentContext?.userId)
  const researchOpts: ResearchOptions & { collectionId?: number | null } = {
    collectionId: args?.collectionId ? Number(args.collectionId) : null,
    maxSubQueries: Math.min(Math.max(Number(args?.maxSubQueries) || 3, 1), 6),
    maxRounds: Math.min(Math.max(Number(args?.maxRounds) ?? 1, 0), 3),
    // 对话式研究：各阶段进度实时推到前端思维链（拆解 → 检索 → 补搜 → 融合 → 入库）
    onProgress: agentContext?.onProgress
  }

  if (userId === null) {
    const result = await researchTopic(topic, researchOpts)
    return {
      success: true,
      data: {
        topic,
        title: result.title,
        summary: result.summary,
        content: result.content.slice(0, 6000),
        sources: result.sources.slice(0, 10),
        note: "当前会话缺少用户上下文，研究结果未入库"
      }
    }
  }

  const result = await researchAndIngest(topic, userId, researchOpts)

  return {
    success: true,
    data: {
      topic,
      itemId: result.itemId,
      title: result.title,
      summary: result.summary,
      subQueries: result.subQueries,
      rounds: result.rounds,
      sourceCount: result.sources.length,
      topSources: result.sources.slice(0, 5).map(s => ({ title: s.title, url: s.url })),
      embedded: result.embed
        ? `${result.embed.chunkCount} 个分块（${result.embed.model}）`
        : "embedding 失败，可在知识库中手动重新生成",
      note: "已存入知识库「AI研究」标签下，后续对话可被知识库检索召回"
    }
  }
}
