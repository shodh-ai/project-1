"""
Timer Tools

This module implements handlers for timer-related tools like startTimer.
These tools allow the agent to control timer UI elements in the client.
"""

import logging
import json
from typing import Dict, Any, Optional

from livekit.agents import AgentSession, function_tool, RunContext

# Import the timer command sender
from .command_sender import send_timer_command

logger = logging.getLogger(__name__)

@function_tool()
async def start_timer(context: RunContext, duration: int, purpose: str = "speaking") -> str:
    """Start a countdown timer on the UI.
    
    Args:
        context: The run context from LiveKit Agents
        duration: Integer duration in seconds
        purpose: Timer purpose ("preparation" or "speaking")
            
    Returns:
        Status message
    """
    logger.info(f"TIMER-TOOL: start_timer called with duration={duration}, purpose={purpose}")
    
    session = context.session
    
    # Override to 15 seconds for speaking persona (fixed constraint in the prompt)
    if purpose == "speaking":
        logger.info(f"TIMER-TOOL: Overriding requested duration={duration} to fixed 15 seconds for speaking practice")
        duration = 15
    
    # Validate the duration parameter
    if not isinstance(duration, int) or duration <= 0:
        logger.error(f"TIMER-TOOL: Invalid duration provided: {duration}")
        return "Invalid duration provided. Must be a positive integer."
        
    # Validate the purpose parameter if provided
    if purpose and purpose not in ["preparation", "speaking"]:
        logger.error(f"TIMER-TOOL: Invalid purpose provided: {purpose}")
        return "Invalid purpose provided. Must be 'preparation' or 'speaking'."
    
    logger.info(f"Starting {purpose} timer for {duration} seconds")
    
    # Send the timer command using the dedicated command sender
    try:
        # Call the imported function, passing the session object
        logger.info(f"TIMER-TOOL: Sending timer command: action=start, duration={duration}, purpose={purpose}")
        success = await send_timer_command(
            session=session,  # Pass the session object
            action="start",
            duration=duration,
            purpose=purpose    # This will be used as 'mode' in UI
        )
        
        if not success:
            logger.error("TIMER-TOOL: Failed to send timer command via command_sender")
            return "Failed to send timer command to UI"
            
        logger.info(f"TIMER-TOOL: Successfully published timer message")
        
        # Simply log the command was sent - no timer state management here
        session_id = session.room.name
        logger.info(f"TIMER-TOOL: Timer command sent for session {session_id}: duration={duration}, purpose={purpose}")
        
        # Acknowledge to the user that the timer has started
        await context.session.say(f"I've started a {purpose} timer for {duration} seconds.")
        
        # Return a simple string response as per the LiveKit Agents function_tool pattern
        return f"Started {purpose} timer for {duration} seconds"
        
    except Exception as e:
        logger.error(f"TIMER-TOOL: Error sending timer control: {str(e)}", exc_info=True)
        return f"Failed to send timer command: {str(e)}"


async def check_timer_status(session: AgentSession) -> Dict[str, Any]:
    """
    Check the status of an active timer for the session.
    
    Args:
        session: The current agent session
        
    Returns:
        Timer status information
    """
    session_id = session.room.name
    if session_id not in timer_sessions or not timer_sessions[session_id].get("active", False):
        return {
            "active": False,
            "message": "No active timer"
        }
    
    timer_data = timer_sessions[session_id]
    start_time = timer_data.get("start_time", 0)
    duration = timer_data.get("duration", 0)
    purpose = timer_data.get("purpose", "unknown")
    
    # Calculate elapsed time
    current_time = asyncio.get_event_loop().time()
    elapsed = current_time - start_time
    remaining = max(0, duration - elapsed)
    
    # Check if timer is complete
    if remaining <= 0:
        timer_sessions[session_id]["active"] = False
        return {
            "active": False,
            "completed": True,
            "purpose": purpose,
            "message": f"{purpose.capitalize()} timer has finished"
        }
    
    return {
        "active": True,
        "purpose": purpose,
        "elapsed": elapsed,
        "remaining": remaining,
        "message": f"{purpose.capitalize()} timer is active with {remaining:.1f} seconds remaining"
    }


async def stop_timer(session: AgentSession) -> Dict[str, Any]:
    """
    Stop an active timer for the session.
    
    Args:
        session: The current agent session
        
    Returns:
        Timer stop status
    """
    session_id = session.room.name
    if session_id not in timer_sessions or not timer_sessions[session_id].get("active", False):
        return {
            "success": False,
            "message": "No active timer to stop"
        }
    
    purpose = timer_sessions[session_id].get("purpose", "unknown")
    
    # Set timer as inactive
    timer_sessions[session_id]["active"] = False
    
    # Send timer stop command
    try:
        await session.room.local_participant.publish_data(
            json.dumps({
                "type": "timer_control",
                "data": {
                    "action": "stop",
                    "purpose": purpose
                }
            }).encode("utf-8"),
            topic="agent-tools"
        )
        
        return {
            "success": True,
            "message": f"Stopped {purpose} timer"
        }
    except Exception as e:
        logger.error(f"Error stopping timer: {str(e)}")
        return {
            "success": False,
            "message": f"Failed to stop timer: {str(e)}"
        }
