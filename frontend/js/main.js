// main.js - Complete rewrite with all features

document.addEventListener('DOMContentLoaded', () => {
  const API_URL = 'http://localhost:3001/api'; // Replace with your server URL if different

  // --- CHECK FOR SEARCH PARAMETERS FROM OFFERS PAGE ---
  const flightSearchForm = document.getElementById('flightSearchForm');
  if (flightSearchForm) {
    // Check if there are search parameters in session storage
    const searchOrigin = sessionStorage.getItem('searchOrigin');
    const searchDestination = sessionStorage.getItem('searchDestination');
    const searchDepartureDate = sessionStorage.getItem('searchDepartureDate');
    
    // If parameters exist, populate the search form
    if (searchOrigin && searchDestination && searchDepartureDate) {
      document.getElementById('origin').value = searchOrigin;
      document.getElementById('destination').value = searchDestination;
      document.getElementById('departureDate').value = searchDepartureDate;
      
      // Clear the session storage
      sessionStorage.removeItem('searchOrigin');
      sessionStorage.removeItem('searchDestination');
      sessionStorage.removeItem('searchDepartureDate');
      
      // Submit the form automatically after a short delay to ensure DOM is ready
      setTimeout(() => {
        flightSearchForm.dispatchEvent(new Event('submit'));
      }, 500);
    }
  }

  // --- FLIGHT SEARCH FORM ---
  if (flightSearchForm) {
    flightSearchForm.addEventListener('submit', async (e) => {
      e.preventDefault();
  
      try {
        const origin = document.getElementById('origin').value;
        const destination = document.getElementById('destination').value;
        const departureDate = document.getElementById('departureDate').value;
        const adults = document.getElementById('adults').value;
        
        // Show loading state
        const flightsContainer = document.getElementById('flightsContainer');
        flightsContainer.innerHTML = '<p>Searching for flights...</p>';
        
        // Clear hotels container and show loading
        const hotelsContainer = document.getElementById('hotelsContainer');
        if (hotelsContainer) hotelsContainer.innerHTML = '<p>Searching for hotels at destination...</p>';
        
        // 1. Call the flight search API
        const flightResponse = await fetch(`${API_URL}/flights/search`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            origin,
            destination,
            departureDate,
            adults
          })
        });
  
        const flightData = await flightResponse.json();
  
        if (flightResponse.ok) {
          // Display flight results
          displayFlightResults(flightData.data, flightsContainer);
        } else {
          console.error('Search flights error:', flightData.error);
          flightsContainer.innerHTML = `<p>Error: ${flightData.error || 'Failed to search flights'}</p>`;
        }
        
        // 2. Call the hotel search API for the destination city
        try {
          const hotelResponse = await fetch(`${API_URL}/hotels/search`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              cityCode: destination, // Use the destination as the city code for hotel search
              radius: 20, // 20km radius
              radiusUnit: 'KM',
              hotelSource: 'ALL'
            })
          });
          
          const hotelData = await hotelResponse.json();
          
          if (hotelResponse.ok) {
            // Display hotel results
            displayHotelResults(hotelData.data, hotelsContainer);
          } else {
            console.error('Search hotels error:', hotelData.error);
            hotelsContainer.innerHTML = `<p>Error: ${hotelData.error || 'Failed to search hotels'}</p>`;
          }
        } catch (hotelError) {
          console.error('Hotel search error:', hotelError);
          hotelsContainer.innerHTML = '<p>Error searching for hotels. Please try again.</p>';
        }
        
      } catch (error) {
        console.error('Flight search error:', error);
        document.getElementById('flightsContainer').innerHTML = 
          '<p>Error searching flights. Please try again.</p>';
      }
    });
  }

  // --- FLIGHT BOOKING FORM ---
  const bookingForm = document.getElementById('bookingForm');
  if (bookingForm) {
    // Load offer details if available
    const selectedOfferJson = sessionStorage.getItem('selectedOffer');
    if (selectedOfferJson) {
      try {
        const selectedOffer = JSON.parse(selectedOfferJson);
        displaySelectedOffer(selectedOffer);
      } catch (error) {
        console.error('Error loading selected offer:', error);
      }
    }
    
    bookingForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      try {
        // Get flight offer from session storage
        const selectedOfferJson = sessionStorage.getItem('selectedOffer');
        if (!selectedOfferJson) {
          alert('No flight selected. Please go back and select a flight.');
          return;
        }
        
        const selectedOffer = JSON.parse(selectedOfferJson);
        const firstName = document.getElementById('firstName').value.toUpperCase();
        const lastName = document.getElementById('lastName').value.toUpperCase();
        const email = document.getElementById('emailBooking').value;
        const phone = document.getElementById('phone').value;
        
        // Create booking request
        const bookingData = {
          flightOffer: selectedOffer.rawData,
          travelers: [
            {
              id: "1",
              dateOfBirth: "1990-01-01", // In a real app, you'd collect this
              name: {
                firstName: firstName,
                lastName: lastName
              },
              gender: "MALE", // In a real app, you'd collect this
              contact: {
                emailAddress: email,
                phones: [
                  {
                    deviceType: "MOBILE",
                    countryCallingCode: "1",
                    number: phone
                  }
                ]
              }
            }
          ],
          contacts: [
            {
              addresseeName: {
                firstName: firstName,
                lastName: lastName
              },
              purpose: "STANDARD",
              phones: [
                {
                  deviceType: "MOBILE",
                  countryCallingCode: "1",
                  number: phone
                }
              ],
              emailAddress: email,
              address: {
                lines: ["123 Main St"], // In a real app, you'd collect this
                postalCode: "10001",
                cityName: "New York",
                countryCode: "US"
              }
            }
          ]
        };
        
        // Call the booking API
        const response = await fetch(`${API_URL}/flights/booking`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(bookingData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
          // Get existing bookings array or create new one
          const existingBookings = JSON.parse(sessionStorage.getItem('bookingReferences') || '[]');
          
          // Add new booking to array
          existingBookings.push({
            id: data.data.id,
            type: 'flight',
            date: new Date().toISOString(),
            passengerFirstName: firstName,
            passengerLastName: lastName,
            origin: selectedOffer.itineraries[0].segments[0].departure.airport,
            destination: selectedOffer.itineraries[0].segments[selectedOffer.itineraries[0].segments.length-1].arrival.airport
          });
          
          // Save updated bookings array
          sessionStorage.setItem('bookingReferences', JSON.stringify(existingBookings));
          
          alert('Booking successful! Your booking reference is: ' + data.data.id);
          window.location.href = 'profile.html'; // Navigate to profile/bookings page
        } else {
          console.error('Booking error:', data.error);
          alert(`Error: ${data.error || 'Failed to create booking'}`);
        }
      } catch (error) {
        console.error('Booking error:', error);
        alert('An error occurred during booking. Please try again.');
      }
    });
  }

  // --- HOTEL BOOKING FORM ---
  const hotelBookingForm = document.getElementById('hotelBookingForm');
  if (hotelBookingForm) {
    // Load hotel offer details if available
    const selectedHotelOfferJson = sessionStorage.getItem('selectedHotelOffer');
    if (selectedHotelOfferJson) {
      try {
        const selectedHotelOffer = JSON.parse(selectedHotelOfferJson);
        displaySelectedHotelOffer(selectedHotelOffer);
      } catch (error) {
        console.error('Error loading selected hotel offer:', error);
      }
    }
    
    hotelBookingForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      try {
        // Get hotel offer from session storage
        const selectedHotelOfferJson = sessionStorage.getItem('selectedHotelOffer');
        if (!selectedHotelOfferJson) {
          alert('No hotel selected. Please go back and select a hotel.');
          return;
        }
        
        const selectedHotelOffer = JSON.parse(selectedHotelOfferJson);
        const firstName = document.getElementById('firstName').value.toUpperCase();
        const lastName = document.getElementById('lastName').value.toUpperCase();
        const email = document.getElementById('emailBooking').value;
        const phone = document.getElementById('phone').value;
        
        // Create booking request
        const bookingData = {
          offerId: selectedHotelOffer.offer.id,
          guests: [
            {
              tid: "1",
              title: "MR",
              firstName: firstName,
              lastName: lastName,
              email: email,
              phone: phone
            }
          ],
          payment: {
            method: "creditCard",
            paymentCard: {
              vendorCode: "VI",
              paymentCardInfo: {
                vendorCode: "VI",
                cardNumber: "4111111111111111",
                expiryDate: "2030-01"
              }
            }
          }
        };
        
        // Call the booking API
        const response = await fetch(`${API_URL}/hotels/booking`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(bookingData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
          // Get existing bookings array or create new one
          const existingBookings = JSON.parse(sessionStorage.getItem('bookingReferences') || '[]');
          
          // Add new booking to array
          existingBookings.push({
            id: data.data.id,
            type: 'hotel',
            date: new Date().toISOString(),
            passengerFirstName: firstName,
            passengerLastName: lastName,
            hotelName: selectedHotelOffer.hotel.name,
            checkIn: selectedHotelOffer.offer.dates.checkIn,
            checkOut: selectedHotelOffer.offer.dates.checkOut
          });
          
          // Save updated bookings array
          sessionStorage.setItem('bookingReferences', JSON.stringify(existingBookings));
          
          alert('Hotel booking successful! Your booking reference is: ' + data.data.id);
          window.location.href = 'profile.html'; // Navigate to profile/bookings page
        } else {
          console.error('Hotel booking error:', data.error);
          alert(`Error: ${data.error || 'Failed to create hotel booking'}`);
        }
      } catch (error) {
        console.error('Hotel booking error:', error);
        alert('An error occurred during hotel booking. Please try again.');
      }
    });
  }

  // --- LOAD BOOKINGS (for profile.html) ---
  const bookingsList = document.getElementById('bookingsList');
  if (bookingsList) {
    // Load user bookings
    loadUserBookings();
  }

  // --- HELPER FUNCTIONS ---

  // Display flight search results
  function displayFlightResults(flights, container) {
    container.innerHTML = '';
    
    if (!flights || flights.length === 0) {
      container.innerHTML = '<p>No flights found for your search criteria.</p>';
      return;
    }
    
    flights.forEach((flight, index) => {
      const card = document.createElement('div');
      card.className = 'card';
      
      // Create segments HTML
      let segments = '';
      flight.itineraries[0].segments.forEach(segment => {
        const departureTime = new Date(segment.departure.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const arrivalTime = new Date(segment.arrival.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        segments += `
          <div class="segment">
            <p><strong>${segment.departure.airport} → ${segment.arrival.airport}</strong></p>
            <p>${departureTime} - ${arrivalTime}</p>
            <p>${segment.carrierName} ${segment.flightNumber}</p>
          </div>
        `;
      });
      
      card.innerHTML = `
        <h3>${flight.airline.name}</h3>
        <div class="flight-details">
          ${segments}
        </div>
        <p class="price">${flight.price.total} ${flight.price.currency}</p>
        <button class="btn-primary select-flight" data-index="${index}">Select</button>
      `;
      
      container.appendChild(card);
      
      // Add click event to Select button
      card.querySelector('.select-flight').addEventListener('click', () => {
        selectFlight(flight);
      });
    });
  }
  
  // Display hotel search results
  function displayHotelResults(hotels, container) {
    container.innerHTML = '';
    
    if (!hotels || hotels.length === 0) {
      container.innerHTML = '<p>No hotels found for your destination.</p>';
      return;
    }
    
    hotels.forEach((hotel, index) => {
      const card = document.createElement('div');
      card.className = 'card';
      
      // Create hotel info HTML
      let addressText = 'Address information not available';
      if (hotel.location && hotel.location.address) {
        const address = hotel.location.address;
        const addressParts = [];
        
        if (address.lines) addressParts.push(address.lines.join(', '));
        if (address.cityName) addressParts.push(address.cityName);
        if (address.countryCode) addressParts.push(address.countryCode);
        
        if (addressParts.length > 0) {
          addressText = addressParts.join(', ');
        }
      }
      
      card.innerHTML = `
        <h3>${hotel.name}</h3>
        <div class="hotel-details">
          <p>${addressText}</p>
          ${hotel.chainCode ? `<p>Chain: ${hotel.chainCode}</p>` : ''}
        </div>
        <button class="btn-primary view-hotel-details" data-id="${hotel.id}">View Rates</button>
      `;
      
      container.appendChild(card);
      
      // Add click event to View Rates button
      card.querySelector('.view-hotel-details').addEventListener('click', () => {
        // Store hotel ID in session storage
        sessionStorage.setItem('selectedHotelId', hotel.id);
        sessionStorage.setItem('selectedHotelName', hotel.name);
        // Get hotel offers in a modal
        getHotelOffers(hotel.id);
      });
    });
  }
  
  // Get hotel offers and display in modal
  async function getHotelOffers(hotelId) {
    try {
      // Show loading modal or indicator
      const loadingModal = document.createElement('div');
      loadingModal.className = 'loading-modal';
      loadingModal.innerHTML = '<div class="loading-content"><p>Loading hotel offers...</p></div>';
      document.body.appendChild(loadingModal);
      
      // Get tomorrow's date in YYYY-MM-DD format
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const checkInDate = tomorrow.toISOString().split('T')[0];
      
      // Get checkout date (day after tomorrow)
      const checkoutDate = new Date();
      checkoutDate.setDate(checkoutDate.getDate() + 2);
      const checkOutDate = checkoutDate.toISOString().split('T')[0];
      
      // Call the hotel offers API
      const response = await fetch(`${API_URL}/hotels/offers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          hotelIds: [hotelId],
          adults: '2',
          checkInDate: checkInDate,
          checkOutDate: checkOutDate,
          roomQuantity: '1',
          currency: 'EUR',
          bestRateOnly: true
        })
      });
      
      const data = await response.json();
      
      // Remove loading modal
      document.body.removeChild(loadingModal);
      
      if (response.ok && data.data && data.data.length > 0) {
        // Display hotel offers in a modal
        displayHotelOffersModal(data.data[0]);
      } else {
        alert('No offers available for this hotel or failed to retrieve offers.');
      }
    } catch (error) {
      console.error('Error getting hotel offers:', error);
      alert('Failed to retrieve hotel offers. Please try again.');
      // Remove loading modal if it exists
      const loadingModal = document.querySelector('.loading-modal');
      if (loadingModal) document.body.removeChild(loadingModal);
    }
  }
  
  // Display hotel offers in modal
  function displayHotelOffersModal(hotelWithOffers) {
    // Create modal container
    const modal = document.createElement('div');
    modal.className = 'modal';
    
    // Create modal content
    let offersList = '';
    
    if (hotelWithOffers.offers && hotelWithOffers.offers.length > 0) {
      hotelWithOffers.offers.forEach((offer, index) => {
        offersList += `
          <div class="offer-item">
            <h4>${offer.room.type || 'Standard Room'}</h4>
            <p>${offer.room.description || 'No description available'}</p>
            <p><strong>Price:</strong> ${offer.price.total} ${offer.price.currency}</p>
            <p><strong>Check-in:</strong> ${offer.dates.checkIn} | <strong>Check-out:</strong> ${offer.dates.checkOut}</p>
            <button class="btn-primary select-hotel-offer" data-index="${index}">Select</button>
          </div>
        `;
      });
    } else {
      offersList = '<p>No offers available for this hotel.</p>';
    }
    
    modal.innerHTML = `
      <div class="modal-content">
        <span class="close">&times;</span>
        <h3>${hotelWithOffers.hotel.name} - Available Rates</h3>
        <div class="offers-list">
          ${offersList}
        </div>
      </div>
    `;
    
    // Add modal to body
    document.body.appendChild(modal);
    
    // Show modal
    setTimeout(() => {
      modal.style.display = 'flex';
    }, 10);
    
    // Close button functionality
    modal.querySelector('.close').addEventListener('click', () => {
      modal.style.display = 'none';
      // Remove modal after animation
      setTimeout(() => {
        document.body.removeChild(modal);
      }, 300);
    });
    
    // Select offer buttons
    const selectButtons = modal.querySelectorAll('.select-hotel-offer');
    selectButtons.forEach(button => {
      button.addEventListener('click', () => {
        const offerIndex = button.getAttribute('data-index');
        const selectedOffer = hotelWithOffers.offers[offerIndex];
        
        // Store selected offer in session storage
        sessionStorage.setItem('selectedHotelOffer', JSON.stringify({
          hotel: hotelWithOffers.hotel,
          offer: selectedOffer
        }));
        
        // Close modal
        modal.style.display = 'none';
        setTimeout(() => {
          document.body.removeChild(modal);
        }, 300);
        
        // Redirect to hotel booking page
        window.location.href = 'hotel-booking.html';
      });
    });
  }
  
  // Select flight for booking
  function selectFlight(flight) {
    // Store selected flight in session storage
    sessionStorage.setItem('selectedOffer', JSON.stringify(flight));
    // Redirect to booking page
    window.location.href = 'booking.html';
  }
  
  // Display selected flight offer in booking page
  function displaySelectedOffer(offer) {
    const selectedOfferSection = document.querySelector('.selected-offer');
    if (!selectedOfferSection) return;
    
    const cardContent = selectedOfferSection.querySelector('.card-content');
    if (!cardContent) return;
    
    // Create offer details
    let offerDetails = `<p><strong>Flight Details:</strong></p>`;
    
    // Add airline
    offerDetails += `<p>Airline: ${offer.airline.name}</p>`;
    
    // Add itinerary details
    offer.itineraries[0].segments.forEach(segment => {
      const departureTime = new Date(segment.departure.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const arrivalTime = new Date(segment.arrival.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const departureDate = new Date(segment.departure.time).toLocaleDateString();
      
      offerDetails += `
        <p>${segment.departure.airport} → ${segment.arrival.airport}</p>
        <p>${departureDate}, ${departureTime} - ${arrivalTime}</p>
        <p>Flight: ${segment.carrierName} ${segment.flightNumber}</p>
      `;
    });
    
    // Add price
    offerDetails += `<p><strong>Price: ${offer.price.total} ${offer.price.currency}</strong></p>`;
    
    // Update the card content
    cardContent.innerHTML = offerDetails;
  }
  
  // Display selected hotel offer in booking page
  function displaySelectedHotelOffer(data) {
    const selectedOfferSection = document.querySelector('.selected-hotel-offer');
    if (!selectedOfferSection) return;
    
    const cardContent = selectedOfferSection.querySelector('.card-content');
    if (!cardContent) return;
    
    const hotel = data.hotel;
    const offer = data.offer;
    
    // Create offer details
    let offerDetails = `<p><strong>Hotel Details:</strong></p>`;
    
    // Add hotel info
    offerDetails += `<p>Hotel: ${hotel.name}</p>`;
    
    // Add room details
    offerDetails += `
      <p>Room Type: ${offer.room.type || 'Standard Room'}</p>
      <p>Description: ${offer.room.description || 'No description available'}</p>
      <p>Check-in: ${offer.dates.checkIn} | Check-out: ${offer.dates.checkOut}</p>
    `;
    
    // Add price
    offerDetails += `<p><strong>Price: ${offer.price.total} ${offer.price.currency}</strong></p>`;
    
    // Update the card content
    cardContent.innerHTML = offerDetails;
  }
  
  // Load user bookings in profile page
  async function loadUserBookings() {
    // Get bookings array from sessionStorage
    const bookingReferences = JSON.parse(sessionStorage.getItem('bookingReferences') || '[]');
    
    if (bookingReferences.length === 0) {
      bookingsList.innerHTML = '<p>No bookings found.</p>';
      return;
    }
    
    try {
      // Show loading state
      bookingsList.innerHTML = '<p>Loading your bookings...</p>';
      
      // Initialize empty container
      bookingsList.innerHTML = '';
      
      // Process each booking
      for (const booking of bookingReferences) {
        try {
          // Build URL with passenger info
          let url = `${API_URL}/${booking.type === 'hotel' ? 'hotels' : 'flights'}/booking/${booking.id}`;
          if (booking.passengerFirstName && booking.passengerLastName) {
            url += `?firstName=${encodeURIComponent(booking.passengerFirstName)}&lastName=${encodeURIComponent(booking.passengerLastName)}`;
          }
          
          // Call the API to get booking details
          const response = await fetch(url);
          const data = await response.json();
          
          if (response.ok) {
            // Create and append booking card
            displayBooking(data.data, booking);
          } else {
            console.error(`Error loading booking ${booking.id}:`, data.error);
            // Create error card for this specific booking
            const errorCard = document.createElement('div');
            errorCard.className = 'booking-card error';
            errorCard.innerHTML = `
              <h3>Booking Reference: ${booking.id}</h3>
              <p>Error loading booking details. Please try again later.</p>
            `;
            bookingsList.appendChild(errorCard);
          }
        } catch (error) {
          console.error(`Error processing booking ${booking.id}:`, error);
          // Create error card for this specific booking
          const errorCard = document.createElement('div');
          errorCard.className = 'booking-card error';
          errorCard.innerHTML = `
            <h3>Booking Reference: ${booking.id}</h3>
            <p>Error loading booking details. Please try again later.</p>
          `;
          bookingsList.appendChild(errorCard);
        }
      }
      
      // If no bookings were successfully displayed
      if (bookingsList.children.length === 0) {
        bookingsList.innerHTML = '<p>Error loading your bookings. Please try again.</p>';
      }
    } catch (error) {
      console.error('Error loading bookings:', error);
      bookingsList.innerHTML = '<p>Error loading your bookings. Please try again.</p>';
    }
  }
  
  // Display individual booking in profile page
  function displayBooking(booking, bookingInfo) {
    if (!booking) {
      return;
    }
    
    const bookingCard = document.createElement('div');
    bookingCard.className = 'booking-card';
    
    if (bookingInfo.type === 'flight') {
      // Flight booking display
      // Extract flight info
      let flightInfo = '';
      if (booking.flightOffers && booking.flightOffers[0].itineraries) {
        booking.flightOffers[0].itineraries.forEach((itinerary, index) => {
          itinerary.segments.forEach(segment => {
            const departureDate = new Date(segment.departure.at).toLocaleDateString();
            const departureTime = new Date(segment.departure.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const arrivalTime = new Date(segment.arrival.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            flightInfo += `
              <div class="booking-segment">
                <p><strong>${segment.departure.iataCode} → ${segment.arrival.iataCode}</strong></p>
                <p>${departureDate}, ${departureTime} - ${arrivalTime}</p>
                <p>Flight: ${segment.carrierCode}${segment.number}</p>
              </div>
            `;
          });
        });
      }
      
      // Extract traveler info
      let travelerInfo = '';
      if (booking.travelers && booking.travelers.length > 0) {
        booking.travelers.forEach(traveler => {
          travelerInfo += `
            <div class="traveler">
              <p><strong>Passenger:</strong> ${traveler.name.firstName} ${traveler.name.lastName}</p>
            </div>
          `;
        });
      } else if (bookingInfo.passengerFirstName && bookingInfo.passengerLastName) {
        // Use passenger info from booking reference if API doesn't provide it
        travelerInfo = `
          <div class="traveler">
            <p><strong>Passenger:</strong> ${bookingInfo.passengerFirstName} ${bookingInfo.passengerLastName}</p>
          </div>
        `;
      }
      
      bookingCard.innerHTML = `
        <h3>Flight Booking: ${booking.id}</h3>
        <div class="booking-details">
          <h4>Flight Details</h4>
          ${flightInfo}
          <h4>Passenger Information</h4>
          ${travelerInfo}
        </div>
        <button class="btn-primary cancel-booking" data-id="${booking.id}" data-type="flight">Cancel Booking</button>
      `;
    } else if (bookingInfo.type === 'hotel') {
      // Hotel booking display
      const hotel = booking.hotel || {};
      const roomDetails = booking.roomDetails || {};
      
      bookingCard.innerHTML = `
        <h3>Hotel Booking: ${booking.id}</h3>
        <div class="booking-details">
          <h4>Hotel Details</h4>
          <div class="booking-segment">
            <p><strong>${hotel.name || bookingInfo.hotelName || 'Hotel'}</strong></p>
            <p>${hotel.address ? hotel.address.lines.join(', ') + ', ' + hotel.address.cityName : 'Address not available'}</p>
          </div>
          <h4>Stay Details</h4>
          <div class="booking-segment">
            <p><strong>Room:</strong> ${roomDetails.type || 'Standard Room'}</p>
            <p><strong>Check-in:</strong> ${roomDetails.checkInDate || bookingInfo.checkIn || 'Not specified'}</p>
            <p><strong>Check-out:</strong> ${roomDetails.checkOutDate || bookingInfo.checkOut || 'Not specified'}</p>
            <p><strong>Guest:</strong> ${bookingInfo.passengerFirstName} ${bookingInfo.passengerLastName}</p>
          </div>
        </div>
        <button class="btn-primary cancel-booking" data-id="${booking.id}" data-type="hotel">Cancel Booking</button>
      `;
    }
    
    bookingsList.appendChild(bookingCard);
    
    // Add event listener to cancel button
    bookingCard.querySelector('.cancel-booking').addEventListener('click', async (e) => {
      const id = e.target.getAttribute('data-id');
      const bookingType = e.target.getAttribute('data-type');
      
      if (confirm(`Are you sure you want to cancel this ${bookingType} booking?`)) {
        try {
          const endpoint = bookingType === 'hotel' ? 'hotels' : 'flights';
          const response = await fetch(`${API_URL}/${endpoint}/booking/${id}`, {
            method: 'DELETE'
          });
          
          if (response.ok) {
            alert(`${bookingType.charAt(0).toUpperCase() + bookingType.slice(1)} booking cancelled successfully!`);
            
            // Remove booking from sessionStorage array
            const bookingReferences = JSON.parse(sessionStorage.getItem('bookingReferences') || '[]');
            const updatedBookings = bookingReferences.filter(b => b.id !== id);
            sessionStorage.setItem('bookingReferences', JSON.stringify(updatedBookings));
            
            // Reload bookings
            loadUserBookings();
          } else {
            const data = await response.json();
            alert(`Error: ${data.error || `Failed to cancel ${bookingType} booking`}`);
          }
        } catch (error) {
          console.error(`Error cancelling ${bookingType} booking:`, error);
          alert(`An error occurred while cancelling ${bookingType} booking. Please try again.`);
        }
      }
    });
  }
});