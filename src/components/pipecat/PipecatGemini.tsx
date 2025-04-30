'use client';

import React, { useState, useEffect, useRef } from 'react';
import styles from './PipecatGemini.module.css';

interface PipecatGeminiProps {
  roomName: string;
  userName: string;
  questionText: string;
  sessionTitle: string;
  onLeave: () => void;
}

export default function PipecatGemini({
  roomName,
  userName,
  questionText,
  sessionTitle,
  onLeave,
}: PipecatGeminiProps) {
  const [isJoined, setIsJoined] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [transcript, setTranscript] = useState<string>('');
  const [feedback, setFeedback] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [pipecatLib, setPipecatLib] = useState<any>(null);
  const [roomUrl, setRoomUrl] = useState<string>('');
  
  // References for Pipecat integration
  const pipecatRef = useRef<any>(null);
  const audioSessionRef = useRef<any>(null);
  const geminiSessionRef = useRef<any>(null);
  
  // Load Pipecat script dynamically
  useEffect(() => {
    const loadPipecatSDK = async () => {
      // Only load script once
      if (document.querySelector('script[src*="pipecat-sdk"]')) {
        return;
      }

      return new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/@pipecat/sdk@latest/dist/index.global.js';
        script.async = true;
        script.onload = () => {
          console.log('Pipecat SDK loaded successfully');
          // @ts-ignore - Pipecat will be available on window
          if (window.Pipecat) {
            // @ts-ignore
            setPipecatLib(window.Pipecat);
            resolve();
          } else {
            reject(new Error('Pipecat SDK not found after loading'));
          }
        };
        script.onerror = () => {
          reject(new Error('Failed to load Pipecat SDK'));
        };
        document.body.appendChild(script);
      });
    };
    
    loadPipecatSDK().catch(err => {
      console.error('Error loading Pipecat SDK:', err);
      setError('Failed to load Pipecat SDK: ' + err.message);
    });
  }, []);
  
  // Initialize Pipecat session
  const startSession = async () => {
    if (!pipecatLib) {
      setError('Pipecat SDK not loaded yet');
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Create a Pipecat session
      const pipecat = new pipecatLib.PipecatClient({
        domain: process.env.DAILY_DOMAIN || 'shodhai.daily.co',
        token: process.env.PIPECAT_API_KEY || process.env.DAILY_API_KEY
      });
      pipecatRef.current = pipecat;
      
      // Create or join a room
      const room = await pipecat.createRoom({
        name: roomName || `room-${Date.now()}`,
        properties: {
          enable_chat: true,
          enable_knocking: false,
          enable_network_ui: false,
          enable_prejoin_ui: false,
          start_video_off: false,
          start_audio_off: false,
        }
      });
      
      setRoomUrl(room.url);
      console.log(`Created room with URL: ${room.url}`);
      
      // Join the audio session
      const audioSession = await pipecat.joinAudioSession({
        url: room.url,
        userName,
        micDeviceId: 'default',
        speakerDeviceId: 'default',
      });
      audioSessionRef.current = audioSession;
      
      // Initialize the Gemini live session
      const geminiSession = await pipecat.createGeminiLiveSession({
        audioSession,
        config: {
          model: 'gemini-1.5-flash',
          inputMode: 'speech',
          outputMode: 'speech',
          prompt: `You are a helpful AI assistant named Gemini. You'll be having a conversation about: "${questionText}". Be conversational and helpful.`,
        }
      });
      geminiSessionRef.current = geminiSession;
      
      // Define event types
      interface TranscriptEvent {
        text: string;
        isFinal: boolean;
      }
      
      interface ResponseEvent {
        text: string;
        isFinal: boolean;
      }
      
      interface ErrorEvent {
        error: {
          message: string;
        };
      }
      
      // Listen for transcripts
      geminiSession.on('transcript', (event: TranscriptEvent) => {
        console.log('Transcript:', event);
        setTranscript(prev => prev + `You: ${event.text}\n`);
      });
      
      // Listen for responses
      geminiSession.on('response', (event: ResponseEvent) => {
        console.log('Gemini response:', event);
        setTranscript(prev => prev + `Gemini: ${event.text}\n`);
      });
      
      // Listen for errors
      geminiSession.on('error', (event: ErrorEvent) => {
        console.error('Gemini error:', event);
        setError(`Gemini error: ${event.error.message || 'Unknown error'}`);
      });
      
      // Start the session
      await geminiSession.start();
      
      setIsJoined(true);
      setIsLoading(false);
    } catch (err) {
      console.error('Error starting Pipecat session:', err);
      setError(`Failed to start session: ${err instanceof Error ? err.message : String(err)}`);
      setIsLoading(false);
    }
  };
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      // Clean up Gemini session
      if (geminiSessionRef.current) {
        try {
          geminiSessionRef.current.stop();
        } catch (e) {
          console.error('Error stopping Gemini session:', e);
        }
      }
      
      // Clean up Audio session
      if (audioSessionRef.current) {
        try {
          audioSessionRef.current.leave();
        } catch (e) {
          console.error('Error leaving audio session:', e);
        }
      }
      
      // Clean up Pipecat
      if (pipecatRef.current) {
        try {
          pipecatRef.current.destroy();
        } catch (e) {
          console.error('Error destroying Pipecat client:', e);
        }
      }
    };
  }, []);
  
  // Handle leaving the room
  const handleLeaveRoom = () => {
    if (geminiSessionRef.current) {
      try {
        geminiSessionRef.current.stop();
      } catch (e) {
        console.error('Error stopping Gemini session:', e);
      }
    }
    
    if (audioSessionRef.current) {
      try {
        audioSessionRef.current.leave();
      } catch (e) {
        console.error('Error leaving audio session:', e);
      }
    }
    
    setIsJoined(false);
    onLeave();
  };
  
  // Toggle microphone
  const toggleMic = () => {
    if (audioSessionRef.current) {
      const isMuted = audioSessionRef.current.localParticipant.isMicrophoneMuted;
      if (isMuted) {
        audioSessionRef.current.localParticipant.unmuteMicrophone();
      } else {
        audioSessionRef.current.localParticipant.muteMicrophone();
      }
    }
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
              disabled={isLoading || !pipecatLib}
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
                    {isJoined ? 'Connected to Gemini' : 'Disconnected'}
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
                className={styles.micButton}
                title="Toggle Microphone"
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
