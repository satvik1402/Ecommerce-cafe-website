// Get references to the DOM elements
const cartContent = document.getElementById('cart-content');
const cartTotal = document.getElementById('cart-total');

// Get references to the payment modal elements
const paymentModal = document.getElementById('payment-modal');
const buyBtn = document.getElementById('buy-btn');
const closeModal = document.querySelector('.close-modal');
const upiBtn = document.getElementById('upi-btn');
const codBtn = document.getElementById('cod-btn');

// Debug logs to check if elements are found
console.log('Modal element:', paymentModal);
console.log('Buy button element:', buyBtn);
console.log('Close modal element:', closeModal);
console.log('UPI button element:', upiBtn);
console.log('COD button element:', codBtn);

// Function to render the cart items
function renderCart() {
  // Get the cart from localStorage (or initialize an empty one)
  const cart = JSON.parse(localStorage.getItem('cart')) || [];

  // Clear the existing cart content
  cartContent.innerHTML = '';

  // Check if the cart is empty
  if (cart.length === 0) {
    cartContent.innerHTML = '<tr><td colspan="4" style="text-align: center;">Your cart is empty.</td></tr>';
    cartTotal.textContent = '0.00';
    return;
  }

  // Calculate the total and render each cart item
  let total = 0;
  cart.forEach((item, index) => {
    const price = parseFloat(item.price.replace(/[^0-9.]/g, '')); // Parse price dynamically
    total += price;

    const row = document.createElement('tr');
    row.innerHTML = `
      <td class="cart-item-image"><img src="${item.image}" alt="${item.name}"></td>
      <td>${item.name}</td>
      <td>${item.price}</td>
      <td><button class="remove-btn" onclick="removeFromCart(${index})">Remove</button></td>
    `;
    cartContent.appendChild(row);
  });

  // Update the total price
  cartTotal.textContent = total.toFixed(2);
}

// Function to handle item removal from the cart
function removeFromCart(index) {
  let cart = JSON.parse(localStorage.getItem('cart')) || [];
  
  // Remove the item at the specified index
  cart.splice(index, 1);

  // Save the updated cart to localStorage
  localStorage.setItem('cart', JSON.stringify(cart));

  // Re-render the cart
  renderCart();
}

// Function to get user's current location
function getUserLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject('Geolocation is not supported by your browser');
      return;
    }

    // Show loading state
    const locationBtn = document.getElementById('location-btn');
    if (locationBtn) {
      locationBtn.disabled = true;
      locationBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Getting location...';
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        
        // Update location in header
        updateLocationInHeader(location);
        
        // Resolve with location
        resolve(location);
        
        // Reset button state
        if (locationBtn) {
          locationBtn.disabled = false;
          locationBtn.innerHTML = '<i class="fas fa-check"></i> Location Set';
        }
      },
      (error) => {
        console.error('Error getting location:', error);
        let errorMessage = 'Error getting your location';
        
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access was denied. Please enable it in your browser settings.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage = 'The request to get location timed out.';
            break;
        }
        
        // Reset button state
        if (locationBtn) {
          locationBtn.disabled = false;
          locationBtn.innerHTML = '<i class="fas fa-location-arrow"></i> Set Location';
        }
        
        reject(errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  });
}

// Function to update location in header
function updateLocationInHeader(location) {
  // Get the location display element
  const locationDisplay = document.getElementById('location-display');
  const userLocationDisplay = document.getElementById('user-location');
  
  // Save location to localStorage with address
  const locationData = {
    lat: location.lat,
    lng: location.lng,
    address: 'Your location' // Default, will be updated
  };
  
  // Update UI immediately
  if (userLocationDisplay) {
    userLocationDisplay.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Getting address...';
  }
  
  // Reverse geocode to get address
  fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.lat}&lon=${location.lng}`)
    .then(response => response.json())
    .then(data => {
      const address = data.display_name || 'Your location';
      const shortAddress = address.split(',').slice(0, 3).join(',');
      
      // Update location display in header
      if (locationDisplay) {
        locationDisplay.textContent = shortAddress;
      }
      
      // Update location in cart page
      if (userLocationDisplay) {
        userLocationDisplay.innerHTML = `<i class="fas fa-map-marker-alt"></i> ${shortAddress}`;
      }
      
      // Update location data with full address
      locationData.address = address;
      localStorage.setItem('deliveryLocation', JSON.stringify(locationData));
      
      // Also save to currentOrder if it exists
      const order = JSON.parse(localStorage.getItem('currentOrder') || '{}');
      if (order) {
        order.location = locationData;
        localStorage.setItem('currentOrder', JSON.stringify(order));
      }
    })
    .catch(error => {
      console.error('Error getting address:', error);
      if (locationDisplay) locationDisplay.textContent = 'Your location';
      if (userLocationDisplay) userLocationDisplay.innerHTML = '<i class="fas fa-map-marker-alt"></i> Location set';
      
      // Save basic location data
      localStorage.setItem('deliveryLocation', JSON.stringify(locationData));
    });
}

// Function to handle payment
async function handlePayment(paymentMethod) {
  console.log('Handling payment:', paymentMethod);
  const cart = JSON.parse(localStorage.getItem('cart')) || [];
  console.log('Cart contents:', cart);
  
  if (cart.length === 0) {
    alert('Your cart is empty!');
    return;
  }
  
  // Check if location is set
  const deliveryLocation = JSON.parse(localStorage.getItem('deliveryLocation'));
  if (!deliveryLocation) {
    alert('Please set your delivery location first!');
    return;
  }

  try {
    // Generate and download invoice
    downloadInvoice(paymentMethod);
    
    // Save order details for tracking
    const order = {
      orderNumber: 'ORD' + Math.floor(100000 + Math.random() * 900000),
      items: cart,
      total: cart.reduce((sum, item) => sum + parseFloat(item.price.replace(/[^0-9.]/g, '')), 0).toFixed(2),
      paymentMethod: paymentMethod,
      timestamp: new Date().toISOString(),
      status: 'preparing',
      location: deliveryLocation
    };
    
    // Save order to localStorage
    localStorage.setItem('currentOrder', JSON.stringify(order));
    
    // Clear the cart after successful order
    localStorage.removeItem('cart');
    
    // Show appropriate message
    if (paymentMethod === 'UPI Payment') {
      alert('Payment successful! Redirecting to order tracking...');
    } else {
      alert('Order placed successfully! Redirecting to order tracking...');
    }
    
    // Hide modal
    if (paymentModal) {
      paymentModal.style.display = 'none';
    }
    
    // Redirect to order tracking page
    window.location.href = 'order-tracking.html';
    
  } catch (error) {
    alert('Error: ' + error);
    console.error('Payment error:', error);
  }
}

// Show payment modal when buy button is clicked
if (buyBtn) {
  buyBtn.addEventListener('click', () => {
    console.log('Buy button clicked');
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    console.log('Cart contents:', cart);
    if (cart.length === 0) {
      alert('Your cart is empty!');
      return;
    }
    if (paymentModal) {
      console.log('Showing payment modal');
      paymentModal.style.display = 'block';
    } else {
      console.error('Payment modal element not found');
    }
  });
} else {
  console.error('Buy button element not found');
}

// Close modal when clicking the X
if (closeModal) {
  closeModal.addEventListener('click', () => {
    console.log('Close button clicked');
    paymentModal.style.display = 'none';
  });
}

// Close modal when clicking outside
window.addEventListener('click', (event) => {
  if (event.target === paymentModal) {
    console.log('Clicked outside modal');
    paymentModal.style.display = 'none';
  }
});

// Handle UPI payment
if (upiBtn) {
  console.log('Setting up UPI button listener');
  upiBtn.onclick = function() {
    console.log('UPI button clicked');
    handlePayment('UPI Payment');
  };
} else {
  console.error('UPI button not found');
}

// Handle Cash on Delivery
if (codBtn) {
  console.log('Setting up COD button listener');
  codBtn.onclick = function() {
    console.log('COD button clicked');
    handlePayment('Cash on Delivery');
  };
} else {
  console.error('COD button not found');
}

// Function to generate invoice content
function generateInvoiceContent(paymentMethod) {
  const cart = JSON.parse(localStorage.getItem('cart')) || [];
  const total = cartTotal.textContent;
  const date = new Date().toLocaleDateString();
  const time = new Date().toLocaleTimeString();
  const orderNumber = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');

  let itemsList = cart.map(item => 
    `${item.name} - ${item.price}`
  ).join('\n');

  return `
    CAFENA COFFEE SHOP
    ===================
    
    Invoice Number: ${orderNumber}
    Date: ${date}
    Time: ${time}
    Payment Method: ${paymentMethod}
    
    Items Ordered:
    -------------
    ${itemsList}
    
    Total Amount: $${total}
    
    Thank you for your order!
    This is a simulation invoice.
    No actual payment has been processed.
    
    -------------------------
    Cafena Coffee Shop
    Address: 30 North West New
    Phone: +1 (504) 446-0757
  `;
}

// Function to download invoice
function downloadInvoice(paymentMethod) {
  const invoiceContent = generateInvoiceContent(paymentMethod);
  const blob = new Blob([invoiceContent], { type: 'text/plain' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `cafena-invoice-${new Date().toISOString().slice(0,10)}.txt`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

// Initialize the cart
renderCart();

// Initialize location button if it exists
const locationBtn = document.getElementById('location-btn');
if (locationBtn) {
  locationBtn.addEventListener('click', () => {
    getUserLocation().catch(error => {
      alert(error);
    });
  });
}
