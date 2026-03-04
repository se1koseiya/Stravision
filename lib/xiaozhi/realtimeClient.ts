/**
 * DashScope Realtime Client
 * 
 * Implements the DashScope Qwen-Omni-Realtime WebSocket API for real-time
 * voice interaction with AI models.
 * 
 * Features:
 * - Server-side VAD (Voice Activity Detection)
 * - PCM16 audio input, PCM24 audio output
 * - Real-time transcription
 * - Multiple voice options
 * 
 * @see https://help.aliyun.com/zh/model-studio/realtime
 */

import { AudioCapture } from './audioCapture';

export type XiaozhiStatus = 'idle' | 'connecting' | 'listening' | 'processing' | 'speaking' | 'error';

export interface RealtimeClientOptions {
  onStatusChange: (status: XiaozhiStatus) => void;
  onTextDelta: (text: string) => void;
  onAudioDelta: (audioBase64: string) => void;
  onError: (error: string) => void;
  onTranscript?: (text: string, isUser: boolean) => void;
}

export interface SessionConfig {
  voice?: string;
  instructions?: string;
  model?: string;
}

// Available voices for qwen3-omni-flash-realtime
export const AVAILABLE_VOICES = [
  { id: 'Cherry', name: '芊悦', description: '阳光积极、亲切自然小姐姐' },
  { id: 'Serena', name: '苏瑶', description: '温柔小姐姐' },
  { id: 'Ethan', name: '晨煦', description: '阳光、温暖、活力男声' },
  { id: 'Chelsie', name: '千雪', description: '二次元虚拟女友' },
  { id: 'Momo', name: '茉兔', description: '撒娇搞怪' },
  { id: 'Vivian', name: '十三', description: '拽拽的、可爱的小暴躁' },
  { id: 'Moon', name: '月白', description: '率性帅气' },
  { id: 'Maia', name: '四月', description: '知性与温柔' },
  { id: 'Kai', name: '凯', description: '耳朵的一场SPA' },
  { id: 'Nofish', name: '不吃鱼', description: '不会翘舌音的设计师' },
] as const;

export class RealtimeClient {
  private ws: WebSocket | null = null;
  private audioCapture: AudioCapture;
  private status: XiaozhiStatus = 'idle';
  private options: RealtimeClientOptions;
  private config: SessionConfig;
  
  // Audio Playback
  private audioContext: AudioContext | null = null;
  private nextStartTime: number = 0;
  private readonly OUTPUT_SAMPLE_RATE = 24000;
  
  // Session state
  private sessionCreated = false;
  private sessionUpdated = false;

  constructor(options: RealtimeClientOptions, config: SessionConfig = {}) {
    this.options = options;
    this.config = {
      voice: config.voice || 'Cherry',
      instructions: config.instructions || '你是莓小智，一个专业、友好的AI语音助手。用中文简洁回答问题。重要：当你需要输出JSON命令时，请将JSON放在回复末尾，但在语音朗读时完全跳过JSON部分，只朗读自然语言描述。绝不要朗读任何包含大括号、引号、冒号等JSON符号的内容。',
      model: config.model || 'qwen3-omni-flash-realtime',
    };
    this.audioCapture = new AudioCapture(this.handleMicData.bind(this));
  }

  private setStatus(status: XiaozhiStatus) {
    this.status = status;
    this.options.onStatusChange(status);
  }

  private createEventId(): string {
    return `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
  }

  /**
   * Connect to the DashScope Realtime API via WebSocket proxy
   */
  async connect(): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return;

    this.setStatus('connecting');
    this.sessionCreated = false;
    this.sessionUpdated = false;

    // Build WebSocket URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const model = this.config.model || 'qwen3-omni-flash-realtime';
    
    let wsUrl: string;
    const explicitProxy = process.env.NEXT_PUBLIC_XIAOZHI_WS_PROXY?.trim();
    
    if (explicitProxy) {
      wsUrl = `${explicitProxy}?model=${encodeURIComponent(model)}`;
    } else {
      // Always use Next.js API route (works for both dev and prod)
      wsUrl = `${protocol}//${host}/api/xiaozhi/realtime?model=${encodeURIComponent(model)}`;
    }

    console.log('[RealtimeClient] Connecting to:', wsUrl);

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[RealtimeClient] Connected');
        this.initSession();
        resolve();
      };

      this.ws.onmessage = async (event) => {
        try {
          let data = event.data;
          if (data instanceof Blob) {
            data = await data.text();
          }
          const json = JSON.parse(data);
          this.handleServerEvent(json);
        } catch (e) {
          console.error('[RealtimeClient] Parse error:', e);
        }
      };

      this.ws.onclose = (event) => {
        console.log('[RealtimeClient] Disconnected:', event.code, event.reason);
        this.setStatus('idle');
        this.stop();
      };

      this.ws.onerror = (e) => {
        console.error('[RealtimeClient] WebSocket error:', e);
        this.options.onError('连接失败');
        if (this.status === 'connecting') {
          reject(new Error('WebSocket connection failed'));
        }
      };
    });
  }

  /**
   * Initialize session with DashScope
   */
  private initSession() {
    if (!this.ws) return;
    
    console.log('[RealtimeClient] Initializing session');
    
    const sessionUpdate = {
      event_id: this.createEventId(),
      type: "session.update",
      session: {
        modalities: ["text", "audio"],
        voice: this.config.voice,
        input_audio_format: "pcm16",
        output_audio_format: "pcm24",
        instructions: this.config.instructions,
        turn_detection: {
          type: "server_vad",
          threshold: 0.5,
          silence_duration_ms: 800
        },
        input_audio_transcription: {
          model: "gummy-realtime-v1"
        }
      }
    };

    this.ws.send(JSON.stringify(sessionUpdate));
  }

  /**
   * Handle events from DashScope server
   */
  private handleServerEvent(event: any) {
    const eventType = event.type;
    
    // Log non-audio events for debugging
    if (eventType !== 'response.audio.delta') {
      console.log('[RealtimeClient] Event:', eventType);
    }
    
    switch (eventType) {
      case 'session.created':
        console.log('[RealtimeClient] Session created:', event.session?.id);
        this.sessionCreated = true;
        break;
        
      case 'session.updated':
        console.log('[RealtimeClient] Session updated');
        this.sessionUpdated = true;
        this.setStatus('listening');
        break;
        
      case 'input_audio_buffer.speech_started':
        console.log('[RealtimeClient] User started speaking');
        this.setStatus('listening');
        this.clearAudioQueue();
        break;
        
      case 'input_audio_buffer.speech_stopped':
        console.log('[RealtimeClient] User stopped speaking');
        break;
        
      case 'input_audio_buffer.committed':
        console.log('[RealtimeClient] Audio buffer committed');
        break;
        
      case 'conversation.item.input_audio_transcription.completed':
        if (event.transcript) {
          console.log('[RealtimeClient] User transcript:', event.transcript);
          this.options.onTranscript?.(event.transcript, true);
        }
        break;
        
      case 'response.created':
        console.log('[RealtimeClient] Response created');
        this.setStatus('processing');
        break;
        
      case 'response.text.delta':
        if (event.delta) {
          this.options.onTextDelta(event.delta);
        }
        break;
        
      case 'response.audio_transcript.delta':
        if (event.delta) {
          this.options.onTextDelta(event.delta);
        }
        break;
        
      case 'response.audio_transcript.done':
        if (event.transcript) {
          console.log('[RealtimeClient] AI transcript:', event.transcript);
          this.options.onTranscript?.(event.transcript, false);
        }
        break;
        
      case 'response.audio.delta':
        if (event.delta) {
          this.options.onAudioDelta(event.delta);
          this.playAudioDelta(event.delta);
          this.setStatus('speaking');
        }
        break;
        
      case 'response.audio.done':
        console.log('[RealtimeClient] Audio response complete');
        break;
        
      case 'response.done':
        console.log('[RealtimeClient] Response complete');
        this.setStatus('listening');
        // Clear input buffer for next turn
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ type: "input_audio_buffer.clear" }));
        }
        break;
        
      case 'error':
        console.error('[RealtimeClient] Server error:', event);
        this.options.onError(event?.error?.message || event?.message || 'Unknown error');
        break;
    }
  }

  /**
   * Start listening for voice input
   */
  async startListening(): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      try {
        await this.connect();
      } catch (e) {
        this.options.onError('连接失败');
        return;
      }
    }
    
    this.setStatus('listening');
    this.initAudioContext();
    
    try {
      await this.audioCapture.start();
    } catch (err: any) {
      console.error('[RealtimeClient] Audio capture error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        this.options.onError(`麦克风权限被拒绝: ${err.message}`);
      } else {
        this.options.onError(`麦克风错误: ${err.message}`);
      }
      this.setStatus('idle');
    }
  }

  /**
   * Stop listening
   */
  stop(): void {
    this.audioCapture.stop();
    this.setStatus('idle');
  }

  /**
   * Interrupt current response
   */
  interrupt(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "response.cancel" }));
      this.ws.send(JSON.stringify({ type: "input_audio_buffer.clear" }));
    }
    this.clearAudioQueue();
    this.setStatus('listening');
  }

  /**
   * Disconnect from server
   */
  disconnect(): void {
    this.stop();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  /**
   * Handle microphone data
   */
  private handleMicData(base64: string): void {
    if (this.status !== 'listening' && this.status !== 'speaking') return;
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    if (!this.sessionCreated || !this.sessionUpdated) return;

    const event = {
      event_id: this.createEventId(),
      type: "input_audio_buffer.append",
      audio: base64
    };
    
    this.ws.send(JSON.stringify(event));
  }

  /**
   * Send text message (for text input mode)
   */
  sendText(text: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    
    // Create conversation item with text
    const createEvent = {
      event_id: this.createEventId(),
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [
          { type: "input_text", text: text }
        ]
      }
    };
    this.ws.send(JSON.stringify(createEvent));
    
    // Request response
    const responseEvent = {
      event_id: this.createEventId(),
      type: "response.create"
    };
    this.ws.send(JSON.stringify(responseEvent));
  }

  // --- Audio Playback ---

  private initAudioContext(): void {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: this.OUTPUT_SAMPLE_RATE
      });
    }

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => {});
    }
  }

  private clearAudioQueue(): void {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
      this.nextStartTime = 0;
      this.initAudioContext();
    }
  }

  private playAudioDelta(base64: string): void {
    if (!this.audioContext) this.initAudioContext();
    if (!this.audioContext) return;

    // Decode base64 to array buffer
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // PCM24 (little-endian, 3 bytes per sample) to Float32
    const sampleCount = Math.floor(bytes.length / 3);
    const float32 = new Float32Array(sampleCount);
    for (let i = 0; i < sampleCount; i++) {
      const j = i * 3;
      const b0 = bytes[j];
      const b1 = bytes[j + 1];
      const b2 = bytes[j + 2];

      let int24 = (b0 | (b1 << 8) | (b2 << 16));
      if (int24 & 0x800000) int24 |= 0xff000000;
      float32[i] = int24 / 8388608;
    }

    // Schedule playback
    const buffer = this.audioContext.createBuffer(1, float32.length, this.OUTPUT_SAMPLE_RATE);
    buffer.getChannelData(0).set(float32);

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.audioContext.destination);

    const currentTime = this.audioContext.currentTime;
    if (this.nextStartTime < currentTime) {
      this.nextStartTime = currentTime;
    }
    
    source.start(this.nextStartTime);
    this.nextStartTime += buffer.duration;
  }

  // --- Getters ---

  get currentStatus(): XiaozhiStatus {
    return this.status;
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}
