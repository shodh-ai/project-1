'use client';

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import styles from './page.module.css';

export default function PipecatSpeakingPage() {
  const [isJoined, setIsJoined] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [room, setRoom] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [usingFallback, setUsingFallback] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [responses, setResponses] = useState<string[]>([]);
  const [topics, setTopics] = useState([
    {
      id: 1,
      title: 'Technology Impact',
      question: 'How has technology changed education and learning? Discuss both benefits and challenges.'
    },
    {
      id: 2,
      title: 'Environmental Policy',
      question: 'What environmental policies should governments prioritize? Explain your reasoning.'
    },
    {
      id: 3,
      title: 'Cultural Understanding',
      question: 'How does learning about different cultures benefit society? Provide examples.'
    }
  ]);
  const [selectedTopic, setSelectedTopic] = useState<any>(null);
  
  // References
  const callFrameRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Create a Daily room and join it
  const startSession = async (topic: any) => {
    try {
      setSelectedTopic(topic);
      setIsLoading(true);
      setError(null);
      
      // Create a room name based on topic
      const roomName = `pipecat-speaking-${topic.id}-${Date.now()}`;
      
      // Create room API call
      const roomResponse = await axios.post('/api/create-room', {
        roomName
      });
      
      const roomUrl = roomResponse.data.url;
      setRoom(roomUrl);
      setStatus('Room created');
      
      // Add the Daily.js script if not already loaded
      if (!window.DailyIframe) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://unpkg.com/@daily-co/daily-js';
          script.async = true;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load Daily.js SDK'));
          document.body.appendChild(script);
        });
      }
      
      // Create the call frame
      const callFrame = window.DailyIframe.createFrame(containerRef.current, {
        iframeStyle: {
          width: '100%',
          height: '100%',
          border: '0',
          borderRadius: '12px',
          backgroundColor: 'transparent'
        },
        showLeaveButton: true,
        showFullscreenButton: false
      });
      
      callFrameRef.current = callFrame;
      
      // Configure event listeners
      callFrame
        .on('joined-meeting', (event: any) => {
          console.log('Joined meeting:', event);
          setStatus('Connected');
          setIsJoined(true);
          setIsLoading(false);
          
          // Join with Gemini AI
          joinWithGemini(roomUrl, topic.question);
        })
        .on('left-meeting', () => {
          setIsJoined(false);
          setStatus('Disconnected');
          callFrameRef.current = null;
        })
        .on('error', (e: any) => {
          console.error('Daily.co error:', e);
          setError(`Daily.co error: ${e.errorMsg || 'Unknown error'}`);
          setIsLoading(false);
        });
      
      // Join the meeting
      await callFrame.join({
        url: roomUrl,
        userName: 'Student'
      });
      
    } catch (err) {
      console.error('Error starting Pipecat session:', err);
      setError(`Error: ${err instanceof Error ? err.message : String(err)}`);
      setIsLoading(false);
    }
  };
  
  // Call API to join Gemini AI to the room
  const joinWithGemini = async (roomUrl: string, question: string) => {
    try {
      setStatus('Connecting Gemini...');
      
      // Call the API to create an AI agent in the room
      const response = await axios.post('/api/gemini-agent', {
        roomUrl,
        prompt: `You are a helpful TOEFL speaking practice assistant. You're having a conversation with a student who is practicing for the TOEFL exam. 
The student is discussing this topic: "${question}"
Keep your responses natural, conversational, and at an appropriate length for a speaking practice session.
Ask follow-up questions occasionally to encourage the student to elaborate.
Provide gentle corrections if there are obvious English errors, but focus more on encouraging fluent conversation.`
      });
      
      console.log('Gemini joined:', response.data);
      setStatus('Gemini connected');
      
      // Check if we need to use fallback mode
      if (response.data.fallback) {
        console.log('Using browser-based fallback mode');
        setUsingFallback(true);
        setStatus('Using browser-based AI (fallback mode)');
        setupBrowserFallback(question);
      }
    } catch (err) {
      console.error('Error connecting Gemini:', err);
      setError(`Error connecting Gemini: ${err instanceof Error ? err.message : String(err)}`);
      
      // Use fallback mode if API call fails
      setUsingFallback(true);
      setStatus('Using browser-based AI (fallback mode)');
      setupBrowserFallback(question);
    }
  };
  
  // Set up browser-based speech synthesis and recognition as fallback
  const setupBrowserFallback = (question: string) => {
    // Welcome message
    const welcomeMessage = `Hello! I'm your speaking practice assistant. Let's discuss this topic: ${question}. Please share your thoughts when you're ready.`;
    addResponse(welcomeMessage);
    speakText(welcomeMessage);
    
    // Set up speech recognition if available
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition: any = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      
      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        
        // Update the transcript
        setTranscript(finalTranscript || interimTranscript);
        
        // If we have a final result, send it to the AI
        if (finalTranscript && event.results[event.resultIndex].isFinal) {
          handleUserInput(finalTranscript);
        }
      };
      
      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
      };
      
      // Start recognition
      try {
        recognition.start();
        console.log('Speech recognition started');
      } catch (e) {
        console.error('Error starting speech recognition:', e);
      }
      
      // Save reference to stop on unmount
      window.speechRecognition = recognition;
    } else {
      console.warn('Speech recognition not supported in this browser');
      setError('Your browser does not support speech recognition. Please try a different browser.');
    }
  };
  
  // Handle user input in fallback mode
  const handleUserInput = async (text: string) => {
    // Call Gemini API to get a response
    try {
      const response = await axios.post('/api/gemini', {
        prompt: text,
        context: responses.join('\n'),
        selectedTopic: selectedTopic?.question || ''
      });
      
      const aiResponse = response.data.text;
      addResponse(aiResponse);
      speakText(aiResponse);
    } catch (err) {
      console.error('Error getting AI response:', err);
      const errorMsg = 'Sorry, I had trouble processing that. Could you please try again?';
      addResponse(errorMsg);
      speakText(errorMsg);
    }
  };
  
  // Add a response to the list
  const addResponse = (text: string) => {
    setResponses(prev => [...prev, text]);
  };
  
  // Speak text using the browser's speech synthesis
  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      // Stop any ongoing speech
      window.speechSynthesis.cancel();
      
      // Create a new speech synthesis utterance
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Get available voices and select a good one
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        // Try to find a good voice
        const preferredVoices = voices.filter(voice => 
          (voice.name.includes('Google') || voice.name.includes('Natural') || voice.name.includes('Enhanced')) && 
          voice.lang.startsWith('en')
        );
        
        if (preferredVoices.length > 0) {
          utterance.voice = preferredVoices[0];
        }
      }
      
      // Speak the text
      window.speechSynthesis.speak(utterance);
      
      // Stop recognition while speaking to avoid feedback loop
      if (window.speechRecognition) {
        window.speechRecognition.stop();
        
        // Resume recognition when done speaking
        utterance.onend = () => {
          if (window.speechRecognition) {
            try {
              window.speechRecognition.start();
            } catch (e) {
              console.error('Error restarting speech recognition:', e);
            }
          }
        };
      }
    } else {
      console.warn('Speech synthesis not supported in this browser');
    }
  };
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (callFrameRef.current) {
        callFrameRef.current.destroy();
      }
      
      // Stop speech recognition if it's running
      if (window.speechRecognition) {
        try {
          window.speechRecognition.stop();
        } catch (e) {
          console.error('Error stopping speech recognition:', e);
        }
      }
      
      // Cancel any ongoing speech
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);
  
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Speaking Practice with Gemini 2.0</h1>
      
      {error && (
        <div className={styles.error}>
          {error}
        </div>
      )}
      
      {!selectedTopic ? (
        <div className={styles.topicList}>
          <p className={styles.description}>
            Select a topic to practice your speaking skills with Gemini 2.0 Flash Live.
            This uses real-time speech-to-speech technology.
          </p>
          
          <div className={styles.topics}>
            {topics.map((topic) => (
              <div key={topic.id} className={styles.topicCard}>
                <h2 className={styles.topicTitle}>{topic.title}</h2>
                <p className={styles.topicQuestion}>{topic.question}</p>
                <button 
                  className={styles.startButton}
                  onClick={() => startSession(topic)}
                  disabled={isLoading}
                >
                  {isLoading ? 'Connecting...' : 'Practice This Topic'}
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className={styles.sessionContainer}>
          <div className={styles.sessionHeader}>
            <h2 className={styles.sessionTitle}>{selectedTopic.title}</h2>
            <div className={styles.sessionStatus}>{status}</div>
          </div>
          
          <div className={styles.questionCard}>
            <p className={styles.questionText}>{selectedTopic.question}</p>
          </div>
          
          {usingFallback ? (
            <div className={styles.fallbackContainer}>
              <div className={styles.transcriptContainer}>
                {transcript ? (
                  <p className={styles.transcript}>{transcript}</p>
                ) : (
                  <p className={styles.transcriptPlaceholder}>Speak to begin...</p>
                )}
              </div>
              
              <div className={styles.responsesContainer}>
                {responses.map((response, index) => (
                  <div key={index} className={styles.responseItem}>
                    <p className={styles.responseText}>{response}</p>
                  </div>
                ))}
              </div>
              
              <div className={styles.fallbackInstructions}>
                <p>Using browser-based speech recognition as a fallback. Speak clearly to begin.</p>
              </div>
            </div>
          ) : (
            <>
              <div className={styles.callContainer} ref={containerRef}>
                {/* Daily.co iframe will be inserted here */}
              </div>
              
              {isJoined && (
                <div className={styles.instructions}>
                  <p>Speak naturally to have a conversation with Gemini. The AI will respond with its own voice.</p>
                  <p>Use the leave button in the call interface when finished.</p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Add DailyIframe and speech interfaces to Window
declare global {
  interface Window {
    DailyIframe?: any;
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
    speechRecognition?: any;
  }
}
