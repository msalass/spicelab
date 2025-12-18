document.addEventListener("DOMContentLoaded", () => {
  /* =========================
     MOBILE MENU TOGGLE
  ========================= */
  const toggle = document.querySelector(".menu-toggle");
  const navLinks = document.querySelector(".nav-links");

  if (toggle && navLinks) {
    toggle.addEventListener("click", () => {
      navLinks.classList.toggle("open");
    });
  }

  /* =========================
     INTERSECTION OBSERVER
     (Hero, generic sections, footer)
  ========================= */
  const observerOptions = {
    root: null,
    rootMargin: "0px",
    threshold: 0.1,
  };

  const observerCallback = (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) entry.target.classList.add("visible");
    });
  };

  const observer = new IntersectionObserver(observerCallback, observerOptions);

  document.querySelectorAll(".hero, .section, footer").forEach((el) => {
    observer.observe(el);
  });

document.addEventListener("DOMContentLoaded", () => {

  /* =========================
     APPLE-STYLE SCROLL CROSSFADE
     (2 text stages, reversible)
  ========================= */
  const section = document.querySelector(".scroll-fade");
  if (!section) return;

  const image = section.querySelector(".fade-image");
  const stage1 = section.querySelector(".stage-1");
  const stage2 = section.querySelector(".stage-2");

  const clamp = (v) => Math.min(Math.max(v, 0), 1);

  const update = () => {
    const rect = section.getBoundingClientRect();
    const vh = window.innerHeight;

    const start = vh * 0.8;
    const end = vh * 0.25;

    const t = clamp((start - rect.top) / (start - end));

    /* Image: fade + subtle scale */
    image.style.opacity = 1 - t;
    image.style.transform = `scale(${1 - 0.15 * t})`;

    /* Text stages */
    stage1.style.opacity = Math.max(0, 1 - t * 2);
    stage2.style.opacity = Math.max(0, (t - 0.5) * 2);
  };

  update();
  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
});

