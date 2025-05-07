import { useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import { useSession } from 'next-auth/react';

export type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
};

export function useRoxAssistant() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { data: session } = useSession();

  // Load conversation history from localStorage on initial load
  useEffect(() => {
    const savedMessages = localStorage.getItem('roxConversation');
    if (savedMessages) {
      try {
        setMessages(JSON.parse(savedMessages));
      } catch (e) {
        console.error('Failed to parse stored conversation:', e);
        // If parsing fails, just start with an empty conversation
      }
    }
  }, []);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('roxConversation', JSON.stringify(messages));
    }
  }, [messages]);

  // Function to send message to Rox
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Add user message to state
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content,
        timestamp: new Date()
      };
      
      setMessages(prevMessages => [...prevMessages, userMessage]);
      
      // Format conversation history for API
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      
      // Send request to backend
      const response = await axios.post('/api/rox-assistant', {
        message: content,
        conversationHistory,
        userId: session?.user?.id // Pass user ID if available
      });
      
      // Add assistant's response to state
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.data.response,
        timestamp: new Date()
      };
      
      setMessages(prevMessages => [...prevMessages, assistantMessage]);
      
    } catch (err) {
      console.error('Error sending message to Rox:', err);
      setError('Failed to get response from Rox. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [messages, session]);
  
  // Clear conversation history
  const clearConversation = useCallback(() => {
    setMessages([]);
    localStorage.removeItem('roxConversation');
  }, []);

  return {
    messages,
    sendMessage,
    clearConversation,
    isLoading,
    error
  };
}