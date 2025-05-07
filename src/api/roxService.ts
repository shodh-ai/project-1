import axios from 'axios';
import type { NextApiRequest, NextApiResponse } from 'next';

// Type definitions
export type Message = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type ConversationContext = {
  userName?: string;
  userProgress?: any[];
  nextTask?: any;
  vocabWords?: any[];
  speakingTopics?: any[];
};

// System message template that describes Rox's capabilities and personality
const getSystemMessage = (context: ConversationContext): Message => {
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
For technical app issues, direct users to contact support@toeflapprox.com.`
  };
};

// Class to handle OpenAI API interactions
export class RoxAIService {
  private apiKey: string;
  private apiUrl: string = 'https://api.openai.com/v1/chat/completions';
  private model: string = 'gpt-4-turbo';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  // Get chat completion from OpenAI API
  async getChatCompletion(messages: Message[]): Promise<string> {
    try {
      const response = await axios.post(
        this.apiUrl,
        {
          model: this.model,
          messages: messages,
          temperature: 0.7,
          max_tokens: 500,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      );

      return response.data.choices[0].message.content;
    } catch (error) {
      console.error('Error calling OpenAI API:', error);
      throw new Error('Failed to get response from AI assistant');
    }
  }
}

// Create instance with API key (in a real app, use environment variables)
let roxAIService: RoxAIService;

// Initialize the service
const initializeRoxService = () => {
  if (!roxAIService) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('Missing OpenAI API key');
    }
    roxAIService = new RoxAIService(apiKey);
  }
  return roxAIService;
};

export default initializeRoxService;