/**
 * Mystická Hvězda - Moon Phase Widget
 * Dynamically calculates and renders the current moon phase
 */

document.addEventListener('DOMContentLoaded', () => {
    initMoonWidget();
});

/**
 * Calculate current moon phase
 * Based on simplified synodic month calculation
 * @returns {Object} - phase name, emoji, and advice
 */
function getMoonPhase() {
    const now = new Date();

    // Known new moon: 2026-01-29T08:36:00Z (synchronized with lunace.html)
    const knownNewMoon = new Date('2026-01-29T08:36:00Z');
    const synodicMonth = 29.530588853; // Average synodic month in days

    // Calculate days since known new moon
    const msPerDay = 1000 * 60 * 60 * 24;
    const daysSinceNewMoon = (now - knownNewMoon) / msPerDay;

    // Get position in current lunar cycle (0-1)
    let lunarAge = (daysSinceNewMoon % synodicMonth) / synodicMonth;

    // Handle negative lunar age (if now is before the known date for some reason, though unlikely with 2026 date if valid)
    if (lunarAge < 0) lunarAge += 1;

    // Determine phase based on lunar age
    // Refined thresholds for more accurate feel (New Moon/Full Moon window ~2 days)
    // 0.034 of cycle is approx 1 day.

    let phase, emoji, advice;

    if (lunarAge < 0.02 || lunarAge > 0.98) {
        phase = 'Novoluní';
        emoji = '🌑';
        advice = 'Tma je plátno. Je čas zasít semínka vašich nejhlubších přání.'; // New Moon
    } else if (lunarAge < 0.22) {
        phase = 'Dorůstající srpek'; // Waxing Crescent
        emoji = '🌒';
        advice = 'Dýchejte život do svých záměrů. První kroky jsou nejdůležitější.';
    } else if (lunarAge < 0.28) {
        phase = 'První čtvrt'; // First Quarter (approx 0.25 +/- 0.03)
        emoji = '🌓';
        advice = 'Překážky jsou jen zkoušky odhodlání. Vytrvejte ve své vizi.';
    } else if (lunarAge < 0.47) {
        phase = 'Dorůstající měsíc'; // Waxing Gibbous
        emoji = '🌔';
        advice = 'Vaše sny nabírají tvar. Dolaďujte detaily a věřte procesu.';
    } else if (lunarAge < 0.53) {
        phase = 'Úplněk'; // Full Moon (approx 0.5 +/- 0.03)
        emoji = '🌕';
        advice = 'Čas sklizně a vděčnosti. Osvětlete to, co bylo skryté.';
    } else if (lunarAge < 0.72) {
        phase = 'Couvající měsíc'; // Waning Gibbous
        emoji = '🌖';
        advice = 'Uvolněte, co vám neslouží. Odpuštění je klíčem k lehkému srdci.';
    } else if (lunarAge < 0.78) {
        phase = 'Poslední čtvrt'; // Last Quarter (approx 0.75 +/- 0.03)
        emoji = '🌗';
        advice = 'Zpomalte. Reflektujte svou cestu a sbírejte moudrost.';
    } else {
        phase = 'Ubývající srpek'; // Waning Crescent
        emoji = '🌘';
        advice = 'Odpočívejte. Ticho před novým začátkem je posvátné.';
    }

    return { phase, emoji, advice };
}

function initMoonWidget() {
    // Try to find container, if not exists, create one in hero
    let container = document.getElementById('moon-widget');

    // Logic to insert widget if it doesn't exist but we are on a page that should have it
    if (!container && document.querySelector('.hero__content')) {
        const heroContent = document.querySelector('.hero__content');
        container = document.createElement('div');
        container.id = 'moon-widget';
        container.className = 'moon-widget fade-in-up';
        container.style.animationDelay = '0.5s';
        // Force centering of the container itself
        container.style.display = 'flex';
        container.style.justifyContent = 'center';
        container.style.width = '100%';

        // Insert after subtitle
        const subtitle = heroContent.querySelector('.hero__subtitle');
        if (subtitle) {
            subtitle.insertAdjacentElement('afterend', container);
        } else {
            heroContent.appendChild(container);
        }
    }

    if (!container) return;

    // Get current moon phase
    const moon = getMoonPhase();

    // Render Widget Content with dynamic data and new CSS classes
    container.innerHTML = `
        <div class="moon-widget-container" title="Dnešní lunární fáze">
            <span class="moon-emoji" style="margin-right: 1rem;">${moon.emoji}</span>
            <div class="text-left">
                <span style="display: block; font-size: 0.75rem; color: var(--color-silver-mist); text-transform: uppercase; letter-spacing: 0.1em;">${moon.phase}</span>
                <span style="font-weight: 600; color: var(--color-starlight); font-family: var(--font-heading); font-size: 1.1em;">${moon.advice}</span>
            </div>
        </div>
    `;

    // Also update the moon phase card if it exists (on index.html)
    const moonCard = document.getElementById('moon-phase-card');
    if (moonCard) {
        moonCard.innerHTML = `Dnes: <strong>${moon.phase}</strong>. ${moon.advice}`;
    }
}
