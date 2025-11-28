document.addEventListener('DOMContentLoaded', () => {
  // Mobile menu toggle
  var toggle = document.querySelector(".menu-toggle");
  var navLinks = document.querySelector(".nav-links");
  if (toggle && navLinks) {
    toggle.addEventListener("click", function () {
      navLinks.classList.toggle("open");
    });
  }

  // Intersection Observer for scroll-triggered animations
  const options = {
    root: null, // Use the viewport as the root
    rootMargin: '0px', // No margin adjustment
    threshold: 0.1 // Trigger when 10% of the element is visible
  };

  const callback = (entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target); // Stop observing after animation (one-time trigger)
      }
    });
  };

  const observer = new IntersectionObserver(callback, options);

  // Observe all scroll-animatable elements
  document.querySelectorAll('.hero, .section, .project-card, .form-section, footer').forEach(el => {
    observer.observe(el);
  });
});
