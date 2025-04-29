// controllers/authController.js
const { getAccessToken } = require('../utils/amadeusAuth');

// User signup
exports.signup = async (req, res) => {
  try {
    const { first_name, last_name, email, phone_number, password } = req.body;
    
    if (!first_name || !last_name || !email || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // In a real implementation, this would store the user in a database
    // For this example, we'll simulate successful registration
    
    res.json({
      status: 'success',
      message: 'User registered successfully',
      user: {
        first_name,
        last_name,
        email,
        phone_number
      }
    });
  } catch (error) {
    console.error('Error during signup:', error);
    res.status(500).json({ error: 'Failed to create user account' });
  }
};

// User login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    // In a real implementation, this would validate against a database
    // For this example, we'll simulate successful login
    
    res.json({
      status: 'success',
      message: 'Login successful',
      user: {
        id: 'user123',
        email: email,
        first_name: 'Test',
        last_name: 'User'
      },
      token: 'mock-jwt-token' // In a real app, this would be a JWT token
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
};

// Get Amadeus token
exports.getAmadeusToken = async (req, res) => {
  try {
    const token = await getAccessToken();
    
    res.json({
      status: 'success',
      token: token
    });
  } catch (error) {
    console.error('Error getting Amadeus token:', error);
    res.status(500).json({ error: 'Failed to get Amadeus token' });
  }
};