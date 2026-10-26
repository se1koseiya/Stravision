
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

// Load environment variables manually since we are not running via Next.js
const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8');
  envConfig.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.trim();
    }
  });
}

const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY || process.env.SYSTEM_OPENAI_API_KEY;
const PORT = Number(process.env.XIAOZHI_WS_PROXY_PORT || process.env.PORT || 3001);

if (!DASHSCOPE_API_KEY) {
  console.error('ERROR: DASHSCOPE_API_KEY is not set in environment variables');
  process.exit(1);
}

console.log('Proxy starting with API Key:', DASHSCOPE_API_KEY.substring(0, 8) + '...');

const wss = new WebSocket.Server({ port: PORT });

/**
 * Omni 实时模型名。2026-09-24：改为环境变量可配，和 admin 后台 voice_config.omni.model 对齐。
 * 优先级：连接串 ?model= → env OMNI_MODEL → 内置默认 qwen3-omni-flash。
 * 前端不需要任何 API 配置，key 走服务端 DASHSCOPE_API_KEY。
 */
const DEFAULT_OMNI_MODEL = process.env.OMNI_MODEL || 'qwen3-omni-flash';

console.log(`WebSocket Proxy Server running on ws://localhost:${PORT}`);
console.log(`Target: wss://dashscope.aliyuncs.com/api-ws/v1/realtime?model=${DEFAULT_OMNI_MODEL}`);

wss.on('connection', (ws, req) => {
  console.log('Client connected');

  // Extract model from query params (simple parsing)
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const model = url.searchParams.get('model') || DEFAULT_OMNI_MODEL;

  const targetUrl = `wss://dashscope.aliyuncs.com/api-ws/v1/realtime?model=${model}`;
  console.log(`Connecting to upstream: ${targetUrl}`);

  const targetWs = new WebSocket(targetUrl, {
    headers: {
      "Authorization": `Bearer ${DASHSCOPE_API_KEY}`,
      "X-DashScope-DataInspection": "enable",
    }
  });

  // Message queue for messages received from client before targetWs is open
  let isFlushing = false;
  const pendingMessages = [];

  let sessionCreatedReceived = false;
  let sessionUpdateSent = false;
  let sessionReadyForAudio = false;
  let sessionUpdateSentAt = 0;
  let sessionReadyForRequests = false;
  let sessionReadyTimer = null;

  const trimPendingAudio = (maxAudio) => {
    let audioCount = 0;
    for (const m of pendingMessages) {
      try {
        const p = JSON.parse(m.toString());
        if (p?.type === 'input_audio_buffer.append') audioCount += 1;
      } catch {}
    }

    while (audioCount > maxAudio) {
      const idx = pendingMessages.findIndex((m) => {
        try {
          const p = JSON.parse(m.toString());
          return p?.type === 'input_audio_buffer.append';
        } catch {
          return false;
        }
      });
      if (idx === -1) break;
      pendingMessages.splice(idx, 1);
      audioCount -= 1;
    }
  };

  const scheduleSessionReady = (startFlushingFn) => {
    if (sessionReadyForRequests) return;
    if (sessionReadyTimer) return;
    sessionReadyTimer = setTimeout(() => {
      sessionReadyTimer = null;
      if (targetWs.readyState !== WebSocket.OPEN) return;
      if (!sessionCreatedReceived || !sessionUpdateSent) return;
      sessionReadyForRequests = true;
      sessionReadyForAudio = true;
      console.log('Session ready for requests (timeout gate).');
      if (typeof startFlushingFn === 'function') startFlushingFn();
    }, 250);
  };

  let audioReceivedCount = 0;
  let audioReceivedChars = 0;
  let audioQueuedCount = 0;
  let lastAudioStatsAt = Date.now();

  const maybeLogAudioStats = () => {
    const now = Date.now();
    if (now - lastAudioStatsAt < 1000) return;
    const seconds = (now - lastAudioStatsAt) / 1000;
    const rate = Math.round(audioReceivedCount / seconds);
    const avgLen = audioReceivedCount > 0 ? Math.round(audioReceivedChars / audioReceivedCount) : 0;
    console.log(
      `Audio stats: recv=${audioReceivedCount} (${rate}/s) avgLen=${avgLen} queued=${audioQueuedCount} pending=${pendingMessages.length} flushing=${isFlushing} upstreamState=${targetWs.readyState}`
    );
    audioReceivedCount = 0;
    audioReceivedChars = 0;
    audioQueuedCount = 0;
    lastAudioStatsAt = now;
  };

  ws.on('message', (data) => {
    const msgStr = data.toString();
    let parsed;
    try {
      parsed = JSON.parse(msgStr);
    } catch {
      parsed = null;
    }

    if (parsed?.type === 'input_audio_buffer.append' && typeof parsed.audio === 'string') {
      audioReceivedCount += 1;
      audioReceivedChars += parsed.audio.length;
      maybeLogAudioStats();

      try {
        const decodedLen = Buffer.from(parsed.audio, 'base64').length;
        if (decodedLen % 2 !== 0) {
          console.warn(`Audio payload invalid: decodedLen=${decodedLen} not multiple of 2 (pcm16)`);
        }
        if (decodedLen === 0) {
          console.warn('Audio payload invalid: decodedLen=0');
        }
        if (decodedLen > 32000) {
          console.warn(`Audio payload unusually large: decodedLen=${decodedLen}`);
        }
      } catch {
        console.warn('Audio payload invalid: base64 decode failed');
      }
    } else {
      console.log('Client message received:', msgStr.substring(0, 140));
    }

    if (parsed?.type === 'input_audio_buffer.append') {
      if (!sessionCreatedReceived || !sessionUpdateSent || !sessionReadyForAudio) {
        console.log('Audio before session ready, queuing (sliding window)...');
        audioQueuedCount += 1;
        pendingMessages.push(data);
        trimPendingAudio(8);
        return;
      }
    }

    if (parsed && parsed.type && parsed.type !== 'session.update') {
      if (!sessionReadyForRequests) {
        console.log(`Message before session ready, queuing: ${parsed.type}`);
        pendingMessages.push(data);
        trimPendingAudio(8);
        if (pendingMessages.length > 64) pendingMessages.shift();
        return;
      }
    }
    
    if (targetWs.readyState === WebSocket.OPEN && !isFlushing) {
      targetWs.send(data);
    } else if (targetWs.readyState === WebSocket.CONNECTING || isFlushing) {
      console.log(`Target WS ${isFlushing ? 'flushing' : 'connecting'}, queuing message...`);
      if (parsed?.type === 'input_audio_buffer.append') {
        audioQueuedCount += 1;
      }
      pendingMessages.push(data);
    } else {
      console.warn('Target WS is closed, cannot send message');
    }
  });

  targetWs.on('open', async () => {
    console.log('Connected to DashScope');
    
    // Wait for the first message (session.created) before flushing
    // This helps avoid race conditions where session.update is sent before server is ready
    let firstMessageReceived = false;
    const onFirstMessage = () => {
      firstMessageReceived = true;
      targetWs.off('message', onFirstMessage);
    };
    targetWs.on('message', onFirstMessage);

    // Timeout after 2 seconds if no message received, just in case
    const timeout = setTimeout(() => {
      if (!firstMessageReceived) {
        console.warn('Timeout waiting for session.created, flushing anyway...');
        startFlushing();
      }
    }, 2000);

    const startFlushing = async () => {
        if (isFlushing) return;
        isFlushing = true;
        console.log(`Starting to flush ${pendingMessages.length} messages...`);
        while (pendingMessages.length > 0 && targetWs.readyState === WebSocket.OPEN) {
          const msg = pendingMessages.shift();
          const msgStr = msg.toString();
          let isAudio = false;
          try {
            const parsed = JSON.parse(msgStr);
            if (parsed.type === 'session.update') {
              console.log('--- Session Update to DashScope ---');
              console.log(JSON.stringify(parsed, null, 2));
              sessionUpdateSent = true;
              sessionUpdateSentAt = Date.now();
            } else if (parsed.type === 'input_audio_buffer.append') {
              isAudio = true;
              if (!sessionReadyForAudio || !sessionReadyForRequests) {
                continue;
              }
            } else {
              if (!sessionReadyForRequests) {
                pendingMessages.unshift(msg);
                break;
              }
              console.log('Flushing message:', parsed.type || msgStr.substring(0, 50));
            }
          } catch (e) {
            console.log('Flushing raw message');
          }
          targetWs.send(msg);
         
         // Only delay for configuration messages, not for audio stream
         if (!isAudio) {
           await new Promise(resolve => setTimeout(resolve, 20));
         }
       }
        isFlushing = false;
        console.log('Flushing completed.');
      };

    targetWs.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'session.created') {
          console.log('Received session.created from DashScope');
          sessionCreatedReceived = true;
          clearTimeout(timeout);

          if (!sessionUpdateSent) {
            sessionReadyForAudio = false;
          }

          startFlushing();

          scheduleSessionReady(startFlushing);
        }

        if (msg.type === 'session.updated') {
          sessionReadyForAudio = true;
          sessionReadyForRequests = true;
          console.log('Session ready for requests (session.updated).');
          startFlushing();
        }
      } catch (e) {}
    });
  });

  targetWs.on('message', (data) => {
    const messageStr = data.toString();
    try {
      const msg = JSON.parse(messageStr);
      if (msg.type !== 'audio' && msg.type !== 'input_audio_buffer.speech_started') {
        console.log('Message from DashScope:', JSON.stringify(msg, null, 2));
      }
      if (msg.type === 'error' || msg.type === 'error.response') {
        console.error('DashScope reported ERROR:', JSON.stringify(msg, null, 2));
      }
    } catch (e) {
      console.log('Non-JSON message from DashScope:', messageStr.substring(0, 100));
    }
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  });

  targetWs.on('error', (err) => {
    console.error('DashScope Error:', err.message);
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'error', message: `Upstream Error: ${err.message}` }));
      ws.close(1011, 'Upstream Error');
    }
  });

  targetWs.on('close', (code, reason) => {
    const reasonText = typeof reason === 'string' ? reason : reason?.toString?.() || '';
    console.log(`DashScope closed: ${code} ${reasonText}`);

    maybeLogAudioStats();

    if (code === 1011) {
      console.error('CRITICAL: DashScope encountered an Internal Server Error (1011).');
      console.error('This usually means the session.update parameters or audio data were invalid.');
    }

    if (ws.readyState === WebSocket.OPEN) {
      const validCode = (code >= 1000 && code <= 4999 && code !== 1005 && code !== 1006) ? code : 1000;
      ws.close(validCode, reasonText);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    if (targetWs.readyState === WebSocket.OPEN) {
      targetWs.close();
    }
  });

  ws.on('error', (err) => {
    console.error('Client Error:', err.message);
    if (targetWs.readyState === WebSocket.OPEN) {
      targetWs.close();
    }
  });
});
