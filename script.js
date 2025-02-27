/**
 * Flavour Crusaders Restaurant Map Application
 * 
 * This script handles displaying restaurants on an interactive map.
 * It has two main parts:
 * 1. The RestaurantMap class - manages the map and markers
 * 2. The RestaurantManager class - handles restaurant data and filtering
 */

// ==================== MAP HANDLING ====================

/**
 * RestaurantMap class
 * This class manages everything related to the map display:
 * - Creating and initializing the map
 * - Adding restaurant markers to the map
 * - Handling map click events
 * - Making sure the map displays correctly when the window size changes
 */
class RestaurantMap {
    constructor() {
        // Store important data that we'll need later
        this.map = null;                // The actual map object (will be created in initialize)
        this.markers = [];              // List to hold all restaurant markers on the map
        this.tempMarker = null;         // Temporary marker when user clicks on map
        this.defaultView = [53.80111412096824, -1.5528727798052633]; // Default map center (coordinates)
        this.initialLoad = true;        // Flag to track if this is the first time loading markers
    }

    /**
     * Initialize the map when the page loads
     * This creates the map, adds the map tiles (the visual part), and sets up event handlers
     */
    initialize() {
        try {
            // Create a new map centered on the default location
            this.map = L.map('restaurantMap').setView(this.defaultView, 13);
            
            // Add the map tiles (the visual part of the map)
            // These come from OpenStreetMap, which is a free map service
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors'
            }).addTo(this.map);
            
            // Set up functions to handle user interactions
            this.setupClickHandler();    // What happens when someone clicks on the map
            this.setupResizeHandler();   // How to handle window resizing
            
            return true; // Return success
        } catch (error) {
            // If something goes wrong, log the error and return failure
            console.error('Error initializing map:', error);
            return false;
        }
    }

    /**
     * Handle map resize events
     * This ensures the map looks correct when the browser window changes size
     */
    setupResizeHandler() {
        // Adjust the map size initially
        this.adjustMapSize();
        
        // When the window resizes, adjust the map size again
        window.addEventListener('resize', () => this.adjustMapSize());

        // Also watch for other changes that might affect the map size
        const mapEl = document.getElementById('restaurantMap');
        if (mapEl) {
            // This creates a "watcher" that calls adjustMapSize when the map container changes
            const observer = new MutationObserver(() => this.adjustMapSize());
            observer.observe(mapEl, { attributes: true, childList: true, subtree: true });
        }
    }

    /**
     * Helper function to adjust map size and update marker view
     * We use requestAnimationFrame for smoother rendering
     */
    adjustMapSize() {
        // Use requestAnimationFrame for more efficient rendering
        requestAnimationFrame(() => {
            // Safety check: make sure the map exists
            if (!this.map) return;
            
            // Tell the map to recalculate its size
            this.map.invalidateSize();
        });
    }

    /**
     * Handle clicks on the map
     * This is used when a user wants to add a new restaurant (they click to select location)
     */
    setupClickHandler() {
        this.map.on('click', (e) => {
            // Look for input fields where we'll store latitude and longitude
            const latInput = document.getElementById('newLat');
            const lonInput = document.getElementById('newLon');
            
            // If the input fields don't exist, do nothing (they may not be on the page)
            if (!latInput || !lonInput) return;
            
            // Get the coordinates where the user clicked
            const lat = e.latlng.lat;
            const lng = e.latlng.lng;
            
            // Fill in the input fields with these coordinates (formatted to 6 decimal places)
            latInput.value = lat.toFixed(6);
            lonInput.value = lng.toFixed(6);
            
            // Remove any previous temporary marker
            if (this.tempMarker) {
                this.map.removeLayer(this.tempMarker);
            }
            
            // Add a new temporary marker at the clicked location
            this.tempMarker = L.marker([lat, lng], {
                icon: this.createPennantIcon('?', false)
            }).addTo(this.map);
        });
    }

    /**
     * Remove all markers from the map
     * Used when filtering restaurants or updating the display
     */
    clearMarkers() {
        if (this.markers.length === 0) return; // Don't do anything if there are no markers
        
        // For each marker in our list, remove it from the map
        this.markers.forEach(marker => this.map.removeLayer(marker));
        // Then clear the list
        this.markers = [];
        // Reset initial load flag when all markers are cleared
        this.initialLoad = true;
    }

    /**
     * Create a custom pennant-shaped marker icon
     * This makes a nice-looking flag marker with the restaurant's rating
     */
    createPennantIcon(rating, visited) {
        // Clone the pennant template from HTML
        const template = document.getElementById('pennantTemplate');
        const pennantContainer = template.content.cloneNode(true);
        
        // Get references to the elements we need to modify
        const mount = pennantContainer.querySelector('.pennant-mount');
        const flag = pennantContainer.querySelector('.pennant-flag');
        
        // Add appropriate classes based on visited status
        if (!visited) {
            mount.classList.add('pennant-mount-unvisited');
            flag.classList.add('pennant-flag-unvisited');
        }
        
        // Set the rating
        flag.textContent = rating || '?';
        
        // Convert the HTML to a string
        const tempDiv = document.createElement('div');
        tempDiv.appendChild(pennantContainer);
        const pennantHtml = tempDiv.innerHTML;

        // Create a Leaflet divIcon (a marker made with HTML/CSS instead of an image)
        return L.divIcon({
            className: 'custom-pennant',
            html: pennantHtml,
            iconSize: [40, 50],
            iconAnchor: [4, 50],
            popupAnchor: [16, -45]
        });
    }

    /**
     * Add a marker for a restaurant to the map
     * Creates a marker with the restaurant's info and returns it
     */
    addMarker(restaurant) {
        // Create HTML content for the popup with proper structure and styling
        const popupContent = document.createElement('div');
        popupContent.className = 'restaurant-popup';
        
        // Create header section
        const header = document.createElement('div');
        header.className = 'popup-header';
        
        // Add restaurant name
        const name = document.createElement('h3');
        name.className = 'popup-name';
        name.textContent = restaurant.name;
        header.appendChild(name);
        
        // Add address if available
        if (restaurant.address) {
            const address = document.createElement('div');
            address.className = 'popup-address';
            address.innerHTML = `<span class="popup-address-icon">📍</span> ${restaurant.address}`;
            header.appendChild(address);
        }
        
        // If the restaurant has been visited, add rating and review
        if (restaurant.visited && restaurant.rating) {
            // Add rating badge
            const rating = document.createElement('div');
            rating.className = 'popup-rating';
            rating.innerHTML = `${restaurant.rating} <span class="popup-rating-star">⭐</span>`;
            header.appendChild(rating);
            
            // Add header to content
            popupContent.appendChild(header);
            
            // Add review section if there is one
            if (restaurant.review && restaurant.review.trim()) {
                const review = document.createElement('div');
                review.className = 'popup-review';
                review.textContent = restaurant.review;
                popupContent.appendChild(review);
            }
        } else {
            // Add header to content
            popupContent.appendChild(header);
            
            // Show unvisited message
            const unvisited = document.createElement('div');
            unvisited.className = 'popup-unvisited';
            unvisited.textContent = 'Not yet visited';
            popupContent.appendChild(unvisited);
        }
        
        // Set popup options for maximum width - make it wider
        const popupOptions = {
            maxWidth: 400,
            className: 'restaurant-popup-container'
        };
        
        // Create a marker at the restaurant's location
        const marker = L.marker([restaurant.lat, restaurant.lon], {
            icon: this.createPennantIcon(restaurant.rating, restaurant.visited)
        })
        .addTo(this.map)  // Add it to the map
        .bindPopup(popupContent, popupOptions);  // Add popup with our custom content
        
        // Remember this marker for later
        this.markers.push(marker);
        return marker;
    }

    /**
     * Adjust the map view to fit all markers
     * This ensures all restaurants are visible on the map
     */
    fitBounds(bounds) {
        this.map.fitBounds(bounds, {
            padding: [50, 50],  // Add some padding around the bounds
            maxZoom: 15         // Don't zoom in too close
        });
    }

    /**
     * Center the map on all markers, but only if this is the initial load
     * This allows the map to center once when first loaded, but then lets the user freely navigate
     */
    centerMapIfNeeded(bounds) {
        // Only center if we have markers and this is the initial load
        if (this.initialLoad && this.markers.length > 0) {
            // Use requestAnimationFrame for smoother rendering
            requestAnimationFrame(() => {
                this.fitBounds(bounds);
                this.initialLoad = false;
            });
        }
    }
}

// ==================== RESTAURANT DATA HANDLING ====================

/**
 * RestaurantManager class
 * This class handles everything related to restaurant data:
 * - Loading restaurant data from a JSON file
 * - Filtering restaurants based on user input
 * - Creating and updating the restaurant list in the sidebar
 */
class RestaurantManager {
    constructor(map) {
        this.restaurants = [];          // Will store all restaurants from the JSON file
        this.filteredRestaurants = [];  // Will store filtered restaurants (based on search/filter)
        this.map = map;                 // Reference to the map object for adding markers
    }

    /**
     * Load restaurant data from a JSON file
     * This happens when the page first loads
     */
    async loadRestaurants() {
        try {
            // Try different paths to find the restaurant data
            // This handles both GitHub Pages and local development environments
            const paths = ['/flavour-crusaders/restaurants.json', './restaurants.json'];
            
            // Try each path until one works
            for (const path of paths) {
                try {
                    // Fetch is a web API for getting data from a URL
                    const response = await fetch(path);
                    if (response.ok) {
                        const data = await response.json();  // Convert JSON response to JavaScript object
                        this.restaurants = data.restaurants; // Store the restaurant list
                        
                        // Initial load - set all restaurants to be displayed
                        this.filteredRestaurants = this.restaurants;
                        this.updateDisplay();  // Force display update immediately
                        return;                // Success! We can exit
                    }
                } catch (err) {
                    // If this path fails, continue to the next one
                }
            }
            
            // If we get here, none of the paths worked
            throw new Error('Could not load restaurants from any source');
        } catch (error) {
            console.error("Error loading restaurants:", error);
            // Show error in the restaurant list area
            const listElement = document.getElementById('restaurantList');
            if (listElement) {
                listElement.innerHTML = '<div class="error-message">Failed to load restaurant data. Please try again later.</div>';
            }
        }
    }

    /**
     * Update the display with current restaurant data
     * This refreshes both the sidebar list and the map markers
     */
    updateDisplay() {
        // Get the HTML element where we'll put the restaurant list
        const listElement = document.getElementById('restaurantList');
        if (!listElement) return;  // Safety check
        
        // Clear the current list and map markers
        listElement.innerHTML = '';
        this.map.clearMarkers();

        // If there are no restaurants to display, show a message
        if (this.filteredRestaurants.length === 0) {
            const noResults = document.createElement('div');
            noResults.className = 'no-results';
            noResults.innerHTML = '<p>No restaurants match your criteria</p>';
            listElement.appendChild(noResults);
            return;
        }

        // Create a bounds object to help center the map
        const bounds = L.latLngBounds();
        
        // Split restaurants into visited and unvisited
        const visited = this.filteredRestaurants.filter(r => r.visited && r.rating);
        const unvisited = this.filteredRestaurants.filter(r => !r.visited || !r.rating);
        
        // Sort visited restaurants by rating (highest first)
        visited.sort((a, b) => b.rating - a.rating);

        // Use document fragment for more efficient DOM operations
        const fragment = document.createDocumentFragment();
        
        // Add sections to the fragment for each category
        if (visited.length > 0) {
            const heading = document.createElement('h3');
            heading.textContent = 'Rated Restaurants';
            fragment.appendChild(heading);
            
            // Add all visited restaurants to the list
            visited.forEach(restaurant => {
                // Add a marker to the map
                const marker = this.map.addMarker(restaurant);
                
                // Extend our bounds to include this restaurant
                bounds.extend([restaurant.lat, restaurant.lon]);
                
                // Add restaurant to the fragment
                fragment.appendChild(this.createRestaurantElement(restaurant, marker));
            });
        }
        
        if (unvisited.length > 0) {
            const heading = document.createElement('h3');
            heading.textContent = 'To Visit';
            fragment.appendChild(heading);
            
            // Add all unvisited restaurants to the list
            unvisited.forEach(restaurant => {
                // Add a marker to the map
                const marker = this.map.addMarker(restaurant);
                
                // Extend our bounds to include this restaurant
                bounds.extend([restaurant.lat, restaurant.lon]);
                
                // Add restaurant to the fragment
                fragment.appendChild(this.createRestaurantElement(restaurant, marker));
            });
        }
        
        // Append the fragment to the list (a single DOM operation)
        listElement.appendChild(fragment);

        // Only center the map on the first load, not every time we filter
        if (this.map.markers.length > 0) {
            this.map.centerMapIfNeeded(bounds);
        }
    }

    /**
     * Create a restaurant element for the sidebar list
     * Returns a DOM element for the restaurant
     */
    createRestaurantElement(restaurant, marker) {
        // Clone the restaurant template from HTML
        const template = document.getElementById('restaurantItemTemplate');
        const element = template.content.cloneNode(true);
        
        // Get references to the elements we need to modify
        const div = element.querySelector('.restaurant');
        const nameElement = element.querySelector('.restaurant-name');
        const ratingElement = element.querySelector('.restaurant-rating');
        
        // Set the name
        nameElement.textContent = restaurant.name;
        
        // Set the rating or unrated status
        if (restaurant.rating) {
            ratingElement.innerHTML = `${restaurant.rating} <span class="rating-star">⭐</span>`;
        } else {
            ratingElement.textContent = 'Unrated';
            ratingElement.classList.remove('restaurant-rating');
            ratingElement.classList.add('restaurant-unrated');
        }
        
        // Make it clickable - when clicked, center the map on this restaurant
        div.onclick = () => {
            this.map.map.setView([restaurant.lat, restaurant.lon], 15);
            marker.openPopup();  // Show the popup with restaurant details
        };
        
        return div;
    }

    /**
     * Apply search and rating filters to the restaurant list
     * This is called whenever the user changes the search text or rating filter
     */
    applyFilters() {
        // Get the current rating filter value
        // The ?. is called "optional chaining" - it prevents errors if the element doesn't exist
        const ratingFilter = document.getElementById('ratingFilter')?.value || '';
        
        // Filter the restaurants based on the rating criteria
        this.filteredRestaurants = this.restaurants.filter(r => {
            // Check if restaurant rating meets the minimum filter value
            // When ratingFilter is empty, show all restaurants regardless of rating status
            const matchesRating = !ratingFilter || 
                (r.rating !== undefined && r.rating >= parseFloat(ratingFilter));
            
            // Return true if the restaurant matches the rating criteria
            return matchesRating;
        });
        
        // Update the display with the filtered list
        this.updateDisplay();
    }

    /**
     * Handler for filter changes
     * This is called when the user changes the rating filter
     */
    filterRestaurants() {
        this.applyFilters();
    }
}

// ==================== INITIALIZATION ====================

/**
 * Start everything when the page loads
 * This is the entry point of our application
 */
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // 1. Create and initialize the map
        const restaurantMap = new RestaurantMap();
        const mapInitialized = restaurantMap.initialize();
        if (!mapInitialized) {
            throw new Error('Failed to initialize map');
        }
        
        // 2. Create and initialize the restaurant manager
        const restaurantManager = new RestaurantManager(restaurantMap);
        await restaurantManager.loadRestaurants();
        
        // 3. Set up the event listeners for sidebar controls
        setupEventListeners(restaurantMap, restaurantManager);
        
        // 4. Initialize the rating legend
        initializeRatingLegend();
        
    } catch (error) {
        // If anything goes wrong during initialization, log the error
        console.error('Error during initialization:', error);
    }
});

/**
 * Set up the sidebar with all its components
 */
function setupSidebar(restaurantMap, restaurantManager) {
    const sidebarElement = document.getElementById('sidebar');
    if (!sidebarElement) return;
    
    // Clear the sidebar first
    sidebarElement.innerHTML = '';
    
    // Use a document fragment for more efficient DOM operations
    const fragment = document.createDocumentFragment();
    
    // Add header section
    const header = document.createElement('div');
    header.className = 'sidebar-header';
    
    const title = document.createElement('h2');
    title.textContent = 'Restaurant Explorer';
    header.appendChild(title);
    fragment.appendChild(header);
    
    // Add "Show All Restaurants" button
    const centerButton = document.createElement('button');
    centerButton.textContent = 'Show All Restaurants';
    centerButton.className = 'center-button';
    centerButton.onclick = () => {
        // Reset filters
        const ratingFilter = document.getElementById('ratingFilter');
        
        if (ratingFilter) ratingFilter.value = '';
        
        // Apply filters to show all restaurants
        restaurantManager.applyFilters();
        
        // Center the map on all markers
        if (restaurantMap.markers.length > 0) {
            const bounds = L.latLngBounds(restaurantMap.markers.map(m => m.getLatLng()));
            restaurantMap.fitBounds(bounds);
        }
    };
    fragment.appendChild(centerButton);
    
    // Create controls container
    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'controls-container';
    
    // Add rating filter label and select
    const ratingLabel = document.createElement('label');
    ratingLabel.className = 'control-label';
    ratingLabel.textContent = 'Filter by minimum rating:';
    ratingLabel.setAttribute('for', 'ratingFilter');
    
    const ratingFilter = document.createElement('select');
    ratingFilter.id = 'ratingFilter';
    
    // Add rating options
    const options = [
        { value: '', text: 'Show all' },
        { value: '9', text: '9+: Elite' },
        { value: '8', text: '8+: Excellent' },
        { value: '7', text: '7+: Very Good' },
        { value: '6', text: '6+: Good' },
        { value: '5', text: '5+: Average' }
    ];
    
    // Create a document fragment for options
    const optionsFragment = document.createDocumentFragment();
    options.forEach(option => {
        const optionEl = document.createElement('option');
        optionEl.value = option.value;
        optionEl.textContent = option.text;
        optionsFragment.appendChild(optionEl);
    });
    ratingFilter.appendChild(optionsFragment);
    
    ratingFilter.addEventListener('change', () => restaurantManager.filterRestaurants());
    
    // Assemble the controls container
    controlsContainer.appendChild(ratingLabel);
    controlsContainer.appendChild(ratingFilter);
    fragment.appendChild(controlsContainer);
    
    // Add restaurant list container
    const restaurantList = document.createElement('div');
    restaurantList.id = 'restaurantList';
    fragment.appendChild(restaurantList);
    
    // Append the fragment to the sidebar (a single DOM operation)
    sidebarElement.appendChild(fragment);
    
    // Ensure correct initial display by forcing filter application after sidebar is set up
    setTimeout(() => restaurantManager.applyFilters(), 0);
}

/**
 * Set up event listeners for the sidebar controls
 */
function setupEventListeners(restaurantMap, restaurantManager) {
    // Set up the event listener for the "Show All Restaurants" button
    const showAllButton = document.getElementById('showAllButton');
    if (showAllButton) {
        showAllButton.onclick = () => {
            // Reset filters
            const ratingFilter = document.getElementById('ratingFilter');
            
            if (ratingFilter) ratingFilter.value = '';
            
            // Apply filters to show all restaurants
            restaurantManager.applyFilters();
            
            // Center the map on all markers
            if (restaurantMap.markers.length > 0) {
                const bounds = L.latLngBounds(restaurantMap.markers.map(m => m.getLatLng()));
                restaurantMap.fitBounds(bounds);
            }
        };
    }
    
    // Set up the event listener for the rating filter
    const ratingFilter = document.getElementById('ratingFilter');
    if (ratingFilter) {
        ratingFilter.addEventListener('change', () => restaurantManager.filterRestaurants());
    }
}

/**
 * Initialize the rating legend by populating legend items
 */
function initializeRatingLegend() {
    // Add the event listener for the legend toggle
    const legendToggle = document.querySelector('.legend-toggle');
    const legendContent = document.querySelector('.legend-content');
    
    if (legendToggle && legendContent) {
        legendToggle.addEventListener('click', () => {
            legendContent.classList.toggle('collapsed');
            // Update the toggle icon
            const toggleIcon = legendToggle.querySelector('.toggle-icon');
            if (toggleIcon) {
                toggleIcon.textContent = legendContent.classList.contains('collapsed') ? '▼' : '▲';
            }
        });
    }
    
    // Add legend items to the legend content
    if (!legendContent) return;
    
    // Define the legend items
    const legendItems = [
        { rating: 10, emoji: '🚀', description: "Chef's kiss. Absolute must." },
        { rating: 9, emoji: '💥', description: "Elite. Almost flawless." },
        { rating: 8, emoji: '✨', description: "Vibey. Recommend for sure." },
        { rating: 7, emoji: '🔥', description: "Solid. Worth a revisit." },
        { rating: 6, emoji: '👌', description: "Decent vibes, but not a game-changer." },
        { rating: 5, emoji: '😑', description: "Mid. Wouldn't go out of my way." },
        { rating: 4, emoji: '🤷', description: "Ehh… had hopes, but nah." },
        { rating: 3, emoji: '😬', description: "Meh. Not the vibe." },
        { rating: 2, emoji: '🤢', description: "Big yikes. Regret is real." },
        { rating: 1, emoji: '🚨', description: "Trash. My taste buds are crying." }
    ];
    
    // Use document fragment for more efficient DOM operations
    const fragment = document.createDocumentFragment();
    
    // Create legend items by cloning the template
    legendItems.forEach(item => {
        const template = document.getElementById('legendItemTemplate');
        const legendItem = template.content.cloneNode(true);
        
        // Get references to the elements we need to modify
        const ratingSpan = legendItem.querySelector('.legend-rating');
        const emojiSpan = legendItem.querySelector('.legend-emoji');
        const descSpan = legendItem.querySelector('.legend-description');
        
        // Set content
        ratingSpan.textContent = item.rating;
        emojiSpan.textContent = item.emoji;
        descSpan.textContent = item.description;
        
        fragment.appendChild(legendItem);
    });
    
    // Append all items at once
    legendContent.appendChild(fragment);
}
