#!/usr/bin/env python3
"""
Rox Assistant LiveKit Agent

This script connects the Rox assistant AI agent to LiveKit sessions.
The agent processes audio via the LiveKit SDK and generates responses using
the external agent service defined in external_agent.py.
"""

import os
import sys
import logging
import argparse
import json
import asyncio
from pathlib import Path
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(level=logging.DEBUG, 
                    format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)
import asyncio # Added import
from typing import Optional, List, Dict, Any, Callable, Coroutine, Union # Added Coroutine and Union
from typing import Optional # Ensure Optional is explicitly imported if not covered by the line above
from livekit import rtc # rtc is needed for RemoteParticipant type hint

# Import LiveKit components
from livekit import agents
from livekit.agents import AgentSession, Agent, RoomInputOptions
from livekit.protocol import models as lkmodels # This provides lkmodels for DataPacket type hint

# Import VPA pipeline components
try:
    from livekit.plugins import noise_cancellation
    from livekit.plugins import deepgram, silero, tavus # Import tavus for avatars
    from livekit.plugins.turn_detector.multilingual import MultilingualModel
except ImportError as e:
    logger.error(f"Failed to import required packages: {e}")
    logger.error("Please install the missing packages: pip install 'livekit-agents[deepgram,silero,turn-detector]~=1.0' 'livekit-plugins-noise-cancellation~=0.2' python-dotenv aiohttp")
    sys.exit(1)

# Import the Custom LLM Bridge
try:
    from custom_llm import CustomLLMBridge
except ImportError:
    logger.error("Failed to import CustomLLMBridge. Make sure custom_llm.py exists and aiohttp is installed.")
    sys.exit(1)

# Find and load .env file
script_dir = Path(__file__).resolve().parent
env_path = script_dir / '.env'
if env_path.exists():
    logger.info(f"Loading environment from: {env_path}")
    load_dotenv(dotenv_path=env_path)
else:
    logger.warning(f"No .env file found at {env_path}, using environment variables")
    load_dotenv()

# Verify critical environment variables
required_vars = ["LIVEKIT_URL", "LIVEKIT_API_KEY", "LIVEKIT_API_SECRET", "DEEPGRAM_API_KEY", "MY_CUSTOM_AGENT_URL"]
for var in required_vars:
    value = os.getenv(var)
    if not value:
        logger.error(f"Missing required environment variable: {var}")
        sys.exit(1)
    if var == "DEEPGRAM_API_KEY":
        logger.info(f"DEEPGRAM_API_KEY: {value[:8]}...{value[-4:]} (length: {len(value)})")
    if var == "MY_CUSTOM_AGENT_URL":
        logger.info(f"Using custom agent URL: {value}")

# Check for Tavus credentials (optional)
TAVUS_API_KEY = os.getenv("TAVUS_API_KEY", "")
TAVUS_REPLICA_ID = os.getenv("TAVUS_REPLICA_ID", "")
TAVUS_PERSONA_ID = os.getenv("TAVUS_PERSONA_ID", "") # Persona ID is optional for AvatarSession

# Check if Tavus is properly configured
TAVUS_ENABLED = bool(TAVUS_API_KEY and TAVUS_REPLICA_ID) # Persona ID is not strictly required for AvatarSession init
if TAVUS_ENABLED:
    logger.info("Tavus avatar configuration found")
    masked_key = TAVUS_API_KEY[:4] + "*" * (len(TAVUS_API_KEY) - 8) + TAVUS_API_KEY[-4:] if len(TAVUS_API_KEY) > 8 else "****"
    logger.info(f"Tavus API Key: {masked_key}")
    logger.info(f"Tavus Replica ID: {TAVUS_REPLICA_ID}")
    if TAVUS_PERSONA_ID:
        logger.info(f"Tavus Persona ID: {TAVUS_PERSONA_ID}")
    else:
        logger.info("Tavus Persona ID: Not set (optional)")
else:
    logger.warning("Tavus avatar not configured (missing API Key or Replica ID) - will not use avatar.")

# Create a standard Agent implementation for Rox assistant
import json 
from typing import Optional, Union 
from livekit import rtc, agents

class RoxAgent(agents.Agent):
    """Simple Rox AI assistant"""
    def __init__(self, *, room: rtc.Room, page_path: str, instructions: str):
        print("RoxAgent __init__ ENTERED (PRINT)", flush=True) # For immediate confirmation
        logger.info("RoxAgent __init__ ENTERED (LOGGER)")
        self._initializing_base_voice_agent = True
        super().__init__(instructions=instructions)
        self._initializing_base_voice_agent = False
        self.ctx: Optional[agents.JobContext] = None # Initialize JobContext storage

        self._room = room
        self._page_path = page_path
        self._instructions = instructions # Storing for potential later use, though base class also stores it
        self._avatar_session: Optional[tavus.AvatarSession] = None
        self._chat_history: List[Dict[str, str]] = []
        
        # Initialize latest context storage
        self._latest_student_context: Optional[Dict[str, Any]] = None
        self._latest_session_id: Optional[str] = None
        self._latest_transcript_from_data: Optional[str] = None

        logger.info(f"RoxAgent __init__: self._page_path set to: {self._page_path}")

        logger.info(f"RoxAgent INSTANCE BEING INITIALIZED. page_path: {self._page_path}, GLOBAL_AVATAR_ENABLED: {GLOBAL_AVATAR_ENABLED}")
        self._latest_student_context: Optional[Dict[str, Any]] = None
        self._latest_session_id: Optional[str] = None
        self._latest_transcript_from_data: Optional[str] = None
        self._user_name: str = "User"  # Default user name
        self._task_id: Optional[str] = None
        self._session_id: Optional[str] = None
        self._user_id: Optional[str] = None
        self._agent_id: str = "rox-agent" # Default agent ID, can be customized
        self._current_interaction_id: Optional[str] = None
        self._interaction_history: List[Dict[str, Any]] = []
        self._is_first_interaction: bool = True
        self._accumulated_transcription: str = ""
        self._current_turn_audio: List[bytes] = []
        self._processing_audio_task: Optional[asyncio.Task] = None
        self._audio_out_playing: bool = False
        self._audio_out_buffer = asyncio.Queue()
        self._current_mood: str = "neutral" # Default mood
        self._is_speaking: bool = False
        self._avatar_session: Optional[tavus.AvatarSession] = None
        self._tavus_tts_plugin: Optional[tavus.TTSPlugin] = None

        if GLOBAL_AVATAR_ENABLED:
            logger.info("RoxAgent __init__: Tavus avatar is enabled. Initializing session and TTS plugin.")
            # Ensure Tavus API key is available in environment for the plugin
            os.environ["TAVUS_API_KEY"] = TAVUS_API_KEY 
            self._avatar_session = tavus.AvatarSession(
                replica_id=TAVUS_REPLICA_ID,
                persona_id=TAVUS_PERSONA_ID if TAVUS_PERSONA_ID else None
            )
            # The TTS plugin is usually part of the AgentSession pipeline, 
            # but if you need direct TTS access via Tavus from the agent, initialize it here.
            # self._tavus_tts_plugin = tavus.TTSPlugin(avatar_session=self._avatar_session)
            logger.info("RoxAgent __init__: Tavus AvatarSession initialized. TTSPlugin can be added to AgentSession.")
        else:
            logger.info("RoxAgent __init__: Tavus avatar is NOT enabled.")
        logger.info("RoxAgent __init__ COMPLETED.")

    async def setup(self, ctx: agents.JobContext):
        self.ctx = ctx
        await super().setup(ctx) # Call parent's setup
        logger.info(f"RoxAgent setup complete. Room: {self.ctx.room.name if self.ctx and self.ctx.room else 'Unknown'}")

        # Register RPC handlers that the frontend can call on THIS agent instance
        # The name "updateAgentContext" is what the frontend will use.
        try:
            self.rpc.register_handler("updateAgentContext", self.handle_update_agent_context)
            # `self.rpc` is available on an `agents.Agent` instance.
            # It allows registering handlers for incoming RPC requests targeted at this agent.
            logger.info("RoxAgent: RPC handler 'updateAgentContext' registered.")
        except Exception as e:
            logger.error(f"RoxAgent: Error registering RPC handler: {e}", exc_info=True)
        
        # Comment from user's snippet regarding data_received listener:
        # You can keep your data_received listener for other purposes or if you want a hybrid approach initially,
        # but for sending context, we'll now focus on RPC.
        # If you transition fully, you might remove the data_received listener related to context.
        # self.ctx.room.on("data_received", self._sync_handle_room_data_event) 

    async def handle_update_agent_context(self, 
                                          # Arguments must match what frontend sends
                                          # The LiveKit Python SDK RPC will map keyword arguments from the client
                                          # or positional if client sends a list.
                                          # Let's assume frontend sends an object with these keys.
                                          current_context: Dict[str, Any], 
                                          session_id: str,
                                          # Optional: participant who sent the request (injected by SDK)
                                          # request_participant: rtc.RemoteParticipant = None 
                                          ) -> Dict[str, Any]: # RPC functions can return values
        
        # participant_identity = request_participant.identity if request_participant else "Unknown (RPC)"
        logger.info(f"RoxAgent: RPC 'updateAgentContext' called. Session ID: {session_id}")
        logger.debug(f"RoxAgent: Received current_context via RPC: {current_context}")

        self._latest_student_context = current_context
        self._latest_session_id = session_id
        
        logger.info(f"RoxAgent: Stored via RPC - _latest_student_context: {self._latest_student_context}")
        logger.info(f"RoxAgent: Stored via RPC - _latest_session_id: {self._latest_session_id}")

        # Optionally return an acknowledgement
        return {"status": "Context updated successfully on agent", "received_session_id": session_id}

    @property
    def realtime_llm_session(self):
        if hasattr(self, '_initializing_base_voice_agent') and self._initializing_base_voice_agent:
            # During VoiceAgent's __init__, find_function_tools inspects this.
            # Return None to prevent it from trying to access self._activity too early.
            return None
        # After initialization, defer to the base class's property
        # This assumes VoiceAgent has realtime_llm_session as a property that can be accessed via super()
        if hasattr(super(), 'realtime_llm_session'):
             return super().realtime_llm_session
        return None # Fallback if super property doesn't exist for some reason

    async def on_transcript(self, transcript: str, language: str) -> None:
        """Called when a user transcript is received"""
        logger.info(f"USER SAID: '{transcript}' (language: {language})")
    async def on_reply(self, message: str, audio_url: Optional[str] = None) -> None:
        """Override to log when assistant replies"""
        logger.info(f"ROX ASSISTANT: '{message}'")
        if audio_url:
            logger.info(f"AUDIO REPLY: {message} (Audio URL: {audio_url})")
        else:
            logger.warning("NO AUDIO URL PROVIDED - Speech not generated!")

# Global configuration
GLOBAL_PAGE_PATH = "roxpage"  
GLOBAL_MODEL = "aura-asteria-en"    
GLOBAL_TEMPERATURE = 0.7            
GLOBAL_AVATAR_ENABLED = TAVUS_ENABLED  

async def entrypoint(ctx: agents.JobContext):
    """Main entrypoint for the agent."""
    # logger.info(f"ENTRYPOINT: Job received. Initial ctx.agent type: {type(ctx.agent)}") # Moved down

    # Set identity BEFORE connecting to room
    # This was the pattern before attempting agent_cls, let's restore it for now.
    if GLOBAL_AVATAR_ENABLED:
        ctx.identity = "rox-tavus-avatar-agent"
        logger.info(f"ENTRYPOINT: Set agent identity to: {ctx.identity} for Tavus avatar")
    else:
        env_participant_name = os.getenv("PARTICIPANT_NAME")
        logger.info(f"ENTRYPOINT: Value of env_participant_name read from os.getenv: '{env_participant_name}'")
        if not env_participant_name:
            logger.error("CRITICAL: PARTICIPANT_NAME not set in .env file or is empty. Agent cannot use configured identity.")
            logger.warning("Generating a default dynamic identity as PARTICIPANT_NAME is missing/empty in .env.")
            import uuid # Keep uuid import local to this fallback
            id_suffix = uuid.uuid4().hex[:8]
            ctx.identity = f"rox-agent-dynamic-fallback-{id_suffix}"
        else:
            ctx.identity = env_participant_name
            logger.info(f"ENTRYPOINT: Using PARTICIPANT_NAME from .env for identity: '{ctx.identity}'")
        logger.info(f"ENTRYPOINT: Final agent identity before connecting: {ctx.identity}")

    try:
        logger.info(f"ENTRYPOINT: Attempting to connect to LiveKit room '{ctx.room.name if ctx.room and ctx.room.name else 'details in ctx'}' with identity '{ctx.identity}'...")
        await ctx.connect()
        logger.info(f"ENTRYPOINT: Successfully connected to LiveKit room '{ctx.room.name}' as '{ctx.identity}'")
        logger.info(f"ENTRYPOINT: ctx.agent type after connect: {type(ctx.agent)}") # Log type of ctx.agent AFTER connect

        # Now that ctx is connected and ctx.room is available, instantiate RoxAgent
        # RoxAgent.__init__ may use GLOBAL_PAGE_PATH and set up _avatar_session
        agent_instructions = "You are a helpful AI assistant named Rox."
        rox_agent = RoxAgent(room=ctx.room, page_path=GLOBAL_PAGE_PATH, instructions=agent_instructions)
        logger.info(f"ENTRYPOINT: RoxAgent instance created: {type(rox_agent)} with instructions: '{agent_instructions}'")
        logger.info(f"ENTRYPOINT: RoxAgent page_path: {rox_agent._page_path}")
        logger.info(f"ENTRYPOINT: RoxAgent avatar session initialized: {rox_agent._avatar_session is not None}")

        # Log configuration details from globals
        logger.info(f"ENTRYPOINT: Using Deepgram TTS model: {GLOBAL_MODEL}")
        logger.info(f"ENTRYPOINT: Using LLM temperature: {GLOBAL_TEMPERATURE}")

        logger.info("ENTRYPOINT: Creating agent session with VPA pipeline using CustomLLMBridge...")
        llm_bridge = CustomLLMBridge(rox_agent_ref=rox_agent) # Pass our RoxAgent instance

        session = agents.AgentSession(
            stt=deepgram.STT(model="nova-3", language="multi"),
            llm=llm_bridge,
            tts=deepgram.TTS(model=GLOBAL_MODEL),
            vad=silero.VAD.load(),
            turn_detection=MultilingualModel(),
        )
        logger.info("ENTRYPOINT: AgentSession components created successfully")

        if rox_agent._avatar_session: # Check the instance's avatar_session
            logger.info("ENTRYPOINT: Starting Tavus avatar session...")
            # Pass the VPA session and the connected room context
            await rox_agent._avatar_session.start(session, ctx.room) 
            logger.info("ENTRYPOINT: Tavus avatar session started.")

        audio_enabled_value = True
        logger.info(f"ENTRYPOINT: Setting agent audio_enabled to: {audio_enabled_value}")

        await session.start(
            room=ctx.room,
            agent=rox_agent, # Use our manually created and configured RoxAgent instance
            room_input_options=agents.RoomInputOptions(
                audio_enabled=True,
                video_enabled=False
            ),
            room_output_options=agents.RoomOutputOptions(audio_enabled=audio_enabled_value),
        )
        logger.info(f"ENTRYPOINT: AgentSession started successfully with agent: {type(rox_agent)}")
        logger.info(f"ENTRYPOINT: Rox agent (type: {type(rox_agent)}) is running in room {ctx.room.name}")

        # Keep the agent's job running until interrupted
        try:
            disconnect_future = asyncio.Future()
            await disconnect_future
        except asyncio.CancelledError:
            logger.info("ENTRYPOINT: Agent job's disconnect_future was canceled.")

    except asyncio.CancelledError:
        logger.info("ENTRYPOINT: Agent job was explicitly canceled.")
    except Exception as e:
        logger.error(f"ENTRYPOINT: Error occurred: {e}", exc_info=True)
    finally:
        logger.info("ENTRYPOINT: Execution finished.")


if __name__ == "__main__":
    # Parse command line arguments
    parser = argparse.ArgumentParser(add_help=False)
    parser.add_argument('--page-path', type=str, help='Path to web page')
    parser.add_argument('--tts-model', type=str, help='Deepgram TTS model to use')
    parser.add_argument('--temperature', type=float, help='LLM temperature')
    parser.add_argument('--avatar-enabled', type=lambda x: (str(x).lower() == 'true'), help='Enable or disable Tavus avatar (true/false)')

    # Extract our custom arguments without affecting LiveKit's argument parsing
    args, _ = parser.parse_known_args()
    
    # Set up agent configuration from command line arguments
    if args.page_path:
        GLOBAL_PAGE_PATH = args.page_path
        logger.info(f"Using page path: {GLOBAL_PAGE_PATH}")
    
    if args.tts_model:
        GLOBAL_MODEL = args.tts_model
        logger.info(f"Using TTS model: {GLOBAL_MODEL}")
    
    if args.temperature is not None:
        GLOBAL_TEMPERATURE = args.temperature
        logger.info(f"Using temperature: {GLOBAL_TEMPERATURE}")

    if args.avatar_enabled is not None:
        GLOBAL_AVATAR_ENABLED = args.avatar_enabled
        logger.info(f"Tavus avatar {'enabled' if GLOBAL_AVATAR_ENABLED else 'disabled'} by command line argument.")
        if GLOBAL_AVATAR_ENABLED and not TAVUS_ENABLED:
            logger.warning("Avatar enabled by command line, but Tavus credentials (API Key or Replica ID) are missing or incomplete in .env. Avatar may not function.")
    
    # Remove our custom arguments from sys.argv
    filtered_argv = [sys.argv[0]]
    i = 1
    while i < len(sys.argv):
        arg = sys.argv[i]
        if arg in ['--page-path', '--tts-model', '--temperature', '--avatar-enabled'] and i + 1 < len(sys.argv):
            i += 2  # Skip both the flag and its value
        else:
            filtered_argv.append(arg)
            i += 1
    
    # Replace sys.argv with filtered version
    sys.argv = filtered_argv
    
    # Run the agent with the standard CLI interface
    agents.cli.run_app(
        agents.WorkerOptions(
            entrypoint_fnc=entrypoint
        )
    )
