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
