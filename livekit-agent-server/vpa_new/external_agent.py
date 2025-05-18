# external_agent.py (Dynamic Persona & Tool-Aware Agent Backend)

import os
import json
import logging
from flask import Flask, request, jsonify
from openai import OpenAI
from dotenv import load_dotenv
from typing import Optional, Dict, Any, List

# --- Setup ---
load_dotenv()
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(name)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)

# --- OpenAI Client Initialization ---
openai_api_key = os.getenv("OPENAI_API_KEY")
if not openai_api_key:
    logger.error("OPENAI_API_KEY environment variable not found. API calls will fail.")
    client = None
else:
    client = OpenAI(api_key=openai_api_key)

# --- Tool Function Handlers ---
def get_current_weather(location: str, unit: str = "celsius") -> str:
    logger.info(f"Executing get_current_weather for: {location} (unit: {unit})")
    if "tokyo" in location.lower():
        weather_info = {"location": location, "temperature": "15", "unit": unit, "forecast": "rainy"}
    elif "san francisco" in location.lower():
        weather_info = {"location": location, "temperature": "18", "unit": unit, "forecast": "sunny"}
    elif "jaipur" in location.lower():
        weather_info = {"location": location, "temperature": "35", "unit": unit, "forecast": "sunny and hot"}
    else:
        weather_info = {"location": location, "temperature": "22", "unit": unit, "forecast": "cloudy"}
    return json.dumps(weather_info)

def click_ui_button_handler(selector: str) -> str:
    logger.info(f"LLM decided to click UI element with selector: {selector}")
    return json.dumps({"status": "click_action_prepared", "selector_clicked": selector, "message": f"Action to click element '{selector}' has been noted."})

# --- Dynamic Prompt and Tool Configuration ---
DEFAULT_PAGE_ID = "default_page"

PAGE_CONFIGS: Dict[str, Dict[str, Any]] = {
    "rox": {
        "system_prompt": "You are Rox, a witty and helpful AI assistant. You can provide weather updates and interact with UI elements like clicking buttons when asked.",
        "tools": [
            {
                "type": "function",
                "function": {
                    "name": "click_ui_button",
                    "description": "Clicks a button or interactive element in the user interface. Use this when the user asks to click something or to navigate.",
                    "parameters": {
                        "type": "object",
                        "properties": {"selector": {"type": "string", "description": "The CSS selector of the UI element to click (e.g., '#docsButton', '.submit-button')."}},
                        "required": ["selector"],
                    },
                },
            },
            {
                "type": "function",
                "function": {
                    "name": "get_current_weather",
                    "description": "Get the current weather in a given location.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "location": {"type": "string", "description": "The city and state, e.g., San Francisco, CA"},
                            "unit": {"type": "string", "enum": ["celsius", "fahrenheit"]},
                        },
                        "required": ["location"],
                    },
                },
            }
        ],
        "available_functions": {
            "get_current_weather": get_current_weather,
            "click_ui_button": click_ui_button_handler,
        }
    },
    "speakingreport": {
        "system_prompt": "You are a specialist speech analyst. Given a transcript, provide detailed, constructive feedback on pronunciation, fluency, intonation, and clarity. Offer actionable suggestions for improvement. Be encouraging and supportive.",
        "tools": [],
        "available_functions": {}
    },
    "writingreport": {
        "system_prompt": "You are an expert writing assistant. Analyze provided text for grammar, style, coherence, and vocabulary. Offer specific, constructive suggestions and revisions to enhance writing quality.",
        "tools": [],
        "available_functions": {}
    },
    "vocab/vocab_new_page": {
        "system_prompt": "You are a friendly vocabulary tutor. Explain word meanings, provide example sentences, and offer synonyms/antonyms. Engage users to help them learn.",
        "tools": [], # Example: could add a tool to look up etymology
        "available_functions": {}
    },
    "welcome_guide": { # New Welcoming Persona
        "system_prompt": "You are Alex, a friendly and helpful Welcome Guide. Your goal is to make users feel comfortable and informed. Greet them warmly, briefly introduce the main features of this platform, and ask if they need help getting started or have any questions.",
        "tools": [], # Could add a tool to open help docs, e.g., {"type": "function", "function": {"name": "open_help_documentation", ...}}
        "available_functions": {} # e.g., "open_help_documentation": open_help_docs_handler
    },
    "tech_support_agent": { # New Tech Support Persona (for a hypothetical /support page)
        "system_prompt": "You are Sparky, a patient and knowledgeable Tech Support Agent. Listen carefully to the user's problem, ask clarifying questions, and guide them through troubleshooting steps. If you can't resolve the issue, explain how they can escalate it.",
        "tools": [
            # Placeholder tool - implement the actual function and handler if needed
            # {
            #     "type": "function", 
            #     "function": {
            #         "name": "search_knowledge_base", 
            #         "description": "Searches the knowledge base for articles related to the user's issue.",
            #         "parameters": {
            #             "type": "object", 
            #             "properties": {"query": {"type": "string", "description": "The search query for the knowledge base."}},
            #             "required": ["query"]
            #         }
            #     }
            # }
        ],
        "available_functions": { 
            # "search_knowledge_base": search_knowledge_base_handler 
        }
    },
    "interactive_tutor": { # New Interactive Tutor Persona (for a hypothetical /learn/math page)
        "system_prompt": "You are Professor Ada, an engaging and enthusiastic Math Tutor. Your goal is to help students understand mathematical concepts. Explain things clearly, use examples, and ask questions to check their understanding. Make learning fun!",
        "tools": [
            # Placeholder tool
            # {
            #     "type": "function", 
            #     "function": {
            #         "name": "show_math_formula", 
            #         "description": "Displays a specific mathematical formula to the user.",
            #         "parameters": {
            #             "type": "object", 
            #             "properties": {"formula_name": {"type": "string", "description": "The name or topic of the formula to display."}},
            #             "required": ["formula_name"]
            #         }
            #     }
            # }
        ],
        "available_functions": {
            # "show_math_formula": show_math_formula_handler
        }
    },
    DEFAULT_PAGE_ID: { # Default fallback persona
        "system_prompt": "You are a helpful general assistant. How can I assist you today? You can provide current weather information if asked.",
        "tools": [
            {
                "type": "function",
                "function": {
                    "name": "get_current_weather",
                    "description": "Get the current weather in a given location.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "location": {"type": "string", "description": "The city and state, e.g., San Francisco, CA"},
                            "unit": {"type": "string", "enum": ["celsius", "fahrenheit"]},
                        },
                        "required": ["location"],
                    },
                },
            }
        ],
        "available_functions": {"get_current_weather": get_current_weather}
    }
}

def get_page_specific_config(page_id: Optional[str]) -> Dict[str, Any]:
    config_key = page_id if page_id and page_id in PAGE_CONFIGS else DEFAULT_PAGE_ID
    config = PAGE_CONFIGS[config_key]
    logger.info(f"Using configuration for page_identifier: '{config_key}'")
    return config

# --- Flask Route ---
@app.route('/process', methods=['POST'])
def process_transcript():
    if not client:
         logger.error("OpenAI client not initialized.")
         return jsonify({"response": "Sorry, the AI service is not configured."}), 500

    data = request.get_json()
    if not data or 'transcript' not in data:
        logger.error("Invalid request: Missing 'transcript'.")
        return jsonify({"error": "Missing 'transcript' in request"}), 400

    transcript = data['transcript']
    page_identifier = data.get('page_identifier')
    logger.info(f"Processing transcript: '{transcript}' for page: '{page_identifier}'")

    page_config = get_page_specific_config(page_identifier)
    system_prompt = page_config["system_prompt"]
    current_tools = page_config["tools"]
    current_available_functions = page_config["available_functions"]

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": transcript}
    ]

    try:
        openai_params = {"model": "gpt-4o-mini", "messages": messages}
        if current_tools:
            openai_params["tools"] = current_tools
            openai_params["tool_choice"] = "auto"
        
        logger.debug(f"Sending to OpenAI: {openai_params}")
        response = client.chat.completions.create(**openai_params)
        response_message = response.choices[0].message
        logger.debug(f"OpenAI raw response message: {response_message}")

        tool_calls = response_message.tool_calls
        final_response_text = response_message.content
        action_payload_for_client = {}

        if tool_calls:
            messages.append(response_message) 
            for tool_call in tool_calls:
                function_name = tool_call.function.name
                function_to_call = current_available_functions.get(function_name)

                if not function_to_call:
                    logger.warning(f"LLM tried to call unknown function '{function_name}' for page '{page_identifier}'.")
                    messages.append({"tool_call_id": tool_call.id, "role": "tool", "name": function_name, "content": json.dumps({"error": "Function not available"})})
                    continue 

                try:
                    function_args_str = tool_call.function.arguments
                    function_args = json.loads(function_args_str)
                    logger.info(f"Calling function '{function_name}' with args: {function_args}")
                    
                    function_response_content = function_to_call(**function_args)
                    logger.info(f"Function '{function_name}' returned: {function_response_content}")
                    
                    messages.append({"tool_call_id": tool_call.id, "role": "tool", "name": function_name, "content": function_response_content})

                    if function_name == "click_ui_button":
                        action_payload_for_client = {"action": "click", "payload": {"selector": function_args.get("selector")}}
                        final_response_text = ""

                except json.JSONDecodeError:
                    logger.error(f"Invalid JSON arguments from OpenAI for {function_name}: {function_args_str}")
                    messages.append({"tool_call_id": tool_call.id, "role": "tool", "name": function_name, "content": json.dumps({"error": "Invalid arguments"})})
                except Exception as e:
                    logger.error(f"Error executing function {function_name}: {e}", exc_info=True)
                    messages.append({"tool_call_id": tool_call.id, "role": "tool", "name": function_name, "content": json.dumps({"error": str(e)})})
            
            logger.info("Calling OpenAI again with tool responses to get final text...")
            second_response = client.chat.completions.create(model="gpt-4o-mini", messages=messages)
            final_response_text = second_response.choices[0].message.content
            logger.info(f"LLM generated final text after tool calls: '{final_response_text}'")

        if not final_response_text:
            final_response_text = "Is there anything else I can help you with?" 
            logger.warning("OpenAI response content was empty, using fallback.")

        json_to_return = {"response": final_response_text}
        if action_payload_for_client:
            json_to_return.update(action_payload_for_client) 
        
        logger.info(f"Sending final JSON to LiveKit bridge: {json_to_return}")
        return jsonify(json_to_return)

    except Exception as e:
        logger.error(f"Error in process_transcript: {e}", exc_info=True)
        return jsonify({"response": "Sorry, an unexpected error occurred."}), 500

if __name__ == '__main__':
    port = int(os.getenv("PORT", 5005))
    logger.info(f"Starting Flask server for External Agent on host 0.0.0.0 port {port}")
    app.run(host='0.0.0.0', port=port, debug=False)
