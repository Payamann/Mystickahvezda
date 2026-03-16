/**
 * CSP Compliance: Convert inline onmouseover/onmouseout to CSS hover
 * This script runs on all pages and converts hover handlers to use CSS classes
 * to remove the need for 'unsafe-inline' in CSP
 */

(function() {
    // Add CSS for hover effects at runtime to avoid inline styles
    const style = document.createElement('style');
    style.textContent = `
        .card-hover { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .card-hover:hover {
            transform: translateY(-3px) !important;
            border-color: rgba(212,175,55,0.3) !important;
            box-shadow: 0 8px 24px rgba(0,0,0,0.4) !important;
        }
    `;
    document.head.appendChild(style);

    // Convert elements with onmouseover/onmouseout to use CSS classes
    function convertHoverHandlers() {
        const elementsWithHover = document.querySelectorAll('[onmouseover], [onmouseout]');

        elementsWithHover.forEach(el => {
            const onmouseover = el.getAttribute('onmouseover');
            const onmouseout = el.getAttribute('onmouseout');

            // Check if this is a card hover pattern
            if (onmouseover && (
                onmouseover.includes("translateY(-3px)") ||
                onmouseover.includes("transform")
            )) {
                el.classList.add('card-hover');
                el.removeAttribute('onmouseover');
                el.removeAttribute('onmouseout');
                el.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
            }
            // For other inline handlers, keep them (will be refactored per page)
        });
    }

    // Run on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', convertHoverHandlers);
    } else {
        convertHoverHandlers();
    }

    // Also run on dynamic content
    const observer = new MutationObserver(convertHoverHandlers);
    observer.observe(document.body, { childList: true, subtree: true });
})();
