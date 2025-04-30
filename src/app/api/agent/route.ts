import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  try {
    const { roomUrl, userName, useSimpleAgent } = await req.json();
    
    if (!roomUrl) {
      return NextResponse.json({ error: 'Room URL is required' }, { status: 400 });
    }
    
    // Generate a unique agent ID
    const agentId = uuidv4();
    
    // In a real implementation, this would connect to the Daily agent server
    // But for our direct implementation, we'll just return the agent ID
    console.log(`Creating agent ${agentId} for room ${roomUrl}`);
    
    return NextResponse.json({
      success: true,
      agentId,
      roomUrl,
      userName: userName || 'AI Conversation Partner'
    });
  } catch (error) {
    console.error('Error creating agent:', error);
    return NextResponse.json(
      { error: `Failed to create agent: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}
