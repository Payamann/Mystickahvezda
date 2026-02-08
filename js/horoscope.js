/**
 * Mystická Hvězda - Horoscope Module (AI-Powered)
 * Supports Daily, Weekly, and Monthly horoscopes for all zodiac signs
 */

document.addEventListener('DOMContentLoaded', () => {
    initHoroscope();
});

function initHoroscope() {
    const zodiacCards = document.querySelectorAll('.zodiac-card');
    const detailSection = document.getElementById('horoscope-detail-section');
    const tabs = document.querySelectorAll('.tab');

    // Track current period (default: daily)
    let currentPeriod = 'daily';

    // Elements to update
    const detailSymbol = document.getElementById('detail-symbol');
    const detailName = document.getElementById('detail-name');
    const detailDate = document.getElementById('detail-date');
    const detailText = document.getElementById('detail-text');
    const detailWork = document.getElementById('detail-work');
    const detailRelationships = document.getElementById('detail-relationships');
    const detailNumbers = document.getElementById('detail-numbers');
    const sectionBadge = document.querySelector('.horoscope-wrapper .section__badge');

    // UI State elements
    const contentContainer = document.querySelector('.horoscope-content');
    const loadingState = document.createElement('div');
    loadingState.className = 'horoscope-loading hidden';
    loadingState.innerHTML = `
        <div class="text-center">
            <span class="loading-spinner" style="width: 30px; height: 30px; border-width: 3px;"></span>
            <p class="fade-in-text" style="display: block; margin-top: 10px;">Naladění na energii vašeho znamení...</p>
        </div>
    `;

    // Insert loading state before content
    if (contentContainer) {
        contentContainer.parentNode.insertBefore(loadingState, contentContainer);
    }

    // Handle tab switching
    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => { // Accept event 'e'
            const selectedTab = tab.dataset.tab;

            // PREMIUM GATE: Weekly & Monthly
            if (selectedTab === 'weekly' || selectedTab === 'monthly') {
                if (!window.Auth || !window.Auth.isLoggedIn()) {
                    window.Auth?.showToast('Přihlášení vyžadováno', 'Pro ' + (selectedTab === 'weekly' ? 'týdenní' : 'měsíční') + ' horoskop se musíte přihlásit.', 'info');
                    window.Auth?.openModal('login');
                    return;
                }

                if (!window.Auth.isPremium()) {
                    // Check if there is a trial or soft gate? No, price list says Premium.
                    if (confirm('Tato funkce je dostupná pouze pro Premium uživatele.\n\nChcete vyzkoušet Premium na 7 dní zdarma?')) {
                        window.location.href = 'cenik.html';
                    }
                    return;
                }
            }

            tabs.forEach(t => {
                t.classList.remove('active');
                t.setAttribute('aria-selected', 'false');
            });
            tab.classList.add('active');
            tab.setAttribute('aria-selected', 'true');

            // Update period
            currentPeriod = selectedTab;

            // Update badge text
            const periodLabels = {
                'daily': 'Denní horoskop',
                'weekly': 'Týdenní horoskop',
                'monthly': 'Měsíční horoskop'
            };
            if (sectionBadge) {
                sectionBadge.textContent = periodLabels[currentPeriod] || 'Denní horoskop';
            }

            // If a zodiac is already selected, reload the horoscope with new period
            const activeZodiac = document.querySelector('.zodiac-card.active');
            if (activeZodiac) {
                activeZodiac.click();
            }
        });
    });

    // Handle zodiac card click
    zodiacCards.forEach(card => {
        card.addEventListener('click', async (e) => {
            e.preventDefault();

            // Remove active class from all
            zodiacCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');

            // Scroll to detail section
            detailSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

            // Get sign data
            const signName = card.querySelector('.zodiac-card__name').innerText;
            const signSymbol = card.querySelector('.zodiac-card__symbol').innerText;

            // Update static header immediately
            if (detailName) detailName.innerText = signName;
            if (detailSymbol) detailSymbol.innerText = signSymbol;
            if (document.getElementById('bg-symbol')) {
                document.getElementById('bg-symbol').innerText = signSymbol;
            }

            // Show loading, hide content
            if (contentContainer) contentContainer.classList.add('hidden');
            loadingState.classList.remove('hidden');

            try {
                // PHASE 3: Fetch Journal Context (AI Synergy)
                let context = [];
                try {
                    if (window.Auth && window.Auth.isLoggedIn()) {
                        const journalRes = await fetch(`${window.API_CONFIG?.BASE_URL || 'http://localhost:3001/api'}/user/readings`, {
                            headers: { 'Authorization': `Bearer ${window.Auth.token}` }
                        });
                        const jData = await journalRes.json();
                        // Filter for 'journal' type and take last 3
                        context = (jData.readings || [])
                            .filter(r => r.type === 'journal')
                            .slice(0, 3)
                            .map(r => r.data.text);
                    }
                } catch (e) {
                    console.warn('Failed to fetch journal context:', e);
                }

                // Call Gemini AI via server with period AND context
                const response = await fetch(`${window.API_CONFIG?.BASE_URL || 'http://localhost:3001/api'}/horoscope`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sign: signName,
                        period: currentPeriod,
                        context: context // Send context to API
                    })
                });

                const data = await response.json();

                // Update Date/Period label
                const periodLabels = {
                    'daily': 'Dnes',
                    'weekly': 'Tento týden',
                    'monthly': 'Tento měsíc'
                };
                const today = new Date().toLocaleDateString('cs-CZ', {
                    day: 'numeric', month: 'long', year: 'numeric', weekday: 'long'
                });
                if (detailDate) {
                    detailDate.innerText = `${periodLabels[currentPeriod] || 'Dnes'} • ${today}`;
                }

                let predictionData;
                let extractedAffirmation = null;

                try {
                    // Try to parse if response is a JSON string
                    predictionData = typeof data.response === 'string' ? JSON.parse(data.response) : data.response;
                } catch (e) {
                    console.warn('Failed to parse horoscope JSON, using raw text');
                    predictionData = { prediction: data.response, affirmation: null, luckyNumbers: null };
                }

                // Clean prediction text: remove embedded affirmations
                let cleanPrediction = predictionData.prediction || 'Energie jsou dnes nejasné...';

                // Pattern to match *Afirmace: ...*  or **Afirmace:** ... or Afirmace: ...
                const affirmationPatterns = [
                    /\*\*?Afirmace:?\*?\*?\s*[^*]*\*?/gi,  // *Afirmace: text* or **Afirmace:** text
                    /Afirmace:\s*.+$/gim                   // Afirmace: text at the end
                ];

                for (const pattern of affirmationPatterns) {
                    const match = cleanPrediction.match(pattern);
                    if (match && !extractedAffirmation) {
                        // Extract the affirmation text (remove markdown)
                        extractedAffirmation = match[0]
                            .replace(/\*+/g, '')
                            .replace(/^Afirmace:?\s*/i, '')
                            .trim();
                    }
                    cleanPrediction = cleanPrediction.replace(pattern, '').trim();
                }

                if (detailText) {
                    detailText.innerText = cleanPrediction;
                }

                // Update additional fields
                if (detailWork) {
                    // Prefer API affirmation, then extracted, then fallback
                    const affirmationText = predictionData.affirmation || extractedAffirmation || 'Jsem v souladu s vesmírem.';
                    detailWork.innerHTML = `<strong style="color: var(--color-starlight);">✨ Afirmace:</strong> ${affirmationText}`;
                }
                if (detailRelationships) detailRelationships.style.display = 'none';

                if (detailNumbers) {
                    if (predictionData.luckyNumbers && Array.isArray(predictionData.luckyNumbers)) {
                        detailNumbers.innerText = predictionData.luckyNumbers.join(', ');
                    } else {
                        detailNumbers.innerText = generateLuckyNumbers();
                    }
                }

                // Save reading and add favorite button (skip if already saved for same sign/period)
                const saveKey = `horoscope_saved_${signName}_${currentPeriod}_${new Date().toISOString().split('T')[0]}`;
                if (window.Auth && window.Auth.saveReading && !sessionStorage.getItem(saveKey)) {
                    sessionStorage.setItem(saveKey, '1');
                    const saveResult = await window.Auth.saveReading('horoscope', {
                        sign: signName,
                        period: currentPeriod,
                        prediction: cleanPrediction,
                        affirmation: predictionData.affirmation || extractedAffirmation,
                        luckyNumbers: predictionData.luckyNumbers || generateLuckyNumbers()
                    });

                    if (saveResult && saveResult.id) {
                        window.currentHoroscopeReadingId = saveResult.id;

                        // Add favorite button if not already present
                        const existingBtn = document.getElementById('favorite-horoscope-btn');
                        if (!existingBtn && contentContainer) {
                            const favoriteBtn = document.createElement('div');
                            favoriteBtn.className = 'text-center';
                            favoriteBtn.style.marginTop = 'var(--space-xl)';
                            favoriteBtn.innerHTML = `
                                <button id="favorite-horoscope-btn" class="btn btn--glass" style="min-width: 200px;">
                                    <span class="favorite-icon">⭐</span> Přidat do oblíbených
                                </button>
                            `;
                            contentContainer.appendChild(favoriteBtn);

                            // Attach listener
                            document.getElementById('favorite-horoscope-btn').addEventListener('click', async () => {
                                await toggleFavorite(window.currentHoroscopeReadingId, 'favorite-horoscope-btn');
                            });
                        }
                    }
                }

            } catch (error) {
                console.error('Horoscope error:', error);
                if (detailText) {
                    detailText.innerText = "Vesmír je momentálně tichý. Zkuste se ztišit i vy a přijďte prosím později.";
                }
            } finally {
                // Hide loading, show content
                loadingState.classList.add('hidden');
                if (contentContainer) {
                    contentContainer.classList.remove('hidden');
                    contentContainer.classList.add('fade-in');
                }
            }
        });
    });
}

function generateLuckyNumbers() {
    const nums = [];
    while (nums.length < 4) {
        const n = Math.floor(Math.random() * 90) + 1;
        if (!nums.includes(n)) nums.push(n);
    }
    return nums.join(', ');
}
