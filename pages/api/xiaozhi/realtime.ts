import WebSocket, { WebSocketServer } from 'ws';
import type { NextApiRequest, NextApiResponse } from 'next';
import { IncomingMessage } from 'http';
import { Duplex } from 'stream';
import { verifyToken } from '@/lib/token';
import { getUserAiQuota, incrementAiUsage } from '@/lib/db/ai-quota-service';
import { initDB } from '@/lib/db/database';

// Extend the NextApiRequest type to include the socket
interface ExtendedRequest extends NextApiRequest {
  socket: any;
}

const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY || process.env.SYSTEM_OPENAI_API_KEY;

export default async function handler(req: ExtendedRequest, res: NextApiResponse) {
  if (!DASHSCOPE_API_KEY) {
    console.error('Missing DASHSCOPE_API_KEY');
    res.status(500).json({ error: 'Server configuration error' });
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).end();
    return;
  }

  // Check if we are trying to upgrade to WebSocket
  if (req.headers.upgrade !== 'websocket') {
    // Diagnostic mode for normal GET requests
    try {
      const token = req.cookies['auth'];
      let authStatus = 'Missing Token';
      let user = null;
      if (token) {
        const payload = await verifyToken(token);
        if (payload) {
            authStatus = 'Authenticated';
            user = payload;
        } else {
            authStatus = 'Invalid Token';
        }
      }
      
      res.status(200).json({ 
        status: 'OK', 
        message: 'Realtime API is ready. Please use WebSocket to connect.',
        diagnostics: {
            auth: authStatus,
            userId: user?.id,
            hasApiKey: !!DASHSCOPE_API_KEY,
            model: req.query.model || 'default'
        }
      });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
    return;
  }

  // --- Auth & Quota Check ---
  try {
    // Initialize DB to ensure we can check quota
    await initDB();

    const token = req.cookies['auth'];
    
    // In development mode, allow unauthenticated access for testing
    const isDev = process.env.NODE_ENV === 'development';
    const skipAuth = isDev && process.env.SKIP_VOICE_AUTH === 'true';
    
    let userId = 1; // Default user ID for dev mode
    
    if (!skipAuth) {
      if (!token) {
        console.log('WS Connection rejected: No auth token');
        res.status(401).send('Unauthorized - Please login first');
        return;
      }

      const payload = await verifyToken(token);
      if (!payload || !payload.id) {
        console.log('WS Connection rejected: Invalid token');
        res.status(401).send('Invalid Token');
        return;
      }

      userId = Number(payload.id);
    }
    
    const quota = await getUserAiQuota(userId);

    if (!quota.can_use) {
      const reason = quota.reason === 'membership_required'
        ? 'AI 功能仅限 Pro/Plus 会员使用'
        : '配额已用完';
      console.log(`WS Connection rejected: ${reason} for user ${userId}`);
      res.status(403).send(reason);
      return;
    }

    // --- Upgrade Logic ---
    const wss = new WebSocketServer({ noServer: true });

    wss.handleUpgrade(req, req.socket, Buffer.alloc(0), async (clientWs) => {
      console.log(`Client connected to local proxy (User: ${userId})`);

      // Deduct initial quota (1 point for connection)
      const initialSuccess = await incrementAiUsage(userId);
      if (!initialSuccess) {
        clientWs.close(1008, 'Quota Exceeded');
        return;
      }

      // Setup interval to deduct quota every minute while connected
      const quotaInterval = setInterval(() => {
        void (async () => {
          const success = await incrementAiUsage(userId);
          if (!success) {
            console.log(`User ${userId} quota ran out during session`);
            clientWs.send(JSON.stringify({ type: 'error', message: 'Quota Exceeded' }));
            clientWs.close(1008, 'Quota Exceeded');
            clearInterval(quotaInterval);
          }
        })();
      }, 60 * 1000);

      const rawModel = Array.isArray(req.query.model) ? req.query.model[0] : req.query.model;
      const model = rawModel && rawModel !== 'default' ? rawModel : 'qwen3-omni-flash';
      const dashScopeUrl = `wss://dashscope.aliyuncs.com/api-ws/v1/realtime?model=${encodeURIComponent(model)}`;

      console.log(`Connecting to DashScope: ${dashScopeUrl}`);

      const targetWs = new WebSocket(dashScopeUrl, {
        headers: {
          Authorization: `Bearer ${DASHSCOPE_API_KEY}`,
          'X-DashScope-DataInspection': 'enable',
        },
      });

      let isFlushing = false;
      const pendingClientMessages: WebSocket.RawData[] = [];

      let sessionCreatedReceived = false;
      let sessionUpdateSent = false;
      let sessionReadyForAudio = false;
      let sessionReadyForRequests = false;
      let sessionReadyTimer: NodeJS.Timeout | null = null;

      const scheduleSessionReady = () => {
        if (sessionReadyForRequests) return;
        if (sessionReadyTimer) return;
        sessionReadyTimer = setTimeout(() => {
          sessionReadyTimer = null;
          if (targetWs.readyState !== WebSocket.OPEN) return;
          if (!sessionCreatedReceived || !sessionUpdateSent) return;
          sessionReadyForRequests = true;
          sessionReadyForAudio = true;
          flushPending();
        }, 250);
      };

      const flushPending = async () => {
        if (targetWs.readyState !== WebSocket.OPEN) return;
        isFlushing = true;
        console.log(`Flushing ${pendingClientMessages.length} pending messages to DashScope`);
        while (pendingClientMessages.length > 0 && targetWs.readyState === WebSocket.OPEN) {
          const msg = pendingClientMessages.shift();
          if (msg) {
            try {
              const parsed = JSON.parse(msg.toString());
              if (parsed?.type === 'session.update') {
                sessionUpdateSent = true;
              }
              if (parsed?.type === 'input_audio_buffer.append' && !sessionReadyForAudio) continue;
              if (parsed?.type && parsed.type !== 'session.update' && !sessionReadyForRequests) {
                pendingClientMessages.unshift(msg);
                break;
              }
            } catch {
              // ignore
            }
            targetWs.send(msg);
            await new Promise(resolve => setTimeout(resolve, 10));
          }
        }
        isFlushing = false;
      };

      targetWs.on('open', () => {
        console.log('Connected to DashScope');
        flushPending();
      });

      targetWs.on('message', (data) => {
        const msgStr = data.toString();
        try {
          const msg = JSON.parse(msgStr);
          if (msg.type === 'session.created') {
            sessionCreatedReceived = true;
            if (!sessionUpdateSent) sessionReadyForAudio = false;
            scheduleSessionReady();
          }
          if (msg.type === 'session.updated') {
            sessionReadyForAudio = true;
            sessionReadyForRequests = true;
            flushPending();
          }
          if (msg.type !== 'audio' && msg.type !== 'input_audio_buffer.speech_started') {
            console.log('Message from DashScope:', JSON.stringify(msg, null, 2));
          }
        } catch (e) {
          // Ignore
        }
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.send(data);
        }
      });

      targetWs.on('error', (err) => {
        console.error('DashScope WS Error:', err);
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.send(
            JSON.stringify({
              type: 'error',
              message: `Upstream Error: ${err.message || 'Unknown DashScope Error'}`,
            })
          );
          clientWs.close(1011, 'Upstream Error');
        }
      });

      targetWs.on('close', (code, reason) => {
        console.log(`DashScope disconnected: ${code} ${reason.toString()}`);
        if (clientWs.readyState === WebSocket.OPEN) {
          const closeCode = code >= 1000 && code <= 4999 && code !== 1005 && code !== 1006 ? code : 1000;
          clientWs.close(closeCode, reason.toString());
        }
      });

      clientWs.on('message', (data) => {
        try {
          const parsed = JSON.parse(data.toString());
          if (parsed?.type === 'input_audio_buffer.append') {
            if (!sessionCreatedReceived || !sessionUpdateSent || !sessionReadyForAudio || !sessionReadyForRequests) {
              pendingClientMessages.push(data);
              while (pendingClientMessages.length > 8) pendingClientMessages.shift();
              return;
            }
          } else if (parsed?.type && parsed.type !== 'session.update') {
            if (!sessionReadyForRequests) {
              pendingClientMessages.push(data);
              while (pendingClientMessages.length > 64) pendingClientMessages.shift();
              return;
            }
          }
        } catch {
          // ignore
        }

        if (targetWs.readyState === WebSocket.OPEN && !isFlushing) {
          targetWs.send(data);
          return;
        }

        if (targetWs.readyState === WebSocket.CONNECTING || isFlushing) {
          pendingClientMessages.push(data);
        }
      });

      clientWs.on('close', () => {
        console.log('Client disconnected');
        clearInterval(quotaInterval);
        if (targetWs.readyState === WebSocket.OPEN || targetWs.readyState === WebSocket.CONNECTING) {
          targetWs.close();
        }
      });

      clientWs.on('error', (err) => {
        console.error('Client WS Error:', err);
        clearInterval(quotaInterval);
        if (targetWs.readyState === WebSocket.OPEN || targetWs.readyState === WebSocket.CONNECTING) {
          targetWs.close();
        }
      });
    });

  } catch (error: any) {
    console.error('WS Handler Error Details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).send(`Internal Server Error: ${error.message}`);
  }
}

export const config = {
  api: {
    bodyParser: false, // Disable body parsing for WebSocket upgrades
  },
};
