// routes/hotelRoutes.js
const express = require('express');
const router = express.Router();
const hotelController = require('../controllers/hotelController');

// Search hotels by city
router.post('/search', hotelController.searchHotels);

// Get hotel offers
router.post('/offers', hotelController.getHotelOffers);

// Get detailed hotel offer
router.get('/offers/:id', hotelController.getHotelOfferDetails);

// Create hotel booking
router.post('/booking', hotelController.createHotelBooking);

module.exports = router;