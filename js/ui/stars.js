/* ============================================
   1. STARS BACKGROUND (Canvas-based for performance)
   Replaces 300 box-shadow values with a single canvas render
   ============================================ */
export function initStars() {
    const starsContainer = document.querySelector('.stars');
    if (!starsContainer) return;

    // Check for reduced motion preference
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const canvas = document.createElement('canvas');
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    starsContainer.appendChild(canvas);

    const ctx = canvas.getContext('2d');

    function drawStars() {
        const width = window.innerWidth;
        const height = window.innerHeight * 2; // Extra height for scroll
        canvas.width = width;
        canvas.height = height;

        ctx.clearRect(0, 0, width, height);

        // Layer 1: Small distant stars (200 stars)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        for (let i = 0; i < 200; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height;
            ctx.fillRect(x, y, 1, 1);
        }

        // Layer 2: Medium stars (100 stars)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        for (let i = 0; i < 100; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height;
            ctx.fillRect(x, y, 2, 2);
        }

        // Layer 3: A few bright stars
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        for (let i = 0; i < 20; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height;
            ctx.beginPath();
            ctx.arc(x, y, 1.5, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawStars();

    // Debounced resize handler
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(drawStars, 250);
    });
}
