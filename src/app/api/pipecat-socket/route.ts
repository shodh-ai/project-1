import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { model, initialMessages, generationConfig } = await req.json();
    
    // Get environment variables
    const geminiApiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
    
    if (!geminiApiKey) {
      return NextResponse.json(
        { success: false, error: 'Gemini API key not found in environment variables' }, 
        { status: 500 }
      );
    }
    
    // For local development, we'll use a simulated WebSocket URL
    // In a production environment, this would be a real WebSocket endpoint
    // that connects to the Gemini Live API
    
    // Generate a unique session ID
    const sessionId = `gemini-live-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    // Create a WebSocket URL that includes the necessary parameters
    // This is a simulation for local development
    // In production, you'd have a real WebSocket server that uses this token and connects to Gemini
    const wsUrl = `wss://localhost:3000/ws/gemini-live?session=${sessionId}&key=${encodeURIComponent(geminiApiKey)}&model=${encodeURIComponent(model)}`;
    
    console.log(`Created WebSocket session: ${sessionId}`);
    
    return NextResponse.json({
      success: true,
      wsUrl,
      sessionId
    });
  } catch (error) {
    console.error('Error creating Pipecat WebSocket session:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: `Failed to create WebSocket session: ${error instanceof Error ? error.message : String(error)}` 
      },
      { status: 500 }
    );
  }
}
