document.addEventListener("DOMContentLoaded", () => {

  console.log("JS LOADED");

  window.addEventListener("scroll", () => {
    const section = document.querySelector(".scroll-fade");
    if (!section) return;

    const rect = section.getBoundingClientRect();
    const vh = window.innerHeight;

    const start = vh * 0.8;
    const end = vh * 0.3;

    const progress = (start - rect.top) / (start - end);
    const t = Math.min(Math.max(progress, 0), 1);

    const image = section.querySelector(".fade-image");
    const text = section.querySelector(".fade-text");

    if (image) image.style.opacity = 1 - t;
    if (text) text.style.opacity = t;
  });

});
