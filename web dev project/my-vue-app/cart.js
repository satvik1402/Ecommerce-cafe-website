// Get references to the DOM elements
const cartContent = document.getElementById('cart-content');
const cartTotal = document.getElementById('cart-total');

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

// Initialize the cart
renderCart();
