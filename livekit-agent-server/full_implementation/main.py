import os
import sys
import json
import logging
import asyncio
import argparse
from typing import Dict, List, Any, Optional
from dotenv import load_dotenv
from livekit import agents
from livekit.agents import AgentSession, Agent, RoomInputOptions

# Import the YAML-based configuration loader
from agent_config_loader import (
    get_persona_config_by_identity,
    get_persona_config_for_page,
    get_tools_for_identity,
    PersonaConfig
)

# Import the Gemini client module
from ai.gemini_client import (
    get_or_create_session_state,
    remove_session_state,
    initialize_gemini_model,
    register_tools_with_model,
    reinitialize_chat,
    send_message,
    send_function_response
)

# Tools are now imported directly where needed
# (The tool_dispatcher has been removed in favor of the @function_tool decorator pattern)

# Import services modules
from services.http_client import initialize, close
from services import canvas_client, content_client, user_progress_client

# Configure logging
logging.basicConfig(
    level=logging.DEBUG, 
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("agent_log.txt"),
    ]
)
logger = logging.getLogger(__name__)

# Ensure DEBUG level is explicitly set for our logger
logger.setLevel(logging.DEBUG)

# Import plugins that are actually installed
try:
    from livekit.plugins import noise_cancellation
    from livekit.plugins import google  # For Google's realtime model
    # Optional imports - will be skipped if not available
    try:
        from livekit.plugins.turn_detector.multilingual import MultilingualModel
    except ImportError:
        logger.warning("MultilingualModel not available, will not use turn detection")
        MultilingualModel = None
except ImportError as e:
    logger.error(f"Failed to import required packages: {e}")
    logger.error("Please install the missing packages")
    sys.exit(1)

# Load environment variables from .env file
load_dotenv()

# Verify environment variables
required_env_vars = ["LIVEKIT_URL", "LIVEKIT_API_KEY", "LIVEKIT_API_SECRET"]
for var in required_env_vars:
    if not os.getenv(var):
        logger.error(f"Missing required environment variable: {var}")
        logger.error(f"Current value: {os.getenv(var)}")


class Assistant(Agent):
    def __init__(self, persona_config: Optional[PersonaConfig] = None) -> None:
        # Use the instructions from the persona configuration
        instructions = persona_config.instructions if persona_config else "You are a helpful assistant."
        super().__init__(instructions=instructions)
        
        # Tools will be managed in the entrypoint function
        # Note: tools are registered in the entrypoint, not directly set here


# Global variables to store agent configuration
# These must be accessible from all processes
# Initialize with None so we can tell if it's been properly set
GLOBAL_PAGE_PATH = None  # Will be set via CLI args or defaults to None
GLOBAL_ENABLE_TOOLS = True  # Enable or disable tools
GLOBAL_PERSONA_CONFIG = None  # Will be populated from agent_config_loader

async def entrypoint(ctx: agents.JobContext):
    """Main entrypoint for the agent."""
    # Access global variables
    global GLOBAL_PAGE_PATH, GLOBAL_PERSONA_CONFIG, GLOBAL_ENABLE_TOOLS
    
    # Log agent connection information
    logger.info(f"Connected to LiveKit room '{ctx.room.name}'")
    
    # Initialize the HTTP client for service API calls
    logger.info("Initializing HTTP client for external API calls")
    await initialize()
    
    # Check if we have a page path in the environment variable (set by parent process)
    env_page_path = os.environ.get("LIVEKIT_AGENT_PAGE_PATH")
    
    # If we have a path in the environment, use that instead of the global
    if env_page_path:
        page_path = env_page_path
        # Update the global to match
        GLOBAL_PAGE_PATH = env_page_path
        logger.info(f"Using page path from environment: {page_path}")
    else:
        # Use the global page path (though this shouldn't happen now)
        page_path = GLOBAL_PAGE_PATH
        logger.info(f"Using global page path: {page_path}")
    
    # Debug page being used
    logger.info(f"Agent intended for page: http://localhost:3000/{page_path}")
    
    if page_path is None:
        # This shouldn't happen now, but let's be defensive
        logger.error("Page path is None in entrypoint, this is a bug!")
        # Set a default value to avoid crashes
        page_path = "vocabpage"  # Default to vocabpage as requested
        GLOBAL_PAGE_PATH = page_path
        logger.warning(f"Setting default page_path to: {page_path}")
    
    # Get persona configuration based on page path
    global GLOBAL_PERSONA_CONFIG
    GLOBAL_PERSONA_CONFIG = get_persona_config_for_page(page_path)
    
    # Force-reload the correct persona for the actual page path to avoid any inconsistencies
    GLOBAL_PERSONA_CONFIG = get_persona_config_for_page(page_path)
    logger.info(f"Using persona '{GLOBAL_PERSONA_CONFIG.identity}' from page_path: {page_path}")
    
    # Log the loaded persona configuration
    logger.info(f"Using persona '{GLOBAL_PERSONA_CONFIG.identity}' for page '{page_path}'")
    logger.info(f"Persona allows tools: {GLOBAL_PERSONA_CONFIG.allowed_tools}")
    
    # Note: We don't need to set the web URL directly
    # The LiveKit client handles this automatically
    
    await ctx.connect()
    
    # We'll store this to use after session is created
    received_review_text = ""
    
    # Helper function to handle context changes from frontend
    async def handle_context_change(page_type, task_id=None, persona_identity=None):
        try:
            logger.info(f"Context change requested: page={page_type}, task={task_id}, persona={persona_identity}")
            
            # Determine which persona to use based on provided identity or page type
            persona_config = None
            if persona_identity:
                # Try to get specific persona by identity
                persona_config = get_persona_config_by_identity(persona_identity)
                if persona_config:
                    logger.info(f"Using specifically requested persona: {persona_identity}")
                else:
                    logger.warning(f"Requested persona '{persona_identity}' not found, falling back to page-based selection")
            
            # If no specific persona was found, use page-type based selection
            if not persona_config:
                persona_config = get_persona_config_for_page(page_type)
                logger.info(f"Selected persona '{persona_config.identity}' for page type '{page_type}'")
            
            # Get tools for this persona
            if GLOBAL_ENABLE_TOOLS:
                tools = get_tools_for_identity(persona_config.identity)
                tool_names = [getattr(tool, 'name', str(tool)) for tool in tools]
                logger.info(f"Loaded {len(tools)} tools for persona {persona_config.identity}: {tool_names}")
            else:
                tools = []
                logger.info("Tools are disabled for this session")
            
            # Update session state with new configuration
            if session:
                # Get or create session state
                session_state = get_or_create_session_state(ctx.room.name, session)
                
                # Update session state
                session_state.update_persona_config(persona_config)
                session_state.update_page_type(page_type)
                
                # Update GLOBAL variables to maintain consistency
                global GLOBAL_PAGE_PATH, GLOBAL_PERSONA_CONFIG
                GLOBAL_PAGE_PATH = page_type
                GLOBAL_PERSONA_CONFIG = persona_config
                logger.info(f"Updated global configuration to: page={page_type}, persona={persona_config.identity}")
                
                # Register tools with the model
                if tools:
                    await register_tools_with_model(session_state, tools)
                
                # Reinitialize the chat with new settings
                await reinitialize_chat(session_state)
                
                # Notify the user about the context change
                await session.send_text(f"I'm now helping you with the {page_type} task.")
                
                return True
            else:
                logger.error("Cannot handle context change: No active session")
                return False
                
        except Exception as e:
            logger.error(f"Error handling context change: {e}")
            return False
            
    # Define a synchronous wrapper for the data handler
    def on_data_received_sync(payload, participant=None, kind=None):
        try:
            # Log the type of payload received
            logger.debug(f"Received payload kind={kind}")
            
            if kind == "data":
                logger.debug(f"Processing data payload")
                try:
                    data_bytes = payload.get("data", [])
                    text = data_bytes.decode("utf-8")
                    
                    # Try to parse as JSON
                    try:
                        data = json.loads(text)
                        
                        # Handle context change messages
                        if isinstance(data, dict) and data.get('type') == 'CHANGE_CONTEXT':
                            logger.info("Received CHANGE_CONTEXT message")
                            
                            # Extract context data
                            payload = data.get('payload', {})
                            page_type = payload.get('pageType')
                            task_id = payload.get('taskId')
                            persona_identity = payload.get('personaIdentity')
                            
                            # Create a task to handle the context change
                            if page_type:
                                asyncio.create_task(handle_context_change(page_type, task_id, persona_identity))
                            else:
                                logger.error("Missing pageType in CHANGE_CONTEXT message")
                        
                        # Other data message types can be processed here
                        # Note: Speech audio is NOT processed here - it's handled by the RealtimeModel internally
                        
                    except json.JSONDecodeError:
                        # Not JSON, just log it
                        logger.debug(f"Non-JSON data message received: {text[:100]}...")
                        
                except Exception as e:
                    logger.error(f"Error processing data payload: {e}")
            
            # We're NOT processing media chunks here anymore
            # Audio is processed internally by the RealtimeModel
            # Function calls will be detected via the generation_created event
            
        except Exception as outer_e:
            logger.error(f"Outer exception in on_data_received: {outer_e}")
            
    # Event handlers will be registered after session is created
    
    # Get Google API key from environment
    api_key = os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        logger.error("GOOGLE_API_KEY is not set in the environment")
    
    # Initialize session as None to ensure it's defined in all code paths
    session = None
    
    # Create a realtime model if enabled
    try:
        # Get Google API key from environment variable
        api_key = os.environ.get("GOOGLE_API_KEY")
        if not api_key:
            logger.error("Creating session without API key (expected to fail)")
            return
        
        # Create the model with our configuration
        from tools.timer_tools import start_timer

        try:
            # Import ToolRouter (handle different LiveKit package versions)
            try:
                from livekit.agents.tool import ToolRouter
            except ImportError:
                from livekit.agents import ToolRouter
                
            # Create the tool router with our start_timer function
            router = ToolRouter([start_timer])
            logger.info(f"Created ToolRouter with start_timer tool")
            
            # Configure the model with tools and router
            model_config = {
                "model": "models/gemini-2.0-flash-live-001",  # Using production-ready model with function calling support
                "voice": GLOBAL_PERSONA_CONFIG.voice,
                "temperature": GLOBAL_PERSONA_CONFIG.temperature,
                "instructions": GLOBAL_PERSONA_CONFIG.instructions,
                "api_key": api_key,
                "tools": [start_timer],      # Pass tool to advertise schema
                "tool_router": router        # Router to execute the tool
            }
        except ImportError as e:
            logger.warning(f"ToolRouter import failed, tools will not be available: {e}")
            # Configure model without tools
            model_config = {
                "model": "models/gemini-2.0-flash-live-001",  # Using production-ready model with function calling support
                "voice": GLOBAL_PERSONA_CONFIG.voice,
                "temperature": GLOBAL_PERSONA_CONFIG.temperature,
                "instructions": GLOBAL_PERSONA_CONFIG.instructions,
                "api_key": api_key
            }
        
        # Create the model
        model = google.beta.realtime.RealtimeModel(**model_config)
        
        session = AgentSession(llm=model)
        logger.info("Created agent session with Google's realtime model")
        
        # Initialize session state first to avoid reference errors
        session_state = get_or_create_session_state(ctx.room.name, session)
        session_state.update_persona_config(GLOBAL_PERSONA_CONFIG)
        
        # Register basic event handlers now that session exists
        session.on_data_received_sync = on_data_received_sync
        
        # Set up simple event handlers for function calling
        # These are handled automatically by the ToolRouter based on the @function_tool decorators
        
        # Log when a function call is started
        async def on_function_call_started(func_call):
            logger.info(f"▶ Tool called: {func_call.name} with args: {func_call.arguments}")
            
        # Log when a function call is completed
        async def on_function_call_finished(func_call, output):
            logger.info(f"✔ Tool completed: {func_call.name} → {output}")
            
            # Consume the message stream for final text output (if needed)
            if hasattr(event, 'message_stream'):
                logger.debug("Processing message stream for text output")
                for stream_entry in generation.get("streams", []):
                    if stream_entry.get("type") == "text":
                        logger.debug("Found text stream, processing chunks")
                        # Process text stream
                        for chunk in stream_entry.get("chunks", []):
                            text_chunk = chunk.get("text", "")
                            # Add the chunk to the complete message
                            complete_message += text_chunk
                            
                            # Send each chunk to the user as it's received for a more real-time experience
                            if session and hasattr(session, 'send_text'):
                                await session.send_text(text_chunk)
                    elif stream_entry.get("type") == "audio":
                        # Audio will be handled automatically by LiveKit
                        logger.debug("Found audio stream, audio will be handled by LiveKit")
                    else:
                        logger.debug("message_gen does not have text_stream or audio_stream attributes")
            else:
                logger.debug("Event does not have a message_stream attribute")
            
        # Make sure we're using the correct global page path
        # Check if GLOBAL_PAGE_PATH is still None - which shouldn't happen
        if GLOBAL_PAGE_PATH is None:
            logger.error("Critical error: GLOBAL_PAGE_PATH is None in session initialization")
            GLOBAL_PAGE_PATH = "vocabpage"  # Set to vocabpage as requested
            logger.warning(f"Force-setting GLOBAL_PAGE_PATH to: {GLOBAL_PAGE_PATH}")
            
        session_state.update_page_type(GLOBAL_PAGE_PATH)
        logger.info(f"Setting session page type to: {GLOBAL_PAGE_PATH}")
        
        # Register tools if enabled
        if GLOBAL_ENABLE_TOOLS:
            tools = get_tools_for_identity(GLOBAL_PERSONA_CONFIG.identity)
            if tools:
                await register_tools_with_model(session_state, tools)
                logger.info(f"Registered {len(tools)} tools with Gemini model")
                
                # Tools are registered directly with the ToolRouter and RealtimeModel
                logger.info(f"Registered {len(tools)} tools with Gemini model")
                        
                # Function calls are now handled through the @function_tool decorator
                # and the tool_router that was passed to the RealtimeModel
                logger.info("Using canonical @function_tool pattern for tool calls")
    except Exception as e:
        logger.error(f"Failed to create Google realtime model: {e}")
        # Fallback to original session with commented code
        logger.warning("Agent session creation failed")
    
    # Create the agent instance with tools
    assistant = Assistant(GLOBAL_PERSONA_CONFIG)
    
    # Log whether we're using tools or pattern matching
    if GLOBAL_ENABLE_TOOLS and GLOBAL_PERSONA_CONFIG.allowed_tools:
        logger.info(f"Using tool calling for {GLOBAL_PERSONA_CONFIG.allowed_tools}")
        
    # Only proceed with session operations if session was successfully created
    if session is not None:
        # Get tools from the session state
        session_state = get_or_create_session_state(ctx.room.name, session)
        
        # Register the canonical function call event handlers
        session.on("function_call_started", lambda fc: logger.info(f"▶ tool {fc.name} {fc.args}"))
        session.on("function_call_finished", lambda fc, out: logger.info(f"✔ tool {fc.name} → {out}"))
        logger.info("Registered canonical function call event handlers")
        
        # Function calls are automatically handled by the ToolRouter
        logger.info("Tool calling enabled with @function_tool decorator and ToolRouter")
    else:
        logger.info("Using pattern matching for commands instead of tools")
    
    # Log persona details
    logger.info(f"Using persona '{GLOBAL_PERSONA_CONFIG.identity}' for {page_path}")
    
    # Define speech event handlers
    async def handle_speech_started(event):
        """Handle the input_speech_started event.
        
        This function logs when the user starts speaking.
        
        Args:
            event: The speech started event
        """
        logger.info("TIMER-TEST: Speech started")

    async def handle_transcription_completed(event):
        """Handle the input_audio_transcription_completed event.
        
        This function processes the completed transcription and triggers a response.
        
        Args:
            event: The transcription completed event containing the transcript
        """
        try:
            # Extract the transcript
            transcript = getattr(event, "transcript", None)
            if not transcript:
                logger.warning("TIMER-TEST: No transcript found in transcription completion event")
                return
                
            logger.info(f"TIMER-TEST: Transcription completed: {transcript}")
            
            # Get the session state
            room_name = session.room.name if hasattr(session, "room") else "unknown_room"
            session_state = get_or_create_session_state(room_name, session)
            
            # Add user turn to history (optional)
            if hasattr(session_state, "add_history"):
                session_state.add_history("user", transcript)
            
            # Trigger response generation with the user's text as input
            logger.info("TIMER-TEST: Triggering session.generate_reply() with transcript...")
            # Pass the transcript as the prompt/instruction for THIS TURN
            await session.generate_reply(instructions=transcript)
            logger.info("TIMER-TEST: session.generate_reply() triggered.")
        except Exception as e:
            logger.error(f"TIMER-TEST: Error handling transcription: {e}", exc_info=True)

    # Register handlers for function call events
    logger.info("Registering handlers for function call events")
    async def on_function_call_started(event):
        logger.info(f"TIMER-TEST: Function call started: {event}")
        
    async def on_function_call_finished(event, output):
        logger.info(f"TIMER-TEST: Function call finished: {event} with output: {output}")
        
    # Define the generic event logger function that was missing
    def generic_event_logger(event):
        logger.info(f"TIMER-GENERIC: Event received: {type(event).__name__}")
        
    try:
        # Register handlers for ALL possible events to debug
        session.on("*", generic_event_logger)
        logger.info("Successfully registered generic event logger for all events")
        
        # Register specific speech event handlers
        def sync_transcription_handler(event):
            logger.info(f"TIMER-TEST: Specific transcription handler called for event: {type(event).__name__}")
            asyncio.create_task(handle_transcription_completed(event))
        
        # Register transcription handler
        session.on("input_audio_transcription_completed", sync_transcription_handler)
        logger.info("Successfully registered transcription handler")
        
        def sync_speech_start_handler(event):
            logger.info(f"TIMER-TEST: Speech start handler called for event: {type(event).__name__}")
            asyncio.create_task(handle_speech_started(event))
        
        # Register speech handlers
        session.on("speech_started", sync_speech_start_handler)
        logger.info("Registered alternative 'speech_started' handler")
        
        session.on("input_transcription_completed", sync_transcription_handler)
        logger.info("Registered alternative 'input_transcription_completed' handler")
        
        # Register function call event handlers for v1 API
        # Old v0 events we're replacing:
        # session.on("function_call_started", lambda fc: logger.info(f"▶ tool {fc.name} {fc.args}"))
        # session.on("function_call_finished", lambda fc, out: logger.info(f"✔ tool {fc.name} → {out}"))
        
        # Register listener for v1 function_tools_executed event
        async def watch_tools(evt):
            logger.info("Function tools executed event received")
            for call, result in evt.zipped():
                logger.info(f"🛠️ Tool executed: {call.name} → {result.text}")
        
        session.on("function_tools_executed", watch_tools)
        logger.info("Successfully registered function_tools_executed handler")
        
    except Exception as e:
        logger.error(f"Error registering event handlers: {e}", exc_info=True)

    # Start the agent session in the specified room with tools enabled
    await session.start(
        room=ctx.room,
        agent=assistant,
        room_input_options=RoomInputOptions(
            noise_cancellation=noise_cancellation.BVC(),
        ),
    )
    logger.info("Agent started with function calling for tools")
    
    # Import regex for later use
    import re
    
    # We now use the modern ToolRouter pattern
    # Function calls are automatically handled by the @function_tool decorator
    # and the ToolRouter passed to the RealtimeModel
    logger.info(f"Tool calling enabled with @function_tool decorator and ToolRouter")
    logger.info(f"Available tool: start_timer")
    
    # NOTE: This function is now only for handling explicit text messages (non-voice)
    # Voice input and function calls are handled automatically by the ToolRouter
    # Legacy process_user_input function has been removed
    # All function calls are now handled through the canonical @function_tool pattern
    
    # Hook into key speech/text events to use our process_user_input function
    # This is the recommended approach instead of trying to modify the RealtimeModel's internals
    logger.info("Standard function call detection system registered")
    
    # Send an initial greeting appropriate for the current persona
    await session.generate_reply(
        instructions=f"hi. Let me introduce myself as your {GLOBAL_PAGE_PATH} assistant."
    )
    
    try:
        # Keep the agent running until session ends or an exception occurs
        # Different LiveKit versions use different methods for waiting
        try:
            # Try newer method first
            await ctx.wait_for_disconnect()
        except (AttributeError, TypeError):
            # Fall back to alternative approach
            logger.info("Using alternative wait mechanism")
            # Create a future that never completes unless cancelled
            disconnect_future = asyncio.Future()
            
            # Create a handler to cancel the future when the room disconnects
            def on_room_disconnect(*args, **kwargs):
                if not disconnect_future.done():
                    disconnect_future.set_result(None)
            
            # Register the disconnect handler if possible
            try:
                ctx.room.on("disconnected", on_room_disconnect)
            except Exception as e:
                logger.warning(f"Could not register disconnect handler: {e}")
            
            # Wait until the future is cancelled or completed
            try:
                await disconnect_future
            except asyncio.CancelledError:
                logger.info("Wait future cancelled")
    except Exception as e:
        logger.error(f"Error in room connection: {e}")
    finally:
        # Cleanup resources when the session ends
        logger.info("Cleaning up resources")
        # Remove session state
        remove_session_state(ctx.room.name)
        # Close HTTP client
        await close()


if __name__ == "__main__":
    # Parse additional command line arguments
    parser = argparse.ArgumentParser(add_help=False)  # No help to avoid conflicts with livekit cli
    parser.add_argument('--page-path', type=str, help='Path to web page (e.g., "speakingpage")')
    parser.add_argument('--voice', type=str, help='Override the voice from persona config')
    parser.add_argument('--temperature', type=float, help='Override the temperature from persona config')
    parser.add_argument('--instructions', type=str, help='Override the instructions from persona config')
    parser.add_argument('--no-tools', action='store_true', help='Disable tools for the agent')
    
    # Parse known args without raising error for unknown args
    args, remaining = parser.parse_known_args()
    
    # Set up agent configuration from command line arguments
    if args.page_path:
        GLOBAL_PAGE_PATH = args.page_path
        logging.info(f"Using page path from CLI args: {GLOBAL_PAGE_PATH}")
    else:
        # If no page path is provided, default to vocabpage as requested
        GLOBAL_PAGE_PATH = "vocabpage"
        logging.info(f"No page path provided, defaulting to: {GLOBAL_PAGE_PATH}")
        
    # Write the page path to a temporary environment variable to pass it to child processes
    os.environ["LIVEKIT_AGENT_PAGE_PATH"] = GLOBAL_PAGE_PATH

    # Set web URL in Chrome (currently disabled due to 'Room' object has no attribute 'client')
    # These are not used and are likely causing errors
    # try:
    #     room.client.set_web_url(f"http://localhost:3000/{GLOBAL_PAGE_PATH}")
    # except Exception as e:
    #     logging.error(f"Error setting web URL: {e}")

    logging.info(f"Agent intended for page: http://localhost:3000/{GLOBAL_PAGE_PATH}")
    
    # Initialize the persona configuration before applying overrides
    if not GLOBAL_PAGE_PATH:
        logger.error("No page path specified! Defaulting to vocabpage")
        GLOBAL_PAGE_PATH = "vocabpage"  # Default to vocabpage as requested
    
    GLOBAL_PERSONA_CONFIG = get_persona_config_for_page(GLOBAL_PAGE_PATH)
    logger.info(f"Initial configuration with persona '{GLOBAL_PERSONA_CONFIG.identity}' for page '{GLOBAL_PAGE_PATH}'")
    
    # Create a copy of the config that we can modify
    config_dict = GLOBAL_PERSONA_CONFIG.to_dict()
    
    # Override specific persona settings if provided via CLI
    if args.instructions:
        config_dict['instructions'] = args.instructions
        logging.info(f"Overriding persona instructions with custom instructions")
        
    # Override voice setting if provided
    if args.voice:
        config_dict['voice'] = args.voice
        logging.info(f"Overriding persona voice with: {args.voice}")
        
    # Override temperature setting if provided
    if args.temperature is not None:
        config_dict['parameters'] = config_dict.get('parameters', {})
        config_dict['parameters']['temperature'] = args.temperature
        logging.info(f"Overriding persona temperature with: {args.temperature}")
        
    # Create a new PersonaConfig with the overridden values
    GLOBAL_PERSONA_CONFIG = PersonaConfig(config_dict)
        
    # Disable tools if requested
    if args.no_tools:
        GLOBAL_ENABLE_TOOLS = False
        logging.info("Tools are disabled for this session")
        
    # Update sys.argv to remove our custom args before passing to LiveKit CLI
    sys.argv = [sys.argv[0]] + remaining
    
    # Get LiveKit credentials from environment variables
    livekit_url = os.getenv("LIVEKIT_URL")
    livekit_api_key = os.getenv("LIVEKIT_API_KEY")
    livekit_api_secret = os.getenv("LIVEKIT_API_SECRET")
    
    # Verify that the credentials are available
    if not livekit_url or not livekit_api_key or not livekit_api_secret:
        logger.error("LiveKit credentials are missing from environment variables")
        logger.error("Please set LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET in your .env file")
        sys.exit(1)
        
    logger.info(f"Using LiveKit URL: {livekit_url}")
    
    # Set the environment variables explicitly
    os.environ["LIVEKIT_URL"] = livekit_url
    os.environ["LIVEKIT_API_KEY"] = livekit_api_key
    os.environ["LIVEKIT_API_SECRET"] = livekit_api_secret
    
    # Run the agent with the standard CLI interface
    # We've already handled our custom args, so just pass the entrypoint
    agents.cli.run_app(
        agents.WorkerOptions(
            entrypoint_fnc=entrypoint
        )
    )
