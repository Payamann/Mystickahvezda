import { throttle } from '../utils/helpers.js';

/* ============================================
   2. HEADER SCROLL EFFECT
   ============================================ */
export function initHeader() {
    const header = document.querySelector('.header');
    if (!header) return;

    // Prevent double initialization
    if (header.dataset.headerInitialized === 'true') return;
    header.dataset.headerInitialized = 'true';

    // Throttled scroll handler for better performance
    const handleScroll = throttle(() => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    }, 100);

    window.addEventListener('scroll', handleScroll, { passive: true });

    // Initial check (in case page is loaded already scrolled)
    if (window.scrollY > 50) {
        requestAnimationFrame(handleScroll);
    }
}

/* ============================================
   3. MOBILE NAVIGATION
   ============================================ */
export function initMobileNav() {
    const toggle = document.querySelector('.nav__toggle');
    const navList = document.querySelector('.nav__list');

    if (!toggle || !navList) return;

    // Prevent double initialization
    if (toggle.dataset.navInitialized === 'true') return;
    toggle.dataset.navInitialized = 'true';

    // Toggle menu
    toggle.addEventListener('click', () => {
        const isOpen = navList.classList.toggle('open');
        toggle.classList.toggle('active');

        // Accessibility: update ARIA attributes
        toggle.setAttribute('aria-expanded', isOpen);
        navList.setAttribute('aria-hidden', !isOpen);
    });

    // Dropdown toggles (accordion effect)
    const dropdownToggles = navList.querySelectorAll('.nav__link--dropdown-toggle');
    dropdownToggles.forEach(toggleBtn => {
        toggleBtn.addEventListener('click', (e) => {
            // Always prevent href="#" from scrolling to top
            e.preventDefault();

            // Only act like an accordion on mobile view (where dropdown is static)
            if (window.innerWidth <= 992) {
                const parentItem = toggleBtn.closest('.nav__item--has-dropdown');

                // Close other open dropdowns for a clean accordion effect
                navList.querySelectorAll('.nav__item--has-dropdown.is-active').forEach(item => {
                    if (item !== parentItem) item.classList.remove('is-active');
                });

                parentItem.classList.toggle('is-active');
            }
        });
    });

    // Close menu on normal link click (ignore dropdown toggles)
    navList.querySelectorAll('a:not(.nav__link--dropdown-toggle)').forEach(link => {
        link.addEventListener('click', () => {
            navList.classList.remove('open');
            toggle.classList.remove('active');
            toggle.setAttribute('aria-expanded', 'false');
            navList.setAttribute('aria-hidden', 'true');
            // Reset dropdowns
            navList.querySelectorAll('.nav__item--has-dropdown.is-active').forEach(item => item.classList.remove('is-active'));
        });
    });

    // Close menu on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && navList.classList.contains('open')) {
            navList.classList.remove('open');
            toggle.classList.remove('active');
            toggle.setAttribute('aria-expanded', 'false');
            navList.setAttribute('aria-hidden', 'true');
            // Reset dropdowns
            navList.querySelectorAll('.nav__item--has-dropdown.is-active').forEach(item => item.classList.remove('is-active'));
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
            // Reset dropdowns
            navList.querySelectorAll('.nav__item--has-dropdown.is-active').forEach(item => item.classList.remove('is-active'));
        }
    });
}
