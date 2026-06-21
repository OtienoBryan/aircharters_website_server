const jwt = require('jsonwebtoken');
require('dotenv').config();

// Test token from your successful login
const testToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyXzE3NTI1MzMwNDI4MzRfbnN5ajRpcXlmIiwiZW1haWwiOiJ0ZXN0QGFpcmNoYXJ0ZXJzLmNvbSIsInBob25lIjpudWxsLCJ0eXBlIjoiYmFja2VuZCIsImlhdCI6MTc1MjUzMzA5MSwiZXhwIjoxNzUyNTM2NjkxfQ.OyXjsA0fQGvAG34jIhb8OxegDsBcQ9vRz9hM_JTmHNE";

console.log('🔍 Testing JWT token validation...');
console.log('JWT Secret:', process.env.JWT_SECRET);
console.log('Token:', testToken.substring(0, 50) + '...');

try {
  // Verify the token
  const decoded = jwt.verify(testToken, process.env.JWT_SECRET);
  console.log('✅ Token is valid!');
  console.log('Decoded payload:', JSON.stringify(decoded, null, 2));
  
  // Check if token is expired
  const now = Math.floor(Date.now() / 1000);
  const isExpired = decoded.exp < now;
  console.log('Current time:', now);
  console.log('Token expires at:', decoded.exp);
  console.log('Is expired:', isExpired);
  
  if (!isExpired) {
    console.log('✅ Token is not expired and should work for API calls');
  } else {
    console.log('❌ Token is expired');
  }
  
} catch (error) {
  console.error('❌ Token validation failed:', error.message);
} 