import { throttle } from '../utils/helpers.js';

/* ============================================
   2. HEADER SCROLL EFFECT
   ============================================ */
export function initHeader() {
    const header = document.querySelector('.header');
    if (!header) return;

    // Throttled scroll handler for better performance
    // Throttled scroll handler for better performance
    const handleScroll = throttle(() => {
        const currentScroll = window.pageYOffset || document.documentElement.scrollTop;

        if (currentScroll > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    }, 100);

    window.addEventListener('scroll', handleScroll, { passive: true });

    // Initial check (in case page is loaded already scrolled)
    handleScroll();
}

/* ============================================
   3. MOBILE NAVIGATION
   ============================================ */
export function initMobileNav() {
    const toggle = document.querySelector('.nav__toggle');
    const navList = document.querySelector('.nav__list');

    if (!toggle || !navList) return;

    // Toggle menu
    toggle.addEventListener('click', () => {
        const isOpen = navList.classList.toggle('open');
        toggle.classList.toggle('active');

        // Accessibility: update ARIA attributes
        toggle.setAttribute('aria-expanded', isOpen);
        navList.setAttribute('aria-hidden', !isOpen);
    });

    // Close menu on link click
    navList.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            navList.classList.remove('open');
            toggle.classList.remove('active');
            toggle.setAttribute('aria-expanded', 'false');
            navList.setAttribute('aria-hidden', 'true');
        });
    });

    // Close menu on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && navList.classList.contains('open')) {
            navList.classList.remove('open');
            toggle.classList.remove('active');
            toggle.setAttribute('aria-expanded', 'false');
            navList.setAttribute('aria-hidden', 'true');
            toggle.focus();
        }
    });

    // Close menu on click outside
    document.addEventListener('click', (e) => {
        if (!toggle.contains(e.target) && !navList.contains(e.target) && navList.classList.contains('open')) {
            navList.classList.remove('open');
            toggle.classList.remove('active');
            toggle.setAttribute('aria-expanded', 'false');
            navList.setAttribute('aria-hidden', 'true');
        }
    });
}
