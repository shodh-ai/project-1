'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import styles from './DailySession.module.css';
import { Mic, MicOff, Video, VideoOff, X, SendHorizontal, Loader2 } from 'lucide-react';
import { createDailyRoom, generateDailyToken } from '@/services/daily/api';

// Declare Daily.co interface for TypeScript
declare global {
  interface Window {
    DailyIframe?: {
      createFrame: (element: HTMLElement | null, options?: any) => any;
    };
  }
}

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
  // Video call states
  const [isJoined, setIsJoined] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [callFrame, setCallFrame] = useState<any>(null);
  
  // Gemini AI states
  const [geminiReady, setGeminiReady] = useState(false);
  const [geminiModel, setGeminiModel] = useState<any>(null);
  const [feedback, setFeedback] = useState<string>('');
  const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false);
  const [transcriptSoFar, setTranscriptSoFar] = useState<string>('');

  // Video container ref
  const videoContainerRef = useRef<HTMLDivElement>(null);

  // Initialize Daily.co
  useEffect(() => {
    const initializeDaily = async () => {
      try {
        setIsLoading(true);
        
        // Only load the DailyIframe script if it hasn't been loaded yet
        if (!window.DailyIframe) {
          const script = document.createElement('script');
          script.src = 'https://unpkg.com/@daily-co/daily-js';
          script.async = true;
          script.onload = () => setupRoom();
          document.body.appendChild(script);
        } else {
          setupRoom();
        }
      } catch (err) {
        console.error('Failed to initialize Daily.co:', err);
        setError('Failed to initialize video call. Please try again.');
        setIsLoading(false);
      }
    };

    // Create and join a Daily.co room using our token service
    const setupRoom = async () => {
      try {
        // Create or get a Daily.co room using our token service
        const roomResponse = await createDailyRoom(roomName);
        const roomUrl = roomResponse.url;
        
        // Get a token for the room
        const tokenResponse = await generateDailyToken(roomName, userName);
        
        // Create the call frame
        const DailyIframe = (window as any).DailyIframe;
        const frame = DailyIframe.createFrame(videoContainerRef.current, {
          isMobile: false,
          showLeaveButton: false,
          showFullscreenButton: true,
        });
        
        // Set up event handlers
        frame.on('joined-meeting', () => {
          setIsJoined(true);
          setIsLoading(false);
        });
        
        frame.on('error', (e: any) => {
          console.error('Daily.co error:', e);
          setError('Video call error: ' + e.errorMsg);
          setIsLoading(false);
        });
        
        frame.on('left-meeting', () => {
          setIsJoined(false);
        });
        
        // Track local participant audio/video
        frame.on('local-track-started', (e: any) => {
          if (e.track.kind === 'video') setIsCameraOn(true);
          if (e.track.kind === 'audio') setIsMicOn(true);
        });
        
        frame.on('local-track-stopped', (e: any) => {
          if (e.track.kind === 'video') setIsCameraOn(false);
          if (e.track.kind === 'audio') setIsMicOn(false);
        });
        
        // Join the meeting with the token
        await frame.join({
          url: roomUrl,
          token: tokenResponse.token,
          userName: userName,
        });
        
        // Save the call frame reference
        setCallFrame(frame);
      } catch (err) {
        console.error('Failed to join Daily.co room:', err);
        setError('Failed to join the video call room. Please try again.');
        setIsLoading(false);
      }
    };
    
    // Initialize Gemini AI
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
      } catch (err) {
        console.error('Failed to initialize Gemini AI:', err);
      }
    };
    
    initializeDaily();
    initializeGemini();
    
    // Cleanup function
    return () => {
      if (callFrame) {
        callFrame.leave();
      }
    };
  }, [roomName, userName]);
  
  // Toggle camera
  const toggleCamera = useCallback(() => {
    if (!callFrame) return;
    
    if (isCameraOn) {
      callFrame.setLocalVideo(false);
    } else {
      callFrame.setLocalVideo(true);
    }
  }, [callFrame, isCameraOn]);
  
  // Toggle microphone
  const toggleMic = useCallback(() => {
    if (!callFrame) return;
    
    if (isMicOn) {
      callFrame.setLocalAudio(false);
    } else {
      callFrame.setLocalAudio(true);
    }
  }, [callFrame, isMicOn]);
  
  // Handle leaving the room
  const handleLeaveRoom = useCallback(() => {
    if (callFrame) {
      callFrame.leave();
    }
    onLeave();
  }, [callFrame, onLeave]);
  
  // Request AI feedback on speaking
  const requestFeedback = async () => {
    if (!geminiReady || !geminiModel || isGeneratingFeedback) return;
    
    try {
      setIsGeneratingFeedback(true);
      
      // In a real implementation, you'd get the actual transcript
      // For now, we'll simulate a transcript
      const simulatedTranscript = transcriptSoFar || 
        "Well, I think with AI and automation taking over jobs, education needs to change. " +
        "We should focus more on teaching skills that machines can't easily replicate. " +
        "Things like creativity, critical thinking, problem solving, and emotional intelligence are important. " +
        "Also, we should make learning more flexible and continuous throughout life since people will need to adapt to new jobs.";
      
      // Use Gemini to analyze the speaking performance
      const prompt = `
        You are an IELTS speaking examiner analyzing a practice response.
        
        The question was: "${questionText}"
        
        The candidate's response: "${simulatedTranscript}"
        
        Please provide detailed feedback on:
        1. Fluency and coherence (organization, logical flow)
        2. Lexical resource (vocabulary range and accuracy)
        3. Grammatical range and accuracy
        4. Pronunciation (based on word choices, not actual pronunciation)
        
        Include specific examples from their response for each criterion.
        Suggest 2-3 improvements they could make.
        Format your response clearly with headers for each section.
      `;
      
      const result = await geminiModel.generateContent(prompt);
      const response = await result.response;
      const feedbackText = response.text();
      
      setFeedback(feedbackText);
      setTranscriptSoFar(simulatedTranscript); // Save this for future reference
    } catch (err) {
      console.error('Error generating feedback:', err);
      setFeedback('Sorry, there was an error generating feedback. Please try again.');
    } finally {
      setIsGeneratingFeedback(false);
    }
  };
  
  return (
    <div className={styles.sessionContainer}>
      {/* Session header */}
      <div className={styles.sessionHeader}>
        <h1 className={styles.sessionTitle}>{sessionTitle}</h1>
        <button 
          onClick={handleLeaveRoom}
          className={styles.leaveButton}
        >
          <X size={18} /> Leave
        </button>
      </div>
      
      <div className={styles.mainContent}>
        {/* Left side: Video call */}
        <div className={styles.videoSection}>
          {isLoading ? (
            <div className={styles.loadingContainer}>
              <Loader2 className={styles.loadingSpinner} />
              <p>Connecting to video call...</p>
            </div>
          ) : error ? (
            <div className={styles.errorContainer}>
              <p>{error}</p>
              <button 
                onClick={() => window.location.reload()}
                className={styles.retryButton}
              >
                Try Again
              </button>
            </div>
          ) : (
            <>
              {/* Video container */}
              <div ref={videoContainerRef} className={styles.videoContainer}></div>
              
              {/* Video controls */}
              <div className={styles.controls}>
                <button 
                  onClick={toggleMic}
                  className={`${styles.controlButton} ${!isMicOn ? styles.controlButtonOff : ''}`}
                >
                  {isMicOn ? <Mic size={20} /> : <MicOff size={20} />}
                </button>
                
                <button 
                  onClick={toggleCamera}
                  className={`${styles.controlButton} ${!isCameraOn ? styles.controlButtonOff : ''}`}
                >
                  {isCameraOn ? <Video size={20} /> : <VideoOff size={20} />}
                </button>
              </div>
            </>
          )}
        </div>
        
        {/* Right side: Question and AI Feedback */}
        <div className={styles.feedbackSection}>
          {/* Question display */}
          <div className={styles.questionCard}>
            <h3 className={styles.questionTitle}>Practice Question:</h3>
            <p className={styles.questionText}>{questionText}</p>
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
      </div>
    </div>
  );
}
