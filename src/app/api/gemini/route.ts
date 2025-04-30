import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Add detailed debug logging
const debug = (...args: any[]) => {
  console.log('[GEMINI-API]', ...args);
};

// Initialize the Google Generative AI client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY || '');

export async function POST(req: NextRequest) {
  try {
    const { prompt, context, selectedTopic } = await req.json();
    
    debug(`Received request with prompt: "${prompt}", context length: ${context?.length || 0}`);
    debug(`Selected topic: ${selectedTopic || 'none'}`);
    

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // Create a model instance
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Construct a system prompt for speaking practice
    const systemPrompt = `You are a conversational AI assistant named Gemini, helping a student practice English speaking for the TOEFL exam.
${selectedTopic ? `The student is discussing this topic: "${selectedTopic}"` : ''}
${context ? `Previous conversation: ${context}` : ''}
Keep your responses natural, conversational, and at an appropriate length for a speaking practice session (under 2-3 sentences when possible).
Ask follow-up questions occasionally to engage the student.
Provide gentle corrections if there are obvious English errors, but focus more on encouraging fluent conversation.
Respond to: "${prompt}"`;

    // Generate text with the model
    debug('Sending prompt to Gemini API');
    const result = await model.generateContent(systemPrompt);
    const text = result.response.text();
    debug(`Got response: "${text.substring(0, 100)}${text.length > 100 ? '...' : ''}"`);

    return NextResponse.json({ text });
  } catch (error) {
    debug('Error generating content with Gemini:', error);
    return NextResponse.json(
      { 
        error: `Failed to generate content: ${error instanceof Error ? error.message : String(error)}`,
        text: 'I apologize, but I had trouble processing that. Could you please try again?'
      },
      { status: 500 }
    );
  }
}
