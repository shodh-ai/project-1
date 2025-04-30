import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// Generate a local dummy token for testing purposes
export async function POST(req: NextRequest) {
  try {
    const { sessionId } = await req.json();

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    // Create a simplified token structure for testing
    // In production, this should be a proper JWT signed with the Daily API key
    const now = Math.floor(Date.now() / 1000);
    const exp = now + 3600; // 1 hour from now
    
    const payload = {
      room_name: sessionId,
      user_name: "TOEFL Student",
      is_owner: true,
      iat: now,
      exp: exp
    };
    
    // Generate a random token
    const randomBytes = crypto.randomBytes(32).toString('base64');
    const token = `dev-${Buffer.from(JSON.stringify(payload)).toString('base64')}-${randomBytes}`;

    console.log('Generated token for session:', sessionId);
    return NextResponse.json({ token });
  } catch (error) {
    console.error('Error creating token:', error);
    return NextResponse.json(
      { error: `Failed to create token: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}
