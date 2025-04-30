#!/bin/bash

# Colors for terminal output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Starting Daily.co Agent Server with Gemini 2.0 Flash ===${NC}"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Node.js is not installed. Please install Node.js and try again."
    exit 1
fi

# Check if .env file exists, if not, copy from example
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        echo -e "${YELLOW}Creating .env file from .env.example${NC}"
        cp .env.example .env
        echo -e "${YELLOW}Please edit the .env file with your API keys${NC}"
    else
        echo -e "${YELLOW}Warning: No .env or .env.example file found.${NC}"
        echo -e "${YELLOW}Creating a basic .env file. You MUST edit this with your credentials.${NC}"
        cat > .env << EOL
# Daily.co credentials
DAILY_API_KEY=
DAILY_DOMAIN=

# Gemini API credentials 
GEMINI_API_KEY=

# Daily token service URL
DAILY_TOKEN_SERVICE_URL=http://localhost:3003

# Agent server port
DAILY_AGENT_PORT=3004
EOL
    fi
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo -e "${BLUE}Installing dependencies...${NC}"
    npm install
fi

# Start the agent server
echo -e "${GREEN}Starting Daily.co Agent Server...${NC}"
echo -e "${GREEN}Server will be available at: http://localhost:${DAILY_AGENT_PORT:-3004}${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop the server${NC}"

# Use nodemon in development mode for auto-restart
if command -v nodemon &> /dev/null; then
    NODE_ENV=development nodemon index.js
else
    node index.js
fi
