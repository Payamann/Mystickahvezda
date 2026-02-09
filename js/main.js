/* ============================================
   MYSTICKÁ HVĚZDA - JavaScript (Refactored)
   Entry point for UI modules
   ============================================ */

import { initStars } from './ui/stars.js';
import { initHeader, initMobileNav } from './ui/header.js';
import { initScrollAnimations, initCustomCursor } from './ui/animations.js';
import { initFAQ, initTabs, initCarousel, initCookieBanner } from './ui/components.js';
import { initSmoothScroll } from './utils/helpers.js';
import { initEmailForms, initDateValidation } from './ui/forms.js';

function safeInit(name, fn) {
    try { fn(); } catch (e) { console.error(`[Init] ${name} failed:`, e); }
}

document.addEventListener('DOMContentLoaded', () => {
    safeInit('Stars', initStars);
    safeInit('ScrollAnimations', initScrollAnimations);
    safeInit('FAQ', initFAQ);
    safeInit('Tabs', initTabs);
    safeInit('SmoothScroll', initSmoothScroll);
    safeInit('EmailForms', initEmailForms);
    safeInit('CustomCursor', initCustomCursor);
    safeInit('DateValidation', initDateValidation);
    safeInit('Carousel', initCarousel);
    safeInit('CookieBanner', initCookieBanner);
});

// Listen for dynamically loaded components (Header/Footer)
document.addEventListener('components:loaded', () => {
    safeInit('Header', initHeader);
    safeInit('MobileNav', initMobileNav);
});
