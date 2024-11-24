// Import menu items
import { menuItems } from './menu.js';

// Get references to DOM elements
const menuContainer = document.querySelector('.menu-items');
const tabButtons = document.querySelectorAll('.tab-button');

// Function to render menu items
// Import menu items


// Function to render menu items
function renderMenuItems(items) {
  // Clear existing items
  const menuContainer = document.querySelector('.card-container');
  menuContainer.innerHTML = '';

  // Create and insert new items
  items.forEach((item) => {
    const card = document.createElement('div');
    card.classList.add('card');
    card.innerHTML = `
      <img src="${item.image}" alt="${item.name}">
      <div class="card-body">
        <h4 class="card-title">${item.name}</h4>
        <p class="card-price">
          <span class="discounted">$${item.price}</span>
          <span class="original">$${item.oldPrice}</span>
        </p>
        <div class="card-buttons">
          <button class="btn btn-primary">Order Now</button>
          <button class="btn btn-secondary">Add to Cart</button>
        </div>
      </div>
    `;
    menuContainer.appendChild(card);
  });
}


// Filter menu items by category
function filterMenu(category) {
  // Normalize category to lowercase for consistent matching
  const normalizedCategory = category.toLowerCase();

  // Check if the category is "all", then show all items
  if (normalizedCategory === "all") {
    renderMenuItems(menuItems);
  } else {
    // Filter items based on the normalized category
    const filteredItems = menuItems.filter(
      (item) => item.category.toLowerCase() === normalizedCategory
    );
    renderMenuItems(filteredItems);
  }
}


// Add event listeners to buttons
tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    // Remove 'active' class from all buttons
    tabButtons.forEach((btn) => btn.classList.remove("active"));

    // Add 'active' class to the clicked button
    button.classList.add("active");

    // Get category from button text
    const category = button.textContent.trim();

    // Filter menu based on category
    filterMenu(category);
  });
});


// Initialize the menu with all items
renderMenuItems(menuItems);

// Function to handle "Add to Cart"
function addToCart(item) {
  // Get the cart from localStorage (or initialize an empty one)
  let cart = JSON.parse(localStorage.getItem("cart")) || [];

  // Add the selected item to the cart
  cart.push(item);

  // Save the updated cart back to localStorage
  localStorage.setItem("cart", JSON.stringify(cart));

  alert(`${item.name} has been added to the cart!`);
}

// Add event listener for "Add to Cart" button
menuContainer.addEventListener("click", (event) => {
  if (event.target.classList.contains("btn-secondary")) { // Adjust button class if needed
    const card = event.target.closest(".card");
    const name = card.querySelector(".card-title").textContent.trim();
    const price = card.querySelector(".card-price .discounted").textContent.trim();
    const image = card.querySelector("img").src;

    // Create an item object
    const item = {
      name,
      price,
      image,
    };

    // Add the item to the cart
    addToCart(item);
  }
});

