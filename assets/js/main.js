document.addEventListener("DOMContentLoaded", function () {
  // =========================
  // MOBILE MENU TOGGLE
  // =========================
  const mobileMenuButton = document.getElementById("mobile-menu-button");
  const mobileMenu = document.getElementById("mobile-menu");
  const menuIcon = document.getElementById("menu-icon");

  if (mobileMenuButton && mobileMenu) {
    let isMenuOpen = false;

    mobileMenuButton.addEventListener("click", function () {
      isMenuOpen = !isMenuOpen;

      mobileMenu.classList.toggle("is-open");

      if (menuIcon) {
        if (isMenuOpen) {
          menuIcon.setAttribute("d", "M6 18L18 6M6 6l12 12");
        } else {
          menuIcon.setAttribute("d", "M4 6h16M4 12h16M4 18h16");
        }
      }
    });

    const menuLinks = document.querySelectorAll(".menu-link");
    menuLinks.forEach((link) => {
      link.addEventListener("click", function () {
        if (isMenuOpen) {
          isMenuOpen = false;
          mobileMenu.classList.remove("is-open");

          if (menuIcon) {
            menuIcon.setAttribute("d", "M4 6h16M4 12h16M4 18h16");
          }
        }
      });
    });
  }

  // =========================
  // SCROLL ANIMATIONS (si existen)
  // =========================
  const observerTargets = document.querySelectorAll(".hero, .section, footer");

  if (observerTargets.length > 0 && "IntersectionObserver" in window) {
    const observerOptions = {
      root: null,
      rootMargin: "0px",
      threshold: 0.1,
    };

    const observerCallback = (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);

    observerTargets.forEach((el) => {
      observer.observe(el);
    });
  }

  // =========================
  // APPLE-STYLE CROSSFADE (si existe)
  // =========================
  const section = document.querySelector(".scroll-fade");

  if (section) {
    const image = section.querySelector(".fade-image");
    const stage1 = section.querySelector(".stage-1");
    const stage2 = section.querySelector(".stage-2");

    if (image && stage1 && stage2) {
      const clamp = (v) => Math.min(Math.max(v, 0), 1);

      const update = () => {
        const rect = section.getBoundingClientRect();
        const vh = window.innerHeight;

        const start = vh * 0.8;
        const end = vh * 0.4;

        const t = clamp((start - rect.top) / (start - end));

        image.style.opacity = 1 - t;
        image.style.transform = `scale(${1 - 0.15 * t})`;

        stage1.style.opacity = Math.max(0, 1 - t * 2);
        stage2.style.opacity = Math.max(0, (t - 0.5) * 2);
      };

      update();
      window.addEventListener("scroll", update, { passive: true });
      window.addEventListener("resize", update);
    }
  }
});
