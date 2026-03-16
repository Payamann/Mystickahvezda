/**
 * Mystická Hvězda – Personalizace
 * Ukládá znamení a jméno uživatele v localStorage
 * Zobrazuje personalizovaný pozdrav a zvýrazní správné znamení
 *
 * OPRAVY:
 * - Event delegation (bez memory leak)
 * - Sanitace vstupu (XSS protection)
 * - localStorage verzing
 * - Accessibility (aria-expanded, aria-controls)
 * - Importované utility z helpers.js
 */

import { sanitizeText, debounce } from './utils/helpers.js';

const STORAGE_VERSION = '1.0';
const STORAGE_KEY = 'mh_user_prefs';

const MH_PERSONALIZATION = {
    STORAGE_KEY,
    STORAGE_VERSION,

    get() {
        try {
            const data = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
            // Ověření verze - migrace pokud je potřeba
            if (!data.version) {
                data.version = STORAGE_VERSION;
            }
            return data;
        } catch {
            return { version: STORAGE_VERSION };
        }
    },

    set(data) {
        const current = this.get();
        const merged = {
            ...current,
            ...data,
            version: STORAGE_VERSION
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    },

    getSign() { return this.get().sign || null; },
    getName() { return this.get().name || null; },

    setSign(sign) { this.set({ sign, signSetAt: Date.now() }); },
    setName(name) { this.set({ name }); },
};

// Make globally available
window.MH_PERSONALIZATION = MH_PERSONALIZATION;

// Signs metadata (pro sanitaci ve šablonách)
const SIGNS_CZ = {
    beran: { label: 'Beran', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="sign-icon"><path d="M5 8c.5-3 2.5-5 5-5s5 2 5 5c0 3-2.5 5-5 5M19 8c-.5-3-2.5-5-5-5s-5 2-5 5c0 3 2.5 5 5 5M12 13v8"/></svg>', dates: '21. 3. – 19. 4.' },
    byk: { label: 'Býk', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="sign-icon"><circle cx="12" cy="12" r="6"/><path d="M5 4c1 2 3 3 7 3s6-1 7-3"/></svg>', dates: '20. 4. – 20. 5.' },
    blizenci: { label: 'Blíženci', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="sign-icon"><path d="M4 20h16M4 4h16M9 4v16M15 4v16"/></svg>', dates: '21. 5. – 20. 6.' },
    rak: { label: 'Rak', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="sign-icon"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm0 8a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM18 12c4 0 4-4 4-4M6 12c-4 0-4 4-4 4"/></svg>', dates: '21. 6. – 22. 7.' },
    lev: { label: 'Lev', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="sign-icon"><path d="M11 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM15 11c0 4-4 6-4 10M11 11c-4 0-4-4-4-4"/></svg>', dates: '23. 7. – 22. 8.' },
    panna: { label: 'Panna', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="sign-icon"><path d="M7 4v12a3 3 0 0 0 3 3M11 4v12a3 3 0 0 0 3 3M15 4v12a3 3 0 0 1-3 3M11 4c4 0 4 4 4 4"/></svg>', dates: '23. 8. – 22. 9.' },
    vahy: { label: 'Váhy', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="sign-icon"><path d="M5 19h14M5 14h14M12 14V5M8 9l4-4 4 4"/></svg>', dates: '23. 9. – 22. 10.' },
    stir: { label: 'Štír', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="sign-icon"><path d="M5 4v12a3 3 0 0 0 3 3M9 4v12a3 3 0 0 0 3 3M13 4v12a3 3 0 0 1 3 3l2 2"/></svg>', dates: '23. 10. – 21. 11.' },
    strelec: { label: 'Střelec', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="sign-icon"><path d="m3 21 18-18M11 3h10v10M6.6 6.6l5.4 5.4"/></svg>', dates: '22. 11. – 21. 12.' },
    kozoroh: { label: 'Kozoroh', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="sign-icon"><path d="M12 3a8 8 0 0 0-8 8M12 3a8 8 0 0 1 8 8M4 11c0 4 3 6 3 10M20 11c0 4-3 6-3 10"/></svg>', dates: '22. 12. – 19. 1.' },
    vodnar: { label: 'Vodnář', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="sign-icon"><path d="M5 12c1.5-2 3.5-2 5 0s3.5 2 5 0 3.5-2 5 0M5 17c1.5-2 3.5-2 5 0s3.5 2 5 0 3.5-2 5 0"/></svg>', dates: '20. 1. – 18. 2.' },
    ryby: { label: 'Ryby', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="sign-icon"><path d="M5 8c6 0 6 8 0 8M19 8c-6 0-6 8 0 8M12 4v16"/></svg>', dates: '19. 2. – 20. 3.' },
};
window.SIGNS_CZ = SIGNS_CZ;

/** Inject personalized hero greeting on index.html */
function initIndexGreeting() {
    const greetingEl = document.getElementById('personalized-greeting');
    if (!greetingEl) return;

    const sign = MH_PERSONALIZATION.getSign();
    const name = MH_PERSONALIZATION.getName();

    if (sign && SIGNS_CZ[sign]) {
        const s = SIGNS_CZ[sign];
        const hour = new Date().getHours();
        const timeGreet = hour < 12 ? 'Dobré ráno' : hour < 18 ? 'Dobrý den' : 'Dobrý večer';
        const nameStr = name ? `, ${sanitizeText(name)}` : '';
        
        greetingEl.innerHTML = `
            <span class="greeting-icon">${s.icon}</span>
            <span class="greeting-text">${timeGreet}${nameStr}! Váš dnešní výhled pro ${s.label} →</span>
        `;
        
        greetingEl.href = `horoskopy.html#${sign}`;
        greetingEl.classList.add('personalized-greeting--visible');
    }
}

/** Highlight user sign on horoskopy.html and auto-scroll to it */
function initHoroscopeHighlight() {
    const sign = MH_PERSONALIZATION.getSign();
    if (!sign) return;

    // Opraveno: DOM selector nyní správně cílí na .zodiac-card prvky
    const cards = document.querySelectorAll('.zodiac-card');

    cards.forEach(card => {
        // Extrahuj znamení ze struktury (např. z href="#beran")
        const cardHref = card.getAttribute('href');
        const cardSign = cardHref ? cardHref.substring(1) : null;

        // Odstraň badge z všech karet
        const badge = card.querySelector('.zodiac-card__badge');
        if (badge) badge.remove();

        // Zvýrazni pouze správnou kartu (pokud je validní)
        if (cardSign === sign && SIGNS_CZ[cardSign]) {
            card.classList.add('zodiac-card--highlighted');

            // Vytvoř nový badge pouze pro zvýrazněnou kartu
            const newBadge = document.createElement('span');
            newBadge.className = 'zodiac-card__badge';
            newBadge.textContent = 'Vaše znamení';
            card.appendChild(newBadge);

            // Auto-scroll if hash matches (bez delay - scroll po rendu stránky)
            if (window.location.hash === `#${sign}`) {
                // Použij requestAnimationFrame pro smooth scroll po repaintu
                requestAnimationFrame(() => {
                    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                });
            }
        } else {
            card.classList.remove('zodiac-card--highlighted');
        }
    });
}

/**
 * Sign picker widget – Nastavit mé znamení
 * OPRAVY:
 * - Event delegation (bez memory leak)
 * - CSS třídy (bez inline stylů)
 * - Accessibility (aria-expanded, aria-controls)
 * - Debounce na re-render
 */

const handleSignSelection = debounce((sign) => {
    MH_PERSONALIZATION.setSign(sign);
    // Refresh highlights
    initHoroscopeHighlight();
    // Re-render picker s debouncem
    initSignPicker();
}, 100);

/**
 * Inicializuj HTML obsah sign pickeru
 */
function renderSignPickerHTML(picker) {
    const current = MH_PERSONALIZATION.getSign();
    picker.className = 'sign-picker';

    if (current && SIGNS_CZ[current]) {
        const s = SIGNS_CZ[current];
        picker.innerHTML = `
            <div class="sign-picker__header">
                <span class="sign-picker__label">Vaše znamení:</span>
                <button id="sign-picker-toggle"
                    class="sign-picker__button"
                    aria-expanded="false"
                    aria-controls="sign-picker-expanded"
                    data-action="toggle-expanded"
                    title="Zobrazit/skrýt všechna znamení">
                    ${s.emoji} ${sanitizeText(s.label)}
                </button>
                <button class="sign-picker__change-btn"
                    data-action="toggle-expanded"
                    title="Změnit znamení">✎ Změnit</button>
            </div>
            <div id="sign-picker-expanded" class="sign-picker__expanded" role="region" aria-label="Výběr znamení">
                ${Object.entries(SIGNS_CZ).map(([key, s]) => `
                    <button class="sign-picker__sign-btn ${current === key ? 'active' : ''}"
                        data-pick="${key}"
                        data-action="pick-sign"
                        title="${s.dates}"
                        aria-pressed="${current === key ? 'true' : 'false'}">
                        ${s.emoji} ${sanitizeText(s.label)}
                    </button>
                `).join('')}
            </div>
        `;
    } else {
        // Žádné znamení vybráno - zobraz všechna
        picker.innerHTML = `
            <div class="sign-picker__header">
                <span class="sign-picker__label">Vaše znamení:</span>
            </div>
            <div id="sign-picker-expanded" class="sign-picker__expanded active" role="region" aria-label="Výběr znamení">
                ${Object.entries(SIGNS_CZ).map(([key, s]) => `
                    <button class="sign-picker__sign-btn"
                        data-pick="${key}"
                        data-action="pick-sign"
                        title="${s.dates}">
                        ${s.emoji} ${sanitizeText(s.label)}
                    </button>
                `).join('')}
            </div>
        `;
    }
}

/**
 * Event handler - delegován na picker element
 */
function handlePickerClick(e) {
    const picker = document.getElementById('mh-sign-picker');
    if (!picker) return;

    const action = e.target.closest('[data-action]')?.dataset.action;
    const pickBtn = e.target.closest('[data-pick]');

    if (action === 'toggle-expanded') {
        e.preventDefault();
        toggleExpandedView(picker);
    } else if (pickBtn) {
        e.preventDefault();
        const sign = pickBtn.dataset.pick;
        if (sign && SIGNS_CZ[sign]) {
            handleSignSelection(sign);
        }
    }
}

function initSignPicker() {
    const picker = document.getElementById('mh-sign-picker');
    if (!picker) return;

    // Render pouze HTML - bez event listeners
    renderSignPickerHTML(picker);

    // Přidej listener pouze jednou (delegovaný na parent)
    // Odstraň starý listener, pokud existuje
    picker.removeEventListener('click', handlePickerClick);
    picker.addEventListener('click', handlePickerClick);
}

/**
 * Přepnutí zobrazení rozšířeného seznamu
 */
function toggleExpandedView(picker) {
    const expanded = picker.querySelector('#sign-picker-expanded');
    const toggleBtn = picker.querySelector('#sign-picker-toggle');

    if (expanded) {
        expanded.classList.toggle('active');
        if (toggleBtn) {
            toggleBtn.setAttribute('aria-expanded', expanded.classList.contains('active') ? 'true' : 'false');
        }
    }
}

/**
 * RETENTION: Daily Streak Gamification
 * Tracks user's consecutive days visiting & reading horoscope
 */
const MH_STREAK = {
    STORAGE_KEY_STREAK: 'mh_horoscope_streak',
    STORAGE_KEY_LAST_DATE: 'mh_last_horoscope_date',
    STORAGE_KEY_BEST_STREAK: 'mh_best_horoscope_streak',

    /**
     * Get current streak (consecutive days)
     */
    getStreak() {
        return parseInt(localStorage.getItem(this.STORAGE_KEY_STREAK) || '0');
    },

    /**
     * Get best streak ever achieved
     */
    getBestStreak() {
        return parseInt(localStorage.getItem(this.STORAGE_KEY_BEST_STREAK) || '0');
    },

    /**
     * Increment streak (call when user views horoscope)
     */
    incrementStreak() {
        try {
            const today = new Date().toDateString();
            const lastDate = localStorage.getItem(this.STORAGE_KEY_LAST_DATE);

            // If they already visited today, don't increment again
            if (lastDate === today) {
                return this.getStreak();
            }

            // Check if they visited yesterday (streak continues)
            const yesterday = new Date(Date.now() - 86400000).toDateString();
            const streakBroken = lastDate !== yesterday && lastDate !== null;

            if (streakBroken) {
                // Reset streak if they missed a day
                localStorage.setItem(this.STORAGE_KEY_STREAK, '1');
            } else {
                // Increment streak
                const currentStreak = this.getStreak();
                const newStreak = currentStreak + 1;
                localStorage.setItem(this.STORAGE_KEY_STREAK, newStreak);

                // Update best streak if new record
                const bestStreak = this.getBestStreak();
                if (newStreak > bestStreak) {
                    localStorage.setItem(this.STORAGE_KEY_BEST_STREAK, newStreak);
                }
            }

            // Update last visit date
            localStorage.setItem(this.STORAGE_KEY_LAST_DATE, today);

            return this.getStreak();
        } catch (e) {
            console.warn('Streak tracking failed:', e);
            return 0;
        }
    },

    /**
     * Reset streak (called when user cancels subscription or explicitly resets)
     */
    resetStreak() {
        localStorage.removeItem(this.STORAGE_KEY_LAST_DATE);
        // Don't reset current streak immediately, just last date
    },

    /**
     * Display streak badge in UI
     */
    displayStreak() {
        const streak = this.getStreak();
        if (streak < 1) return; // Don't show if no streak

        // Create or update streak badge
        let badge = document.getElementById('mh-streak-badge');
        if (!badge) {
            badge = document.createElement('div');
            badge.id = 'mh-streak-badge';
            badge.className = 'mh-streak-badge';
            document.body.insertBefore(badge, document.body.firstChild);
        }

        // Fire emoji animation based on milestone
        let emoji = '🔥';
        let milestone = false;
        if (streak % 30 === 0) {
            emoji = '🌟';
            milestone = true;
        } else if (streak % 7 === 0) {
            emoji = '⭐';
            milestone = true;
        }

        badge.innerHTML = `${emoji} ${streak} day streak!`;
        badge.className = 'mh-streak-badge' + (milestone ? ' mh-streak-badge--milestone' : '');

        // Animation
        badge.style.animation = 'none';
        setTimeout(() => {
            badge.style.animation = 'mh-streak-bounce 0.5s ease-in-out';
        }, 10);

        // Hide after 5 seconds
        setTimeout(() => {
            badge.style.opacity = '0';
            badge.style.transition = 'opacity 0.3s ease-out';
        }, 5000);
    }
};

// Make globally available for testing
window.MH_STREAK = MH_STREAK;

// Auto-init based on current page
document.addEventListener('DOMContentLoaded', () => {
    initIndexGreeting();

    // Inicializuj sign picker pouze pokud existuje element
    const picker = document.getElementById('mh-sign-picker');
    if (picker) {
        initSignPicker();
    }

    // Inicializuj highlight pouze pokud jsou zodiac cards (horoskopy.html)
    const cards = document.querySelectorAll('.zodiac-card');
    if (cards.length > 0) {
        // Track streak when user views horoscopes
        MH_STREAK.incrementStreak();
        MH_STREAK.displayStreak();

        initHoroscopeHighlight();
    }

    // Also track streak on index page when user views their personalized greeting
    const greeting = document.getElementById('personalized-greeting');
    if (greeting && greeting.classList.contains('personalized-greeting--visible')) {
        // Lighter tracking: only increment if they actually clicked the greeting
        greeting.addEventListener('click', () => {
            MH_STREAK.incrementStreak();
        });
    }
});
