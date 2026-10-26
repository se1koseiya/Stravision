import { toast } from "@/lib/ui/feedback";

export interface FastRTCClientOptions {
  onStatusChange: (status: 'idle' | 'connecting' | 'listening' | 'processing' | 'speaking') => void;
  onTextDelta?: (text: string) => void;
  onAudioDelta?: (audioBase64: string) => void;
  onError: (error: string) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
  url?: string;
}

export class FastRTCClient {
  private peerConnection: RTCPeerConnection | null = null;
  private mediaStream: MediaStream | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private options: FastRTCClientOptions;
  private audioContext: AudioContext | null = null;
  private serverUrl: string;
  private status: 'idle' | 'connecting' | 'listening' | 'processing' | 'speaking' = 'idle';

  constructor(options: FastRTCClientOptions) {
    this.options = options;
    // Default to localhost:8000 if not provided
    this.serverUrl = options.url || 'http://localhost:8000'; 
  }

  private setStatus(status: typeof this.status) {
    this.status = status;
    this.options.onStatusChange(status);
  }

  async connect() {
    if (this.status !== 'idle') return;
    
    try {
      this.setStatus('connecting');
      console.log("[FastRTC] Connecting...");

      // 1. Get User Media
      try {
        this.mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          }
        });
      } catch (err: any) {
        console.error("Microphone error:", err);
        throw new Error("无法访问麦克风");
      }

      // 2. Create Peer Connection
      this.peerConnection = new RTCPeerConnection();

      // 3. Add Tracks
      this.mediaStream.getTracks().forEach(track => {
        if (this.peerConnection) {
          this.peerConnection.addTrack(track, this.mediaStream!);
        }
      });

      // 4. Handle Incoming Tracks (Audio from Server)
      this.peerConnection.ontrack = (event) => {
        console.log("[FastRTC] Received remote track");
        const remoteStream = event.streams[0];
        const audio = new Audio();
        audio.srcObject = remoteStream;
        audio.play().catch(e => console.error("Audio play error:", e));
        this.setStatus('speaking'); // Assuming if we receive audio, server is speaking
        
        // Detect silence/end of speech if needed? 
        // For now fastrtc sends audio continuously or chunks.
        // Actually fastrtc might use VAD on server and send audio back.
        // We might want to switch status back to listening when audio ends.
      };

      // 5. Data Channel
      this.dataChannel = this.peerConnection.createDataChannel('text');
      this.dataChannel.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          console.log("[FastRTC] Data message:", msg);
          if (msg.type === 'text' && this.options.onTextDelta) {
            this.options.onTextDelta(msg.data);
          }
        } catch (e) {
          console.log("[FastRTC] Raw message:", event.data);
        }
      };

      // 6. Create Offer
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);

      // 7. Send Offer to Server
      const response = await fetch(`${this.serverUrl}/webrtc/offer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sdp: offer.sdp,
          type: offer.type,
          webrtc_id: Math.random().toString(36).substring(7)
        })
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const answer = await response.json();
      await this.peerConnection.setRemoteDescription(answer);

      console.log("[FastRTC] Connected!");
      this.setStatus('listening');
      if (this.options.onConnected) this.options.onConnected();

    } catch (error: any) {
      console.error("[FastRTC] Connection failed:", error);
      this.setStatus('idle');
      this.options.onError(error.message || "连接失败");
      this.disconnect();
    }
  }

  async disconnect() {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }
    this.setStatus('idle');
    if (this.options.onDisconnected) this.options.onDisconnected();
  }

  startListening() {
    // With WebRTC and VAD on server, "startListening" essentially means "connect and send audio"
    if (this.status === 'idle') {
      this.connect();
    } else {
        // Resume if muted?
        if (this.mediaStream) {
            this.mediaStream.getAudioTracks().forEach(t => t.enabled = true);
            this.setStatus('listening');
        }
    }
  }

  stop() {
    this.disconnect();
  }

  interrupt() {
    // Stop server playback? 
    // In WebRTC we might just ignore incoming audio or signal server.
    // fastrtc doesn't seem to have explicit interrupt signal in simple mode.
    // We can simulate by re-connecting or sending a message.
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
        this.dataChannel.send(JSON.stringify({ type: "interrupt" }));
    }
  }

  sendText(text: string) {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      this.dataChannel.send(JSON.stringify({ type: "text", data: text }));
    }
  }
}
