/**
 * DashScope Qwen-Omni HTTP Client (OpenAI-Compatible)
 * 
 * Uses the OpenAI-compatible HTTP API for audio streaming
 * This is more stable than the WebSocket API
 */

import OpenAI from 'openai';

export type XiaozhiStatus = 'idle' | 'connecting' | 'listening' | 'processing' | 'speaking' | 'error';

export interface RealtimeClientHTTPOptions {
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

export class RealtimeClientHTTP {
  private openai: OpenAI;
  private status: XiaozhiStatus = 'idle';
  private options: RealtimeClientHTTPOptions;
  private config: SessionConfig;
  private audioContext: AudioContext | null = null;
  private nextStartTime: number = 0;
  private readonly OUTPUT_SAMPLE_RATE = 24000;
  private abortController: AbortController | null = null;

  constructor(options: RealtimeClientHTTPOptions, config: SessionConfig = {}) {
    this.options = options;
    this.config = {
      voice: config.voice || 'Cherry',
      instructions: config.instructions || '你是莓小智，一个专业、友好的AI语音助手。用中文简洁回答问题。',
      model: config.model || 'qwen3-omni-flash',
    };

    this.openai = new OpenAI({
      apiKey: process.env.NEXT_PUBLIC_DASHSCOPE_API_KEY || '',
      baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      dangerouslyAllowBrowser: true,
    });
  }

  private setStatus(status: XiaozhiStatus) {
    this.status = status;
    this.options.onStatusChange(status);
  }

  async sendMessage(text: string): Promise<void> {
    if (this.abortController) {
      this.abortController.abort();
    }

    this.abortController = new AbortController();
    this.setStatus('processing');
    this.initAudioContext();

    try {
      const completion = await this.openai.chat.completions.create({
        model: this.config.model!,
        messages: [
          { role: 'system', content: this.config.instructions! },
          { role: 'user', content: text }
        ],
        stream: true,
        stream_options: {
          include_usage: true,
        },
        modalities: ['text', 'audio'],
        audio: { 
          voice: this.config.voice as any, 
          format: 'pcm16' 
        },
      }, {
        signal: this.abortController.signal,
      });

      this.setStatus('speaking');

      for await (const chunk of completion) {
        if (Array.isArray(chunk.choices) && chunk.choices.length > 0) {
          const delta = chunk.choices[0].delta;
          
          // Handle text delta
          if (delta.content) {
            this.options.onTextDelta(delta.content);
          }

          // Handle audio delta
          if (delta.audio?.data) {
            this.options.onAudioDelta(delta.audio.data);
            this.playAudioDelta(delta.audio.data);
          }

          // Handle transcript
          if (delta.audio?.transcript) {
            this.options.onTranscript?.(delta.audio.transcript, false);
          }
        }
      }

      this.setStatus('idle');
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('[RealtimeClientHTTP] Request aborted');
      } else {
        console.error('[RealtimeClientHTTP] Error:', error);
        this.options.onError(error.message || 'Request failed');
        this.setStatus('error');
      }
    }
  }

  stop(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.clearAudioQueue();
    this.setStatus('idle');
  }

  disconnect(): void {
    this.stop();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

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

    try {
      // Decode base64 to array buffer
      const binaryString = window.atob(base64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // PCM16 to Float32
      const sampleCount = Math.floor(bytes.length / 2);
      const float32 = new Float32Array(sampleCount);
      const dataView = new DataView(bytes.buffer);
      
      for (let i = 0; i < sampleCount; i++) {
        const int16 = dataView.getInt16(i * 2, true); // little-endian
        float32[i] = int16 / 32768.0;
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
    } catch (error) {
      console.error('[RealtimeClientHTTP] Audio playback error:', error);
    }
  }

  get currentStatus(): XiaozhiStatus {
    return this.status;
  }

  get isConnected(): boolean {
    return this.status !== 'idle' && this.status !== 'error';
  }
}
