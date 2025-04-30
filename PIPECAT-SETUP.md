# Pipecat: Daily.co + Gemini Integration

This document explains how to set up and run the Pipecat integration, which combines Daily.co video calls with Google's Gemini AI for an interactive speaking practice experience.

## Architecture Overview

The setup consists of three main components:

1. **Next.js Frontend Application**
   - Contains the user interface with clean, focused components
   - Integrates with Daily.co for video calls
   - Communicates with Gemini AI for speaking feedback

2. **Daily Token Service** (Port 3003)
   - Creates Daily.co rooms
   - Generates authentication tokens
   - Handles API communication with Daily.co

3. **Daily Agent Server** (Port 3004)
   - Creates AI agents that join Daily.co rooms
   - Processes audio in real-time with Gemini 2.0 Flash
   - Enables speech-to-speech communication

## Environment Configuration

To simplify the configuration process, we've created a unified environment file and setup script:

- **`.env.pipecat`**: Contains all necessary environment variables for all services
- **`pipecat-setup.sh`**: Sets up and starts all required services

## How to Run

1. **Run the setup script** (starts Daily token service):
   ```bash
   ./pipecat-setup.sh
   ```

2. **Start the Next.js application** (in a separate terminal):
   ```bash
   npm run dev
   ```

3. **Access the speaking page**:
   Navigate to: http://localhost:3000/speakingpage

## Key Environment Variables

The integration uses these important environment variables:

| Variable | Purpose |
|----------|---------|
| `DAILY_API_KEY` | Authentication for Daily.co API |
| `DAILY_DOMAIN` | Your Daily.co domain (e.g., yourdomain.daily.co) |
| `DAILY_SAMPLE_ROOM_URL` | Pre-created room URL for testing |
| `GEMINI_API_KEY` | Google Gemini API key for AI functionality |
| `NEXT_PUBLIC_DAILY_TOKEN_SERVICE_URL` | URL to the Daily token service |

## User Interface

The interface follows these design principles:

- **Clean, focused layout** with emphasis on Gemini AI integration
- **Speaking page features**:
  - Video panel (800px width) with camera/mic controls
  - Question display section
  - Gemini AI feedback panel with clean styling

## Troubleshooting

If you encounter issues:

1. **Check the logs** of both services
2. **Verify environment variables** are correctly set
3. **Check network requests** between frontend and token service
4. **Ensure all services** are running on their correct ports

## Development Testing

For simplified testing during development:
- The token service automatically uses a pre-created sample room (`DAILY_SAMPLE_ROOM_URL`)
- Authentication uses simple dev-keys in non-production mode
- Real Daily.co room creation is only used in production environments
