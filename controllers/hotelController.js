// controllers/hotelController.js
const axios = require('axios');
const { getAccessToken } = require('../utils/amadeusAuth');

// Search hotels by city
exports.searchHotels = async (req, res) => {
  try {
    const { cityCode, radius, radiusUnit, amenities, ratings, hotelSource, chainCodes } = req.body;
    
    if (!cityCode) {
      return res.status(400).json({ error: 'City code is required' });
    }
    
    // Get Amadeus access token
    const token = await getAccessToken();
    
    // Build query params
    const queryParams = new URLSearchParams();
    queryParams.append('cityCode', cityCode);
    
    // Add optional parameters if provided
    if (radius) queryParams.append('radius', radius);
    if (radiusUnit) queryParams.append('radiusUnit', radiusUnit);
    if (hotelSource) queryParams.append('hotelSource', hotelSource);
    
    // Add array parameters
    if (amenities && amenities.length > 0) {
      amenities.forEach(amenity => queryParams.append('amenities', amenity));
    }
    
    if (ratings && ratings.length > 0) {
      ratings.forEach(rating => queryParams.append('ratings', rating));
    }
    
    if (chainCodes && chainCodes.length > 0) {
      chainCodes.forEach(code => queryParams.append('chainCodes', code));
    }
    
    // Make the request
    const response = await axios.get(
      `https://test.api.amadeus.com/v1/reference-data/locations/hotels/by-city?${queryParams.toString()}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    // Process hotel data for frontend
    const processedHotels = processHotelData(response.data);
    
    res.json(processedHotels);
  } catch (error) {
    console.error('Error searching hotels:', error);
    
    if (error.response && error.response.data) {
      return res.status(error.response.status).json(error.response.data);
    }
    
    res.status(500).json({ error: 'Failed to search for hotels' });
  }
};

// Helper function to process hotel data
function processHotelData(hotelListResponse) {
  const { data: hotels } = hotelListResponse;
  
  if (!hotels || hotels.length === 0) {
    return {
      status: 'success',
      resultCount: 0,
      data: []
    };
  }
  
  const processedHotels = hotels.map(hotel => {
    return {
      id: hotel.hotelId,
      name: hotel.name,
      chainCode: hotel.chainCode,
      location: {
        coordinates: hotel.geoCode || {},
        address: hotel.address || {},
        cityCode: hotel.cityCode,
        distance: hotel.distance || {}
      }
    };
  });
  
  return {
    status: 'success',
    resultCount: processedHotels.length,
    data: processedHotels
  };
}

// Get hotel offers
exports.getHotelOffers = async (req, res) => {
  try {
    const { 
      hotelIds, adults, checkInDate, checkOutDate, roomQuantity,
      priceRange, currency, paymentPolicy, boardType, bestRateOnly
    } = req.body;
    
    if (!hotelIds || !Array.isArray(hotelIds) || hotelIds.length === 0) {
      return res.status(400).json({ error: 'At least one hotel ID is required' });
    }
    
    // Get Amadeus access token
    const token = await getAccessToken();
    
    // Build query params
    const queryParams = new URLSearchParams();
    
    // Add each hotel ID
    hotelIds.forEach(id => queryParams.append('hotelIds', id));
    
    // Add required parameters
    queryParams.append('adults', adults || '1');
    queryParams.append('checkInDate', checkInDate || new Date().toISOString().split('T')[0]);
    
    // Add optional parameters
    if (checkOutDate) queryParams.append('checkOutDate', checkOutDate);
    if (roomQuantity) queryParams.append('roomQuantity', roomQuantity);
    if (priceRange) queryParams.append('priceRange', priceRange);
    if (currency) queryParams.append('currency', currency);
    if (paymentPolicy) queryParams.append('paymentPolicy', paymentPolicy);
    if (boardType) queryParams.append('boardType', boardType);
    if (bestRateOnly !== undefined) queryParams.append('bestRateOnly', bestRateOnly);
    
    try {
      // Make the request
      const response = await axios.get(
        `https://test.api.amadeus.com/v3/shopping/hotel-offers?${queryParams.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      // Process hotel offers for frontend
      const processedOffers = processHotelOffers(response.data);
      
      res.json(processedOffers);
    } catch (apiError) {
      console.error('Amadeus API Error:', apiError.message);
      
      // If the API returns an error, use fallback demo data
      // This is only for the test environment to ensure the frontend can still work
      const fallbackData = generateFallbackHotelOffers(hotelIds[0]);
      
      // Send fallback data with a warning message
      res.json({
        status: 'warning',
        message: 'Using demo data due to API limitations in test environment',
        resultCount: fallbackData.length,
        data: fallbackData
      });
    }
  } catch (error) {
    console.error('Error getting hotel offers:', error);
    
    // Always use fallback data in case of errors
    const fallbackData = generateFallbackHotelOffers(req.body.hotelIds[0]);
    
    res.json({
      status: 'warning',
      message: 'Using demo data due to API error',
      resultCount: fallbackData.length,
      data: fallbackData
    });
  }
};

// Generate fallback hotel offers data for testing
function generateFallbackHotelOffers(hotelId) {
  // Get tomorrow's date
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const checkInDate = tomorrow.toISOString().split('T')[0];
  
  // Get checkout date (day after tomorrow)
  const checkoutDate = new Date();
  checkoutDate.setDate(checkoutDate.getDate() + 2);
  const checkOutDate = checkoutDate.toISOString().split('T')[0];
  
  return [{
    hotel: {
      id: hotelId || 'DEMO_HOTEL_1',
      name: 'Demo Hotel',
      chainCode: 'DM'
    },
    available: true,
    offers: [
      {
        id: 'DEMO_OFFER_1',
        room: {
          type: 'Standard Double Room',
          description: 'Comfortable standard room with a double bed, private bathroom and all essential amenities.'
        },
        price: {
          total: '99.00',
          currency: 'EUR',
          averagePerNight: '99.00'
        },
        dates: {
          checkIn: checkInDate,
          checkOut: checkOutDate
        },
        policies: {
          paymentType: 'GUARANTEE',
          cancellation: 'Free cancellation up to 24 hours before check-in'
        }
      },
      {
        id: 'DEMO_OFFER_2',
        room: {
          type: 'Deluxe Room with Sea View',
          description: 'Spacious deluxe room featuring premium amenities and a beautiful sea view from a private balcony.'
        },
        price: {
          total: '159.00',
          currency: 'EUR',
          averagePerNight: '159.00'
        },
        dates: {
          checkIn: checkInDate,
          checkOut: checkOutDate
        },
        policies: {
          paymentType: 'GUARANTEE',
          cancellation: 'Free cancellation up to 48 hours before check-in'
        }
      },
      {
        id: 'DEMO_OFFER_3',
        room: {
          type: 'Executive Suite',
          description: 'Luxury suite with separate living area, king-size bed, premium bathroom with bathtub, and exclusive access to the executive lounge.'
        },
        price: {
          total: '249.00',
          currency: 'EUR',
          averagePerNight: '249.00'
        },
        dates: {
          checkIn: checkInDate,
          checkOut: checkOutDate
        },
        policies: {
          paymentType: 'GUARANTEE',
          cancellation: 'Non-refundable'
        }
      }
    ]
  }];
}

// Helper function to process hotel offers
function processHotelOffers(hotelOffersResponse) {
  const { data: hotels } = hotelOffersResponse;
  
  if (!hotels || hotels.length === 0) {
    return {
      status: 'success',
      resultCount: 0,
      data: []
    };
  }
  
  const processedHotels = hotels.map(hotelData => {
    // Skip unavailable hotels
    if (!hotelData.available || !hotelData.offers || hotelData.offers.length === 0) {
      return null;
    }
    
    // Process hotel data
    return {
      hotel: {
        id: hotelData.hotel.hotelId,
        name: hotelData.hotel.name,
        chainCode: hotelData.hotel.chainCode,
        cityCode: hotelData.hotel.cityCode
      },
      available: hotelData.available,
      offers: hotelData.offers.map(offer => ({
        id: offer.id,
        room: {
          type: offer.room?.typeEstimated?.category || offer.room?.type || 'Standard Room',
          beds: offer.room?.typeEstimated?.beds,
          bedType: offer.room?.typeEstimated?.bedType,
          description: offer.room?.description?.text
        },
        price: {
          total: offer.price?.total,
          currency: offer.price?.currency,
          averagePerNight: offer.price?.variations?.average?.base
        },
        dates: {
          checkIn: offer.checkInDate,
          checkOut: offer.checkOutDate
        },
        policies: {
          paymentType: offer.policies?.paymentType,
          cancellation: offer.policies?.cancellation?.description?.text
        }
      }))
    };
  }).filter(Boolean); // Remove null entries (unavailable hotels)
  
  return {
    status: 'success',
    resultCount: processedHotels.length,
    data: processedHotels
  };
}

// Get detailed hotel offer
exports.getHotelOfferDetails = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ error: 'Offer ID is required' });
    }
    
    // For demo purposes, if the ID starts with DEMO_, return fallback data
    if (id.startsWith('DEMO_')) {
      const fallbackOffer = {
        data: {
          hotel: {
            name: 'Demo Hotel',
            hotelId: 'DEMO_HOTEL_1',
            chainCode: 'DM'
          },
          offers: [
            {
              id: id,
              room: {
                type: id === 'DEMO_OFFER_1' ? 'Standard Double Room' : 
                     id === 'DEMO_OFFER_2' ? 'Deluxe Room with Sea View' : 'Executive Suite',
                description: {
                  text: id === 'DEMO_OFFER_1' ? 'Comfortable standard room with a double bed, private bathroom and all essential amenities.' : 
                         id === 'DEMO_OFFER_2' ? 'Spacious deluxe room featuring premium amenities and a beautiful sea view from a private balcony.' : 
                         'Luxury suite with separate living area, king-size bed, premium bathroom with bathtub, and exclusive access to the executive lounge.'
                }
              },
              price: {
                total: id === 'DEMO_OFFER_1' ? '99.00' : 
                      id === 'DEMO_OFFER_2' ? '159.00' : '249.00',
                currency: 'EUR',
                base: id === 'DEMO_OFFER_1' ? '89.00' : 
                      id === 'DEMO_OFFER_2' ? '139.00' : '219.00'
              },
              checkInDate: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0],
              checkOutDate: new Date(new Date().setDate(new Date().getDate() + 2)).toISOString().split('T')[0],
              policies: {
                paymentType: 'GUARANTEE',
                cancellation: {
                  description: {
                    text: id === 'DEMO_OFFER_1' ? 'Free cancellation up to 24 hours before check-in' : 
                          id === 'DEMO_OFFER_2' ? 'Free cancellation up to 48 hours before check-in' : 
                          'Non-refundable'
                  }
                }
              }
            }
          ]
        }
      };
      
      return res.json({
        status: 'warning',
        message: 'Using demo data due to API limitations in test environment',
        data: fallbackOffer.data
      });
    }
    
    // Get Amadeus access token
    const token = await getAccessToken();
    
    // Make the request
    const response = await axios.get(
      `https://test.api.amadeus.com/v3/shopping/hotel-offers/${id}`,
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
    console.error('Error getting hotel offer details:', error);
    
    // Generate fallback offer data for demo purposes
    const fallbackOffer = {
      data: {
        hotel: {
          name: 'Demo Hotel',
          hotelId: 'DEMO_HOTEL_1',
          chainCode: 'DM'
        },
        offers: [
          {
            id: 'DEMO_OFFER_1',
            room: {
              type: 'Standard Double Room',
              description: {
                text: 'Comfortable standard room with a double bed, private bathroom and all essential amenities.'
              }
            },
            price: {
              total: '99.00',
              currency: 'EUR',
              base: '89.00'
            },
            checkInDate: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0],
            checkOutDate: new Date(new Date().setDate(new Date().getDate() + 2)).toISOString().split('T')[0],
            policies: {
              paymentType: 'GUARANTEE',
              cancellation: {
                description: {
                  text: 'Free cancellation up to 24 hours before check-in'
                }
              }
            }
          }
        ]
      }
    };
    
    res.json({
      status: 'warning',
      message: 'Using demo data due to API error',
      data: fallbackOffer.data
    });
  }
};

// Create hotel booking
exports.createHotelBooking = async (req, res) => {
  try {
    const { offerId, guests, payment } = req.body;
    
    if (!offerId || !guests || !payment) {
      return res.status(400).json({ error: 'Missing required booking information' });
    }
    
    // For demo purposes, if the ID starts with DEMO_, return success response
    if (offerId.startsWith('DEMO_')) {
      // Create a demo booking confirmation
      const demoBooking = {
        id: 'DEMO_BOOKING_' + Math.floor(Math.random() * 10000),
        providerConfirmationStatus: 'CONFIRMED',
        associatedRecords: [
          {
            reference: 'DEMO' + Math.floor(Math.random() * 1000000),
            originSystemCode: 'GDS'
          }
        ],
        hotel: {
          name: 'Demo Hotel',
          hotelId: 'DEMO_HOTEL_1',
          address: {
            lines: ['123 Demo Street'],
            postalCode: '12345',
            cityName: 'Demo City',
            countryCode: 'ES'
          }
        },
        roomDetails: {
          type: offerId === 'DEMO_OFFER_1' ? 'Standard Double Room' : 
                offerId === 'DEMO_OFFER_2' ? 'Deluxe Room with Sea View' : 'Executive Suite',
          description: 'Room description',
          checkInDate: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0],
          checkOutDate: new Date(new Date().setDate(new Date().getDate() + 2)).toISOString().split('T')[0],
          guests: guests.length
        },
        guests: guests.map(guest => ({
          name: {
            title: guest.title,
            firstName: guest.firstName,
            lastName: guest.lastName
          },
          contact: {
            phone: guest.phone,
            email: guest.email
          }
        })),
        payment: {
          method: payment.method,
          card: {
            type: payment.paymentCard.paymentCardInfo.vendorCode,
            number: 'XXXX-XXXX-XXXX-' + Math.floor(Math.random() * 10000)
          },
          amount: offerId === 'DEMO_OFFER_1' ? '99.00' : 
                 offerId === 'DEMO_OFFER_2' ? '159.00' : '249.00',
          currency: 'EUR'
        }
      };
      
      return res.json({
        status: 'success',
        message: 'Demo booking created successfully',
        data: demoBooking
      });
    }
    
    // Get Amadeus access token
    const token = await getAccessToken();
    
    // Prepare request body
    const requestBody = {
      data: {
        type: "hotel-order",
        guests: guests,
        travelAgent: {
          contact: {
            email: guests[0].email // Use the first guest's email as contact
          }
        },
        roomAssociations: [
          {
            guestReferences: guests.map(guest => ({
              guestReference: guest.tid.toString()
            })),
            hotelOfferId: offerId
          }
        ],
        payment: payment
      }
    };
    
    // Make the request
    const response = await axios.post(
      'https://test.api.amadeus.com/v1/booking/hotel-orders',
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
    console.error('Error creating hotel booking:', error);
    
    if (error.response && error.response.data) {
      return res.status(error.response.status).json(error.response.data);
    }
    
    res.status(500).json({ error: 'Failed to create hotel booking' });
  }
};