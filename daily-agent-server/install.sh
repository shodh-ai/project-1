#!/bin/bash

# Colors for terminal output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Installing Daily.co Agent Server Dependencies ===${NC}"

# Check if node is installed
if ! command -v node &> /dev/null; then
    echo "Node.js is not installed. Please install Node.js and try again."
    exit 1
fi

# Install dependencies
echo "Installing NPM dependencies..."
npm install

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${GREEN}Creating .env file from .env.example${NC}"
    cp .env.example .env
    echo -e "${BLUE}Please edit the .env file to add your API keys and configuration${NC}"
fi

# Create required directories
mkdir -p logs

echo -e "${GREEN}=== Installation complete! ===${NC}"
echo -e "To start the Daily.co Agent Server, run: ${BLUE}npm start${NC}"
echo -e "Or run it in development mode with: ${BLUE}npm run dev${NC}"
