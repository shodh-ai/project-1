#!/usr/bin/env python3
"""
LiveKit Voice Processing Agent (VPA) Implementation with Custom Backend Bridge

This script implements a LiveKit voice agent using the VPA pipeline,
replacing the standard LLM with a bridge to a custom backend script.
It operates as a LiveKit Agent Worker, configured per job via metadata.
"""

import os
import sys
import logging
import asyncio
from pathlib import Path
from dotenv import load_dotenv
import json
import aiohttp
import urllib.parse

logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

from livekit import agents
from livekit.agents import AgentSession, Agent, RoomInputOptions

try:
    from livekit.plugins import noise_cancellation
    from livekit.plugins import deepgram, silero
    from livekit.plugins.turn_detector.multilingual import MultilingualModel
    from livekit.plugins.tavus import AvatarSession as TavusAvatarPlugin # Changed to Tavus
except ImportError as e:
    logger.error(f"Failed to import required packages: {e}")
    error_message = "Please ensure all dependencies are installed. Standard packages: pip install 'livekit-agents[deepgram,silero,turn-detector]~=1.0' 'livekit-plugins-noise-cancellation~=0.2' python-dotenv aiohttp."
    if "tavus" in str(e).lower():
        error_message += "\nFor the Tavus plugin, ensure you have run: python3 install_tavus.py (from the 'livekit-agent-server' directory)."
    logger.error(error_message)
    sys.exit(1)

try:
    from custom_llm import CustomLLMBridge
except ImportError:
    logger.error("Failed to import CustomLLMBridge. Make sure custom_llm.py exists and aiohttp is installed.")
    sys.exit(1)

script_dir = Path(__file__).resolve().parent
env_path = script_dir / '.env'
if env_path.exists():
    logger.info(f"Loading environment from: {env_path}")
    load_dotenv(dotenv_path=env_path)
else:
    logger.warning(f"No .env file found at {env_path}, using environment variables from system")
    load_dotenv()

# URL for the external token service (e.g., http://localhost:3000)
TOKEN_SERVICE_URL_ENV = "TOKEN_SERVICE_URL"

required_vars = ["LIVEKIT_URL", "DEEPGRAM_API_KEY", "MY_CUSTOM_AGENT_URL", TOKEN_SERVICE_URL_ENV]
# LIVEKIT_API_KEY and LIVEKIT_API_SECRET are no longer directly used by this script for connection
# but are essential for the token service itself.
AVATAR_SERVICE_URL = os.getenv("AVATAR_SERVICE_URL", "https://avatar.livekit.io")
AVATAR_API_KEY = os.getenv("AVATAR_API_KEY", "")

for var_name in required_vars:
    value = os.getenv(var_name)
    if not value:
        logger.error(f"Missing required environment variable: {var_name}")
        sys.exit(1)
    if var_name == "DEEPGRAM_API_KEY":
        logger.debug(f"DEEPGRAM_API_KEY: {value[:8]}...{value[-4:]} (length: {len(value)})")
    if var_name == "MY_CUSTOM_AGENT_URL":
        logger.info(f"Global custom agent URL: {value}")

class Assistant(Agent):
    """Simple voice AI assistant, configured per job."""
    def __init__(self, llm_bridge: CustomLLMBridge, instructions: str) -> None:
        super().__init__(llm=llm_bridge, instructions=instructions)
        self._llm_bridge = llm_bridge
        logger.info(f"Assistant initialized with instructions: '{instructions[:50]}...' Llm bridge: {llm_bridge}")

    async def on_transcript(self, transcript: str, language: str) -> None:
        """Called when a user transcript is received"""
        logger.info(f"USER SAID (room: {self.ctx.room.name}, job: {self.ctx.job.id}): '{transcript}' (lang: {language})")

    async def on_reply(self, message: str, audio_url: str = None) -> None:
        """Override to log when assistant replies"""
        logger.info(f"ASSISTANT REPLIED (room: {self.ctx.room.name}, job: {self.ctx.job.id}): '{message[:100]}...' (audio_url: {audio_url})")

async def fetch_livekit_token(room_name: str, agent_identity: str, token_service_base_url: str) -> tuple[str, str | None]:
    """Fetches a LiveKit token from the custom token service."""
    if not token_service_base_url:
        logger.error("Token service URL is not configured (missing TOKEN_SERVICE_URL env var).")
        raise ValueError("Token service URL is not configured.")

    params = {"room": room_name, "username": agent_identity}
    encoded_params = urllib.parse.urlencode(params)
    # Ensure the base URL doesn't have a trailing slash if /api/token always starts with one
    request_url = f"{token_service_base_url.rstrip('/')}/api/token?{encoded_params}"

    logger.info(f"Fetching LiveKit token for room '{room_name}', identity '{agent_identity}' from {request_url}")
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(request_url) as response:
                if response.status == 404:
                    logger.error(f"Token service endpoint not found (404) at {request_url}. Ensure the service is running and URL is correct.")
                response.raise_for_status()  # Raises an exception for 4XX/5XX responses
                data = await response.json()
                if "token" not in data:
                    logger.error(f"'token' field not found in response from token service at {request_url}. Response: {data}")
                    raise ValueError("Token not found in response from token service")
                ws_url = data.get("wsUrl")
                logger.info(f"Successfully fetched token. wsUrl from service response: {ws_url}")
                return data["token"], ws_url
    except aiohttp.ClientConnectorError as e:
        logger.error(f"Connection error fetching token from {request_url}: {e}. Ensure token service is running and accessible.")
        raise
    except aiohttp.ClientResponseError as e:
        logger.error(f"HTTP error {e.status} fetching token from {request_url}: {e.message}")
        try:
            error_details = await e.text()
            logger.error(f"Token service error details: {error_details}")
        except Exception:
            pass # Ignore if can't get error details
        raise
    except Exception as e:
        logger.error(f"Generic error fetching or parsing token from {request_url}: {e}")
        raise

async def entrypoint(ctx: agents.JobContext):
    """Main entrypoint for the agent, configured by job metadata."""
    logger.info(f"Agent job {ctx.job.id} received for room: {ctx.room.name}")
    logger.debug(f"Raw Job metadata from ctx.job.metadata: {ctx.job.metadata}")

    # ---- START MODIFICATION FOR LOCAL TESTING ----
    job_metadata_str = ctx.job.metadata
    # If no metadata from context and LOCAL_TEST_METADATA_FILE env var is set, try to load it
    if not job_metadata_str and os.getenv("LOCAL_TEST_METADATA_FILE"):
        local_metadata_file_path = os.getenv("LOCAL_TEST_METADATA_FILE")
        logger.info(f"Attempting to load local test metadata from: {local_metadata_file_path}")
        try:
            with open(local_metadata_file_path, "r") as f:
                job_metadata_str = f.read()
            logger.info(f"Successfully loaded local test metadata.")
        except FileNotFoundError:
            logger.error(f"Local test metadata file not found: {local_metadata_file_path}")
        except Exception as e:
            logger.error(f"Error loading local test metadata from {local_metadata_file_path}: {e}")
    # ---- END MODIFICATION FOR LOCAL TESTING ----

    parsed_metadata = {}
    if job_metadata_str: # Now use job_metadata_str which might have come from file or ctx
        if isinstance(job_metadata_str, str) and job_metadata_str.strip(): # If it's a non-empty string
            try:
                parsed_metadata = json.loads(job_metadata_str)
                if not isinstance(parsed_metadata, dict):
                    logger.warning(f"Metadata parsed from string but is not a dictionary (type: {type(parsed_metadata)}). Value: '{ctx.job.metadata}'. Defaulting to empty dict.")
                    parsed_metadata = {}
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse job metadata JSON string '{ctx.job.metadata}': {e}. Defaulting to empty dict.")
                parsed_metadata = {}
        elif isinstance(ctx.job.metadata, dict): # If it's already a dictionary
            parsed_metadata = ctx.job.metadata
        else:
            logger.info(f"Job metadata is not a non-empty string or a dict (type: {type(ctx.job.metadata)}). Value: '{ctx.job.metadata}'. Defaulting to empty dict.")
            # parsed_metadata remains {}
    else:
        logger.info("Job metadata is None or empty. Defaulting to empty dict.")
        # parsed_metadata remains {}

    metadata = parsed_metadata
    logger.debug(f"Processed metadata: {metadata}")

    page_identifier = metadata.get("page_identifier", "default_page")
    tts_model_name = metadata.get("tts_model", "aura-asteria-en")
    initial_instructions = metadata.get("initial_instructions", "You are a helpful AI. Be concise.")
    deepgram_model = metadata.get("deepgram_model", "nova-2-general")
    deepgram_language = metadata.get("deepgram_language", "en-US")
    stt_interim_results = metadata.get("stt_interim_results", False)

    job_avatar_enabled = metadata.get("avatar_enabled", True)
    job_avatar_model = metadata.get("avatar_model", "default")
    job_avatar_style = metadata.get("avatar_style", "casual")

    custom_agent_url = os.getenv("MY_CUSTOM_AGENT_URL")
    if not custom_agent_url:
        logger.error("MY_CUSTOM_AGENT_URL environment variable not set. Cannot proceed.")
        return

    logger.info(f"Job Config - page_identifier: {page_identifier}, tts_model: {tts_model_name}, deepgram_model: {deepgram_model}")
    logger.info(f"Avatar enabled in job metadata: {job_avatar_enabled} (Model: {job_avatar_model}, Style: {job_avatar_style})")
    # --- TEMPORARY OVERRIDE: Disable avatar for core functionality testing ---
    job_avatar_enabled = False
    logger.warning("TEMP OVERRIDE: Tavus Avatar functionality has been temporarily disabled in main_copy.py.")
    # --- END TEMPORARY OVERRIDE ---

    stt = deepgram.STT(
        language=deepgram_language,
        detect_language=False, # Explicitly disable language detection for streaming
        interim_results=stt_interim_results,
        smart_format=True,
        model=deepgram_model,
    )
    logger.info(f"STT (Deepgram) initialized with model: {deepgram_model}, language: {deepgram_language}")

    # tts_model_name from metadata was for Silero. We'll use a default Deepgram model for now.
    # You can make this configurable via metadata again if needed.
    deepgram_tts_model = parsed_metadata.get("deepgram_tts_model", "aura-asteria-en") 
    tts = deepgram.TTS(model=deepgram_tts_model) 
    logger.info(f"TTS (Deepgram) initialized with model: {deepgram_tts_model}")

    llm_bridge = CustomLLMBridge(
        agent_url=custom_agent_url,
        page_identifier=page_identifier
    )
    logger.info(f"CustomLLMBridge initialized for page_identifier: {page_identifier}")

    avatar_plugin_instance = None # Variable name kept, will hold TavusAvatarPlugin instance
    if job_avatar_enabled:
        # Instantiate TavusAvatarPlugin (which is AvatarSession from livekit.plugins.tavus)
        # Assuming it might use service_url and api_key. Model/style from metadata might be handled differently by Tavus.
        avatar_plugin_instance = TavusAvatarPlugin(
            service_url=AVATAR_SERVICE_URL, # Attempting to pass this
            api_key=AVATAR_API_KEY          # Attempting to pass this
        )
        logger.info(f"Tavus Avatar plugin initialized (model: {job_avatar_model}, style: {job_avatar_style} from metadata will be used by Tavus if applicable).")
    else:
        logger.info("Tavus Avatar plugin disabled for this job.")

    assistant_instance = Assistant(llm_bridge=llm_bridge, instructions=initial_instructions)

    try:
        room_input_options = RoomInputOptions()

        token_service_base_url = os.getenv(TOKEN_SERVICE_URL_ENV)
        if not token_service_base_url:
            logger.critical(f"Required environment variable {TOKEN_SERVICE_URL_ENV} is not set. Cannot fetch token.")
            # Worker will exit due to missing required var earlier, but defensive check here.
            raise ValueError(f"{TOKEN_SERVICE_URL_ENV} not set.")

        agent_identity = f"agent-py-{ctx.job.id[:12]}" # Create a unique agent identity
        logger.info(f"Agent identity for token: {agent_identity}")

        livekit_token, livekit_ws_url = await fetch_livekit_token(ctx.room.name, agent_identity, token_service_base_url)

        logger.info("Successfully fetched token. wsUrl from service response: %s", livekit_ws_url)

        # Set environment variables for LiveKit SDK to use for this connection attempt
        os.environ["LIVEKIT_TOKEN"] = livekit_token
        
        final_connect_url_for_this_session = livekit_ws_url # URL from token service
        if not final_connect_url_for_this_session:
            final_connect_url_for_this_session = os.getenv("LIVEKIT_URL") # Fallback to .env provided at agent startup
            logger.info(f"wsUrl from token service is empty. Using LIVEKIT_URL from environment for this session: {final_connect_url_for_this_session}")
        else:
            logger.info(f"Using wsUrl from token service for this session: {final_connect_url_for_this_session}. This will override LIVEKIT_URL from .env for this connection attempt.")
        
        if not final_connect_url_for_this_session:
            logger.error("LIVEKIT_URL for connection is not determined (neither from token service nor .env). Cannot connect.")
            # Unsetting token not strictly necessary as job will likely terminate, but good practice if we were to continue.
            # del os.environ["LIVEKIT_TOKEN"]
            raise ValueError("LIVEKIT_URL for connection is not determined.")
        
        os.environ["LIVEKIT_URL"] = final_connect_url_for_this_session # Set the determined URL for ctx.connect()

        logger.info(f"Attempting to connect to room: {ctx.room.name} using fetched token and URL {final_connect_url_for_this_session} (via environment variables).")
        room = await ctx.connect() # SDK will pick up LIVEKIT_URL and LIVEKIT_TOKEN from os.environ set above
        if room is None:
            logger.error(f"Failed to connect to LiveKit room '{ctx.room.name}' using token and URL '{final_connect_url_for_this_session}' (set via env vars). ctx.connect() returned None.")
            # Further investigation might be needed if token is fetched but connection still fails (e.g., token invalid, server issues)
            raise ConnectionError(f"Failed to establish connection to LiveKit room '{ctx.room.name}' using token and URL '{final_connect_url_for_this_session}' (set via env vars).")
        logger.info(f"Successfully connected to room: {room.name} (SID: {room.sid}) using fetched token.")

        logger.info("Creating agent session with options: {room_input_options}...")
        session = AgentSession(
            stt=stt,
            tts=tts,
            llm=llm_bridge, # llm_bridge is the CustomLLMBridge instance
            vad=silero.VAD.load(),
            turn_detection=MultilingualModel()
        )
        logger.info("Agent session created successfully")

        if avatar_plugin_instance: # If TavusAvatarPlugin was initialized
            logger.info("Starting Tavus Avatar plugin session...")
            # Call start() on the TavusAvatarPlugin instance, using the connected 'room' object
            await avatar_plugin_instance.start(agent_session=session, room=room)
            logger.info("Tavus Avatar plugin session started.")

        logger.info("Starting agent session...")
        # Pass the 'agent' (assistant_instance) and the connected 'room' object to session.start()
        await session.start(
            agent=assistant_instance,
            room=room,
            room_input_options=room_input_options # Pass RoomInputOptions here
        )
        logger.info("Agent session started successfully")

        if initial_instructions and initial_instructions.strip() != "":
            logger.info(f"Attempting to send initial instructions as first utterance: '{initial_instructions[:100]}...'")
            try:
                # Use session.say() instead of assistant_instance.say(), and pass 'text' as a keyword argument
                await session.say(text=initial_instructions, allow_interruptions=False)
                logger.info("Initial instructions sent as a statement by the agent.")
            except Exception as e:
                logger.error(f"Failed to send initial instructions via agent.say: {e}")
        else:
            logger.info("No specific initial instructions to send as a greeting for this job.")

        logger.info(f"Voice agent is running for job {ctx.job.id} (page_identifier: {page_identifier}) in room {ctx.room.name}.")

        await asyncio.sleep(3600)
        logger.info(f"Job {ctx.job.id} processing finished or timed out.")

    except asyncio.CancelledError:
        logger.info(f"Job {ctx.job.id} was canceled.")
    except Exception as e:
        logger.error(f"Error in entrypoint for job {ctx.job.id}: {e}", exc_info=True)
    finally:
        logger.info(f"Cleaning up for job {ctx.job.id}.")

if __name__ == "__main__":
    logger.info("Starting LiveKit Agent Worker...")
    agents.cli.run_app(
        agents.WorkerOptions(
            entrypoint_fnc=entrypoint,
        )
    )