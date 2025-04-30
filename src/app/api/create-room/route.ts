import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

// Environment variables
const DAILY_API_KEY = process.env.DAILY_API_KEY;
const DAILY_DOMAIN = process.env.DAILY_DOMAIN || 'shodhai.daily.co';

export async function POST(req: NextRequest) {
  let roomName = '';
  
  try {
    const body = await req.json();
    roomName = body.roomName;

    if (!roomName) {
      return NextResponse.json({ error: 'Room name is required' }, { status: 400 });
    }

    if (!DAILY_API_KEY) {
      return NextResponse.json({ error: 'DAILY_API_KEY is not set' }, { status: 500 });
    }

    console.log(`Creating room with name: ${roomName}`);

    // Make request to Daily.co API to create a room
    const response = await axios.post(
      `https://api.daily.co/v1/rooms`,
      {
        name: roomName,
        properties: {
          enable_chat: true,
          enable_knocking: false,
          enable_network_ui: false,
          enable_prejoin_ui: false,
          start_audio_off: false,
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DAILY_API_KEY}`
        }
      }
    );

    console.log('Room creation response:', response.data);

    // Return the room URL and name
    return NextResponse.json({ 
      url: response.data.url,
      name: response.data.name,
      roomData: response.data
    });
  } catch (error: any) {
    console.error('Error creating room:', error.response?.data || error.message);
    
    // Handle the case where the room already exists
    if (error.response?.status === 409) {
      // Room already exists, return a URL for it
      return NextResponse.json({ 
        url: `https://${DAILY_DOMAIN}/${roomName}`,
        name: roomName,
        existing: true
      });
    }
    
    return NextResponse.json(
      { error: `Failed to create room: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}
