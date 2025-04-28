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

# Import the tool dispatcher
from tools.tool_dispatcher import process_tool_call

# Import services modules
from services.http_client import initialize, close
from services import canvas_client, content_client, user_progress_client

# Configure logging
logging.basicConfig(level=logging.INFO, 
                   format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

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
            logger.info(f"TIMER-DEBUG: Received payload kind={kind}")
            
            if kind == "data":
                # Only process actual data messages (not media chunks)
                logger.info(f"TIMER-DEBUG: Processing data payload")
                
                try:
                    # Try to decode as plain text
                    text = payload.decode('utf-8')
                    logger.info(f"TIMER-DEBUG: Decoded text of length {len(text)} bytes")
                    
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
    
    # Create the session with the Google realtime model
    try:
        logger.info("Using LiveKit URL: %s", os.environ.get("LIVEKIT_URL"))
        
        if not api_key:
            logger.error("Creating session without API key (expected to fail)")
            return
        
        # Create the model with our configuration
        model = google.beta.realtime.RealtimeModel(
            model="gemini-2.0-flash-live-001",  # Using production-ready model with function calling support
            voice=GLOBAL_PERSONA_CONFIG.voice,
            temperature=GLOBAL_PERSONA_CONFIG.temperature,
            instructions=GLOBAL_PERSONA_CONFIG.instructions,
            api_key=api_key,
        )
        
        session = AgentSession(llm=model)
        logger.info("Created agent session with Google's realtime model")
        
        # Initialize session state first to avoid reference errors
        session_state = get_or_create_session_state(ctx.room.name, session)
        session_state.update_persona_config(GLOBAL_PERSONA_CONFIG)
        
        # Register basic event handlers now that session exists
        session.on_data_received_sync = on_data_received_sync
        # on_participant_change is not defined, so we don't register it
        
        # Event handlers will be defined at the entrypoint level to properly access session


        # First define the event handler, then register it
        # Handler for the generation_created event
        async def handle_generation_event(event):
            """Handle the generation_created event from the LiveKit Google plugin.
            
            This function processes function calls from the Gemini model via the function_stream.
            
            Args:
                event: The generation_created event from the LiveKit Google plugin
            """
            logger.info(f"TIMER-TEST: handle_generation_event called with event type: {type(event).__name__}")
            logger.info(f"TIMER-DEBUG: Received Generation event of type {event.__class__.__name__}")
                    
            # Get the session and room name from the event context
            ctx = event.ctx
            session = ctx.session
            
            # Track if any function calls were processed
            function_calls_processed = False
            
            # Log the current page context for debugging
            session_state = get_or_create_session_state(session.room.name, session)
            current_page = getattr(session_state, "page_type", "unknown_page")
            logger.info(f"TOOL-DEBUG: Current page context is: {current_page}")
            
            # Consume the function stream to intercept function calls from Gemini
            if hasattr(event, 'function_stream'):
                logger.info("TIMER-TEST: Processing function_stream for potential tool calls")
                async for func_call in event.function_stream:
                    function_calls_processed = True
                    tool_name = func_call.name
                    logger.info(f"TIMER-TEST: >>> Received function call from stream: {tool_name}")
                    logger.info(f"TIMER-TEST: Function call arguments: {func_call.arguments}")
                    logger.info(f"TIMER-TEST: Function call ID: {func_call.call_id}")
                    logger.info(f"TIMER-TEST: Function call type: {type(func_call).__name__}")
                    
                    # Add specific debugging for drawConcept
                    if tool_name == "drawConcept":
                        logger.info(f"VOCAB-DEBUG: drawConcept tool called on {current_page} page")
                        try:
                            args = json.loads(func_call.arguments)
                            logger.info(f"VOCAB-DEBUG: drawConcept concept: {args.get('concept')}")
                            logger.info(f"VOCAB-DEBUG: drawConcept instructions: {args.get('instructions', 'None')}")
                        except Exception as e:
                            logger.error(f"VOCAB-DEBUG: Error parsing drawConcept args: {e}")
                    
                    try:
                        # Extract the tool information
                        tool_name = func_call.name
                        # The arguments are a JSON string, need to parse them
                        tool_args = json.loads(func_call.arguments)
                        
                        logger.info(f"TIMER-TEST: Calling dispatcher for: {tool_name}")
                        tool_call_data = {"name": tool_name, "arguments": tool_args}
                        
                        # Get the session state for this room
                        session_state = get_or_create_session_state(ctx.room.name, session)
                        
                        # Process the tool call using our existing dispatcher
                        result = await process_tool_call(session_state, session, tool_call_data)
                        logger.info(f"TIMER-TEST: Dispatcher returned result: {result}")
                        
                        # Convert result to JSON string if it's not already
                        result_json = json.dumps(result) if not isinstance(result, str) else result
                        
                        # Standard LiveKit pattern - Create FunctionCallOutput and append to chat context
                        from livekit.agents import llm
                        logger.info(f"TIMER-TEST: Creating FunctionCallOutput for {tool_name}")
                        
                        # Add the function result to the chat context
                        session.chat_ctx.items.append(llm.FunctionCallOutput(
                            call_id=func_call.call_id,
                            name=tool_name,
                            output=result_json,
                            is_error=False
                        ))
                        
                        # Update the chat context to send the result back to the model
                        logger.info(f"TIMER-TEST: Updating chat context with function result")
                        await session.update_chat_ctx(session.chat_ctx)
                        logger.info(f"TIMER-TEST: Successfully sent result for {tool_name} back to model")
                        
                    except Exception as e:
                        logger.error(f"TIMER-ERROR: Error processing function call {func_call.name}: {str(e)}")
                        logger.exception(e)
                        
                        # Try to send an error response so the model doesn't hang
                        try:
                            from livekit.agents import llm
                            error_msg = f"Error executing {func_call.name}: {str(e)}"
                            
                            # Add error result to chat context
                            session.chat_ctx.items.append(llm.FunctionCallOutput(
                                call_id=func_call.call_id,
                                name=func_call.name,
                                output=json.dumps({"error": error_msg}),
                                is_error=True
                            ))
                            
                            # Update chat context with error
                            await session.update_chat_ctx(session.chat_ctx)
                            logger.info(f"TIMER-TEST: Sent error response for failed {func_call.name} call")
                        except Exception as inner_e:
                            logger.error(f"TIMER-ERROR: Failed to send error response: {str(inner_e)}")
            else:
                logger.warning("TIMER-WARNING: Event does not have a function_stream attribute")
            
            if function_calls_processed:
                logger.info("TIMER-TEST: All function calls processed, now waiting for model to continue")
            
            # Consume the message stream for final text output (if needed)
            if hasattr(event, 'message_stream'):
                logger.info("TIMER-DEBUG: Processing message stream for text output")
                async for message_gen in event.message_stream:
                    if hasattr(message_gen, 'text_stream'):
                        logger.info("TIMER-DEBUG: Found text stream, processing chunks")
                        # Collect all text chunks to form complete messages
                        complete_message = ""
                        async for text_chunk in message_gen.text_stream:
                            logger.info(f"TIMER-DEBUG: Received text chunk: {text_chunk}")
                            complete_message += text_chunk
                            
                            # Send each chunk to the frontend immediately for streaming experience
                            try:
                                await session.send_text(text_chunk)
                                logger.info("TIMER-DEBUG: Sent text chunk to user")
                            except Exception as e:
                                logger.error(f"TIMER-ERROR: Error sending text to user: {str(e)}")
                        
                        # Log the complete message for debugging
                        if complete_message:
                            logger.info(f"TIMER-DEBUG: Complete message after function call: {complete_message}")
                    elif hasattr(message_gen, 'audio_stream'):
                        # Handle audio response if present
                        logger.info("TIMER-DEBUG: Found audio stream, audio will be handled by LiveKit")
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
                
                # Add deep inspection of tools
                logger.info("TIMER-DEBUG: Deep inspection of registered tools")
                for i, tool in enumerate(tools):
                    logger.info(f"TIMER-DEBUG: Tool {i+1}: {tool}")
                    logger.info(f"TIMER-DEBUG: Tool {i+1} type: {type(tool)}")
                    logger.info(f"TIMER-DEBUG: Tool {i+1} dir: {dir(tool)}")
                    
                    # If it's a custom FunctionDeclaration, log its to_dict output
                    if hasattr(tool, 'to_dict'):
                        try:
                            tool_dict = tool.to_dict()
                            logger.info(f"TIMER-DEBUG: Tool {i+1} as dict: {tool_dict}")
                        except Exception as e:
                            logger.error(f"TIMER-DEBUG: Error getting tool dict: {e}")
                
                # Log RealtimeModel's internals after tool registration
                if hasattr(model, '_tools'):
                    logger.info(f"TIMER-DEBUG: Model._tools after registration: {model._tools}")
                
                # Check for event emitter methods to see how events are registered
                if hasattr(model, '_events') or hasattr(model, '_handlers') or hasattr(model, '_listeners'):
                    events_attr = getattr(model, '_events', None) or getattr(model, '_handlers', None) or getattr(model, '_listeners', None)
                    if events_attr:
                        logger.info(f"TIMER-DEBUG: Model events: {events_attr}")
                        
                # Try to directly set a callback for function calls if the model has relevant methods
                if hasattr(model, 'set_function_call_handler') or hasattr(model, 'set_tool_call_handler'):
                    handler_method = getattr(model, 'set_function_call_handler', None) or getattr(model, 'set_tool_call_handler', None)
                    if handler_method:
                        logger.info("TIMER-DEBUG: Found direct function call handler method, registering")
                        
                        async def direct_function_call_handler(func_call):
                            logger.info(f"TIMER-TEST: Direct function call handler triggered: {func_call}")
                            try:
                                # Extract the tool name and arguments
                                tool_name = getattr(func_call, 'name', None)
                                arguments = getattr(func_call, 'arguments', None) or getattr(func_call, 'args', None)
                                
                                if tool_name and arguments:
                                    logger.info(f"TIMER-TEST: Direct handler processing tool: {tool_name} with args: {arguments}")
                                    
                                    # Convert arguments to dict if necessary
                                    if not isinstance(arguments, dict):
                                        try:
                                            arguments = json.loads(arguments)
                                        except:
                                            logger.error(f"TIMER-TEST: Could not parse arguments: {arguments}")
                                            return
                                    
                                    # Process the tool call
                                    tool_call_data = {"name": tool_name, "arguments": arguments}
                                    result = await process_tool_call(session, tool_call_data)
                                    logger.info(f"TIMER-TEST: Direct handler tool result: {result}")
                                    
                                    # Return the result
                                    return result
                            except Exception as e:
                                logger.error(f"TIMER-TEST: Error in direct function call handler: {e}")
                        
                        # Create a synchronous wrapper for the async handler
                        def sync_function_call_handler(func_call):
                            # Return the result from the async function
                            result_future = asyncio.ensure_future(direct_function_call_handler(func_call))
                            
                            # If the API expects a result, we need to somehow get it from the future
                            # This is a bit tricky since we're in a synchronous context
                            # For simple handlers that don't need to return anything, this is enough
                            return None  # Or implement a way to get the result if needed
                        
                        # Register the direct handler
                        try:
                            handler_method(sync_function_call_handler)
                            logger.info("TIMER-DEBUG: Successfully registered direct function call handler")
                        except Exception as e:
                            logger.error(f"TIMER-DEBUG: Error registering direct function call handler: {e}")
    except Exception as e:
        logger.error(f"Failed to create Google realtime model: {e}")
        # Fallback to original session with commented code
        logger.warning("Agent session creation failed")
    
    # Create the agent instance with tools
    assistant = Assistant(GLOBAL_PERSONA_CONFIG)
    
    # Log whether we're using tools or pattern matching
    if GLOBAL_ENABLE_TOOLS and GLOBAL_PERSONA_CONFIG.allowed_tools:
        logger.info(f"Using tool calling for {GLOBAL_PERSONA_CONFIG.allowed_tools}")
        
        # Get tools from the session state
        session_state = get_or_create_session_state(ctx.room.name, session)
        
        # Register tools with the underlying LiveKit RealtimeModel
        if session_state and hasattr(session, 'update_tools'):
            from livekit.agents import llm
            
            # Define timer tool using LiveKit's standard FunctionTool format
            timer_tool = llm.FunctionTool(
                name="startTimer",
                description="Start a timer for the specified duration",
                parameters={
                    "type": "object",
                    "properties": {
                        "duration": {
                            "type": "integer",
                            "description": "Duration in seconds"
                        },
                        "purpose": {
                            "type": "string",
                            "enum": ["preparation", "speaking"],
                            "description": "Purpose of the timer"
                        }
                    },
                    "required": ["duration"]
                }
            )
            
            # Register tools directly with the LiveKit session
            try:
                logger.info("TIMER-DEBUG: Registering tools using session.update_tools")
                await session.update_tools([
                    timer_tool,
                    # Add other tools from GLOBAL_PERSONA_CONFIG.allowed_tools as needed
                ])
                logger.info("TIMER-DEBUG: Successfully registered tools with LiveKit session")
            except Exception as e:
                logger.error(f"TIMER-ERROR: Failed to register tools with session.update_tools: {e}")
                
            logger.info("TIMER-DEBUG: Tool calling enabled for timer functionality")
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

    # Register speech event handlers
    logger.info("Registering handlers for speech events")
    try:
        # Register a general event handler to debug all events
        def generic_event_logger(event):
            event_type = type(event).__name__
            logger.info(f"TIMER-TEST: Received event of type: {event_type}")
            if hasattr(event, "transcript"):
                logger.info(f"TIMER-TEST: Event has transcript: {event.transcript}")
            elif hasattr(event, "is_final") and event.is_final:
                logger.info(f"TIMER-TEST: Received final transcription event")
                
        # Register handlers for ALL possible events to debug
        session.on("*", generic_event_logger)
        logger.info("Successfully registered generic event logger for all events")
            
        # Register specific speech event handlers
        def sync_transcription_handler(event):
            logger.info(f"TIMER-TEST: Specific transcription handler called for event: {type(event).__name__}")
            asyncio.create_task(handle_transcription_completed(event))
            
        session.on("input_audio_transcription_completed", sync_transcription_handler)
        logger.info("Successfully registered transcription handler")
        
        def sync_speech_start_handler(event):
            logger.info(f"TIMER-TEST: Specific speech start handler called for event: {type(event).__name__}")
            asyncio.create_task(handle_speech_started(event))
            
        session.on("input_speech_started", sync_speech_start_handler)
        logger.info("Successfully registered speech start handler")
        
        # Try alternative event names (LiveKit might be using different event names)
        session.on("transcription_completed", sync_transcription_handler)
        logger.info("Registered alternative 'transcription_completed' handler")
        
        session.on("speech_started", sync_speech_start_handler)
        logger.info("Registered alternative 'speech_started' handler")
        
        session.on("input_transcription_completed", sync_transcription_handler)
        logger.info("Registered alternative 'input_transcription_completed' handler")
    except Exception as e:
        logger.error(f"Error registering speech event handlers: {e}", exc_info=True)

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
    
    # We're NOT registering any callback handlers like on_function_call or on_message
    # Instead, we'll use the process_user_input function below to handle user input and detect function calls
    # This is the recommended approach for Gemini API with tool calling
    if GLOBAL_ENABLE_TOOLS:
        logger.info(f"Tool calling enabled with {len(session_state.current_tools)} tools")
        for tool in session_state.current_tools:
            tool_name = getattr(tool, 'name', str(tool))
            logger.info(f"  - Available tool: {tool_name}")
    else:
        logger.warning("Tool calling is disabled for this session")
    
    # NOTE: This function is now only for handling explicit text messages (non-voice)
    # Voice input and function calls are handled by the handle_generation_event handler
    # registered to the "generation_created" event
    async def process_user_input(user_input):
        """
        Process explicit text input (not voice) and handle any function calls.
        
        Note: This function is NOT in the pathway for handling voice inputs.
        Voice inputs and their function calls are processed by handle_generation_event.
        """
        try:
            # Get the session state for the current room
            session_state = get_or_create_session_state(ctx.room.name, session)
            
            # Use send_message to detect function calls in the SDK-standard way
            logger.info(f"Processing explicit text input: {user_input[:50]}...")
            response = await send_message(session_state, user_input)
            
            # Check if it's a function call
            if response and response.get('type') == 'function_call':
                tool_name = response['tool_name']
                tool_args = response['tool_args']
                logger.info(f"Detected function call from explicit text: {tool_name} with args: {tool_args}")
                
                # Prepare the tool call data
                tool_call_data = {
                    "name": tool_name,
                    "arguments": tool_args
                }
                
                # Process the tool call using the central dispatcher
                result = await process_tool_call(session, tool_call_data)
                logger.info(f"Tool dispatcher result: {result}")
                
                # Send the function response back to Gemini
                await send_function_response(session_state, tool_name, result)
            
            # Return the processed response
            return response
        except Exception as e:
            logger.error(f"Error processing explicit text input: {e}")
            return {"type": "error", "error": str(e)}
    
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
