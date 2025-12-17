document.addEventListener('DOMContentLoaded', () => {
  // Mobile menu toggle
  var toggle = document.querySelector(".menu-toggle");
  var navLinks = document.querySelector(".nav-links");
  if (toggle && navLinks) {
    toggle.addEventListener("click", function () {
      navLinks.classList.toggle("open");
    });
  }

  // Intersection Observer
  const options = {
    root: null,
    rootMargin: '0px',
    threshold: 0.1
  };

  const callback = (entries, observer) => {
    entries.forEach(entry => {
      if (entry.target.classList.contains('fade-in-content')) {
        const image = entry.target.previousElementSibling;
        if (entry.isIntersecting) {
          entry.target.classList.add('visible'); // Show text
          if (image) image.classList.add('hidden'); // Hide image
        } else {
          entry.target.classList.remove('visible'); // Hide text on scroll up
          if (image) image.classList.remove('hidden'); // Show image on scroll up
        }
      } else if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  };

  const observer = new IntersectionObserver(callback, options);

  // Observe existing elements
  document.querySelectorAll('.hero, .section, .form-section, footer').forEach(el => {
    observer.observe(el);
  });

  // Observe the support content (do not unobserve for reverse effect)
  const supportContent = document.querySelector('.fade-in-content');
  if (supportContent) {
    observer.observe(supportContent);
  }
});

/* =========================================
   APPLE-STYLE SCROLL CROSSFADE
========================================= */

window.addEventListener("scroll", () => {
  const section = document.querySelector(".scroll-fade");
  if (!section) return;

  const rect = section.getBoundingClientRect();
  const windowHeight = window.innerHeight;

  // Define fade range
  const start = windowHeight * 0.8;
  const end = windowHeight * 0.3;

  const progress = (start - rect.top) / (start - end);
  const clamped = Math.min(Math.max(progress, 0), 1);

  const image = section.querySelector(".fade-image");
  const text = section.querySelector(".fade-text");

  if (image) {
    image.style.opacity = 1 - clamped;
  }
  if (text) {
    text.style.opacity = clamped;
  }
});


