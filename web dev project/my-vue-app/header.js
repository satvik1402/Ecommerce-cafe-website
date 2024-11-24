document.addEventListener("DOMContentLoaded", () => {
    fetch("header.html")  // Make sure the path to 'header.html' is correct
        .then((response) => {
            if (!response.ok) {
                throw new Error("Header file not found");
            }
            return response.text();
        })
        .then((data) => {
            document.getElementById("header").innerHTML = data;
        })
        .catch((error) => {
            console.error("Error loading header:", error);
        });
});
document.addEventListener("DOMContentLoaded", () => {
    const currentPage = window.location.pathname.split('/').pop();
    const cartButton = document.getElementById('cart-button');

    if (currentPage === "cart.html") {
        cartButton.textContent = "Home";
        cartButton.href = "index.html"; // Change to home page
    }
});