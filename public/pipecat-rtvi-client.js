/**
 * Pipecat RTVI Client Custom Implementation
 * 
 * This is a simplified implementation of the Pipecat RTVI client
 * that interfaces directly with the Gemini API for real-time speech-to-speech.
 */

(function(window) {
  // Main client class for RTVI interactions
  class PipecatClient {
    constructor(config) {
      this.config = config || {};
      this.transport = config.transport || null;
      this.enableMic = config.enableMic !== false;
      this.enableCam = config.enableCam !== false;
      this.enableScreenShare = config.enableScreenShare || false;
      this.timeout = config.timeout || 30000;
      
      this.eventHandlers = {};
      this.connected = false;
      this.helpers = {};
      
      console.log('PipecatClient initialized with config:', this.config);
    }
    
    // Register event handlers
    on(eventName, callback) {
      if (!this.eventHandlers[eventName]) {
        this.eventHandlers[eventName] = [];
      }
      this.eventHandlers[eventName].push(callback);
      return this;
    }
    
    // Trigger events
    emit(eventName, data) {
      if (this.eventHandlers[eventName]) {
        this.eventHandlers[eventName].forEach(handler => {
          try {
            handler(data);
          } catch (error) {
            console.error(`Error in ${eventName} handler:`, error);
          }
        });
      }
      return this;
    }
    
    // Connect to the RTVI service
    async connect() {
      if (this.connected) {
        return;
      }
      
      try {
        this.emit('transport:stateChange', 'connecting');
        
        if (this.transport) {
          await this.transport.connect();
        }
        
        // Get user media if needed
        if (this.enableMic || this.enableCam) {
          await this.setupMediaDevices();
        }
        
        this.connected = true;
        this.emit('transport:stateChange', 'connected');
        this.emit('client:ready', {});
      } catch (error) {
        console.error('Failed to connect:', error);
        this.emit('transport:error', { message: error.message || 'Connection failed' });
        throw error;
      }
    }
    
    // Disconnect from the RTVI service
    async disconnect() {
      if (!this.connected) {
        return;
      }
      
      try {
        if (this.transport) {
          await this.transport.disconnect();
        }
        
        this.connected = false;
        this.emit('transport:stateChange', 'disconnected');
      } catch (error) {
        console.error('Failed to disconnect:', error);
        throw error;
      }
    }
    
    // Set up media devices
    async setupMediaDevices() {
      try {
        const constraints = {
          audio: this.enableMic,
          video: this.enableCam
        };
        
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        
        if (this.transport) {
          this.transport.setUserMedia(stream);
        }
        
        // Set up audio processing for level detection
        if (this.enableMic) {
          this.setupAudioLevelDetection(stream);
        }
      } catch (error) {
        console.error('Failed to access media devices:', error);
        this.emit('transport:error', { message: 'Failed to access media devices: ' + error.message });
        throw error;
      }
    }
    
    // Set up audio level detection
    setupAudioLevelDetection(stream) {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      
      microphone.connect(analyser);
      analyser.fftSize = 256;
      
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      const detectLevel = () => {
        if (!this.connected) return;
        
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        
        const average = sum / bufferLength / 255;
        this.emit('audio:level', average);
        
        requestAnimationFrame(detectLevel);
      };
      
      detectLevel();
    }
    
    // Mute microphone
    async muteMic() {
      if (this.transport) {
        await this.transport.muteMic();
        this.emit('audio:muted', {});
      }
    }
    
    // Unmute microphone
    async unmuteMic() {
      if (this.transport) {
        await this.transport.unmuteMic();
        this.emit('audio:unmuted', {});
      }
    }
    
    // Register a helper
    registerHelper(name, helper) {
      this.helpers[name] = helper;
      helper.setClient(this);
      return this;
    }
  }
  
  // Helper class for LLM interactions
  class LLMHelper {
    constructor(config) {
      this.config = config || {};
      this.client = null;
      this.messages = [];
      
      console.log('LLMHelper initialized with config:', this.config);
    }
    
    // Set the client reference
    setClient(client) {
      this.client = client;
      return this;
    }
    
    // Append a message to the conversation
    appendToMessages(message) {
      this.messages.push(message);
      
      if (this.client && this.client.transport) {
        this.client.transport.sendMessage(message);
      }
      
      return this;
    }
    
    // Get the conversation history
    getMessages() {
      return this.messages;
    }
    
    // Clear the conversation history
    clearMessages() {
      this.messages = [];
      return this;
    }
  }
  
  // Gemini Live WebSocket Transport
  class GeminiLiveTransport {
    constructor(config) {
      this.config = config || {};
      this.apiKey = config.api_key;
      this.model = config.model || 'models/gemini-2.0-flash-live-001';
      this.initialMessages = config.initial_messages || [];
      this.generationConfig = config.generation_config || {
        temperature: 0.7,
        maxOutput_tokens: 1024
      };
      
      this.ws = null;
      this.connected = false;
      this.userMediaStream = null;
      this.audioContext = null;
      this.audioProcessor = null;
      this.eventHandlers = {};
      
      console.log('GeminiLiveTransport initialized with config:', {
        model: this.model,
        initialMessages: this.initialMessages.length > 0
      });
    }
    
    // Register event handlers
    on(eventName, callback) {
      if (!this.eventHandlers[eventName]) {
        this.eventHandlers[eventName] = [];
      }
      this.eventHandlers[eventName].push(callback);
      return this;
    }
    
    // Trigger events
    emit(eventName, data) {
      if (this.eventHandlers[eventName]) {
        this.eventHandlers[eventName].forEach(handler => {
          try {
            handler(data);
          } catch (error) {
            console.error(`Error in ${eventName} handler:`, error);
          }
        });
      }
      
      return this;
    }
    
    // Connect to the Gemini service
    async connect() {
      if (this.connected) {
        return;
      }
      
      try {
        // Set up audio context for processing
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
          sampleRate: 16000 // Gemini expects 16kHz audio
        });
        
        // Connect to the Gemini API via server proxy
        const response = await fetch('/api/pipecat-socket', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: this.model,
            initialMessages: this.initialMessages,
            generationConfig: this.generationConfig
          })
        });
        
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Failed to create WebSocket connection');
        }
        
        const wsUrl = data.wsUrl;
        
        // Create WebSocket connection
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = this.handleWebSocketOpen.bind(this);
        this.ws.onmessage = this.handleWebSocketMessage.bind(this);
        this.ws.onerror = this.handleWebSocketError.bind(this);
        this.ws.onclose = this.handleWebSocketClose.bind(this);
        
        // Wait for connection to establish
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('WebSocket connection timeout'));
          }, 10000);
          
          this.on('transport:connected', () => {
            clearTimeout(timeout);
            resolve(void 0);
          });
          
          this.on('transport:error', (err) => {
            clearTimeout(timeout);
            reject(err);
          });
        });
        
        this.connected = true;
        
        // Set up media processing if stream is available
        if (this.userMediaStream) {
          this.setupAudioProcessing(this.userMediaStream);
        }
      } catch (error) {
        console.error('Failed to connect to Gemini service:', error);
        this.emit('transport:error', { message: error.message || 'Connection failed' });
        throw error;
      }
    }
    
    // Disconnect from the Gemini service
    async disconnect() {
      if (!this.connected) {
        return;
      }
      
      try {
        // Stop audio processing
        if (this.audioProcessor) {
          this.audioProcessor.disconnect();
          this.audioProcessor = null;
        }
        
        // Close WebSocket connection
        if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
          this.ws.close();
        }
        
        this.connected = false;
        this.ws = null;
        
        this.emit('transport:disconnected', {});
      } catch (error) {
        console.error('Failed to disconnect:', error);
        throw error;
      }
    }
    
    // Handle WebSocket open event
    handleWebSocketOpen() {
      console.log('WebSocket connection opened');
      this.emit('transport:connected', {});
    }
    
    // Handle WebSocket message event
    handleWebSocketMessage(event) {
      try {
        const message = JSON.parse(event.data);
        
        if (message.type === 'transcript') {
          // User transcript
          this.emit('user:transcript', {
            text: message.text,
            final: message.final || false
          });
        } else if (message.type === 'response') {
          // Bot response
          this.emit('bot:transcript', {
            text: message.text,
            done: message.done || false
          });
        } else if (message.type === 'speaking') {
          // Bot speaking state
          if (message.speaking) {
            this.emit('bot:startedSpeaking', {});
          } else {
            this.emit('bot:stoppedSpeaking', {});
          }
        } else if (message.type === 'error') {
          // Error
          this.emit('transport:error', { message: message.text || 'Unknown error' });
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    }
    
    // Handle WebSocket error event
    handleWebSocketError(event) {
      console.error('WebSocket error:', event);
      this.emit('transport:error', { message: 'WebSocket error' });
    }
    
    // Handle WebSocket close event
    handleWebSocketClose(event) {
      console.log('WebSocket connection closed:', event.code, event.reason);
      this.connected = false;
      this.emit('transport:disconnected', {});
    }
    
    // Set user media stream
    setUserMedia(stream) {
      this.userMediaStream = stream;
      
      if (this.connected) {
        this.setupAudioProcessing(stream);
      }
      
      return this;
    }
    
    // Set up audio processing
    setupAudioProcessing(stream) {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
          sampleRate: 16000 // Gemini expects 16kHz audio
        });
      }
      
      // Create media stream source
      const source = this.audioContext.createMediaStreamSource(stream);
      
      // Create script processor for audio processing
      this.audioProcessor = this.audioContext.createScriptProcessor(4096, 1, 1);
      
      // Connect the audio pipeline
      source.connect(this.audioProcessor);
      this.audioProcessor.connect(this.audioContext.destination);
      
      // Process audio data
      let isSpeaking = false;
      
      this.audioProcessor.onaudioprocess = (event) => {
        if (!this.connected || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
          return;
        }
        
        // Get audio data
        const inputData = event.inputBuffer.getChannelData(0);
        
        // Check for speech using simple energy detection
        const energy = this.calculateEnergy(inputData);
        const speaking = energy > 0.01; // Threshold for speech detection
        
        // Speech state change
        if (speaking !== isSpeaking) {
          isSpeaking = speaking;
          
          if (speaking) {
            this.emit('user:startedSpeaking', {});
          } else {
            this.emit('user:stoppedSpeaking', {});
          }
        }
        
        // Only send audio if speech is detected
        if (speaking) {
          // Convert to 16-bit PCM
          const pcmData = this.floatTo16BitPCM(inputData);
          
          // Send audio data to server
          this.ws.send(JSON.stringify({
            type: 'audio',
            data: Array.from(pcmData)
          }));
        }
      };
    }
    
    // Calculate energy of audio buffer
    calculateEnergy(buffer) {
      let sum = 0;
      
      for (let i = 0; i < buffer.length; i++) {
        sum += buffer[i] * buffer[i];
      }
      
      return sum / buffer.length;
    }
    
    // Convert float audio data to 16-bit PCM
    floatTo16BitPCM(buffer) {
      const pcmData = new Int16Array(buffer.length);
      
      for (let i = 0; i < buffer.length; i++) {
        const s = Math.max(-1, Math.min(1, buffer[i]));
        pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }
      
      return pcmData;
    }
    
    // Mute microphone
    async muteMic() {
      if (this.userMediaStream) {
        this.userMediaStream.getAudioTracks().forEach(track => {
          track.enabled = false;
        });
      }
    }
    
    // Unmute microphone
    async unmuteMic() {
      if (this.userMediaStream) {
        this.userMediaStream.getAudioTracks().forEach(track => {
          track.enabled = true;
        });
      }
    }
    
    // Send a message to the Gemini service
    sendMessage(message) {
      if (!this.connected || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
        throw new Error('Not connected to Gemini service');
      }
      
      this.ws.send(JSON.stringify({
        type: 'message',
        message
      }));
    }
  }
  
  // Export classes to window
  window.PipecatRTVIClient = PipecatClient;
  window.LLMHelper = LLMHelper;
  window.GeminiLiveWebsocketTransport = GeminiLiveTransport;
  
})(window);
