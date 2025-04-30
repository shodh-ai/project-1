'use client';

import React, { useState, useEffect, useRef } from 'react';
import styles from './PipecatGemini.module.css';
import axios from 'axios';

interface DirectGeminiSpeakingProps {
  roomName: string;
  userName: string;
  questionText: string;
  sessionTitle: string;
  onLeave: () => void;
}

export default function DirectGeminiSpeaking({
  roomName,
  userName,
  questionText,
  sessionTitle,
  onLeave,
}: DirectGeminiSpeakingProps) {
  const [isJoined, setIsJoined] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [transcript, setTranscript] = useState<string>('');
  const [feedback, setFeedback] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [roomUrl, setRoomUrl] = useState<string>('');
  const [agentId, setAgentId] = useState<string>('');
  const [isListening, setIsListening] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  
  // References
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const synthesisRef = useRef<SpeechSynthesis | null>(null);
  
  // Initialize audio features
  useEffect(() => {
    // Initialize speech synthesis
    synthesisRef.current = window.speechSynthesis;
    
    // Clean up on unmount
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (synthesisRef.current && synthesisRef.current.speaking) {
        synthesisRef.current.cancel();
      }
    };
  }, []);
  
  // Create a room using the token service
  const createRoom = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await axios.get(`/api/room?name=${roomName}`, {
        headers: {
          'X-API-KEY': 'dev-key'
        }
      });
      
      console.log('Room created:', response.data);
      setRoomUrl(response.data.url);
      return response.data.url;
    } catch (err) {
      console.error('Error creating room:', err);
      setError(`Failed to create room: ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    }
  };
  
  // Start a session
  const startSession = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Create a Daily.co room
      const roomUrl = await createRoom();
      
      // Create an AI agent
      const agentResponse = await axios.post('/api/agent', {
        roomUrl,
        userName: 'AI Conversation Partner',
        useSimpleAgent: true
      });
      
      console.log('AI agent created:', agentResponse.data);
      setAgentId(agentResponse.data.agentId);
      
      // Initialize speech recognition if available
      if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
        // @ts-ignore - TypeScript doesn't know about webkitSpeechRecognition
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        
        recognitionRef.current.onresult = (event: any) => {
          const result = event.results[event.results.length - 1];
          const transcript = result[0].transcript;
          console.log('Speech recognized:', transcript);
          
          if (result.isFinal) {
            setTranscript(prev => prev + `You: ${transcript}\n`);
            processUserSpeech(transcript);
          }
        };
        
        recognitionRef.current.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setError(`Speech recognition error: ${event.error}`);
        };
      } else {
        setError('Speech recognition not supported in this browser');
      }
      
      setIsJoined(true);
      setIsLoading(false);
      
      // Start with a welcome message
      setTimeout(() => {
        speakText("Hello, I'm Gemini. Let's discuss the topic: " + questionText);
      }, 1000);
      
    } catch (err) {
      console.error('Error starting session:', err);
      setError(`Failed to start session: ${err instanceof Error ? err.message : String(err)}`);
      setIsLoading(false);
    }
  };
  
  // Process user speech and get AI response
  const processUserSpeech = async (text: string) => {
    try {
      setIsAiSpeaking(true);
      
      // First approach: Use Gemini API directly
      const apiResponse = await axios.post('/api/gemini', {
        prompt: text,
        context: questionText,
      });
      
      const aiResponse = apiResponse.data.response;
      console.log('AI response:', aiResponse);
      
      setTranscript(prev => prev + `Gemini: ${aiResponse}\n`);
      speakText(aiResponse);
      
    } catch (err) {
      console.error('Error getting AI response:', err);
      setError(`Failed to get AI response: ${err instanceof Error ? err.message : String(err)}`);
      setIsAiSpeaking(false);
    }
  };
  
  // Speak text using speech synthesis
  const speakText = (text: string) => {
    if (!synthesisRef.current) return;
    
    // Cancel any ongoing speech
    if (synthesisRef.current.speaking) {
      synthesisRef.current.cancel();
    }
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    utterance.onstart = () => {
      setIsAiSpeaking(true);
    };
    
    utterance.onend = () => {
      setIsAiSpeaking(false);
      
      // Resume listening after AI finishes speaking
      if (isJoined && recognitionRef.current && !isListening) {
        recognitionRef.current.start();
        setIsListening(true);
      }
    };
    
    // Stop listening while AI is speaking to avoid feedback loop
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
    
    synthesisRef.current.speak(utterance);
  };
  
  // Toggle microphone
  const toggleMic = () => {
    if (recognitionRef.current) {
      if (isListening) {
        recognitionRef.current.stop();
        setIsListening(false);
      } else {
        recognitionRef.current.start();
        setIsListening(true);
      }
    }
  };
  
  // Handle leaving the room
  const handleLeaveRoom = () => {
    // Stop media streams
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    
    // Stop speech recognition
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    
    // Stop speech synthesis
    if (synthesisRef.current && synthesisRef.current.speaking) {
      synthesisRef.current.cancel();
    }
    
    setIsJoined(false);
    onLeave();
  };
  
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>{sessionTitle}</h2>
        <button 
          className={styles.closeButton}
          onClick={handleLeaveRoom}
        >
          ✕
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
            <h3>Start Speaking Practice Session</h3>
            <p>Click the button below to start your speaking practice with Gemini AI.</p>
            <button 
              className={styles.joinButton}
              onClick={startSession}
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
              
              {/* Conversation */}
              <div className={styles.conversationCard}>
                <div className={styles.conversationHeader}>
                  <h3 className={styles.conversationTitle}>Conversation</h3>
                  <div className={styles.status}>
                    {isListening ? 'Listening...' : isAiSpeaking ? 'Gemini is speaking...' : 'Ready'}
                  </div>
                </div>
                <div className={styles.conversationContent}>
                  {transcript ? (
                    <pre className={styles.transcriptText}>{transcript}</pre>
                  ) : (
                    <p className={styles.placeholder}>
                      Start speaking to begin the conversation...
                    </p>
                  )}
                </div>
              </div>
              
              {/* Feedback section */}
              {feedback && (
                <div className={styles.feedbackCard}>
                  <h3 className={styles.feedbackTitle}>Speaking Feedback</h3>
                  <div className={styles.feedbackContent}>
                    <div className={styles.feedbackText}>{feedback}</div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Controls */}
            <div className={styles.controls}>
              <button 
                onClick={toggleMic}
                className={`${styles.micButton} ${isListening ? styles.micActive : ''}`}
                title={isListening ? 'Stop Listening' : 'Start Listening'}
              >
                🎤
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
