// audio-processor.js - WebAudio worklet for real-time audio processing
class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    // Buffer configuration for 16kHz mono audio (Gemini's preferred format)
    this.bufferSize = 4096; // Collect ~250ms of audio at 16kHz
    this.sampleRate = 16000;
    this.buffer = new Float32Array(this.bufferSize);
    this.bufferIndex = 0;
    this.downsampleFactor = sampleRate / this.sampleRate;
    
    // Define minimum energy threshold for speech detection
    this.energyThreshold = 0.01;
    this.silenceFrames = 0;
    this.speechDetected = false;
    
    console.log(`Audio processor initialized with sample rate: ${sampleRate}Hz, downsampling to ${this.sampleRate}Hz`);
  }
  
  process(inputs, outputs) {
    // Get the input audio
    const input = inputs[0];
    if (!input || !input.length) return true;
    
    const samples = input[0];
    if (!samples) return true;
    
    // Check if speech is present using energy detection
    const energy = this.calculateEnergy(samples);
    
    if (energy > this.energyThreshold) {
      this.silenceFrames = 0;
      if (!this.speechDetected) {
        this.speechDetected = true;
        // Signal speech started
        this.port.postMessage({ type: 'speech_start' });
      }
    } else {
      this.silenceFrames++;
      if (this.speechDetected && this.silenceFrames > 10) { // ~200ms of silence
        this.speechDetected = false;
        // Signal speech ended
        this.port.postMessage({ type: 'speech_end' });
      }
    }
    
    // Downsample and add to buffer
    for (let i = 0; i < samples.length; i += this.downsampleFactor) {
      this.buffer[this.bufferIndex++] = samples[Math.floor(i)];
      
      // If buffer is full, send it
      if (this.bufferIndex >= this.bufferSize) {
        // Convert to Int16 for better compatibility with STT APIs
        const int16Buffer = new Int16Array(this.bufferSize);
        for (let j = 0; j < this.bufferSize; j++) {
          int16Buffer[j] = Math.max(-32768, Math.min(32767, this.buffer[j] * 32768));
        }
        
        // Send buffer to main thread
        this.port.postMessage({
          type: 'audio_data',
          buffer: int16Buffer,
          energy: energy,
          speechDetected: this.speechDetected
        });
        
        // Reset buffer index
        this.bufferIndex = 0;
      }
    }
    
    // Continue processing
    return true;
  }
  
  calculateEnergy(samples) {
    let sum = 0;
    for (let i = 0; i < samples.length; i++) {
      sum += samples[i] * samples[i];
    }
    return sum / samples.length;
  }
}

registerProcessor('audio-processor', AudioProcessor);
