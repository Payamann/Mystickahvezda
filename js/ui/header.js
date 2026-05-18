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

    // The first real scroll event applies the scrolled state. Avoiding an eager
    // scrollY read prevents a mobile Lighthouse forced reflow on first paint.
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

    const isMobileNav = () => window.matchMedia('(max-width: 992px)').matches;
    const dropdownItems = Array.from(navList.querySelectorAll('.nav__item--has-dropdown'));
    const closeDropdowns = (except = null) => {
        dropdownItems.forEach((item) => {
            if (item === except) return;
            item.classList.remove('is-active');
            item.querySelector('.nav__link--dropdown-toggle')?.setAttribute('aria-expanded', 'false');
        });
    };
    const setMenuOpen = (open, focusFirstLink = false) => {
        navList.classList.toggle('open', open);
        toggle.classList.toggle('active', open);
        toggle.setAttribute('aria-expanded', String(open));
        document.body.classList.toggle('nav-open', open);

        if (isMobileNav()) {
            navList.setAttribute('aria-hidden', String(!open));
        } else {
            navList.removeAttribute('aria-hidden');
        }

        if (!open) closeDropdowns();
        if (open && focusFirstLink) {
            navList.querySelector('a, button')?.focus({ preventScroll: true });
        }
    };
    const syncNavA11y = () => {
        if (isMobileNav() && !navList.classList.contains('open')) {
            navList.setAttribute('aria-hidden', 'true');
            return;
        }
        navList.removeAttribute('aria-hidden');
    };

    if (!navList.id) navList.id = 'primary-navigation';
    toggle.setAttribute('aria-controls', navList.id);
    syncNavA11y();

    dropdownItems.forEach((item, index) => {
        const toggleLink = item.querySelector('.nav__link--dropdown-toggle');
        const dropdown = item.querySelector('.nav__dropdown');
        if (!toggleLink || !dropdown) return;

        if (!dropdown.id) dropdown.id = `nav-dropdown-${index + 1}`;
        toggleLink.setAttribute('role', 'button');
        toggleLink.setAttribute('aria-haspopup', 'true');
        toggleLink.setAttribute('aria-expanded', 'false');
        toggleLink.setAttribute('aria-controls', dropdown.id);
    });

    // Toggle menu
    toggle.addEventListener('click', () => {
        setMenuOpen(!navList.classList.contains('open'), true);
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

                const isOpen = parentItem.classList.contains('is-active');
                closeDropdowns(parentItem);
                parentItem.classList.toggle('is-active', !isOpen);
                toggleBtn.setAttribute('aria-expanded', String(!isOpen));
            }
        });

        toggleBtn.addEventListener('keydown', (e) => {
            if (e.key !== ' ') return;
            e.preventDefault();
            toggleBtn.click();
        });
    });

    // Close menu on normal link click (ignore dropdown toggles)
    navList.querySelectorAll('a:not(.nav__link--dropdown-toggle)').forEach(link => {
        link.addEventListener('click', () => {
            setMenuOpen(false);
        });
    });

    // Close menu on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && navList.classList.contains('open')) {
            setMenuOpen(false);
            toggle.focus();
        }
    });

    // Close menu on click outside
    document.addEventListener('click', (e) => {
        if (!toggle.contains(e.target) && !navList.contains(e.target) && navList.classList.contains('open')) {
            setMenuOpen(false);
        }
    });

    window.addEventListener('resize', syncNavA11y);
}
