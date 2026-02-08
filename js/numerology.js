import {
    calculateLifePath,
    calculateDestiny,
    calculateSoul,
    calculatePersonality,
    NUMBER_MEANINGS
} from './utils/numerology-logic.js';

// === FORM HANDLING ===
document.addEventListener('DOMContentLoaded', async () => {
    const form = document.getElementById('numerology-form');
    const useProfileCheckbox = document.getElementById('use-profile-num');

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
                wrapper.style.display = (window.Auth && window.Auth.isLoggedIn()) ? 'flex' : 'none';
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
});

async function handleFormSubmit(e) {
    e.preventDefault();

    // Restriction: Must be logged in
    if (!window.Auth || !window.Auth.isLoggedIn()) {
        window.Auth?.showToast?.('Přihlášení vyžadováno', 'Pro výpočet numerologie se prosím přihlaste.', 'info');
        window.Auth?.openModal?.('login');
        return;
    }

    const name = document.getElementById('num-name').value.trim();
    const birthDate = document.getElementById('num-date').value;
    const birthTime = document.getElementById('num-time').value;

    if (!name || !birthDate) {
        alert('Vyplňte prosím jméno a datum narození');
        return;
    }

    // Calculate numbers
    const lifePath = calculateLifePath(birthDate);
    const destiny = calculateDestiny(name);
    const soul = calculateSoul(name);
    const personality = calculatePersonality(name);

    // Calculate Personal Cycles (New Feature)
    // We import this dynamically or assume it's available via the updated logic file
    import('./utils/numerology-logic.js').then(module => {
        if (module.calculatePersonalCycles) {
            const cycles = module.calculatePersonalCycles(birthDate);
            displayPersonalCycles(cycles);
        }
    });

    // Display results
    displayResults(lifePath, destiny, soul, personality);

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
    section.style.display = 'block';
}

function displayResults(lifePath, destiny, soul, personality) {
    const resultsSection = document.getElementById('numerology-results');
    if (!resultsSection) return;

    resultsSection.style.display = 'block';

    // Scroll to results (or daily cycles if visible)
    const dailySection = document.getElementById('daily-cycles');
    if (dailySection && dailySection.style.display !== 'none') {
        dailySection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // Populate cards
    const cardData = [
        { id: 'card-lifepath', number: lifePath, label: 'Životní cesta', color: '#d4af37' },
        { id: 'card-destiny', number: destiny, label: 'Osud', color: '#3498db' },
        { id: 'card-soul', number: soul, label: 'Duše', color: '#2ecc71' },
        { id: 'card-personality', number: personality, label: 'Osobnost', color: '#f1c40f' }
    ];

    cardData.forEach(({ id, number, label, color }) => {
        const card = document.getElementById(id);
        if (card) {
            const meaning = NUMBER_MEANINGS[number];
            const isMaster = number === 11 || number === 22 || number === 33;
            card.innerHTML = `
                <div class="number-card ${isMaster ? 'master' : ''}" style="--card-color: ${color}">
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
    const isPremium = await window.Premium.checkStatus();

    if (!isPremium) {
        // FREE: Show numbers only + paywall for AI interpretation
        interpretationContainer.innerHTML = `
            <div class="interpretation-section">
                <h3>✨ Vaše Čísla</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin: 2rem 0;">
                    <div class="number-card" style="background: linear-gradient(135deg, rgba(155, 89, 182, 0.2), rgba(52, 152, 219, 0.2)); padding: 1.5rem; border-radius: 12px; text-align: center;">
                      <div style="font-size: 0.9rem; opacity: 0.8; margin-bottom: 0.5rem;">Životní Cesta</div>
                        <div style="font-size: 3rem; font-weight: 700; color: var(--color-mystic-gold);">${lifePath}</div>
                    </div>
                    <div class="number-card" style="background: linear-gradient(135deg, rgba(52, 152, 219, 0.2), rgba(46, 204, 113, 0.2)); padding: 1.5rem; border-radius: 12px; text-align: center;">
                        <div style="font-size: 0.9rem; opacity: 0.8; margin-bottom: 0.5rem;">Osud</div>
                        <div style="font-size: 3rem; font-weight: 700; color: var(--color-electric-blue);">${destiny}</div>
                    </div>
                    <div class="number-card" style="background: linear-gradient(135deg, rgba(46, 204, 113, 0.2), rgba(241, 196, 15, 0.2)); padding: 1.5rem; border-radius: 12px; text-align: center;">
                        <div style="font-size: 0.9rem; opacity: 0.8; margin-bottom: 0.5rem;">Duše</div>
                        <div style="font-size: 3rem; font-weight: 700; color: var(--color-cosmic-green);">${soul}</div>
                    </div>
                    <div class="number-card" style="background: linear-gradient(135deg, rgba(241, 196, 15, 0.2), rgba(230, 126, 34, 0.2)); padding: 1.5rem; border-radius: 12px; text-align: center;">
                        <div style="font-size: 0.9rem; opacity: 0.8; margin-bottom: 0.5rem;">Osobnost</div>
                        <div style="font-size: 3rem; font-weight: 700; color: var(--color-starlight);">${personality}</div>
                    </div>
                </div>

                <div class="premium-locked" style="position: relative; margin-top: 2rem; padding: 3rem; background: linear-gradient(135deg, rgba(30, 20, 50, 0.8), rgba(42, 26, 78, 0.8)); border-radius: 15px; filter: blur(5px);">
                    <h4>Hluboký Rozbor</h4>
                    <p>Objevte tajemství vašich čísel s pomocí starodávné moudrosti. Každé číslo nese v sobě mocné poselství...</p>
                    <p style="opacity: 0.7;">Vaše životní cesta ${lifePath} symbolizuje...</p>
                </div>
                
                <div class="premium-lock-overlay">
                    <div class="lock-icon">🔒</div>
                    <p class="lock-text">Detailní rozbor je Premium funkce</p>
                    <button class="btn btn--gold unlock-btn" onclick="window.Premium.showPaywall('numerology')">💎 Odemknout Premium</button>
                </div>
            </div>
        `;

        // Track paywall hit
        window.Premium.trackPaywallHit('numerology');
        return;
    }

    // PREMIUM: Show full AI interpretation
    interpretationContainer.innerHTML = `
        <div class="interpretation-loading" style="text-align: center; padding: 2rem;">
            <div class="spinner"></div>
            <p style="margin-top: 1rem; color: var(--color-silver-mist);">Generuji hloubkovou interpretaci...</p>
        </div>
    `;

    try {
        // Call AI API for interpretation
        const token = window.Auth?.token || localStorage.getItem('auth_token');
        const apiUrl = window.API_CONFIG?.BASE_URL || 'http://localhost:3001/api';
        const response = await fetch(`${apiUrl}/numerology`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
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
                ${data.fromCache ? '<span class="badge badge--cache">📦 Z cache (deterministic result)</span>' : ''}
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
                personality
            });
            console.log('Reading saved:', saveResult);
        }
    } catch (error) {
        console.error('AI interpretation error:', error);
        interpretationContainer.innerHTML = `
            <div class="error-message" style="background: rgba(231, 76, 60, 0.1); padding: 1.5rem; border-radius: 10px; border-left: 4px solid #e74c3c;">
                <p style="color: #e74c3c; margin: 0;">❌ Nepodařilo se načíst interpretaci. Zkuste to prosím znovu.</p>
            </div>
        `;
    }
}

// Global listener for auth refresh
// When session is updated (e.g. from User -> VIP), reload to reflect changes
document.addEventListener('auth:refreshed', () => {
    console.log('🔄 Auth refreshed, reloading to unlock content...');
    // Add a small delay to ensure local storage is flushed
    setTimeout(() => window.location.reload(), 500);
}, { once: true });
