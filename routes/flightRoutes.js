// routes/flightRoutes.js
const express = require('express');
const router = express.Router();
const flightController = require('../controllers/flightController');

// Search flights
router.post('/search', flightController.searchFlights);

// Check flight price
router.post('/price', flightController.checkFlightPrice);

// Create booking
router.post('/booking', flightController.createBooking);

// Get booking details
router.get('/booking/:id', flightController.getBookingDetails);

// Cancel booking
router.delete('/booking/:id', flightController.cancelBooking);

// Get seat map
router.post('/seats', flightController.getSeatMap);

router.get('/deals', flightController.getFlightDeals);

module.exports = router;