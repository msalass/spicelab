document.addEventListener('DOMContentLoaded', () => {
  // Mobile menu toggle (your original code)
  var toggle = document.querySelector(".menu-toggle");
  var navLinks = document.querySelector(".nav-links");
  if (toggle && navLinks) {
    toggle.addEventListener("click", function () {
      navLinks.classList.toggle("open");
    });
  }

  // Intersection Observer for scroll-triggered animations (existing + new for services section)
  const options = {
    root: null, // Viewport
    rootMargin: '0px',
    threshold: 0.1 // Trigger when 10% visible
  };

  const callback = (entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        if (entry.target.classList.contains('fade-in-text')) {
          entry.target.classList.add('visible'); // Fade in text
          const image = entry.target.previousElementSibling; // Image before the text div
          if (image && image.classList.contains('fade-out-image')) {
            image.classList.add('hidden'); // Fade out image
          }
        } else {
          entry.target.classList.add('visible'); // For other elements like hero/section
        }
        observer.unobserve(entry.target); // One-time trigger
      }
    });
  };

  const observer = new IntersectionObserver(callback, options);

  // Observe existing elements (e.g., hero, sections, footer)
  document.querySelectorAll('.hero, .section, .form-section, footer').forEach(el => {
    observer.observe(el);
  });

  // NEW: Observe the services text div specifically
  const serviceText = document.querySelector('.fade-in-text');
  if (serviceText) {
    observer.observe(serviceText);
  }
});
