'use client';

import React, { useEffect, useState } from 'react';

// Class to manage script loading in sequence
export class ScriptLoader {
  private static loadedScripts: Set<string> = new Set();
  
  // Load a script and return a promise
  static loadScript(src: string): Promise<void> {
    if (this.loadedScripts.has(src)) {
      return Promise.resolve();
    }
    
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      
      script.onload = () => {
        this.loadedScripts.add(src);
        resolve();
      };
      
      script.onerror = () => {
        reject(new Error(`Failed to load script: ${src}`));
      };
      
      document.body.appendChild(script);
    });
  }
  
  // Load scripts in sequence
  static async loadScriptsInSequence(scripts: string[]): Promise<void> {
    for (const script of scripts) {
      await this.loadScript(script);
    }
  }
}

// List of required Pipecat CDN scripts with fallbacks
const PIPECAT_CDN_SCRIPTS = [
  // Main bundle with all components
  'https://cdn.jsdelivr.net/npm/@pipecat-ai/client-js@latest/dist/rtvi-client.min.js',
  // Transport library
  'https://cdn.jsdelivr.net/npm/@pipecat-ai/gemini-live-websocket-transport@latest/dist/gemini-live-websocket-transport.min.js'
];

// List of fallback scripts if CDN fails
const PIPECAT_FALLBACK_SCRIPTS = [
  '/pipecat-rtvi-client.js'
];

// Component to load Pipecat scripts
export default function PipecatClientLoader({ 
  children,
  onLoad,
  onError 
}: { 
  children: React.ReactNode;
  onLoad?: () => void;
  onError?: (error: Error) => void;
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  
  useEffect(() => {
    const loadPipecatScripts = async () => {
      try {
        // Try to load from CDN first
        await ScriptLoader.loadScriptsInSequence(PIPECAT_CDN_SCRIPTS);
        console.log('Pipecat RTVI client loaded from CDN');
        setIsLoaded(true);
        onLoad?.();
      } catch (cdnError) {
        console.warn('Failed to load Pipecat from CDN, trying fallbacks:', cdnError);
        
        try {
          // Try fallback scripts
          await ScriptLoader.loadScriptsInSequence(PIPECAT_FALLBACK_SCRIPTS);
          console.log('Pipecat RTVI client loaded from fallback');
          setIsLoaded(true);
          onLoad?.();
        } catch (fallbackError) {
          console.error('Failed to load Pipecat client:', fallbackError);
          setIsError(true);
          onError?.(fallbackError as Error);
        }
      }
    };
    
    loadPipecatScripts();
  }, [onLoad, onError]);
  
  if (isError) {
    return (
      <div style={{ 
        padding: '20px', 
        backgroundColor: '#fee2e2', 
        color: '#b91c1c',
        borderRadius: '8px',
        margin: '20px 0'
      }}>
        <h3>Failed to load Pipecat client</h3>
        <p>Please check your internet connection and try refreshing the page.</p>
      </div>
    );
  }
  
  if (!isLoaded) {
    return (
      <div style={{ 
        padding: '20px', 
        textAlign: 'center',
        margin: '20px 0'
      }}>
        <p>Loading Pipecat client...</p>
        <div style={{
          width: '40px',
          height: '40px',
          margin: '20px auto',
          border: '4px solid #e2e8f0',
          borderTopColor: '#3b82f6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <style jsx>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }
  
  return <>{children}</>;
}
