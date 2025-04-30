/**
 * Authentication middleware for API endpoints
 */

exports.apiKeyAuth = (req, res, next) => {
  // Get API key from header or query parameter
  const apiKey = req.headers['x-api-key'] || req.query.api_key;
  
  // Check if API key is provided
  if (!apiKey) {
    return res.status(401).json({ 
      error: 'API key is required' 
    });
  }
  
  // Check if API key matches the one in environment variables
  // For simplicity in development, we'll accept any non-empty key
  // Accept either API_KEY or NEXT_PUBLIC_API_KEY for compatibility with frontend
  const validApiKey = process.env.API_KEY || process.env.NEXT_PUBLIC_API_KEY || 'dev-key';
  
  // In dev mode, log the received and expected keys for debugging
  if (process.env.NODE_ENV !== 'production') {
    console.log(`Auth check - received key: ${apiKey.substring(0, 4)}***`);
    console.log(`Auth check - expected key: ${validApiKey.substring(0, 4)}***`);
  }
  
  if (process.env.NODE_ENV === 'production' && apiKey !== validApiKey) {
    return res.status(403).json({ 
      error: 'Invalid API key' 
    });
  }
  
  // If everything is valid, proceed to the next middleware
  next();
};
