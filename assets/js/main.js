document.addEventListener('DOMContentLoaded', () => {
  // Mobile menu toggle
  var toggle = document.querySelector(".menu-toggle");
  var navLinks = document.querySelector(".nav-links");
  if (toggle && navLinks) {
    toggle.addEventListener("click", function () {
      navLinks.classList.toggle("open");
    });
  }

  // Intersection Observer with adjusted options for delayed trigger
  const options = {
    root: null, // Viewport
    rootMargin: '-100px', // Trigger when 100px from view bottom for scroll-down effect
    threshold: 0.2 // Trigger when 20% visible
  };

  const callback = (entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        if (entry.target.classList.contains('fade-in-content')) {
          entry.target.classList.add('visible'); // Fade in content (heading + text)
          const image = entry.target.previousElementSibling; // Image before content div
          if (image && image.classList.contains('fade-out-image')) {
            image.classList.add('hidden'); // Fade out image
          }
        } else {
          entry.target.classList.add('visible'); // For other elements
        }
        observer.unobserve(entry.target); // One-time
      }
    });
  };

  const observer = new IntersectionObserver(callback, options);

  // Observe existing elements
  document.querySelectorAll('.hero, .section, .form-section, footer').forEach(el => {
    observer.observe(el);
  });

  // Observe the support section content
  const supportContent = document.querySelector('.fade-in-content');
  if (supportContent) {
    observer.observe(supportContent);
  }
});
