document.addEventListener('DOMContentLoaded', () => {
    // Toggle del menú móvil
    const header = document.getElementById('header');
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');
    const menuIcon = document.getElementById('menu-icon');
    
    if (mobileMenuButton && mobileMenu) {
        let isMenuOpen = false;
        
        mobileMenuButton.addEventListener('click', function() {
            isMenuOpen = !isMenuOpen;
            
            if (isMenuOpen) {
                // Agrear borde redondeado
                header?.classList.add('rounded-b-xl');

                // Abrir menú con animación
                mobileMenu.classList.remove('max-h-0');
                mobileMenu.classList.add('max-h-96');
                
                // Cambiar icono a X con animación
                menuIcon?.setAttribute('d', 'M6 18L18 6M6 6l12 12');
                
                // Animación de entrada para los enlaces
                const menuLinks = document.querySelectorAll('.menu-link');
                menuLinks.forEach((link, index) => {
                    setTimeout(() => {
                        link.classList.remove('opacity-0');
                        link.classList.add('animate-in', 'opacity-100');
                    }, 100 + (index * 80)); // Efecto cascada
                });
                
            } else {
                // Cerrar menú con animación
                mobileMenu.classList.remove('max-h-96');
                mobileMenu.classList.add('max-h-0');

                // Eliminar borde redondeado
                header?.classList.remove('rounded-b-xl');
                
                // Cambiar icono a hamburguesa
                menuIcon?.setAttribute('d', 'M4 6h16M4 12h16M4 18h16');

                // Animación de salida para los enlaces
                const menuLinks = document.querySelectorAll('.menu-link');
                menuLinks.forEach((link) => {
                    setTimeout(() => {
                        link.classList.remove('animate-in', 'opacity-100');
                        link.classList.add('opacity-0')
                    }, 400);
                });
            };
        });
        
        // Cerrar menú al hacer clic en un enlace
        const menuLinks = document.querySelectorAll('.menu-link');
        menuLinks.forEach(link => {
            link.addEventListener('click', function() {
                if (isMenuOpen) {
                    mobileMenuButton.click(); // Simular clic para cerrar
                };
            });
        });
    };

    // Observer para animaciones al hacer scroll
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1,
    };

    const observerCallback = (entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);
    
    document.querySelectorAll('.hero, .section, footer').forEach((el) => {
        observer.observe(el);
    });

    // Efecto de fundido cruzado al hacer scroll (estilo Apple)
    const section = document.querySelector('.scroll-fade');
    
    if (!section) return;
    
    const image = section.querySelector('.fade-image');
    const stage1 = section.querySelector('.stage-1');
    const stage2 = document.querySelector('.stage-2');
    
    // Limita valores entre 0 y 1
    const clamp = (v) => Math.min(Math.max(v, 0), 1);
    
    const update = () => {
        const rect = section.getBoundingClientRect();
        const vh = window.innerHeight;
        
        // Puntos para el efecto de fundido
        const start = vh * 0.8;
        const end = vh * 0.4;
        
        // Progreso del scroll (0 a 1)
        const t = clamp((start - rect.top) / (start - end));
        
        // Imagen: opacidad y escala
        image.style.opacity = 1 - t;
        image.style.transform = `scale(${1 - 0.15 * t})`;
        
        // Texto: fundido cruzado entre etapas
        stage1.style.opacity = Math.max(0, 1 - t * 2);
        stage2.style.opacity = Math.max(0, (t - 0.5) * 2);
    };
    
    // Inicializa y configura listeners
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
});