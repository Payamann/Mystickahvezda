/**
 * exit-intent.js - zachytí odcházejícího návštěvníka a nabídne mu upgrade flow.
 * Spustí se jednou za session, na desktopu při odjezdu myši, na mobilu po odchodu z tabu.
 */
(function () {
    'use strict';

    const STORAGE_KEY = 'mh_exit_shown';
    const MIN_TIME_ON_PAGE = 15000;
    const FEATURE_MAP = {
        'tarot': 'tarot',
        'horoskopy': 'horoskopy',
        'partnerska-shoda': 'partnerska_detail',
        'numerologie': 'numerologie_vyklad',
        'runy': 'runy_hluboky_vyklad',
        'natalni-karta': 'natalni_interpretace',
        'mentor': 'mentor',
        'shamansko-kolo': 'shamanske_kolo_plne_cteni',
        'minuly-zivot': 'minuly_zivot',
        'kristalova-koule': 'kristalova_koule'
    };

    let startTime = Date.now();
    let triggered = false;

    const skipPages = ['/prihlaseni', '/onboarding', '/404', '/profil'];
    if (skipPages.some((page) => window.location.pathname.includes(page))) return;
    if (sessionStorage.getItem(STORAGE_KEY)) return;

    function resolvePageName() {
        return window.location.pathname.split('/').pop()?.replace('.html', '') || 'homepage';
    }

    function resolveCheckoutContext() {
        const pageName = resolvePageName();
        const source = `exit_intent_${pageName}`;
        const feature = FEATURE_MAP[pageName] || pageName;
        return {
            planId: 'pruvodce',
            source,
            feature,
            redirect: '/cenik.html',
            authMode: 'register',
            metadata: {
                entry_source: source,
                entry_feature: feature
            }
        };
    }

    function trackExitEvent(eventName, extra = {}) {
        window.MH_ANALYTICS?.trackEvent?.(eventName, {
            location: window.location.pathname,
            ...extra
        });
    }

    function createModal() {
        const checkoutContext = resolveCheckoutContext();
        const modal = document.createElement('div');
        modal.id = 'exit-intent-modal';
        modal.className = 'exit-intent-modal';

        modal.innerHTML = `
            <div class="exit-intent-modal__panel">
                <button id="exit-close" class="exit-intent-modal__close" type="button" aria-label="Zavřít">×</button>

                <div class="exit-intent-modal__icon">🌟</div>
                <h2 class="exit-intent-modal__title">
                    Tvůj výklad jde mnohem dál
                </h2>
                <div class="exit-intent-modal__features">
                    <div>🔮 Natální karta a partnerská shoda</div>
                    <div>🌙 Horoskopy bez omezení</div>
                    <div>✨ Tarot, runy, výklady a mnohem víc</div>
                </div>
                <p class="exit-intent-modal__text">
                    Pokud už cítíš, že chceš víc než jen náhled, Hvězdný Průvodce tě vezme do hloubky.
                </p>

                <button id="exit-cta" class="exit-intent-modal__cta" type="button">
                    ✨ Pokračovat k plnému přístupu →
                </button>

                <button id="exit-dismiss" class="exit-intent-modal__dismiss" type="button">
                    Zatím ne, zůstanu u základní verze
                </button>

                <p class="exit-intent-modal__privacy">
                    GDPR chráněno
                </p>
            </div>
        `;

        document.body.appendChild(modal);

        function close(action = 'overlay') {
            trackExitEvent('exit_intent_dismissed', {
                action,
                source: checkoutContext.source,
                feature: checkoutContext.feature
            });
            modal.classList.add('is-closing');
            setTimeout(() => modal.remove(), 200);
        }

        modal.addEventListener('click', (event) => {
            if (event.target === modal) close('overlay');
        });

        document.getElementById('exit-close')?.addEventListener('click', () => close('close_button'));
        document.getElementById('exit-dismiss')?.addEventListener('click', () => close('dismiss_button'));
        document.getElementById('exit-cta')?.addEventListener('click', () => {
            sessionStorage.setItem(STORAGE_KEY, '1');
            trackExitEvent('exit_intent_cta_clicked', {
                plan_id: checkoutContext.planId,
                source: checkoutContext.source,
                feature: checkoutContext.feature
            });

            if (window.Auth?.startPlanCheckout) {
                window.Auth.startPlanCheckout(checkoutContext.planId, checkoutContext);
                return;
            }

            window.location.href = checkoutContext.redirect;
        });
    }

    function trigger() {
        if (triggered) return;
        if (Date.now() - startTime < MIN_TIME_ON_PAGE) return;
        if (window.Auth?.isPremium?.()) return;

        const checkoutContext = resolveCheckoutContext();
        triggered = true;
        sessionStorage.setItem(STORAGE_KEY, '1');
        trackExitEvent('exit_intent_shown', {
            source: checkoutContext.source,
            feature: checkoutContext.feature,
            logged_in: !!window.Auth?.isLoggedIn?.()
        });
        createModal();
    }

    document.addEventListener('mouseleave', (event) => {
        if (event.clientY <= 0) trigger();
    });

    let mobileTimer;
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            mobileTimer = setTimeout(trigger, 1000);
        } else {
            clearTimeout(mobileTimer);
        }
    });

})();
