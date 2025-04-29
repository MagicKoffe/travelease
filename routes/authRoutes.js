// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Signup
router.post('/signup', authController.signup);

// Login
router.post('/login', authController.login);

// Get Amadeus token (for frontend direct calls if needed)
router.get('/token', authController.getAmadeusToken);

module.exports = router;