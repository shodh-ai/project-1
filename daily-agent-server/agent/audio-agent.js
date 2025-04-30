const { GoogleGenerativeAI } = require('@google/generative-ai');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const DailyIframe = require('@daily-co/daily-js');
const axios = require('axios');

// Initialize Gemini API
const API_KEY = process.env.GEMINI_API_KEY;
const DEFAULT_MODEL = 'gemini-pro';

// For tracking active agents
const activeAgents = new Map();

/**
 * Gemini Conversation Agent
 * Handles conversation with Gemini using text input/output
 */
class GeminiConversationAgent {
  constructor(options = {}) {
    this.apiKey = options.apiKey || API_KEY;
    this.modelName = options.modelName || DEFAULT_MODEL;
    this.role = options.role || 'language_partner';
    this.conversationHistory = [];
    this.initialize();
  }

  async initialize() {
    try {
      if (!this.apiKey) {
        console.error('Gemini API Key not provided. Agent will run in simulation mode.');
        this.simulationMode = true;
        return;
      }

      // Initialize the Gemini API client
      const genAI = new GoogleGenerativeAI(this.apiKey);
      this.model = genAI.getGenerativeModel({ model: this.modelName });
      
      // Create a chat session
      this.chat = this.model.startChat({
        history: [
          {
            role: 'user',
            parts: [{ text: 'I want to practice speaking with you as a language learning partner. Please help me improve my speaking skills with natural conversation.' }],
          },
          {
            role: 'model',
            parts: [{ text: 'Hello! I\'d be happy to be your language practice partner. Let\'s have a natural conversation to help you improve your speaking skills. Feel free to start by introducing yourself or telling me about a topic you\'d like to discuss.' }],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 800,
        },
      });
      
      console.log('Gemini conversation agent initialized successfully');
      this.simulationMode = false;
    } catch (error) {
      console.error('Error initializing Gemini conversation agent:', error);
      this.simulationMode = true;
    }
  }

  async processMessage(text) {
    try {
      // Skip processing empty messages
      if (!text || text.trim() === '') {
        return { response: '' };
      }

      console.log(`Processing message: ${text}`);
      this.conversationHistory.push({ role: 'user', content: text });
      
      let response;
      if (this.simulationMode) {
        // Simulate a response in simulation mode
        response = this.simulateResponse(text);
      } else {
        // Get a response from Gemini
        const result = await this.chat.sendMessage(text);
        response = result.response.text();
      }
      
      console.log(`Gemini response: ${response}`);
      this.conversationHistory.push({ role: 'assistant', content: response });
      
      return { response };
    } catch (error) {
      console.error('Error processing message:', error);
      return { response: 'Sorry, I encountered an error processing your message. Could you please try again?' };
    }
  }

  simulateResponse(text) {
    // Simple simulation for testing without Gemini API
    const simpleResponses = [
      'That\'s interesting! Can you tell me more about that?',
      'I understand. How does that make you feel?',
      'That\'s a great point. What else would you like to discuss?',
      'I see what you mean. What are your thoughts on this topic?',
      'Thanks for sharing. That\'s a valuable perspective.',
    ];
    
    // Return a random response
    return simpleResponses[Math.floor(Math.random() * simpleResponses.length)];
  }
}

/**
 * Simple Speech-to-Text simulator
 * In a production environment, this would be replaced with a real STT service
 */
class SpeechToTextSimulator {
  constructor() {
    // Simple example phrases for simulation
    this.examplePhrases = [
      'Hello, how are you today?',
      'I\'m learning a new language.',
      'Can we practice conversation?',
      'What would you like to talk about?',
      'I find this topic very interesting.',
      'Could you help me improve my pronunciation?',
      'Let\'s discuss something different.',
      'I enjoy talking with you.',
    ];
  }
  
  simulateSTT(audioBuffer) {
    // Simulate processing audio to text
    // In a real implementation, this would send the audio to a speech recognition service
    
    // Generate random energy level to simulate speech detection
    const energy = Math.random();
    const isSpeaking = energy > 0.7;
    
    if (isSpeaking) {
      // Return a random phrase from our examples
      return {
        text: this.examplePhrases[Math.floor(Math.random() * this.examplePhrases.length)],
        isFinal: Math.random() > 0.7, // Randomly determine if this is a final transcript
      };
    }
    
    return { text: '', isFinal: false };
  }
}

/**
 * WebSocket handler for real-time audio conversation
 */
class AudioConversationHandler {
  constructor(ws, agentId, options = {}) {
    this.ws = ws;
    this.agentId = agentId;
    this.role = options.role || 'language_partner';
    this.roomUrl = options.roomUrl || '';
    this.userName = options.userName || 'AI Assistant';
    
    // Initialize conversation agents
    this.geminiAgent = new GeminiConversationAgent({
      role: this.role,
      apiKey: API_KEY,
    });
    
    // Initialize speech recognition simulator
    this.sttSimulator = new SpeechToTextSimulator();
    
    // Queue for managing audio chunks
    this.audioQueue = [];
    this.isProcessingAudio = false;
    this.lastTranscriptTime = Date.now();
    this.partialTranscript = '';
    
    console.log(`Audio conversation handler initialized for agent ${agentId}`);
  }
  
  start() {
    // Set up WebSocket message handler
    this.ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.type === 'audio') {
          // Queue audio chunk for processing
          this.audioQueue.push(data.audio);
          this.processAudioQueue();
        } else if (data.type === 'text') {
          // Direct text input (for testing/debugging)
          const response = await this.geminiAgent.processMessage(data.text);
          
          // Send response back to the client
          this.ws.send(JSON.stringify({
            type: 'response',
            text: response.response,
          }));
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    });
    
    // Handle WebSocket closure
    this.ws.on('close', () => {
      console.log(`WebSocket closed for agent ${this.agentId}`);
      // Clean up resources
      activeAgents.delete(this.agentId);
    });
    
    // Send initial greeting
    setTimeout(() => {
      this.ws.send(JSON.stringify({
        type: 'response',
        text: 'Hello! I\'m your AI conversation partner. I\'m listening to you now and ready to chat.',
      }));
    }, 1000);
  }
  
  async processAudioQueue() {
    // If already processing or queue is empty, return
    if (this.isProcessingAudio || this.audioQueue.length === 0) {
      return;
    }
    
    this.isProcessingAudio = true;
    
    try {
      // Get next audio chunk
      const audioData = this.audioQueue.shift();
      
      // Process audio (in a real implementation, this would use a streaming STT service)
      const transcriptResult = this.sttSimulator.simulateSTT(audioData);
      
      // If we have text from speech recognition
      if (transcriptResult.text) {
        this.partialTranscript += ' ' + transcriptResult.text;
        
        // Send partial transcript to client
        this.ws.send(JSON.stringify({
          type: 'transcript',
          text: transcriptResult.text,
          isFinal: transcriptResult.isFinal,
        }));
        
        // If this is a final transcript or it's been a while, process it
        if (transcriptResult.isFinal || (Date.now() - this.lastTranscriptTime > 5000 && this.partialTranscript.length > 0)) {
          this.lastTranscriptTime = Date.now();
          
          const finalTranscript = this.partialTranscript.trim();
          this.partialTranscript = '';
          
          if (finalTranscript) {
            // Process transcript with Gemini
            const response = await this.geminiAgent.processMessage(finalTranscript);
            
            // Send response back to the client
            this.ws.send(JSON.stringify({
              type: 'response',
              text: response.response,
            }));
          }
        }
      }
    } catch (error) {
      console.error('Error processing audio:', error);
    } finally {
      this.isProcessingAudio = false;
      
      // Continue processing the queue
      if (this.audioQueue.length > 0) {
        this.processAudioQueue();
      }
    }
  }
}

/**
 * Create an AI agent that joins a Daily.co room
 */
async function createAudioAgent(options = {}) {
  const agentId = uuidv4();
  const {
    roomUrl,
    userName = 'AI Assistant',
    role = 'language_partner',
  } = options;
  
  console.log(`Creating audio agent ${agentId} for room ${roomUrl}`);
  
  // Store agent info
  activeAgents.set(agentId, {
    id: agentId,
    roomUrl,
    userName,
    role,
    createdAt: new Date(),
    wsHandlers: new Map(),
  });
  
  return {
    success: true,
    agentId,
    roomUrl,
    userName,
  };
}

/**
 * Register a WebSocket connection for an agent
 */
function registerAgentWebSocket(agentId, ws) {
  console.log(`Attempting to register WebSocket for agent ${agentId}...`);
  
  try {
    const agent = activeAgents.get(agentId);
    
    if (!agent) {
      console.error(`Agent ${agentId} not found in active agents list`);
      // Send error message to client before closing
      ws.send(JSON.stringify({
        type: 'error',
        text: `Agent ${agentId} not found. It may have been removed or never created.`
      }));
      ws.close(1011, 'Agent not found');
      return false;
    }
    
    console.log(`Registering WebSocket for agent ${agentId}`);
    console.log(`Agent info: Room URL: ${agent.roomUrl}, User: ${agent.userName}`);
    
    // Create conversation handler
    const handler = new AudioConversationHandler(ws, agentId, {
      roomUrl: agent.roomUrl,
      userName: agent.userName,
      role: agent.role,
    });
    
    // Store handler
    agent.wsHandlers.set(ws, handler);
    
    // Start conversation
    handler.start();
    
    console.log(`WebSocket registered successfully for agent ${agentId}`);
    return true;
  } catch (error) {
    console.error(`Error registering WebSocket for agent ${agentId}:`, error);
    try {
      ws.send(JSON.stringify({
        type: 'error',
        text: 'Internal server error when registering WebSocket'
      }));
      ws.close(1011, 'Registration error');
    } catch (sendError) {
      console.error('Error sending error message:', sendError);
    }
    return false;
  }
}

/**
 * Remove an agent and clean up resources
 */
function removeAgent(agentId) {
  const agent = activeAgents.get(agentId);
  
  if (!agent) {
    console.error(`Agent ${agentId} not found for removal`);
    return false;
  }
  
  console.log(`Removing agent ${agentId}`);
  
  // Close all WebSocket connections
  for (const [ws, handler] of agent.wsHandlers.entries()) {
    ws.close();
    agent.wsHandlers.delete(ws);
  }
  
  // Remove agent from map
  activeAgents.delete(agentId);
  
  return true;
}

/**
 * Get all active agents
 */
function getActiveAgents() {
  const agents = [];
  
  for (const [id, agent] of activeAgents.entries()) {
    agents.push({
      id,
      roomUrl: agent.roomUrl,
      userName: agent.userName,
      role: agent.role,
      createdAt: agent.createdAt,
      connections: agent.wsHandlers.size,
    });
  }
  
  return agents;
}

module.exports = {
  createAudioAgent,
  registerAgentWebSocket,
  removeAgent,
  getActiveAgents,
};
