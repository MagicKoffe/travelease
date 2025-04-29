// controllers/flightController.js
const axios = require('axios');
const { getAccessToken } = require('../utils/amadeusAuth');

// Search for flights
exports.searchFlights = async (req, res) => {
  try {
    const { origin, destination, departureDate, adults, returnDate, travelClass } = req.body;
    
    // Validate required parameters
    if (!origin || !destination || !departureDate || !adults) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    // Get Amadeus access token
    const token = await getAccessToken();
    
    // Build search parameters
    const searchParams = {
      originLocationCode: origin,
      destinationLocationCode: destination,
      departureDate: departureDate,
      adults: parseInt(adults),
      currencyCode: 'EUR',
      max: 20
    };
    
    // Add optional parameters if provided
    if (returnDate) searchParams.returnDate = returnDate;
    if (travelClass) searchParams.travelClass = travelClass;
    
    // Build query string
    const queryParams = new URLSearchParams();
    Object.entries(searchParams).forEach(([key, value]) => {
      queryParams.append(key, value);
    });
    
    // Make the request to Amadeus API
    const response = await axios.get(
      `https://test.api.amadeus.com/v2/shopping/flight-offers?${queryParams.toString()}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    // Process the flights data before sending to frontend
    const processedFlights = processFlightsData(response.data);
    
    res.json(processedFlights);
  } catch (error) {
    console.error('Error searching flights:', error);
    
    // Handle specific API errors
    if (error.response && error.response.data) {
      return res.status(error.response.status).json(error.response.data);
    }
    
    res.status(500).json({ error: 'Failed to search for flights' });
  }
};

// Helper function to process flights data for the frontend
function processFlightsData(flightOffersResponse) {
  const { data: flightOffers, dictionaries } = flightOffersResponse;
  
  if (!flightOffers || flightOffers.length === 0) {
    return { 
      status: 'success',
      resultCount: 0,
      data: []
    };
  }
  
  const processedOffers = flightOffers.map(offer => {
    return {
      id: offer.id,
      price: {
        total: offer.price.total,
        currency: offer.price.currency
      },
      airline: {
        code: offer.validatingAirlineCodes[0],
        name: dictionaries.carriers[offer.validatingAirlineCodes[0]] || 'Unknown'
      },
      itineraries: offer.itineraries.map(itinerary => ({
        duration: itinerary.duration,
        segments: itinerary.segments.map(segment => ({
          departure: {
            airport: segment.departure.iataCode,
            time: segment.departure.at
          },
          arrival: {
            airport: segment.arrival.iataCode,
            time: segment.arrival.at
          },
          carrierCode: segment.carrierCode,
          carrierName: dictionaries.carriers[segment.carrierCode] || segment.carrierCode,
          flightNumber: segment.number,
          aircraft: dictionaries.aircraft[segment.aircraft.code] || segment.aircraft.code,
          duration: segment.duration
        }))
      })),
      fareDetails: {
        lastTicketingDate: offer.lastTicketingDate,
        availableSeats: offer.numberOfBookableSeats,
        cabinClass: offer.travelerPricings[0].fareDetailsBySegment[0].cabin || 'Economy',
        baggage: offer.travelerPricings[0].fareDetailsBySegment[0].includedCheckedBags || {}
      },
      rawData: offer // Include raw data for further processing if needed
    };
  });
  
  return {
    status: 'success',
    resultCount: processedOffers.length,
    data: processedOffers
  };
}

// Check flight price
exports.checkFlightPrice = async (req, res) => {
  try {
    const { flightOffer } = req.body;
    
    if (!flightOffer) {
      return res.status(400).json({ error: 'Flight offer is required' });
    }
    
    // Get Amadeus access token
    const token = await getAccessToken();
    
    // Prepare request body
    const requestBody = {
      data: {
        type: "flight-offers-pricing",
        flightOffers: [flightOffer]
      }
    };
    
    // Make the request
    const response = await axios.post(
      'https://test.api.amadeus.com/v1/shopping/flight-offers/pricing',
      requestBody,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    // Process and send the response
    res.json({
      status: 'success',
      data: response.data
    });
  } catch (error) {
    console.error('Error checking flight price:', error);
    
    if (error.response && error.response.data) {
      return res.status(error.response.status).json(error.response.data);
    }
    
    res.status(500).json({ error: 'Failed to check flight price' });
  }
};

// Create flight booking
exports.createBooking = async (req, res) => {
  try {
    const { flightOffer, travelers, contacts } = req.body;
    
    if (!flightOffer || !travelers || !contacts) {
      return res.status(400).json({ error: 'Missing required booking information' });
    }
    
    // Get Amadeus access token
    const token = await getAccessToken();
    
    // Prepare request body
    const requestBody = {
      data: {
        type: "flight-order",
        flightOffers: [flightOffer],
        travelers: travelers,
        remarks: {
          general: [
            {
              subType: "GENERAL_MISCELLANEOUS",
              text: "Booking created through TravelEase Application"
            }
          ]
        },
        ticketingAgreement: {
          option: "DELAY_TO_CANCEL",
          delay: "6D"
        },
        contacts: contacts
      }
    };
    
    try {
      // Try to make the actual API request
      console.log('Attempting to create booking with Amadeus API...');
      const response = await axios.post(
        'https://test.api.amadeus.com/v1/booking/flight-orders',
        requestBody,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      // If successful, return the actual response
      res.json({
        status: 'success',
        data: response.data
      });
      
    } catch (apiError) {
      console.error('Amadeus API Error:', apiError.message);
      
      // Generate a demo booking reference - this is a fallback for the test environment
      const demoBookingId = 'DEMO-' + Math.random().toString(36).substring(2, 10).toUpperCase();
      
      // Extract flight details from the request for the demo response
      const flightDetails = extractFlightDetails(flightOffer);
      const travelerDetails = travelers.map(traveler => ({
        id: traveler.id,
        name: traveler.name,
        contact: traveler.contact
      }));
      
      // Create a demo booking response similar to what Amadeus would return
      const demoResponse = {
        data: {
          type: 'flight-order',
          id: demoBookingId,
          associatedRecords: [
            {
              reference: 'PNR' + Math.random().toString(36).substring(2, 8).toUpperCase(),
              creationDate: new Date().toISOString(),
              originSystemCode: flightOffer.validatingAirlineCodes ? flightOffer.validatingAirlineCodes[0] : 'DEMO'
            }
          ],
          flightOffers: [flightOffer],
          travelers: travelerDetails,
          contacts: contacts
        }
      };
      
      // Log the fallback response
      console.log('Using demo booking response due to Amadeus test environment limitations');
      
      // Return the demo response
      res.json({
        status: 'warning',
        message: 'This is a demo booking created because the Amadeus test environment has limitations. In a production environment, a real booking would be created.',
        data: demoResponse.data
      });
    }
  } catch (error) {
    console.error('Error creating booking:', error);
    
    if (error.response && error.response.data) {
      return res.status(error.response.status).json(error.response.data);
    }
    
    res.status(500).json({ error: 'Failed to create booking' });
  }
};

// Helper function to extract flight details for demo response
function extractFlightDetails(flightOffer) {
  const details = {
    price: flightOffer.price,
    itineraries: []
  };
  
  if (flightOffer.itineraries) {
    flightOffer.itineraries.forEach(itinerary => {
      const segments = [];
      
      if (itinerary.segments) {
        itinerary.segments.forEach(segment => {
          segments.push({
            departure: segment.departure,
            arrival: segment.arrival,
            carrierCode: segment.carrierCode,
            number: segment.number
          });
        });
      }
      
      details.itineraries.push({
        duration: itinerary.duration,
        segments: segments
      });
    });
  }
  
  return details;
}

// Get booking details
exports.getBookingDetails = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ error: 'Booking ID is required' });
    }
    
    // For demo bookings (from our fallback), return a simulated response
    if (id.startsWith('DEMO-')) {
      // Create a demo booking response
      const demoResponse = {
        data: {
          type: 'flight-order',
          id: id,
          associatedRecords: [
            {
              reference: 'PNR' + id.substring(5, 11),
              creationDate: new Date().toISOString(),
              originSystemCode: 'DEMO'
            }
          ],
          flightOffers: [
            {
              id: '1',
              itineraries: [
                {
                  segments: [
                    {
                      departure: {
                        iataCode: 'LPL',
                        at: new Date().toISOString()
                      },
                      arrival: {
                        iataCode: 'ALC',
                        at: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString()
                      },
                      carrierCode: 'EI',
                      number: '574'
                    }
                  ]
                }
              ],
              price: {
                currency: 'EUR',
                total: '450.00'
              }
            }
          ],
          travelers: [
            {
              id: '1',
              name: {
                firstName: 'DEMO',
                lastName: 'USER'
              }
            }
          ]
        }
      };
      
      return res.json({
        status: 'warning',
        message: 'This is a demo booking. In a production environment, real booking details would be retrieved.',
        data: demoResponse.data
      });
    }
    
    // Get Amadeus access token
    const token = await getAccessToken();
    
    // Make the request
    const response = await axios.get(
      `https://test.api.amadeus.com/v1/booking/flight-orders/${id}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    // Process and send the response
    res.json({
      status: 'success',
      data: response.data
    });
  } catch (error) {
    console.error('Error retrieving booking details:', error);
    
    if (error.response && error.response.data) {
      return res.status(error.response.status).json(error.response.data);
    }
    
    res.status(500).json({ error: 'Failed to retrieve booking details' });
  }
};

// Cancel booking
exports.cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ error: 'Booking ID is required' });
    }
    
    // For demo bookings, return a simulated successful cancellation
    if (id.startsWith('DEMO-')) {
      return res.json({
        status: 'warning',
        message: 'This is a demo cancellation. In a production environment, a real booking would be cancelled.',
        success: true
      });
    }
    
    // Get Amadeus access token
    const token = await getAccessToken();
    
    // Make the request
    await axios.delete(
      `https://test.api.amadeus.com/v1/booking/flight-orders/${id}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    // A successful cancellation returns 204 No Content
    res.status(200).json({
      status: 'success',
      message: 'Booking cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling booking:', error);
    
    if (error.response && error.response.data) {
      return res.status(error.response.status).json(error.response.data);
    }
    
    res.status(500).json({ error: 'Failed to cancel booking' });
  }
};

// Get seat map
exports.getSeatMap = async (req, res) => {
  try {
    const { flightOffer } = req.body;
    
    if (!flightOffer) {
      return res.status(400).json({ error: 'Flight offer is required' });
    }
    
    // Get Amadeus access token
    const token = await getAccessToken();
    
    // Prepare request body
    const requestBody = {
      data: {
        type: "seatmap",
        flightOffers: [flightOffer]
      }
    };
    
    try {
      // Make the request
      const response = await axios.post(
        'https://test.api.amadeus.com/v1/shopping/seatmaps',
        requestBody,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      // Send the response
      res.json({
        status: 'success',
        data: response.data
      });
    } catch (apiError) {
      console.error('Error retrieving seat map from API:', apiError.message);
      
      // Generate demo seat map data
      const demoSeatMapData = generateDemoSeatMap(flightOffer);
      
      // Return demo data
      res.json({
        status: 'warning',
        message: 'Using demo seat map data due to API limitations',
        data: demoSeatMapData
      });
    }
  } catch (error) {
    console.error('Error retrieving seat map:', error);
    
    if (error.response && error.response.data) {
      return res.status(error.response.status).json(error.response.data);
    }
    
    res.status(500).json({ error: 'Failed to retrieve seat map' });
  }
};

// Helper function to generate demo seat map
function generateDemoSeatMap(flightOffer) {
  // Create a basic seat map structure
  const segment = flightOffer.itineraries[0].segments[0];
  
  return {
    data: [
      {
        id: '1',
        departure: {
          iataCode: segment.departure.iataCode,
          at: segment.departure.at
        },
        arrival: {
          iataCode: segment.arrival.iataCode,
          at: segment.arrival.at
        },
        carrierCode: segment.carrierCode,
        number: segment.number,
        aircraft: {
          code: segment.aircraft.code
        },
        availableSeatsCounters: [
          {
            travelerId: "1",
            value: 45
          }
        ],
        decks: [
          {
            deckType: "MAIN",
            deckConfiguration: {
              width: 7,
              length: 30,
              startRow: 1,
              endRow: 30
            },
            facilities: [
              {
                code: "LA",
                column: "A",
                row: "10",
                position: "REAR",
                coordinates: {
                  x: 1,
                  y: 10
                }
              }
            ],
            seats: generateDemoSeats()
          }
        ]
      }
    ],
    dictionaries: {
      seatCharacteristics: {
        "CH": "Chargeable seat",
        "W": "Window seat",
        "A": "Aisle seat",
        "E": "Exit row seat",
        "L": "Leg space seat",
        "1": "Restricted recline seat",
        "U": "Seat suitable for unaccompanied minors"
      }
    }
  };
}

// Add this function to controllers/flightController.js

exports.getFlightDeals = async (req, res) => {
    try {
      // Get origin from query params or use default (e.g., MAD for Madrid)
      const origin = req.query.origin || 'MAD';
      
      // Calculate a date 30 days from now for departure date
      const today = new Date();
      const futureDate = new Date(today);
      futureDate.setDate(today.getDate() + 30);
      const departureDate = futureDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD
      
      // Get Amadeus access token
      const token = await getAccessToken();
      
      // Make request to Amadeus Flight Destinations API
      const response = await axios.get(
        `https://test.api.amadeus.com/v1/shopping/flight-destinations?origin=${origin}&departureDate=${departureDate}&oneWay=true&nonStop=false&viewBy=DATE`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      // Process the API response to format it for the frontend
      const flightDeals = processFlightDeals(response.data);
      
      res.json({
        status: 'success',
        data: flightDeals
      });
    } catch (error) {
      console.error('Error fetching flight deals:', error);
      
      // If API fails, return demo data to ensure frontend works
      const demoFlightDeals = generateDemoFlightDeals();
      
      res.json({
        status: 'warning',
        message: 'Using demo data due to API limitations in test environment',
        data: demoFlightDeals
      });
    }
  };
  
  // Helper function to process flight deals data
  function processFlightDeals(apiResponse) {
    const { data: destinations, dictionaries } = apiResponse;
    
    if (!destinations || destinations.length === 0) {
      return [];
    }
    
    // Create a mapping of city names for each destination
    const cityNameMap = {
      'AMS': 'Amsterdam',
      'BKK': 'Bangkok',
      'CUN': 'Cancun',
      'FCO': 'Rome',
      'JFK': 'New York',
      'LAX': 'Los Angeles',
      'LHR': 'London',
      'LIS': 'Lisbon',
      'LPA': 'Gran Canaria',
      'MAD': 'Madrid',
      'MIA': 'Miami',
      'MXP': 'Milan',
      'OPO': 'Porto',
      'ORY': 'Paris',
      'PMI': 'Mallorca',
      'RAK': 'Marrakesh'
    };
    
    // Map image URLs for each destination
    const imageMap = {
      'Amsterdam': 'amsterdam.jpg',
      'Bangkok': 'bangkok.jpg',
      'Cancun': 'cancun.jpg',
      'Rome': 'rome.jpg',
      'New York': 'newyork.jpg',
      'Los Angeles': 'losangeles.jpg',
      'London': 'london.jpg',
      'Lisbon': 'lisbon.jpg',
      'Gran Canaria': 'grancanaria.jpg',
      'Madrid': 'madrid.jpg',
      'Miami': 'miami.jpg',
      'Milan': 'milan.jpg',
      'Porto': 'porto.jpg',
      'Paris': 'paris.jpg',
      'Mallorca': 'mallorca.jpg',
      'Marrakesh': 'marrakesh.jpg',
      // Default image if no match is found
      'default': 'flight-placeholder.jpg'
    };
    
    // Process each destination and format it for frontend use
    return destinations.map(destination => {
      const airportCode = destination.destination;
      const detailedName = dictionaries.locations[airportCode]?.detailedName || '';
      const cityName = cityNameMap[airportCode] || detailedName || airportCode;
      const imageUrl = imageMap[cityName] || imageMap.default;
      
      return {
        destination: airportCode,
        cityName: cityName,
        imageUrl: imageUrl,
        price: destination.price.total,
        currency: apiResponse.meta.currency || 'EUR',
        departureDate: destination.departureDate
      };
    }).sort((a, b) => parseFloat(a.price) - parseFloat(b.price)); // Sort by price ascending
  }
  
  // Fallback function to generate demo flight deals
  function generateDemoFlightDeals() {
    return [
      {
        destination: 'PAR',
        cityName: 'Paris',
        imageUrl: 'paris.jpg',
        price: '199',
        currency: 'EUR',
        departureDate: '2025-05-15'
      },
      {
        destination: 'NYC',
        cityName: 'New York',
        imageUrl: 'newyork.jpg',
        price: '299',
        currency: 'EUR',
        departureDate: '2025-05-15'
      },
      {
        destination: 'TYO',
        cityName: 'Tokyo',
        imageUrl: 'tokyo.jpg',
        price: '399',
        currency: 'EUR',
        departureDate: '2025-05-15'
      },
      {
        destination: 'ROM',
        cityName: 'Rome',
        imageUrl: 'rome.jpg',
        price: '149',
        currency: 'EUR',
        departureDate: '2025-05-15'
      },
      {
        destination: 'DXB',
        cityName: 'Dubai',
        imageUrl: 'dubai.jpg',
        price: '349',
        currency: 'EUR',
        departureDate: '2025-05-15'
      }
    ];
  }

function generateDemoSeats() {
  const seats = [];
  
  // Generate seats for a typical aircraft (30 rows, 6 seats per row: A, B, C, D, E, F)
  for (let row = 1; row <= 30; row++) {
    for (let col = 0; col < 6; col++) {
      // Skip middle seat in some rows to simulate aisles or missing seats
      if ((col === 3 && row > 12) || (row === 15 && col > 3)) continue;
      
      const colLetter = String.fromCharCode(65 + col); // A=65, B=66, etc.
      const seatNumber = `${row}${colLetter}`;
      
      // Determine seat characteristics based on position
      const characteristicsCodes = [];
      
      // Window seats
      if (col === 0 || col === 5) {
        characteristicsCodes.push("W");
      }
      
      // Aisle seats
      if (col === 2 || col === 3) {
        characteristicsCodes.push("A");
      }
      
      // Exit row
      if (row === 14) {
        characteristicsCodes.push("E");
        characteristicsCodes.push("L");
      }
      
      // Some chargeable seats (first few rows, exit rows, etc.)
      if (row < 5 || row === 14 || (col < 3 && row > 25)) {
        characteristicsCodes.push("CH");
      }
      
      // Determine availability (make ~70% of seats available)
      const availability = Math.random() < 0.7 ? "AVAILABLE" : "OCCUPIED";
      
      // Create price for chargeable seats
      const price = characteristicsCodes.includes("CH") ? {
        total: ((row < 5) ? "25.00" : "15.00"),
        currency: "EUR"
      } : null;
      
      // Add the seat
      seats.push({
        cabin: "ECONOMY",
        number: seatNumber,
        characteristicsCodes: characteristicsCodes,
        coordinates: {
          x: row,
          y: col
        },
        travelerPricing: [
          {
            travelerId: "1",
            seatAvailabilityStatus: availability,
            price: price
          }
        ]
      });
    }
  }
  
  return seats;
}