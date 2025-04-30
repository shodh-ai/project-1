'use client';

import React, { useEffect, useRef, useState } from 'react';
import styles from './GeminiSpeechConnection.module.css';

interface GeminiSpeechConnectionProps {
  roomUrl: string;
  isActive: boolean;
  onTranscriptUpdate?: (transcript: string) => void;
}

const GeminiSpeechConnection: React.FC<GeminiSpeechConnectionProps> = ({
  roomUrl,
  isActive,
  onTranscriptUpdate,
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  
  const websocketRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<AudioWorkletNode | null>(null);
  
  // Extract room name from URL
  const roomName = roomUrl.split('/').pop() || '';
  
  // Initialize speech connection
  useEffect(() => {
    if (!isActive || !roomUrl) return;
    
    console.log('Initializing Gemini speech connection for room:', roomName);
    
    // Create an AI agent to join the room
    const createAgent = async () => {
      try {
        const response = await fetch('http://localhost:3004/api/create-agent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            roomUrl,
            userName: 'AI Conversation Partner',
            role: 'language_partner',
            simpleMode: true, // Use simplified agent mode for testing
          }),
        });
        
        if (!response.ok) {
          throw new Error(`Failed to create agent: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('AI agent created:', data);
        
        if (data.success && data.agentId) {
          setAgentId(data.agentId);
          // Wait a bit before connecting to ensure agent is fully initialized on server
          setTimeout(() => connectWebSocket(data.agentId), 1000);
        } else {
          throw new Error('Failed to create AI agent');
        }
      } catch (err) {
        console.error('Error creating AI agent:', err);
        setError(`Failed to create AI agent: ${err instanceof Error ? err.message : String(err)}`);
      }
    };
    
    createAgent();
    
    return () => {
      // Cleanup
      if (websocketRef.current) {
        websocketRef.current.close();
      }
      
      if (streamRef.current) {
        const tracks = streamRef.current.getTracks();
        tracks.forEach(track => track.stop());
      }
      
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      
      // Remove the agent when component unmounts
      if (agentId) {
        fetch(`http://localhost:3004/api/agents/${agentId}`, {
          method: 'DELETE',
        }).catch(err => {
          console.error('Error removing agent:', err);
        });
      }
    };
  }, [isActive, roomUrl, roomName]);
  
  // Connect to WebSocket for real-time audio streaming
  const connectWebSocket = (id: string) => {
    console.log(`Attempting to connect to WebSocket for agent: ${id}`);
    
    try {
      // Use the simple agent path for testing WebSocket stability
      const ws = new WebSocket(`ws://localhost:3004/agent/simple/${id}`);
      
      ws.onopen = () => {
        console.log('WebSocket connected successfully');
        setIsConnected(true);
        startAudioCapture();
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'transcript') {
            // Update transcript with latest user speech
            const newTranscript = data.text;
            setTranscript(prev => prev + newTranscript + '\n');
            onTranscriptUpdate?.(newTranscript);
          } else if (data.type === 'response') {
            // Handle AI response (text and/or audio)
            const aiResponse = data.text;
            setTranscript(prev => prev + 'AI: ' + aiResponse + '\n');
            onTranscriptUpdate?.(aiResponse);
            
            // In a real implementation, we would play audio response
            // from the AI here using the Web Audio API
          }
        } catch (err) {
          console.error('Error processing WebSocket message:', err);
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
        setError('WebSocket connection error. Please try again or check if the server is running.');
      };
      
      ws.onclose = (event) => {
        console.log(`WebSocket connection closed. Code: ${event.code}, Reason: ${event.reason || 'No reason provided'}`);
        setIsConnected(false);
        
        // Optional: Add reconnect logic
        if (!event.wasClean) {
          setError('Connection to AI agent was lost. Please refresh to try again.');
        }
      };
      
      websocketRef.current = ws;
    } catch (err) {
      console.error('Error establishing WebSocket connection:', err);
      setError(`Failed to connect to agent: ${err instanceof Error ? err.message : String(err)}`);
    }
  };
  
  // Start audio capture and processing
  const startAudioCapture = async () => {
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
      
      streamRef.current = stream;
      
      // Create audio context
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;
      
      // Create microphone source
      const micSource = audioContext.createMediaStreamSource(stream);
      
      // Set up audio processing
      if (audioContext.audioWorklet) {
        try {
          // Load audio processor worklet
          await audioContext.audioWorklet.addModule('/audio-processor.js');
          
          // Create worklet node
          const processorNode = new AudioWorkletNode(audioContext, 'audio-processor');
          processorRef.current = processorNode;
          
          // Connect the microphone to the processor
          micSource.connect(processorNode);
          
          // Handle messages from the processor
          processorNode.port.onmessage = (event) => {
            if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
              // Send audio data to the WebSocket
              websocketRef.current.send(JSON.stringify({
                type: 'audio',
                audio: event.data.buffer.toString('base64'),
              }));
            }
          };
          
          setIsListening(true);
          console.log('Audio capture started');
        } catch (err) {
          console.error('Error loading audio worklet:', err);
          setError('Failed to load audio processor');
        }
      } else {
        setError('Audio Worklet API not supported in this browser');
      }
    } catch (err) {
      console.error('Error accessing microphone:', err);
      setError(`Microphone access error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };
  
  // Toggle listening state
  const toggleListening = () => {
    if (isListening) {
      // Stop listening
      if (processorRef.current) {
        processorRef.current.disconnect();
      }
      setIsListening(false);
    } else {
      // Resume listening
      if (streamRef.current && audioContextRef.current && processorRef.current) {
        const micSource = audioContextRef.current.createMediaStreamSource(streamRef.current);
        micSource.connect(processorRef.current);
        setIsListening(true);
      } else {
        startAudioCapture();
      }
    }
  };
  
  return (
    <div className={styles.speechConnection}>
      <div className={styles.statusIndicator}>
        <div 
          className={`${styles.indicator} ${isConnected ? styles.connected : ''}`}
          title={isConnected ? 'Connected' : 'Disconnected'}
        ></div>
        <span>{isConnected ? 'AI Connected' : 'AI Disconnected'}</span>
      </div>
      
      {error && (
        <div className={styles.error}>
          {error}
        </div>
      )}
      
      <button 
        className={`${styles.listenButton} ${isListening ? styles.listening : ''}`}
        onClick={toggleListening}
        disabled={!isConnected}
      >
        {isListening ? 'Pause' : 'Listen'}
      </button>
      
      <div className={styles.transcript}>
        {transcript || 'Conversation will appear here...'}
      </div>
    </div>
  );
};

export default GeminiSpeechConnection;
