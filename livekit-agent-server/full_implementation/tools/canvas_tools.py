# File: tools/canvas_tools.py
# Tools for managing canvas and drawing operations

import json
import logging
from typing import Dict, Any, Optional
from livekit.agents import AgentSession

# Import the command sender for dispatching drawing commands to the client
from tools.command_sender import send_data_message

logger = logging.getLogger(__name__)

async def handle_draw_concept(session: AgentSession, args: Dict[str, Any]) -> Dict[str, Any]:
    """Handle the drawConcept tool request.
    
    This function processes a request to draw a concept or illustration for vocabulary
    learning purposes and sends the appropriate command to the client.
    
    Args:
        session: The AgentSession object
        args: The arguments for the tool call, including:
            - concept: The word or concept to visualize (required)
            - instructions: Optional specific instructions about what to draw (optional)
    
    Returns:
        A dictionary with the status of the operation and other relevant details
    """
    # Extract parameters from args
    concept = args.get("concept")
    instructions = args.get("instructions", "")
    
    # Validate required parameters
    if not concept:
        error_msg = "Missing required 'concept' parameter for drawConcept tool"
        logger.error(f"TIMER-TEST: {error_msg}")
        return {"status": "error", "message": error_msg}
    
    logger.info(f"TIMER-TEST: >>> handle_draw_concept called. Simulating canvas command for concept: '{concept}'")
    if instructions:
        logger.info(f"TIMER-TEST: >>> Drawing instructions: '{instructions}'")
    
    # Create the canvas command data
    canvas_data = {
        "type": "draw_concept",
        "concept": concept,
        "instructions": instructions
    }
    
    try:
        # Try to send the data message to the client
        # In a full implementation, this would trigger canvas drawing on the client side
        await send_data_message(session, "agent-canvas", json.dumps(canvas_data))
        logger.info(f"TIMER-TEST: Canvas command sent for concept: '{concept}'")
        
        # Return a successful response
        return {
            "status": "success",
            "message": f"Drawing created for concept: '{concept}'",
            "concept": concept,
            "instructions": instructions if instructions else "No specific instructions provided"
        }
    except Exception as e:
        logger.error(f"TIMER-TEST: Error sending canvas command: {str(e)}")
        return {"status": "error", "message": f"Failed to create drawing: {str(e)}"}
