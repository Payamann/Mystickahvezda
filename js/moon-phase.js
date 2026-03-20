/**
 * Mystická Hvězda - Moon Phase Utility
 * Simple calculation of lunar phase based on date.
 */
export function getMoonPhase(date = new Date()) {
    // Precise Synodic Month: 29.530588853 days
    // Last New Moon near 2026: Feb 17, 2026 12:01 UTC
    const lp = 2551442877; 
    const new_moon = new Date('2026-02-17T12:01:00Z').getTime();
    
    // Calculate phase (0 to 1)
    let diff = date.getTime() - new_moon;
    let phase = (diff % lp) / lp;
    if (phase < 0) phase += 1;
    
    // Percentage for UI (0% New, 100% Full)
    const illumination = Math.abs(phase - 0.5) * 2;
    const illuminationPct = Math.round((1 - illumination) * 100);

    if (phase < 0.03) return { name: 'Novoluní', slug: 'new-moon', icon: '🌑', illumination: illuminationPct };
    if (phase < 0.22) return { name: 'Dorůstající srpek', slug: 'waxing-crescent', icon: '🌒', illumination: illuminationPct };
    if (phase < 0.28) return { name: 'První čtvrť', slug: 'first-quarter', icon: '🌓', illumination: illuminationPct };
    if (phase < 0.47) return { name: 'Dorůstající měsíc', slug: 'waxing-gibbous', icon: '🌔', illumination: illuminationPct };
    if (phase < 0.53) return { name: 'Úplněk', slug: 'full-moon', icon: '🌕', illumination: illuminationPct };
    if (phase < 0.72) return { name: 'Ubývající měsíc', slug: 'waning-gibbous', icon: '🌖', illumination: illuminationPct };
    if (phase < 0.78) return { name: 'Poslední čtvrť', slug: 'last-quarter', icon: '🌗', illumination: illuminationPct };
    if (phase < 0.97) return { name: 'Ubývající srpek', slug: 'waning-crescent', icon: '🌘', illumination: illuminationPct };
    return { name: 'Novoluní', slug: 'new-moon', icon: '🌑', illumination: illuminationPct };
}

export function getRitualDescription(phaseSlug) {
    const rituals = {
        'new-moon':        'Čas pro nové začátky, setí záměrů a vnitřní klid.',
        'waxing-crescent': 'Fáze růstu. Čas pro první kroky a odvahu k akci.',
        'first-quarter':   'Čas překonávat překážky, rozhodovat se a jednat s vůlí.',
        'waxing-gibbous':  'Fáze zdokonalování. Vylaďte detaily a dotáhněte záměry.',
        'full-moon':       'Vrchol energie. Čas pro oslavu, vděčnost a vědomé propuštění.',
        'waning-gibbous':  'Fáze reflexe. Integrujte moudrost a sdílejte ji s ostatními.',
        'last-quarter':    'Čas hlubokého čistění — pusťte vše, co vám již neslouží.',
        'waning-crescent': 'Čas odpočinku, obnovy a tiché přípravy na nový cyklus.',
    };
    return rituals[phaseSlug] || 'Univerzální rituál pro harmonii s hvězdami.';
}

// Auto-update moon phase card on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMoonPhaseCard);
} else {
    initMoonPhaseCard();
}

function initMoonPhaseCard() {
    const card = document.getElementById('moon-phase-card');
    if (card) {
        const phase = getMoonPhase();
        card.textContent = `${phase.icon} ${phase.name}`;
    }
}
