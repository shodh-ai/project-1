import { NextResponse } from 'next/server';

interface DialogueLine {
  text: string;
  voice: string;
}

export async function POST(request: Request) {
  try {
    const { dialogueLines, title }: { dialogueLines: DialogueLine[], title: string } = await request.json();
    
    if (!dialogueLines || !Array.isArray(dialogueLines) || dialogueLines.length === 0) {
      return NextResponse.json({ error: 'Invalid dialogue format' }, { status: 400 });
    }
    
    const timestamp = Date.now();
    const filename = `${title.replace(/\s+/g, '-').toLowerCase()}-${timestamp}.mp3`;
    
    // Format the conversation script
    const fullConversationScript = dialogueLines
      .filter(line => line.text !== "...")
      .map((line, index) => {
        const speakerPrefix = 
          line.text.startsWith("Speaker") || 
          line.text.startsWith("Professor") || 
          line.text.startsWith("Student") 
            ? "" 
            : ""; 
            
        const pause = index > 0 ? "\n\n" : "";
        return pause + speakerPrefix + line.text;
      })
      .join("");
    
    const response = await fetch('https://api.deepgram.com/v1/speak', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${process.env.DEEPGRAM_API_KEY || ''}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: fullConversationScript  // Only provide 'text' field
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Deepgram API error: ${response.status} ${errorData}`);
    }
    
    const audioData = await response.arrayBuffer();
    const base64Audio = Buffer.from(audioData).toString('base64');
    const dataUrl = `data:audio/mpeg;base64,${base64Audio}`;
    
    return NextResponse.json({
      success: true,
      audioUrl: dataUrl,
    });
  } catch (error: any) {
    console.error('Deepgram TTS error:', error);
    return NextResponse.json(
      { error: 'Failed to generate audio', message: error.message || 'Unknown error' },
      { status: 500 }
    );
  }
}