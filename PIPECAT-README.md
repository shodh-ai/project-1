# Pipecat Implementation for Vocabulary Learning

This document explains how the Pipecat and Daily.co integration has been implemented to replace LiveKit for the vocabulary learning page.

## Overview

The implementation consists of two main parts:
1. A backend service for generating Daily.co room URLs and tokens
2. Frontend components that use Daily.co for video and Gemini for AI image generation

## Components and Files

### Backend Service

The token service is located in the `/daily-token-service` directory and consists of:
- `index.js`: Main server entry point
- `controllers/dailyController.js`: API controllers for room creation and token generation
- `routes/dailyRoutes.js`: API route definitions
- `middleware/`: Authentication and logging middleware

### Frontend Components

#### Core Pipecat Components
- `src/services/pipecat/client.ts`: Client for Daily.co API operations
- `src/services/pipecat/PipecatProvider.tsx`: React context provider for Daily.co and Gemini

#### UI Components
- `src/components/pipecat/GeminiLiveChat.tsx`: Component for Gemini AI interaction with clean UI
- `src/components/pipecat/VocabPipecatSession.tsx`: Main session component for vocabulary learning
- `src/components/pipecat/PipecatNavbar.tsx`: Navigation component
- `src/components/daily/DailySession.tsx`: Component for the speaking page using Daily.co

#### Pages
- `src/app/pipecatvocabpage/page.tsx`: Page using the Pipecat implementation for vocabulary learning
- `src/app/speakingpage/page.tsx`: Updated to use the Daily.co + Gemini integration

## How to Run

### 1. Set up environment variables

Create or update the following environment files:

- `.env.daily`: For Daily.co API credentials
- `.env.local`: For global environment variables

Required variables:
```
DAILY_API_KEY=your_daily_api_key
GEMINI_API_KEY=your_gemini_api_key
```

### 2. Start the Daily.co token service

```bash
cd daily-token-service
npm install
npm start
```

This will start the token service on port 3003.

### 3. Start the main application

```bash
npm run dev
```

The application will be available at http://localhost:3000.

## Features

### Vocabulary Learning Page

Access the Pipecat vocabulary learning page at `/pipecatvocabpage`. This page:

- Allows selection of vocabulary words with difficulty levels
- Uses Gemini AI to generate images and descriptions
- Displays the Gemini response in a clean, focused UI
- Has the correct positioning (x: 152px) and dimensions (800px width, 328px height)
- Removes unnecessary controls and duplicate canvas elements
- Provides enhanced prompt input styling with better visual hierarchy

### Speaking Practice Page

Access the speaking practice page at `/speakingpage`. This page:

- Uses Daily.co for video calling instead of LiveKit
- Integrates Gemini AI for speaking feedback
- Includes a timer for IELTS-style practice
- Shows AI-generated feedback on speaking performance

## Architecture

The implementation follows these data flows:

1. **Daily.co Room Creation**:
   - Frontend requests a room from the token service
   - Token service creates a room using Daily.co API
   - Frontend joins the room using the URL

2. **Gemini AI Integration**:
   - User enters a prompt related to vocabulary word
   - Frontend sends request to Gemini API
   - Gemini API returns text/image generation
   - Frontend displays the response

## Differences from LiveKit

The Pipecat implementation differs from LiveKit in several ways:

1. Uses Daily.co instead of LiveKit for video calls
2. Provides a cleaner UI focused on AI image generation
3. Integrates directly with Gemini API for more flexibility
4. Simplifies the user experience with focused components
5. Has improved visual design with correct positioning and dimensions
