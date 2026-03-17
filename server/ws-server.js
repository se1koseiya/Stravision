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

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const PORT = process.env.WS_SERVER_PORT || 3002;
const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY || process.env.SYSTEM_OPENAI_API_KEY;
const NEXT_SERVER_URL = process.env.NEXT_SERVER_URL || 'http://localhost:3000';

if (!DASHSCOPE_API_KEY) {
  console.error('ERROR: DASHSCOPE_API_KEY is not set in .env.local');
  process.exit(1);
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
  const query = url.parse(req.url, true).query;
  const model = query.model || 'qwen3-omni-flash-realtime';
  const cookie = req.headers.cookie || '';
  
  console.log(`[WS Server] Client connecting, model: ${model}`);
  
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
  
  console.log(`[WS Server] Client connected, model: ${model}`);
  
  // Connect to DashScope
  const dashScopeUrl = `wss://dashscope.aliyuncs.com/api-ws/v1/realtime?model=${encodeURIComponent(model)}`;
  
  console.log(`[WS Server] Connecting to DashScope: ${dashScopeUrl}`);
  
  const targetWs = new WebSocket(dashScopeUrl, {
    headers: {
      'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
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
  console.log(`  DashScope API Key: ${DASHSCOPE_API_KEY ? 'configured' : 'NOT SET'}`);
  console.log(`========================================\n`);
});
