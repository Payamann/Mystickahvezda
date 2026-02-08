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

document.addEventListener('DOMContentLoaded', () => {
    initStars();
    initScrollAnimations();
    initFAQ();
    initTabs();
    initSmoothScroll();
    initEmailForms();
    initCustomCursor();
    initDateValidation();
    initCarousel();
    initCookieBanner();
});

// Listen for dynamically loaded components (Header/Footer)
document.addEventListener('components:loaded', () => {
    initHeader();
    initMobileNav();
    // Re-initialize any smooth scroll links that might be in header/footer
    initSmoothScroll();
});
