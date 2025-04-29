'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getDailyRoomUrl, getGeminiAPIKey } from './client';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Context type definition
interface DailyGeminiContextType {
  roomUrl: string | null;
  isReady: boolean;
  error: Error | null;
  geminiModel: any | null;
  roomName: string | null;
  createRoom: (roomName: string) => Promise<string>;
  leaveRoom: () => void;
  sendGeminiPrompt: (prompt: string, imageData?: string) => Promise<string>;
}

// Create the context with a default value
const DailyGeminiContext = createContext<DailyGeminiContextType>({
  roomUrl: null,
  isReady: false,
  error: null,
  geminiModel: null,
  roomName: null,
  createRoom: async () => '',
  leaveRoom: () => {},
  sendGeminiPrompt: async () => '',
});

// Props for the provider component
interface PipecatProviderProps {
  children: ReactNode;
}

// The actual provider component
export function PipecatProvider({ children }: PipecatProviderProps) {
  const [roomUrl, setRoomUrl] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [geminiModel, setGeminiModel] = useState<any>(null);
  const [roomName, setRoomName] = useState<string | null>(null);

  // Initialize Gemini API
  useEffect(() => {
    const initializeGemini = async () => {
      try {
        // Get Gemini API key
        const apiKey = getGeminiAPIKey();
        
        // Initialize Gemini
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
        
        setGeminiModel(model);
        setIsReady(true);
      } catch (err) {
        console.error('Failed to initialize Gemini:', err);
        setError(err instanceof Error ? err : new Error('Unknown error initializing Gemini'));
      }
    };

    initializeGemini();
  }, []);

  // Function to create and join a room
  const createRoom = async (name: string): Promise<string> => {
    try {
      const url = await getDailyRoomUrl(name);
      setRoomUrl(url);
      setRoomName(name);
      return url;
    } catch (err) {
      console.error('Failed to create room:', err);
      setError(err instanceof Error ? err : new Error('Failed to create room'));
      throw err;
    }
  };

  // Function to leave the current room
  const leaveRoom = () => {
    setRoomUrl(null);
    setRoomName(null);
  };

  // Function to send a prompt to Gemini
  const sendGeminiPrompt = async (prompt: string, imageData?: string): Promise<string> => {
    if (!geminiModel) {
      throw new Error('Gemini model not initialized');
    }
    
    try {
      let response;
      
      if (imageData) {
        // If image data is provided, use multimodal generation
        response = await geminiModel.generateContent([
          prompt,
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: imageData
            }
          }
        ]);
      } else {
        // Text-only generation
        response = await geminiModel.generateContent(prompt);
      }
      
      const result = await response.response;
      return result.text();
    } catch (err) {
      console.error('Error calling Gemini API:', err);
      throw err;
    }
  };

  // Create the context value
  const contextValue: DailyGeminiContextType = {
    roomUrl,
    isReady,
    error,
    geminiModel,
    roomName,
    createRoom,
    leaveRoom,
    sendGeminiPrompt,
  };

  // Return the context provider with the calculated value
  return (
    <DailyGeminiContext.Provider value={contextValue}>
      {children}
    </DailyGeminiContext.Provider>
  );
}

// Custom hook to use the Daily+Gemini context
export const usePipecat = () => useContext(DailyGeminiContext);
