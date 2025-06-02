// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Get the header element
    const header = document.getElementById('header');
    if (!header) {
        console.warn('Header element not found');
        return;
    }

    // Get the existing header content from header.html
    fetch('header.html')
        .then(response => response.text())
        .then(html => {
            header.innerHTML = html;
            
            // Add active class to current page link
            const currentPath = window.location.pathname.split('/').pop() || 'index.html';
            const navLinks = header.querySelectorAll('a[href]');
            
            navLinks.forEach(link => {
                const linkPath = link.getAttribute('href');
                if (linkPath === currentPath || 
                    (currentPath === 'index.html' && linkPath === '#')) {
                    link.classList.add('active');
                }
                
                // Handle smooth scrolling for anchor links
                if (linkPath && linkPath.startsWith('#')) {
                    link.addEventListener('click', function(e) {
                        e.preventDefault();
                        const targetId = this.getAttribute('href');
                        const targetElement = document.querySelector(targetId);
                        if (targetElement) {
                            window.scrollTo({
                                top: targetElement.offsetTop - 100,
                                behavior: 'smooth'
                            });
                        }
                    });
                }
            });
            
            // Update cart count
            updateCartCount();
            
            // Handle cart button on cart page
            const currentPage = window.location.pathname.split('/').pop();
            const cartButton = document.getElementById('cart-button');
            
            if (currentPage === 'cart.html' && cartButton) {
                cartButton.textContent = 'Home';
                cartButton.href = 'index.html';
            }
        })
        .catch(error => {
            console.error('Error loading header:', error);
            header.innerHTML = '<div class="error">Error loading navigation</div>';
        });
});

// Function to update cart count
function updateCartCount() {
    const cartLink = document.querySelector('.cart-link');
    if (cartLink) {
        const cart = JSON.parse(localStorage.getItem('cart')) || [];
        const cartCount = cart.length;
        const countElement = cartLink.querySelector('.cart-count') || document.createElement('span');
        
        if (!countElement.classList.contains('cart-count')) {
            countElement.classList.add('cart-count');
            cartLink.appendChild(countElement);
        }
        
        if (cartCount > 0) {
            countElement.textContent = cartCount;
            countElement.style.display = 'inline-block';
        } else {
            countElement.style.display = 'none';
        }
    }
}