'use client';

import React, { useEffect, ReactNode } from 'react';
import { DataPacket_Kind, RemoteParticipant, ConnectionState, Room as LiveKitRoomType, LocalParticipant, RoomEvent, Track, TrackPublication } from 'livekit-client';
import {
    LiveKitRoom,
    useLocalParticipant,
    useRoomContext,
    useConnectionState,
    RoomAudioRenderer,
    useRemoteParticipants,
    useTracks
} from '@livekit/components-react';
import { useAppContext } from '@/contexts/Appcontext'; // Corrected casing based on memory
import { InteractionContextPayload, FrontendDataChannelMessage, CurrentContext } from '@/types/contentTypes'; // Import necessary types

interface LiveKitSessionProps {
  token: string;
  serverUrl: string;
  onDataReceived: (data: any) => void; // Callback for data packets from rox/page.tsx
  children: ReactNode;
}

// Component to log all audio tracks in the room
const AudioTracksLogger: React.FC = () => {
  const room = useRoomContext();
  const remoteParticipants = useRemoteParticipants();
  
  useEffect(() => {
    if (!room) return;
    
    // Add a listener for new track subscriptions
    const handleTrackSubscribed = (track: any, publication: any, participant: any) => {
      console.log('Global Audio Monitor: New track subscribed', {
        trackSid: track?.sid,
        source: track?.source,
        kind: track?.kind,
        isEnabled: track?.isEnabled,
        participantIdentity: participant?.identity,
      });
      
      // Check if this is an audio track and log detailed information
      if (track?.kind === 'audio') {
        console.log('Global Audio Monitor: AUDIO TRACK AVAILABLE', {
          trackSid: track?.sid,
          source: track?.source,
          isEnabled: track?.isEnabled,
          participantIdentity: participant?.identity,
        });
        
        // Monitor when this track is started/stopped
        track.on('started', () => {
          console.log(`Global Audio Monitor: Audio track ${track.sid} STARTED playing`); 
        });
        
        track.on('ended', () => {
          console.log(`Global Audio Monitor: Audio track ${track.sid} ENDED playing`);
        });
      }
    };
    
    room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
    
    // Log all existing tracks on mount
    console.log('Global Audio Monitor: All remote participants:', 
      remoteParticipants.map(p => ({ 
        identity: p.identity, 
        audioTracks: Array.from(p.trackPublications.values())
          .filter(pub => pub.kind === 'audio')
          .map(pub => ({
            sid: pub.trackSid,
            source: pub.source,
            subscribed: pub.isSubscribed,
            muted: pub.isMuted
          }))
      }))
    );
    
    return () => {
      room.off(RoomEvent.TrackSubscribed, handleTrackSubscribed);
    };
  }, [room, remoteParticipants]);
  
  return null; // Purely for logging, no UI
};

// New component to log audio tracks for a single participant
const ParticipantAudioLogger: React.FC<{ participant: RemoteParticipant }> = ({ participant }) => {
  // Query audio tracks using both Source.Unknown to catch all possible sources
  const audioTracksFromUnknown = useTracks([{ source: Track.Source.Unknown, participant }]);
  const audioTracksFromMicrophone = useTracks([{ source: Track.Source.Microphone, participant }]);
  
  // Use all track types to find anything that might be audio
  const allTracks = useTracks([{ participant }]);
  const possibleAudioTracks = allTracks.filter(track => 
    track.publication?.kind === 'audio' || 
    track.track?.kind === 'audio'
  );

  useEffect(() => {
    console.log(
      `LK Session Internal - ParticipantAudioLogger - Audio Tracks from Source.Unknown for ${participant.identity}:`,
      audioTracksFromUnknown.map(ref => ({
        sid: ref.publication?.trackSid,
        subscribed: ref.publication?.isSubscribed,
        muted: ref.publication?.isMuted,
        kind: ref.publication?.kind,
        source: ref.publication?.source,
        trackName: ref.publication?.trackName,
        isEnabled: ref.track?.isEnabled,
      }))
    );

    console.log(
      `LK Session Internal - ParticipantAudioLogger - Audio Tracks from Source.Microphone for ${participant.identity}:`,
      audioTracksFromMicrophone.map(ref => ({
        sid: ref.publication?.trackSid,
        subscribed: ref.publication?.isSubscribed,
        muted: ref.publication?.isMuted,
        kind: ref.publication?.kind,
        source: ref.publication?.source,
        trackName: ref.publication?.trackName,
        isEnabled: ref.track?.isEnabled,
      }))
    );

    console.log(
      `LK Session Internal - ParticipantAudioLogger - ALL possible audio tracks for ${participant.identity}:`,
      possibleAudioTracks.map(ref => ({
        sid: ref.publication?.trackSid,
        subscribed: ref.publication?.isSubscribed,
        muted: ref.publication?.isMuted,
        kind: ref.publication?.kind,
        source: ref.publication?.source,
        trackName: ref.publication?.trackName,
        isEnabled: ref.track?.isEnabled,
      }))
    );

    // Also log raw track publications from the participant
    const rawAudioPublications = Array.from(participant.trackPublications.values())
      .filter(pub => pub.kind === 'audio');
    
    console.log(
      `LK Session Internal - ParticipantAudioLogger - RAW Audio TrackPublications for ${participant.identity}:`,
      rawAudioPublications.map(pub => ({
        sid: pub.trackSid,
        subscribed: pub.isSubscribed,
        muted: pub.isMuted,
        kind: pub.kind,
        source: pub.source,
        trackName: pub.trackName,
      }))
    );
  }, [audioTracksFromUnknown, audioTracksFromMicrophone, possibleAudioTracks, participant.identity, participant.name, participant.trackPublications]);

  return null; // This component is only for logging
};

// Internal component to house logic that needs LiveKit context
const LiveKitSessionInternal: React.FC<{ children: ReactNode; onDataReceived: (data: any) => void; }> = ({ children, onDataReceived }) => {
  console.log('LK Session Internal: Rendering');
  const room = useRoomContext(); 
  const { localParticipant } = useLocalParticipant(); 
  const connectionStateValue = useConnectionState();
  const remoteParticipants = useRemoteParticipants(); // Get remote participants
  console.log('LK Session Internal: Connection State:', connectionStateValue);
  const { sessionId, setSessionId, updateCurrentContext, currentContext } = useAppContext();

  // Debugging remote participants and their audio tracks
  useEffect(() => {
    console.log('LK Session Internal: Remote Participants Changed:', remoteParticipants.map(p => ({id: p.identity, name: p.name, tracks: Array.from(p.trackPublications.values()).map((pub: TrackPublication) => pub.source)})));
    remoteParticipants.forEach(participant => {
      console.log(`LK Session Internal: Monitoring participant ${participant.identity}`);
      participant.on(RoomEvent.TrackPublished, (trackPublication) => {
        console.log(`LK Session Internal: Track PUBLISHED for ${participant.identity}: ${trackPublication.source}, SID: ${trackPublication.trackSid}`);
        if (trackPublication.source === Track.Source.Microphone) {
          console.log(`LK Session Internal: Audio track published by ${participant.identity}. Subscribing if not already.`);
          // Subscription usually happens automatically or is managed by RoomAudioRenderer
        }
      });
      participant.on(RoomEvent.TrackUnpublished, (trackPublication) => {
        console.log(`LK Session Internal: Track UNPUBLISHED for ${participant.identity}: ${trackPublication.source}, SID: ${trackPublication.trackSid}`);
      });
      participant.on(RoomEvent.TrackSubscribed, (track, trackPublication) => {
        console.log(`LK Session Internal: Track SUBSCRIBED for ${participant.identity}: ${track.source}, SID: ${track.sid}`);
      });
      participant.on(RoomEvent.TrackUnsubscribed, (track, trackPublication) => {
        console.log(`LK Session Internal: Track UNSUBSCRIBED for ${participant.identity}: ${track.source}, SID: ${track.sid}`);
      });
      participant.on(RoomEvent.TrackMuted, (trackPublication) => {
        console.log(`LK Session Internal: Track MUTED for ${participant.identity}: ${trackPublication.source}`);
      });
      participant.on(RoomEvent.TrackUnmuted, (trackPublication) => {
        console.log(`LK Session Internal: Track UNMUTED for ${participant.identity}: ${trackPublication.source}`);
      });
    });

    // Cleanup listeners when component unmounts or participants change
    return () => {
      remoteParticipants.forEach(participant => {
        // Consider how to best remove specific listeners if LiveKit SDK doesn't auto-clean on participant disconnect
        // For now, relying on SDK's internal cleanup or new instances for new participants
      });
    };
  }, [remoteParticipants]);

  // Original useEffect for connection/room state
  useEffect(() => {
    console.log('LK Session Internal: Connection/Room Effect. State:', connectionStateValue, 'Room available:', !!room);
    if (connectionStateValue === 'connected' && room) {
      console.log('LK Session Internal: Connected. Full Room Object:', room);
      console.log('LK Session Internal: Attempting to access room.name:', room.name);
      // Attempt to access room's ID (Session ID) using roomID based on internal logs
      const newSid = (room as any).roomInfo?.sid; 
      console.log('LK Session Internal: Attempting to access room.roomInfo?.sid:', newSid);
      if (typeof newSid === 'string' && newSid) {
        setSessionId(newSid);
        console.log(`LK Session Internal: Successfully set sessionId: ${newSid}`);
        console.log(`LK Session Internal: Connected. Room ID (SID): ${newSid}, Local Participant ID: ${localParticipant?.identity}`);
      } else {
        console.warn(
                `LK Session Internal: room.roomInfo?.sid is not a string starting with 'RM_' or is undefined/empty. Actual value: ${newSid}. This is unexpected. Room object:`,
                room,
            );
        // Fallback or further error handling if sid is crucial and missing
      }
      // Optionally, update other parts of currentContext upon connection if needed
      // For example: updateCurrentContext({ task_stage: 'session_active_listening_for_agent' });
    } else if (connectionStateValue === 'disconnected') {
      setSessionId(''); // Clear session ID
      // Optionally, update other parts of currentContext upon disconnection
      // For example: updateCurrentContext({ task_stage: 'session_ended' });
      console.log("LK Session Internal: Disconnected.");
    }
    
    // Error handling is primarily managed by the onError prop of the <LiveKitRoom> component.
    // This useEffect focuses on state changes like connected/disconnected.

  }, [room, connectionStateValue, setSessionId, updateCurrentContext, localParticipant]);

  // Note: The complex data sending logic (sendInteractionDataToAgent, handleNavigateToSection, etc.)
  // from the previous version of LiveKitSessionContextualLogic would also go here if it's intended to be part of this component's responsibility
  // and if it needs direct access to `localParticipant` or `room` from context.
  // For now, this internal component focuses on context setup (sessionId) and logging connection state.
  // The primary data reception is handled by LiveKitRoom's onDataReceived prop.

  useEffect(() => {
    if (room && onDataReceived) {
      const handleData = (
        payload: Uint8Array,
        p?: RemoteParticipant, // Renamed to avoid conflict with localParticipant from hook
        kind?: DataPacket_Kind
      ) => {
        const dataStr = new TextDecoder().decode(payload);
        try {
          const jsonData = JSON.parse(dataStr);
          onDataReceived(jsonData); // Forward to RoxPage's handler
        } catch (e) {
          console.error('LK Session Internal: Failed to parse data packet:', e);
        }
      };

      room.on(RoomEvent.DataReceived, handleData);
      return () => {
        room.off(RoomEvent.DataReceived, handleData);
      };
    }
  }, [room, onDataReceived]);

  // Function to send interaction data to the agent, structured as FrontendDataChannelMessage
  const sendInteractionDataToAgent = async (interactionPayload: InteractionContextPayload) => {
    if (localParticipant && room) {
      try {
        const messageForAgent: FrontendDataChannelMessage = {
          type: "student_interaction_context",
          payload: interactionPayload
        };
        const encodedData = new TextEncoder().encode(JSON.stringify(messageForAgent));
        await localParticipant.publishData(encodedData, { reliable: true });
        console.log('LK Session Internal: Sent FrontendDataChannelMessage to agent:', messageForAgent);
      } catch (error) {
        console.error('LK Session Internal: Error sending interaction data to agent:', error);
      }
    } else {
      console.warn('LK Session Internal: Local participant or room not available to send data.');
    }
  };

  // Example handler logic that updates context and sends data to the agent.
  // This function would typically be called by a UI element's event handler (e.g., a button click in a child component).
  const handleExampleInteraction = (interactionType: string, payload: any) => {
    // Step 1: Update current context
    const contextUpdatePayload = {
      last_interaction: {
        type: interactionType,
        payload: payload,
        timestamp: new Date().toISOString(),
      },
      // You could add more context updates here based on the interaction
    };
    updateCurrentContext(contextUpdatePayload);
    console.log('LK Session Internal: Context updated due to interaction:', contextUpdatePayload);

    // Step 2: Construct InteractionContextPayload and send to agent
    // The global currentContext from useAppContext() is now updated by updateCurrentContext call above,
    // so it includes last_interaction and any task_stage changes reflected by that update.
    if (!sessionId) {
      console.error('LK Session Internal: Session ID is not available. Cannot send interaction to agent.');
      return;
    }

    const interactionDataForBackend: InteractionContextPayload = {
      current_context: {
        ...currentContext, // This is the full, most up-to-date context from AppContext
        // task_stage might have been updated by updateCurrentContext if logic for it was included there
        // or, more explicitly, it could be set here:
        // task_stage: determineNewTaskStage(interactionType, currentContext.task_stage),
      },
      session_id: sessionId,
      // Example of handling transcript_if_relevant based on interaction type
      transcript_if_relevant: interactionType === 'text_submission' && payload?.text ? payload.text : null,
    };

    sendInteractionDataToAgent(interactionDataForBackend);
  };

  // To make handleExampleInteraction usable by child components (e.g., buttons in rox/page.tsx),
  // you might pass it down via props or make it available through AppContext.
  // For example, if children were React elements, you could clone them and add props:
  // React.Children.map(children, child => 
  //   React.isValidElement(child) ? React.cloneElement(child, { handleExampleInteraction } as any) : child
  // )
  // Or, more robustly, expose it via a context provider wrapping these children if many need it.

  return (
    <>
      {/* Temporary Test Button */}
      <div style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 1000 }}>
        <button 
          onClick={() => {
          if (!sessionId) {
            console.error('LK Session Internal - Test Button: Session ID is not available. Cannot send interaction.');
            return;
          }

          const testCurrentContext: CurrentContext = {
            user_id: "frontend_test_user_007",
            toefl_section: "Speaking",
            question_type: "Q2_Campus_Situation_Test_Button",
            task_stage: "testing_specific_context_from_button",
            current_prompt_id: "BTN_PROMPT_456",
            ui_element_in_focus: "test_interaction_button_v2",
            timer_value_seconds: 90,
            selected_tools_or_options: { "source": "test_button_direct_send", "version": 2 },
            // Ensure all fields expected by your CurrentContext type or backend Pydantic model are considered.
            // Add any other fields from useAppContext().currentContext if they should be part of the base
            // and are not explicitly overridden here. For a clean test, defining all is best.
          };

          const interactionDataForBackend: InteractionContextPayload = {
            current_context: testCurrentContext,
            session_id: sessionId,
            transcript_if_relevant: null, // No transcript for this button click test
          };
          
          console.log("LK Session Internal - Test Button: Sending specific test interaction data:", JSON.stringify(interactionDataForBackend, null, 2));
          sendInteractionDataToAgent(interactionDataForBackend);
        }}
          style={{ padding: '8px 12px', backgroundColor: 'lightgreen', border: '1px solid green', borderRadius: '4px', cursor: 'pointer' }}
        >
          Test Interaction
        </button>
      </div>
      {remoteParticipants.map(p => (
        <ParticipantAudioLogger participant={p} key={p.sid} />
      ))}
      {children}
    </>
  );
};

// Main exported component
export const LiveKitSession: React.FC<LiveKitSessionProps> = ({ token, serverUrl, onDataReceived, children }) => {
  console.log('LK Session Wrapper: Rendering with props:', { token: token ? 'Token_Exists' : 'No_Token', serverUrl });

  if (!token || !serverUrl) {
    console.warn("LiveKitSession: Token or Server URL is missing. LiveKitRoom will not be rendered.");
    // Render children directly if no token/URL, they won't have LiveKit context.
    // Or display a specific message/component.
    return (
        <div>
            <p>LiveKit is not configured (missing token or server URL).</p>
            {children} {/* Render children so UI doesn't completely break if this is recoverable */}
        </div>
    );
  }

  console.log('LK Session: Setting up LiveKitRoom with RoomAudioRenderer');

  return (
    <LiveKitRoom
      onError={(error) => {
        console.error('LK Session: LiveKitRoom onError:', error);
        // Optionally, you could set an error state here to display to the user
      }}
      token={token}
      serverUrl={serverUrl}
      connect={true}
      audio={true} // Main audio elements likely handled by SimpleTavusDisplay or specific components
      video={false} // Main video elements likely handled by SimpleTavusDisplay or specific components
      // onDataReceived is handled by LiveKitSessionInternal now
      onDisconnected={() => console.log("LiveKitRoom component: Disconnected")}
      onConnected={() => console.log("LiveKitRoom component: Connected and ready for audio")}
    >
      <LiveKitSessionInternal onDataReceived={onDataReceived}>
        {children}
      </LiveKitSessionInternal>
      {/* Audio track debugging */}
      <div style={{ display: 'none' }}>
        <p>Audio renderer present</p>
      </div>
      {/* Use hook to monitor all audio tracks in the room */}
      <AudioTracksLogger />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
};

export default LiveKitSession;