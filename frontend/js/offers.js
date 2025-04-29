// js/offers.js - Complete rewrite to fix flickering

document.addEventListener('DOMContentLoaded', () => {
    const API_URL = 'http://localhost:3001/api';
    const offersGrid = document.getElementById('offersGrid');
    const originSelect = document.getElementById('originSelect');
    
    // Track current origin and request state
    let currentOrigin = originSelect ? originSelect.value : 'MAD';
    let currentRequest = null;
    let cachedDeals = {};
    
    // Create and add a loading overlay that's separate from the main content
    const loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'loading-overlay';
    loadingOverlay.innerHTML = '<div class="loading-spinner">Loading deals...</div>';
    loadingOverlay.style.display = 'none';
    document.body.appendChild(loadingOverlay);
    
    // Function to load flight deals from the API
    async function loadFlightDeals(origin) {
        // Don't reload if deals for this origin are already cached
        if (cachedDeals[origin]) {
            displayFlightDeals(cachedDeals[origin]);
            return;
        }
        
        // Cancel any ongoing requests
        if (currentRequest) {
            currentRequest.abort = true;
        }
        
        // Create a new request context
        const requestContext = { abort: false };
        currentRequest = requestContext;
        
        try {
            // Show loading overlay
            loadingOverlay.style.display = 'flex';
            
            // Fetch data from API
            const response = await fetch(`${API_URL}/flights/deals?origin=${origin}`);
            
            // If this request was aborted while waiting, just return
            if (requestContext.abort) return;
            
            const data = await response.json();
            
            // If this request was aborted while parsing, just return
            if (requestContext.abort) return;
            
            if (response.ok) {
                // Cache the results
                cachedDeals[origin] = data.data;
                // Display only if this is still the current origin
                if (origin === currentOrigin) {
                    displayFlightDeals(data.data);
                }
            } else {
                console.error('Error loading flight deals:', data.error);
                if (origin === currentOrigin) {
                    showErrorMessage('Error loading flight deals. Please try again.');
                }
            }
        } catch (error) {
            console.error('Error fetching flight deals:', error);
            if (origin === currentOrigin && !requestContext.abort) {
                showErrorMessage('Error connecting to server. Please try again later.');
            }
        } finally {
            // Hide loading overlay if this is the current request
            if (currentRequest === requestContext) {
                loadingOverlay.style.display = 'none';
                currentRequest = null;
            }
        }
    }
    
    // Function to show error message
    function showErrorMessage(message) {
        // Create entire grid content at once to avoid multiple reflows
        offersGrid.innerHTML = `<p class="error-message">${message}</p>`;
    }
    
    // Function to display flight deals in the grid
    function displayFlightDeals(deals) {
        if (!deals || deals.length === 0) {
            offersGrid.innerHTML = `<p class="no-deals">No flight deals available at this time.</p>`;
            return;
        }
        
        // Build all HTML content at once to avoid multiple DOM updates
        let gridHTML = '';
        
        // Get top deals (maximum 10)
        const topDeals = deals.slice(0, 10);
        
        // Create a card for each deal
        topDeals.forEach(deal => {
            // Format price with currency symbol
            const formattedPrice = formatPrice(deal.price, deal.currency);
            const formattedDate = formatDate(deal.departureDate);
            
            // Build card HTML
            gridHTML += `
                <div class="offer-card">
                    <img src="images/${deal.imageUrl}" alt="Flight to ${deal.cityName}" onerror="this.src='images/flight-placeholder.jpg'">
                    <h3>${deal.cityName}</h3>
                    <p>From ${formattedPrice}</p>
                    <p class="departure-date">Departure: ${formattedDate}</p>
                    <button class="btn-primary search-flight" data-origin="${currentOrigin}" data-destination="${deal.destination}" data-date="${deal.departureDate}">Search Flights</button>
                </div>
            `;
        });
        
        // Replace all content at once
        offersGrid.innerHTML = gridHTML;
        
        // Add event listeners after content is in the DOM
        document.querySelectorAll('.search-flight').forEach(button => {
            button.addEventListener('click', (e) => {
                const origin = e.target.getAttribute('data-origin');
                const destination = e.target.getAttribute('data-destination');
                const departureDate = e.target.getAttribute('data-date');
                redirectToSearch(origin, destination, departureDate);
            });
        });
    }
    
    // Format price with currency symbol
    function formatPrice(price, currency) {
        // Default currency is EUR
        let symbol = '€';
        
        // Map currency codes to symbols
        if (currency === 'USD') symbol = '$';
        if (currency === 'GBP') symbol = '£';
        
        // Round to 2 decimal places
        const numericPrice = parseFloat(price).toFixed(2);
        
        return `${symbol}${numericPrice}`;
    }
    
    // Format date for display
    function formatDate(dateString) {
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    }
    
    // Redirect to search page with prepopulated fields
    function redirectToSearch(origin, destination, departureDate) {
        // Store search parameters in session storage
        sessionStorage.setItem('searchOrigin', origin);
        sessionStorage.setItem('searchDestination', destination);
        sessionStorage.setItem('searchDepartureDate', departureDate);
        
        // Redirect to search page
        window.location.href = 'search.html';
    }
    
    // Add change event listener to origin selector
    if (originSelect) {
        originSelect.addEventListener('change', (e) => {
            // Update current origin
            currentOrigin = e.target.value;
            
            // Load new flight deals for the selected origin
            loadFlightDeals(currentOrigin);
        });
    }
    
    // Load flight deals for initial origin
    loadFlightDeals(currentOrigin);
});