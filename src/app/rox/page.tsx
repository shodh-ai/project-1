'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { RemoteParticipant, DataPacket_Kind } from 'livekit-client'; // Room and RoomEvent are no longer directly used here
import SimpleTavusDisplay from '@/components/SimpleTavusDisplay';
import { LiveKitSession } from '@/components/LiveKitSession'; // Import LiveKitSession
import { useAppContext } from '@/contexts/Appcontext'; // To check session status
import { getTokenEndpointUrl, tokenServiceConfig } from '@/config/services';
import AgentTextInput from '@/components/ui/AgentTextInput';
// Import other UI components if needed, e.g., Button from '@/components/ui/button';
import StudentStatusDisplay from '@/components/StudentStatusDisplay';

export default function RoxPage() {
  const [token, setToken] = useState<string>('');
  // const [room, setRoom] = useState<Room | null>(null); // Managed by LiveKitSession
  // const [isConnected, setIsConnected] = useState(false); // Derived from AppContext or LiveKitSession state
  const [pageError, setPageError] = useState<string | null>(null); // Renamed to avoid conflict if LiveKitSession exposes 'error'
  const [userInput, setUserInput] = useState('');
  // const roomRef = useRef<Room | null>(null); // LiveKitSession manages its room instance
  const [isStudentStatusDisplayOpen, setIsStudentStatusDisplayOpen] = useState(false);
  const docsIconRef = useRef<HTMLImageElement>(null);

  const roomName = 'Roxpage'; // Or dynamically set if needed
  const userName = 'TestUser'; // Or dynamically set if needed

  useEffect(() => {
    const fetchToken = async () => {
      try {
        const tokenUrl = getTokenEndpointUrl(roomName, userName);
        const fetchOptions: RequestInit = { headers: {} };
        if (tokenServiceConfig.includeApiKeyInClient && tokenServiceConfig.apiKey) {
          (fetchOptions.headers as Record<string, string>)['x-api-key'] = tokenServiceConfig.apiKey;
        }
        const resp = await fetch(tokenUrl, fetchOptions);
        if (!resp.ok) throw new Error(`Token service error: ${resp.status}`);
        const data = await resp.json();
        if (data.token) setToken(data.token);
        else throw new Error('No token in response');
      } catch (err) {
        setPageError((err as Error).message);
      }
    };
    fetchToken();
  }, [roomName, userName]);

  // This useEffect for manual connection is now handled by LiveKitSession
  // useEffect(() => { ...manual connection logic... }, [token]);


  const toggleStudentStatusDisplay = () => {
    setIsStudentStatusDisplayOpen(!isStudentStatusDisplayOpen);
  };

  const handleDataReceivedFromLiveKitSession = useCallback((message: any) => { // Expecting already parsed JSON
    // Logic from the old newRoomInstance.on(RoomEvent.DataReceived, ...) is now adapted for parsed message
    // The 'participant', 'kind', 'topic' are no longer directly passed here as LiveKitSession handles the raw event.
    // If needed, LiveKitSession could be modified to pass along participant identity if it's crucial for rox/page.tsx logic.
    console.log('RoxPage: Received parsed message via LiveKitSession:', message);
    try {
        // DOM Action processing logic
        if (message?.delta?.metadata?.dom_actions) {
          const domActionsStr = message.delta.metadata.dom_actions;
          try {
            const domActions = JSON.parse(domActionsStr);
            if (Array.isArray(domActions)) {
              domActions.forEach((actionItem: any) => { // Added type for actionItem
                try { // Inner try-catch for individual action processing
                  if (actionItem.action === 'click' && actionItem.payload?.selector === '#statusViewButton') {
                    console.log('RoxPage: Agent requested to toggle StudentStatusDisplay via #statusViewButton selector from metadata');
                    toggleStudentStatusDisplay();
                  } else if (actionItem.action === 'click' && actionItem.payload?.selector) {
                    const targetElement = document.querySelector(actionItem.payload.selector);
                    if (targetElement && typeof (targetElement as HTMLElement).click === 'function') {
                      console.log(`RoxPage: Agent requested click on element: ${actionItem.payload.selector}`);
                      (targetElement as HTMLElement).click();
                    } else {
                      console.warn(`RoxPage: DOM Action - Element not found or not clickable for selector: ${actionItem.payload.selector}`);
                    }
                  }
                  // Add more 'else if' blocks for other actions like 'type', 'scroll', etc.
                } catch (actionError) {
                  console.error('RoxPage: Error processing individual DOM action:', actionItem, actionError);
                }
              });
            } else {
              console.warn('RoxPage: dom_actions from metadata is not an array:', domActions);
            }
          } catch (jsonParseError) {
            console.error('RoxPage: Failed to parse dom_actions JSON string from metadata:', domActionsStr, jsonParseError);
          }
        } else {
          // console.log('RoxPage: No dom_actions found in message metadata or message structure is different.');
        }

      // Handle other message types or properties from the parsed 'message' object
      // For instance, if the message contains text to display:
      // if (message?.text_content) { setAgentResponse(message.text_content); }

    } catch (error) {
      console.error('RoxPage: Error processing received message in LiveKitSession callback:', error);
    }
  }, [toggleStudentStatusDisplay]); // Added toggleStudentStatusDisplay to dependency array // Add dependencies if toggleStudentStatusDisplay or other external functions are used and not stable


  const handleSendMessageToAgent = () => {
    if (userInput.trim()) {
      console.log('Sending to agent:', userInput);
      // TODO: Add Socket.IO or LiveKit agent communication logic here
      setUserInput(''); // Clear input after sending
    }
  };

  // const handleDisconnect = () => { // LiveKitSession handles its own disconnect lifecycle
  //   // If you need an explicit disconnect button, LiveKitSession would need to expose a disconnect function
  // };
  return (
    <div className="flex h-screen bg-white text-gray-800 overflow-hidden bg-[image:radial-gradient(ellipse_at_top_right,_#B7C8F3_0%,_transparent_70%),_radial-gradient(ellipse_at_bottom_left,_#B7C8F3_0%,_transparent_70%)]">
      {/* Sidebar */}
      <aside className="w-20 p-4 flex flex-col items-center space-y-6">
        <Image src="/final-logo-1.png" alt="Logo" width={32} height={32} className="rounded-lg" />
        <div className="flex-grow flex flex-col items-center justify-center space-y-4">
          <Image src="/user.svg" alt="User Profile" width={24} height={24} className="cursor-pointer hover:opacity-75" />
          <Image src="/mic-on.svg" alt="Mic On" width={24} height={24} className="cursor-pointer hover:opacity-75" />
          <Image src="/next.svg" alt="Next" width={24} height={24} className="cursor-pointer hover:opacity-75" />
          <Image ref={docsIconRef} id="statusViewButton" src="/docs.svg" alt="Docs" width={24} height={24} className="cursor-pointer hover:opacity-75" onClick={toggleStudentStatusDisplay} />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-8 relative">
        {/* Avatar Display - Centered */} 
        {/* LiveKitSession will be rendered here, it handles its own display or provides context for SimpleTavusDisplay */}
        <LiveKitSession 
            token={token} 
            serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL || ''} 
            onDataReceived={handleDataReceivedFromLiveKitSession} 
        >
            {/* Render SimpleTavusDisplay as a child. It should pick up context from LiveKitSession/LiveKitRoom. */}
            { useAppContext().sessionId ? (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" style={{ top: '30%' }}>
                    {/* SimpleTavusDisplay no longer needs 'room' prop if it uses LiveKit hooks like useRoomContext() */}
                    <SimpleTavusDisplay /> 
                </div>
            ) : (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" style={{ top: '30%' }}>
                    <div className="w-40 h-40 bg-slate-200 rounded-full flex items-center justify-center text-gray-700">
                        <p className="text-sm">{pageError ? `Error: ${pageError}` : (token ? 'Initializing Session...' : 'No Token')}</p>
                    </div>
                </div>
            )}
        </LiveKitSession>


        <div className="w-full max-w-3xl absolute bottom-0 mb-12 flex flex-col items-center">
            <p className="text-xl mb-6 text-gray-600" style={{ marginTop: '100px' }}>Hello, I am Rox, your AI Assistant!</p>
            
            {/* Input Area */}
            <div className="w-full bg-white border border-gray-300 rounded-xl p-1 flex items-center shadow-xl relative" style={{ minHeight: '56px' }}>
              <AgentTextInput
                value={userInput}
                onChange={setUserInput} // Pass setUserInput directly
                onSubmit={handleSendMessageToAgent} // Use the new submit handler
                placeholder="Ask me anything!"
                className="flex-grow bg-transparent border-none focus:ring-0 resize-none text-gray-800 placeholder-gray-500 p-3 leading-tight"
                rows={1}
              />
            </div>

            {/* Suggestion Boxes */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
              {[ "Summarize my learning so far, what have I covered and how well?", "Improve my speaking skills where am I lacking and how to fix it?", "Show me my mistakes and how I can improve them."].map((text, i) => (
                <div key={i} onClick={() => setUserInput(text)} className="bg-white border border-gray-200 p-4 rounded-lg hover:bg-gray-50 cursor-pointer transition-all">
                  <p className="text-sm text-gray-700 leading-relaxed">{text}</p>
                </div>
              ))}
            </div>
        </div>

        <StudentStatusDisplay 
          isOpen={isStudentStatusDisplayOpen} 
          anchorElement={docsIconRef.current} 
          onClose={toggleStudentStatusDisplay} 
        />
      </main>
    </div>
  );
}
