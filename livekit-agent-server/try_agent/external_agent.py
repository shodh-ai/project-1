# external_agent.py (Weather and Image Generation Agent with OpenAI Function Calling)

import os
import json
import logging
from flask import Flask, request, jsonify
from openai import OpenAI  # Use the new OpenAI library structure
from dotenv import load_dotenv

# --- Setup ---
load_dotenv()  # Load environment variables from .env file
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)

# --- OpenAI Client Initialization ---
# Make sure OPENAI_API_KEY is set in your environment or .env file
openai_api_key = os.getenv("OPENAI_API_KEY")
if not openai_api_key:
    logger.error("OPENAI_API_KEY environment variable not found.")
    # Handle the error appropriately in a real application
    # For this example, we'll proceed but API calls will fail.
    client = None
else:
    client = OpenAI(api_key=openai_api_key)

# --- Mock Weather Function ---
def get_current_weather(location: str, unit: str = "celsius") -> str:
    """
    Simulates getting the current weather for a given location.
    In a real application, this would call a weather API.
    """
    logger.info(f"Simulating weather fetch for: {location} (unit: {unit})")
    # Simple mock data based on location
    if "tokyo" in location.lower():
        weather_info = {"location": location, "temperature": "15", "unit": unit, "forecast": "rainy"}
    elif "san francisco" in location.lower():
        weather_info = {"location": location, "temperature": "18", "unit": unit, "forecast": "sunny"}
    elif "jaipur" in location.lower():
         weather_info = {"location": location, "temperature": "35", "unit": unit, "forecast": "sunny and hot"}
    else:
        weather_info = {"location": location, "temperature": "22", "unit": unit, "forecast": "cloudy"}

    # Return as a JSON string (as required by OpenAI function calling spec)
    return json.dumps(weather_info)

# --- Image Generation Function ---
def generate_image_prompt(word: str, context: str = None) -> str:
    """
    Creates an appropriate prompt for generating an image related to a vocabulary word.
    
    In a real application, this would provide a prompt to the image generation service.
    """
    logger.info(f"Creating image generation prompt for word: {word} (context: {context})")
    
    # Construct a meaningful prompt based on the word and context
    if context:
        # If there's additional context, include it in the prompt
        prompt = f"Create a visual representation of the word '{word}' in the context of {context}. Make it memorable and easy to understand."
    else:
        # Generic prompt based on the word alone
        prompt = f"Create a memorable visual representation of the word '{word}' that illustrates its meaning."
    
    # Return as a JSON string (as required by OpenAI function calling spec)
    return json.dumps({"word": word, "prompt": prompt})

# --- OpenAI Function Definition ---
# Describe all available functions the model can call
tools = [
    {
        "type": "function",
        "function": {
            "name": "get_current_weather",
            "description": "Get the current weather in a given location",
            "parameters": {
                "type": "object",
                "properties": {
                    "location": {
                        "type": "string",
                        "description": "The city and state, e.g., San Francisco, CA",
                    },
                    "unit": {"type": "string", "enum": ["celsius", "fahrenheit"]},
                },
                "required": ["location"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "generate_image_prompt",
            "description": "Generate an appropriate prompt for an image that represents a vocabulary word",
            "parameters": {
                "type": "object",
                "properties": {
                    "word": {
                        "type": "string",
                        "description": "The vocabulary word to create an image for",
                    },
                    "context": {
                        "type": "string",
                        "description": "Additional context about the word, such as its definition or example usage",
                    },
                },
                "required": ["word"],
            },
        },
    }
]

# --- Flask Route ---
@app.route('/process', methods=['POST'])
def process_transcript():
    """
    Unified endpoint that handles both weather queries and image generation requests.
    """
    if not client:
        logger.error("OpenAI client not initialized. Cannot process request.")
        return jsonify({"response": "Sorry, my connection to the AI service is not configured."}), 500

    data = request.get_json()
    if not data or 'transcript' not in data:
        logger.error("Received invalid request data.")
        return jsonify({"error": "Missing 'transcript' in request"}), 400

    transcript = data['transcript']
    current_word = data.get('word', '')  # Get the current vocabulary word if available
    definition = data.get('definition', '')  # Get the definition if available
    
    logger.info(f"Received transcript: '{transcript}'")

    # --- Step 1: Call OpenAI to see if function call is needed ---
    system_message = "You are a helpful AI assistant that can provide weather information and generate images for vocabulary words."
    if current_word:
        system_message += f" The user is currently studying the vocabulary word '{current_word}'. Definition: {definition}"
    
    messages = [
        {"role": "system", "content": system_message},
        {"role": "user", "content": transcript}
    ]
    
    try:
        logger.info("Calling OpenAI API...")
        response = client.chat.completions.create(
            model="gpt-4o-mini",  # Or another model that supports function calling
            messages=messages,
            tools=tools,
            tool_choice="auto",  # Let the model decide whether to call a function
        )
        response_message = response.choices[0].message
        logger.debug(f"OpenAI raw response message: {response_message}")

        tool_calls = response_message.tool_calls

        # --- Step 2: Check if the model wants to call a function ---
        if tool_calls:
            logger.info("OpenAI requested a function call.")
            # For this example, we only handle the first tool call if multiple exist
            available_functions = {
                "get_current_weather": get_current_weather,
                "generate_image_prompt": generate_image_prompt,
            }
            tool_call = tool_calls[0]  # Get the first tool call
            function_name = tool_call.function.name
            function_to_call = available_functions.get(function_name)

            if not function_to_call:
                logger.warning(f"Model requested unknown function: {function_name}")
                return jsonify({"response": "Sorry, I can't perform that action."})
            
            try:
                function_args = json.loads(tool_call.function.arguments)
                logger.info(f"Calling function '{function_name}' with args: {function_args}")
                
                # --- Step 3: Call the selected function based on function name ---
                if function_name == "get_current_weather":
                    # Handle weather function
                    function_response = function_to_call(
                        location=function_args.get("location"),
                        unit=function_args.get("unit", "celsius"),  # Default to celsius if not provided
                    )
                    logger.info(f"Function '{function_name}' returned: {function_response}")
                    
                    try:
                        weather_data = json.loads(function_response)
                        response_text = (
                            f"The current weather in {weather_data['location']} "
                            f"is {weather_data['temperature']} degrees {weather_data['unit']} "
                            f"with {weather_data['forecast']} conditions."
                        )
                        return jsonify({"response": response_text})
                    except json.JSONDecodeError:
                        logger.error("Failed to parse function response JSON.")
                        return jsonify({"response": "Sorry, I couldn't get the weather details correctly."})
                
                elif function_name == "generate_image_prompt":
                    # Handle image generation function
                    function_response = function_to_call(
                        word=function_args.get("word", current_word),
                        context=function_args.get("context", definition),
                    )
                    logger.info(f"Function '{function_name}' returned: {function_response}")
                    
                    try:
                        prompt_data = json.loads(function_response)
                        # Return both the conversational response and DOM action instructions
                        return jsonify({
                            "response": f"I'll generate an image for the word '{prompt_data['word']}'. Let me visualize this for you.",
                            "dom_actions": [
                                {
                                    "action": "fill_input",
                                    "selector": "input[placeholder*='Ask AI to draw']",  # Target the image prompt input field
                                    "value": prompt_data["prompt"]
                                },
                                {
                                    "action": "click",
                                    "selector": "button[type='submit']"  # Target the submit button
                                }
                            ]
                        })
                    except json.JSONDecodeError:
                        logger.error("Failed to parse function response JSON.")
                        return jsonify({"response": "Sorry, I couldn't generate an appropriate image prompt."})

            except json.JSONDecodeError:
                logger.error(f"Invalid JSON arguments from OpenAI: {tool_call.function.arguments}")
                return jsonify({"response": "Sorry, I couldn't understand your request properly."})
            except Exception as e:
                logger.error(f"Error calling function {function_name}: {e}")
                return jsonify({"response": f"Sorry, there was an error processing your request."})

        else:
            # --- No function call requested by OpenAI ---
            logger.info("OpenAI did not request a function call. Generating generic response.")
            # Get the text response directly from the model if no function was called
            response_text = response_message.content
            if not response_text:  # Fallback if content is empty
                response_text = "I can help with weather information and vocabulary visualization. How can I assist you?"
            return jsonify({"response": response_text})


    except Exception as e:
        logger.error(f"Error calling OpenAI API: {e}")
        return jsonify({"response": "Sorry, I encountered an error trying to understand your request."})

if __name__ == '__main__':
    # Make sure to run on a host accessible by your LiveKit agent
    # Use port 5005 to match the URL expected by custom_llm.py
    port = int(os.getenv("PORT", 5005))
    logger.info(f"Starting Flask server on port {port}")
    app.run(host='0.0.0.0', port=port, debug=False) # Use debug=False for stability

