// hotel-booking.js
document.addEventListener('DOMContentLoaded', () => {
    const API_URL = 'http://localhost:3001/api';
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
          
          // Create booking request
          const bookingData = {
            offerId: selectedHotelOffer.offer.id,
            guests: [
              {
                tid: "1",
                title: "MR",
                firstName: document.getElementById('firstName').value.toUpperCase(),
                lastName: document.getElementById('lastName').value.toUpperCase(),
                email: document.getElementById('emailBooking').value,
                phone: document.getElementById('phone').value
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
              passengerFirstName: document.getElementById('firstName').value.toUpperCase(),
              passengerLastName: document.getElementById('lastName').value.toUpperCase(),
              hotelName: selectedHotelOffer.hotel.name
            });
            
            // Save updated bookings array
            sessionStorage.setItem('bookingReferences', JSON.stringify(existingBookings));
            
            alert('Hotel booking successful! Your booking reference is: ' + data.data.id);
            window.location.href = 'profile.html'; // Navigate to profile/bookings page
          } else {
            console.error('Booking error:', data.error);
            alert(`Error: ${data.error || 'Failed to create hotel booking'}`);
          }
        } catch (error) {
          console.error('Hotel booking error:', error);
          alert('An error occurred during hotel booking. Please try again.');
        }
      });
    }
    
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
  });