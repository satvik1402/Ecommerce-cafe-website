// Order Tracking with Leaflet.js
document.addEventListener('DOMContentLoaded', function() {
    // Cafe location (Exact coordinates: 26°50'09.5"N 75°47'38.6"E)
    const CAFE_LOCATION = [26.835972, 75.794056]; // Converted from DMS to decimal degrees
    let map, userLocation, deliveryMarker, scooterMarker, routeControl;
    let deliveryPath = [];
    let pathIndex = 0;
    let animationInterval;
    let currentStep = 0;
    
    // Easing function for smooth animation
    function easeInOutCubic(t) {
        return t < 0.5 
            ? 4 * t * t * t 
            : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
    }
    
    // Helper function to get point along path
    function getPointAlongPath(path, t) {
        if (!path || path.length === 0) return { lat: 0, lng: 0, angle: 0 };
        if (path.length === 1) return { ...path[0], angle: 0 };
        
        if (t <= 0) return { ...path[0], angle: 0 };
        if (t >= 1) return { ...path[path.length - 1], angle: 0 };
        
        // Find the segment where t falls
        let cumulativeDist = 0;
        const totalDist = path.slice(1).reduce((sum, point, i) => {
            return sum + map.distance(
                L.latLng(path[i]),
                L.latLng(point)
            );
        }, 0);
        
        const targetDist = t * totalDist;
        let segmentStart, segmentEnd;
        let segmentDist = 0;
        let segmentIndex = 0;
        
        for (let i = 1; i < path.length; i++) {
            const dist = map.distance(
                L.latLng(path[i-1]),
                L.latLng(path[i])
            );
            
            if (cumulativeDist + dist >= targetDist) {
                segmentStart = path[i-1];
                segmentEnd = path[i];
                segmentDist = dist;
                segmentIndex = i;
                break;
            }
            cumulativeDist += dist;
        }
        
        if (!segmentStart || !segmentEnd) {
            return { ...path[0], angle: 0 };
        }
        
        // Calculate position along segment
        const segmentProgress = (targetDist - cumulativeDist) / segmentDist;
        const lat = segmentStart.lat + (segmentEnd.lat - segmentStart.lat) * segmentProgress;
        const lng = segmentStart.lng + (segmentEnd.lng - segmentStart.lng) * segmentProgress;
        
        // Calculate angle (in degrees)
        const angle = Math.atan2(
            segmentEnd.lng - segmentStart.lng,
            segmentEnd.lat - segmentStart.lat
        ) * 180 / Math.PI + 90; // Add 90 degrees for icon orientation
        
        return { lat, lng, angle };
    }
    
    // Get order details from localStorage
    const order = JSON.parse(localStorage.getItem('currentOrder'));
    if (!order) {
        alert('No active order found. Please place an order first.');
        window.location.href = 'index.html';
        return;
    }
    
    const cart = order.items || [];
    const total = order.total || 0;
    
    // Initialize the map
    function initMap() {
        // Try to get location from order first
        if (order && order.location) {
            userLocation = [order.location.lat, order.location.lng];
            initMapWithLocation();
        } 
        // If no location in order, try to get current location
        else if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    userLocation = [position.coords.latitude, position.coords.longitude];
                    // Save this location to the order
                    if (order) {
                        order.location = {
                            lat: userLocation[0],
                            lng: userLocation[1],
                            address: 'Your location'
                        };
                        localStorage.setItem('currentOrder', JSON.stringify(order));
                    }
                    initMapWithLocation();
                },
                (error) => {
                    console.error("Error getting location:", error);
                    alert('Could not get your location. Using default location near the cafe.');
                    userLocation = [26.8534, 75.9245]; // Default near cafe
                    initMapWithLocation();
                },
                { 
                    enableHighAccuracy: true,
                    timeout: 5000,
                    maximumAge: 0 
                }
            );
        } else {
            // Browser doesn't support Geolocation
            alert('Geolocation is not supported by your browser. Using default location near the cafe.');
            userLocation = [26.8534, 75.9245]; // Default near cafe
            initMapWithLocation();
        }
    }
    
    function initMapWithLocation() {
        try {
            // Initialize the map with a default view
            map = L.map('map', {
                zoomControl: false,
                scrollWheelZoom: true,
                doubleClickZoom: false,
                touchZoom: true,
                boxZoom: false,
                keyboard: false,
                dragging: true,
                zoomSnap: 0.1,
                zoomAnimation: true,
                fadeAnimation: true,
                markerZoomAnimation: true,
                preferCanvas: true
            });
            
            // Add OpenStreetMap tiles with retry
            const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                maxZoom: 19,
                minZoom: 10
            }).addTo(map);
            
            // Add error handling for tile loading
            osmLayer.on('tileerror', function(error) {
                console.error('Error loading map tiles:', error);
            });
            
            // Add cafe marker with shadow
            const cafeIcon = L.divIcon({
                className: 'cafe-marker',
                html: '<i class="fas fa-store fa-2x" style="color: #e67e22; text-shadow: 1px 1px 3px rgba(0,0,0,0.5);"></i>',
                iconSize: [40, 40],
                iconAnchor: [20, 40],
                popupAnchor: [0, -40]
            });
            
            const cafeMarker = L.marker(CAFE_LOCATION, { 
                icon: cafeIcon,
                title: 'Coffee Aroma',
                alt: 'Coffee Shop',
                zIndexOffset: 1000,
                riseOnHover: true
            }).addTo(map);
            
            cafeMarker.bindPopup(
                '<div style="text-align: center;">' +
                '<h6 style="margin: 5px 0; font-weight: bold;">Coffee Aroma</h6>' +
                '<p style="margin: 5px 0;">Your order is being prepared here</p>' +
                '</div>',
                { closeButton: false, offset: [0, -20] }
            ).openPopup();
                
            // Add user location marker with pulse effect
            const userIcon = L.divIcon({
                className: 'user-marker',
                html: '<i class="fas fa-map-marker-alt fa-2x" style="color: #e74c3c; text-shadow: 1px 1px 3px rgba(0,0,0,0.5);"></i>',
                iconSize: [40, 40],
                iconAnchor: [20, 40],
                popupAnchor: [0, -40]
            });
            
            const userMarker = L.marker(userLocation, { 
                icon: userIcon,
                title: 'Your Location',
                alt: 'Delivery Destination',
                zIndexOffset: 1000,
                riseOnHover: true
            }).addTo(map);
            
            userMarker.bindPopup(
                '<div style="text-align: center;">' +
                '<h6 style="margin: 5px 0; font-weight: bold;">Your Location</h6>' +
                '<p style="margin: 5px 0;">Delivery destination</p>' +
                '</div>',
                { closeButton: false, offset: [0, -20] }
            ).openPopup();
                
            // Add delivery scooter marker with animation
            const scooterIcon = L.divIcon({
                className: 'scooter-marker',
                html: '<i class="fas fa-motorcycle fa-2x" style="color: #3498db; text-shadow: 1px 1px 3px rgba(0,0,0,0.5);"></i>',
                iconSize: [40, 40],
                iconAnchor: [20, 40],
                popupAnchor: [0, -40]
            });
            
            scooterMarker = L.marker(CAFE_LOCATION, { 
                icon: scooterIcon,
                title: 'Your Order',
                alt: 'Your Order',
                rotationAngle: 0,
                zIndexOffset: 2000,
                riseOnHover: true
            }).addTo(map);
            
            // Add pulsing effect to scooter
            setInterval(() => {
                const icon = scooterMarker.getElement();
                if (icon) {
                    icon.style.transition = 'all 0.5s ease-in-out';
                    icon.style.transform = 'scale(1.1)';
                    setTimeout(() => {
                        if (icon) icon.style.transform = 'scale(1)';
                    }, 500);
                }
            }, 1000);
            
            // Fit map to show both locations with padding
            const bounds = L.latLngBounds([CAFE_LOCATION, userLocation]);
            map.fitBounds(bounds, { 
                padding: [100, 100],
                maxZoom: 15,
                animate: true,
                duration: 1
            });
            
            // Add zoom control with better styling
            L.control.zoom({
                position: 'bottomright',
                zoomInTitle: 'Zoom in',
                zoomOutTitle: 'Zoom out'
            }).addTo(map);
            
            // Add scale control
            L.control.scale({
                imperial: false,
                metric: true,
                position: 'bottomleft'
            }).addTo(map);
            
            // Add a small delay before starting the order process
            setTimeout(() => {
                startOrderProcess();
            }, 1000);
        } catch (error) {
            console.error('Error initializing map:', error);
            alert('Error initializing map. Please refresh the page.');
        }
    }
    
    function startOrderProcess() {
        console.log('Starting order process...');
        // Start with preparing status
        updateStatus(0);
        
        // After 3 seconds, calculate and display route
        setTimeout(() => {
            console.log('Preparing complete, calculating route...');
            updateStatus(1); // Update to 'On the way' status
            
            // Give a small delay before starting the route calculation
            setTimeout(() => {
                console.log('Calculating route...');
                calculateAndDisplayRoute();
            }, 1000);
        }, 3000);
    }
    
    function calculateAndDisplayRoute() {
        console.log('Calculating route...');
        // Show loading state
        const deliveryTimeEl = document.getElementById('delivery-time');
        if (deliveryTimeEl) {
            deliveryTimeEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Calculating best route...';
        }
        
        // Fallback to straight line if OSRM fails
        const fallbackToStraightLine = () => {
            console.log('Using fallback straight line route');
            deliveryPath = [
                { lat: CAFE_LOCATION[0], lng: CAFE_LOCATION[1] },
                { lat: userLocation[0], lng: userLocation[1] }
            ];
            
            if (deliveryTimeEl) {
                deliveryTimeEl.innerHTML = 
                    '<i class="fas fa-clock"></i> Estimated delivery: 15-20 mins';
            }
            
            // Update to 'On the way' status
            updateStatus(1);
            
            // Add a small delay before starting animation
            setTimeout(() => {
                startDeliveryAnimation();
            }, 500);
        };

        // Try using OSRM for routing
        try {
            const service = L.Routing.osrmv1({
                serviceUrl: 'https://router.project.osrm.org/route/v1',
                profile: 'driving',
                useHints: false,
                timeout: 5000 // 5 second timeout
            });
            
            // Create routing control
            const control = L.Routing.control({
                waypoints: [
                    L.latLng(CAFE_LOCATION[0], CAFE_LOCATION[1]),
                    L.latLng(userLocation[0], userLocation[1])
                ],
                routeWhileDragging: false,
                show: false,
                lineOptions: {
                    styles: [{color: '#3498db', weight: 5, opacity: 0.7}],
                    addWaypoints: false,
                    missingRouteTolerance: 0
                },
                createMarker: () => null
            }).addTo(map);
            
            // When route is found
            control.on('routesfound', function(e) {
                console.log('Route found');
                const routes = e.routes;
                if (routes && routes[0]) {
                    const route = routes[0];
                    
                    // Convert route coordinates to the format we need
                    deliveryPath = route.coordinates.map(coord => ({
                        lat: coord.lat,
                        lng: coord.lng
                    }));
                    
                    console.log('Delivery path points:', deliveryPath.length);
                    
                    // Calculate estimated delivery time
                    const distanceKm = route.summary.totalDistance / 1000;
                    const avgSpeedKmH = 20; // km/h
                    const estimatedTime = Math.ceil((distanceKm / avgSpeedKmH) * 60);
                    
                    if (deliveryTimeEl) {
                        deliveryTimeEl.innerHTML = 
                            `<i class="fas fa-clock"></i> Estimated delivery: ${estimatedTime}-${estimatedTime + 5} mins`;
                    }
                    
                    // Update to 'On the way' status
                    updateStatus(1);
                    
                    // Start animation after a short delay
                    setTimeout(() => {
                        startDeliveryAnimation();
                    }, 1000);
                } else {
                    console.log('No route found, using fallback');
                    fallbackToStraightLine();
                }
            });
            
            // Handle routing errors
            control.on('routingerror', function(e) {
                console.error('Routing error:', e);
                fallbackToStraightLine();
            });
            
            // Add timeout for route calculation
            setTimeout(() => {
                if (!deliveryPath || deliveryPath.length === 0) {
                    console.log('Route calculation timed out, using fallback');
                    fallbackToStraightLine();
                }
            }, 5000);
            
        } catch (error) {
            console.error('Error in route calculation:', error);
            fallbackToStraightLine();
        }
    }
    
    function interpolatePoints(start, end, steps) {
        const points = [];
        for (let i = 0; i <= steps; i++) {
            const ratio = i / steps;
            points.push({
                lat: start.lat + (end.lat - start.lat) * ratio,
                lng: start.lng + (end.lng - start.lng) * ratio
            });
        }
        return points;
    }

    function startDeliveryAnimation() {
        console.log('Starting delivery animation...');
        
        // Ensure we have a valid path
        if (!deliveryPath || deliveryPath.length === 0) {
            console.error('No delivery path found');
            return;
        }
        
        // Create more points for smoother animation
        const smoothPath = [];
        for (let i = 0; i < deliveryPath.length - 1; i++) {
            const start = deliveryPath[i];
            const end = deliveryPath[i + 1];
            // Only interpolate if we have valid points
            if (start && end && start.lat && start.lng && end.lat && end.lng) {
                const segmentPoints = interpolatePoints(start, end, 10);
                smoothPath.push(...segmentPoints);
            }
        }
        
        // If we couldn't create a smooth path, use the original path
        const pathToUse = smoothPath.length > 0 ? smoothPath : deliveryPath;
        
        const totalAnimationTime = 30000; // 30 seconds for the whole animation
        let startTime = null;
        let lastProgress = 0;
        let animationId = null;
        
        // Create scooter marker if it doesn't exist
        if (!scooterMarker) {
            const scooterIcon = L.divIcon({
                className: 'scooter-marker',
                html: '<i class="fas fa-motorcycle fa-2x" style="color: #e74c3c;"></i>',
                iconSize: [40, 40],
                iconAnchor: [20, 20],
                popupAnchor: [0, -20]
            });
            
            // Start at the first point of the path
            const startPoint = pathToUse[0] || { lat: CAFE_LOCATION[0], lng: CAFE_LOCATION[1] };
            scooterMarker = L.marker([startPoint.lat, startPoint.lng], {
                icon: scooterIcon,
                rotationAngle: 0,
                rotationOrigin: 'center center'
            }).addTo(map);
        }
        
        // Initial status update
        updateStatus(0); // Preparing
        
        function animate(currentTime) {
            if (!startTime) startTime = currentTime;
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / totalAnimationTime, 1);
            
            try {
                // Calculate current position along the path
                const pathProgress = easeInOutCubic(progress);
                const pathPos = getPointAlongPath(pathToUse, pathProgress);
                
                // Update scooter position
                scooterMarker.setLatLng([pathPos.lat, pathPos.lng]);
                
                // Update rotation based on direction
                if (pathPos.angle !== null && !isNaN(pathPos.angle)) {
                    scooterMarker.setRotationAngle(pathPos.angle);
                }
                
                // Update progress bar
                const progressBar = document.getElementById('status-progress');
                if (progressBar) {
                    progressBar.style.width = `${progress * 100}%`;
                }
                
                // Update status based on progress
                if (progress < 0.2) {
                    // Still in first 20% - preparing
                    if (lastProgress >= 0.2) updateStatus(0);
                } else if (progress < 0.9) {
                    // 20-90% - on the way
                    if (lastProgress < 0.2 || lastProgress >= 0.9) updateStatus(1);
                    
                    // Update ETA
                    const remainingTime = Math.ceil((1 - progress) * (totalAnimationTime / 60000) * 1.2); // in minutes
                    const deliveryTimeEl = document.getElementById('delivery-time');
                    if (deliveryTimeEl) {
                        if (remainingTime < 1) {
                            deliveryTimeEl.innerHTML = 
                                '<i class="fas fa-clock"></i> Almost there! Less than a minute away';
                        } else {
                            deliveryTimeEl.innerHTML = 
                                `<i class="fas fa-clock"></i> About ${remainingTime}-${remainingTime + 2} mins away`;
                        }
                    }
                } else {
                    // Last 10% - delivered
                    if (lastProgress < 0.9) updateStatus(2);
                }
                
                lastProgress = progress;
                
                // Continue animation or complete
                if (progress < 1) {
                    animationId = requestAnimationFrame(animate);
                } else {
                    deliveryComplete();
                }
            } catch (error) {
                console.error('Error in animation:', error);
                // Try to continue the animation anyway
                if (progress < 1) {
                    animationId = requestAnimationFrame(animate);
                } else {
                    deliveryComplete();
                }
            }
        }
        
        // Store animation ID for cleanup
        animationInterval = {
            id: null,
            cancel: function() {
                if (this.id) {
                    cancelAnimationFrame(this.id);
                    this.id = null;
                }
            }
        };
        
        // Start animation
        animationInterval.id = requestAnimationFrame(animate);
    }
    
    function deliveryComplete() {
        console.log('Delivery complete!');
        
        // Update status to delivered
        updateStatus(2);
        
        // Show delivery complete message with animation
        const deliveryTime = document.getElementById('delivery-time');
        if (deliveryTime) {
            deliveryTime.innerHTML = `
                <div class="d-flex align-items-center">
                    <i class="fas fa-check-circle text-success me-2"></i>
                    <span>Order delivered!</span>
                </div>
            `;
            deliveryTime.classList.add('text-success', 'fw-bold');
            
            // Add celebration effect
            deliveryTime.classList.add('animate__animated', 'animate__pulse');
        }
        
        // Enable contact rider button with animation
        const contactBtn = document.getElementById('contact-rider');
        if (contactBtn) {
            contactBtn.classList.remove('disabled', 'btn-outline-secondary');
            contactBtn.classList.add('btn-success');
            contactBtn.innerHTML = '<i class="fas fa-phone-alt me-2"></i>Rate your delivery';
        }
        
        // Clear animation interval
        if (animationInterval) {
            if (typeof animationInterval.cancel === 'function') {
                animationInterval.cancel();
            } else {
                clearInterval(animationInterval);
            }
            animationInterval = null;
        }
        
        // Scroll to top to show delivery confirmation
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        // Auto-close after 5 seconds
        setTimeout(() => {
            deliveryTime.classList.remove('animate__pulse');
        }, 5000);
    }
    
    function updateStatus(step) {
        console.log(`Updating status to step ${step}`);
        
        // Define status configurations
        const statusConfig = [
            {
                text: 'Preparing your order',
                icon: 'fa-utensils',
                class: 'text-primary',
                stepClass: 'preparing'
            },
            {
                text: 'On the way',
                icon: 'fa-motorcycle',
                class: 'text-warning',
                stepClass: 'on-the-way'
            },
            {
                text: 'Delivered!',
                icon: 'fa-check-circle',
                class: 'text-success',
                stepClass: 'delivered'
            }
        ];
        
        const currentStatus = statusConfig[step];
        if (!currentStatus) return;
        
        // Update step indicators
        const steps = document.querySelectorAll('.step');
        const statusText = document.getElementById('status-text');
        const statusIcon = document.getElementById('status-icon');
        
        // Animate status update
        if (statusText) statusText.classList.add('animate__animated', 'animate__fadeOut');
        
        // After fade out, update content and fade in
        setTimeout(() => {
            // Update steps
            if (steps && steps.length > 0) {
                steps.forEach((s, index) => {
                    s.classList.remove('active', 'completed', 'preparing', 'on-the-way', 'delivered');
                    if (index < step) {
                        s.classList.add('completed');
                    } else if (index === step) {
                        s.classList.add('active');
                    }
                    // Add step-specific class
                    if (statusConfig[index]) {
                        s.classList.add(statusConfig[index].stepClass);
                    }
                });
            }
            
            // Update status content
            if (statusText) {
                statusText.textContent = currentStatus.text;
                statusText.className = `fw-bold ${currentStatus.class} animate__animated animate__fadeIn`;
            }
            
            // Update icon if element exists
            if (statusIcon) {
                statusIcon.className = `fas ${currentStatus.icon} me-2`;
            }
            
            // Update progress bar color based on status
            const progressBar = document.getElementById('status-progress');
            if (progressBar) {
                progressBar.className = 'progress-bar progress-bar-striped progress-bar-animated';
                progressBar.classList.add(
                    step === 0 ? 'bg-primary' :
                    step === 1 ? 'bg-warning' : 'bg-success'
                );
            }
            
            // Update current step
            currentStep = step;
            
        }, 300); // Match this with the CSS animation duration
    }
    
    // Display order details
    function displayOrderDetails() {
        try {
            console.log('Displaying order details...');
            const orderItems = document.getElementById('order-items');
            const orderTotal = document.getElementById('order-total');
            
            if (!orderItems || !orderTotal) {
                console.error('Order items or total element not found');
                return;
            }
            
            // Clear previous items
            orderItems.innerHTML = '';
            
            // Get the order from localStorage
            const order = JSON.parse(localStorage.getItem('currentOrder')) || {};
            console.log('Order data:', order);
            
            const items = order.items || [];
            console.log('Order items:', items);
            
            // Calculate total from items if not provided
            let subtotal = 0;
            let deliveryFee = order.deliveryFee || 0;
            
            // Add each item to the order
            if (items && Array.isArray(items) && items.length > 0) {
                // Create items container
                const itemsContainer = document.createElement('div');
                itemsContainer.className = 'mb-4';
                
                items.forEach(item => {
                    if (!item) return;
                    
                    // Parse price from string if needed (e.g., "₹99.00" -> 99.00)
                    let itemPrice = 0;
                    if (typeof item.price === 'string') {
                        itemPrice = parseFloat(item.price.replace(/[^0-9.]/g, '')) || 0;
                    } else {
                        itemPrice = parseFloat(item.price) || 0;
                    }
                    
                    const itemQuantity = parseInt(item.quantity) || 1;
                    const itemTotal = Math.round(itemPrice * itemQuantity * 100) / 100; // Round to 2 decimal places
                    subtotal += itemTotal;
                    
                    console.log('Item:', item.name, 'Price:', itemPrice, 'Qty:', itemQuantity, 'Total:', itemTotal);
                    
                    const itemElement = document.createElement('div');
                    itemElement.className = 'order-item p-3 mb-2 border rounded bg-white';
                    itemElement.innerHTML = `
                        <div class="d-flex justify-content-between align-items-start">
                            <div class="me-3">
                                <h6 class="mb-1 fw-bold">${item.name || 'Item'}</h6>
                                <div class="d-flex align-items-center mb-1">
                                    <span class="badge bg-light text-dark me-2">${item.size || 'Regular'}</span>
                                    <small class="text-muted">× ${itemQuantity}</small>
                                </div>
                                <small class="text-muted">₹${itemPrice.toFixed(2)} each</small>
                            </div>
                            <div class="text-end">
                                <div class="fw-bold">₹${itemTotal.toFixed(2)}</div>
                            </div>
                        </div>
                    `;
                    itemsContainer.appendChild(itemElement);
                });
                
                orderItems.appendChild(itemsContainer);
                
                // Calculate totals
                subtotal = Math.round(subtotal * 100) / 100;
                const total = subtotal + deliveryFee;
                
                console.log('Order subtotal:', subtotal, 'Delivery fee:', deliveryFee, 'Total:', total);
                
                // Add order summary
                const summaryElement = document.createElement('div');
                summaryElement.className = 'order-summary p-3 bg-light rounded';
                summaryElement.innerHTML = `
                    <div class="d-flex justify-content-between mb-2">
                        <span class="text-muted">Subtotal</span>
                        <span>₹${subtotal.toFixed(2)}</span>
                    </div>
                    <div class="d-flex justify-content-between mb-2">
                        <span class="text-muted">Delivery Fee</span>
                        <span>₹${deliveryFee.toFixed(2)}</span>
                    </div>
                    <div class="d-flex justify-content-between fw-bold fs-5 mt-3 pt-2 border-top">
                        <span>Total</span>
                        <span class="text-primary">₹${total.toFixed(2)}</span>
                    </div>
                `;
                orderItems.appendChild(summaryElement);
                
                // Update total display
                orderTotal.textContent = `₹${total.toFixed(2)}`;
                
            } else {
                console.warn('No items found in the order');
                const noItems = document.createElement('div');
                noItems.className = 'text-muted text-center py-4 border rounded bg-light';
                noItems.innerHTML = '<i class="fas fa-shopping-cart fa-2x mb-2 d-block"></i>No items in this order';
                orderItems.appendChild(noItems);
                orderTotal.textContent = '₹0.00';
            }
            
            console.log('Finished displaying order details');
        } catch (error) {
            console.error('Error displaying order details:', error);
            // Fallback to show at least the total if possible
            const orderTotal = document.getElementById('order-total');
            if (orderTotal) {
                orderTotal.textContent = '₹0.00';
            }
        }
    }
    
    // Contact rider button
    document.getElementById('contact-rider').addEventListener('click', function() {
        alert('Calling your delivery rider at +91 XXXXXXXXXX');
    });
    
    // Initialize the map and display order details when the page loads
    initMap();
    displayOrderDetails();
});
