# custom_llm.py (create this new file or add the class to your main.py)

import os
import json
import logging
import aiohttp # Required for async HTTP requests: pip install aiohttp
from typing import AsyncIterable, Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from .main import RoxAgent # Import RoxAgent for type hinting to avoid circular dependency
from contextlib import asynccontextmanager

from livekit.agents.llm import LLM, ChatContext, ChatMessage, ChatRole, ChatChunk, ChoiceDelta
import uuid

logger = logging.getLogger(__name__)

# Get the URL of your custom backend agent from environment variables
# Example: export MY_CUSTOM_AGENT_URL="http://localhost:5005/process"
MY_CUSTOM_AGENT_URL = os.getenv("MY_CUSTOM_AGENT_URL", "http://localhost:5005/process") # Default URL

class CustomLLMBridge(LLM):
    """
    A custom LLM component that bridges to an external backend script/service.
    """
    def __init__(self, 
                 agent_url: str = MY_CUSTOM_AGENT_URL, 
                 page_name: Optional[str] = None, 
                 rox_agent_ref: Optional['RoxAgent'] = None): # Add rox_agent_ref
        super().__init__()
        if not agent_url:
            raise ValueError("External agent URL cannot be empty. Set MY_CUSTOM_AGENT_URL environment variable.")
        self._agent_url = agent_url
        self._page_name = page_name # Store page_name, though not currently used by the bridge logic
        self._rox_agent_ref = rox_agent_ref # Store the RoxAgent reference
        if self._rox_agent_ref:
            logger.info(f"CustomLLMBridge initialized with RoxAgent reference. Will send requests to: {self._agent_url} for page: {self._page_name}")
        else:
            logger.warning(f"CustomLLMBridge initialized WITHOUT RoxAgent reference. Context data will not be available. Will send requests to: {self._agent_url} for page: {self._page_name}")

    def chat(self, *, chat_ctx: ChatContext = None, tools = None, tool_choice = None):
        """
        Receives the chat history, sends the latest user message to the external
        backend, and returns an async context manager that yields the response.
        
        Parameters:
        - chat_ctx: The chat context containing message history
        - tools: Optional tools parameter (not used in this implementation)
        - tool_choice: Optional tool choice parameter (not used in this implementation)
        """
        # Return an async context manager
        return self._chat_context_manager(chat_ctx, tools, tool_choice)
    
    @asynccontextmanager
    async def _chat_context_manager(self, chat_ctx: ChatContext, tools, tool_choice):
        """
        An async context manager wrapper that yields an async generator.
        This matches the expected interface in the LiveKit library.
        """
        try:
            # Create the async generator directly inside the context manager
            async def response_generator():
                # Skip if no history
                if not chat_ctx:
                    logger.warning("No chat context provided")
                    yield ChatChunk(id=str(uuid.uuid4()), delta=ChoiceDelta(role='assistant', content=""))
                    return
                
                # Debug the chat context structure - more safely this time
                logger.debug(f"CustomLLMBridge received chat context of type: {type(chat_ctx)}")
                
                # Get messages - try different approaches based on the API
                try:
                    # First attempt: try to access _items directly if it exists
                    if hasattr(chat_ctx, '_items'):
                        messages = getattr(chat_ctx, '_items')
                        logger.debug(f"Got messages from chat_ctx._items: {len(messages)}")
                    # Second attempt: try to use items() as a method
                    elif hasattr(chat_ctx, 'items') and callable(getattr(chat_ctx, 'items')):
                        messages = list(chat_ctx.items())
                        logger.debug(f"Got {len(messages)} messages from chat_ctx.items()")
                    # Third attempt: try to iterate through the object
                    elif hasattr(chat_ctx, '__iter__'):
                        messages = list(chat_ctx)
                        logger.debug(f"Got {len(messages)} messages by iterating chat_ctx")
                    # Last fallback: try using to_dict() if available
                    elif hasattr(chat_ctx, 'to_dict') and callable(getattr(chat_ctx, 'to_dict')):
                        dict_data = chat_ctx.to_dict()
                        if 'messages' in dict_data:
                            messages = dict_data['messages']
                            logger.debug(f"Got {len(messages)} messages from chat_ctx.to_dict()['messages']")
                        else:
                            messages = []
                            logger.debug("chat_ctx.to_dict() doesn't contain 'messages' key")
                    else:
                        messages = []
                        logger.debug("Couldn't find a way to access messages from chat_ctx")
                except Exception as e:
                    logger.error(f"Error accessing messages from chat_ctx: {e}")
                    messages = []
                    logger.debug("Using empty messages list due to error")
                
                if not messages:
                    logger.warning("Empty chat history or couldn't access messages")
                    yield ChatChunk(id=str(uuid.uuid4()), delta=ChoiceDelta(role='assistant', content="I didn't receive any message to process."))
                    return

                # Extract the latest user message (transcript)
                # Be more resilient when checking for user messages
                user_messages = []
                # Log the message structure to help debug
                if messages and len(messages) > 0:
                    logger.debug(f"First message type: {type(messages[0])}")
                    logger.debug(f"First message attributes: {dir(messages[0]) if hasattr(messages[0], '__dir__') else 'No dir attributes'}")
                
                for msg in reversed(messages):
                    try:
                        # More detailed logging of the message
                        logger.debug(f"Processing message: {msg}")
                        
                        # Check if this is a user message using multiple approaches
                        is_user_message = False
                        
                        # Try the direct role attribute
                        if hasattr(msg, 'role'):
                            role_value = getattr(msg, 'role')
                            logger.debug(f"Message has role attribute: {role_value}, type: {type(role_value)}")
                            if str(role_value).lower() == 'user':
                                is_user_message = True
                        
                        # Try accessing it as a dict
                        elif isinstance(msg, dict) and 'role' in msg:
                            logger.debug(f"Message has role key: {msg['role']}")
                            if str(msg['role']).lower() == 'user':
                                is_user_message = True
                        
                        if is_user_message:
                            logger.debug(f"Found a user message: {msg}")
                            user_messages.append(msg)
                    except Exception as e:
                        logger.error(f"Error checking message type: {e}")
                
                user_message = user_messages[0] if user_messages else None

                if not user_message or not user_message.content:
                    logger.warning("No user message found in history to send to external agent.")
                    # You might want to yield an empty response or a default message
                    yield ChatChunk(id=str(uuid.uuid4()), delta=ChoiceDelta(role='assistant', content=""))
                    return

                # Get the transcript content, handling different object structures
                transcript = ""
                try:
                    if hasattr(user_message, 'content'):
                        content = getattr(user_message, 'content')
                        # Handle both string and list content formats
                        if isinstance(content, list):
                            transcript = ' '.join(content)
                        else:
                            transcript = str(content)
                    elif isinstance(user_message, dict) and 'content' in user_message:
                        content = user_message['content']
                        if isinstance(content, list):
                            transcript = ' '.join(content)
                        else:
                            transcript = str(content)
                    else:
                        # Last resort - try to convert the whole message to a string
                        transcript = str(user_message)
                except Exception as e:
                    logger.error(f"Error extracting content from user message: {e}")
                    transcript = "[Error: Could not extract transcript]"
                
                logger.info(f"Sending transcript to external agent at {self._agent_url}: '{transcript}' for page: {self._page_name}")
                # Add more verbosity to help debug
                logger.debug(f"User message object: {user_message}")
                logger.debug(f"User message type: {type(user_message)}")

                response_text = ""
                dom_actions = None
                
                try:
                    # Prepare payload
                    payload = {"transcript": transcript}

                    # Retrieve and add context from RoxAgent if available
                    student_context = None
                    session_id_from_context = None
                    if self._rox_agent_ref:
                        logger.debug(f"CustomLLMBridge: RoxAgent available. Accessing latest context. RoxAgent instance: {self._rox_agent_ref}")
                        logger.debug(f"CustomLLMBridge: Current _latest_student_context from RoxAgent: {getattr(self._rox_agent_ref, '_latest_student_context', 'NOT_FOUND')}")
                        logger.debug(f"CustomLLMBridge: Current _latest_session_id from RoxAgent: {getattr(self._rox_agent_ref, '_latest_session_id', 'NOT_FOUND')}")
                        student_context = self._rox_agent_ref._latest_student_context
                        session_id_from_context = self._rox_agent_ref._latest_session_id
                        if student_context:
                            payload['current_context'] = student_context # Use 'current_context' key
                            logger.info(f"CustomLLMBridge: Added current_context to payload.")
                        if session_id_from_context:
                            payload['session_id'] = session_id_from_context
                            logger.info(f"CustomLLMBridge: Added session_id to payload.")
                    else:
                        logger.warning("CustomLLMBridge: No RoxAgent reference, cannot add context to payload.")

                    logger.info(f"CustomLLMBridge: Preparing to send payload to {self._agent_url}: {json.dumps(payload, indent=2)}")

                    # Use aiohttp for async HTTP requests
                    async with aiohttp.ClientSession() as session:
                        async with session.post(self._agent_url, json=payload) as response:
                            response.raise_for_status() # Raise an exception for bad status codes (4xx or 5xx)
                            result = await response.json() # Expecting JSON back, e.g., {"response": "..."}
                            response_text = result.get("response", "") # Extract the response text
                            
                            # Check for special actions from the agent
                            if "action" in result and "payload" in result:
                                action = result["action"]
                                payload = result["payload"]
                                logger.info(f"Received special action from agent: {action} with payload: {payload}")
                                
                                # Convert the action and payload to a format that can be sent as metadata
                                dom_actions = [{
                                    "action": action,
                                    "payload": payload
                                }]
                                logger.info(f"Converted to dom_actions format: {dom_actions}")
                            # Check if the response contains DOM actions (for backward compatibility)
                            elif "dom_actions" in result:
                                dom_actions = result["dom_actions"]
                                logger.info(f"Received DOM actions from external agent: {dom_actions}")
                            
                            logger.info(f"Received response from external agent: '{response_text}'")

                except aiohttp.ClientError as e:
                    logger.error(f"Error communicating with external agent at {self._agent_url}: {e}")
                    response_text = "Sorry, I encountered an error trying to process your request." # Error message
                except Exception as e:
                    logger.error(f"An unexpected error occurred in CustomLLMBridge: {e}")
                    response_text = "Sorry, an unexpected error occurred." # Generic error message

                # Prepare metadata if dom_actions are present
                current_metadata = None
                if dom_actions:
                    current_metadata = {"dom_actions": json.dumps(dom_actions)}
                
                # Yield the response back to the LiveKit pipeline as a single chunk,
                # including dom_actions in metadata if they exist.
                yield ChatChunk(
                    id=str(uuid.uuid4()),
                    delta=ChoiceDelta(
                        role='assistant',
                        content=response_text,
                        metadata=current_metadata # dom_actions are now here
                    )
                )            
                logger.debug("Finished yielding response from CustomLLMBridge.")
            
            # Yield the async generator
            yield response_generator()
        except Exception as e:
            logger.error(f"Error in _chat_context_manager: {e}")
            raise