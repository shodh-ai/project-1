'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import styles from './DailySession.module.css';
import { Mic, MicOff, SendHorizontal, Loader2, X } from 'lucide-react';
import { createDailyRoom } from '@/services/daily/api';
import GeminiSpeechConnection from './GeminiSpeechConnection';

interface DailySessionProps {
  roomName: string;
  userName: string;
  questionText: string;
  sessionTitle: string;
  onLeave: () => void;
}

export default function DailySession({
  roomName,
  userName,
  questionText,
  sessionTitle,
  onLeave,
}: DailySessionProps) {
  // Speech session states
  const [isJoined, setIsJoined] = useState(false);
  const [isListening, setIsListening] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Gemini AI states
  const [geminiReady, setGeminiReady] = useState(false);
  const [geminiModel, setGeminiModel] = useState<any>(null);
  const [feedback, setFeedback] = useState<string>('');
  const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false);
  const [transcriptSoFar, setTranscriptSoFar] = useState<string>('');
  const [aiRoomUrl, setAiRoomUrl] = useState<string>('');

  // Handle joining the room
  const joinRoom = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Create a room using the Daily.co API
      const roomResponse = await createDailyRoom(roomName);
      const roomUrl = roomResponse.url;
      
      // Store the room URL for the AI agent to join
      setAiRoomUrl(roomUrl);
      setIsJoined(true);
      setIsLoading(false);
      
      console.log(`Created room with URL: ${roomUrl}`);
    } catch (err) {
      console.error('Error joining room:', err);
      setError('Failed to join the conversation. Please try again.');
      setIsLoading(false);
    }
  }, [roomName]);
  
  // Handle leaving the room
  const handleLeaveRoom = useCallback(() => {
    setIsJoined(false);
    setAiRoomUrl('');
    onLeave();
  }, [onLeave]);
  
  // Initialize Gemini AI when component mounts
  useEffect(() => {
    const initializeGemini = async () => {
      try {
        // Get API key from environment variable
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
        
        if (!apiKey) {
          console.error('Gemini API key is not set');
          return;
        }
        
        // Initialize the Gemini API
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
        
        setGeminiModel(model);
        setGeminiReady(true);
        console.log('Gemini AI initialized successfully');
      } catch (err) {
        console.error('Failed to initialize Gemini AI:', err);
      }
    };
    
    initializeGemini();
  }, []);
  
  // Request AI feedback on speaking
  const requestFeedback = async () => {
    if (!geminiReady || !geminiModel || isGeneratingFeedback) return;
    
    try {
      setIsGeneratingFeedback(true);
      
      // In a real implementation, you'd get the actual transcript
      const prompt = `
        You are an IELTS speaking examiner analyzing a practice response.
        
        The question was: "${questionText}"
        
        The candidate's response was:
        ${transcriptSoFar || "The candidate seemed hesitant but talked about the importance of education adapting to technological changes."}
        
        Please provide feedback on:
        1. Fluency and coherence
        2. Lexical resource (vocabulary)
        3. Grammatical range and accuracy
        4. Pronunciation
        5. Overall impression
        
        Be specific, constructive, and brief. Format your response with clear headings.
      `;
      
      // Generate feedback using Gemini
      const result = await geminiModel.generateContent(prompt);
      const response = result.response;
      const text = response.text();
      
      setFeedback(text);
      setIsGeneratingFeedback(false);
    } catch (err) {
      console.error('Error generating feedback:', err);
      setFeedback('Sorry, I encountered an error while generating feedback. Please try again.');
      setIsGeneratingFeedback(false);
    }
  };
  
  // Toggle microphone state
  const toggleListening = () => {
    setIsListening(!isListening);
  };
  
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>{sessionTitle}</h2>
        <button 
          className={styles.closeButton}
          onClick={handleLeaveRoom}
        >
          <X size={20} />
        </button>
      </div>
      
      {error && (
        <div className={styles.error}>
          {error}
        </div>
      )}
      
      <div className={styles.content}>
        {!isJoined ? (
          <div className={styles.joinSection}>
            <h3>Join Speaking Practice Session</h3>
            <p>Click the button below to start your speaking practice with an AI conversation partner.</p>
            <button 
              className={styles.joinButton}
              onClick={joinRoom}
              disabled={isLoading}
            >
              {isLoading ? 'Connecting...' : 'Start Session'}
            </button>
          </div>
        ) : (
          <div className={styles.sessionContent}>
            <div className={styles.mainContent}>
              {/* Question display */}
              <div className={styles.questionCard}>
                <h3 className={styles.questionTitle}>Practice Question:</h3>
                <p className={styles.questionText}>{questionText}</p>
              </div>
              
              {/* Real-time AI Conversation */}
              <div className={styles.feedbackCard} style={{ marginBottom: '20px' }}>
                <div className={styles.feedbackHeader}>
                  <h3 className={styles.feedbackTitle}>AI Conversation Partner</h3>
                </div>
                
                <div className={styles.feedbackContent} style={{ padding: '15px' }}>
                  {isJoined && aiRoomUrl ? (
                    <GeminiSpeechConnection 
                      roomUrl={aiRoomUrl}
                      isActive={isJoined}
                      onTranscriptUpdate={(text) => {
                        setTranscriptSoFar(prev => prev + '\n' + text);
                      }}
                    />
                  ) : (
                    <div className={styles.placeholderText}>
                      <p>Join the room to start a real-time conversation with the AI assistant.</p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* AI Feedback */}
              <div className={styles.feedbackCard}>
                <div className={styles.feedbackHeader}>
                  <h3 className={styles.feedbackTitle}>Speaking Feedback</h3>
                  <button 
                    onClick={requestFeedback}
                    disabled={!geminiReady || isGeneratingFeedback}
                    className={styles.feedbackButton}
                  >
                    {isGeneratingFeedback ? (
                      <>
                        <Loader2 className={styles.spinnerIcon} />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <SendHorizontal size={16} />
                        Get Feedback
                      </>
                    )}
                  </button>
                </div>
                
                <div className={styles.feedbackContent}>
                  {feedback ? (
                    <div className={styles.feedbackText}>
                      {feedback}
                    </div>
                  ) : (
                    <div className={styles.placeholderText}>
                      {isGeneratingFeedback ? (
                        <p>Analyzing your speaking performance...</p>
                      ) : (
                        <p>Click "Get Feedback" to receive AI analysis of your speaking practice.</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Controls */}
            <div className={styles.controls}>
              <button 
                onClick={toggleListening}
                className={`${styles.controlButton} ${!isListening ? styles.controlButtonOff : ''}`}
              >
                {isListening ? <Mic size={20} /> : <MicOff size={20} />}
              </button>
              
              <button 
                onClick={handleLeaveRoom}
                className={styles.leaveButton}
              >
                Leave Session
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
