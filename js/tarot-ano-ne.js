/**
 * tarot-ano-ne.js - Logika pro Tarot ANO/NE
 */
(function () {
    const answers = {
        ano: {
            label: 'ANO', emoji: '✅', class: 'ano',
            texts: [
                'Hvězdy hovoří jasně — ano, je to správná cesta. Důvěřujte svému instinktu.',
                'Karty naznačují pozitivní výsledek. Jednejte s důvěrou.',
                'Energie je příznivá. Toto je správný čas pro váš záměr.',
                'Vesmír vám dává zelenou. Vaše intuice vás vede správně.',
                'Ano — ale pamatujte, že akce jsou v rukou vaší svobodné vůle.',
                'Výsledek bude pozitivní, pokud jednat s upřímností a odvahou.',
                'Karty vidí příznivou cestu. Máte vnitřní sílu to uskutečnit.',
                'Ano. Připravte se přijmout to, o co jste žádali.',
                'Tarot souhlasí. Vaše srdce zná odpověď.',
                'Ano — a brzké kroky tuto šanci posílí.',
            ]
        },
        spise_ano: {
            label: 'SP͊E ANO', emoji: '🌟', class: 'mozna',
            texts: [
                'Znamení ukazují spíše pozitivní výsledek, ale záleží na vašich dalších krocích.',
                'Pravděpodobně ano — i když cesta nemusí být přímočará.',
                'Šance je na vaší straně, ale buďte trpěliví.',
                'Karty vidí naději. Věci se vyvíjejí správným směrem.',
                'Spíše ano, pokud zachováte jasnou mysl a otevřenost.',
            ]
        },
        nejasne: {
            label: 'NEJASNÉ', emoji: '🔮', class: 'mozna',
            texts: [
                'Budoucnost je zatím otevřená. Otázka možná ještě není zralá.',
                'Karty vidí mlhu. Zkuste se zeptat znovu jinou cestou nebo jindy.',
                'Energie jsou nevyvážené. Počkejte a pak se znovu zeptejte.',
                'Odpověď není ještě pevná — záleží na mnoha faktorech.',
                'Výsledek závisí na vašich příštích rozhodnutích.',
            ]
        },
        spise_ne: {
            label: 'SP͊E NE', emoji: '⚠️', class: 'ne',
            texts: [
                'Karty varují před touto cestou. Zvažte alternativy.',
                'Spíše ne — ale není to definitivní. Okolnosti se mohou změnit.',
                'Energie není příznivá pro tento záměr v tuto chvíli.',
                'Tarot doporučuje opatrnost a přehodnocení situace.',
                'Možná není vhodný čas. Zeptejte se, co vás brzdí.',
            ]
        },
        ne: {
            label: 'NE', emoji: '🚨', class: 'ne',
            texts: [
                'Karty jasně varují. Tato cesta není pro vás to pravé.',
                'Ne — ale každá zavřená brána vede k jiným možnostem.',
                'Tarot vidí překážky. Přijměte tuto odpověď jako vedení, ne jako trest.',
                'Tento záměr nenese dobré ovoce. Hledejte jinou cestu.',
                'Ne. Vaše intuice vám možná říká totéž.',
            ]
        }
    };

    // Distribuce: 25% ANO, 20% SPÍŠE ANO, 20% NEJASNÉ, 20% SPÍŠE NE, 15% NE
    const pool = [
        'ano', 'ano', 'ano', 'ano', 'ano',
        'spise_ano', 'spise_ano', 'spise_ano', 'spise_ano',
        'nejasne', 'nejasne', 'nejasne', 'nejasne',
        'spise_ne', 'spise_ne', 'spise_ne', 'spise_ne',
        'ne', 'ne', 'ne'
    ];

    let used = false;

    const TAROT_YES_NO_FEATURE = 'tarot_multi_card';
    const TAROT_YES_NO_PLAN_ID = 'pruvodce';
    const TAROT_YES_NO_RESULT_SOURCE = 'tarot_yes_no_result';

    function buildTarotYesNoUpgradeUrl(source = TAROT_YES_NO_RESULT_SOURCE) {
        const pricingUrl = new URL('/cenik.html', window.location.origin);
        pricingUrl.searchParams.set('plan', TAROT_YES_NO_PLAN_ID);
        pricingUrl.searchParams.set('source', source);
        pricingUrl.searchParams.set('feature', TAROT_YES_NO_FEATURE);
        return `${pricingUrl.pathname}${pricingUrl.search}`;
    }

    async function trackTarotYesNoFunnelEvent(eventName, source, metadata = {}) {
        try {
            const csrfToken = window.getCSRFToken ? await window.getCSRFToken() : null;
            if (!csrfToken) return;

            await fetch(`${window.API_CONFIG?.BASE_URL || '/api'}/payment/funnel-event`, {
                method: 'POST',
                credentials: 'include',
                keepalive: true,
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': csrfToken
                },
                body: JSON.stringify({
                    eventName,
                    source,
                    feature: TAROT_YES_NO_FEATURE,
                    planId: TAROT_YES_NO_PLAN_ID,
                    metadata: {
                        path: window.location.pathname,
                        ...metadata
                    }
                })
            });
        } catch (error) {
            console.warn('[Tarot ANO/NE funnel] Could not record event:', error.message);
        }
    }

    function startTarotYesNoUpgradeFlow(source = TAROT_YES_NO_RESULT_SOURCE) {
        window.MH_ANALYTICS?.trackCTA?.(source, {
            plan_id: TAROT_YES_NO_PLAN_ID,
            feature: TAROT_YES_NO_FEATURE
        });

        void trackTarotYesNoFunnelEvent('paywall_cta_clicked', source, {
            destination: '/cenik.html'
        });

        if (window.Auth?.startPlanCheckout) {
            window.Auth.startPlanCheckout(TAROT_YES_NO_PLAN_ID, {
                source,
                feature: TAROT_YES_NO_FEATURE,
                redirect: '/cenik.html',
                authMode: window.Auth?.isLoggedIn?.() ? 'login' : 'register'
            });
            return;
        }

        window.location.href = buildTarotYesNoUpgradeUrl(source);
    }

    function setBlockVisible(element, visible) {
        if (!element) return;
        element.hidden = !visible;
        element.classList.toggle('mh-block-visible', visible);
    }

    function getVisibleCookieBannerOffset() {
        const banner = document.getElementById('cookie-banner');
        if (!banner || banner.hidden || !banner.classList.contains('visible')) return 0;

        const viewportHeight = window.visualViewport?.height || window.innerHeight;
        const rect = banner.getBoundingClientRect();
        return Math.max(0, viewportHeight - rect.top + 16);
    }

    function scrollTarotResultIntoView(panel, behavior = 'smooth') {
        if (!panel) return;

        const viewportHeight = window.visualViewport?.height || window.innerHeight;
        const reservedBottom = getVisibleCookieBannerOffset();
        const availableHeight = Math.max(320, viewportHeight - reservedBottom);
        const rect = panel.getBoundingClientRect();
        const targetTop = window.scrollY + rect.top - Math.max(86, (availableHeight - rect.height) / 2);

        window.scrollTo({
            top: Math.max(0, targetTop),
            behavior
        });
    }

    function getResultMetadata(answerKey, ans, question) {
        return {
            answer_key: answerKey,
            answer_label: ans.label,
            has_question: Boolean(question),
            question_length: Math.min((question || '').length, 200)
        };
    }

    function revealTarotYesNoNextStep(answerKey, ans, question) {
        const nextStep = document.getElementById('tarot-yes-no-next-step');
        const answerBadge = document.getElementById('tarot-yes-no-next-answer');
        if (!nextStep) return;

        if (answerBadge) {
            answerBadge.textContent = ans.label.toLowerCase();
        }

        nextStep.dataset.answerKey = answerKey;
        setBlockVisible(nextStep, true);

        const metadata = getResultMetadata(answerKey, ans, question);
        window.MH_ANALYTICS?.trackAction?.('tarot_yes_no_result_bridge_viewed', {
            ...metadata,
            feature: TAROT_YES_NO_FEATURE,
            source: TAROT_YES_NO_RESULT_SOURCE
        });
        void trackTarotYesNoFunnelEvent('paywall_viewed', TAROT_YES_NO_RESULT_SOURCE, metadata);
    }

    function bindTarotYesNoBridgeLinks() {
        document.querySelectorAll('[data-tarot-yes-no-upgrade]').forEach((link) => {
            if (link.dataset.tarotYesNoBound === 'true') return;
            link.dataset.tarotYesNoBound = 'true';
            link.addEventListener('click', (event) => {
                event.preventDefault();
                startTarotYesNoUpgradeFlow(link.dataset.tarotYesNoUpgrade || TAROT_YES_NO_RESULT_SOURCE);
            });
        });

        document.querySelectorAll('[data-tarot-yes-no-intent]').forEach((link) => {
            if (link.dataset.tarotYesNoBound === 'true') return;
            link.dataset.tarotYesNoBound = 'true';
            link.addEventListener('click', () => {
                window.MH_ANALYTICS?.trackCTA?.('tarot_yes_no_intent', {
                    intent: link.dataset.tarotYesNoIntent,
                    destination: link.getAttribute('href') || '',
                    source: TAROT_YES_NO_RESULT_SOURCE
                });
            });
        });
    }

    function flipCard(card, index) {
        if (used) return;

        const inputEl = document.getElementById('question-input');
        const q = inputEl.value.trim();

        if (!q) {
            // Zobrazíme UX upozornění - uživatel musí vyplnit otázku
            inputEl.focus();
            inputEl.classList.add('input--invalid');

            // Přidat "shake" animaci k elementu
            inputEl.classList.remove('shake');
            void inputEl.offsetWidth; // trigger reflow
            inputEl.classList.add('shake');

            // Zpráva do konzole pro jistotu (lze pak ztlumit)
            console.warn('Tarot: Pokus o tažení karty bez zadané otázky.');
            return;
        }

        // Obnovíme původní barvu ohraničení InputBoxu
        inputEl.classList.remove('input--invalid');
        inputEl.classList.remove('shake');

        used = true;

        // Uzamčeme ostatní karty
        document.querySelectorAll('.tarot-card').forEach(c => c.classList.add('tarot-card--locked'));

        // Vyhodnocení
        const key = pool[Math.floor(Math.random() * pool.length)];
        const ans = answers[key];
        const text = ans.texts[Math.floor(Math.random() * ans.texts.length)];

        // Vložení resultu na Front (Přední líc karty)
        const front = card.querySelector('.card-front');
        front.classList.add(ans.class);
        front.innerHTML = `<span class="card-emoji">${ans.emoji}</span><span class="answer-label">${ans.label}</span>`;

        // Otočení animací
        card.classList.add('flipped');

        // Mírné zpoždění na otočku a zobrazení panelu s textem
        setTimeout(() => {
            document.getElementById('result-emoji').textContent = ans.emoji;
            document.getElementById('result-title').textContent = ans.label;
            const resultTitle = document.getElementById('result-title');
            resultTitle.classList.remove('result-title--yes', 'result-title--no', 'result-title--maybe');
            resultTitle.classList.add(ans.class === 'ano' ? 'result-title--yes' : (ans.class === 'ne' ? 'result-title--no' : 'result-title--maybe'));
            document.getElementById('result-text').textContent = text;
            const panel = document.getElementById('result-panel');
            panel.classList.add('show');
            revealTarotYesNoNextStep(key, ans, q);
            scrollTarotResultIntoView(panel);
            setTimeout(() => scrollTarotResultIntoView(panel), 320);
        }, 800);
    }

    function resetCards() {
        used = false;
        document.getElementById('question-input').value = '';
        document.getElementById('question-input').classList.remove('input--invalid');
        document.getElementById('result-panel').classList.remove('show');
        setBlockVisible(document.getElementById('tarot-yes-no-next-step'), false);

        document.querySelectorAll('.tarot-card').forEach(c => {
            c.classList.remove('flipped', 'tarot-card--locked');
            const front = c.querySelector('.card-front');
            front.className = 'card-front card-face';
            front.innerHTML = '';
        });

        // Smooth srcoll opět lehce zpátky k inputu po tichém doznění
        setTimeout(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 150);
    }

    function initTarotAnoNe() {
        const cardsArea = document.getElementById('cards-area');
        const btnReset = document.getElementById('btn-reset');

        if (cardsArea) {
            cardsArea.addEventListener('click', (e) => {
                const card = e.target.closest('.tarot-card');
                if (card) {
                    const idx = card.getAttribute('data-index');
                    if (idx !== null) {
                        flipCard(card, parseInt(idx));
                    }
                }
            });
        }

        if (btnReset) {
            btnReset.addEventListener('click', resetCards);
        }

        bindTarotYesNoBridgeLinks();

        window.addEventListener('mh_cookie_banner_visible', () => {
            const panel = document.getElementById('result-panel');
            if (panel?.classList.contains('show')) {
                scrollTarotResultIntoView(panel);
            }
        });
    }

    // Spolehlivě ukotví listenery i pro případy dynamického loadu
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTarotAnoNe);
    } else {
        initTarotAnoNe();
    }
})();
