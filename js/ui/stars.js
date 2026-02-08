/* ============================================
   1. STARS BACKGROUND (Box-shadow Optimization)
   ============================================ */
export function initStars() {
    const starsContainer = document.querySelector('.stars');
    if (!starsContainer) return;

    // Check for reduced motion preference
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // Create a single element for all stars using box-shadow
    // This reduces DOM node count from 150+ to 1
    const createStarLayer = (starCount, size, duration) => {
        const layer = document.createElement('div');
        layer.className = 'star-layer';

        let boxShadow = '';
        const width = window.innerWidth;
        const height = window.innerHeight;

        for (let i = 0; i < starCount; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height;
            boxShadow += `${x}px ${y}px #FFF, `;
        }

        // Remove trailing comma
        layer.style.boxShadow = boxShadow.slice(0, -2);
        layer.style.width = `${size}px`;
        layer.style.height = `${size}px`;
        layer.style.animationDuration = `${duration}s`;
        layer.style.opacity = '0.7';

        return layer;
    };

    // Layer 1: Small distant stars
    starsContainer.appendChild(createStarLayer(200, 1, 50));

    // Layer 2: Medium stars
    starsContainer.appendChild(createStarLayer(100, 2, 100));
}
