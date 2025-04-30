#!/bin/bash

# Colors for terminal output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Starting Daily AI Conversation Agent ===${NC}"

# Create a dedicated .env for the agent server
echo -e "${YELLOW}Creating agent environment configuration...${NC}"

cat > daily-agent-server/.env << EOL
# Daily.co credentials
DAILY_API_KEY=b352b6173857ead633c09f16e8ba35d9ff9bd6a7bff7bd8d84f609331e671541
DAILY_DOMAIN=shodhai.daily.co
DAILY_SAMPLE_ROOM_URL=https://shodhai.daily.co/CeHFEBbyrSisQlauOtFa

# API keys for authentication
API_KEY=dev-key
NEXT_PUBLIC_API_KEY=dev-key
PIPECAT_API_KEY=b352b6173857ead633c09f16e8ba35d9ff7bd6a7bff7bd8d84f609331e671541

# URLs and ports
NEXT_PUBLIC_DAILY_TOKEN_SERVICE_URL=http://localhost:3003
DAILY_TOKEN_SERVICE_URL=http://localhost:3003
DAILY_AGENT_PORT=3004

# Gemini API credentials
GEMINI_API_KEY=AIzaSyBvvp7sahIUJl2JBdz6EYDAaWL-mRJUaUw
NEXT_PUBLIC_GOOGLE_API_KEY=AIzaSyBvvp7sahIUJl2JBdz6EYDAaWL-mRJUaUw

# Environment settings
NODE_ENV=development
EOL

# Kill any existing processes on the agent port
echo -e "${YELLOW}Cleaning up any existing processes...${NC}"
lsof -ti:3004 | xargs kill -9 2>/dev/null || true

# Install dependencies if they aren't already
if [ ! -d "daily-agent-server/node_modules" ]; then
  echo -e "${YELLOW}Installing dependencies...${NC}"
  cd daily-agent-server && npm install && cd ..
fi

# Start the agent server
echo -e "${GREEN}Starting Daily AI agent server...${NC}"
cd daily-agent-server
NODE_ENV=development node -r dotenv/config index.js &
AGENT_PID=$!
cd ..

echo -e "${BLUE}Agent server started (PID: ${AGENT_PID})${NC}"
echo -e "${YELLOW}Waiting for server to initialize...${NC}"
sleep 3

# Create an AI agent for the speaking room
echo -e "${GREEN}Creating AI conversation agent for the speaking room...${NC}"
curl -X POST http://localhost:3004/api/create-agent \
  -H "Content-Type: application/json" \
  -d '{
    "roomUrl": "https://shodhai.daily.co/CeHFEBbyrSisQlauOtFa", 
    "userName": "AI Assistant", 
    "role": "language_partner"
  }'

echo -e "\n${GREEN}AI agent has joined your speaking room!${NC}"
echo -e "${BLUE}You can now have a real-time conversation on the speaking page.${NC}"
echo -e "${YELLOW}To stop the agent server, press Ctrl+C${NC}"

# Wait for Ctrl+C and then kill the services
trap "echo -e '${YELLOW}Shutting down agent server...${NC}'; kill $AGENT_PID; exit 0" INT TERM

# Keep the script running
wait
