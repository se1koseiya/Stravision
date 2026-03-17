class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 4096; // Accumulate chunks
    this.buffer = new Float32Array(this.bufferSize);
    this.bufferIndex = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (!input || !input.length) return true;
    
    const channel0 = input[0];
    
    // Check if we have data
    if (channel0.length > 0) {
        this.port.postMessage(channel0);
    }
    
    return true;
  }
}

registerProcessor('audio-recorder-processor', AudioProcessor);
