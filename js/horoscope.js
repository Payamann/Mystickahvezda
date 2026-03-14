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
            <p class="fade-in-text" style="display: block; margin-top: 10px; transition: opacity 0.3s ease;">Naladění na energii vašeho znamení...</p>
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
                    window.Auth?.showToast?.('Premium funkce', 'Týdenní a měsíční horoskopy jsou dostupné pouze pro Premium uživatele.', 'info');
                    setTimeout(() => { window.location.href = 'cenik.html'; }, 1500);
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

            // Detect current language
            const path = window.location.pathname;
            let currentLang = 'cs';
            if (path.includes('/sk/')) currentLang = 'sk';
            else if (path.includes('/pl/')) currentLang = 'pl';

            // Update Date/Period label
            const periodLabels = {
                'cs': { 'daily': 'Dnes', 'weekly': 'Tento týden', 'monthly': 'Tento měsíc' },
                'sk': { 'daily': 'Dnes', 'weekly': 'Tento týždeň', 'monthly': 'Tento mesiac' },
                'pl': { 'daily': 'Dzisiaj', 'weekly': 'W tym tygodniu', 'monthly': 'W tym miesiącu' }
            };

            // Show loading, hide content
            if (contentContainer) contentContainer.classList.add('hidden');
            loadingState.classList.remove('hidden');

            // Mystical loading messages
            const loadingMessages = {
                'cs': [
                    "Navazuji spojení s Vesmírem...",
                    "Čtu postavení vašich hvězd...",
                    "Analyzuji planetární vlivy...",
                    "Překládám zprávy osudu...",
                    "Finalizuji vaši předpověď..."
                ],
                'sk': [
                    "Nadväzujem spojenie s Vesmírom...",
                    "Čítam postavenie vašich hviezd...",
                    "Analyzujem planetárne vplyvy...",
                    "Prekladám správy osudu...",
                    "Finalizujem vašu predpoveď..."
                ],
                'pl': [
                    "Nawiązuję połączenie z Wszechświatem...",
                    "Czytam układ Twoich gwiazd...",
                    "Analizuję wpływy planetarne...",
                    "Tłumaczę przesłania losu...",
                    "Finalizuję Twoją przepowiednię..."
                ]
            };

            const currentMsgs = loadingMessages[currentLang] || loadingMessages['cs'];
            const loadingText = loadingState.querySelector('p');
            let msgIndex = 0;

            // Reset to first message
            if (loadingText) loadingText.innerText = currentMsgs[0];

            // Cycle messages every 2.5 seconds
            const loadingInterval = setInterval(() => {
                msgIndex = (msgIndex + 1) % currentMsgs.length;
                if (loadingText) {
                    loadingText.style.opacity = '0';
                    setTimeout(() => {
                        loadingText.innerText = currentMsgs[msgIndex];
                        loadingText.style.opacity = '1';
                    }, 300); // Wait for fade out
                }
            }, 2500);

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

                // Call Gemini AI via server with period AND context AND lang using centralized callAPI
                const data = await window.callAPI('/horoscope', {
                    sign: signName,
                    period: currentPeriod,
                    context: context,
                    lang: currentLang
                });

                const dateLocales = { 'cs': 'cs-CZ', 'sk': 'sk-SK', 'pl': 'pl-PL' };
                const today = new Date().toLocaleDateString(dateLocales[currentLang] || 'cs-CZ', {
                    day: 'numeric', month: 'long', year: 'numeric', weekday: 'long'
                });

                if (detailDate) {
                    detailDate.innerText = `${periodLabels[currentLang][currentPeriod] || periodLabels['cs'][currentPeriod]} • ${today}`;
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
                let cleanPrediction = predictionData.prediction || (currentLang === 'sk' ? 'Energie sú dnes nejasné...' : (currentLang === 'pl' ? 'Energie są dziś niejasne...' : 'Energie jsou dnes nejasné...'));

                // Pattern to match *Afirmace: ...*  or **Afirmace:** ... or Afirmace: ...
                // Including translations for "Afirmace"
                const affirmationPatterns = [
                    /\*\*?(?:Afirmace|Afirmácia|Afirmacja):?\*?\*?\s*[^*]*\*?/gi,
                    /(?:Afirmace|Afirmácia|Afirmacja):\s*.+$/gim
                ];

                for (const pattern of affirmationPatterns) {
                    const match = cleanPrediction.match(pattern);
                    if (match && !extractedAffirmation) {
                        // Extract the affirmation text (remove markdown)
                        extractedAffirmation = match[0]
                            .replace(/\*+/g, '')
                            .replace(/^(?:Afirmace|Afirmácia|Afirmacja):?\s*/i, '')
                            .trim();
                    }
                    cleanPrediction = cleanPrediction.replace(pattern, '').trim();
                }

                if (detailText) {
                    detailText.innerText = cleanPrediction;
                }

                // Update additional fields
                if (detailWork) {
                    const affLabel = { 'cs': 'Afirmace', 'sk': 'Afirmácia', 'pl': 'Afirmacja' }[currentLang] || 'Afirmace';
                    const affFallback = { 'cs': 'Jsem v souladu s vesmírem.', 'sk': 'Som v súlade s vesmírom.', 'pl': 'Jestem w harmonii z wszechświatem.' }[currentLang] || 'Jsem v souladu s vesmírem.';
                    
                    const affirmationText = predictionData.affirmation || extractedAffirmation || affFallback;
                    detailWork.innerHTML = `<strong style="color: var(--color-starlight);">✨ ${affLabel}:</strong> ${affirmationText}`;
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
                    if (error.status === 402 || error.code === 'PREMIUM_REQUIRED') {
                        detailText.innerHTML = `
                            <div class="text-center">
                                <p style="color: var(--color-gold); font-weight: bold;">Tato funkce vyžaduje Premium</p>
                                <p>Týdenní a měsíční horoskopy jsou hlubší analýzy dostupné našim Premium hvezdoplavcům.</p>
                                <a href="cenik.html" class="btn btn--glass" style="margin-top: 15px;">Získat Premium</a>
                            </div>
                        `;
                    } else if (error.status === 429) {
                        detailText.innerText = "Dnes jste již vyčerpali své hvězdné limity. Vesmír potřebuje čas na regeneraci. Vraťte se prosím zítra nebo upgradujte na Premium.";
                    } else {
                        detailText.innerText = "Vesmír je momentálně tichý. Zkuste se ztišit i vy a přijďte prosím později (Chyba: " + (error.message || 'Neznámá') + ").";
                    }
                }
            } finally {
                // Hide loading, show content
                loadingState.classList.add('hidden');
                if (contentContainer) {
                    contentContainer.classList.remove('hidden');
                    contentContainer.classList.add('fade-in');
                }
                if (typeof loadingInterval !== 'undefined') clearInterval(loadingInterval);
            }
        });
    });

    // AUTO-SELECT LOGIC
    const autoSelectSign = () => {
        // 1. Try URL hash (#byk)
        const hash = window.location.hash.substring(1);
        if (hash) {
            const card = Array.from(zodiacCards).find(c => {
                const href = c.getAttribute('href');
                return href && href.substring(1) === hash;
            });
            if (card) {
                card.click();
                return true;
            }
        }

        // 2. Try User Personalization (window.MH_PERSONALIZATION)
        if (window.MH_PERSONALIZATION) {
            const userSign = window.MH_PERSONALIZATION.getSign();
            if (userSign) {
                const card = Array.from(zodiacCards).find(c => {
                    const href = c.getAttribute('href');
                    return href && href.substring(1) === userSign;
                });
                if (card) {
                    card.click();
                    return true;
                }
            }
        }
        return false;
    };

    // Run auto-select after a short delay to ensure everything is ready
    setTimeout(autoSelectSign, 100);
}

function generateLuckyNumbers() {
    const nums = [];
    while (nums.length < 4) {
        const n = Math.floor(Math.random() * 90) + 1;
        if (!nums.includes(n)) nums.push(n);
    }
    return nums.join(', ');
}
