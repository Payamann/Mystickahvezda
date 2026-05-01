import {
    calculateLifePath,
    calculateDestiny,
    calculateSoul,
    calculatePersonality,
    NUMBER_MEANINGS
} from './utils/numerology-logic.js';

const NUMEROLOGY_RESULT_SOURCE = 'numerology_result';
let lastNumerologyShareResult = null;

function buildNumerologyUpgradeUrl(source = 'numerology_inline_gate') {
    const pricingUrl = new URL('/cenik.html', window.location.origin);
    pricingUrl.searchParams.set('plan', 'pruvodce');
    pricingUrl.searchParams.set('source', source);
    pricingUrl.searchParams.set('feature', 'numerologie_vyklad');
    return `${pricingUrl.pathname}${pricingUrl.search}`;
}

function startNumerologyUpgradeFlow(source = 'numerology_inline_gate', authMode = 'register') {
    window.MH_ANALYTICS?.trackCTA?.(source, {
        plan_id: 'pruvodce',
        feature: 'numerologie_vyklad'
    });

    if (window.Auth?.startPlanCheckout) {
        window.Auth.startPlanCheckout('pruvodce', {
            source,
            feature: 'numerologie_vyklad',
            redirect: '/cenik.html',
            authMode
        });
        return;
    }

    window.location.href = buildNumerologyUpgradeUrl(source);
}

function getFirstNameForShare(name) {
    const firstName = String(name || '').trim().split(/\s+/)[0] || '';
    return firstName.slice(0, 26);
}

function buildNumerologyShareResult(name, lifePath, destiny, soul, personality) {
    const lifeMeaning = NUMBER_MEANINGS[lifePath] || {};
    const numbers = [
        { key: 'life_path', label: 'Životní cesta', number: lifePath, color: '#d4af37' },
        { key: 'destiny', label: 'Osud', number: destiny, color: '#6bb7ff' },
        { key: 'soul', label: 'Duše', number: soul, color: '#8ee6aa' },
        { key: 'personality', label: 'Osobnost', number: personality, color: '#f1c40f' }
    ];

    return {
        displayName: getFirstNameForShare(name),
        lifePath,
        destiny,
        soul,
        personality,
        title: lifeMeaning.title || 'Osobní vibrace',
        short: lifeMeaning.short || 'Vnitřní rytmus a směr',
        numbers
    };
}

function wrapCanvasText(ctx, text, maxWidth) {
    const words = String(text || '').split(/\s+/).filter(Boolean);
    const lines = [];
    let current = '';

    words.forEach((word) => {
        const test = current ? `${current} ${word}` : word;
        if (ctx.measureText(test).width <= maxWidth) {
            current = test;
        } else {
            if (current) lines.push(current);
            current = word;
        }
    });

    if (current) lines.push(current);
    return lines;
}

function drawCenteredLines(ctx, lines, centerX, startY, lineHeight, maxLines = lines.length) {
    lines.slice(0, maxLines).forEach((line, index) => {
        ctx.fillText(line, centerX, startY + index * lineHeight);
    });
    return startY + Math.min(lines.length, maxLines) * lineHeight;
}

function drawRoundRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

function drawSeededStars(ctx, seed, width, height) {
    for (let i = 0; i < 230; i += 1) {
        const rawX = Math.sin(seed + i * 17.318) * 11358.5453;
        const rawY = Math.sin(seed + i * 39.731) * 24634.6345;
        const x = (rawX - Math.floor(rawX)) * width;
        const y = (rawY - Math.floor(rawY)) * height * 0.76;
        const radius = i % 11 === 0 ? 2.4 : 1.15;

        ctx.fillStyle = i % 6 === 0 ? 'rgba(212,175,55,0.76)' : 'rgba(235,240,255,0.68)';
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawNumerologyTile(ctx, tile, x, y, width, height) {
    drawRoundRect(ctx, x, y, width, height, 28);
    ctx.fillStyle = 'rgba(255,255,255,0.045)';
    ctx.fill();
    ctx.strokeStyle = `${tile.color}cc`;
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255,255,255,0.74)';
    ctx.font = '600 29px Inter, Arial, sans-serif';
    ctx.fillText(tile.label, x + 34, y + 54);

    ctx.fillStyle = tile.color;
    ctx.font = '700 82px Cinzel, Georgia, serif';
    ctx.fillText(String(tile.number), x + 34, y + 138);

    const meaning = NUMBER_MEANINGS[tile.number]?.short || '';
    ctx.fillStyle = '#f6f1ff';
    ctx.font = '500 27px Inter, Arial, sans-serif';
    wrapCanvasText(ctx, meaning, width - 68).slice(0, 2).forEach((line, index) => {
        ctx.fillText(line, x + 34, y + 188 + index * 34);
    });
}

function drawNumerologyResultCard(result) {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1350;
    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;

    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#16133a');
    gradient.addColorStop(0.48, '#080816');
    gradient.addColorStop(1, '#050510');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const seed = result.numbers.reduce((sum, item) => sum + item.number * 31, result.displayName.length * 17);
    drawSeededStars(ctx, seed, canvas.width, canvas.height);

    ctx.strokeStyle = 'rgba(212,175,55,0.84)';
    ctx.lineWidth = 5;
    ctx.strokeRect(54, 54, canvas.width - 108, canvas.height - 108);
    ctx.strokeStyle = 'rgba(212,175,55,0.34)';
    ctx.lineWidth = 2;
    ctx.strokeRect(78, 78, canvas.width - 156, canvas.height - 156);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#d4af37';
    ctx.font = '600 42px Inter, Arial, sans-serif';
    ctx.fillText('Mystická Hvězda', centerX, 142);

    ctx.fillStyle = 'rgba(212,175,55,0.16)';
    ctx.beginPath();
    ctx.arc(centerX, 366, 188, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(212,175,55,0.8)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(centerX, 366, 154, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#f1d06b';
    ctx.font = '700 46px Cinzel, Georgia, serif';
    ctx.fillText('NUMEROLOGICKÝ OTISK', centerX, 264);

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 92px Cinzel, Georgia, serif';
    ctx.fillText(String(result.lifePath), centerX, 394);

    ctx.fillStyle = '#f1d06b';
    ctx.font = '700 40px Cinzel, Georgia, serif';
    ctx.fillText(result.title.toUpperCase(), centerX, 462);

    ctx.fillStyle = 'rgba(255,255,255,0.76)';
    ctx.font = '500 32px Inter, Arial, sans-serif';
    const subject = result.displayName ? `Pro ${result.displayName}` : 'Tvoje čísla';
    ctx.fillText(subject, centerX, 522);

    drawNumerologyTile(ctx, result.numbers[0], 116, 595, 398, 238);
    drawNumerologyTile(ctx, result.numbers[1], 566, 595, 398, 238);
    drawNumerologyTile(ctx, result.numbers[2], 116, 872, 398, 238);
    drawNumerologyTile(ctx, result.numbers[3], 566, 872, 398, 238);

    ctx.fillStyle = '#f6f1ff';
    ctx.font = '500 35px Inter, Arial, sans-serif';
    const guidance = `${result.short}. Vezmi si z toho jeden konkrétní krok pro dnešní den.`;
    drawCenteredLines(ctx, wrapCanvasText(ctx, guidance, 820), centerX, 1170, 46, 2);

    ctx.fillStyle = 'rgba(255,255,255,0.78)';
    ctx.font = '500 31px Inter, Arial, sans-serif';
    ctx.fillText('mystickahvezda.cz/numerologie.html', centerX, 1244);

    ctx.fillStyle = 'rgba(212,175,55,0.9)';
    ctx.font = '600 27px Inter, Arial, sans-serif';
    ctx.fillText('Bez data narození. Jen tvůj numerologický podpis.', centerX, 1284);

    return canvas;
}

function saveNumerologyResultImage() {
    if (!lastNumerologyShareResult) return;

    const canvas = drawNumerologyResultCard(lastNumerologyShareResult);
    const link = document.createElement('a');
    link.download = `numerologie-zivotni-cesta-${lastNumerologyShareResult.lifePath}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();

    window.MH_ANALYTICS?.trackAction?.('numerology_result_image_saved', {
        source: NUMEROLOGY_RESULT_SOURCE,
        format: 'png',
        life_path: lastNumerologyShareResult.lifePath,
        destiny: lastNumerologyShareResult.destiny,
        soul: lastNumerologyShareResult.soul,
        personality: lastNumerologyShareResult.personality
    });
}

// === FORM HANDLING ===
document.addEventListener('DOMContentLoaded', async () => {
    const form = document.getElementById('numerology-form');
    const useProfileCheckbox = document.getElementById('use-profile-num');
    const saveResultButton = document.getElementById('btn-save-numerology-result');

    // Auto-load Daily Vibrations if logged in
    if (window.Auth && window.Auth.isLoggedIn()) {
        try {
            const profile = await window.Auth.getProfile();
            if (profile && profile.birth_date) {
                // Pre-calculate daily vibes without form submission
                let bDate = profile.birth_date;
                if (bDate.includes('T')) bDate = bDate.split('T')[0];

                // Import logic and display
                import('./utils/numerology-logic.js').then(module => {
                    if (module.calculatePersonalCycles) {
                        const cycles = module.calculatePersonalCycles(bDate);
                        displayPersonalCycles(cycles);
                    }
                });
            }
        } catch (e) {
            console.warn('Auto-load daily vibes failed:', e);
        }
    }

    // Toggle visibility based on auth
    if (useProfileCheckbox) {
        const wrapper = useProfileCheckbox.closest('.checkbox-wrapper');
        if (wrapper) {
            const updateVisibility = () => {
                const isVisible = window.Auth && window.Auth.isLoggedIn();
                wrapper.hidden = !isVisible;
                wrapper.classList.toggle('mh-flex-visible', isVisible);
            };
            updateVisibility();
            document.addEventListener('auth:changed', updateVisibility);
        }
    }

    // Auto-fill from profile
    if (useProfileCheckbox) {
        useProfileCheckbox.addEventListener('change', async (e) => {
            if (e.target.checked) {
                if (!window.Auth || !window.Auth.isLoggedIn()) {
                    window.Auth?.showToast?.('Přihlášení vyžadováno', 'Pro tuto funkci se musíte přihlásit.', 'info');
                    e.target.checked = false;
                    return;
                }

                const profile = await window.Auth.getProfile();
                if (profile) {
                    document.getElementById('num-name').value = profile.first_name || '';

                    if (profile.birth_date) {
                        let bDate = profile.birth_date;
                        if (bDate.includes('T')) bDate = bDate.split('T')[0];
                        document.getElementById('num-date').value = bDate;
                    }

                    if (profile.birth_time) {
                        let bTime = profile.birth_time;
                        if (bTime.length > 5) bTime = bTime.substring(0, 5);
                        document.getElementById('num-time').value = bTime;
                    }
                }
            }
        });
    }

    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }

    if (saveResultButton) {
        saveResultButton.addEventListener('click', saveNumerologyResultImage);
    }
});

async function handleFormSubmit(e) {
    e.preventDefault();

    // Restriction: Must be logged in
    if (!window.Auth || !window.Auth.isLoggedIn()) {
        window.Auth?.showToast?.('Přihlášení vyžadováno', 'Pro výpočet numerologie se prosím přihlaste.', 'info');
        startNumerologyUpgradeFlow('numerology_auth_gate', 'register');
        return;
    }

    const name = document.getElementById('num-name').value.trim();
    const birthDate = document.getElementById('num-date').value;
    const birthTime = document.getElementById('num-time').value;

    if (!name || !birthDate) {
        window.Auth?.showToast?.('Chybějící údaje', 'Vyplňte prosím jméno a datum narození.', 'error');
        return;
    }

    // Calculate numbers
    const lifePath = calculateLifePath(birthDate);
    const destiny = calculateDestiny(name);
    const soul = calculateSoul(name);
    const personality = calculatePersonality(name);

    // Calculate Personal Cycles (New Feature)
    // We import this dynamically or assume it's available via the updated logic file
    import('./utils/numerology-logic.js')
        .then(module => {
            if (module.calculatePersonalCycles) {
                const cycles = module.calculatePersonalCycles(birthDate);
                displayPersonalCycles(cycles);
            }
        })
        .catch(err => console.error('Nepodařilo se načíst numerology-logic:', err));

    // Display results
    displayResults(name, lifePath, destiny, soul, personality);

    // Show AI interpretation (with premium gate)
    await displayInterpretation(name, birthDate, birthTime, lifePath, destiny, soul, personality);
}

function displayPersonalCycles(cycles) {
    if (!cycles) return;

    const section = document.getElementById('daily-cycles');
    if (!section) return;

    const { personalYear, personalMonth, personalDay } = cycles;

    // Update Values
    document.getElementById('val-pd').textContent = personalDay;
    document.getElementById('val-pm').textContent = personalMonth;
    document.getElementById('val-py').textContent = personalYear;

    // Update Date Display
    const dateDisplay = document.getElementById('current-date-display');
    if (dateDisplay) {
        dateDisplay.textContent = new Date().toLocaleDateString('cs-CZ');
    }

    // Show Section
    section.hidden = false;
    section.classList.add('mh-block-visible');
}

function displayResults(name, lifePath, destiny, soul, personality) {
    const resultsSection = document.getElementById('numerology-results');
    if (!resultsSection) return;

    lastNumerologyShareResult = buildNumerologyShareResult(name, lifePath, destiny, soul, personality);
    window.__lastNumerologyShareResult = lastNumerologyShareResult;

    resultsSection.hidden = false;
    resultsSection.classList.add('mh-block-visible');

    const resultActions = document.getElementById('numerology-result-actions');
    if (resultActions) {
        resultActions.hidden = false;
    }

    // Scroll to results (or daily cycles if visible)
    const dailySection = document.getElementById('daily-cycles');
    if (dailySection && !dailySection.hidden) {
        dailySection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // Populate cards
    const cardData = [
        { id: 'card-lifepath', number: lifePath, label: 'Životní cesta', colorClass: 'number-card--gold' },
        { id: 'card-destiny', number: destiny, label: 'Osud', colorClass: 'number-card--blue' },
        { id: 'card-soul', number: soul, label: 'Duše', colorClass: 'number-card--green' },
        { id: 'card-personality', number: personality, label: 'Osobnost', colorClass: 'number-card--starlight' }
    ];

    cardData.forEach(({ id, number, label, colorClass }) => {
        const card = document.getElementById(id);
        if (card) {
            const meaning = NUMBER_MEANINGS[number];
            const isMaster = number === 11 || number === 22 || number === 33;
            card.innerHTML = `
                <div class="number-card ${colorClass} ${isMaster ? 'master' : ''}">
                    <div class="number-value">${number}</div>
                    <div class="number-label">${label}</div>
                    <div class="number-title">${meaning?.title || ''}</div>
                    <div class="number-meaning">${meaning?.short || ''}</div>
                </div>
            `;
        }
    });
}

async function displayInterpretation(name, birthDate, birthTime, lifePath, destiny, soul, personality) {
    const interpretationContainer = document.getElementById('num-interpretation');
    if (!interpretationContainer) return;

    // ==============================================
    // PREMIUM GATE: AI Interpretation
    // ==============================================
    const isPremium = window.Auth && window.Auth.isLoggedIn() && window.Auth.isPremium();

    if (!isPremium) {
        // FREE: Show numbers only + paywall for AI interpretation
        interpretationContainer.innerHTML = `
            <div class="interpretation-section">
                <h3>✨ Vaše Čísla</h3>
                <div class="numerology-summary-grid">
                    <div class="number-card number-card--summary number-card--summary-life">
                      <div class="number-card__summary-label">Životní Cesta</div>
                        <div class="number-card__summary-value number-card__summary-value--gold">${lifePath}</div>
                    </div>
                    <div class="number-card number-card--summary number-card--summary-destiny">
                        <div class="number-card__summary-label">Osud</div>
                        <div class="number-card__summary-value number-card__summary-value--blue">${destiny}</div>
                    </div>
                    <div class="number-card number-card--summary number-card--summary-soul">
                        <div class="number-card__summary-label">Duše</div>
                        <div class="number-card__summary-value number-card__summary-value--green">${soul}</div>
                    </div>
                    <div class="number-card number-card--summary number-card--summary-personality">
                        <div class="number-card__summary-label">Osobnost</div>
                        <div class="number-card__summary-value number-card__summary-value--starlight">${personality}</div>
                    </div>
                </div>

                <div class="numerology-premium-shell">
                    <div class="premium-locked numerology-premium-preview">
                        <h4>Hluboký Rozbor</h4>
                        <p>Objevte tajemství vašich čísel s pomocí starodávné moudrosti. Každé číslo nese v sobě mocné poselství...</p>
                        <p class="numerology-premium-preview__muted">Vaše životní cesta ${lifePath} symbolizuje...</p>
                    </div>

                    <div class="premium-lock-overlay">
                        <div class="lock-icon">🔒</div>
                        <p class="lock-text">Detailní rozbor je Premium funkce</p>
                        <button class="btn btn--gold unlock-btn numerology-upgrade-btn">🌟 Vyzkoušet 7 dní zdarma</button>
                    </div>
                </div>
            </div>
        `;

        // Track paywall hit (if premium-gates.js is loaded)
        if (window.Premium?.trackPaywallHit) window.Premium.trackPaywallHit('numerologie_vyklad');

        // Wire up the upgrade button to trial paywall
        const upgradeBtn = interpretationContainer.querySelector('.numerology-upgrade-btn');
        if (upgradeBtn) {
            upgradeBtn.addEventListener('click', () => {
                if (window.Premium?.showTrialPaywall) {
                    window.Premium.showTrialPaywall('numerologie_vyklad');
                } else {
                    startNumerologyUpgradeFlow('numerology_inline_gate', 'register');
                }
            });
        }
        return;
    }

    // PREMIUM: Show full AI interpretation
    interpretationContainer.innerHTML = `
        <div class="interpretation-loading">
            <div class="spinner"></div>
            <p class="interpretation-loading__text">Generuji hloubkovou interpretaci...</p>
        </div>
    `;

    try {
        // Call AI API for interpretation
        const apiUrl = window.API_CONFIG?.BASE_URL || '/api';
        const csrfToken = window.getCSRFToken ? await window.getCSRFToken() : null;
        const response = await fetch(`${apiUrl}/numerology`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                ...(csrfToken && { 'X-CSRF-Token': csrfToken })
            },
            body: JSON.stringify({
                name,
                birthDate,
                birthTime,
                lifePath,
                destiny,
                soul,
                personality
            })
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();

        // Display AI interpretation
        interpretationContainer.innerHTML = `
            <div class="interpretation-section">
                ${(data.cached || data.fromCache) ? '<span class="badge badge--cache">📦 Z cache (deterministic result)</span>' : ''}
                <div class="interpretation-content">
                    ${data.response.replace(/```html/g, '').replace(/```/g, '')}
                </div>
            </div>
        `;

        // Save reading to history (with birth time)
        if (window.Auth && window.Auth.saveReading) {
            const saveResult = await window.Auth.saveReading('numerology', {
                name,
                birthDate,
                birthTime,
                lifePath,
                destiny,
                soul,
                personality,
                response: data.response
            });
            if (window.MH_DEBUG) console.debug('Reading saved:', saveResult);
        }
    } catch (error) {
        console.error('AI interpretation error:', error);
        interpretationContainer.innerHTML = `
            <div class="error-message error-message--inline">
                <p class="error-message__text">❌ Nepodařilo se načíst interpretaci. Zkuste to prosím znovu.</p>
            </div>
        `;
    }
}

// Global listener for auth refresh
// When session is updated (e.g. from User -> VIP), reload to reflect changes
document.addEventListener('auth:refreshed', () => {
    if (window.MH_DEBUG) console.debug('Auth refreshed, reloading to unlock content...');
    // Add a small delay to ensure local storage is flushed
    setTimeout(() => window.location.reload(), 500);
}, { once: true });
