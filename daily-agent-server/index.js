// daily-agent-server/index.js
const express = require('express');
const cors = require('cors');
const http = require('http');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');
const { createAudioAgent, registerAgentWebSocket, removeAgent, getActiveAgents } = require('./agent/audio-agent');
// Import simplified agent implementation for testing
const { createSimpleAgent, registerSimpleWebSocket, removeSimpleAgent, getSimpleAgents } = require('./agent/simple-agent');

// Load environment variables
dotenv.config();

// Load .env.local if it exists
if (fs.existsSync(path.join(__dirname, '..', '.env.local'))) {
  dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
}

// Create Express app
const app = express();
const PORT = process.env.DAILY_AGENT_PORT || 3004;

// Configure middleware with more permissive CORS
app.use(cors({
  origin: '*',  // Allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json());

// Handle preflight requests
app.options('*', cors());

// Create HTTP server
const server = http.createServer(app);

// Create WebSocket server with proper configuration
const wss = new WebSocket.Server({ 
  server,
  // Allow connections from any origin with more debugging
  verifyClient: (info) => {
    console.log('🔄 WebSocket connection attempt:');
    console.log('   Origin:', info.origin);
    console.log('   Path:', info.req.url);
    console.log('   Headers:', JSON.stringify(info.req.headers));
    
    // Extract agent ID from URL to validate it exists
    const pathMatch = info.req.url.match(/\/agent\/(([\w-]+))/);
    if (pathMatch) {
      const agentId = pathMatch[1];
      const agentExists = getActiveAgents().some(agent => agent.id === agentId);
      if (!agentExists) {
        console.log(`❌ Agent ${agentId} not found in active agents list`);
        // We'll still allow the connection and let the handler handle the error properly
      } else {
        console.log(`✅ Agent ${agentId} found in active agents list`);
      }
    } else {
      console.log('❌ Invalid WebSocket URL format');
    }
    
    return true; // Accept all connections and handle errors in the connection handler
  }
});

// WebSocket connection handler
wss.on('connection', (ws, req) => {
  console.log('🟢 WebSocket connection established');
  
  // Send immediate acknowledgment to client
  try {
    ws.send(JSON.stringify({
      type: 'status',
      text: 'Connection established, registering with agent...'
    }));
  } catch (err) {
    console.error('Error sending initial acknowledgment:', err);
  }
  
  // Extract agent ID and mode from the URL
  // We'll support both /agent/{agentId} and /agent/simple/{agentId}
  let agentId;
  let isSimpleMode = false;
  
  const simplePathMatch = req.url.match(/\/agent\/simple\/([\w-]+)/);
  const standardPathMatch = req.url.match(/\/agent\/([\w-]+)/);
  
  if (simplePathMatch) {
    agentId = simplePathMatch[1];
    isSimpleMode = true;
  } else if (standardPathMatch) {
    agentId = standardPathMatch[1];
  } else {
    console.error('❌ Invalid WebSocket connection URL:', req.url);
    try {
      ws.send(JSON.stringify({
        type: 'error',
        text: 'Invalid URL format. Expected /agent/{agentId} or /agent/simple/{agentId}'
      }));
    } catch (sendErr) {}
    ws.close(1003, 'Invalid URL format');
    return;
  }
  
  console.log(`🔄 Registering WebSocket for agent: ${agentId} (Mode: ${isSimpleMode ? 'Simple' : 'Standard'})`);
  
  // Keep the connection alive with ping/pong
  const pingInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping();
    } else {
      clearInterval(pingInterval);
    }
  }, 30000); // Send ping every 30 seconds
  
  // Clean up interval on close
  ws.on('close', () => {
    clearInterval(pingInterval);
    console.log(`🔴 WebSocket closed for agent ${agentId}`);
  });
  
  // Handle pong responses
  ws.on('pong', () => {
    console.log(`📊 Received pong from agent ${agentId}`);
  });
  
  // Register WebSocket connection with the agent
  let success;
  if (isSimpleMode) {
    success = registerSimpleWebSocket(agentId, ws);
  } else {
    success = registerAgentWebSocket(agentId, ws);
  }
  
  if (!success) {
    console.error(`❌ Failed to register WebSocket for agent ${agentId}`);
    try {
      ws.send(JSON.stringify({
        type: 'error',
        text: `Failed to register WebSocket for agent ${agentId}. Agent may not exist.`
      }));
    } catch (sendErr) {}
    ws.close(1011, 'Failed to register with agent');
  }
});

// Routes
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'daily-agent-server',
    timestamp: new Date().toISOString(),
    activeAgents: getActiveAgents().length,
    simpleAgents: getSimpleAgents().length
  });
});

app.post('/api/create-agent', async (req, res) => {
  try {
    const { roomUrl, userName, role, simpleMode } = req.body;
    
    if (!roomUrl) {
      return res.status(400).json({ success: false, error: 'Room URL is required' });
    }
    
    // Use simple agent implementation if requested (for testing)
    if (simpleMode) {
      console.log('Creating simple agent for testing');
      const result = await createSimpleAgent({
        roomUrl,
        userName: userName || 'Simple AI',
        role: role || 'tester',
      });
      return res.json(result);
    }
    
    // Default: use the full audio agent implementation
    const result = await createAudioAgent({
      roomUrl,
      userName: userName || 'AI Assistant',
      role: role || 'language_partner',
    });
    
    res.json(result);
  } catch (error) {
    console.error('Error creating agent:', error);
    res.status(500).json({ success: false, error: 'Failed to create agent' });
  }
});

// Get all active agents
app.get('/api/agents', (req, res) => {
  const agents = getActiveAgents();
  res.json({ success: true, agents });
});

// Remove an agent
app.delete('/api/agents/:agentId', (req, res) => {
  const { agentId } = req.params;
  const success = removeAgent(agentId);
  
  if (success) {
    res.json({ success: true, message: `Agent ${agentId} removed` });
  } else {
    res.status(404).json({ success: false, error: `Agent ${agentId} not found` });
  }
});

// Stop an agent
app.post('/api/stop-agent/:agentId', async (req, res) => {
  const { agentId } = req.params;
  
  try {
    await stopAgent(agentId);
    res.json({ success: true });
  } catch (error) {
    console.error(`Failed to stop agent ${agentId}:`, error);
    res.status(error.message.includes('not found') ? 404 : 500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Daily Agent Server running on port ${PORT}`);
});

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  
  try {
    // Stop all running agents
    const activeAgents = getActiveAgents();
    const stopPromises = activeAgents.map(agent => removeAgent(agent.id));
    await Promise.all(stopPromises);
    
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  
  try {
    // Stop all running agents
    const activeAgents = getActiveAgents();
    const stopPromises = activeAgents.map(agent => removeAgent(agent.id));
    await Promise.all(stopPromises);
    
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});