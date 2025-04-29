'use client';

import React, { useState, useRef, useEffect } from 'react';
import { usePipecat } from '@/services/pipecat/PipecatProvider';
import { SendHorizontal, Loader2 } from 'lucide-react';
import styles from './GeminiLiveChat.module.css';

interface GeminiLiveChatProps {
  vocabularyWord: string;
  definition: string;
  userName: string;
  onResponseReceived?: (response: string) => void;
}

export default function GeminiLiveChat({
  vocabularyWord,
  definition,
  userName,
  onResponseReceived,
}: GeminiLiveChatProps) {
  const { sendGeminiPrompt, isReady } = usePipecat();
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState('');
  const [error, setError] = useState<Error | null>(null);
  
  // Auto-populate a starter prompt based on the vocabulary word
  useEffect(() => {
    if (vocabularyWord) {
      setPrompt(`Create an image describing "${vocabularyWord}" (${definition})`);
    }
  }, [vocabularyWord, definition]);
  
  // Handle sending a prompt to Gemini
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!prompt.trim() || isLoading || !isReady) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Enhanced prompt with vocabulary context
      const enhancedPrompt = `${prompt}\nThis is for the vocabulary word "${vocabularyWord}" which means "${definition}".`;
      
      // Send the prompt to Gemini
      const result = await sendGeminiPrompt(enhancedPrompt);
      
      // Update the response
      setResponse(result);
      
      // Call the callback if provided
      if (onResponseReceived) {
        onResponseReceived(result);
      }
      
      // Clear the prompt
      setPrompt('');
    } catch (err) {
      console.error('Error generating with Gemini:', err);
      setError(err instanceof Error ? err : new Error('Failed to generate response'));
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className={styles.container}>
      {/* Heading */}
      <div className={styles.header}>
        <h2 className={styles.title}>Gemini AI for "{vocabularyWord}"</h2>
      </div>
      
      {/* Canvas to display responses */}
      <div className={styles.responseContainer}>
        {isLoading ? (
          <div className={styles.loading}>
            <Loader2 className={styles.loadingIcon} />
            <p>Generating image and description...</p>
          </div>
        ) : response ? (
          <div className={styles.responseContent}>
            <p>{response}</p>
          </div>
        ) : (
          <div className={styles.placeholder}>
            <p>Use the prompt below to generate an image and description for "{vocabularyWord}"</p>
          </div>
        )}
      </div>
      
      {/* Error message if any */}
      {error && (
        <div className={styles.error}>
          <p>{error.message}</p>
        </div>
      )}
      
      {/* Prompt input */}
      <form onSubmit={handleSubmit} className={styles.promptForm}>
        <div className={styles.inputContainer}>
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={`Describe an image for "${vocabularyWord}"...`}
            className={styles.promptInput}
            disabled={isLoading || !isReady}
            required
          />
          <button
            type="submit"
            disabled={isLoading || !isReady || !prompt.trim()}
            className={styles.submitButton}
          >
            {isLoading ? (
              <Loader2 className={styles.loadingIcon} />
            ) : (
              <SendHorizontal className={styles.sendIcon} />
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
