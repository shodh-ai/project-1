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
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create Daily.co room');
    }

    return await response.json();
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
        },
      }
    );

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
