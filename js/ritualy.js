/**
 * Mystická Hvězda — Lunární Rituály: Landing page logika
 * Závisí na: ritualy-content.js (window.RitualContent), moon-phase.js (ES module import)
 */

(function () {
    'use strict';

    /* ── Jednoduchý výpočet fáze (kopie logiky z moon-phase.js, bez ES module) ── */
    function getMoonPhase() {
        const lp          = 2551442877; // ms v synodickém měsíci
        const new_moon    = new Date('2026-02-17T12:01:00Z').getTime();
        const diff        = Date.now() - new_moon;
        let   phase       = (diff % lp) / lp;
        if (phase < 0) phase += 1;

        if (phase < 0.03) return { name: 'Novolunění',          slug: 'new-moon',        icon: '🌑' };
        if (phase < 0.22) return { name: 'Dorůstající srpek',   slug: 'waxing-crescent', icon: '🌒' };
        if (phase < 0.28) return { name: 'První čtvrť',         slug: 'first-quarter',   icon: '🌓' };
        if (phase < 0.47) return { name: 'Dorůstající měsíc',   slug: 'waxing-gibbous',  icon: '🌔' };
        if (phase < 0.53) return { name: 'Úplněk',              slug: 'full-moon',       icon: '🌕' };
        if (phase < 0.72) return { name: 'Ubývající měsíc',     slug: 'waning-gibbous',  icon: '🌖' };
        if (phase < 0.78) return { name: 'Poslední čtvrť',      slug: 'last-quarter',    icon: '🌗' };
        if (phase < 0.97) return { name: 'Ubývající srpek',     slug: 'waning-crescent', icon: '🌘' };
        return                    { name: 'Novolunění',          slug: 'new-moon',        icon: '🌑' };
    }

    const RITUAL_DESC = {
        'new-moon':        'Čas pro nové začátky a setí záměrů do temnoty.',
        'waxing-crescent': 'Odvaha k prvním krokům a budování impulzu.',
        'first-quarter':   'Vůle překonat překážky a jednat rozhodně.',
        'waxing-gibbous':  'Vyladění detailů — jste téměř na vrcholu.',
        'full-moon':       'Vrchol energie, oslava a vědomé propuštění.',
        'waning-gibbous':  'Reflexe, sdílení moudrosti a vděčnost.',
        'last-quarter':    'Hluboké čistění — prostor pro nový začátek.',
        'waning-crescent': 'Odpočinek, ticho a příprava na nový cyklus.',
    };

    /* ── Stav ─────────────────────────────────────────────────────── */
    let currentPhase = null;
    let currentSign  = null;
    let checkedItems = new Set();

    /* ── Inicializace ─────────────────────────────────────────────── */
    function init() {
        currentPhase = getMoonPhase();

        // Hero sekce — fáze měsíce
        const iconEl = document.getElementById('ritual-moon-icon');
        const nameEl = document.getElementById('ritual-moon-name');
        const descEl = document.getElementById('ritual-moon-desc');
        if (iconEl) iconEl.textContent = currentPhase.icon;
        if (nameEl) nameEl.textContent = currentPhase.name;
        if (descEl) descEl.textContent = RITUAL_DESC[currentPhase.slug] || '';

        // Načti poslední použité znamení
        try {
            const saved = localStorage.getItem('mh_ritual_sign');
            if (saved && window.RitualContent) {
                const signs = window.RitualContent.getAllSigns();
                if (signs[saved]) showRitual(saved);
            }
        } catch (e) { /* ignore */ }

        // Zvýrazni uložené znamení ze `mh_user_prefs`
        try {
            const prefs = JSON.parse(localStorage.getItem('mh_user_prefs') || '{}');
            if (prefs.sign) markPreferredSign(prefs.sign);
        } catch (e) { /* ignore */ }

        // Kliknutí na znamení
        document.querySelectorAll('.zodiac-btn[data-sign]').forEach(btn => {
            btn.addEventListener('click', () => showRitual(btn.dataset.sign));
        });

        // Gate: "Vstoupit do rituálu" vyžaduje Hvězdný Průvodce+
        const enterBtn = document.getElementById('btn-enter-ritual');
        if (enterBtn) {
            enterBtn.addEventListener('click', (e) => {
                // Gate: requires Průvodce (premium) plan
                if (!window.Auth || !window.Auth.isLoggedIn()) {
                    e.preventDefault();
                    window.Premium?.showLoginGate(document.querySelector('.ritual-result') || document.body, '🌙 Přihlaste se zdarma a odemkněte lunární rituály');
                    return;
                }
                if (!window.Auth.isPremium()) {
                    e.preventDefault();
                    window.Premium?.showTrialPaywall('rituals');
                    return;
                }
                // Premium user — proceed to session normally
            });
        }
    }

    function markPreferredSign(sign) {
        const btn = document.querySelector(`.zodiac-btn[data-sign="${sign}"]`);
        if (!btn) return;
        btn.style.outline = '2px solid rgba(212,175,55,0.4)';
        btn.title = 'Vaše uložené znamení';
    }

    /* ── Zobrazení rituálu ────────────────────────────────────────── */
    function showRitual(signSlug) {
        if (!window.RitualContent) return;

        currentSign  = signSlug;
        checkedItems = new Set();

        const ritual = window.RitualContent.getRitual(currentPhase.slug, signSlug);

        // Aktivní tlačítko
        document.querySelectorAll('.zodiac-btn').forEach(b => b.classList.remove('active'));
        const activeBtn = document.querySelector(`.zodiac-btn[data-sign="${signSlug}"]`);
        if (activeBtn) activeBtn.classList.add('active');

        // Naplnit kartu
        const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

        setEl('rc-badge',    `${currentPhase.icon} ${currentPhase.name}`);
        setEl('rc-sign-emoji', ritual.signEmoji);
        setEl('rc-sign-name',  ritual.signName.toUpperCase());
        setEl('rc-title',      ritual.nazev);
        setEl('rc-popis',      ritual.popis);
        setEl('rc-duration',   ritual.duration);
        setEl('rc-element',    ritual.signElement);
        setEl('rc-ruler',      ritual.signRuler);

        // Přípravný checklist
        renderChecklist(ritual.prepList);

        // CTA button
        updateCTA();

        // Ukázat kartu
        const card = document.getElementById('ritual-card');
        if (card) {
            card.classList.add('show');
            card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        // Uložit do localStorage
        try { localStorage.setItem('mh_ritual_sign', signSlug); } catch (e) { /* ignore */ }
    }

    function renderChecklist(items) {
        const list = document.getElementById('prep-list');
        if (!list) return;

        list.innerHTML = '';
        items.forEach((item, i) => {
            const li = document.createElement('li');
            li.dataset.idx = i;
            li.textContent = item;
            li.addEventListener('click', () => toggleCheck(li, i));
            list.appendChild(li);
        });
    }

    function toggleCheck(li, idx) {
        if (checkedItems.has(idx)) {
            checkedItems.delete(idx);
            li.classList.remove('checked');
        } else {
            checkedItems.add(idx);
            li.classList.add('checked');
        }
        updateCTA();
    }

    function updateCTA() {
        const btn  = document.getElementById('btn-enter-ritual');
        const hint = document.getElementById('checklist-hint');
        if (!btn || !currentPhase || !currentSign) return;

        const url  = `session.html?phase=${currentPhase.slug}&sign=${currentSign}`;
        btn.href   = url;

        const total   = document.querySelectorAll('#prep-list li').length;
        const checked = checkedItems.size;

        if (checked === 0) {
            hint.textContent = 'Odklikněte vše co máte připraveno — nebo rovnou vstupte';
        } else if (checked < total) {
            hint.textContent = `${checked} z ${total} připraveno`;
        } else {
            hint.textContent = 'Vše připraveno — jste připraveni vstoupit ✦';
        }
    }

    /* ── Spuštění ─────────────────────────────────────────────────── */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        // ritualy-content.js ještě nemusí být načtený — chvíli počkáme
        const tryInit = () => window.RitualContent ? init() : setTimeout(tryInit, 50);
        tryInit();
    }

})();
