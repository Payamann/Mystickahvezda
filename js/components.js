/**
 * Mystická Hvězda - Component Loader
 * Dynamically loads Header and Footer to avoid code duplication.
 * ALSO includes standalone hamburger menu handler (no module dependencies).
 */

document.addEventListener('DOMContentLoaded', async () => {
    // Determine the base path based on where this script is loaded from
    // This allows the component loader to work correctly from subdirectories (like /blog/ or /sk/)
    const scriptTag = document.querySelector('script[src*="js/components.js"]');
    const scriptSrc = scriptTag ? scriptTag.getAttribute('src') : '';
    const basePath = scriptSrc.includes('js/components.js') ? scriptSrc.split('js/components.js')[0] : '';

    console.log(`[components.js] Base path detected: "${basePath}"`);

    // Load header and footer in parallel for faster initial paint
    await Promise.all([
        loadComponent('header-placeholder', `${basePath}components/header.html?v=2`),
        loadComponent('footer-placeholder', `${basePath}components/footer.html?v=2`)
    ]);

    // Dispatch event to signal that UI shells are ready
    // This allows main.js to attach event listeners to the newly injected elements
    document.dispatchEvent(new Event('components:loaded'));

    // STANDALONE: Init hamburger menu + header scroll (no module dependency)
    // This ensures menu works even if main.js module fails to load
    initStandaloneHeader();
});

async function loadComponent(elementId, path) {
    const element = document.getElementById(elementId);
    if (!element) return;

    try {
        const response = await fetch(path);
        if (!response.ok) throw new Error(`Failed to load ${path}`);

        const html = await response.text();
        element.innerHTML = html;

        // Replace the placeholder with the actual content
        element.replaceWith(...element.childNodes);

    } catch (error) {
        console.error(`Error loading component ${path}:`, error);
        element.innerHTML = `<div class="error-loading">Failed to load content.</div>`;
    }
}

/**
 * Standalone header initialization - works without ES module imports.
 * Handles: hamburger toggle, nav dropdown, scroll effect, escape key.
 */
function initStandaloneHeader() {
    const header = document.querySelector('.header');
    if (!header) return;

    // Prevent double-init if main.js already initialized
    if (header.dataset.initialized === 'true') return;
    header.dataset.initialized = 'true';

    // === SCROLL EFFECT ===
    let ticking = false;
    function handleScroll() {
        if (!ticking) {
            requestAnimationFrame(() => {
                if (window.scrollY > 50) {
                    header.classList.add('scrolled');
                } else {
                    header.classList.remove('scrolled');
                }
                ticking = false;
            });
            ticking = true;
        }
    }
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial check

    // === HAMBURGER MENU ===
    const toggle = document.querySelector('.nav__toggle');
    const navList = document.querySelector('.nav__list');
    if (!toggle || !navList) return;

    toggle.addEventListener('click', function (e) {
        e.stopPropagation();
        const isOpen = navList.classList.toggle('open');
        toggle.classList.toggle('active', isOpen);
        toggle.setAttribute('aria-expanded', String(isOpen));
        navList.setAttribute('aria-hidden', String(!isOpen));
    });

    // Close menu when clicking a nav link
    navList.querySelectorAll('.nav__link').forEach(link => {
        link.addEventListener('click', () => {
            navList.classList.remove('open');
            toggle.classList.remove('active');
            toggle.setAttribute('aria-expanded', 'false');
            navList.setAttribute('aria-hidden', 'true');
        });
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!header.contains(e.target) && navList.classList.contains('open')) {
            navList.classList.remove('open');
            toggle.classList.remove('active');
            toggle.setAttribute('aria-expanded', 'false');
            navList.setAttribute('aria-hidden', 'true');
        }
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

    console.log('[components.js] Standalone header initialized');
}
