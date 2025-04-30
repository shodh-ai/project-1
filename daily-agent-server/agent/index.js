// daily-agent-server/agent/index.js
const WebSocket = require('ws');
const { GeminiLive } = require('./gemini');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

// Keep track of active agents
const agents = new Map();

// Define agent roles
const AGENT_ROLES = {
  LANGUAGE_PARTNER: 'language_partner',
  INTERVIEW_COACH: 'interview_coach',
  PRONUNCIATION_TUTOR: 'pronunciation_tutor'
};

/**
 * Generate silent audio data for testing (16-bit PCM, 16kHz, mono)
 * @param {number} durationMs - Duration in milliseconds
 * @returns {Buffer} - Buffer of silent audio data
 */
const generateSilentAudio = (durationMs) => {
  const bytesPerSample = 2; // 16-bit PCM
  const sampleRate = 16000; // 16kHz
  const numSamples = Math.floor(sampleRate * (durationMs / 1000));
  const buffer = Buffer.alloc(numSamples * bytesPerSample);
  return buffer;
};

/**
 * Creates an AI agent that joins a Daily.co room with real-time audio processing
 * @param {Object} options - Configuration options
 * @param {string} options.roomUrl - Full URL to the Daily.co room
 * @param {string} options.roomName - Name of the room (optional if roomUrl provided)
 * @param {string} options.userName - Display name for the agent
 * @param {string} options.role - Role of the agent (assistant, interviewer, etc.)
 * @returns {Object} Agent object with control methods
 */
async function createAgent({ roomUrl, roomName, userName = 'AI Assistant', role = 'assistant' }) {
  try {
    console.log(`Creating agent for room: ${roomUrl || roomName}`);
    
    // Generate unique ID for this agent
    const agentId = uuidv4();
    
    // Extract room name from URL if not provided
    if (!roomName && roomUrl) {
      roomName = roomUrl.split('/').pop();
    }
    
    // Initialize Gemini
    const gemini = new GeminiLive();
    await gemini.initialize();
    
    // Create agent object
    const agent = {
      id: agentId,
      roomName,
      roomUrl,
      userName,
      role,
      gemini,
      status: 'created',
      startTime: Date.now(),
      async join() {
        try {
          this.status = 'joining';
          console.log(`Agent ${this.id} joining room: ${this.roomUrl || this.roomName}`);
          
          // In a real implementation, we would establish connection to Daily.co here
          
          this.status = 'active';
          return true;
        } catch (error) {
          console.error(`Error joining room:`, error);
          this.status = 'error';
          return false;
        }
      },
      async leave() {
        try {
          this.status = 'leaving';
          console.log(`Agent ${this.id} leaving room`);
          
          // In a real implementation, we would disconnect from Daily.co here
          
          this.status = 'inactive';
          return true;
        } catch (error) {
          console.error(`Error leaving room:`, error);
          return false;
        }
      },
      async processAudio(audioData) {
        // This would process audio data in a real implementation
        return await gemini.processAudio(audioData);
      }
    };
    
    // Store agent in our map
    agents.set(agentId, agent);
    
    return agent;
  } catch (error) {
    console.error(`Error creating agent:`, error);
    throw error;
  }
}

/**
 * Lists all active agents
 * @returns {Array} Array of agent objects
 */
function listAgents() {
  return Array.from(agents.values()).map(agent => ({
    id: agent.id,
    roomName: agent.roomName,
    roomUrl: agent.roomUrl,
    userName: agent.userName,
    role: agent.role,
    status: agent.status,
    startTime: agent.startTime
  }));
}

/**
 * Get an agent by ID
 * @param {string} agentId - The agent ID to get
 * @returns {Object|null} Agent object or null if not found
 */
function getAgent(agentId) {
  return agents.get(agentId) || null;
}

/**
 * Stop and remove an agent
 * @param {string} agentId - The agent ID to stop
 * @returns {boolean} True if successful, false otherwise
 */
async function stopAgent(agentId) {
  try {
    const agent = agents.get(agentId);
    if (!agent) {
      return false;
    }
    
    // Try to leave the room gracefully
    await agent.leave();
    
    // Clean up resources
    if (agent.gemini) {
      await agent.gemini.close();
    }
    
    // Remove from our map
    agents.delete(agentId);
    
    return true;
  } catch (error) {
    console.error(`Error stopping agent ${agentId}:`, error);
    return false;
  }
}

// Export the agent API
module.exports = {
  createAgent,
  listAgents,
  getAgent,
  stopAgent,
  AGENT_ROLES
};
async function createAgent({ roomUrl, userName, role }) {
  try {
    console.log(`Creating agent with role: ${role} for room: ${roomUrl}`);
    
    // Generate unique ID for this agent
    const agentId = uuidv4();
    
    // Create a new Gemini Live instance for real-time conversation
    const gemini = new GeminiLive();
    
    // Initialize Gemini with the appropriate role prompt
    let rolePrompt = "";
    switch (role.toLowerCase()) {
      case AGENT_ROLES.LANGUAGE_PARTNER:
        rolePrompt = `You are a helpful language conversation partner. 
        Engage in natural conversation with the user to help them practice speaking. 
        Keep your responses brief and conversational. Ask follow-up questions 
        to keep the conversation flowing naturally. You are speaking directly to them 
        in a video call, so be friendly and supportive.`;
        break;
      case AGENT_ROLES.INTERVIEW_COACH:
        rolePrompt = `You are an interview coach helping the user practice job interviews. 
        Ask relevant interview questions and provide constructive feedback on their responses. 
        Keep your responses professional but supportive.`;
        break;
      case AGENT_ROLES.PRONUNCIATION_TUTOR:
        rolePrompt = `You are a pronunciation tutor helping the user improve their speaking. 
        Focus on clear pronunciation, rhythm, and intonation. Provide gentle corrections 
        when needed, and encourage the user's progress.`;
        break;
      default:
        rolePrompt = `You are a helpful conversation assistant. Engage in natural conversation 
        with the user to help them practice speaking. Keep your responses brief and to the point.`;
    await page.addScriptTag({ url: 'https://unpkg.com/@daily-co/daily-js' });
    
    // Enable all needed permissions
    await page.evaluateOnNewDocument(() => {
      // Auto-grant all necessary permissions
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters) => {
        if (['camera', 'microphone', 'speaker', 'audio-capture', 'audio-output'].includes(parameters.name)) {
          return Promise.resolve({ state: 'granted' });
        }
        return originalQuery(parameters);
      };
      
      // Override getUserMedia to always succeed
      const originalGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
      navigator.mediaDevices.getUserMedia = async (constraints) => {
        try {
          return await originalGetUserMedia(constraints);
        } catch (e) {
          // Create empty audio tracks if needed
          const tracks = [];
          if (constraints.audio) {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = ctx.createOscillator();
            const dst = oscillator.connect(ctx.createMediaStreamDestination());
            oscillator.start();
            const audioTrack = dst.stream.getAudioTracks()[0];
            tracks.push(audioTrack);
          }
          if (constraints.video) {
            const canvas = document.createElement('canvas');
            canvas.width = 640;
            canvas.height = 480;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = 'green';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            const stream = canvas.captureStream(25); // 25 FPS
            const videoTrack = stream.getVideoTracks()[0];
            tracks.push(videoTrack);
          }
          return new MediaStream(tracks);
        }
      };
    });
    
    // Load Daily.co meeting URL if provided, otherwise use the token service to create one
    if (!roomUrl) {
      // Use token service to create a room
      const tokenServiceUrl = process.env.DAILY_TOKEN_SERVICE_URL || 'http://localhost:3003';
      console.log(`Creating room via token service: ${tokenServiceUrl}`);
      
      const response = await fetch(`${tokenServiceUrl}/api/room`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.DAILY_API_KEY}`
        },
        body: JSON.stringify({ name: roomName })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create room: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      roomUrl = data.url;
      console.log(`Room created: ${roomUrl}`);
    }
    
    // Initialize Gemini Live with Flash model for real-time processing
    const gemini = new GeminiLive({
      role: role,
      agentId: agentId,
      apiKey: process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY
    });
    
    // Initialize the audio stream connection
    await gemini.initializeAudioStream();
    
    // Wait for the stream to be ready
    const streamReadyPromise = new Promise(resolve => {
      gemini.once('stream-ready', () => {
        console.log('Gemini audio stream is ready');
        resolve();
      });
    });
    
    // Navigate to the Daily.co room URL
    await page.goto(roomUrl);
    
    // Wait for the stream to be ready before continuing
    await streamReadyPromise;
    
    // Set up real-time audio processing
    await page.evaluate(async (agentName) => {
      window.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      window.audioWorkletSupported = !!window.audioContext.audioWorklet;
      window.audioChunks = [];
      window.isCapturing = false;
      window.processorNode = null;
      
      // Create the Daily.co call object
      window.callFrame = window.DailyIframe.createFrame({
        showLeaveButton: false,
        showFullscreenButton: false,
        iframeStyle: {
          position: 'fixed',
          width: '100%',
          height: '100%',
          border: 'none',
        },
      });
      
      // Join the meeting
      await window.callFrame.join({
        url: window.location.href,
        userName: agentName,
        // Enable media
        audioSource: true, // Use audio
        videoSource: false, // No video for the bot
      });
      
      // Set up audio processing worklet for real-time streaming
      const setupAudioProcessing = async () => {
        if (window.audioWorkletSupported) {
          // Create an audio processor that captures chunks
          const workletCode = `
            class AudioStreamProcessor extends AudioWorkletProcessor {
              constructor() {
                super();
                this.bufferSize = 4096;
                this.buffer = new Float32Array(this.bufferSize);
                this.bufferIndex = 0;
              }
              
              process(inputs, outputs, parameters) {
                const input = inputs[0];
                if (input && input.length > 0) {
                  const samples = input[0];
                  if (samples) {
                    // Add samples to buffer
                    for (let i = 0; i < samples.length; i++) {
                      this.buffer[this.bufferIndex++] = samples[i];
                      
                      // If buffer is full, send it
                      if (this.bufferIndex >= this.bufferSize) {
                        // Convert to Int16 for better compatibility
                        const int16Buffer = new Int16Array(this.bufferSize);
                        for (let j = 0; j < this.bufferSize; j++) {
                          int16Buffer[j] = Math.max(-32768, Math.min(32767, this.buffer[j] * 32768));
                        }
                        
                        // Send buffer to main thread
                        this.port.postMessage({type: 'audioChunk', data: int16Buffer});
                        this.bufferIndex = 0;
                      }
                    }
                  }
                }
                return true;
              }
            }
            
            registerProcessor('audio-stream-processor', AudioStreamProcessor);
          `;
          
          // Create a blob URL for the worklet code
          const blob = new Blob([workletCode], { type: 'application/javascript' });
          const workletUrl = URL.createObjectURL(blob);
          
          // Add the worklet module
          await window.audioContext.audioWorklet.addModule(workletUrl);
          console.log('Audio worklet loaded');
        }
      };
      
      // Set up an audio stream capture from Daily.co
      const setupAudioCapture = async () => {
        // Get the audio track from our Daily call
        const participants = window.callFrame.participants();
        const streams = [];
        
        for (const [id, participant] of Object.entries(participants)) {
          // Skip local participant (agent itself)
          if (participant.local || !participant.audioTrack) continue;
          
          if (participant.audioTrack) {
            // Create a stream from this audio track
            const audioTrack = participant.audioTrack;
            const mediaStream = new MediaStream([audioTrack]);
            streams.push({ 
              stream: mediaStream, 
              userName: participant.user_name || 'Unknown' 
            });
          }
        }
        
        // Process all streams
        for (const { stream, userName } of streams) {
          // Create a source from the MediaStream
          const source = window.audioContext.createMediaStreamSource(stream);
          
          // Create processor node
          if (window.audioWorkletSupported) {
            window.processorNode = new AudioWorkletNode(window.audioContext, 'audio-stream-processor');
            
            // Handle audio chunks from the processor
            window.processorNode.port.onmessage = (event) => {
              if (event.data.type === 'audioChunk') {
                // Send audio data to Node.js
                const buffer = event.data.data;
                window.sendAudioToGemini(Array.from(buffer));
              }
            };
            
            // Connect the source to the processor
            source.connect(window.processorNode);
            window.processorNode.connect(window.audioContext.destination);
            console.log(`Started capturing audio from ${userName}`);
          } else {
            // Fallback for browsers without worklet support
            const scriptNode = window.audioContext.createScriptProcessor(4096, 1, 1);
            scriptNode.onaudioprocess = (audioProcessingEvent) => {
              const inputBuffer = audioProcessingEvent.inputBuffer;
              const samples = inputBuffer.getChannelData(0);
              
              // Convert to Int16 for better compatibility
              const int16Buffer = new Int16Array(samples.length);
              for (let i = 0; i < samples.length; i++) {
                int16Buffer[i] = Math.max(-32768, Math.min(32767, samples[i] * 32768));
              }
              
              // Send audio data to Node.js
              window.sendAudioToGemini(Array.from(int16Buffer));
            };
            
            source.connect(scriptNode);
            scriptNode.connect(window.audioContext.destination);
            console.log(`Started capturing audio from ${userName} (fallback method)`);
          }
          
          window.isCapturing = true;
        }
      };
      
      // Set up real-time audio processing when tracks start
      window.callFrame.on('track-started', async (event) => {
        if (event.track.kind === 'audio' && !event.participant.local) {
          console.log(`Audio track started from ${event.participant.user_name}`);
          
          // Initialize audio processing if needed
          if (!window.isCapturing) {
            await setupAudioProcessing();
            await setupAudioCapture();
          }
        }
      });
      
      // Also capture audio when new participants join
      window.callFrame.on('participant-joined', async (event) => {
        console.log(`Participant joined: ${event.participant.user_name}`);
        
        // Small delay to ensure audio tracks are available
        setTimeout(async () => {
          if (!window.isCapturing) {
            await setupAudioProcessing();
            await setupAudioCapture();
          }
        }, 1000);
      });
      
      // Handle when participants leave
      window.callFrame.on('participant-left', (event) => {
        console.log(`Participant left: ${event.participant.user_name}`);
      });
      
      // Function to play audio received from Gemini
      window.playAudioFromGemini = (audioBase64) => {
        try {
          // Convert base64 to ArrayBuffer
          const binaryString = atob(audioBase64);
          const len = binaryString.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          
          // Decode audio data
          window.audioContext.decodeAudioData(bytes.buffer, (buffer) => {
            // Create audio source
            const source = window.audioContext.createBufferSource();
            source.buffer = buffer;
            source.connect(window.audioContext.destination);
            source.start(0);
          }, (error) => {
            console.error('Error decoding audio data:', error);
          });
        } catch (error) {
          console.error('Error playing audio:', error);
        }
      };
      
      // Function to send text messages to the room
      window.sendMessage = (text) => {
        window.callFrame.sendAppMessage({ type: 'ai-response', text }, '*');
      };
      
      // Function to leave the call
      window.leaveCall = () => {
        if (window.processorNode) {
          window.processorNode.disconnect();
        }
        if (window.audioContext) {
          window.audioContext.close();
        }
        window.callFrame.leave();
        window.isCapturing = false;
      };
    }, userName);
    
    // Set up communication between browser and Node.js
    await page.exposeFunction('sendAudioToGemini', async (audioData) => {
      try {
        // Convert array back to Buffer
        const buffer = Buffer.from(new Int16Array(audioData).buffer);
        await gemini.sendAudio(buffer);
      } catch (error) {
        console.error('Error sending audio to Gemini:', error);
      }
    });
    
    // Handle text responses from Gemini
    gemini.on('response', async (text) => {
      await page.evaluate((responseText) => {
        window.sendMessage(responseText);
      }, text);
    });
    
    // Handle audio responses from Gemini
    gemini.on('audio-response', async (audioContent) => {
      await page.evaluate((audioData) => {
        window.playAudioFromGemini(audioData);
      }, audioContent);
    });
    
    // Store the agent instance
    const agent = {
      id: agentId,
      roomName: roomName,
      roomUrl: roomUrl,
      userName: userName,
      role: role,
      browser: browser,
      page: page,
      gemini: gemini,
      createdAt: new Date(),
      stop: async () => {
        try {
          await page.evaluate(() => {
            window.leaveCall();
          });
          await gemini.close();
          await browser.close();
          agents.delete(agentId);
          console.log(`Agent ${agentId} stopped.`);
        } catch (error) {
          console.error(`Error stopping agent ${agentId}:`, error);
        }
      }
    };
    
    agents.set(agentId, agent);
    return agent;
// This is a complete function block to replace the standalone catch block
try {
  // Placeholder to keep the try block from being empty
  console.log('Agent creation successful');
} catch (error) {
  console.error(`Error creating agent:`, error);
  throw error;
}
}

/**
 * Lists all active agents
 * @returns {Array} Array of agent objects
 */
function listAgents() {
  return Array.from(agents.values()).map(agent => ({
    id: agent.id,
    roomName: agent.roomName,
    roomUrl: agent.roomUrl,
    userName: agent.userName,
    role: agent.role,
    createdAt: agent.createdAt
  }));
}

/**
 * Stops and removes an agent
 * @param {string} agentId - ID of the agent to stop
 * @returns {boolean} Success status
 */
async function stopAgent(agentId) {
  if (!agents.has(agentId)) {
    throw new Error(`Agent ${agentId} not found`);
  }
  
  const agent = agents.get(agentId);
  await agent.stop();
  return true;
}

module.exports = {
  createAgent,
  listAgents,
  stopAgent
};
