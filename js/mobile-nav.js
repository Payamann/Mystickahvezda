/**
 * Mobile Bottom Navigation - Active State Handler
 * Highlights the current page in the bottom navigation
 */

(function () {
    function initBottomNav() {
        const navItems = document.querySelectorAll('.mobile-bottom-nav .nav-item');
        if (!navItems.length) return;

        // Get current page from URL
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';

        navItems.forEach(item => {
            const itemPage = item.getAttribute('data-page') + '.html';

            // Remove active class from all
            item.classList.remove('active');

            // Add active to current page
            if (currentPage === itemPage || (currentPage === '' && itemPage === 'index.html')) {
                item.classList.add('active');
            }
        });
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initBottomNav);
    } else {
        initBottomNav();
    }
})();
