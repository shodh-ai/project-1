// Real-time speech-to-speech AI Agent for Daily.co
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

// Configuration
const PORT = process.env.PORT || 3004;
const DAILY_API_KEY = process.env.DAILY_API_KEY;
const DAILY_DOMAIN = process.env.DAILY_DOMAIN || 'shodhai.daily.co';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!DAILY_API_KEY) {
  console.error('DAILY_API_KEY is required!');
  process.exit(1);
}

if (!GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY is required!');
  process.exit(1);
}

// Initialize Express app
const app = express();
app.use(cors());
app.use(express.json());

// Track active agents
const activeAgents = new Map();

// Initialize Gemini 
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Websocket server for real-time audio streaming
const wss = new WebSocket.Server({ noServer: true });

// Audio processing settings
const AUDIO_CONFIG = {
  sampleRate: 16000,
  encoding: 'LINEAR16',
  singleUtterance: false,
  model: 'latest',
  languageCode: 'en-US'
};

// Agent conversation settings
const AGENT_ROLES = {
  LANGUAGE_PARTNER: 'language_partner',
  INTERVIEW_COACH: 'interview_coach',
  PRONUNCIATION_TUTOR: 'pronunciation_tutor'
};

// Get conversation prompt for agent role
function getAgentPrompt(role) {
  switch (role) {
    case AGENT_ROLES.LANGUAGE_PARTNER:
      return `You are a helpful language conversation partner. 
        Engage in natural conversation with the user to help them practice speaking.
        Keep your responses brief and conversational. Ask follow-up questions 
        to maintain natural conversation flow. You are speaking directly to them
        in a video call, so be friendly and supportive.`;
        
    case AGENT_ROLES.INTERVIEW_COACH:
      return `You are an interview coach helping the user practice job interviews.
        Ask relevant interview questions and provide constructive feedback on their responses.
        Keep your responses professional but supportive.`;
        
    case AGENT_ROLES.PRONUNCIATION_TUTOR:
      return `You are a pronunciation tutor helping the user improve their speaking.
        Focus on clear pronunciation, rhythm, and intonation. Provide gentle corrections
        when needed, and encourage the user's progress.`;
        
    default:
      return `You are a helpful conversation assistant. Engage in natural conversation
        with the user to help them practice speaking. Keep your responses brief and natural.`;
  }
}

// Gemini Multimodal Model for real-time conversation
class GeminiConversationAgent {
  constructor(agentId, role) {
    this.agentId = agentId;
    this.role = role;
    this.model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });
    this.chatSession = null;
    this.audioBuffer = [];
    this.isProcessing = false;
    this.conversationHistory = [];
    this.systemPrompt = getAgentPrompt(role);
  }

  async initialize() {
    try {
      console.log(`Initializing Gemini agent with role: ${this.role}`);
      // Create a chat session with the system prompt
      this.chatSession = this.model.startChat({
        generationConfig: {
          maxOutputTokens: 100,
          temperature: 0.7,
          topP: 0.8,
          topK: 40,
        },
        systemInstruction: this.systemPrompt,
      });
      
      console.log('Gemini conversation agent initialized');
      return true;
    } catch (error) {
      console.error('Error initializing Gemini:', error);
      return false;
    }
  }
  
  async processAudio(audioChunk) {
    // Add audio to buffer
    this.audioBuffer.push(audioChunk);
    
    // Process buffered audio if not already processing
    if (!this.isProcessing && this.audioBuffer.length > 0) {
      await this.processBufferedAudio();
    }
  }
  
  async processBufferedAudio() {
    if (this.audioBuffer.length === 0 || this.isProcessing) {
      return;
    }
    
    this.isProcessing = true;
    
    try {
      // In a real implementation, this would convert audio to text using a streaming STT API
      // For this demo, we'll simulate it with a delay
      console.log(`Processing audio buffer with ${this.audioBuffer.length} chunks`);
      
      // Simulate STT processing time
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Simulate a transcription (in real implementation this would come from STT)
      const simulatedTranscript = "Hello, how can you help me practice my English conversation?";
      
      console.log(`Simulated transcript: ${simulatedTranscript}`);
      
      // Process with Gemini
      const response = await this.chatSession.sendMessage(simulatedTranscript);
      const responseText = response.response.text();
      
      // Add to conversation history
      this.conversationHistory.push({
        role: 'user',
        content: simulatedTranscript,
        timestamp: new Date().toISOString()
      });
      
      this.conversationHistory.push({
        role: 'assistant',
        content: responseText,
        timestamp: new Date().toISOString()
      });
      
      console.log(`Gemini response: ${responseText}`);
      
      // In a real implementation, this would convert text to speech
      // and send audio back to the client
      
      // Clear the buffer
      this.audioBuffer = [];
    } catch (error) {
      console.error('Error processing audio:', error);
    } finally {
      this.isProcessing = false;
      
      // Process any new audio that arrived during processing
      if (this.audioBuffer.length > 0) {
        await this.processBufferedAudio();
      }
    }
  }
  
  getConversationHistory() {
    return this.conversationHistory;
  }
}

// Generate a Daily.co token to allow an agent to join a room
async function generateDailyToken(roomName, userName) {
  try {
    const url = `https://api.daily.co/v1/meeting-tokens`;
    const data = {
      properties: {
        room_name: roomName,
        user_name: userName,
        is_owner: false,
        start_audio_off: false,
        start_video_off: true,
      }
    };
    
    const response = await axios.post(url, data, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DAILY_API_KEY}`
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Error generating Daily token:', error.response?.data || error.message);
    throw error;
  }
}

// Get room info from Daily.co API
async function getDailyRoom(roomName) {
  try {
    const url = `https://api.daily.co/v1/rooms/${roomName}`;
    
    const response = await axios.get(url, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DAILY_API_KEY}`
      }
    });
    
    return response.data;
  } catch (error) {
    // If room doesn't exist, return null
    if (error.response && error.response.status === 404) {
      return null;
    }
    
    console.error('Error getting Daily room:', error.response?.data || error.message);
    throw error;
  }
}

// Create a room if it doesn't exist
async function createDailyRoomIfNeeded(roomName) {
  try {
    // Check if room exists
    const existingRoom = await getDailyRoom(roomName);
    if (existingRoom) {
      return existingRoom;
    }
    
    // Create new room
    const url = `https://api.daily.co/v1/rooms`;
    const data = {
      name: roomName,
      properties: {
        enable_chat: true,
        enable_knocking: false,
        start_video_off: false,
        start_audio_off: false,
        max_participants: 10
      }
    };
    
    const response = await axios.post(url, data, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DAILY_API_KEY}`
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Error creating Daily room:', error.response?.data || error.message);
    throw error;
  }
}

// Create and connect an AI agent to a Daily.co room
app.post('/api/create-agent', async (req, res) => {
  try {
    const { roomUrl, roomName: requestedRoomName, userName = 'AI Assistant', role = 'language_partner' } = req.body;
    
    let roomName;
    
    // Extract room name from URL if provided
    if (roomUrl) {
      roomName = roomUrl.split('/').pop();
    } else if (requestedRoomName) {
      roomName = requestedRoomName;
    } else {
      return res.status(400).json({ 
        success: false, 
        error: 'Either roomUrl or roomName is required' 
      });
    }
    
    console.log(`Creating AI agent (${userName}) for room: ${roomName}`);
    
    // Make sure room exists
    const room = await createDailyRoomIfNeeded(roomName);
    const roomUrl = room.url || `https://${DAILY_DOMAIN}/${roomName}`;
    
    // Generate a token for the agent
    const tokenResponse = await generateDailyToken(roomName, userName);
    if (!tokenResponse || !tokenResponse.token) {
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to generate Daily.co token' 
      });
    }
    
    // Create a unique ID for this agent
    const agentId = uuidv4();
    
    // Initialize Gemini conversation agent
    const geminiAgent = new GeminiConversationAgent(agentId, role);
    await geminiAgent.initialize();
    
    // Store agent details
    const agent = {
      id: agentId,
      roomName,
      roomUrl,
      userName,
      role,
      token: tokenResponse.token,
      status: 'active',
      geminiAgent,
      createdAt: new Date().toISOString(),
    };
    
    activeAgents.set(agentId, agent);
    
    console.log(`AI agent created: ${agentId}`);
    
    // Simulate agent joining the room
    console.log(`Agent ${userName} (${agentId}) joining room: ${roomUrl}`);
    
    // In a real implementation, this would connect to Daily.co and stream audio
    
    // Start with an initial greeting
    const greetings = [
      "Hello! I'm your AI conversation partner. How are you today?",
      "Hi there! I'm ready to chat with you. What would you like to talk about?",
      "Good day! I'm here to help you practice speaking. What's on your mind?"
    ];
    
    const greeting = greetings[Math.floor(Math.random() * greetings.length)];
    console.log(`Agent greeting: ${greeting}`);
    
    // In a real implementation, this would be spoken by the agent using TTS
    
    return res.json({
      success: true,
      agentId,
      roomUrl,
      userName,
      role,
      token: tokenResponse.token,
      message: "AI agent has joined the room and is ready for conversation!"
    });
  } catch (error) {
    console.error('Error creating agent:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to create agent' 
    });
  }
});

// Get all active agents
app.get('/api/agents', (req, res) => {
  const agents = Array.from(activeAgents.entries()).map(([id, agent]) => ({
    id,
    roomName: agent.roomName,
    roomUrl: agent.roomUrl,
    userName: agent.userName,
    role: agent.role,
    status: agent.status,
    createdAt: agent.createdAt
  }));
  
  res.json({ agents });
});

// Get agent details by ID
app.get('/api/agents/:id', (req, res) => {
  const { id } = req.params;
  const agent = activeAgents.get(id);
  
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }
  
  res.json({
    id: agent.id,
    roomName: agent.roomName,
    roomUrl: agent.roomUrl,
    userName: agent.userName,
    role: agent.role,
    status: agent.status,
    createdAt: agent.createdAt,
    conversationHistory: agent.geminiAgent.getConversationHistory()
  });
});

// Remove an agent
app.delete('/api/agents/:id', (req, res) => {
  const { id } = req.params;
  const agent = activeAgents.get(id);
  
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }
  
  // Remove agent
  activeAgents.delete(id);
  
  res.json({ success: true, message: 'Agent removed' });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'daily-agent-service',
    timestamp: new Date().toISOString()
  });
});

// WebSocket handling for real-time audio streaming
wss.on('connection', (ws, req) => {
  console.log('WebSocket connection established');
  
  // Extract agent ID from URL
  const agentId = req.url.split('/').pop();
  const agent = activeAgents.get(agentId);
  
  if (!agent) {
    console.error(`Agent ${agentId} not found`);
    ws.close();
    return;
  }
  
  console.log(`WebSocket connected for agent ${agentId}`);
  
  ws.on('message', async (message) => {
    try {
      // Parse the message
      const data = JSON.parse(message);
      
      if (data.type === 'audio') {
        // Process audio data
        const audioBuffer = Buffer.from(data.audio, 'base64');
        await agent.geminiAgent.processAudio(audioBuffer);
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
    }
  });
  
  ws.on('close', () => {
    console.log(`WebSocket connection closed for agent ${agentId}`);
  });
});

// Start the server
const server = app.listen(PORT, () => {
  console.log(`Daily AI Conversation Agent running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Daily Domain: ${DAILY_DOMAIN}`);
  console.log(`Gemini API Key: ${GEMINI_API_KEY ? 'is set' : 'not set'}`);
});

// Attach WebSocket server to HTTP server
server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});
