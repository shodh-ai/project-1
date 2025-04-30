"use strict";

// Print environment variables for debugging
console.log('=== Environment Variables ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('DAILY_API_KEY exists:', !!process.env.DAILY_API_KEY);
console.log('DAILY_API_KEY starts with:', process.env.DAILY_API_KEY?.substring(0, 5));
console.log('DAILY_DOMAIN:', process.env.DAILY_DOMAIN);
console.log('DAILY_SAMPLE_ROOM_URL:', process.env.DAILY_SAMPLE_ROOM_URL);
console.log('API_KEY exists:', !!process.env.API_KEY);
console.log('NEXT_PUBLIC_API_KEY exists:', !!process.env.NEXT_PUBLIC_API_KEY);
console.log('=== End Environment Variables ===');
