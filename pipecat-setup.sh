#!/bin/bash

# Colors for terminal output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Setting up Pipecat with Daily.co and Gemini ===${NC}"

# Create needed directories if they don't exist
mkdir -p logs

# Create a unified .env.pipecat file that will work for both services
echo -e "${YELLOW}Creating .env.pipecat configuration file...${NC}"

cat > .env.pipecat << EOL
# Daily.co credentials
DAILY_API_KEY=b352b6173857ead633c09f16e8ba35d9ff9bd6a7bff7bd8d84f609331e671541
DAILY_DOMAIN=shodhai.daily.co
DAILY_SAMPLE_ROOM_URL=https://shodhai.daily.co/CeHFEBbyrSisQlauOtFa

# API keys for authentication
API_KEY=dev-key
NEXT_PUBLIC_API_KEY=dev-key
PIPECAT_API_KEY=b352b6173857ead633c09f16e8ba35d9ff9bd6a7bff7bd8d84f609331e671541

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

echo -e "${GREEN}Configuration file created at .env.pipecat${NC}"

# Copy the configuration to both services
echo -e "${YELLOW}Copying configuration to Daily token service...${NC}"
cp .env.pipecat daily-token-service/.env

# Kill any existing processes on the token service port
echo -e "${YELLOW}Cleaning up any existing processes...${NC}"
lsof -ti:3003 | xargs kill -9 2>/dev/null || true

# Start the Daily token service
echo -e "${GREEN}Starting Daily token service...${NC}"
cd daily-token-service
NODE_ENV=development node -r dotenv/config index.js &
TOKEN_SERVICE_PID=$!
cd ..

echo -e "${BLUE}Services started:${NC}"
echo -e "  - Daily token service (PID: ${TOKEN_SERVICE_PID})"
echo -e "${GREEN}To stop all services, press Ctrl+C${NC}"
echo -e "Use browser to navigate to: http://localhost:3000/speakingpage"

# Wait for Ctrl+C and then kill the services
trap "echo -e '${YELLOW}Shutting down services...${NC}'; kill $TOKEN_SERVICE_PID; exit 0" INT TERM

# Keep the script running
wait
