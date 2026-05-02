/**
 * Mysticka Hvezda - Horoscope Module (AI-Powered)
 * Supports Daily, Weekly, and Monthly horoscopes for all zodiac signs
 */

document.addEventListener('DOMContentLoaded', () => {
    initHoroscope();
});

function buildHoroscopeUpgradeUrl(period) {
    const pricingUrl = new URL('/cenik.html', window.location.origin);
    pricingUrl.searchParams.set('plan', 'pruvodce');
    pricingUrl.searchParams.set('source', 'horoscope_inline_upsell');
    pricingUrl.searchParams.set('feature', `${period}_horoscope`);
    return `${pricingUrl.pathname}${pricingUrl.search}`;
}

function startHoroscopeUpgradeFlow(period, reason) {
    window.MH_ANALYTICS?.trackCTA?.('horoscope_inline_upsell', {
        plan_id: 'pruvodce',
        period,
        reason
    });

    if (window.Auth?.startPlanCheckout) {
        window.Auth.startPlanCheckout('pruvodce', {
            source: 'horoscope_inline_upsell',
            feature: `${period}_horoscope`,
            redirect: '/cenik.html',
            authMode: window.Auth?.isLoggedIn?.() ? 'login' : 'register'
        });
        return;
    }

    window.location.href = buildHoroscopeUpgradeUrl(period);
}

function getSavedZodiacSign() {
    const hasLoginCookie = document.cookie.split(';').some((cookie) => cookie.trim() === 'logged_in=1');
    if (!hasLoginCookie || !window.Auth?.isLoggedIn?.()) return null;

    const personalizedSign = window.MH_PERSONALIZATION?.getSign?.();
    if (personalizedSign) return personalizedSign;

    try {
        const prefs = JSON.parse(localStorage.getItem('mh_user_prefs') || '{}');
        return prefs.sign || localStorage.getItem('mh_zodiac') || null;
    } catch {
        return localStorage.getItem('mh_zodiac') || null;
    }
}

function buildHoroscopeUpsell(period) {
    const isWeekly = period === 'weekly';
    const title = isWeekly ? 'Odemknete tydenni vyhled' : 'Odemknete mesicni vyhled';
    const copy = isWeekly
        ? 'Tydenni horoskop spojuje jednotlive dny do jednoho smeru a ukaze, kde ma smysl pridat a kde ubrat.'
        : 'Mesicni horoskop dava sirsi kontext a pomuze vam cist delsi cyklus misto jedine dnesni nalady.';

    return `
        <div class="card glass-card horoscope-upsell">
            <div class="horoscope-upsell__eyebrow">Premium odemkne vic</div>
            <h3 class="horoscope-upsell__title">${title}</h3>
            <p class="horoscope-upsell__copy">${copy}</p>
            <div class="horoscope-upsell__actions">
                <button type="button" class="btn btn--primary horoscope-upsell-btn" data-plan="pruvodce" data-source="horoscope_inline_upsell" data-feature="${period}_horoscope">Odemknout Hvezdneho Pruvodce</button>
                <a href="${buildHoroscopeUpgradeUrl(period)}" class="btn btn--glass">Nejdriv si projit plany</a>
            </div>
        </div>
    `;
}

function initHoroscope() {
    const zodiacCards = document.querySelectorAll('.zodiac-card');
    const detailSection = document.getElementById('horoscope-detail-section');
    const tabs = document.querySelectorAll('.tab');

    let currentPeriod = 'daily';

    const detailSymbol = document.getElementById('detail-symbol');
    const detailName = document.getElementById('detail-name');
    const detailDate = document.getElementById('detail-date');
    const detailText = document.getElementById('detail-text');
    const detailWork = document.getElementById('detail-work');
    const detailRelationships = document.getElementById('detail-relationships');
    const detailNumbers = document.getElementById('detail-numbers');
    const sectionBadge = document.querySelector('.horoscope-wrapper .section__badge');

    const contentContainer = document.querySelector('.horoscope-content');
    const loadingState = document.createElement('div');
    loadingState.className = 'horoscope-loading hidden';
    loadingState.innerHTML = `
        <div class="text-center">
            <span class="loading-spinner horoscope-loading__spinner"></span>
            <p class="fade-in-text horoscope-loading__text">Naladeni na energii vaseho znameni...</p>
        </div>
    `;

    if (contentContainer) {
        contentContainer.parentNode.insertBefore(loadingState, contentContainer);
    }

    const renderInlineUpsell = (period, reason = 'premium') => {
        if (!detailText) return;

        const reasonText = reason === 'auth'
            ? '<p class="horoscope-upsell-reason">Pro tenhle typ horoskopu je potreba ucet, protoze si uklada hlubsi osobni kontext.</p>'
            : '';

        detailText.innerHTML = `${reasonText}${buildHoroscopeUpsell(period)}`;
        if (detailWork) detailWork.innerHTML = '';
        if (detailRelationships) detailRelationships.hidden = true;
        if (detailNumbers) detailNumbers.innerText = '-';

        const upsellBtn = detailText.querySelector('.horoscope-upsell-btn');
        upsellBtn?.addEventListener('click', () => {
            startHoroscopeUpgradeFlow(period, reason);
        });

        if (detailSection) {
            detailSection.dataset.loaded = 'false';
            detailSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    tabs.forEach((tab) => {
        tab.addEventListener('click', () => {
            const selectedTab = tab.dataset.tab;

            if (selectedTab === 'weekly' || selectedTab === 'monthly') {
                if (!window.Auth || !window.Auth.isLoggedIn()) {
                    renderInlineUpsell(selectedTab, 'auth');
                    return;
                }

                if (!window.Auth.isPremium()) {
                    renderInlineUpsell(selectedTab, 'premium');
                    return;
                }
            }

            tabs.forEach((item) => {
                item.classList.remove('active');
                item.setAttribute('aria-selected', 'false');
            });
            tab.classList.add('active');
            tab.setAttribute('aria-selected', 'true');

            currentPeriod = selectedTab;

            const periodLabels = {
                daily: 'Denni horoskop',
                weekly: 'Tydenni horoskop',
                monthly: 'Mesicni horoskop'
            };
            if (sectionBadge) {
                sectionBadge.textContent = periodLabels[currentPeriod] || 'Denni horoskop';
            }

            const activeZodiac = document.querySelector('.zodiac-card.active');
            if (activeZodiac) {
                selectZodiac(activeZodiac, true);
            }
        });
    });

    const selectZodiac = async (card, skipScroll = false) => {
        zodiacCards.forEach((item) => item.classList.remove('active'));
        card.classList.add('active');

        if (!skipScroll) {
            detailSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        const signName = card.querySelector('.zodiac-card__name').innerText;
        const signSymbol = card.querySelector('.zodiac-card__symbol').innerText;

        if (detailName) detailName.innerText = signName;
        if (detailSymbol) detailSymbol.innerText = signSymbol;
        if (document.getElementById('bg-symbol')) {
            document.getElementById('bg-symbol').innerText = signSymbol;
        }

        const path = window.location.pathname;
        let currentLang = 'cs';
        if (path.includes('/sk/')) currentLang = 'sk';
        else if (path.includes('/pl/')) currentLang = 'pl';

        const periodLabels = {
            cs: { daily: 'Dnes', weekly: 'Tento tyden', monthly: 'Tento mesic' },
            sk: { daily: 'Dnes', weekly: 'Tento tyzden', monthly: 'Tento mesiac' },
            pl: { daily: 'Dzisiaj', weekly: 'W tym tygodniu', monthly: 'W tym miesiacu' }
        };

        if (contentContainer) contentContainer.classList.add('hidden');
        loadingState.classList.remove('hidden');

        const loadingMessages = {
            cs: [
                'Navazuji spojeni s Vesmirem...',
                'Ctu postaveni vasich hvezd...',
                'Analyzuji planetarni vlivy...',
                'Prekladam zpravy osudu...',
                'Finalizuji vasi predpoved...'
            ],
            sk: [
                'Nadvazujem spojenie s Vesmirom...',
                'Citam postavenie vasich hviezd...',
                'Analyzujem planetarne vplyvy...',
                'Prekladam spravy osudu...',
                'Finalizujem vasu predpoved...'
            ],
            pl: [
                'Nawiazuje polaczenie z Wszechswiatem...',
                'Czytam uklad Twoich gwiazd...',
                'Analizuje wplywy planetarne...',
                'Tlumacze przeslania losu...',
                'Finalizuje Twoja przepowiednie...'
            ]
        };

        const currentMsgs = loadingMessages[currentLang] || loadingMessages.cs;
        const loadingText = loadingState.querySelector('p');
        let msgIndex = 0;

        if (loadingText) loadingText.innerText = currentMsgs[0];

        const loadingInterval = setInterval(() => {
            msgIndex = (msgIndex + 1) % currentMsgs.length;
            if (loadingText) {
                loadingText.classList.add('is-fading');
                setTimeout(() => {
                    loadingText.innerText = currentMsgs[msgIndex];
                    loadingText.classList.remove('is-fading');
                }, 300);
            }
        }, 2500);

        try {
            let context = [];
            try {
                if (window.Auth && window.Auth.isLoggedIn()) {
                    const journalRes = await fetch(`${window.API_CONFIG?.BASE_URL || '/api'}/user/readings`, {
                        credentials: 'include'
                    });
                    if (!journalRes.ok) throw new Error(`Journal fetch failed: ${journalRes.status}`);
                    const journalData = await journalRes.json();
                    context = (journalData.readings || [])
                        .filter((reading) => reading.type === 'journal')
                        .slice(0, 3)
                        .map((reading) => reading.data.text);
                }
            } catch (error) {
                console.warn('Failed to fetch journal context:', error);
            }

            const data = await window.callAPI('/horoscope', {
                sign: signName,
                period: currentPeriod,
                context,
                lang: currentLang
            });

            const dateLocales = { cs: 'cs-CZ', sk: 'sk-SK', pl: 'pl-PL' };
            const today = new Date().toLocaleDateString(dateLocales[currentLang] || 'cs-CZ', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                weekday: 'long'
            });

            if (detailDate) {
                detailDate.innerText = `${periodLabels[currentLang][currentPeriod] || periodLabels.cs[currentPeriod]} - ${today}`;
            }

            let predictionData;
            let extractedAffirmation = null;

            try {
                predictionData = typeof data.response === 'string' ? JSON.parse(data.response) : data.response;
            } catch {
                predictionData = { prediction: data.response, affirmation: null, luckyNumbers: null };
            }

            let cleanPrediction = predictionData.prediction || 'Energie jsou dnes nejasne...';
            const affirmationPatterns = [
                /\*\*?(?:Afirmace|Afirmacia|Afirmacja):?\*?\*?\s*[^*]*\*?/gi,
                /(?:Afirmace|Afirmacia|Afirmacja):\s*.+$/gim
            ];

            for (const pattern of affirmationPatterns) {
                const match = cleanPrediction.match(pattern);
                if (match && !extractedAffirmation) {
                    extractedAffirmation = match[0]
                        .replace(/\*+/g, '')
                        .replace(/^(?:Afirmace|Afirmacia|Afirmacja):?\s*/i, '')
                        .trim();
                }
                cleanPrediction = cleanPrediction.replace(pattern, '').trim();
            }

            if (detailText) {
                detailText.innerText = cleanPrediction;
            }

            if (detailWork) {
                const affLabel = { cs: 'Afirmace', sk: 'Afirmacia', pl: 'Afirmacja' }[currentLang] || 'Afirmace';
                const affFallback = { cs: 'Jsem v souladu s vesmirem.', sk: 'Som v sulade s vesmirom.', pl: 'Jestem w harmonii z wszechswiatem.' }[currentLang] || 'Jsem v souladu s vesmirem.';
                const affirmationText = predictionData.affirmation || extractedAffirmation || affFallback;
                const rawHtml = `<strong class="horoscope-affirmation-label">&#10024; ${affLabel}:</strong> ${affirmationText}`;
                const sanitized = typeof DOMPurify !== 'undefined' ? DOMPurify.sanitize(rawHtml) : rawHtml;
                detailWork.innerHTML = sanitized;
            }

            if (detailRelationships) detailRelationships.hidden = true;

            if (detailNumbers) {
                if (predictionData.luckyNumbers && Array.isArray(predictionData.luckyNumbers)) {
                    detailNumbers.innerText = predictionData.luckyNumbers.join(', ');
                } else {
                    detailNumbers.innerText = generateLuckyNumbers();
                }
            }

            if (detailSection) detailSection.dataset.loaded = 'true';

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

                    const existingBtn = document.getElementById('favorite-horoscope-btn');
                    if (!existingBtn && contentContainer) {
                        const favoriteBtn = document.createElement('div');
                        favoriteBtn.className = 'text-center favorite-reading-action';
                        favoriteBtn.innerHTML = `
                            <button id="favorite-horoscope-btn" class="btn btn--glass favorite-reading-action__button">
                                <span class="favorite-icon">&#9733;</span> Pridat do oblibenych
                            </button>
                        `;
                        contentContainer.appendChild(favoriteBtn);

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
                    renderInlineUpsell(currentPeriod, 'premium');
                } else if (error.status === 429) {
                    detailText.innerText = 'Dnes jste jiz vycerpali sve hvezdne limity. Vratte se zitra nebo upgradujte na Premium.';
                } else {
                    detailText.innerText = `Vesmir je momentalne tichy. Zkuste to prosim pozdeji (Chyba: ${error.message || 'Neznama'}).`;
                }
            }
        } finally {
            loadingState.classList.add('hidden');
            if (contentContainer) {
                contentContainer.classList.remove('hidden');
                contentContainer.classList.add('fade-in');
            }
            clearInterval(loadingInterval);
        }
    };

    zodiacCards.forEach((card) => {
        card.addEventListener('click', async (event) => {
            event.preventDefault();
            selectZodiac(card, false);
        });
    });

    const autoSelectSign = () => {
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(window.location.search);
        const requestedSign = hash || params.get('sign') || params.get('znak');

        if (requestedSign) {
            const card = Array.from(zodiacCards).find((item) => {
                const href = item.getAttribute('href');
                return href && href.substring(1) === requestedSign;
            });
            if (card) {
                selectZodiac(card, false);
                return true;
            }
        }

        const userSign = getSavedZodiacSign();
        if (userSign) {
            const card = Array.from(zodiacCards).find((item) => {
                const href = item.getAttribute('href');
                return href && href.substring(1) === userSign;
            });
            if (card) {
                selectZodiac(card, true);
                return true;
            }
        }
        return false;
    };

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
