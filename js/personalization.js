/**
 * Mystická Hvězda – Personalizace
 * Ukládá znamení a jméno uživatele v localStorage
 * Zobrazuje personalizovaný pozdrav a zvýrazní správné znamení
 */

const MH_PERSONALIZATION = {
    STORAGE_KEY: 'mh_user_prefs',

    get() {
        try {
            return JSON.parse(localStorage.getItem(this.STORAGE_KEY)) || {};
        } catch { return {}; }
    },

    set(data) {
        const current = this.get();
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify({ ...current, ...data }));
    },

    getSign() { return this.get().sign || null; },
    getName() { return this.get().name || null; },

    setSign(sign) { this.set({ sign, signSetAt: Date.now() }); },
    setName(name) { this.set({ name }); },
};

// Make globally available
window.MH_PERSONALIZATION = MH_PERSONALIZATION;

// Signs metadata
const SIGNS_CZ = {
    beran: { label: 'Beran', emoji: '♈', dates: '21. 3. – 19. 4.' },
    byk: { label: 'Býk', emoji: '♉', dates: '20. 4. – 20. 5.' },
    blizenci: { label: 'Blíženci', emoji: '♊', dates: '21. 5. – 20. 6.' },
    rak: { label: 'Rak', emoji: '♋', dates: '21. 6. – 22. 7.' },
    lev: { label: 'Lev', emoji: '♌', dates: '23. 7. – 22. 8.' },
    panna: { label: 'Panna', emoji: '♍', dates: '23. 8. – 22. 9.' },
    vahy: { label: 'Váhy', emoji: '♎', dates: '23. 9. – 22. 10.' },
    stir: { label: 'Štír', emoji: '♏', dates: '23. 10. – 21. 11.' },
    strelec: { label: 'Střelec', emoji: '♐', dates: '22. 11. – 21. 12.' },
    kozoroh: { label: 'Kozoroh', emoji: '♑', dates: '22. 12. – 19. 1.' },
    vodnar: { label: 'Vodnář', emoji: '♒', dates: '20. 1. – 18. 2.' },
    ryby: { label: 'Ryby', emoji: '♓', dates: '19. 2. – 20. 3.' },
};
window.SIGNS_CZ = SIGNS_CZ;

/** Inject personalized hero greeting on index.html */
function initIndexGreeting() {
    const hero = document.querySelector('.hero__title, .hero__subtitle');
    if (!hero || window.location.pathname.includes('index') === false) {
        if (!document.getElementById('personalized-greeting')) return;
    }

    const greetingEl = document.getElementById('personalized-greeting');
    if (!greetingEl) return;

    const sign = MH_PERSONALIZATION.getSign();
    const name = MH_PERSONALIZATION.getName();

    if (sign && SIGNS_CZ[sign]) {
        const s = SIGNS_CZ[sign];
        const hour = new Date().getHours();
        const timeGreet = hour < 12 ? 'Dobré ráno' : hour < 18 ? 'Dobrý den' : 'Dobrý večer';
        const nameStr = name ? `, ${name}` : '';
        greetingEl.textContent = `${timeGreet}${nameStr}! ${s.emoji} Váš dnešní výhled pro ${s.label} →`;
        greetingEl.href = `horoskopy.html#${sign}`;
        greetingEl.style.display = 'inline-flex';
    }
}

/** Highlight user sign on horoskopy.html and auto-scroll to it */
function initHoroscopeHighlight() {
    const sign = MH_PERSONALIZATION.getSign();
    if (!sign) return;

    // Highlight the correct card
    const cards = document.querySelectorAll('[data-sign]');
    cards.forEach(card => {
        if (card.dataset.sign === sign) {
            card.style.borderColor = 'rgba(235,192,102,0.7)';
            card.style.boxShadow = '0 0 20px rgba(235,192,102,0.2)';
            card.querySelector('.badge')?.remove();
            const badge = document.createElement('span');
            badge.textContent = 'Vaše znamení';
            badge.style.cssText = `
                position:absolute;top:-10px;left:50%;transform:translateX(-50%);
                background:#d4af37;color:#0f0a1f;font-size:0.7rem;
                font-weight:700;padding:2px 10px;border-radius:50px;
                white-space:nowrap;letter-spacing:0.5px;
            `;
            card.style.position = 'relative';
            card.appendChild(badge);

            // Auto-scroll if hash matches
            if (window.location.hash === `#${sign}`) {
                setTimeout(() => card.scrollIntoView({ behavior: 'smooth', block: 'center' }), 500);
            }
        }
    });
}

/** Sign picker widget – inserts a small "Nastavit mé znamení" bar */
function initSignPicker() {
    const picker = document.getElementById('mh-sign-picker');
    if (!picker) return;

    const current = MH_PERSONALIZATION.getSign();

    picker.innerHTML = `
        <div style="display:flex;flex-wrap:wrap;gap:0.4rem;justify-content:center;align-items:center;padding:0.75rem;">
            <span style="color:rgba(255,255,255,0.5);font-size:0.85rem;margin-right:0.5rem;">Vaše znamení:</span>
            ${Object.entries(SIGNS_CZ).map(([key, s]) => `
                <button data-pick="${key}" style="
                    padding:0.3rem 0.7rem;border-radius:50px;border:1px solid ${current === key ? '#d4af37' : 'rgba(255,255,255,0.15)'};
                    background:${current === key ? 'rgba(212,175,55,0.15)' : 'transparent'};
                    color:${current === key ? '#d4af37' : 'rgba(255,255,255,0.6)'};
                    cursor:pointer;font-size:0.8rem;transition:all 0.2s;
                " title="${s.dates}">${s.emoji} ${s.label}</button>
            `).join('')}
        </div>
    `;

    picker.querySelectorAll('[data-pick]').forEach(btn => {
        btn.addEventListener('click', () => {
            MH_PERSONALIZATION.setSign(btn.dataset.pick);
            // Refresh highlights
            initHoroscopeHighlight();
            // Re-render picker with new selection
            initSignPicker();
        });
    });
}

// Auto-init based on current page
document.addEventListener('DOMContentLoaded', () => {
    initIndexGreeting();
    initHoroscopeHighlight();
    initSignPicker();
});
