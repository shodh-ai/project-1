const EventEmitter = require('events');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const WebSocket = require('ws');

/**
 * Handles real-time communication with Gemini 2.0 Flash API
 * for direct audio streaming in both directions
 */
class GeminiLive extends EventEmitter {
  /**
   * Creates a new GeminiLive instance for real-time audio conversation
   * @param {Object} options
   * @param {string} options.apiKey - Gemini API key
   * @param {string} options.role - Role of the assistant
   * @param {string} options.agentId - Unique ID for this agent
   */
  constructor({ apiKey, role = 'assistant', agentId }) {
    super();
    this.apiKey = apiKey;
    this.role = role;
    this.agentId = agentId;
    this.isStreaming = false;
    this.audioBufferChunks = [];
    this.wsConnection = null;
    this.genAI = new GoogleGenerativeAI(this.apiKey);
    
    // Use Gemini 2.0 Flash model for real-time streaming
    this.model = 'gemini-flash';
    
    // System prompts based on role
    const systemPrompts = {
      assistant: 
        "You are a helpful AI assistant in a video call. Help the user with speaking practice, provide concise responses, and give feedback on pronunciation, vocabulary, and fluency when asked.",
      interviewer: 
        "You are an AI interviewer conducting a job interview. Ask relevant questions about skills and experience, evaluate responses, and keep a professional tone throughout.",
      language_partner: 
        "You are a language practice partner helping with conversation skills. Maintain a casual, friendly tone, correct language mistakes gently, and encourage the user to speak more by asking follow-up questions."
    };
    
    this.systemPrompt = systemPrompts[role] || systemPrompts.assistant;
    
    console.log(`Gemini Live (Flash) initialized for agent ${agentId} in role: ${role}`);
  }
  
  /**
   * Establishes a WebSocket connection to Gemini 2.0 Flash for real-time audio streaming
   * This is the core of real-time audio processing
   */
  async initializeAudioStream() {
    if (this.wsConnection) {
      console.log("WebSocket connection already exists");
      return;
    }
    
    try {
      // The specific endpoint would be provided by Google for Gemini 2.0 Flash API
      // This is a placeholder based on expected format
      const wsEndpoint = `wss://generativelanguage.googleapis.com/v1beta/models/${this.model}:streamGenerateContent?key=${this.apiKey}`;
      
      this.wsConnection = new WebSocket(wsEndpoint);
      
      this.wsConnection.on('open', () => {
        console.log(`WebSocket connection established for agent ${this.agentId}`);
        this.isStreaming = true;
        
        // Send initial configuration including system prompt
        const initConfig = {
          type: "config",
          system_instruction: {
            role: "system",
            content: this.systemPrompt
          },
          audio_config: {
            encoding: "LINEAR16",
            sample_rate_hertz: 16000,
            language_code: "en-US"
          }
        };
        
        this.wsConnection.send(JSON.stringify(initConfig));
        this.emit('stream-ready');
      });
      
      this.wsConnection.on('message', (data) => {
        try {
          const response = JSON.parse(data);
          
          // Handle different response types from Gemini Flash
          if (response.type === "audio_response") {
            // Direct audio response from the model
            this.emit('audio-response', response.audio_content);
          } else if (response.type === "text_response") {
            // Text response that can be displayed alongside audio
            this.emit('response', response.text);
          } else if (response.type === "error") {
            console.error("Gemini API error:", response.error);
            this.emit('error', response.error);
          }
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      });
      
      this.wsConnection.on('error', (error) => {
        console.error(`WebSocket error for agent ${this.agentId}:`, error);
        this.emit('error', error);
      });
      
      this.wsConnection.on('close', (code, reason) => {
        console.log(`WebSocket closed for agent ${this.agentId}. Code: ${code}, Reason: ${reason}`);
        this.isStreaming = false;
        this.wsConnection = null;
      });
      
    } catch (error) {
      console.error(`Error initializing audio stream for agent ${this.agentId}:`, error);
      throw error;
    }
  }
  
  /**
   * Sends real-time audio data directly to Gemini 2.0 Flash
   * This enables continuous conversation without breaking the flow
   * 
   * @param {Uint8Array|Buffer} audioChunk - Raw audio chunk from the browser
   */
  async sendAudio(audioChunk) {
    if (!this.isStreaming) {
      await this.initializeAudioStream();
    }
    
    if (!this.wsConnection || this.wsConnection.readyState !== WebSocket.OPEN) {
      console.warn("WebSocket not ready yet. Buffering audio chunk.");
      this.audioBufferChunks.push(audioChunk);
      return;
    }
    
    try {
      // Send audio data in the format expected by Gemini Flash
      const audioMessage = {
        type: "audio_content",
        audio_content: audioChunk.toString('base64') // Convert binary audio to base64
      };
      
      this.wsConnection.send(JSON.stringify(audioMessage));
    } catch (error) {
      console.error(`Error sending audio for agent ${this.agentId}:`, error);
    }
  }
  
  /**
   * Process any buffered audio chunks when the connection becomes ready
   */
  async processBufferedAudio() {
    if (this.audioBufferChunks.length > 0 && 
        this.wsConnection && 
        this.wsConnection.readyState === WebSocket.OPEN) {
      
      console.log(`Processing ${this.audioBufferChunks.length} buffered audio chunks`);
      
      for (const chunk of this.audioBufferChunks) {
        await this.sendAudio(chunk);
      }
      
      // Clear the buffer
      this.audioBufferChunks = [];
    }
  }
  
  /**
   * Sends a marker to indicate the user has stopped speaking
   * This helps Gemini Flash know when to respond
   */
  async sendEndOfUtterance() {
    if (!this.isStreaming || !this.wsConnection || this.wsConnection.readyState !== WebSocket.OPEN) {
      return;
    }
    
    try {
      const endMarker = {
        type: "end_of_utterance"
      };
      
      this.wsConnection.send(JSON.stringify(endMarker));
    } catch (error) {
      console.error(`Error sending end of utterance for agent ${this.agentId}:`, error);
    }
  }
  
  /**
   * Sends a text message directly to Gemini 2.0 Flash
   * Useful for system commands or when audio isn't available
   * 
   * @param {string} text - Text to send
   */
  async sendText(text) {
    if (!this.isStreaming) {
      await this.initializeAudioStream();
    }
    
    if (!this.wsConnection || this.wsConnection.readyState !== WebSocket.OPEN) {
      console.warn("WebSocket not ready yet. Cannot send text.");
      return;
    }
    
    try {
      const textMessage = {
        type: "text_content",
        text
      };
      
      this.wsConnection.send(JSON.stringify(textMessage));
    } catch (error) {
      console.error(`Error sending text for agent ${this.agentId}:`, error);
    }
  }
  
  /**
   * Closes the Gemini connection and cleans up resources
   */
  async close() {
    console.log(`Closing Gemini Flash connection for agent ${this.agentId}`);
    
    if (this.wsConnection) {
      try {
        // Send a proper close message if needed
        if (this.wsConnection.readyState === WebSocket.OPEN) {
          this.wsConnection.send(JSON.stringify({ type: "close_connection" }));
        }
        
        // Close the WebSocket connection
        this.wsConnection.close(1000, "Agent shutting down");
        this.wsConnection = null;
      } catch (error) {
        console.error(`Error closing WebSocket for agent ${this.agentId}:`, error);
      }
    }
    
    this.isStreaming = false;
    this.audioBufferChunks = [];
  }
}

module.exports = { GeminiLive };