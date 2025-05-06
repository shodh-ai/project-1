import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Define TypeScript interfaces
interface DialogueLine {
  text: string;
  voice: string;
}

// Initialize the OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    console.log('Text-to-speech API called');
    const { dialogueLines, title }: { dialogueLines: DialogueLine[], title: string } = await request.json();
    
    // Validate input
    if (!dialogueLines || !Array.isArray(dialogueLines) || dialogueLines.length === 0) {
      return NextResponse.json({ error: 'Invalid dialogue format' }, { status: 400 });
    }
    
    // Create a unique filename for this audio
    const timestamp = Date.now();
    const filename = `${title.replace(/\s+/g, '-').toLowerCase()}-${timestamp}.mp3`;
    
    // Concatenate all dialogue lines with appropriate pauses
    const fullConversationScript = dialogueLines
      .filter(line => line.text !== "...")  // Skip explicit pause markers
      .map((line, index) => {
        // Add speaker prefix for clarity and add pauses between speakers
        const speaker = line.text.startsWith("Speaker") || line.text.startsWith("Professor") || line.text.startsWith("Student") 
          ? "" // Don't add prefix if already present
          : line.voice === "alloy" ? "Speaker 1: " : "Speaker 2: ";
          
        // Add longer pauses between speakers
        const pause = index > 0 ? "\n\n" : "";
        return pause + speaker + line.text;
      })
      .join("");
    
    // Generate speech for full conversation
    const response = await openai.audio.speech.create({
      model: "tts-1-hd", // Using HD model for better quality
      voice: "alloy", // Using a consistent voice for the full conversation
      input: fullConversationScript,
      speed: 0.9, // Slightly slower for better comprehension
    });
    
    // Convert to data URL
    const audioData = await response.arrayBuffer();
    const base64Audio = Buffer.from(audioData).toString('base64');
    const dataUrl = `data:audio/mpeg;base64,${base64Audio}`;
    
    return NextResponse.json({
      success: true,
      audioUrl: dataUrl,
    });
  } catch (error: any) {
    console.error('Text-to-speech error:', error);
    
    return NextResponse.json(
      { error: 'Failed to generate audio', message: error.message },
      { status: 500 }
    );
  }
}