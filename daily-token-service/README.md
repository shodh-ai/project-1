# Daily.co Token Service

This service provides API endpoints for creating Daily.co rooms and generating meeting tokens for video calls.

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Configure environment variables by creating a `.env` file with:
   ```
   DAILY_API_KEY=your_daily_api_key
   DAILY_DOMAIN=your-domain.daily.co
   GEMINI_API_KEY=your_gemini_api_key
   PORT=3003
   NODE_ENV=development
   API_KEY=dev-key
   ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,*
   ```

3. Start the service:
   ```
   npm start
   ```

   For development with auto-reload:
   ```
   npm run dev
   ```

## API Endpoints

All API endpoints (except health check) require an API key to be provided in either:
- The `x-api-key` request header
- The `api_key` query parameter

### Health Check

```
GET /health
```

Returns the service health status.

### Create Room

```
GET /api/room?name=roomName
```

Creates a new Daily.co room or returns an existing one with the specified name.

Parameters:
- `name` (optional): The name for the room. If not provided, a unique name will be generated.

### Generate Token

```
GET /api/token?room=roomName&username=userName
```

Generates a Daily.co meeting token for the specified room and user.

Parameters:
- `room`: The name of the room to generate a token for
- `username`: The name of the user to generate a token for

## Development

To run the service in development mode with auto-reload:

```
npm run dev
```

## Integration with main application

This service is used by the main application to:
1. Create Daily.co rooms for video calls
2. Generate tokens for authenticating users to rooms
3. Support the Pipecat implementation in the vocabulary and speaking pages

Make sure to set the `NEXT_PUBLIC_DAILY_TOKEN_SERVICE_URL` environment variable in the main application to point to this service (default: http://localhost:3003).
