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
  const textContainer = section.querySelector(".fade-text");
  const stage1 = section.querySelector(".stage-1");
  const stage2 = section.querySelector(".stage-2");

  const clamp01 = (x) => Math.min(Math.max(x, 0), 1);

  const update = () => {
    const rect = section.getBoundingClientRect();
    const vh = window.innerHeight;

    // Fade window: tweak these if you want earlier/later transitions
    const start = vh * 0.8;
    const end = vh * 0.2;

    const progress = (start - rect.top) / (start - end);
    const t = clamp01(progress);

    // Image fade + subtle scale (Apple feel)
    if (image) {
      image.style.opacity = 1 - t;
      image.style.transform = `scale(${1 - 0.15 * t})`;
    }

    // If stages exist, crossfade between them.
    // Otherwise, fade the entire text container in/out.
    if (textContainer) {
      if (stage1 || stage2) {
        // Ensure container is visible; stages control the content
        textContainer.style.opacity = 1;

        if (stage1) stage1.style.opacity = Math.max(0, 1 - t * 2);      // 1 → 0 over first half
        if (stage2) stage2.style.opacity = Math.max(0, (t - 0.5) * 2);  // 0 → 1 over second half
      } else {
        textContainer.style.opacity = t; // simple crossfade (no stages)
      }
    }
  };

  // Run once immediately (important), then on scroll/resize
  update();
  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
});
