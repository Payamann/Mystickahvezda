/**
 * Mystická Hvězda - Tarot Reading (Predefined Interpretations)
 * Beautiful animations with instant card readings
 */

// Tarot Card Data (Loaded from JSON)
let TAROT_CARDS = {};
// Convert to array for backward compatibility
let TAROT_CARDS_ARRAY = [];

document.addEventListener('DOMContentLoaded', async () => {
    await loadTarotData();
    initTarot();
});

async function loadTarotData() {
    try {
        const response = await fetch('data/tarot-cards.json?v=2');
        if (!response.ok) throw new Error('Failed to load tarot data');
        TAROT_CARDS = await response.json();
        TAROT_CARDS_ARRAY = Object.keys(TAROT_CARDS);
        console.log('🃏 Tarot Data Loaded:', TAROT_CARDS_ARRAY.length, 'cards');
    } catch (error) {
        console.error('CRITICAL: Failed to load tarot cards:', error);
        const container = document.querySelector('.tarot-deck');
        if (container) {
            container.innerHTML = '<div class="text-center" style="color: #ff6b6b; padding: 2rem;">Nepodařilo se načíst data karet. Zkontrolujte připojení.</div>';
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
        resultsContainer.className = 'container hidden';
        resultsContainer.style.marginTop = 'var(--space-2xl)';
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
                    window.Auth?.showToast('Přihlášení vyžadováno', 'Pro tento výklad se musíte přihlásit.', 'info');
                    window.Auth?.openModal('login');
                    return;
                }

                if (!window.Auth.isPremium()) {
                    isSoftGated = true;

                    // Check daily limit for free teaser
                    const today = new Date().toISOString().split('T')[0];
                    const usage = JSON.parse(localStorage.getItem('tarot_free_usage') || '{}');

                    if (usage.date === today && usage.count >= 1) {
                        window.Auth.showToast('Limit vyčerpán 🔒', 'Dnešní ukázka zdarma již byla vyčerpána. Získejte Premium pro neomezené výklady.', 'error');
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
        card.style.cursor = 'pointer';
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
    deckContainer.style.transform = 'scale(1.05)';
    deckContainer.classList.add('shaking');
    await new Promise(r => setTimeout(r, 1500)); // Longer shuffle
    deckContainer.classList.remove('shaking');
    deckContainer.style.transform = '';

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
            <h3 class="mb-lg" style="color: var(--color-mystic-gold);">✨ Vaše vylosované karty ✨</h3>
            <div class="tarot-spread grid ${gridClass}" style="gap: var(--space-lg); margin-bottom: var(--space-xl); max-width: 1200px; margin-left: auto; margin-right: auto;">
                ${drawnCards.map((card, index) => {
        const isLocked = isSoftGated && index > 0;
        return `
                    <div class="tarot-flip-card ${isLocked ? 'locked-card' : ''}" data-index="${index}" style="--flip-delay: ${index * 0.3}s;">
                        <div class="tarot-flip-inner">
                            <div class="tarot-flip-front">
                                <img src="img/tarot-back.webp" alt="Tarot Card Back">
                            </div>
                            <div class="tarot-flip-back ${card.image ? 'has-image' : ''}">
                                ${isLocked ? `
                                    <div class="premium-lock-overlay" style="position: absolute; inset: 0; background: rgba(0,0,0,0.8); display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 10;">
                                        <div class="lock-icon" style="font-size: 2rem;">🔒</div>
                                        <p style="color: var(--color-mystic-gold); font-size: 0.8rem; margin: 0.5rem 0;">Premium</p>
                                    </div>
                                    <img src="img/tarot-back.webp" style="filter: blur(5px); opacity: 0.5;" alt="Locked">
                                ` : (card.image ? `
                                    <img src="${card.image}?v=${Date.now()}" onerror="this.onerror=null;this.src='img/tarot/tarot_placeholder.webp'" alt="${escapeHtml(card.name)}" class="tarot-card-image">
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
            <div id="interpretations-container" style="margin-top: var(--space-xl);"></div>
             ${isSoftGated ? `
                <div class="text-center mt-xl p-lg" style="background: rgba(212, 175, 55, 0.1); border: 1px solid var(--color-mystic-gold); border-radius: 12px; max-width: 600px; margin: 2rem auto;">
                    <h3 style="color: var(--color-mystic-gold);">Odemkněte svůj osud</h3>
                    <p class="mb-lg">Právě jste nahlédli za oponu. Zbývajících ${numCards - 1} karet skrývá klíč k pochopení celé situace.</p>
                    <a href="cenik.html" class="btn btn--primary">Získat Premium a odhalit vše</a>
                </div>
            ` : ''}
        </div>
    `;

    resultsContainer.classList.remove('hidden');

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

    // Trigger AI summary after DOM is updated
    if (numCards > 1 && !isSoftGated) {
        setTimeout(() => generateAiSummary(drawnCards, spreadType), 500);
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
                favoriteBtn.className = 'text-center';
                favoriteBtn.style.marginTop = 'var(--space-xl)';
                favoriteBtn.innerHTML = `
                    <button id="favorite-tarot-btn" class="btn btn--glass" style="min-width: 200px;">
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
 * Generates an AI summary for the tarot reading
 * @param {Array} cards - Array of drawn card objects
 * @param {String} spreadType - Type of spread used
 */
async function generateAiSummary(cards, spreadType) {
    const summaryContainer = document.getElementById('ai-tarot-summary');
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

        const response = await fetch('/api/tarot-summary', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                spreadType,
                cards: cardsData
            })
        });

        const data = await response.json();

        if (data.success) {
            const text = data.response;
            const formattedText = text.split('\n').filter(line => line.trim().length > 0).map(line => `<p class="mb-md">${line}</p>`).join('');

            summaryContainer.innerHTML = formattedText;

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
                    favoriteBtn.className = 'text-center';
                    favoriteBtn.style.marginTop = 'var(--space-xl)';
                    favoriteBtn.innerHTML = `
                        <button id="favorite-tarot-btn" class="btn btn--glass" style="min-width: 200px;">
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
            <p class="text-center" style="color: var(--color-silver-mist);">
                <em>Hvězdy jsou nyní příliš daleko... (Spojení selhalo)</em>
            </p>
        `;
    }
}
