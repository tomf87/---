// Restaurant Map class to handle map-related functionality
class RestaurantMap {
    constructor() {
        this.map = null;
        this.markers = [];
        this.tempMarker = null;
        this.defaultView = [53.80111412096824, -1.5528727798052633];
    }

    initialize() {
        try {
            this.map = L.map('restaurantMap').setView(this.defaultView, 13);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors'
            }).addTo(this.map);
            this.setupClickHandler();
            return true;
        } catch (error) {
            console.error('Error initializing map:', error);
            return false;
        }
    }

    setupClickHandler() {
        this.map.on('click', (e) => {
            const latInput = document.getElementById('newLat');
            if (!latInput) return;
            
            const lat = e.latlng.lat;
            const lng = e.latlng.lng;
            
            document.getElementById('newLat').value = lat.toFixed(6);
            document.getElementById('newLon').value = lng.toFixed(6);
            
            if (this.tempMarker) {
                this.map.removeLayer(this.tempMarker);
            }
            
            this.tempMarker = L.marker([lat, lng], {
                icon: this.createPennantIcon('?', false)
            }).addTo(this.map);
        });
    }

    clearMarkers() {
        this.markers.forEach(marker => this.map.removeLayer(marker));
        this.markers = [];
    }

    createPennantIcon(rating, visited) {
        const pennantHtml = `
            <div class="pennant-container">
                <div class="pennant-mount${visited ? '' : ' pennant-mount-unvisited'}"></div>
                <div class="pennant-flag${visited ? '' : ' pennant-flag-unvisited'}">${rating || '?'}</div>
            </div>
        `;

        return L.divIcon({
            className: 'custom-pennant',
            html: pennantHtml,
            iconSize: [40, 50],
            iconAnchor: [4, 50],
            popupAnchor: [16, -45]
        });
    }

    addMarker(restaurant) {
        const marker = L.marker([restaurant.lat, restaurant.lon], {
            icon: this.createPennantIcon(restaurant.rating, restaurant.visited)
        })
        .addTo(this.map)
        .bindPopup(`<b>${restaurant.name}</b><br>${restaurant.visited ? `Rating: ${restaurant.rating}<br>${restaurant.review}` : 'Not yet visited'}`);
        
        this.markers.push(marker);
        return marker;
    }

    fitBounds(bounds) {
        this.map.fitBounds(bounds, {
            padding: [50, 50],
            maxZoom: 15
        });
    }
}

// Restaurant Manager class to handle restaurant data and UI
class RestaurantManager {
    constructor(map) {
        this.restaurants = [];
        this.map = map;
    }

    async loadRestaurants() {
        try {
            const response = await fetch('/flavour-crusaders/restaurants.json');
            if (!response.ok) {
                // Fallback to local path if GitHub Pages path fails
                const localResponse = await fetch('./restaurants.json');
                if (!localResponse.ok) {
                    throw new Error(`HTTP error! status: ${localResponse.status}`);
                }
                const data = await localResponse.json();
                this.restaurants = data.restaurants;
            } else {
                const data = await response.json();
                this.restaurants = data.restaurants;
            }
            this.updateDisplay();
        } catch (error) {
            console.error("Error loading restaurants:", error);
        }
    }

    updateDisplay() {
        const listElement = document.getElementById('restaurantList');
        listElement.innerHTML = '';
        this.map.clearMarkers();

        if (this.restaurants.length === 0) {
            console.log('No restaurants to display');
            return;
        }

        const bounds = L.latLngBounds();
        const visited = this.restaurants.filter(r => r.visited && r.rating);
        const unvisited = this.restaurants.filter(r => !r.visited || !r.rating);
        
        visited.sort((a, b) => b.rating - a.rating);

        this.addRestaurantSection('Rated Restaurants', visited, bounds);
        this.addRestaurantSection('To Visit', unvisited, bounds);

        if (this.map.markers.length > 0) {
            this.map.fitBounds(bounds);
        }
    }

    addRestaurantSection(title, restaurants, bounds) {
        const listElement = document.getElementById('restaurantList');
        const heading = document.createElement('h3');
        heading.textContent = title;
        listElement.appendChild(heading);

        restaurants.forEach(restaurant => {
            const marker = this.map.addMarker(restaurant);
            bounds.extend([restaurant.lat, restaurant.lon]);
            this.addRestaurantToList(restaurant, marker);
        });
    }

    addRestaurantToList(restaurant, marker) {
        const div = document.createElement('div');
        div.classList.add('restaurant');
        div.innerHTML = `<b>${restaurant.name}</b>${restaurant.rating ? ` - ${restaurant.rating} ⭐` : ' (unrated)'}`;
        div.onclick = () => {
            this.map.map.setView([restaurant.lat, restaurant.lon], 15);
            marker.openPopup();
        };
        document.getElementById('restaurantList').appendChild(div);
    }

    filterRestaurants() {
        const search = document.getElementById('search').value.toLowerCase();
        const ratingFilter = document.getElementById('ratingFilter').value;
        
        const filtered = this.restaurants.filter(r => {
            const matchesSearch = r.name.toLowerCase().includes(search);
            const matchesRating = !ratingFilter || (r.rating && r.rating >= parseFloat(ratingFilter));
            return matchesSearch && matchesRating;
        });

        this.restaurants = filtered;
        this.updateDisplay();
        this.loadRestaurants(); // Restore full list after filtering
    }
}

// Initialize when the page loads
document.addEventListener('DOMContentLoaded', async function() {
    try {
        const restaurantMap = new RestaurantMap();
        if (!restaurantMap.initialize()) {
            throw new Error('Failed to initialize map');
        }

        const restaurantManager = new RestaurantManager(restaurantMap);
        await restaurantManager.loadRestaurants();

        // Add filter handler
        document.getElementById('search').addEventListener('input', () => restaurantManager.filterRestaurants());
        document.getElementById('ratingFilter').addEventListener('change', () => restaurantManager.filterRestaurants());
    } catch (error) {
        console.error('Error during initialization:', error);
    }
});
