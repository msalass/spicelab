document.addEventListener("DOMContentLoaded", () => {

  /* =========================================================
     MOBILE MENU TOGGLE
  ========================================================= */
  const toggle = document.querySelector(".menu-toggle");
  const navLinks = document.querySelector(".nav-links");

  if (toggle && navLinks) {
    toggle.addEventListener("click", () => {
      navLinks.classList.toggle("open");
    });
  }

  /* =========================================================
     INTERSECTION OBSERVER
     (Hero, generic sections, footer)
  ========================================================= */
  const observerOptions = {
    root: null,
    rootMargin: "0px",
    threshold: 0.1
  };

  const observerCallback = (entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
      }
    });
  };

  const observer = new IntersectionObserver(
    observerCallback,
    observerOptions
  );

  document.querySelectorAll(
    ".hero, .section, footer"
  ).forEach(el => observer.observe(el));

  /* =========================================================
     APPLE-STYLE MULTI-STAGE SCROLL FADE
     (Image → Text Stage 1 → Text Stage 2)
  ========================================================= */
  window.addEventListener("scroll", () => {
    const section = document.querySelector(".scroll-fade");
    if (!section) return;

    const rect = section.getBoundingClientRect();
    const vh = window.innerHeight;

    /*
      Fade window:
      - starts when section enters viewport
      - ends near top third
    */
    const start = vh * 0.8;
    const end = vh * 0.2;

    const progress = (start - rect.top) / (start - end);
    const t = Math.min(Math.max(progress, 0), 1);

    const image = section.querySelector(".fade-image");
    const stage1 = section.querySelector(".stage-1");
    const stage2 = section.querySelector(".stage-2");

    /* Image: fade + subtle scale */
    if (image) {
      image.style.opacity = 1 - t;
      image.style.transform = `scale(${1 - 0.15 * t})`;
    }

    /* Text stage 1 (first half) */
    if (stage1) {
      stage1.style.opacity = Math.max(0, 1 - t * 2);
    }

    /* Text stage 2 (second half) */
    if (stage2) {
      stage2.style.opacity = Math.max(0, (t - 0.5) * 2);
    }
  });

});
