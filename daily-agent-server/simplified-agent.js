// simplified-agent.js - Direct Daily.co + Gemini integration
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

// Configuration from environment variables
const DAILY_API_KEY = process.env.DAILY_API_KEY || 'b352b6173857ead633c09f16e8ba35d9ff9bd6a7bff7bd8d84f609331e671541';
const DAILY_DOMAIN = process.env.DAILY_DOMAIN || 'shodhai.daily.co';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyBvvp7sahIUJl2JBdz6EYDAaWL-mRJUaUw';
const PORT = process.env.PORT || 3004;

// Initialize Express app
const app = express();
app.use(cors());
app.use(express.json());

// Initialize Google AI
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Keep track of active AI agents
const activeAgents = new Map();

// Simple health endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'daily-agent-service',
    timestamp: new Date().toISOString()
  });
});

// Simplified approach - create and simulate agent joining a room
app.post('/api/create-agent', async (req, res) => {
  try {
    const { roomUrl, userName = 'AI Assistant', role = 'language_partner' } = req.body;
    
    if (!roomUrl) {
      return res.status(400).json({ 
        success: false, 
        error: 'Room URL is required' 
      });
    }

    console.log(`Creating AI agent (${userName}) for room: ${roomUrl}`);
    
    // Generate a unique ID for this agent
    const agentId = uuidv4();
    
    // Get the room name from the URL
    const roomName = roomUrl.split('/').pop();
    console.log(`Extracted room name: ${roomName}`);
    
    // Get the appropriate system prompt based on the agent's role
    const systemPrompt = getSystemPrompt(role);
    
    // Create a simplified agent object
    const agent = {
      id: agentId,
      roomUrl,
      roomName,
      userName,
      role,
      active: true,
      createdAt: new Date().toISOString(),
      systemPrompt
    };
    
    // Store the agent
    activeAgents.set(agentId, agent);
    
    console.log(`AI agent created: ${agentId}`);
    
    // Simulate an agent joining the room
    simulateAgentJoining(agent);
    
    return res.json({
      success: true,
      agentId,
      roomUrl,
      userName,
      role,
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

// List all active agents
app.get('/api/agents', (req, res) => {
  const agents = Array.from(activeAgents.values()).map(agent => ({
    id: agent.id,
    roomUrl: agent.roomUrl,
    userName: agent.userName,
    role: agent.role,
    active: agent.active,
    createdAt: agent.createdAt
  }));
  
  res.json({ agents });
});

// Generate a token for Daily.co room
async function generateDailyToken(roomName, userName) {
  try {
    console.log(`Generating token for room: ${roomName}, user: ${userName}`);
    
    // First, let's try to use our token service
    try {
      const response = await axios.get(`http://localhost:3003/api/token?room=${roomName}&name=${userName}`, {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'dev-key'
        }
      });
      
      console.log('Token generated from token service:', response.data);
      return response.data;
    } catch (localError) {
      console.log('Local token service failed, falling back to Daily.co API:', localError.message);
    }
    
    // Fallback to direct Daily.co API
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
    
    console.log('Making request to Daily.co API for token:', url);
    const response = await axios.post(url, data, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DAILY_API_KEY}`
      }
    });
    
    console.log('Token generated from Daily.co API:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error generating Daily token:', error.response?.data || error.message);
    throw error;
  }
}

// Get system prompt based on agent role
function getSystemPrompt(role) {
  switch (role.toLowerCase()) {
    case 'language_partner':
      return `You are a helpful language conversation partner. 
      Engage in natural conversation with the user to help them practice speaking. 
      Keep your responses brief and conversational. Ask follow-up questions 
      to keep the conversation flowing naturally. You are speaking directly to them 
      in a video call, so be friendly and supportive.`;
    
    case 'interview_coach':
      return `You are an interview coach helping the user practice job interviews. 
      Ask relevant interview questions and provide constructive feedback on their responses. 
      Keep your responses professional but supportive.`;
    
    case 'pronunciation_tutor':
      return `You are a pronunciation tutor helping the user improve their speaking. 
      Focus on clear pronunciation, rhythm, and intonation. Provide gentle corrections 
      when needed, and encourage the user's progress.`;
    
    default:
      return `You are a helpful conversation assistant. Engage in natural conversation 
      with the user to help them practice speaking. Keep your responses brief and to the point.`;
  }
}

// Simulate an agent joining the Daily.co room
function simulateAgentJoining(agent) {
  console.log(`Simulating agent ${agent.userName} joining room ${agent.roomName}`);
  
  // Mark agent as joining
  agent.status = 'joining';
  
  setTimeout(() => {
    console.log(`Agent ${agent.userName} has joined the room ${agent.roomName}`);
    agent.status = 'active';
    
    // Simulate AI agent sending initial greeting after joining
    const initialGreetings = [
      "Hello! I'm your AI conversation partner. How are you doing today?",
      "Hi there! I'm ready to chat with you. What would you like to talk about?",
      "Good day! I'm here to help you practice speaking. What's on your mind?"
    ];
    
    const randomGreeting = initialGreetings[Math.floor(Math.random() * initialGreetings.length)];
    console.log(`AI greeting: ${randomGreeting}`);
    
    // In a fully implemented version, this would actually send audio to the Daily.co room
    // using Gemini 2.0 Flash for real-time audio streaming
  }, 2000);
}

// Start the server
app.listen(PORT, () => {
  console.log(`Daily AI Agent server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Daily Domain: ${DAILY_DOMAIN}`);
  console.log(`Gemini API Key: ${GEMINI_API_KEY ? 'is set' : 'not set'}`);
});
