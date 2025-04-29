#!/bin/bash

# Start both the Daily.co token service and the main application

# Terminal colors
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}====================================${NC}"
echo -e "${BLUE}Starting Pipecat Development Environment${NC}"
echo -e "${BLUE}====================================${NC}"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${YELLOW}npm is not installed. Please install Node.js and npm.${NC}"
    exit 1
fi

# Check if the required directories exist
if [ ! -d "./daily-token-service" ]; then
    echo -e "${YELLOW}daily-token-service directory not found. Please make sure you're in the right directory.${NC}"
    exit 1
fi

# Function to check if a port is in use
port_in_use() {
    lsof -i:$1 &>/dev/null
}

# Check if port 3003 is in use
if port_in_use 3003; then
    echo -e "${YELLOW}Port 3003 is already in use. Please stop any service using this port before continuing.${NC}"
    exit 1
fi

# Install dependencies if needed
echo -e "${BLUE}Checking Daily.co token service dependencies...${NC}"
cd daily-token-service
if [ ! -d "node_modules" ]; then
    echo -e "${BLUE}Installing Daily.co token service dependencies...${NC}"
    npm install
fi

# Start the Daily.co token service in the background
echo -e "${GREEN}Starting Daily.co token service on port 3003...${NC}"
npm start &
DAILY_PID=$!

# Give the token service a moment to start
sleep 2

echo -e "${GREEN}Daily.co token service started with PID: ${DAILY_PID}${NC}"

# Return to the main directory
cd ..

# Start the main application
echo -e "${BLUE}Starting main application...${NC}"
echo -e "${GREEN}The application will be available at: http://localhost:3000${NC}"
echo -e "${YELLOW}To stop all services, press Ctrl+C${NC}"

# Start the main application in the foreground
npm run dev

# When Ctrl+C is pressed, this will execute
echo -e "${BLUE}Shutting down services...${NC}"
kill $DAILY_PID
echo -e "${GREEN}All services stopped.${NC}"
