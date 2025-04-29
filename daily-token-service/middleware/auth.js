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
  const validApiKey = process.env.API_KEY || 'dev-key';
  
  if (process.env.NODE_ENV === 'production' && apiKey !== validApiKey) {
    return res.status(403).json({ 
      error: 'Invalid API key' 
    });
  }
  
  // If everything is valid, proceed to the next middleware
  next();
};
