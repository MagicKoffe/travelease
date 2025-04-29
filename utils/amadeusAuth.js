// utils/amadeusAuth.js
const axios = require('axios');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Amadeus API credentials
const clientId = process.env.AMADEUS_CLIENT_ID || 'CpvPQzL7k1GKLJL1SZ9Q4Yv9PTUyVq';
const clientSecret = process.env.AMADEUS_CLIENT_SECRET || '4uaFa4uOivjoGVmr';

// Function to get Amadeus access token
async function getAccessToken() {
  try {
    // Create form data
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);
    
    // Make the request
    const response = await axios.post(
      'https://test.api.amadeus.com/v1/security/oauth2/token',
      params,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    return response.data.access_token;
  } catch (error) {
    console.error('Error getting access token:', error);
    throw new Error('Failed to get access token');
  }
}

module.exports = {
  getAccessToken
};