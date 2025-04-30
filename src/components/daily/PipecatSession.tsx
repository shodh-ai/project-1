'use client';

import React, { useState, useEffect, useRef } from 'react';
import styles from './PipecatSession.module.css';
import ScriptLoader from './ScriptLoader';
import axios from 'axios';

interface PipecatSessionProps {
  roomName: string;
  userName: string; 
  questionText: string;
  sessionTitle: string;
  onLeave: () => void;
}

declare global {
  interface Window {
    DailyPipecat?: any;
  }
}

export default function PipecatSession({
  roomName,
  userName,
  questionText,
  sessionTitle,
  onLeave,
}: PipecatSessionProps) {
  const [isJoined, setIsJoined] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [transcript, setTranscript] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [conversationState, setConversationState] = useState<'idle' | 'listening' | 'processing' | 'speaking'>('idle');
  
  // References
  const pipecatRef = useRef<any>(null);
  const callRef = useRef<any>(null);
  const geminiRef = useRef<any>(null);
  
  // Generate a session ID based on room name and current time
  const sessionId = useRef(`${roomName.replace(/\s+/g, '-')}-${Date.now()}`);
  
  // Create a Daily.co room
  const createRoom = async () => {
    try {
      console.log('Creating room with name:', sessionId.current);
      const response = await axios.post('/api/create-room', {
        roomName: sessionId.current
      });
      console.log('Room created:', response.data);
      return response.data.url;
    } catch (err) {
      console.error('Error creating room:', err);
      throw new Error(`Failed to create room: ${err instanceof Error ? err.message : String(err)}`);
    }
  };
  
  // Get a token for the session
  const getToken = async () => {
    try {
      const response = await axios.post('/api/pipecat-token', {
        sessionId: sessionId.current
      });
      return response.data.token;
    } catch (err) {
      console.error('Error getting token:', err);
      throw new Error(`Failed to get token: ${err instanceof Error ? err.message : String(err)}`);
    }
  };
  
  const startSession = async () => {
    if (!window.DailyPipecat) {
      setError('Daily Pipecat SDK not loaded');
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      // First, create the room
      const roomUrl = await createRoom();
      console.log('Using room URL:', roomUrl);
      
      // Get token for the session
      const token = await getToken();
      console.log('Got token for session:', sessionId.current);
      
      // Initialize Pipecat Client
      const pipecat = new window.DailyPipecat.Client();
      pipecatRef.current = pipecat;
      
      // Join the call with the created room's URL
      const call = await pipecat.join({
        url: roomUrl,
        token,
        userName
      });
      callRef.current = call;
      
      console.log('Joined call:', call);
      
      // Set up the Gemini model
      const gemini = await pipecat.gemini({
        call,
        prompt: `You are a helpful TOEFL speaking practice assistant. You're having a conversation with a student who is practicing for the TOEFL exam. 
The student is discussing this topic: "${questionText}"
Keep your responses natural, conversational, and at an appropriate length for a speaking practice session.
Ask follow-up questions occasionally to encourage the student to elaborate.
Provide gentle corrections if there are obvious English errors, but focus more on encouraging fluent conversation.`,
        config: {
          modelName: 'gemini-2.0-flash-live-001',
          speechToText: true,
          textToSpeech: true,
          streaming: true,
          multimodal: true
        }
      });
      geminiRef.current = gemini;
      
      // Set up event listeners
      gemini.on('transcript', (event: any) => {
        console.log('Transcript:', event);
        if (event.isFinal) {
          setTranscript(prev => `${prev}You: ${event.text}\n`);
          setConversationState('processing');
        }
      });
      
      gemini.on('response', (event: any) => {
        console.log('Gemini response:', event);
        setTranscript(prev => `${prev}AI: ${event.text}\n`);
        setConversationState(event.done ? 'idle' : 'speaking');
      });
      
      gemini.on('error', (event: any) => {
        console.error('Gemini error:', event);
        setError(`Gemini error: ${event.message || 'Unknown error'}`);
        setConversationState('idle');
      });
      
      // Start the Gemini session
      await gemini.start();
      
      setIsJoined(true);
      setIsLoading(false);
      
    } catch (err) {
      console.error('Error starting session:', err);
      setError(`Failed to start session: ${err instanceof Error ? err.message : String(err)}`);
      setIsLoading(false);
    }
  };
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (geminiRef.current) {
        try {
          geminiRef.current.stop();
        } catch (e) {
          console.error('Error stopping Gemini:', e);
        }
      }
      
      if (callRef.current) {
        try {
          callRef.current.leave();
        } catch (e) {
          console.error('Error leaving call:', e);
        }
      }

      if (pipecatRef.current) {
        try {
          pipecatRef.current.destroy();
        } catch (e) {
          console.error('Error destroying Pipecat client:', e);
        }
      }
    };
  }, []);
  
  // Handle leaving the call
  const handleLeaveCall = () => {
    if (geminiRef.current) {
      try {
        geminiRef.current.stop();
      } catch (e) {
        console.error('Error stopping Gemini:', e);
      }
    }
    
    if (callRef.current) {
      try {
        callRef.current.leave();
      } catch (e) {
        console.error('Error leaving call:', e);
      }
    }
    
    setIsJoined(false);
    onLeave();
  };
  
  // Toggle microphone
  const toggleMic = () => {
    if (callRef.current) {
      const localParticipant = callRef.current.participants().local;
      const isAudioEnabled = !localParticipant.audio.muted;
      
      if (isAudioEnabled) {
        callRef.current.setLocalAudio(false);
        setConversationState('idle');
      } else {
        callRef.current.setLocalAudio(true);
        setConversationState('listening');
      }
    }
  };
  
  return (
    <ScriptLoader>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>{sessionTitle}</h2>
          <button 
            className={styles.closeButton}
            onClick={handleLeaveCall}
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
                    <div className={`${styles.status} ${styles[conversationState]}`}>
                      {conversationState === 'idle' && 'Ready'}
                      {conversationState === 'listening' && 'Listening...'}
                      {conversationState === 'processing' && 'Processing...'}
                      {conversationState === 'speaking' && 'AI is speaking...'}
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
              </div>
              
              {/* Controls */}
              <div className={styles.controls}>
                <button 
                  onClick={toggleMic}
                  className={`${styles.micButton} ${conversationState === 'listening' ? styles.micActive : ''}`}
                  title={conversationState === 'listening' ? 'Mute Microphone' : 'Unmute Microphone'}
                >
                  🎤
                </button>
                
                <button 
                  onClick={handleLeaveCall}
                  className={styles.leaveButton}
                >
                  Leave Session
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </ScriptLoader>
  );
}
