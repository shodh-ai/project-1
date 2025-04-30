"""
Command Sender

This module provides utilities for sending commands and data to client applications
through LiveKit data channels.
"""

import logging
import json
import asyncio
from typing import Dict, Any, Optional

from livekit.agents import AgentSession

logger = logging.getLogger(__name__)

# Topics for different types of messages
TOPIC_TIMER = "agent-timer"
TOPIC_TOOLS = "agent-tools" 
TOPIC_UI = "agent-ui"
TOPIC_CANVAS = "agent-canvas"
TOPIC_FEEDBACK = "agent-feedback"

async def send_command(
    session: AgentSession,
    command_type: str,
    command_data: Dict[str, Any],
    topic: str = TOPIC_TOOLS
) -> bool:
    """
    Send a command to client applications via LiveKit data channel.
    
    Args:
        session: The current agent session
        command_type: The type of command (e.g., 'timer_control', 'canvas_update')
        command_data: The command payload
        topic: The topic to publish on
        
    Returns:
        True if successful, False otherwise
    """
    try:
        # Prepare the message payload
        message = {
            "type": command_type,
            "data": command_data,
            "timestamp": int(asyncio.get_event_loop().time() * 1000)  # ms timestamp
        }
        
        # Serialize and send the message
        message_bytes = json.dumps(message).encode("utf-8")
        await session.room.local_participant.publish_data(
            message_bytes,
            topic=topic
        )
        
        logger.debug(f"Sent command: {command_type} on topic: {topic}")
        return True
    except Exception as e:
        logger.error(f"Error sending command {command_type}: {str(e)}")
        return False


async def send_timer_command(
    session: AgentSession,
    action: str,
    duration: Optional[int] = None,
    purpose: Optional[str] = None
) -> bool:
    """
    Send a timer-specific command to clients.
    
    Args:
        session: The current agent session
        action: The timer action ('start', 'stop', 'pause', 'resume')
        duration: For 'start' action, the duration in seconds
        purpose: The purpose of the timer ('preparation', 'speaking')
        
    Returns:
        True if successful, False otherwise
    """
    try:
        logger.info(f"TIMER-TEST: send_timer_command called with action={action}, duration={duration}, purpose={purpose}")
        
        # Format the command to match UI expectations
        # The UI expects a direct timer format, not wrapped in command_data
        timer_command = {
            "type": "timer",
            "action": action
        }
        
        # For 'start' action, include duration
        if action == "start" and duration is not None:
            timer_command["duration"] = duration
            
            # Use purpose as mode for UI styling
            if purpose:
                timer_command["mode"] = purpose
        
        # Encode the command as JSON
        payload = json.dumps(timer_command)
        
        # Send the timer command directly to the agent-timer topic
        # This matches what the UI expects
        # Use reliable delivery to ensure the message arrives
        await session.room.local_participant.publish_data(
            payload.encode("utf-8"),
            topic=TOPIC_TIMER,  # Use the timer-specific topic
            reliability="reliable"  # Ensure reliable delivery
        )
        
        logger.info(f"TIMER-TEST: Timer command sent: {payload}")
        return True
    except Exception as e:
        logger.error(f"TIMER-TEST: Error sending timer command: {str(e)}", exc_info=True)
        return False


async def send_ui_notification(
    session: AgentSession,
    message: str,
    level: str = "info",
    duration: int = 5000  # ms
) -> bool:
    """
    Send a UI notification to clients.
    
    Args:
        session: The current agent session
        message: The notification message
        level: The notification level ('info', 'warning', 'error', 'success')
        duration: How long to show the notification in ms
        
    Returns:
        True if successful, False otherwise
    """
    command_data = {
        "message": message,
        "level": level,
        "duration": duration
    }
    
    return await send_command(
        session,
        "notification",
        command_data,
        TOPIC_UI
    )


async def send_canvas_command(
    session: AgentSession,
    action: str,
    canvas_data: Optional[Dict[str, Any]] = None
) -> bool:
    """
    Send a canvas-related command to clients.
    
    Args:
        session: The current agent session
        action: The canvas action ('save', 'load', 'clear', 'highlight')
        canvas_data: Optional canvas data for actions that require it
        
    Returns:
        True if successful, False otherwise
    """
    command_data = {"action": action}
    
    if canvas_data:
        command_data["canvas_data"] = canvas_data
        
    return await send_command(
        session,
        "canvas_control",
        command_data,
        TOPIC_CANVAS
    )
