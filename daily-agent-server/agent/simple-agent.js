/**
 * Simplified agent implementation focused on WebSocket connections
 */

const { v4: uuidv4 } = require('uuid');

// For tracking active agents
const activeAgents = new Map();

/**
 * Create a simple test agent
 */
async function createSimpleAgent(options = {}) {
  const agentId = uuidv4();
  const {
    roomUrl = 'test-room',
    userName = 'Simple AI Agent',
    role = 'tester',
  } = options;
  
  console.log(`Creating simple agent ${agentId} for room ${roomUrl}`);
  
  // Store agent info
  activeAgents.set(agentId, {
    id: agentId,
    roomUrl,
    userName,
    role,
    createdAt: new Date(),
    connections: new Set(),
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
function registerSimpleWebSocket(agentId, ws) {
  console.log(`Attempting to register simple WebSocket for agent ${agentId}...`);
  
  try {
    const agent = activeAgents.get(agentId);
    
    if (!agent) {
      console.error(`Agent ${agentId} not found in active agents list`);
      try {
        ws.send(JSON.stringify({
          type: 'error',
          text: `Agent ${agentId} not found. It may have been removed or never created.`
        }));
      } catch (e) {}
      return false;
    }
    
    console.log(`Registering WebSocket for agent ${agentId}`);
    
    // Add the connection to the agent
    agent.connections.add(ws);
    
    // Handle WebSocket messages
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log(`Received message from ${agentId}:`, data);
        
        // Echo the message back
        ws.send(JSON.stringify({
          type: 'echo',
          original: data,
          timestamp: Date.now(),
        }));
        
        // If it's a ping, send a pong
        if (data.type === 'ping') {
          ws.send(JSON.stringify({
            type: 'pong',
            timestamp: Date.now(),
            originalTimestamp: data.timestamp,
          }));
        }
        
        // If it's a text message, echo it with acknowledgment
        if (data.type === 'text') {
          ws.send(JSON.stringify({
            type: 'response',
            text: `Echo: ${data.text}`,
            timestamp: Date.now(),
          }));
        }
      } catch (error) {
        console.error('Error processing message:', error);
        try {
          ws.send(JSON.stringify({
            type: 'error',
            text: 'Error processing your message',
          }));
        } catch (e) {}
      }
    });
    
    // Handle WebSocket closure
    ws.on('close', () => {
      console.log(`WebSocket for agent ${agentId} closed`);
      agent.connections.delete(ws);
    });
    
    // Send welcome message
    try {
      ws.send(JSON.stringify({
        type: 'welcome',
        text: `Connected to simple agent ${agentId}`,
        agentId,
        timestamp: Date.now(),
      }));
    } catch (e) {
      console.error('Error sending welcome message:', e);
      return false;
    }
    
    console.log(`WebSocket registered successfully for agent ${agentId}`);
    return true;
  } catch (error) {
    console.error(`Error registering WebSocket for agent ${agentId}:`, error);
    return false;
  }
}

/**
 * Remove an agent and clean up resources
 */
function removeSimpleAgent(agentId) {
  const agent = activeAgents.get(agentId);
  
  if (!agent) {
    console.error(`Agent ${agentId} not found for removal`);
    return false;
  }
  
  console.log(`Removing agent ${agentId}`);
  
  // Close all WebSocket connections
  for (const ws of agent.connections) {
    try {
      ws.send(JSON.stringify({
        type: 'shutdown',
        text: 'Agent is being removed',
      }));
      ws.close();
    } catch (e) {}
  }
  
  // Remove agent from map
  activeAgents.delete(agentId);
  
  return true;
}

/**
 * Get all active agents
 */
function getSimpleAgents() {
  return Array.from(activeAgents.values()).map(agent => ({
    id: agent.id,
    roomUrl: agent.roomUrl,
    userName: agent.userName,
    role: agent.role,
    createdAt: agent.createdAt,
    connectionCount: agent.connections.size,
  }));
}

module.exports = {
  createSimpleAgent,
  registerSimpleWebSocket,
  removeSimpleAgent,
  getSimpleAgents,
};
