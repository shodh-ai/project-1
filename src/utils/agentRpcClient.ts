// In LiveKitSession.tsx or a new agentRpcClient.ts
import { Room, LocalParticipant, RemoteParticipant, DataPacket_Kind } from 'livekit-client'; // Assuming Room is available, Added DataPacket_Kind
import { CurrentContext, InteractionContextPayload } from '../types/contentTypes'; // Your existing types

export interface AgentRpcUpdateContextArgs {
    current_context: CurrentContext;
    session_id: string;
}

export interface AgentRpcResponse { // Expected response from the agent's RPC handler
    status: string;
    received_session_id?: string;
    error?: string;
}

export const sendContextToAgentViaRPC = async (
  room: Room | null,
  contextPayload: any, // This should ideally be AgentRpcUpdateContextArgs['current_context']
  sessionId: string    // This should ideally be AgentRpcUpdateContextArgs['session_id']
): Promise<boolean> => {
  if (!room) {
    console.error('RPC_CLIENT: Room object is null. Cannot send RPC.');
    return false;
  }

  const remoteParticipants = Array.from(room.remoteParticipants.values());

  console.log('RPC_CLIENT: All remote participants found:', remoteParticipants.map(p => p.identity));

  if (remoteParticipants.length === 0) {
    console.error('RPC_CLIENT: No remote participants found in the room. Cannot send RPC.');
    return false;
  }

  // Select the first available remote participant.
  // In a multi-agent scenario, more sophisticated logic might be needed.
  const targetParticipant = remoteParticipants[0];
  console.log(`RPC_CLIENT: Selected participant '${targetParticipant.identity}' as RPC target.`);

  try {
    const payloadForAgent: AgentRpcUpdateContextArgs = {
      current_context: contextPayload,
      session_id: sessionId,
    };

    console.log(`RPC_CLIENT: Sending 'updateAgentContext' to participant '${targetParticipant.identity}' with payload:`, payloadForAgent);

    // The Python agent expects a JSON string payload via dispatchData for its RPC mechanism.
    // DataPacket_Kind is not directly used here as dispatchData handles encoding.
    // The agent's on_data_received will parse this string.
    // We use room.localParticipant.publishData to send data to all other participants.
    // The agent (a remote participant) will receive this.
    const encoder = new TextEncoder();
    const data = encoder.encode(
      JSON.stringify({ rpc: { method: 'updateAgentContext', payload: payloadForAgent, targetParticipantIdentity: targetParticipant.identity } })
    );
    await room.localParticipant.publishData(
      data,
      { destinationIdentities: [targetParticipant.identity] }
      // Assuming 'kind' defaults to RELIABLE or is inferred based on previous conflicting lint errors.
      // This is a 2-argument call.
    );

    console.log('RPC_CLIENT: Successfully dispatched updateAgentContext RPC.');
    return true;
  } catch (error) {
    console.error(`RPC_CLIENT: Error sending RPC message to '${targetParticipant.identity}':`, error);
    return false;
  }
};
