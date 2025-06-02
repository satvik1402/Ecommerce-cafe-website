const testimonialContainer = document.getElementById('testimonialContainer');
const nextBtn = document.getElementById('nextBtn');
const prevBtn = document.getElementById('prevBtn');

let currentIndex = 0;
const testimonials = document.querySelectorAll('.testimonial-item');
const totalTestimonials = testimonials.length;

// Move to next testimonial
nextBtn.addEventListener('click', () => {
    if (currentIndex < totalTestimonials - 1) {
        currentIndex++;
    } else {
        currentIndex = 0; // Loop back to first
    }
    updateSlidePosition();
});

// Move to previous testimonial
prevBtn.addEventListener('click', () => {
    if (currentIndex > 0) {
        currentIndex--;
    } else {
        currentIndex = totalTestimonials - 1; // Loop back to last
    }
    updateSlidePosition();
});

function updateSlidePosition() {
    const slideWidth = testimonials[0].clientWidth;
    testimonialContainer.style.transform = `translateX(-${currentIndex * slideWidth}px)`;
}