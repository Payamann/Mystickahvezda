/**
 * Mystická Hvězda - Tarot Reading (Predefined Interpretations)
 * Beautiful animations with instant card readings
 */

// Tarot Card Data (Loaded from JSON)
let TAROT_CARDS = {};
// Convert to array for backward compatibility
let TAROT_CARDS_ARRAY = [];

function getTarotPlanForSpread(spreadType) {
    return spreadType === 'Celtic Cross' ? 'vip-majestrat' : 'pruvodce';
}

function startTarotUpgradeFlow(spreadType, source = 'tarot_inline_upsell') {
    const planId = getTarotPlanForSpread(spreadType);
    window.MH_ANALYTICS?.trackCTA?.(source, {
        plan_id: planId,
        spread_type: spreadType
    });
    window.Auth?.startPlanCheckout?.(planId, {
        source,
        feature: spreadType === 'Celtic Cross' ? 'tarot_celtic_cross' : 'tarot_multi_card',
        redirect: '/cenik.html',
        authMode: window.Auth?.isLoggedIn?.() ? 'login' : 'register'
    });
}

function bindTarotImageFallbacks(root) {
    root.querySelectorAll('.tarot-card-image').forEach((image) => {
        image.addEventListener('error', () => {
            if (image.dataset.fallbackApplied === '1') return;
            image.dataset.fallbackApplied = '1';
            image.src = '/img/tarot/tarot_placeholder.webp';
        });
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadTarotData();
    initTarot();
});

async function loadTarotData() {
    try {
        const response = await fetch('/data/tarot-cards.json?v=2');
        if (!response.ok) throw new Error('Failed to load tarot data');
        TAROT_CARDS = await response.json();
        TAROT_CARDS_ARRAY = Object.keys(TAROT_CARDS);
        if (window.MH_DEBUG) console.debug('Tarot data loaded:', TAROT_CARDS_ARRAY.length, 'cards');
    } catch (error) {
        console.error('CRITICAL: Failed to load tarot cards:', error);
        const container = document.querySelector('.tarot-deck');
        if (container) {
            container.innerHTML = '<div class="text-center tarot-load-error">Nepodařilo se načíst data karet. Zkontrolujte připojení.</div>';
        }
    }
}

function initTarot() {
    const spreadButtons = document.querySelectorAll('.spread-trigger');
    const spreadCards = document.querySelectorAll('.t-spread-card');
    const deckContainer = document.querySelector('.tarot-deck');

    if (!deckContainer) return;

    // Create Results Container if not exists
    let resultsContainer = document.getElementById('tarot-results');
    if (!resultsContainer) {
        resultsContainer = document.createElement('div');
        resultsContainer.id = 'tarot-results';
        resultsContainer.className = 'container hidden tarot-results';
        const parentSection = deckContainer.closest('.section');
        if (parentSection) {
            parentSection.after(resultsContainer);
        } else {
            document.body.appendChild(resultsContainer);
        }
    }

    // Handle Selection Logic
    spreadCards.forEach(card => {
        card.addEventListener('click', () => {
            // Remove featured from all
            spreadCards.forEach(c => {
                c.classList.remove('featured');
                const btn = c.querySelector('.btn');
                if (btn) {
                    btn.classList.remove('btn--primary');
                    btn.classList.add('btn--glass');
                }
            });

            // Add featured to clicked
            card.classList.add('featured');
            const btn = card.querySelector('.btn');
            if (btn) {
                btn.classList.remove('btn--glass');
                btn.classList.add('btn--primary');
            }
        });
    });

    spreadButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            const spreadType = btn.dataset.spreadType;

            // PREMIUM CHECK - SOFT GATE UPDATE
            // If spread is NOT 'Jedna karta', we verify premium but allow free users to "try" (view 1st card)
            let isSoftGated = false;

            if (spreadType !== 'Jedna karta') {
                if (!window.Auth || !window.Auth.isLoggedIn()) {
                    window.Auth?.showToast('Přihlášení vyžadováno', 'Pro vstup do Hvězdného Průvodce se prosím přihlaste.', 'info');
                    startTarotUpgradeFlow(spreadType, 'tarot_auth_gate');
                    return;
                }

                if (!window.Auth?.isPremium()) {
                    isSoftGated = true;

                    // Check daily limit for free teaser
                    const today = new Date().toISOString().split('T')[0];
                    let usage = {};
                    try { usage = JSON.parse(localStorage.getItem('tarot_free_usage') || '{}'); }
                    catch { localStorage.removeItem('tarot_free_usage'); }

                    if (usage.date === today && usage.count >= 1) {
                        window.Auth.showToast('Limit vyčerpán 🔒', 'Dnešní ukázka zdarma již byla vyčerpána. Získejte Premium pro neomezené výklady.', 'error');
                        startTarotUpgradeFlow(spreadType, 'tarot_limit_gate');
                        return;
                    }

                    // Increment usage
                    localStorage.setItem('tarot_free_usage', JSON.stringify({ date: today, count: 1 }));
                }
            }

            // Ensure visual selection matches what we clicked
            const parentCard = btn.closest('.t-spread-card');
            if (parentCard && !parentCard.classList.contains('featured')) {
                parentCard.click(); // Trigger selection logic programmatically
            }

            if (spreadType) {
                startReading(spreadType, isSoftGated);
            }
        });
    });

    // Add click listeners to deck cards
    const deckCards = deckContainer.querySelectorAll('.tarot-card');
    deckCards.forEach(card => {
        card.classList.add('tarot-card--clickable');
        card.addEventListener('click', () => {
            // Default to currently selected spread or 'Jedna karta'
            const selectedBtn = document.querySelector('.t-spread-card.featured .btn');
            const spreadType = selectedBtn ? selectedBtn.dataset.spreadType : 'Jedna karta';
            startReading(spreadType);
        });
    });
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

async function startReading(spreadType, isSoftGated = false) {
    const deckContainer = document.querySelector('.tarot-deck');
    if (!deckContainer) return;

    // First scroll to deck so user can see the shuffle animation
    deckContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await new Promise(r => setTimeout(r, 300));

    // 1. Shuffle Animation - make it more visible
    deckContainer.classList.add('tarot-deck--shuffle-scale');
    deckContainer.classList.add('shaking');
    await new Promise(r => setTimeout(r, 1500)); // Longer shuffle
    deckContainer.classList.remove('shaking');
    deckContainer.classList.remove('tarot-deck--shuffle-scale');

    // Small pause after shuffle
    await new Promise(r => setTimeout(r, 300));

    // 2. Draw Cards - only from cards that have images
    const cardsWithImages = TAROT_CARDS_ARRAY.filter(name => TAROT_CARDS[name].image);

    // Determine number of cards based on spread type
    let numCards = 1;
    if (spreadType === 'Tři karty') numCards = 3;
    if (spreadType === 'Celtic Cross') numCards = 10;

    const drawnCardNames = [];

    while (drawnCardNames.length < numCards && drawnCardNames.length < cardsWithImages.length) {
        const randomCard = cardsWithImages[Math.floor(Math.random() * cardsWithImages.length)];
        if (!drawnCardNames.includes(randomCard)) drawnCardNames.push(randomCard);
    }

    // Get card data
    const drawnCards = drawnCardNames.map(name => ({
        name,
        ...TAROT_CARDS[name]
    }));

    // 3. Show Cards with Flip Animation
    const resultsContainer = document.getElementById('tarot-results');
    if (!resultsContainer) return;

    // Use responsive grid class based on number of cards
    // For Celtic Cross (10 cards), we might want a different grid or just standard grid-5 wrap
    const gridClass = numCards === 1 ? 'grid-1' : (numCards <= 3 ? `grid-${numCards}` : 'grid-5');

    // Build initial layout (cards face down)
    resultsContainer.innerHTML = `
        <div class="text-center">
            <h3 class="mb-lg tarot-results__title">✨ Vaše vylosované karty ✨</h3>
            <div class="tarot-spread grid ${gridClass} tarot-results__spread">
                ${drawnCards.map((card, index) => {
        const isLocked = isSoftGated && index > 0;
        return `
                    <div class="tarot-flip-card ${isLocked ? 'locked-card' : ''}" data-index="${index}">
                        <div class="tarot-flip-inner">
                            <div class="tarot-flip-front">
                                <img src="img/tarot-back.webp" alt="Tarot Card Back">
                            </div>
                            <div class="tarot-flip-back ${card.image ? 'has-image' : ''}">
                                ${isLocked ? `
                                    <div class="premium-lock-overlay tarot-card-lock">
                                        <div class="lock-icon tarot-card-lock__icon">🔒</div>
                                        <h2 class="tarot-card-lock__title">Pouze pro Premium</h2>
                                        <p class="tarot-card-lock__copy">
                                            Hvězdný Průvodce je exkluzivní zdroj moudrosti pro naše předplatitele.<br>
                                            Odemkněte plný potenciál a získejte přístup ke všem výkladům.
                                        </p>
                                        <a href="cenik.html" class="btn btn--primary">Získat Premium</a>
                                    </div>
                                    <img src="img/tarot-back.webp" class="tarot-card-image--locked" alt="Locked">
                                ` : (card.image ? `
                                    <img src="${card.image}" alt="${escapeHtml(card.name)}" class="tarot-card-image" loading="lazy">
                                ` : `
                                    <div class="tarot-card-content">
                                        <span class="tarot-card-emoji">${card.emoji}</span>
                                        <h4 class="tarot-card-name">${escapeHtml(card.name)}</h4>
                                        <p class="tarot-card-meaning">${escapeHtml(card.meaning)}</p>
                                    </div>
                                `)}
                            </div>
                        </div>
                    </div>
                `}).join('')}
            </div>
            <div id="interpretations-container" class="tarot-interpretations"></div>
             ${isSoftGated ? `
                <div class="text-center mt-xl p-lg tarot-soft-gate">
                    <h3 class="tarot-soft-gate__title">Odemkněte svůj osud</h3>
                    <p class="mb-lg">Právě jste nahlédli za oponu. Zbývajících ${numCards - 1} karet skrývá klíč k pochopení celé situace.</p>
                    <a href="cenik.html" class="btn btn--primary">Získat Premium a odhalit vše</a>
                </div>
            ` : ''}
        </div>
    `;

    resultsContainer.classList.remove('hidden');
    bindTarotImageFallbacks(resultsContainer);
    resultsContainer.querySelectorAll('a[href="cenik.html"]').forEach((link) => {
        link.addEventListener('click', (event) => {
            event.preventDefault();
            const source = link.closest('.premium-lock-overlay') ? 'tarot_locked_card' : 'tarot_teaser_banner';
            startTarotUpgradeFlow(spreadType, source);
        });
    });

    // Now scroll to results
    await new Promise(r => setTimeout(r, 100));
    resultsContainer.scrollIntoView({ behavior: 'smooth' });

    // 4. Trigger flip animation for each card sequentially
    const flipCards = resultsContainer.querySelectorAll('.tarot-flip-card');

    for (let i = 0; i < flipCards.length; i++) {
        await new Promise(r => setTimeout(r, 600)); // Delay between flips
        flipCards[i].classList.add('flipped');

        // Sound effect removed (invalid audio data)
    }

    // 5. After all cards flipped, show interpretations
    await new Promise(r => setTimeout(r, 800));

    const interpretationsContainer = document.getElementById('interpretations-container');

    // Build interpretations HTML with PROFESSIONAL UI DESIGN
    let interpretationsHtml = drawnCards.map((card, index) => {
        if (isSoftGated && index > 0) return ''; // Skip interpretation for locked cards

        let positionLabel = '';
        if (spreadType === 'Tři karty') {
            positionLabel = ['📜 Minulost', '⏳ Přítomnost', '🔮 Budoucnost'][index] || '';
        } else if (spreadType === 'Celtic Cross') {
            positionLabel = ['🎯 Situace', '⚔️ Výzva', '💫 Podvědomí', '🏛️ Základ', '🌅 Minulost', '🔮 Budoucnost', '🧘 Postoj', '🌍 Vliv okolí', '💭 Naděje/Obavy', '🏁 Výsledek'][index] || '';
        }

        // Determine Arcana Type
        const isMajor = Object.keys(TAROT_CARDS).indexOf(card.name) < 22;

        if (window.Templates) {
            return window.Templates.renderTarotResult(card, index, isMajor, positionLabel);
        } else {
            console.error('Templates library missing');
            return '';
        }
    }).join('');

    // Add final summary for multi-card spreads - different layouts based on spread type
    // Add final summary for multi-card spreads
    if (numCards > 1 && window.Templates && !isSoftGated) {
        if (spreadType === 'Tři karty') {
            interpretationsHtml += window.Templates.renderSummary3Card(drawnCards);
        } else if (spreadType === 'Celtic Cross') {
            interpretationsHtml += window.Templates.renderSummaryCeltic(drawnCards);
        } else {
            interpretationsHtml += window.Templates.renderSummaryDefault(drawnCards);
        }
    }

    // IMPORTANT: Set innerHTML FIRST, then trigger async AI summary
    interpretationsContainer.innerHTML = interpretationsHtml;

    // Trigger spiritual summary after DOM is updated
    if (numCards > 1 && !isSoftGated) {
        setTimeout(() => generateEtherealSummary(drawnCards, spreadType), 500);
    } else {
        // For single-card readings OR gated readings (Card 1 only), save
        // Actually, for gated reading we might not want to save to DB as a "reading" or maybe yes but with incomplete data?
        // Let's save it so they have it in history (as a tease).

        if (window.Auth && window.Auth.saveReading) {
            const cardsData = drawnCards.slice(0, isSoftGated ? 1 : undefined).map((card, index) => ({
                name: card.name,
                position: 'Jedna karta', // simplified for gated
                meaning: card.meaning
            }));

            const saveResult = await window.Auth.saveReading('tarot', {
                spreadType: isSoftGated ? `${spreadType} (Ukázka)` : spreadType,
                cards: cardsData
            });

            // Store reading ID and add favorite button
            if (saveResult && saveResult.id) {
                window.currentTarotReadingId = saveResult.id;

                // Add favorite button after interpretations
                const favoriteBtn = document.createElement('div');
                favoriteBtn.className = 'text-center favorite-reading-action';
                favoriteBtn.innerHTML = `
                    <button id="favorite-tarot-btn" class="btn btn--glass favorite-reading-action__button">
                        <span class="favorite-icon">⭐</span> Přidat do oblíbených
                    </button>
                `;
                interpretationsContainer.appendChild(favoriteBtn);

                // Attach listener
                document.getElementById('favorite-tarot-btn').addEventListener('click', async () => {
                    await toggleFavorite(window.currentTarotReadingId, 'favorite-tarot-btn');
                });
            }
        }
    }
}

/**
 * Generates an ethereal summary for the tarot reading
 * @param {Array} cards - Array of drawn card objects
 * @param {String} spreadType - Type of spread used
 */
async function generateEtherealSummary(cards, spreadType) {
    const summaryContainer = document.getElementById('ethereal-tarot-summary');
    if (!summaryContainer) return;

    try {
        // Prepare card data for API
        const cardsData = cards.map((card, index) => {
            let positionLabel = '';
            if (spreadType === 'Tři karty') {
                positionLabel = ['Minulost', 'Přítomnost', 'Budoucnost'][index] || `Pozice ${index + 1}`;
            } else if (spreadType === 'Celtic Cross') {
                const labels = ['Situace', 'Výzva', 'Podvědomí', 'Základ', 'Minulost', 'Budoucnost', 'Postoj', 'Vliv okolí', 'Naděje/Obavy', 'Výsledek'];
                positionLabel = labels[index] || `Pozice ${index + 1}`;
            } else {
                positionLabel = `Karta ${index + 1}`;
            }

            return {
                name: card.name,
                position: positionLabel,
                meaning: card.meaning // Sending brief meaning to help AI context
            };
        });

        // Detect current language
        const path = window.location.pathname;
        let currentLang = 'cs';
        if (path.includes('/sk/')) currentLang = 'sk';
        else if (path.includes('/pl/')) currentLang = 'pl';

        const csrfToken = window.getCSRFToken ? await window.getCSRFToken() : null;
        const response = await fetch(`${window.API_CONFIG?.BASE_URL || '/api'}/tarot-summary`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                ...(csrfToken && { 'X-CSRF-Token': csrfToken })
            },
            body: JSON.stringify({
                spreadType,
                cards: cardsData,
                lang: currentLang
            })
        });

        const data = await response.json();

        if (data.success) {
            const text = data.response;
            const formattedText = text.split('\n').filter(line => line.trim().length > 0).map(line => `<p class="mb-md">${line}</p>`).join('');

            summaryContainer.innerHTML = typeof DOMPurify !== 'undefined' ? DOMPurify.sanitize(formattedText) : formattedText;

            // Save to history if logged in and store reading ID
            if (window.Auth && window.Auth.saveReading) {
                const saveResult = await window.Auth.saveReading('tarot', {
                    spreadType,
                    cards: cardsData,
                    response: data.response
                });

                // Store reading ID globally for favorite button
                if (saveResult && saveResult.id) {
                    window.currentTarotReadingId = saveResult.id;

                    // Add favorite button after summary
                    const favoriteBtn = document.createElement('div');
                    favoriteBtn.className = 'text-center favorite-reading-action';
                    favoriteBtn.innerHTML = `
                        <button id="favorite-tarot-btn" class="btn btn--glass favorite-reading-action__button">
                            <span class="favorite-icon">⭐</span> Přidat do oblíbených
                        </button>
                    `;
                    summaryContainer.parentElement.appendChild(favoriteBtn);

                    // Attach listener
                    document.getElementById('favorite-tarot-btn').addEventListener('click', async () => {
                        await toggleFavorite(window.currentTarotReadingId, 'favorite-tarot-btn');
                    });
                }
            }
            summaryContainer.parentElement.classList.add('fade-in');
        } else {
            throw new Error(data.error || 'Failed to generate summary');
        }

    } catch (error) {
        console.error('AI Summary Error:', error);
        summaryContainer.innerHTML = `
            <p class="text-center tarot-summary-error">
                <em>Hvězdy jsou nyní příliš daleko... (Spojení selhalo)</em>
            </p>
        `;
    }
}
