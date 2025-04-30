const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const dailyRoutes = require('./routes/dailyRoutes');
const { apiKeyAuth } = require('./middleware/auth');
const { requestLogger } = require('./middleware/logger');

// Try to load environment variables from multiple places
// First try .env
dotenv.config();
// Then try .env.local if it exists
if (fs.existsSync(path.join(__dirname, '.env.local'))) {
  dotenv.config({ path: path.join(__dirname, '.env.local') });
}
// Finally, try .env.pipecat if it exists
if (fs.existsSync(path.join(__dirname, '.env.pipecat'))) {
  dotenv.config({ path: path.join(__dirname, '.env.pipecat') });
}

// Use credentials from environment or parent project's .env.local
if (!process.env.DAILY_API_KEY) {
  // Try to load from parent project's .env.local if it exists
  if (fs.existsSync(path.join(__dirname, '..', '.env.local'))) {
    console.log('Loading Daily.co credentials from parent project .env.local');
    require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
  }
  
  // If we still don't have the API key, use a fallback from .env.daily
  if (!process.env.DAILY_API_KEY && process.env.DAILY_API_KEY_FALLBACK) {
    console.log('Using fallback Daily.co credentials');
    process.env.DAILY_API_KEY = process.env.DAILY_API_KEY_FALLBACK;
  }
  
  // If we still don't have the API key, use the one from the parent project
  if (!process.env.DAILY_API_KEY && process.env.PIPECAT_API_KEY) {
    console.log('Using PIPECAT_API_KEY as Daily.co API key');
    process.env.DAILY_API_KEY = process.env.PIPECAT_API_KEY;
  }
  
  // Final fallback - use the value from .env.local
  if (!process.env.DAILY_API_KEY) {
    console.log('Setting Daily.co credentials from .env.local');
    process.env.DAILY_API_KEY = 'b352b6173857ead633c09f16e8ba35d9ff9bd6a7bff7bd8d84f609331e671541';
  }
}

const app = express();
// Force port 3003 (different from LiveKit service which uses 3002)
const PORT = 3003;

// Apply request logging middleware
app.use(requestLogger);

// Parse JSON bodies
app.use(express.json());

// Configure CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:56616', 'http://127.0.0.1:57105', '*'];

app.use(cors({
  origin: '*', // Allow all origins for development
  credentials: true
}));

// Health check endpoint (no auth required)
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    service: 'daily-token-service',
    timestamp: new Date().toISOString()
  });
});

// Apply API key authentication to protected routes
app.use('/api', apiKeyAuth, dailyRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(`Error [${req.requestId || 'unknown'}]: ${err.message}`);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      status: err.status || 500
    }
  });
});

// Print environment variables for debugging (but mask sensitive values)
console.log('Environment check:');
console.log('DAILY_API_KEY:', process.env.DAILY_API_KEY ? 'is set' : 'not set');
console.log('GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? 'is set' : 'not set');

// Start the server
app.listen(PORT, () => {
  console.log(`Daily Token Service running on port ${PORT} [${process.env.NODE_ENV || 'development'} mode]`);
});
