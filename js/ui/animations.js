import { debounce } from '../utils/helpers.js';

/* ============================================
   4. SCROLL ANIMATIONS (Intersection Observer)
   ============================================ */
export function initScrollAnimations() {
    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const animatedElements = document.querySelectorAll('[data-animate]');

    if (!animatedElements.length) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-fade-in');
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    animatedElements.forEach(el => {
        el.style.opacity = '0';
        observer.observe(el);
    });
}

/* ============================================
   9. COMET CURSOR (Canvas Optimized)
   - Single rAF loop (combined cursor head + particles)
   - O(1) particle removal (swap-and-pop instead of splice)
   - Idle detection to pause when mouse is still
   ============================================ */
export function initCustomCursor() {
    // Custom cursor disabled - use native cursor for reliability
    return;

    // Resize handling
    let width = window.innerWidth;
    let height = window.innerHeight;

    const setSize = () => {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
    };
    setSize();
    window.addEventListener('resize', debounce(setSize, 100));

    // Particle system
    const particles = [];
    const maxParticles = 60;

    let mouseX = width / 2;
    let mouseY = height / 2;
    let isAnimating = false;

    // Pre-computed alpha color cache (avoids string creation per frame)
    const alphaColors = [];
    for (let i = 0; i <= 20; i++) {
        alphaColors.push(`rgba(212, 175, 55, ${(i / 20) * 0.5})`);
    }

    // Track mouse
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        addParticle(mouseX, mouseY);
        if (!isAnimating) {
            isAnimating = true;
            requestAnimationFrame(animate);
        }
    });

    // Custom Cursor Head (DOM element for precision)
    const cursorHead = document.createElement('div');
    cursorHead.className = 'comet-cursor';
    document.body.appendChild(cursorHead);

    // Interactive Hover Effects (Event Delegation)
    const isInteractive = (target) => {
        return target.matches('a, button, input, .card, .zodiac-card') ||
            target.closest('a, button, .card, .zodiac-card');
    };

    document.addEventListener('mouseover', (e) => {
        if (isInteractive(e.target)) {
            cursorHead.classList.add('hover');
        }
    }, { passive: true });

    document.addEventListener('mouseout', (e) => {
        if (isInteractive(e.target)) {
            cursorHead.classList.remove('hover');
        }
    }, { passive: true });

    function addParticle(x, y) {
        if (particles.length < maxParticles) {
            particles.push({
                x, y,
                size: Math.random() * 3 + 1,
                life: 1,
                decay: 0.03 + Math.random() * 0.03,
                vx: (Math.random() - 0.5),
                vy: (Math.random() - 0.5)
            });
        }
    }

    function animate() {
        // Update cursor head position
        cursorHead.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`;

        // Draw particles
        ctx.clearRect(0, 0, width, height);

        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];

            p.life -= p.decay;
            p.x += p.vx;
            p.y += p.vy;

            if (p.life > 0) {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
                // Use cached alpha color (nearest 5% step)
                const alphaIdx = Math.round(p.life * 20);
                ctx.fillStyle = alphaColors[alphaIdx] || alphaColors[0];
                ctx.fill();
            } else {
                // O(1) removal: swap with last element and pop
                particles[i] = particles[particles.length - 1];
                particles.pop();
            }
        }

        // Only continue loop if there are particles to animate
        if (particles.length > 0) {
            requestAnimationFrame(animate);
        } else {
            isAnimating = false;
        }
    }
}
