// Daily.co client configuration

// This interface describes the structure of a Daily.co room
interface DailyRoom {
  id: string;
  name: string;
  url: string;
  created_at: string;
  config: {
    max_participants?: number;
    enable_chat?: boolean;
    enable_knocking?: boolean;
    [key: string]: any;
  };
}

// This function creates a Daily.co room through their API
export const createDailyRoom = async (roomName: string): Promise<DailyRoom> => {
  const apiKey = process.env.DAILY_API_KEY;
  
  if (!apiKey) {
    throw new Error('Daily API Key is required');
  }
  
  try {
    const response = await fetch('https://api.daily.co/v1/rooms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        name: roomName,
        properties: {
          enable_chat: true,
          enable_knocking: false,
          start_video_off: false,
          start_audio_off: false,
          max_participants: 10
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to create Daily room: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating Daily room:', error);
    throw error;
  }
};

// Function to get a room URL using the predefined URL or creating a new one
export const getDailyRoomUrl = async (customRoomName?: string): Promise<string> => {
  // Check if we have a sample room URL in the environment
  const sampleRoomUrl = process.env.DAILY_SAMPLE_ROOM_URL;
  
  if (sampleRoomUrl) {
    return sampleRoomUrl;
  }
  
  // If no sample URL is available, create a new room
  const roomName = customRoomName || `vocab-${Date.now()}`;
  const room = await createDailyRoom(roomName);
  return room.url;
};

// For client-side usage with Gemini integration
export const getGeminiAPIKey = (): string => {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error('Gemini API Key is required');
  }
  
  return apiKey;
};
