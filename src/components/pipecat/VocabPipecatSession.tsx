'use client';

import React, { useState, useEffect } from 'react';
import { usePipecat } from '@/services/pipecat/PipecatProvider';
import GeminiLiveChat from './GeminiLiveChat';
import styles from './VocabPipecatSession.module.css';

interface VocabPipecatSessionProps {
  vocabularyWord: string;
  definition: string;
  userName?: string;
  onLeave?: () => void;
}

export default function VocabPipecatSession({
  vocabularyWord,
  definition,
  userName = 'Student',
  onLeave = () => {},
}: VocabPipecatSessionProps) {
  const { isReady, error, createRoom } = usePipecat();
  const [isLoading, setIsLoading] = useState(true);
  const [sessionError, setSessionError] = useState<Error | null>(null);
  const [generatedResponse, setGeneratedResponse] = useState<string>('');
  
  // Initialize the session
  useEffect(() => {
    const initSession = async () => {
      if (!isReady) return;
      
      try {
        setIsLoading(true);
        setSessionError(null);
        
        // Create a room name for this vocab session
        const roomName = `vocab-${vocabularyWord.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
        
        // Create the room
        await createRoom(roomName);
      } catch (err) {
        console.error('Failed to initialize session:', err);
        setSessionError(err instanceof Error ? err : new Error('Failed to initialize session'));
      } finally {
        setIsLoading(false);
      }
    };
    
    initSession();
  }, [isReady, vocabularyWord, createRoom]);
  
  // Handle when we receive a response from Gemini
  const handleResponseReceived = (response: string) => {
    setGeneratedResponse(response);
  };
  
  return (
    <div className={styles.container}>
      {/* Session header */}
      <div className={styles.header}>
        <h2 className={styles.title}>Learning: {vocabularyWord}</h2>
        <p className={styles.definition}>{definition}</p>
      </div>
      
      {/* Error state */}
      {(error || sessionError) && (
        <div className={styles.error}>
          <p className={styles.errorTitle}>Error:</p>
          <p>{error?.message || sessionError?.message}</p>
          <button
            onClick={onLeave}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md text-gray-800"
          >
            Go Back
          </button>
        </div>
      )}
      
      {/* Loading state */}
      {isLoading ? (
        <div className={styles.loading}>
          <div className={styles.loadingIndicator}>Preparing vocabulary session...</div>
        </div>
      ) : isReady ? (
        <div className={styles.contentContainer}>
          {/* Gemini AI Component - Clean and focused on image generation */}
          <GeminiLiveChat
            vocabularyWord={vocabularyWord}
            definition={definition}
            userName={userName}
            onResponseReceived={handleResponseReceived}
          />
          
          {/* Display area for response visualization */}
          {generatedResponse && (
            <div className={styles.responseDisplay}>
              <h3 className={styles.responseTitle}>AI Response:</h3>
              <div className={styles.responseContent}>
                {generatedResponse}
              </div>
            </div>
          )}
          
          <button
            onClick={onLeave}
            className="mt-4 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md text-gray-800"
          >
            Exit Session
          </button>
        </div>
      ) : (
        <div className={styles.warning}>
          <p>Unable to initialize Gemini AI session. Please try again later.</p>
        </div>
      )}
    </div>
  );
}
