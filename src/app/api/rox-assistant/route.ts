import { NextRequest, NextResponse } from 'next/server';
import initializeRoxService, { Message, ConversationContext } from '@/api/roxService';
import userProgressApi from '@/api/userProgressService';
import contentApi from '@/api/contentService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, conversationHistory = [], userId } = body;

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Initialize the service
    const roxService = initializeRoxService();

    // Gather user context if userId is provided
    let context: ConversationContext = {};
    
    if (userId) {
      try {
        // Get user data - these methods don't take parameters
        const userProfile = await userProgressApi.getUserProfile();
        const userProgress = await userProgressApi.getUserProgress();
        const nextTask = await userProgressApi.getNextTask();
        
        // Get content samples for context - these methods take parameters
        const vocabSamples = ['ubiquitous', 'ameliorate', 'ephemeral', 'serendipity']; 
        const vocabPromises = vocabSamples.map(wordId => contentApi.getVocabWord(wordId));
        const vocabWords = await Promise.all(vocabPromises.map(p => p.catch(() => null))).then(results => results.filter(Boolean));
        
        const topicSamples = ['topic-daily-routine', 'topic-climate-change', 'topic-technology'];
        const topicPromises = topicSamples.map(topicId => contentApi.getSpeakingTopic(topicId));
        const speakingTopics = await Promise.all(topicPromises.map(p => p.catch(() => null))).then(results => results.filter(Boolean));
        
        context = {
          userName: userProfile?.name,
          userProgress,
          nextTask,
          vocabWords,
          speakingTopics
        };
      } catch (error) {
        console.error('Error fetching user context:', error);
        // Continue without context if there's an error
      }
    }

    // Prepare messages for the API call
    const systemMessage = getSystemMessage(context);
    
    // Parse conversation history
    const historyMessages: Message[] = conversationHistory.map((item: any) => ({
      role: item.role,
      content: item.content
    }));
    
    // Add current message
    const userMessage: Message = {
      role: 'user',
      content: message
    };
    
    // Combine all messages
    const messages: Message[] = [systemMessage, ...historyMessages, userMessage];
    
    // Get response from OpenAI
    const response = await roxService.getChatCompletion(messages);
    
    // Return the assistant's response
    return NextResponse.json({ 
      response,
      context // Optionally return context for frontend to use
    });
    
  } catch (error) {
    console.error('Error in Rox Assistant API:', error);
    return NextResponse.json({ error: 'Failed to get response from assistant' }, { status: 500 });
  }
}

// Helper function to get system message
function getSystemMessage(context: ConversationContext): Message {
  return {
    role: 'system',
    content: `You are Rox, an AI assistant specialized in TOEFL preparation. You are friendly, encouraging, and have expertise in all TOEFL sections: Reading, Listening, Speaking, and Writing.

User information:
- Name: ${context.userName || 'Student'}
${context.userProgress ? `- Completed tasks: ${context.userProgress.length}` : ''}
${context.nextTask ? `- Next recommended task: ${context.nextTask.taskType} on ${context.nextTask.contentRefId}` : ''}

Your main responsibilities are:
1. Answering questions about TOEFL test format, structure, and scoring
2. Providing study tips and strategies for all sections
3. Explaining grammar rules and vocabulary
4. Guiding users through the app's features
5. Motivating students with encouragement and study plans

Always maintain a supportive and positive tone. Keep responses concise but helpful.
For technical app issues, direct users to contact support@toeflapprox.com.

TOEFL expertise:
- Reading: You can explain question types, time management, and comprehension strategies.
- Listening: You can cover note-taking techniques, understanding spoken English, and handling different accent types.
- Speaking: You can guide on the 4 speaking tasks, providing templates and evaluation criteria.
- Writing: You can help with the integrated and independent writing tasks, essay structure, and common mistakes.

Vocabulary: You're familiar with academic vocabulary commonly tested on TOEFL.
Grammar: You can explain grammar rules relevant to TOEFL tasks.`
  };
}