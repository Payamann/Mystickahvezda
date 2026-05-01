import { debounce } from '../utils/helpers.js';

/* ============================================
   5. FAQ ACCORDION
   ============================================ */
export function initFAQ() {
    const faqItems = document.querySelectorAll('.faq-item');

    if (!faqItems.length) return;

    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        const answer = item.querySelector('.faq-answer');

        if (!question || !answer) return;

        // Generate unique IDs for accessibility
        const id = `faq-${Math.random().toString(36).substr(2, 9)}`;
        question.setAttribute('aria-controls', id);
        question.setAttribute('aria-expanded', 'false');
        answer.setAttribute('id', id);
        answer.setAttribute('role', 'region');
        answer.setAttribute('aria-labelledby', `${id}-btn`);
        question.setAttribute('id', `${id}-btn`);

        question.addEventListener('click', () => {
            const isOpen = item.classList.contains('open');

            // Close other items
            faqItems.forEach(otherItem => {
                if (otherItem !== item) {
                    otherItem.classList.remove('open');
                    const otherQuestion = otherItem.querySelector('.faq-question');
                    if (otherQuestion) {
                        otherQuestion.setAttribute('aria-expanded', 'false');
                    }
                }
            });

            // Toggle current item
            item.classList.toggle('open');
            question.setAttribute('aria-expanded', !isOpen);
        });

        // Keyboard support
        question.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                question.click();
            }
        });
    });
}

/* ============================================
   6. TABS
   ============================================ */
export function initTabs() {
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');

    if (!tabs.length) return;

    tabs.forEach((tab, index) => {
        // Set up ARIA attributes
        const tabId = `tab-${index}`;
        const panelId = `panel-${index}`;
        tab.setAttribute('role', 'tab');
        tab.setAttribute('id', tabId);
        tab.setAttribute('aria-selected', tab.classList.contains('active'));
        tab.setAttribute('tabindex', tab.classList.contains('active') ? '0' : '-1');

        tab.addEventListener('click', () => {
            const target = tab.dataset.tab;

            // Update active tab
            tabs.forEach(t => {
                t.classList.remove('active');
                t.setAttribute('aria-selected', 'false');
                t.setAttribute('tabindex', '-1');
            });
            tab.classList.add('active');
            tab.setAttribute('aria-selected', 'true');
            tab.setAttribute('tabindex', '0');

            // Update content visibility
            tabContents.forEach(content => {
                if (content.dataset.tab === target) {
                    content.classList.remove('hidden');
                    content.setAttribute('aria-hidden', 'false');
                } else {
                    content.classList.add('hidden');
                    content.setAttribute('aria-hidden', 'true');
                }
            });
        });

        // Arrow key navigation
        tab.addEventListener('keydown', (e) => {
            let newIndex;
            if (e.key === 'ArrowRight') {
                newIndex = (index + 1) % tabs.length;
            } else if (e.key === 'ArrowLeft') {
                newIndex = (index - 1 + tabs.length) % tabs.length;
            } else if (e.key === 'Home') {
                newIndex = 0;
            } else if (e.key === 'End') {
                newIndex = tabs.length - 1;
            }

            if (newIndex !== undefined) {
                e.preventDefault();
                tabs[newIndex].focus();
                tabs[newIndex].click();
            }
        });
    });
}

/* ============================================
   11. TESTIMONIAL CAROUSEL
   ============================================ */
export function initCarousel() {
    const track = document.querySelector('.carousel-track');
    const container = document.querySelector('.carousel-track-container');
    const nextButton = document.querySelector('.carousel-btn.next');
    const prevButton = document.querySelector('.carousel-btn.prev');

    if (!track || !container || !nextButton || !prevButton) return;

    let slides = Array.from(track.children);
    let slideWidth = slides[0].getBoundingClientRect().width;
    let currentIndex = 0;

    // Determine how many slides are visible at once based on container / slide width ratio
    // This helps us know when to stop scrolling
    const getVisibleSlidesCount = () => {
        const containerWidth = container.getBoundingClientRect().width;
        return Math.round(containerWidth / slideWidth);
    };

    const updateSlidePosition = () => {
        const gap = parseFloat(getComputedStyle(track).gap) || 0;
        // Scroll by (slideWidth + gap) * currentIndex without writing inline styles.
        const amountToMove = (slideWidth + gap) * currentIndex;
        container.scrollTo({ left: amountToMove, behavior: 'smooth' });
    };

    const handleNext = () => {
        const visibleSlides = getVisibleSlidesCount();
        const maxIndex = slides.length - visibleSlides;

        if (currentIndex < maxIndex) {
            currentIndex++;
        } else {
            // Optional: Infinite loop or bounce
            currentIndex = 0; // Loop back to start
        }
        updateSlidePosition();
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            currentIndex--;
        } else {
            // Optional: Loop to end
            const visibleSlides = getVisibleSlidesCount();
            currentIndex = slides.length - visibleSlides;
        }
        updateSlidePosition();
    };

    nextButton.addEventListener('click', handleNext);
    prevButton.addEventListener('click', handlePrev);

    // Update on resize
    window.addEventListener('resize', debounce(() => {
        slideWidth = slides[0].getBoundingClientRect().width;
        // Ensure index doesn't go out of bounds if visible count changes
        const visibleSlides = getVisibleSlidesCount();
        const maxIndex = slides.length - visibleSlides;
        if (currentIndex > maxIndex) currentIndex = maxIndex;
        updateSlidePosition();
    }, 200));
}

/* ============================================
   12. COOKIE BANNER
   ============================================ */
export function initCookieBanner() {
    // Delegate to cookie-handler.js (single source of truth).
    // cookie-handler.js handles: show/hide, localStorage, GA event dispatch.
    // This function is kept for backward compatibility with main.js import.
    if (window.MH_COOKIE_HANDLER_INIT) return; // cookie-handler.js already running

    const banner = document.getElementById('cookie-banner');
    const acceptBtn = document.getElementById('cookie-accept');
    const rejectBtn = document.getElementById('cookie-reject');

    if (!banner || !acceptBtn || !rejectBtn) return;

    const K = 'mh_cookie_prefs';

    function setCookieBannerActive(isActive) {
        document.body?.classList.toggle('cookie-banner-active', isActive);
        document.documentElement?.classList.toggle('cookie-banner-active', isActive);
    }

    function saveCookieConsent(analytics, marketing) {
        localStorage.setItem(K, JSON.stringify({ analytics, marketing, ts: Date.now() }));
        // Fire GA consent update immediately (not just on next page load)
        window.dispatchEvent(new CustomEvent('mh_cookie_consent', {
            detail: { analytics, marketing }
        }));
        banner.classList.remove('visible');
        banner.hidden = true;
        setCookieBannerActive(false);
        window.dispatchEvent(new CustomEvent('mh_cookie_banner_hidden'));
    }

    // Check if user already acted (support both old and new key)
    const alreadyDone = localStorage.getItem(K) ||
        localStorage.getItem('cookieConsent') === 'accepted' ||
        localStorage.getItem('cookieConsent') === 'rejected';

    if (!alreadyDone) {
        setTimeout(() => {
            banner.hidden = false;
            setCookieBannerActive(true);
            requestAnimationFrame(() => {
                banner.classList.add('visible');
                window.dispatchEvent(new CustomEvent('mh_cookie_banner_visible'));
            });
        }, 1000);
    } else {
        banner.hidden = true;
        setCookieBannerActive(false);
    }

    acceptBtn.addEventListener('click', () => saveCookieConsent(true, true));
    rejectBtn.addEventListener('click', () => saveCookieConsent(false, false));

    const saveBtn = document.getElementById('cookie-save');
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            const a = document.getElementById('cookie-analytics');
            const m = document.getElementById('cookie-marketing');
            saveCookieConsent(!!(a && a.checked), !!(m && m.checked));
        });
    }
}
