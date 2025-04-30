'use client';

import React, { useEffect, useState, useRef } from 'react';
import styles from './GeminiLiveRTVI.module.css';
import axios from 'axios';
import PipecatClientLoader from './PipecatClientLoader';

/**
 * GeminiLiveRTVI - A component that implements real-time speech-to-speech 
 * using the Pipecat RTVI client with Gemini Multimodal Live
 */
export default function GeminiLiveRTVI({ topic }: { topic: string }) {
  // State management
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState('');
  const [botTranscript, setBotTranscript] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  
  // References
  const rtviClientRef = useRef<any>(null);
  const llmHelperRef = useRef<any>(null);
  const transportRef = useRef<any>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const audioVisualizerRef = useRef<HTMLDivElement>(null);
  
  // The script loading is now handled by PipecatClientLoader
  
  // Initialize the RTVI client once scripts are loaded
  useEffect(() => {
    if (!window.PipecatRTVIClient || !window.GeminiLiveWebsocketTransport) {
      return;
    }
    
    const initializeRTVIClient = async () => {
      try {
        // Get API key from server
        const apiKeyResponse = await axios.get('/api/gemini-key');
        const geminiApiKey = apiKeyResponse.data.key;
        
        if (!geminiApiKey) {
          throw new Error('Failed to retrieve Gemini API key');
        }
        
        // Configure the Gemini Live transport
        const llmServiceOptions = {
          api_key: geminiApiKey, 
          model: "models/gemini-2.0-flash-live-001",
          initial_messages: [
            {
              role: "user",
              content: `You are a helpful and engaging TOEFL speaking practice assistant. 
              You're discussing this topic with the student: "${topic}".
              Keep your responses natural, conversational, and relatively brief.
              Ask follow-up questions occasionally to encourage the student to elaborate.
              Provide gentle corrections if there are obvious English errors, but focus more on encouraging fluent conversation.
              Introduce yourself as the AI speaking assistant and invite the student to share their thoughts.`
            }
          ],
          generation_config: {
            temperature: 0.7,
            maxOutput_tokens: 1024,
            speech_config: {
              voice_config: {
                prebuilt_voice_config: {
                  voice_name: "Puck"  // Options: Puck, Charon, Kore, Fenrir, Aoede
                }
              }
            }
          }
        };
        
        // Create transport
        const transport = new window.GeminiLiveWebsocketTransport(llmServiceOptions);
        transportRef.current = transport;
        
        // Configure RTVI client
        const rtviConfig = {
          transport: transport,
          enableMic: true,
          enableCam: false,
          enableScreenShare: false,
          timeout: 30 * 1000,
        };
        
        // Create and initialize RTVI client
        const rtviClient = new window.PipecatRTVIClient(rtviConfig);
        rtviClientRef.current = rtviClient;
        
        // Create LLM helper
        const llmHelper = new window.LLMHelper({});
        rtviClient.registerHelper("llm", llmHelper);
        llmHelperRef.current = llmHelper;
        
        // Set up event listeners
        setupEventListeners(rtviClient);
        
        console.log('RTVI client initialized successfully');
      } catch (err) {
        console.error('Failed to initialize RTVI client:', err);
        setError(`Failed to initialize RTVI client: ${err instanceof Error ? err.message : String(err)}`);
      }
    };
    
    initializeRTVIClient();
    
    return () => {
      // Clean up on unmount
      if (rtviClientRef.current) {
        rtviClientRef.current.disconnect();
        rtviClientRef.current = null;
      }
    };
  }, [topic]);
  
  // Set up event listeners for the RTVI client
  const setupEventListeners = (rtviClient: any) => {
    if (!rtviClient) return;
    
    // Transport state change events
    rtviClient.on('transport:stateChange', (state: string) => {
      console.log('Transport state changed:', state);
      if (state === 'connected') {
        setIsConnected(true);
        setIsLoading(false);
      } else if (state === 'disconnected') {
        setIsConnected(false);
        setIsLoading(false);
      } else if (state === 'connecting') {
        setIsLoading(true);
      }
    });
    
    // Error events
    rtviClient.on('transport:error', (err: any) => {
      console.error('Transport error:', err);
      setError(`Connection error: ${err.message || 'Unknown error'}`);
      setIsLoading(false);
    });
    
    // User transcript events
    rtviClient.on('user:transcript', (data: any) => {
      if (data.final) {
        console.log('User said:', data.text);
        setTranscript(data.text);
      }
    });
    
    // Bot transcript events
    rtviClient.on('bot:transcript', (data: any) => {
      console.log('Bot said:', data.text);
      setBotTranscript(data.text);
    });
    
    // Bot speaking state events
    rtviClient.on('bot:startedSpeaking', () => {
      console.log('Bot started speaking');
      setIsSpeaking(true);
    });
    
    rtviClient.on('bot:stoppedSpeaking', () => {
      console.log('Bot stopped speaking');
      setIsSpeaking(false);
    });
    
    // Audio level events
    rtviClient.on('audio:level', (level: number) => {
      setAudioLevel(level * 100); // Convert to percentage
      updateAudioVisualizer(level * 100);
    });
  };
  
  // Helper function to update audio visualizer
  const updateAudioVisualizer = (level: number) => {
    if (!audioVisualizerRef.current) return;
    
    // Update visualizer based on audio level
    const bars = audioVisualizerRef.current.querySelectorAll('.bar');
    const activeBars = Math.floor((level / 100) * bars.length);
    
    bars.forEach((bar, index) => {
      if (index < activeBars) {
        (bar as HTMLElement).style.backgroundColor = '#3b82f6';
      } else {
        (bar as HTMLElement).style.backgroundColor = '#e5e7eb';
      }
    });
  };
  
  // We no longer need this helper since PipecatClientLoader handles script loading
  
  // Connect to the RTVI service
  const connect = async () => {
    if (!rtviClientRef.current) {
      setError('RTVI client not initialized');
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Connect to the RTVI service
      await rtviClientRef.current.connect();
      
      console.log('Connected to RTVI service');
    } catch (err) {
      console.error('Failed to connect:', err);
      setError(`Failed to connect: ${err instanceof Error ? err.message : String(err)}`);
      setIsLoading(false);
    }
  };
  
  // Disconnect from the RTVI service
  const disconnect = async () => {
    if (!rtviClientRef.current) return;
    
    try {
      await rtviClientRef.current.disconnect();
      console.log('Disconnected from RTVI service');
    } catch (err) {
      console.error('Failed to disconnect:', err);
    }
  };
  
  // Toggle mute state
  const toggleMute = async () => {
    if (!rtviClientRef.current) return;
    
    try {
      if (isMuted) {
        await rtviClientRef.current.unmuteMic();
        setIsMuted(false);
      } else {
        await rtviClientRef.current.muteMic();
        setIsMuted(true);
      }
    } catch (err) {
      console.error('Failed to toggle mute:', err);
      setError(`Failed to toggle mute: ${err instanceof Error ? err.message : String(err)}`);
    }
  };
  
  // Send a text message to the LLM
  const sendTextMessage = async (text: string) => {
    if (!llmHelperRef.current || !isConnected) return;
    
    try {
      // Append message to conversation
      llmHelperRef.current.appendToMessages({ role: "user", content: text });
      console.log('Sent message:', text);
    } catch (err) {
      console.error('Failed to send message:', err);
      setError(`Failed to send message: ${err instanceof Error ? err.message : String(err)}`);
    }
  };
  
  return (
    <PipecatClientLoader
      onLoad={() => console.log('Pipecat client loaded successfully')}
      onError={(err) => setError(`Failed to load Pipecat client: ${err.message}`)}
    >
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>Gemini Live Speaking Practice</h2>
          <div className={styles.status}>
            {isLoading ? 'Connecting...' : isConnected ? 'Connected' : 'Disconnected'}
          </div>
        </div>
      
      {error && (
        <div className={styles.error}>
          {error}
        </div>
      )}
      
      <div className={styles.topic}>
        <h3>Topic</h3>
        <p>{topic}</p>
      </div>
      
      <div className={styles.mainContent}>
        <div className={styles.mediaContainer}>
          <div className={styles.videoContainer} ref={videoContainerRef}>
            {/* Bot video/avatar will be rendered here */}
            <div className={styles.botAvatar}>
              <div className={isSpeaking ? styles.speakingIndicator : styles.silent}>
                {isSpeaking ? '🔊' : '🎧'}
              </div>
            </div>
          </div>
          
          <div className={styles.audioVisualizer} ref={audioVisualizerRef}>
            {Array(10).fill(0).map((_, i) => (
              <div key={i} className={`${styles.bar} bar`}></div>
            ))}
          </div>
        </div>
        
        <div className={styles.transcriptContainer}>
          {transcript && (
            <div className={styles.userTranscript}>
              <strong>You:</strong> {transcript}
            </div>
          )}
          
          {botTranscript && (
            <div className={styles.botTranscript}>
              <strong>Assistant:</strong> {botTranscript}
            </div>
          )}
        </div>
      </div>
      
      <div className={styles.controls}>
        {!isConnected ? (
          <button 
            className={styles.connectButton} 
            onClick={connect}
            disabled={isLoading}
          >
            {isLoading ? 'Connecting...' : 'Start Conversation'}
          </button>
        ) : (
          <>
            <button 
              className={styles.disconnectButton} 
              onClick={disconnect}
            >
              End Conversation
            </button>
            
            <button 
              className={isMuted ? styles.unmuteMicButton : styles.muteMicButton} 
              onClick={toggleMute}
            >
              {isMuted ? 'Unmute Mic' : 'Mute Mic'}
            </button>
          </>
        )}
      </div>
      
      <div className={styles.textInputContainer}>
        <input 
          type="text" 
          className={styles.textInput}
          placeholder="Type a message..."
          disabled={!isConnected}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.currentTarget.value) {
              sendTextMessage(e.currentTarget.value);
              e.currentTarget.value = '';
            }
          }}
        />
        <button 
          className={styles.sendButton}
          onClick={() => {
            const input = document.querySelector(`.${styles.textInput}`) as HTMLInputElement;
            if (input && input.value) {
              sendTextMessage(input.value);
              input.value = '';
            }
          }}
          disabled={!isConnected}
        >
          Send
        </button>
      </div>
      </div>
    </PipecatClientLoader>
  );
}

// Add types to Window interface
declare global {
  interface Window {
    PipecatRTVIClient: any;
    GeminiLiveWebsocketTransport: any;
    LLMHelper: any;
  }
}
