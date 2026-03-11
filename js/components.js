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
        loadComponent('header-placeholder', `${basePath}components/header.html?v=2`, basePath),
        loadComponent('footer-placeholder', `${basePath}components/footer.html?v=2`, basePath)
    ]);

    // Dispatch event to signal that UI shells are ready
    // This allows main.js to attach event listeners to the newly injected elements
    document.dispatchEvent(new Event('components:loaded'));

    // STANDALONE: Init hamburger menu + header scroll (no module dependency)
    // This ensures menu works even if main.js module fails to load
    initStandaloneHeader();
});

async function loadComponent(elementId, path, basePath = '') {
    const element = document.getElementById(elementId);
    if (!element) return;

    try {
        const response = await fetch(path);
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

    initLanguageSwitcher();

    console.log('[components.js] Standalone header initialized');
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
        if (link.dataset.lang === currentLang) link.classList.add('active');
        else link.classList.remove('active');
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
