import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    // Get Gemini API key from environment variables
    const geminiApiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY;

    if (!geminiApiKey) {
      return NextResponse.json(
        { error: 'Gemini API key not found in environment variables' }, 
        { status: 500 }
      );
    }

    // Return the API key for client-side use
    return NextResponse.json({ key: geminiApiKey });
  } catch (error) {
    console.error('Error retrieving Gemini API key:', error);
    return NextResponse.json(
      { error: `Failed to retrieve Gemini API key: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}
