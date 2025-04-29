/**
 * Request logging middleware
 */
const { v4: uuidv4 } = require('uuid');

exports.requestLogger = (req, res, next) => {
  // Generate a unique request ID
  req.requestId = uuidv4();
  
  // Log the request details
  console.log(`[${req.requestId}] ${req.method} ${req.originalUrl}`);
  
  // Calculate request processing time
  const start = Date.now();
  
  // Capture response finish event
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${req.requestId}] Response: ${res.statusCode} (${duration}ms)`);
  });
  
  // Pass control to the next middleware
  next();
};
