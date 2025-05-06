import { NextResponse } from 'next/server';
import OpenAI from 'openai';

interface DialogueLine {
  text: string;
  voice: string;
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { dialogueLines, title }: { dialogueLines: DialogueLine[], title: string } = await request.json();
    
    if (!dialogueLines || !Array.isArray(dialogueLines) || dialogueLines.length === 0) {
      return NextResponse.json({ error: 'Invalid dialogue format' }, { status: 400 });
    }
    
    const timestamp = Date.now();
    const filename = `${title.replace(/\s+/g, '-').toLowerCase()}-${timestamp}.mp3`;
    
    const fullConversationScript = dialogueLines
      .filter(line => line.text !== "...")
      .map((line, index) => {
        const speaker = line.text.startsWith("Speaker") || line.text.startsWith("Professor") || line.text.startsWith("Student") 
          ? "" 
          : line.voice === "alloy" ? "Speaker 1: " : "Speaker 2: ";
          
        const pause = index > 0 ? "\n\n" : "";
        return pause + speaker + line.text;
      })
      .join("");
    
    const response = await openai.audio.speech.create({
      model: "tts-1-hd",
      voice: "alloy",
      input: fullConversationScript,
      speed: 0.9,
    });
    
    const audioData = await response.arrayBuffer();
    const base64Audio = Buffer.from(audioData).toString('base64');
    const dataUrl = `data:audio/mpeg;base64,${base64Audio}`;
    
    return NextResponse.json({
      success: true,
      audioUrl: dataUrl,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to generate audio', message: error.message },
      { status: 500 }
    );
  }
}