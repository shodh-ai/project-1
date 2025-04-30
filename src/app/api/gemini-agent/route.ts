import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

// Add detailed debug logging
const debug = (...args: any[]) => {
  console.log('[GEMINI-AGENT]', ...args);
};

// Environment variables
const DAILY_API_KEY = process.env.DAILY_API_KEY;
const DAILY_DOMAIN = process.env.DAILY_DOMAIN || 'shodhai.daily.co';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function POST(req: NextRequest) {
  try {
    const { roomUrl, prompt } = await req.json();

    if (!roomUrl) {
      return NextResponse.json({ error: 'Room URL is required' }, { status: 400 });
    }

    if (!DAILY_API_KEY) {
      return NextResponse.json({ error: 'DAILY_API_KEY is not set' }, { status: 500 });
    }

    if (!GEMINI_API_KEY) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not set' }, { status: 500 });
    }

    debug(`Creating Gemini agent for room: ${roomUrl}`);
    debug(`Using API keys: DAILY=${DAILY_API_KEY ? 'present' : 'missing'}, GEMINI=${GEMINI_API_KEY ? 'present' : 'missing'}`);

    // Extract room name from URL
    const roomName = roomUrl.split('/').pop() || '';
    debug(`Extracted room name: ${roomName}`);
    
    // Get a Daily token for the Gemini agent
    const tokenResponse = await axios.post(
      `https://api.daily.co/v1/meeting-tokens`,
      {
        properties: {
          room_name: roomName,
          is_owner: false,
          user_name: 'Gemini AI Assistant',
          start_audio_off: false,
          start_video_off: true,
          exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DAILY_API_KEY}`
        }
      }
    );

    const token = tokenResponse.data.token;
    
    // Call the Pipecat/Daily Gemini agent service
    debug('Calling Pipecat Gemini agent API');
    const agentResponse = await axios.post(
      `https://api.daily.co/v1/gemini-agent`, // Use standard Daily API URL
      {
        room_url: roomUrl,
        token: token,
        gemini_key: GEMINI_API_KEY,
        model: 'gemini-2.0-flash-live-001',
        prompt: prompt,
        config: {
          speechToText: true,
          textToSpeech: true,
          streaming: true,
          multimodal: true
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DAILY_API_KEY}`
        }
      }
    );

    return NextResponse.json({ 
      success: true,
      agentId: agentResponse.data.agent_id || 'unknown',
      message: 'Gemini agent started successfully'
    });
  } catch (error: any) {
    debug('Error creating Gemini agent:', error);
    debug('Response data:', error.response?.data);
    debug('Error message:', error.message);
    
    // Try falling back to a simpler implementation using the browser's speech synthesis and recognition
    // This is for development/testing when direct API calls fail
    return NextResponse.json({
      success: false,
      fallback: true,
      error: error.message,
      message: 'Failed to create Gemini agent. Using browser-based fallback.'
    });
    
    /* Commenting out the proxy approach for now
    try {
      const { roomUrl, prompt } = await req.json();
      const dailyAgentServer = process.env.DAILY_AGENT_SERVER || 'http://localhost:3004';
      const proxyResponse = await axios.post(`${dailyAgentServer}/agents`, {
        roomUrl: roomUrl,
        userName: 'Gemini AI Assistant',
        prompt: prompt
      });
      
      return NextResponse.json({ 
        success: true,
        proxied: true,
        agentId: proxyResponse.data.agentId || 'unknown',
        message: 'Gemini agent started via proxy'
      });
    } catch (proxyError) {
      debug('Error with proxy agent creation:', proxyError);
      
      return NextResponse.json(
        { 
          error: `Failed to create Gemini agent: ${error instanceof Error ? error.message : String(error)}`,
          details: error.response?.data
        },
        { status: 500 }
      );
    }
    */
  }
}
