'use client';

import React, { useEffect, useState } from 'react';

interface ScriptLoaderProps {
  children: React.ReactNode;
}

export default function ScriptLoader({ children }: ScriptLoaderProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Skip if already loaded
    if (window.DailyPipecat) {
      setIsLoaded(true);
      return;
    }

    // Load our custom loader script
    const script = document.createElement('script');
    script.src = '/pipecat-sdk.js';
    script.async = true;
    
    // Listen for the custom event when SDK is loaded
    window.addEventListener('daily-sdk-loaded', () => {
      console.log('Daily Pipecat SDK loaded successfully');
      setIsLoaded(true);
    });
    
    // Listen for the custom error event
    window.addEventListener('daily-sdk-load-error', (event) => {
      console.error('Failed to load Daily Pipecat SDK:', event);
      setError('Failed to load Daily Pipecat SDK');
    });
    
    script.onerror = () => {
      console.error('Failed to load custom loader script');
      setError('Failed to load custom loader script');
    };

    document.body.appendChild(script);

    // Cleanup on unmount
    return () => {
      // We don't remove the script as it might be used by other components
    };
  }, []);

  if (error) {
    return (
      <div className="p-4 bg-red-100 text-red-700 rounded-md">
        Error loading Pipecat SDK: {error}
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <span className="ml-3">Loading Pipecat SDK...</span>
      </div>
    );
  }

  return <>{children}</>;
}

declare global {
  interface Window {
    DailyPipecat?: any;
  }
}
