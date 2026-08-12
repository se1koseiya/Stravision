/**
 * Standalone WebSocket Server for DashScope Realtime API
 * 
 * This server runs separately from Next.js to handle WebSocket connections.
 * It's more stable than Next.js API routes for WebSocket and doesn't require Python.
 * 
 * Usage: node server/ws-server.js
 * Runs on port 3002 by default
 */

const WebSocket = require('ws');
const http = require('http');
const url = require('url');
const https = require('https');
const fs = require('fs');

// Load environment variables from .env.local (if available) then .env
// In Docker, env vars are passed via docker-compose, so these files may not exist
try {
  const dotenv = require('dotenv');
  // Try .env.local first, then .env
  if (fs.existsSync('.env.local')) dotenv.config({ path: '.env.local' });
  if (fs.existsSync('.env')) dotenv.config({ path: '.env' });
} catch (e) {
  console.log('[WS Server] dotenv not available, relying on process.env');
}

const PORT = process.env.WS_SERVER_PORT || 3002;
// 注意：使用 127.0.0.1 而非 localhost，避免 Windows 下 IPv6(::1) 解析导致连接失败
const NEXT_SERVER_URL = process.env.NEXT_SERVER_URL || 'http://127.0.0.1:3000';
const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET || '';

// Omni 架构配置从 voice_config 动态读取（支持独立加密 Key + 共享 Key 回退）
// 不再从环境变量硬编码读取 DASHSCOPE_API_KEY

if (!INTERNAL_API_SECRET) {
  console.error('[WS Server] WARNING: INTERNAL_API_SECRET is not set. Cannot fetch Omni config from Next.js server.');
}

/**
 * 从 Next.js 内部接口拉取 Omni 架构运行时配置（endpoint/model/apiKey）。
 * 返回 null 表示拉取失败（此时回退到环境变量 DASHSCOPE_API_KEY）。
 */
async function fetchOmniConfig() {
  if (!INTERNAL_API_SECRET) return null;
  return new Promise((resolve) => {
    const apiUrl = new URL('/api/internal/voice/omni-config', NEXT_SERVER_URL);
    const isHttps = apiUrl.protocol === 'https:';
    const httpModule = isHttps ? https : http;
    const req = httpModule.request({
      hostname: apiUrl.hostname,
      port: apiUrl.port || (isHttps ? 443 : 80),
      path: apiUrl.pathname,
      method: 'GET',
      headers: {
        'x-internal-secret': INTERNAL_API_SECRET,
        'Content-Type': 'application/json',
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.apiKey) {
            resolve(json);
          } else {
            console.warn('[WS Server] Omni config fetched but apiKey is empty:', json.keySource);
            resolve(null);
          }
        } catch (e) {
          console.error('[WS Server] Failed to parse omni config response:', e.message);
          resolve(null);
        }
      });
    });
    req.on('error', (e) => {
      console.error('[WS Server] Omni config fetch error:', e.message);
      resolve(null);
    });
    req.setTimeout(8000, () => {
      req.destroy();
      console.warn('[WS Server] Omni config fetch timed out');
      resolve(null);
    });
    req.end();
  });
}

// 环境变量兜底 Key（仅在内部接口不可用时使用）
const FALLBACK_DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY || process.env.SYSTEM_OPENAI_API_KEY;

/**
 * 从 Next.js 内部接口拉取 ASR 架构运行时配置（realtimeEndpoint/model/apiKey 等）。
 * 用于实时流式语音识别（WebSocket task-based 协议）。
 * 返回 null 表示拉取失败。
 */
async function fetchAsrConfig() {
  if (!INTERNAL_API_SECRET) return null;
  return new Promise((resolve) => {
    const apiUrl = new URL('/api/internal/voice/asr-config', NEXT_SERVER_URL);
    const isHttps = apiUrl.protocol === 'https:';
    const httpModule = isHttps ? https : http;
    const req = httpModule.request({
      hostname: apiUrl.hostname,
      port: apiUrl.port || (isHttps ? 443 : 80),
      path: apiUrl.pathname,
      method: 'GET',
      headers: {
        'x-internal-secret': INTERNAL_API_SECRET,
        'Content-Type': 'application/json',
      },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
    req.setTimeout(3000, () => { req.destroy(); resolve(null); });
    req.end();
  });
}

/**
 * 处理实时 ASR WebSocket 代理连接（/asr 路径）。
 * 浏览器 → 本代理 → 阿里云 DashScope WS（wss://dashscope.aliyuncs.com/api-ws/v1/inference）
 * 透明转发：控制消息(JSON) + 音频帧(binary) 双向透传，仅添加 Authorization 头。
 */
async function handleAsrConnection(clientWs, req) {
  const query = url.parse(req.url, true).query;

  console.log('[WS Server][ASR] Client connecting to /asr');

  const asrConfig = await fetchAsrConfig();
  const asrApiKey = asrConfig?.apiKey || FALLBACK_DASHSCOPE_API_KEY;
  const asrEndpoint = asrConfig?.endpoint || 'wss://dashscope.aliyuncs.com/api-ws/v1/inference';
  const asrModel = asrConfig?.model || 'qwen-audio-3.0-asr-flash-streaming';

  if (!asrApiKey) {
    console.error('[WS Server][ASR] Rejecting: no ASR API Key configured');
    clientWs.send(JSON.stringify({
      header: { event: 'task-failed', task_id: '', attributes: {} },
      payload: { output: { sentence: { text: '' } }, output_extra: { error_message: '语音服务未配置 API Key' } },
    }));
    clientWs.close(1011, 'Server not configured');
    return;
  }

  console.log(`[WS Server][ASR] Connecting to DashScope: ${asrEndpoint}, model: ${asrModel}`);

  // 构建上游 WebSocket URL（endpoint 可能已含 query，追加 model）
  const separator = asrEndpoint.includes('?') ? '&' : '?';
  const dashScopeUrl = `${asrEndpoint}${separator}model=${encodeURIComponent(asrModel)}`;

  const targetWs = new WebSocket(dashScopeUrl, {
    headers: { 'Authorization': `Bearer ${asrApiKey}` },
  });

  let isTargetOpen = false;
  const pendingMessages = [];

  targetWs.on('open', () => {
    console.log('[WS Server][ASR] Connected to DashScope');
    isTargetOpen = true;
    while (pendingMessages.length > 0) {
      const msg = pendingMessages.shift();
      if (typeof msg === 'object' && msg.isBinary) {
        targetWs.send(msg.data, { binary: true });
      } else {
        const data = typeof msg === 'object' ? msg.data : msg;
        targetWs.send(data);
      }
    }
  });

  // 上游 → 客户端：转发识别结果
  targetWs.on('message', (data, isBinary) => {
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(data, { binary: isBinary });
    }
  });

  targetWs.on('error', (err) => {
    console.error('[WS Server][ASR] Upstream error:', err.message);
    clientWs.send(JSON.stringify({
      header: { event: 'task-failed', task_id: '', attributes: {} },
      payload: { output: { sentence: { text: '' } }, output_extra: { error_message: `上游连接失败: ${err.message}` } },
    }));
  });

  targetWs.on('close', (code, reason) => {
    console.log(`[WS Server][ASR] Upstream closed: ${code} ${reason?.toString() || ''}`);
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.close(code, reason?.toString() || 'upstream closed');
    }
  });

  // 客户端 → 上游：转发控制消息(JSON) + 音频帧(binary)
  clientWs.on('message', (data, isBinary) => {
    // 二进制帧（音频数据）直接转发
    if (isBinary) {
      if (isTargetOpen) {
        targetWs.send(data, { binary: true });
      } else {
        pendingMessages.push({ data, isBinary: true });
      }
      return;
    }

    // JSON 控制消息：注入正确的 model（客户端可能不知道模型名）
    let msgStr = data.toString();
    try {
      const msg = JSON.parse(msgStr);
      if (msg.header?.action === 'run-task' && msg.payload) {
        // 用后端配置的模型覆盖客户端模型
        msg.payload.model = asrModel;
        msgStr = JSON.stringify(msg);
      }
    } catch { /* 非 JSON，原样转发 */ }

    if (isTargetOpen) {
      targetWs.send(msgStr);
    } else {
      pendingMessages.push({ data: msgStr, isBinary: false });
    }
  });

  clientWs.on('close', () => {
    console.log('[WS Server][ASR] Client closed');
    if (targetWs.readyState === WebSocket.OPEN || targetWs.readyState === WebSocket.CONNECTING) {
      try { targetWs.close(1000, 'client closed'); } catch { /* ignore */ }
    }
  });

  clientWs.on('error', () => {
    try { targetWs.close(1000, 'client error'); } catch { /* ignore */ }
  });
}

// Helper to check quota via Next.js API
async function checkQuota(cookie) {
  return new Promise((resolve) => {
    if (!cookie) {
      resolve({ canUse: false, error: 'No auth cookie' });
      return;
    }

    const apiUrl = new URL('/api/user/settings', NEXT_SERVER_URL);
    const isHttps = apiUrl.protocol === 'https:';
    const httpModule = isHttps ? https : http;

    const req = httpModule.request({
      hostname: apiUrl.hostname,
      port: apiUrl.port || (isHttps ? 443 : 80),
      path: apiUrl.pathname,
      method: 'GET',
      headers: {
        'Cookie': cookie,
        'Content-Type': 'application/json'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.quota && json.quota.can_use) {
            resolve({ canUse: true, quota: json.quota });
          } else {
            resolve({ canUse: false, error: 'Quota exceeded' });
          }
        } catch (e) {
          resolve({ canUse: false, error: 'Failed to parse quota response' });
        }
      });
    });

    req.on('error', (e) => {
      console.error('[WS Server] Quota check error:', e.message);
      // In case of error, allow connection (fail open for dev)
      resolve({ canUse: true, error: e.message });
    });

    req.setTimeout(5000, () => {
      req.destroy();
      resolve({ canUse: true, error: 'Quota check timeout' });
    });

    req.end();
  });
}

// Helper to deduct quota after AI response completes
async function deductQuota(cookie) {
  return new Promise((resolve) => {
    if (!cookie) {
      resolve({ success: false, error: 'No auth cookie' });
      return;
    }

    const apiUrl = new URL('/api/voice/deduct-quota', NEXT_SERVER_URL);
    const isHttps = apiUrl.protocol === 'https:';
    const httpModule = isHttps ? https : http;

    const req = httpModule.request({
      hostname: apiUrl.hostname,
      port: apiUrl.port || (isHttps ? 443 : 80),
      path: apiUrl.pathname,
      method: 'POST',
      headers: {
        'Cookie': cookie,
        'Content-Type': 'application/json'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (res.statusCode === 200) {
            console.log(`[WS Server] Quota deducted, usage: ${json.quota?.daily_usage}/${json.quota?.daily_limit}`);
            resolve({ success: true, quota: json.quota });
          } else if (res.statusCode === 429) {
            console.log('[WS Server] Quota exceeded after deduction');
            resolve({ success: false, error: 'Quota exceeded', quota: json.quota });
          } else {
            resolve({ success: false, error: json.error || 'Deduction failed' });
          }
        } catch (e) {
          resolve({ success: false, error: 'Failed to parse response' });
        }
      });
    });

    req.on('error', (e) => {
      console.error('[WS Server] Quota deduction error:', e.message);
      resolve({ success: false, error: e.message });
    });

    req.setTimeout(5000, () => {
      req.destroy();
      resolve({ success: false, error: 'Deduction timeout' });
    });

    req.end();
  });
}

// Create HTTP server
const server = http.createServer((req, res) => {
  // Health check endpoint
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'ws-voice-server' }));
    return;
  }
  
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('WebSocket Server for DashScope Realtime API\nConnect via WebSocket to use.');
});

// Create WebSocket server
const wss = new WebSocket.Server({ server });

wss.on('connection', async (clientWs, req) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname || '';
  const query = parsedUrl.query;
  const cookie = req.headers.cookie || '';

  // 路径路由：/asr 走实时 ASR 代理，其他走 Omni 代理
  if (pathname === '/asr' || pathname.startsWith('/asr/') ||
      pathname === '/ws/asr' || pathname.startsWith('/ws/asr/')) {
    return handleAsrConnection(clientWs, req);
  }

  console.log(`[WS Server] Client connecting, model: ${query.model || '(default)'}`);

  // 拉取 Omni 运行时配置（endpoint/model/apiKey），失败则回退环境变量
  const omniConfig = await fetchOmniConfig();
  const omniApiKey = omniConfig?.apiKey || FALLBACK_DASHSCOPE_API_KEY;
  const omniEndpoint = omniConfig?.endpoint || 'wss://dashscope.aliyuncs.com/api-ws/v1/realtime';
  const model = query.model || omniConfig?.model || 'qwen3-omni-flash-realtime';

  // Reject if no API key available from any source
  if (!omniApiKey) {
    console.error('[WS Server] Rejecting connection: no Omni API Key configured (neither voice_config nor env DASHSCOPE_API_KEY)');
    clientWs.send(JSON.stringify({
      type: 'error',
      error: { message: '语音服务未配置 API Key，请联系管理员在后台设置 Omni 专用 Key 或 AI 提供商共享 Key。' }
    }));
    clientWs.close(1011, 'Server not configured');
    return;
  }

  // Check quota (skip in development if no cookie)
  const isDev = process.env.NODE_ENV === 'development';
  if (!isDev || cookie) {
    const quotaResult = await checkQuota(cookie);
    if (!quotaResult.canUse) {
      console.log(`[WS Server] Connection rejected: ${quotaResult.error}`);
      clientWs.send(JSON.stringify({
        type: 'error',
        error: { message: 'Quota Exceeded' }
      }));
      clientWs.close(1008, 'Quota Exceeded');
      return;
    }
    console.log(`[WS Server] Quota check passed, usage: ${quotaResult.quota?.daily_usage}/${quotaResult.quota?.daily_limit}`);
  }

  console.log(`[WS Server] Client connected, model: ${model}, key source: ${omniConfig?.keySource || 'env fallback'}`);

  // 构建上游 WebSocket URL（endpoint 来自 voice_config，拼接 model 查询参数）
  const separator = omniEndpoint.includes('?') ? '&' : '?';
  const dashScopeUrl = `${omniEndpoint}${separator}model=${encodeURIComponent(model)}`;

  console.log(`[WS Server] Connecting to Omni realtime: ${dashScopeUrl}`);

  const targetWs = new WebSocket(dashScopeUrl, {
    headers: {
      'Authorization': `Bearer ${omniApiKey}`,
    }
  });

  let isTargetOpen = false;
  const pendingMessages = [];

  targetWs.on('open', () => {
    console.log('[WS Server] Connected to DashScope');
    isTargetOpen = true;
    
    // Send any pending messages
    while (pendingMessages.length > 0) {
      const msg = pendingMessages.shift();
      targetWs.send(msg);
    }
  });

  // Track if user actually spoke meaningful content in this turn
  let userTranscriptLength = 0;
  let aiResponseLength = 0;

  targetWs.on('message', async (data) => {
    const dataStr = data.toString();
    
    // Forward message to client
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(dataStr);
    }
    
    // Parse event for quota logic
    try {
      const event = JSON.parse(dataStr);
      
      // Track user's transcribed speech length
      if (event.type === 'conversation.item.input_audio_transcription.completed' && event.transcript) {
        userTranscriptLength = event.transcript.trim().length;
        console.log(`[WS Server] User transcript: "${event.transcript}" (${userTranscriptLength} chars)`);
      }
      
      // Track AI response length
      if (event.type === 'response.audio_transcript.delta' && event.delta) {
        aiResponseLength += event.delta.length;
      }
      
      // Reset tracking when user starts speaking again
      if (event.type === 'input_audio_buffer.speech_started') {
        userTranscriptLength = 0;
        aiResponseLength = 0;
      }
      
      // Only deduct quota when response completes AND it was a meaningful interaction
      if (event.type === 'response.done' && cookie) {
        // Only charge if:
        // 1. User said something meaningful (>= 2 chars, filters out noise like "嗯" "啊")
        // 2. AI gave a substantial response (>= 5 chars, filters out empty/error responses)
        const shouldCharge = userTranscriptLength >= 2 && aiResponseLength >= 5;
        
        if (shouldCharge) {
          console.log(`[WS Server] Charging quota - user: ${userTranscriptLength} chars, AI: ${aiResponseLength} chars`);
          const result = await deductQuota(cookie);
          if (!result.success && result.error === 'Quota exceeded') {
            // Notify client that quota is exhausted
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({
                type: 'quota_warning',
                message: 'Quota exhausted after this response',
                quota: result.quota
              }));
            }
          }
        } else {
          console.log(`[WS Server] Skipping charge - user: ${userTranscriptLength} chars, AI: ${aiResponseLength} chars (noise/empty)`);
        }
        
        // Reset for next turn
        userTranscriptLength = 0;
        aiResponseLength = 0;
      }
    } catch (e) {
      // Not JSON or parse error, ignore
    }
  });

  targetWs.on('error', (err) => {
    console.error('[WS Server] DashScope error:', err.message);
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify({
        type: 'error',
        error: { message: `DashScope error: ${err.message}` }
      }));
    }
  });

  targetWs.on('close', (code, reason) => {
    console.log(`[WS Server] DashScope disconnected: ${code} ${reason}`);
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.close(code, reason.toString());
    }
  });

  // Handle client messages
  clientWs.on('message', (data) => {
    const msg = data.toString();
    
    // Log session.update to debug voice parameter
    try {
      const parsed = JSON.parse(msg);
      if (parsed.type === 'session.update') {
        console.log('[WS Server] session.update voice:', parsed.session?.voice);
      }
    } catch (e) {}
    
    if (isTargetOpen) {
      targetWs.send(msg);
    } else {
      // Queue messages until DashScope connection is ready
      pendingMessages.push(msg);
    }
  });

  clientWs.on('close', () => {
    console.log('[WS Server] Client disconnected');
    if (targetWs.readyState === WebSocket.OPEN) {
      targetWs.close();
    }
  });

  clientWs.on('error', (err) => {
    console.error('[WS Server] Client error:', err.message);
    if (targetWs.readyState === WebSocket.OPEN) {
      targetWs.close();
    }
  });
});

server.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`  WebSocket Server for Voice Service`);
  console.log(`========================================`);
  console.log(`  URL: ws://localhost:${PORT}`);
  console.log(`  Omni API Key source: voice_config (via internal API)`);
  console.log(`  Env fallback Key: ${FALLBACK_DASHSCOPE_API_KEY ? 'configured' : 'NOT SET'}`);
  console.log(`========================================\n`);
});
