'use client';

import React, { useEffect, ReactNode, useCallback } from 'react';
import { DataPacket_Kind, RemoteParticipant, ConnectionState, Room as LiveKitRoomType, LocalParticipant, RoomEvent, Track, TrackPublication, TrackEvent } from 'livekit-client';
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
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth
import { InteractionContextPayload, FrontendDataChannelMessage, CurrentContext } from '@/types/contentTypes'; // Import necessary types
import { sendContextToAgentViaRPC, AgentRpcUpdateContextArgs } from '../utils/agentRpcClient'; // Added import for RPC

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
  
  // Define handleTrackSubscribed using useCallback at the component scope
  const handleTrackSubscribed = useCallback((track: Track, publication: TrackPublication, participant: RemoteParticipant) => {
    console.log('Global Audio Monitor: New track subscribed', {
      trackSid: track?.sid,
      source: track?.source,
      kind: track?.kind,
      isEnabled: publication?.isEnabled, // Use publication.isEnabled
      participantIdentity: participant?.identity,
    });
    
    // Check if this is an audio track and log detailed information
    if (track?.kind === Track.Kind.Audio) {
      console.log('Global Audio Monitor: AUDIO TRACK AVAILABLE', {
        trackSid: track?.sid,
        source: track?.source,
        isEnabled: publication?.isEnabled, // Use publication.isEnabled
        participantIdentity: participant?.identity,
      });
      
      // Monitor when this track is started/stopped
      (track as Track)?.on(TrackEvent.AudioPlaybackStarted, () => {
        console.log(`Global Audio Monitor: Audio track ${track.sid} STARTED playing`); 
      });
      
      // TODO: Implement robust cleanup for these track-specific listeners.
      // This typically involves storing track and handler references to call .off() when
      // the track is unpublished or AudioTracksLogger unmounts.
      (track as Track)?.on(TrackEvent.AudioPlaybackFailed, () => {
        console.log(`Global Audio Monitor: Audio track ${track.sid} ENDED playing`);
      });
    }
  }, []); // Empty dependency array for useCallback, assuming no external changing dependencies from component scope are used inside.

  useEffect(() => {
    if (!room) return;
    
    // Add a listener for new track subscriptions
    room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
    
    // Log all existing tracks on mount
    console.log('Global Audio Monitor: All remote participants:', 
      remoteParticipants.map((p: RemoteParticipant) => ({ 
        identity: p.identity, 
        audioTracks: Array.from(p.trackPublications.values())
          .filter((pub: TrackPublication) => pub.kind === Track.Kind.Audio)
          .map((pub: TrackPublication) => ({
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
  }, [room, remoteParticipants, handleTrackSubscribed]);
  
  return null; // Purely for logging, no UI
};

// Props for LiveKitSessionInternal
interface LiveKitSessionInternalProps {
  children: ReactNode;
  onDataReceived: (data: any) => void;
}

// New component to log audio tracks for a single participant
const ParticipantAudioLogger: React.FC<{ participant: RemoteParticipant }> = ({ participant }) => {
  // Query audio tracks using both Source.Unknown to catch all possible sources
  const audioTracksFromUnknown = useTracks([{ source: Track.Source.Unknown, participant }]);
  const audioTracksFromMicrophone = useTracks([{ source: Track.Source.Microphone, participant }]);
  
  // Use all track types to find anything that might be audio
  const allTracks = useTracks([{ participant }]);
  const possibleAudioTracks = allTracks.filter(track => 
    track.publication?.kind === Track.Kind.Audio || 
    track.track?.kind === Track.Kind.Audio
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
        isEnabled: ref.publication?.isEnabled,
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
        isEnabled: ref.publication?.isEnabled,
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
        isEnabled: ref.publication?.isEnabled,
      }))
    );

    // Also log raw track publications from the participant
    const rawAudioPublications = Array.from(participant.trackPublications.values())
      .filter(pub => pub.kind === Track.Kind.Audio);
    
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
const LiveKitSessionInternal: React.FC<LiveKitSessionInternalProps> = ({ children, onDataReceived }) => {
  const AGENT_PARTICIPANT_IDENTITY = process.env.NEXT_PUBLIC_LIVEKIT_AGENT_IDENTITY || "rox-agent-dev-fallback";
  console.log("LK Session Internal: Frontend is configured to look for agent identity:", AGENT_PARTICIPANT_IDENTITY);

  const room = useRoomContext();
  const { sessionId, setSessionId, currentContext: appCurrentContext, updateCurrentContext } = useAppContext(); // Added setSessionId
  const { user: authenticatedUser, isLoading: authIsLoading } = useAuth();
  console.log('LK Session Internal: Rendering');
  const { localParticipant } = useLocalParticipant(); 
  const connectionState = useConnectionState();
  const remoteParticipants = useRemoteParticipants();

  // Debugging remote participants and their audio tracks
  useEffect(() => {
    console.log('LK Session Internal: Remote Participants Changed:', remoteParticipants.map((p: RemoteParticipant) => ({id: p.identity, name: p.name, tracks: Array.from(p.trackPublications.values()).map((pub: TrackPublication) => pub.source)})));
    remoteParticipants.forEach((participant: RemoteParticipant) => {
      console.log(`LK Session Internal: Monitoring participant ${participant.identity}`);
      participant.on(RoomEvent.TrackPublished, (trackPublication: TrackPublication) => {
        console.log(`LK Session Internal: Track PUBLISHED for ${participant.identity}: ${trackPublication.source}, SID: ${trackPublication.trackSid}`);
        if (trackPublication.source === Track.Source.Microphone) {
          console.log(`LK Session Internal: Audio track published by ${participant.identity}. Subscribing if not already.`);
          // Subscription usually happens automatically or is managed by RoomAudioRenderer
        }
      });
      participant.on(RoomEvent.TrackUnpublished, (trackPublication: TrackPublication) => {
        console.log(`LK Session Internal: Track UNPUBLISHED for ${participant.identity}: ${trackPublication.source}, SID: ${trackPublication.trackSid}`);
      });
      participant.on(RoomEvent.TrackSubscribed, (track: Track, trackPublication: TrackPublication) => {
        console.log(`LK Session Internal: Track SUBSCRIBED for ${participant.identity}: ${track.source}, SID: ${track.sid}`);
      });
      participant.on(RoomEvent.TrackUnsubscribed, (track: Track, trackPublication: TrackPublication) => {
        console.log(`LK Session Internal: Track UNSUBSCRIBED for ${participant.identity}: ${track.source}, SID: ${track.sid}`);
      });
      participant.on(RoomEvent.TrackMuted, (trackPublication: TrackPublication) => {
        console.log(`LK Session Internal: Track MUTED for ${participant.identity}: ${trackPublication.source}`);
      });
      participant.on(RoomEvent.TrackUnmuted, (trackPublication: TrackPublication) => {
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
    console.log('LK Session Internal: Connection/Room Effect. State:', connectionState, 'Room available:', !!room);
    if (connectionState === ConnectionState.Connected && room) {
      console.log('LK Session Internal: Connected. Full Room Object:', room);
      console.log('LK Session Internal: Attempting to access room.name:', room.name);
      // Attempt to access room's ID (Session ID) using roomID based on internal logs
      const newSid = (room as any).roomInfo?.sid; 
      console.log('LK Session Internal: Attempting to access room.roomInfo?.sid:', newSid);
      if (typeof newSid === 'string' && newSid) {
        if (sessionId !== newSid) {
          console.log(`LK Session Internal: Setting AppContext sessionId from room SID: ${newSid}. Previous AppContext sessionId: ${sessionId}`);
          setSessionId(newSid); // Update global session ID
        } else {
          console.log(`LK Session Internal: Room SID ${newSid} matches AppContext sessionId. No update needed.`);
        }
        console.log(`LK Session Internal: Connected. Room ID (SID): ${newSid}, Local Participant ID: ${localParticipant?.identity}`);
      } else {
        console.warn('LK Session Internal: room.roomInfo?.sid was not a valid string or was empty.');
      }
      // Optionally, update other parts of currentContext upon connection if needed
      // For example: updateCurrentContext({ task_stage: 'session_active_listening_for_agent' });
    } else if (connectionState === ConnectionState.Disconnected) {
      if (sessionId) {
        console.log("LK Session Internal: Disconnected. Clearing AppContext sessionId. Previous value:", sessionId);
        setSessionId(''); // Clear global session ID
      } else {
        console.log("LK Session Internal: Disconnected. AppContext sessionId was already empty.");
      }
      // Optionally, update other parts of currentContext upon disconnection
      // For example: updateCurrentContext({ task_stage: 'session_ended' });
    }
    // Error handling is primarily managed by the onError prop of the <LiveKitRoom> component.
    // This useEffect focuses on state changes like connected/disconnected.

  }, [room, connectionState, localParticipant, sessionId, setSessionId, updateCurrentContext]);

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

  const handleNavigateToSection = React.useCallback(async (section: string, questionType: string, promptId: string) => {
    // Hooks are defined at the top of LiveKitSessionInternal, no need to redefine here
    if (authIsLoading || !room || !sessionId || !authenticatedUser || !authenticatedUser.id) {
      console.warn("LiveKitSession: Not ready for RPC (missing room, session ID, or auth).");
      return;
    }
    const newContext: CurrentContext = {
      user_id: authenticatedUser.id,
      toefl_section: section,
      question_type: questionType,
      task_stage: "viewing_prompt",
      current_prompt_id: promptId,
      // Ensuring other potential CurrentContext fields are considered, defaulting from app context or to null/empty
      ui_element_in_focus: appCurrentContext?.ui_element_in_focus || undefined,
      timer_value_seconds: appCurrentContext?.timer_value_seconds || 0,
      selected_tools_or_options: appCurrentContext?.selected_tools_or_options || {},
      last_interaction: appCurrentContext?.last_interaction || undefined,
    };
    updateCurrentContext(newContext); // Update global React state
  }, [room, sessionId, updateCurrentContext, authenticatedUser, authIsLoading, appCurrentContext, AGENT_PARTICIPANT_IDENTITY]);

  const handleSubmitInteraction = React.useCallback(async (finalStage: CurrentContext['task_stage'], transcriptText?: string) => {
    // Hooks are defined at the top of LiveKitSessionInternal, no need to redefine here
    if (authIsLoading || !room || !sessionId || !authenticatedUser || !authenticatedUser.id) return;
    
    const submissionContext: CurrentContext = {
      ...(appCurrentContext || { 
        user_id: authenticatedUser.id, // Base user_id if appCurrentContext is null 
        toefl_section: null, question_type: null, current_prompt_id: null // other required fields
      }),
      user_id: authenticatedUser.id, // Ensure user_id is always set
      task_stage: finalStage, 
    };
    updateCurrentContext(submissionContext);

    const rpcPayload: AgentRpcUpdateContextArgs & { transcript_if_relevant?: string } = {
        current_context: submissionContext,
        session_id: sessionId,
    };

    // const agentIdentity = AGENT_PARTICIPANT_IDENTITY; // agentIdentity no longer needed for this call
    // rpcPayload is AgentRpcUpdateContextArgs { current_context, session_id }
    await sendContextToAgentViaRPC(room, rpcPayload.current_context, rpcPayload.session_id);

  }, [room, sessionId, appCurrentContext, updateCurrentContext, authenticatedUser, authIsLoading, AGENT_PARTICIPANT_IDENTITY]);

  const handleTestInteractionRPC = React.useCallback(async () => {
    console.log("LiveKitSessionInternal: handleTestInteractionRPC invoked.");
    // Hooks are defined at the top of LiveKitSessionInternal, no need to redefine here
    
    // TEMPORARILY MODIFIED FOR TESTING WITHOUT FULL AUTH
    // Original: if (authIsLoading || !room || !sessionId || !authenticatedUser || !authenticatedUser.id) {
    if (authIsLoading || !room || !sessionId) { // Temporarily remove authenticatedUser check
      console.warn("LiveKitSessionInternal: Conditions not met for Test RPC (Auth check bypassed):", {
        authIsLoading,
        hasRoom: !!room,
        hasSessionId: !!sessionId,
        // authenticatedUser check is currently bypassed
        // hasAuthUser: !!authenticatedUser, 
        // hasAuthUserId: !!authenticatedUser?.id,
      });
      return;
    }

    // Provide a mock user ID if authenticatedUser is not available
    const userIdForTest = authenticatedUser?.id || "test-user-rpc"; 

    const testContext: CurrentContext = {
        user_id: userIdForTest, // Use the mock or real ID,
        toefl_section: "RPC_Test_Section",
        question_type: "RPC_Test_QType",
        task_stage: "testing_rpc_context_send",
        current_prompt_id: "RPC_PROMPT_789",
        // Ensuring other potential CurrentContext fields are considered
        ui_element_in_focus: undefined,
        timer_value_seconds: 0,
        selected_tools_or_options: {},
        last_interaction: undefined, // This will be updated by updateCurrentContext call, or simply omit this line
    };
    updateCurrentContext({ 
        ...testContext,
        last_interaction: { type: "test_rpc_send", payload: {}, timestamp: new Date().toISOString() }
    });

    const rpcPayload: AgentRpcUpdateContextArgs = {
      current_context: testContext, 
      session_id: sessionId
    };
    
    const agentIdentity = AGENT_PARTICIPANT_IDENTITY;

    if (room) {
      console.log('LK Session Internal: Checking participants before RPC call...');
      const remoteParticipants = Array.from(room.remoteParticipants.values());
      console.log('LK Session Internal: Remote participant identities at RPC call time:', remoteParticipants.map(p => p.identity));
      console.log(`LK Session Internal: Number of remote participants: ${remoteParticipants.length}`);
      remoteParticipants.forEach((p: RemoteParticipant) => { // Explicitly type p
        console.log(`LK Session Internal: Remote Participant: Identity='${p.identity}', SID='${p.sid}', Name='${p.name}'`);
      });

      // Log All Participants (Local + Remote)
      const localP = room.localParticipant;
      const allParticipantsArray: (LocalParticipant | RemoteParticipant)[] = [];
      if (localP) {
        allParticipantsArray.push(localP);
      }
      allParticipantsArray.push(...remoteParticipants); // Spread remote participants

      console.log(`LK Session Internal: Number of all participants (incl. local): ${allParticipantsArray.length}`);
      allParticipantsArray.forEach((p: LocalParticipant | RemoteParticipant) => { // Explicitly type p
        // Common properties: identity, sid, name
        console.log(`LK Session Internal: Participant (any): Identity='${p.identity}', SID='${p.sid}', Name='${p.name}'`);
      });
    } else {
      console.warn("LK Session Internal: Room object is null, cannot list participants or send RPC.");
    }

    // Ensure room is not null before attempting RPC
    if (room) {
        // Assuming rpcPayload (AgentRpcUpdateContextArgs) and agentIdentity are defined in this scope
        // sendContextToAgentViaRPC now takes (room, contextPayload, sessionId) and returns boolean
        const success = await sendContextToAgentViaRPC(room, rpcPayload.current_context, rpcPayload.session_id);
        if (!success) {
          console.error("LiveKitSession: Failed to update agent context via RPC (RPC call failed).");
          // Handle error in UI if needed
        }
    } else {
        console.error("LiveKitSession: Cannot send RPC because room object is null.");
    }
  }, [room, sessionId, appCurrentContext, updateCurrentContext, authenticatedUser, authIsLoading, AGENT_PARTICIPANT_IDENTITY]);

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
          onClick={handleTestInteractionRPC} disabled={authIsLoading}
          style={{ padding: '8px 12px', backgroundColor: 'lightgreen', border: '1px solid green', borderRadius: '4px', cursor: 'pointer' }}
        >
          Test Interaction RPC
        </button>
      </div>
      {/* Use hook to monitor all audio tracks in the room */}
      <AudioTracksLogger />
      {remoteParticipants.map((p: RemoteParticipant) => (
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
      <AudioTracksLogger />      <RoomAudioRenderer />
    </LiveKitRoom>
  );
};

export default LiveKitSession;