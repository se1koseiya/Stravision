/**
 * 通用远程 MCP（Streamable HTTP）极简客户端，零依赖。
 *
 * 供两处共用（放独立模块以避免 lib/ai ↔ lib/mcp 循环依赖）：
 * - lib/mcp/mcp-tool-executor.ts 的 AnySearch 工具分支
 * - lib/ai/web-search-service.ts 的 anysearch 搜索协议
 *
 * 协议流程（Streamable HTTP）：
 *   1. POST initialize → 从响应头拿 mcp-session-id（服务端不要求会话时跳过）
 *   2. POST notifications/initialized
 *   3. POST tools/call → 响应可能是 JSON 或 SSE，统一解析 JSON-RPC result
 */

export interface RemoteMcpCallResult {
  ok: boolean
  /** 所有 text 内容块拼接结果 */
  text: string
  /** JSON-RPC result 原始对象（含 content 数组等） */
  raw: any
  error?: string
}

/** 从 JSON 或 SSE 文本中解析出 JSON-RPC payload */
function parseJsonRpcPayload(raw: string, contentType: string): any | null {
  if (contentType.includes('text/event-stream')) {
    const dataLines = raw.split('\n').filter(l => l.startsWith('data:'))
    for (let i = dataLines.length - 1; i >= 0; i--) {
      try {
        const parsed = JSON.parse(dataLines[i].slice(5).trim())
        if (parsed?.result || parsed?.error) return parsed
      } catch { /* 跳过非 JSON 行 */ }
    }
    return null
  }
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

/**
 * 调用远程 MCP 服务器的单个工具
 *
 * @param endpoint  MCP 端点（如 https://api.anysearch.com/mcp）
 * @param toolName  MCP 工具名（服务器侧原名，非平台前缀名）
 * @param args      工具参数
 * @param opts.apiKey     可选 Bearer Key（不传走匿名，取决于服务器）
 * @param opts.extraHeaders 额外请求头（如 X-Anysearch-Client）
 * @param opts.timeoutMs  tools/call 超时，默认 60s
 */
export async function remoteMcpToolCall(
  endpoint: string,
  toolName: string,
  args: Record<string, any>,
  opts: {
    apiKey?: string
    extraHeaders?: Record<string, string>
    clientName?: string
    timeoutMs?: number
    signal?: AbortSignal
  } = {}
): Promise<RemoteMcpCallResult> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/event-stream',
    ...(opts.extraHeaders || {})
  }
  if (opts.apiKey) headers['Authorization'] = `Bearer ${opts.apiKey}`

  // 1. initialize 握手（失败不阻塞，部分实现支持无会话直调）
  let sessionId = ''
  try {
    const initRes = await fetch(endpoint, {
      method: 'POST',
      headers,
      signal: opts.signal ?? AbortSignal.timeout(15000),
      body: JSON.stringify({
        jsonrpc: '2.0', id: 0, method: 'initialize',
        params: {
          protocolVersion: '2025-03-26',
          capabilities: {},
          clientInfo: { name: opts.clientName || 'stravision-ai-assistant', version: '1.0.0' }
        }
      })
    })
    sessionId = initRes.headers.get('mcp-session-id') || ''
    if (sessionId) {
      await fetch(endpoint, {
        method: 'POST',
        headers: { ...headers, 'mcp-session-id': sessionId },
        signal: AbortSignal.timeout(10000),
        body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })
      })
    }
  } catch { /* 无会话模式继续 */ }

  // 2. tools/call
  const callRes = await fetch(endpoint, {
    method: 'POST',
    headers: sessionId ? { ...headers, 'mcp-session-id': sessionId } : headers,
    signal: opts.signal ?? AbortSignal.timeout(opts.timeoutMs ?? 60000),
    body: JSON.stringify({
      jsonrpc: '2.0', id: 1, method: 'tools/call',
      params: { name: toolName, arguments: args }
    })
  })

  if (!callRes.ok) {
    const detail = await callRes.text().catch(() => '')
    throw new Error(`MCP HTTP ${callRes.status}: ${detail.slice(0, 200)}`)
  }

  const payload = parseJsonRpcPayload(await callRes.text(), callRes.headers.get('content-type') || '')
  if (!payload) throw new Error('MCP 响应解析失败（非 JSON/SSE 或无有效负载）')
  if (payload?.error) throw new Error(payload.error.message || 'MCP 调用返回错误')

  const content: any[] = payload?.result?.content || []
  const text = content
    .filter((c: any) => c?.type === 'text' && typeof c.text === 'string')
    .map((c: any) => c.text)
    .join('\n\n')

  return { ok: true, text, raw: payload?.result ?? null }
}
