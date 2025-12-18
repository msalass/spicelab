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

  /* =========================
     APPLE-STYLE SCROLL FADE
     (Works with: staged OR single-block text)
  ========================= */
  const section = document.querySelector(".scroll-fade");
if (!section) return;

const image = section.querySelector(".fade-image");
const text = section.querySelector(".fade-text");

const clamp = (v) => Math.min(Math.max(v, 0), 1);

const update = () => {
  const rect = section.getBoundingClientRect();
  const vh = window.innerHeight;

  const start = vh * 0.8;
  const end = vh * 0.2;

  const t = clamp((start - rect.top) / (start - end));

  if (image) {
    image.style.opacity = 1 - t;
    image.style.transform = `scale(${1 - 0.15 * t})`;
  }

  if (text) {
    text.style.opacity = t;
  }
};

update();
window.addEventListener("scroll", update, { passive: true });
window.addEventListener("resize", update);
