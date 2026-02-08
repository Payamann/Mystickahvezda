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
   ============================================ */
export function initCustomCursor() {
    // Disable on touch devices
    if (window.matchMedia('(pointer: coarse)').matches) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.className = 'cursor-canvas';

    // Canvas styling
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '9999'; // High z-index but behind the main cursor element
    document.body.appendChild(canvas);

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
    const maxParticles = 60; // Limit for performance

    let mouseX = width / 2;
    let mouseY = height / 2;
    let isMoving = false;

    // Track mouse
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        isMoving = true;

        // Add particle on move
        addParticle(mouseX, mouseY);
    });

    // Custom Cursor Head (DOM element for precision)
    const cursorHead = document.createElement('div');
    cursorHead.className = 'comet-cursor';
    document.body.appendChild(cursorHead);

    const updateCursorHead = () => {
        cursorHead.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`;
        requestAnimationFrame(updateCursorHead);
    };
    requestAnimationFrame(updateCursorHead);

    // Interactive Hover Effects
    // Interactive Hover Effects (Event Delegation)
    // This supports dynamically loaded content (Header/Footer) automatically
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
        // Only add if we haven't reached the limit to prevent overloading
        if (particles.length < maxParticles) {
            particles.push({
                x: x,
                y: y,
                size: Math.random() * 3 + 1,
                life: 1, // 1 to 0
                decay: 0.03 + Math.random() * 0.03,
                vx: (Math.random() - 0.5) * 1, // Slight drift
                vy: (Math.random() - 0.5) * 1
            });
        }
    }

    function animate() {
        ctx.clearRect(0, 0, width, height);

        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];

            // Update
            p.life -= p.decay;
            p.x += p.vx;
            p.y += p.vy;

            // Draw
            if (p.life > 0) {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(212, 175, 55, ${p.life * 0.5})`; // Gold trail
                ctx.fill();
            } else {
                particles.splice(i, 1);
                i--;
            }
        }

        requestAnimationFrame(animate);
    }
    animate();
}
