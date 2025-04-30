const axios = require('axios');
const jwt = require('jsonwebtoken');

/**
 * Create or get a Daily.co room
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.createRoom = async (req, res, next) => {
  try {
    // Log incoming request for debugging
    console.log(`Create Room Request - Method: ${req.method}, Query:`, req.query, 'Headers:', Object.keys(req.headers));
    
    const { name } = req.query;
    const roomName = name || `room-${Date.now()}`;
    const dailyDomain = process.env.DAILY_DOMAIN || 'shodhai.daily.co';
    
    // Daily.co API endpoint for creating rooms
    const url = 'https://api.daily.co/v1/rooms';
    
    // Ensure we have the API key
    const apiKey = process.env.DAILY_API_KEY;
    if (!apiKey) {
      console.error('Daily API Key not configured');
      return res.status(500).json({ error: 'Daily API Key not configured' });
    }
    
    // For debugging API key issues
    console.log(`Using Daily API Key: ${apiKey.substring(0, 4)}***`);
    
    // Use predefined room for development or create a new one
    const dailySampleRoomUrl = process.env.DAILY_SAMPLE_ROOM_URL;
    if (process.env.NODE_ENV !== 'production' && dailySampleRoomUrl) {
      console.log(`Using sample room URL: ${dailySampleRoomUrl}`);
      // Extract room name from sample URL
      const sampleRoomName = dailySampleRoomUrl.split('/').pop();
      return res.status(200).json({
        room: {
          name: sampleRoomName,
          url: dailySampleRoomUrl
        },
        url: dailySampleRoomUrl
      });
    }
    
    // Make request to Daily.co API
    console.log(`Creating Daily.co room: ${roomName}`);
    const response = await axios.post(url, {
      name: roomName,
      properties: {
        enable_chat: true,
        enable_knocking: false,
        start_video_off: false,
        start_audio_off: false,
        max_participants: 10
      }
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    });
    
    console.log('Daily.co room created successfully');
    
    // Return the room details
    return res.status(200).json({
      room: response.data,
      url: response.data.url
    });
    
  } catch (error) {
    // Check if the error is from Daily.co API
    if (error.response) {
      // If room already exists, the error is 409 Conflict
      if (error.response.status === 409) {
        const roomName = req.query.name || `room-${Date.now()}`;
        const dailyDomain = process.env.DAILY_DOMAIN || 'shodhai.daily.co';
        
        return res.status(200).json({
          room: {
            name: roomName,
            url: `https://${dailyDomain}/${roomName}`
          },
          url: `https://${dailyDomain}/${roomName}`,
          note: 'Room already exists'
        });
      }
      
      return res.status(error.response.status).json({ 
        error: error.response.data 
      });
    }
    
    console.error('Error creating Daily.co room:', error);
    return next(error);
  }
};

/**
 * Generate a Daily.co meeting token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.generateToken = async (req, res, next) => {
  try {
    const { room, username } = req.query;
    
    // Input validation
    if (!room) {
      return res.status(400).json({ error: 'Missing "room" query parameter' });
    } else if (!username) {
      return res.status(400).json({ error: 'Missing "username" query parameter' });
    }
    
    // Ensure we have the API key
    const apiKey = process.env.DAILY_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Daily API Key not configured' });
    }
    
    // Create token for the room
    const url = `https://api.daily.co/v1/meeting-tokens`;
    
    const response = await axios.post(url, {
      properties: {
        room_name: room,
        user_name: username,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 // Token expires in 24 hours
      }
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    });
    
    // Log token generation (but not the actual token)
    console.log(`Daily.co token generated for user: ${username}, room: ${room}`);
    
    // Get the Daily domain from environment or use default
    const dailyDomain = process.env.DAILY_DOMAIN || 'shodhai.daily.co';
    
    // Return token and room URL
    return res.status(200).json({
      token: response.data.token,
      roomUrl: `https://${dailyDomain}/${room}`
    });
    
  } catch (error) {
    // Check if the error is from Daily.co API
    if (error.response) {
      return res.status(error.response.status).json({ 
        error: error.response.data 
      });
    }
    
    console.error('Error generating Daily.co token:', error);
    return next(error);
  }
};
