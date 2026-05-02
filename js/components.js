/**
 * Mystická Hvězda - Component Loader
 * Dynamically loads Header and Footer to avoid code duplication.
 * ALSO includes standalone hamburger menu handler (no module dependencies).
 */

// Load GA4 + cookie handler on every page (lazy, non-blocking)
(function () {
    const scriptTag = document.querySelector('script[src*="components.js"]');
    const scriptSrc = scriptTag ? scriptTag.getAttribute('src') : '';
    const basePath = scriptSrc.split(/js\/(?:dist\/)?components\.js/)[0] || '';

    // Analytics — always first (sets up dataLayer + consent stubs before banner loads)
    if (!window.gtag && !document.querySelector('script[src*="analytics-init.js"]')) {
        const s = document.createElement('script');
        s.src = basePath + 'js/analytics-init.js';
        s.defer = true;
        document.head.appendChild(s);
    }

    // Cookie handler — loads after analytics so consent update event is always caught
    if (!window.MH_COOKIE_HANDLER_INIT && !document.querySelector('script[src*="cookie-handler.js"]')) {
        const ch = document.createElement('script');
        ch.src = basePath + 'js/dist/cookie-handler.js';
        ch.defer = true;
        document.head.appendChild(ch);
    }

    if (!window.MH_FEEDBACK_WIDGET_INIT && !document.querySelector('script[src*="feedback-widget.js"]')) {
        const fw = document.createElement('script');
        fw.src = basePath + 'js/dist/feedback-widget.js';
        fw.defer = true;
        document.head.appendChild(fw);
    }
})();

document.addEventListener('DOMContentLoaded', async () => {
    // Determine the base path based on where this script is loaded from
    // This allows the component loader to work correctly from subdirectories (like /blog/ or /sk/)
    const scriptTag = document.querySelector('script[src*="components.js"]');
    const scriptSrc = scriptTag ? scriptTag.getAttribute('src') : '';
    const basePath = scriptSrc.split(/js\/(?:dist\/)?components\.js/)[0] || '';

    // Load header and footer in parallel for faster initial paint
    // Use high priority for header as it affects LCP/CLS
    await Promise.all([
        loadComponent('header-placeholder', `${basePath}components/header.html?v=6`, basePath, true),
        loadComponent('footer-placeholder', `${basePath}components/footer.html?v=13`, basePath, false)
    ]);

    // STANDALONE: Init hamburger menu + header scroll (no module dependency)
    // Must run BEFORE dispatching components:loaded, so navInitialized flag is set
    // before main.js's components:loaded listener calls initMobileNav().
    // This prevents the double-toggle bug caused by both handlers attaching a click listener.
    initStandaloneHeader();

    // Dispatch event to signal that UI shells are ready
    document.dispatchEvent(new Event('components:loaded'));
});

async function loadComponent(elementId, path, basePath = '', highPriority = false) {
    const element = document.getElementById(elementId);
    
    // Check if the component is already hardcoded or loaded
    // If we have hardcoded content, we don't need to load it
    const alreadyPresent = (elementId === 'header-placeholder' && document.querySelector('.header')) ||
                          (elementId === 'footer-placeholder' && document.querySelector('.footer'));
    
    if (!element && !alreadyPresent) return;
    
    // If it's already in the DOM, just ensure initialization runs
    if (alreadyPresent) {
        return;
    }

    try {
        const response = await fetch(path, highPriority ? { priority: 'high' } : {});
        if (!response.ok) throw new Error(`Failed to load ${path}`);

        let html = await response.text();

        // Create a temporary container to manipulate the DOM
        const temp = document.createElement('div');
        temp.innerHTML = html;

        // Fix relative paths for images and links if we are in a subdirectory
        if (basePath && basePath !== './' && basePath !== '/') {
            // Fix images
            temp.querySelectorAll('img').forEach(img => {
                const src = img.getAttribute('src');
                if (src && !src.startsWith('http') && !src.startsWith('/') && !src.startsWith('data:')) {
                    img.setAttribute('src', basePath + src);
                }
            });

            // Fix links
            temp.querySelectorAll('a').forEach(a => {
                const href = a.getAttribute('href');
                if (href && href !== '#' && !href.startsWith('http') && !href.startsWith('/') && !href.startsWith('mailto:') && !href.startsWith('tel:')) {
                    a.setAttribute('href', basePath + href);
                }
            });

            html = temp.innerHTML;
        }

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
    if (header.dataset.headerInitialized === 'true') return;
    header.dataset.headerInitialized = 'true';

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
    if (window.scrollY > 50) {
        handleScroll(); // Initial check only when restoring a scrolled page
    }

    // === HAMBURGER MENU ===
    const toggle = document.querySelector('.nav__toggle');
    const navList = document.querySelector('.nav__list');
    if (!toggle || !navList) return;

    // Prevent double initialization of mobile nav
    if (toggle.dataset.navInitialized === 'true') return;
    toggle.dataset.navInitialized = 'true';

    toggle.addEventListener('click', function (e) {
        e.stopPropagation();
        const isOpen = navList.classList.toggle('open');
        toggle.classList.toggle('active', isOpen);
        toggle.setAttribute('aria-expanded', String(isOpen));
        navList.setAttribute('aria-hidden', String(!isOpen));
    });

    // === MOBILE DROPDOWNS ===
    navList.querySelectorAll('.nav__link--dropdown-toggle').forEach(toggleLink => {
        toggleLink.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const item = toggleLink.closest('.nav__item--has-dropdown');
            if (!item) return;
            const isOpen = item.classList.contains('is-active');
            // Close all other dropdowns
            navList.querySelectorAll('.nav__item--has-dropdown.is-active').forEach(el => el.classList.remove('is-active'));
            // Toggle current
            item.classList.toggle('is-active', !isOpen);
        });
    });

    // Close menu when clicking a nav dropdown link (actual page link)
    navList.querySelectorAll('.nav__dropdown-link').forEach(link => {
        link.addEventListener('click', () => {
            navList.classList.remove('open');
            toggle.classList.remove('active');
            toggle.setAttribute('aria-expanded', 'false');
            navList.setAttribute('aria-hidden', 'true');
            navList.querySelectorAll('.nav__item--has-dropdown').forEach(el => el.classList.remove('is-active'));
        });
    });

    // Close menu when clicking a nav link (ignore dropdown toggles)
    navList.querySelectorAll('.nav__link:not(.nav__link--dropdown-toggle)').forEach(link => {
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

    initLanguageSwitcher();

}

/**
 * Language switcher logic
 */
function initLanguageSwitcher() {
    const switcher = document.querySelector('.lang-switcher');
    if (!switcher) return;

    const btn = switcher.querySelector('.lang-switcher__btn');
    const links = switcher.querySelectorAll('.lang-switcher__link');
    const currentText = switcher.querySelector('.lang-switcher__current');

    // Detect current language from URL
    const path = window.location.pathname;
    let currentLang = 'cs';
    if (path.includes('/sk/')) currentLang = 'sk';
    else if (path.includes('/pl/')) currentLang = 'pl';

    // Update UI initial state
    const langMap = { 'cs': 'CZ', 'sk': 'SK', 'pl': 'PL' };
    if (currentText) currentText.textContent = langMap[currentLang];

    links.forEach(link => {
        const linkLang = link.dataset.lang;
        if (linkLang === currentLang) {
            link.classList.add('active');
            // Also update the button text to match the active language just in case
            if (currentText) currentText.textContent = langMap[linkLang];
        } else {
            link.classList.remove('active');
        }
    });

    // Toggle dropdown
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        switcher.classList.toggle('open');
    });

    // Close on click outside
    document.addEventListener('click', () => switcher.classList.remove('open'));

    // Handle language change
    links.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetLang = link.dataset.lang;
            if (targetLang === currentLang) return;

            localStorage.setItem('mh_lang_pref', targetLang);
            
            // Generate target URL
            let newPath = window.location.pathname;
            const fileName = newPath.split('/').pop() || 'index.html';
            
            // Remove existing lang prefix
            newPath = newPath.replace(/\/(sk|pl)\//, '/');
            
            if (targetLang === 'cs') {
                // To root or CZ version (already handled by replace)
                window.location.href = newPath;
            } else {
                // To subdirectory
                // Handle local file protocol vs server
                if (window.location.protocol === 'file:') {
                    const baseMatch = newPath.match(/(.*\/MystickaHvezda\/)/);
                    if (baseMatch) {
                        window.location.href = baseMatch[1] + targetLang + '/' + fileName;
                    } else {
                        window.location.href = './' + targetLang + '/' + fileName;
                    }
                } else {
                    window.location.href = '/' + targetLang + '/' + fileName;
                }
            }
        });
    });
}
