// lib/xiaozhi/audioCapture.ts

// AudioWorklet processor code as a string to avoid external file dependencies
const workletCode = `
class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 2048;
    this.buffer = new Float32Array(this.bufferSize);
    this.bufferIndex = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (!input || !input.length) return true;
    
    const channel0 = input[0];

    let offset = 0;
    while (offset < channel0.length) {
      const remaining = this.bufferSize - this.bufferIndex;
      const copyCount = Math.min(remaining, channel0.length - offset);
      this.buffer.set(channel0.subarray(offset, offset + copyCount), this.bufferIndex);
      this.bufferIndex += copyCount;
      offset += copyCount;

      if (this.bufferIndex >= this.bufferSize) {
        this.port.postMessage(this.buffer);
        this.buffer = new Float32Array(this.bufferSize);
        this.bufferIndex = 0;
      }
    }
    
    return true;
  }
}

registerProcessor('audio-recorder-processor', AudioProcessor);
`;

export class AudioCapture {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private scriptProcessorNode: ScriptProcessorNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private sinkNode: GainNode | null = null;
  private isRecording: boolean = false;
  private onAudioData: (base64: string) => void;

  // Target sample rate for the model
  private readonly TARGET_SAMPLE_RATE = 24000; // Qwen recommended 16k or 24k, but 24k is standard for OpenAI protocol

  constructor(onAudioData: (base64: string) => void) {
    this.onAudioData = onAudioData;
  }

  async start() {
    if (this.isRecording) return;

    try {
      if (!window.isSecureContext) {
        throw new DOMException(
          `麦克风需要安全上下文（HTTPS 或 localhost）。当前：${window.location.origin}`,
          'NotAllowedError'
        );
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('getUserMedia is not supported in this browser');
      }

      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          // sampleRate: this.TARGET_SAMPLE_RATE, // Remove strict sampleRate to avoid OverconstrainedError
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      this.audioContext = new AudioContext({
        sampleRate: this.TARGET_SAMPLE_RATE, // Force context to 16k
      });

      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      
      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.sinkNode = this.audioContext.createGain();
      this.sinkNode.gain.value = 0;

      if (this.audioContext.audioWorklet && typeof AudioWorkletNode !== 'undefined') {
        try {
          await this.audioContext.audioWorklet.addModule('/audio-processor.js');
        } catch {
          const blob = new Blob([workletCode], { type: 'application/javascript' });
          const url = URL.createObjectURL(blob);
          await this.audioContext.audioWorklet.addModule(url);
        }

        this.workletNode = new AudioWorkletNode(this.audioContext, 'audio-recorder-processor');
        this.workletNode.port.onmessage = (event) => {
          if (!this.isRecording) return;
          const float32Array = event.data as Float32Array;
          const pcm16 = this.float32ToPCM16(float32Array);
          const base64 = this.arrayBufferToBase64(pcm16.buffer);
          this.onAudioData(base64);
        };

        this.sourceNode.connect(this.workletNode);
        this.workletNode.connect(this.sinkNode);
        this.sinkNode.connect(this.audioContext.destination);
      } else {
        this.scriptProcessorNode = this.audioContext.createScriptProcessor(4096, 1, 1);
        this.scriptProcessorNode.onaudioprocess = (event) => {
          if (!this.isRecording) return;
          const float32Array = event.inputBuffer.getChannelData(0);
          const pcm16 = this.float32ToPCM16(float32Array);
          const base64 = this.arrayBufferToBase64(pcm16.buffer);
          this.onAudioData(base64);
        };
        this.sourceNode.connect(this.scriptProcessorNode);
        this.scriptProcessorNode.connect(this.sinkNode);
        this.sinkNode.connect(this.audioContext.destination);
      }
      
      this.isRecording = true;
      console.log('Audio capture started');

    } catch (error) {
      console.error('Failed to start audio capture:', error);
      throw error;
    }
  }

  stop() {
    this.isRecording = false;
    
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    
    if (this.workletNode) {
      this.workletNode.disconnect();
      this.workletNode = null;
    }

    if (this.sinkNode) {
      this.sinkNode.disconnect();
      this.sinkNode = null;
    }

    if (this.scriptProcessorNode) {
      this.scriptProcessorNode.disconnect();
      this.scriptProcessorNode.onaudioprocess = null;
      this.scriptProcessorNode = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    console.log('Audio capture stopped');
  }

  // Helper: Convert Float32 [-1, 1] to Int16 [-32768, 32767]
  private float32ToPCM16(float32: Float32Array): Int16Array {
    const int16 = new Int16Array(float32.length);
    for (let i = 0; i < float32.length; i++) {
      const s = Math.max(-1, Math.min(1, float32[i]));
      int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return int16;
  }

  private arrayBufferToBase64(buffer: ArrayBufferLike): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }
}
