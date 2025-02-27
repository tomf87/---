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
     * We use setTimeout to give the browser a moment to finish resizing
     */
    adjustMapSize() {
        setTimeout(() => {
            // Safety check: make sure the map exists
            if (!this.map) return;
            
            // Tell the map to recalculate its size
            this.map.invalidateSize();
            
            // No longer automatically fit bounds on every resize - this allows user to zoom/scroll freely
        }, 100); // Wait 100 milliseconds
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
        // Create the HTML for our custom marker
        // Note how we use different styles for visited vs unvisited restaurants
        const pennantHtml = `
            <div class="pennant-container">
                <div class="pennant-mount${visited ? '' : ' pennant-mount-unvisited'}"></div>
                <div class="pennant-flag${visited ? '' : ' pennant-flag-unvisited'}">${rating || '?'}</div>
            </div>
        `;

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
        // Create a marker at the restaurant's location
        const marker = L.marker([restaurant.lat, restaurant.lon], {
            icon: this.createPennantIcon(restaurant.rating, restaurant.visited)
        })
        .addTo(this.map)  // Add it to the map
        .bindPopup(`<b>${restaurant.name}</b><br>${restaurant.visited ? `Rating: ${restaurant.rating}<br>${restaurant.review}` : 'Not yet visited'}`);  // Add popup info
        
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
        if (this.initialLoad && this.markers.length > 0) {
            this.fitBounds(bounds);
            this.initialLoad = false;
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
                        this.applyFilters();                 // Apply any filters that might be active
                        return;                              // Success! We can exit
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

        // Add sections to the list for each category
        this.addRestaurantSection('Rated Restaurants', visited, bounds);
        this.addRestaurantSection('To Visit', unvisited, bounds);

        // Only center the map on the first load, not every time we filter
        if (this.map.markers.length > 0) {
            this.map.centerMapIfNeeded(bounds);
        }
    }

    /**
     * Add a section of restaurants to the sidebar list
     * This handles either visited or unvisited restaurants
     */
    addRestaurantSection(title, restaurants, bounds) {
        // If there are no restaurants in this section, don't add anything
        if (restaurants.length === 0) return;
        
        // Get the list element and add a heading for this section
        const listElement = document.getElementById('restaurantList');
        const heading = document.createElement('h3');
        heading.textContent = title;
        listElement.appendChild(heading);

        // For each restaurant, add it to the list and map
        restaurants.forEach(restaurant => {
            // Add a marker to the map
            const marker = this.map.addMarker(restaurant);
            
            // Extend our bounds to include this restaurant
            bounds.extend([restaurant.lat, restaurant.lon]);
            
            // Add this restaurant to the sidebar list
            this.addRestaurantToList(restaurant, marker);
        });
    }

    /**
     * Add a single restaurant to the sidebar list
     * Creates a clickable element that highlights the restaurant on the map
     */
    addRestaurantToList(restaurant, marker) {
        // Create a new div for this restaurant
        const div = document.createElement('div');
        div.classList.add('restaurant');
        
        // Create a name element with proper styling
        const nameElement = document.createElement('span');
        nameElement.className = 'restaurant-name';
        nameElement.textContent = restaurant.name;
        
        // Create a rating element if the restaurant has been rated
        let ratingElement = null;
        if (restaurant.rating) {
            ratingElement = document.createElement('span');
            ratingElement.className = 'restaurant-rating';
            ratingElement.innerHTML = `${restaurant.rating} <span class="rating-star">⭐</span>`;
        } else {
            ratingElement = document.createElement('span');
            ratingElement.className = 'restaurant-unrated';
            ratingElement.textContent = 'Unrated';
        }
        
        // Add elements to the restaurant div
        div.appendChild(nameElement);
        div.appendChild(ratingElement);
        
        // Make it clickable - when clicked, center the map on this restaurant
        div.onclick = () => {
            this.map.map.setView([restaurant.lat, restaurant.lon], 15);
            marker.openPopup();  // Show the popup with restaurant details
        };
        
        // Add this element to the list
        document.getElementById('restaurantList').appendChild(div);
    }

    /**
     * Apply search and rating filters to the restaurant list
     * This is called whenever the user changes the search text or rating filter
     */
    applyFilters() {
        // Get the current search text and rating filter values
        // The ?. is called "optional chaining" - it prevents errors if the element doesn't exist
        const search = document.getElementById('search')?.value.toLowerCase() || '';
        const ratingFilter = document.getElementById('ratingFilter')?.value || '';
        
        // Filter the restaurants based on these criteria
        this.filteredRestaurants = this.restaurants.filter(r => {
            // Check if restaurant name contains the search text
            const matchesSearch = r.name.toLowerCase().includes(search);
            
            // Check if restaurant rating meets the minimum filter value
            const matchesRating = !ratingFilter || (r.rating && r.rating >= parseFloat(ratingFilter));
            
            // Restaurant must match both criteria to be included
            return matchesSearch && matchesRating;
        });
        
        // Update the display with the filtered list
        this.updateDisplay();
    }

    /**
     * Handler for search and filter changes
     * This is called when the user types in the search box or changes the rating filter
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
        if (!restaurantMap.initialize()) {
            throw new Error('Failed to initialize map');
        }

        // 2. Create the restaurant manager and load restaurant data
        const restaurantManager = new RestaurantManager(restaurantMap);
        await restaurantManager.loadRestaurants();

        // 3. Set up the sidebar structure and controls
        setupSidebar(restaurantMap, restaurantManager);
        
        // 4. Add rating legend to the sidebar
        addRatingLegend();
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
    
    // Add header section
    const header = document.createElement('div');
    header.className = 'sidebar-header';
    
    const title = document.createElement('h2');
    title.textContent = 'Restaurant Explorer';
    header.appendChild(title);
    
    // Add "Show All Restaurants" button
    const centerButton = document.createElement('button');
    centerButton.textContent = 'Show All Restaurants';
    centerButton.className = 'center-button';
    centerButton.onclick = () => {
        if (restaurantMap.markers.length > 0) {
            const bounds = L.latLngBounds(restaurantMap.markers.map(m => m.getLatLng()));
            restaurantMap.fitBounds(bounds);
        }
    };
    
    // Create controls container
    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'controls-container';
    
    // Add search label and input
    const searchLabel = document.createElement('label');
    searchLabel.className = 'control-label';
    searchLabel.textContent = 'Search restaurants:';
    searchLabel.setAttribute('for', 'search');
    
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.id = 'search';
    searchInput.placeholder = 'Enter restaurant name...';
    searchInput.addEventListener('input', () => restaurantManager.filterRestaurants());
    
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
    
    options.forEach(option => {
        const optionEl = document.createElement('option');
        optionEl.value = option.value;
        optionEl.textContent = option.text;
        ratingFilter.appendChild(optionEl);
    });
    
    ratingFilter.addEventListener('change', () => restaurantManager.filterRestaurants());
    
    // Add restaurant list container
    const restaurantList = document.createElement('div');
    restaurantList.id = 'restaurantList';
    
    // Assemble the sidebar
    controlsContainer.appendChild(searchLabel);
    controlsContainer.appendChild(searchInput);
    controlsContainer.appendChild(ratingLabel);
    controlsContainer.appendChild(ratingFilter);
    
    sidebarElement.appendChild(header);
    sidebarElement.appendChild(centerButton);
    sidebarElement.appendChild(controlsContainer);
    sidebarElement.appendChild(restaurantList);
}

/**
 * Add a rating legend to the sidebar explaining what each rating number means
 * This helps users understand the rating system used for restaurants
 */
function addRatingLegend() {
    const sidebarElement = document.getElementById('sidebar');
    if (!sidebarElement) return;

    // Create legend container
    const legendContainer = document.createElement('div');
    legendContainer.className = 'rating-legend';

    // Add legend title
    const legendTitle = document.createElement('h3');
    legendTitle.textContent = 'Rating Legend';
    legendContainer.appendChild(legendTitle);

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

    // Create legend items
    legendItems.forEach(item => {
        const legendItem = document.createElement('div');
        legendItem.className = 'legend-item';

        const ratingSpan = document.createElement('span');
        ratingSpan.className = 'legend-rating';
        ratingSpan.textContent = item.rating;

        const emojiSpan = document.createElement('span');
        emojiSpan.className = 'legend-emoji';
        emojiSpan.textContent = item.emoji;

        const descSpan = document.createElement('span');
        descSpan.className = 'legend-description';
        descSpan.textContent = item.description;

        legendItem.appendChild(ratingSpan);
        legendItem.appendChild(emojiSpan);
        legendItem.appendChild(descSpan);
        legendContainer.appendChild(legendItem);
    });

    // Add the legend to the sidebar
    sidebarElement.appendChild(legendContainer);
}
