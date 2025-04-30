/**
 * Daily.co API client for token service
 */

// Default URL for the token service
const DAILY_TOKEN_SERVICE_URL = process.env.NEXT_PUBLIC_DAILY_TOKEN_SERVICE_URL || 'http://localhost:3003';

/**
 * Create a Daily.co room
 * @param name Optional room name, will be auto-generated if not provided
 * @returns The room information including URL
 */
export async function createDailyRoom(name?: string): Promise<{ url: string; room: any }> {
  try {
    const queryParams = name ? `?name=${encodeURIComponent(name)}` : '';
    const response = await fetch(`${DAILY_TOKEN_SERVICE_URL}/api/room${queryParams}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.NEXT_PUBLIC_API_KEY || 'dev-key',
        'Authorization': `Bearer ${process.env.DAILY_API_KEY || process.env.PIPECAT_API_KEY || 'b352b6173857ead633c09f16e8ba35d9ff9bd6a7bff7bd8d84f609331e671541'}`,
      },
    });
    
    // Log debug info in development
    if (process.env.NODE_ENV !== 'production') {
      console.log(`Daily API request to: ${DAILY_TOKEN_SERVICE_URL}/api/room${queryParams}`);
      console.log(`API Key used: ${(process.env.NEXT_PUBLIC_API_KEY || 'dev-key').substring(0, 4)}***`);
    }

    if (!response.ok) {
      // Try to parse error data
      try {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to create Daily.co room: ${response.status}`);
      } catch (jsonError) {
        // If JSON parsing fails, throw with status code
        throw new Error(`Failed to create Daily.co room: ${response.status}`);
      }
    }
    
    // Parse response data once
    const data = await response.json();
    
    // Log success response in development
    if (process.env.NODE_ENV !== 'production') {
      console.log('Daily.co room created successfully:', data);
    }

    return data;
  } catch (error) {
    console.error('Error creating Daily.co room:', error);
    throw error;
  }
}

/**
 * Generate a Daily.co token for a room
 * @param room Room name
 * @param username Username for the participant
 * @returns The token and room URL
 */
export async function generateDailyToken(
  room: string,
  username: string
): Promise<{ token: string; roomUrl: string }> {
  try {
    const response = await fetch(
      `${DAILY_TOKEN_SERVICE_URL}/api/token?room=${encodeURIComponent(room)}&username=${encodeURIComponent(username)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.NEXT_PUBLIC_API_KEY || 'dev-key',
          'Authorization': `Bearer ${process.env.DAILY_API_KEY || process.env.PIPECAT_API_KEY || 'b352b6173857ead633c09f16e8ba35d9ff9bd6a7bff7bd8d84f609331e671541'}`,
        },
      }
    );
    
    // Log debug info in development
    if (process.env.NODE_ENV !== 'production') {
      console.log(`Daily API token request for room: ${room}, user: ${username}`);
    }

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to generate Daily.co token');
    }

    return await response.json();
  } catch (error) {
    console.error('Error generating Daily.co token:', error);
    throw error;
  }
}

/**
 * Check if the token service is available
 * @returns True if the token service is available
 */
export async function checkDailyTokenService(): Promise<boolean> {
  try {
    const response = await fetch(`${DAILY_TOKEN_SERVICE_URL}/health`, {
      method: 'GET',
    });

    return response.ok;
  } catch (error) {
    console.error('Daily.co token service is not available:', error);
    return false;
  }
}
