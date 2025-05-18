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
    logger.error("Please install the missing packages: pip install 'livekit-agents[deepgram,silero,turn-detector]~=1.0' 'livekit-plugins-noise-cancellation~=0.2' python-dotenv aiohttp")
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

required_vars = ["LIVEKIT_URL", "LIVEKIT_API_KEY", "LIVEKIT_API_SECRET", "DEEPGRAM_API_KEY", "MY_CUSTOM_AGENT_URL"]
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

async def entrypoint(ctx: agents.JobContext):
    """Main entrypoint for the agent, configured by job metadata."""
    logger.info(f"Agent job {ctx.job.id} received for room: {ctx.room.name}")
    logger.debug(f"Raw Job metadata from ctx.job.metadata: {ctx.job.metadata}")

    parsed_metadata = {}
    if ctx.job.metadata:
        if isinstance(ctx.job.metadata, str) and ctx.job.metadata.strip(): # If it's a non-empty string
            try:
                parsed_metadata = json.loads(ctx.job.metadata)
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
        detect_language=True,
        interim_results=stt_interim_results,
        smart_format=True,
        model=deepgram_model,
    )
    logger.info(f"STT (Deepgram) initialized with model: {deepgram_model}, language: {deepgram_language}")

    tts = silero.TTS(model_name=tts_model_name)
    logger.info(f"TTS (Silero) initialized with model: {tts_model_name}")

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
        logger.info("Creating agent session...")
        session = AgentSession(
            room=ctx.room,
            agent=assistant_instance,
            stt=stt,
            tts=tts,
            llm=llm_bridge,
            vad=agents.vad.SileroVad(),
            turn_detection=MultilingualModel()
            # avatar argument removed from AgentSession constructor as per memory
        )
        logger.info("Agent session created successfully")

        if avatar_plugin_instance: # If TavusAvatarPlugin was initialized
            logger.info("Starting Tavus Avatar plugin session...")
            # Call start() on the TavusAvatarPlugin instance as per MEMORY[6dd07351-1d2c-4151-b8d4-b16c50c75592]
            await avatar_plugin_instance.start(agent_session=session, room=ctx.room)
            logger.info("Tavus Avatar plugin session started.")

        logger.info("Starting agent session...")
        await session.start(
            room_input_options=RoomInputOptions(
                noise_cancellation=noise_cancellation.BVC(),
            ),
        )
        logger.info("Agent session started successfully")

        if initial_instructions and initial_instructions.strip() != "":
            logger.info(f"Attempting to send initial instructions as first utterance: '{initial_instructions[:100]}...'")
            try:
                await assistant_instance.say(initial_instructions, allow_interruptions=False)
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