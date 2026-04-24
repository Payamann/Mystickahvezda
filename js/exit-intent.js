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
        'mentor': 'hvezdny_mentor',
        'shamanske-kolo': 'shamanske_kolo_plne_cteni',
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
        return {
            planId: 'pruvodce',
            source: `exit_intent_${pageName}`,
            feature: FEATURE_MAP[pageName] || pageName,
            redirect: '/cenik.html',
            authMode: 'register'
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
        modal.style.cssText = `
            position: fixed; inset: 0; z-index: 99999;
            display: flex; align-items: center; justify-content: center;
            background: rgba(0,0,0,0.7); backdrop-filter: blur(8px);
            animation: fadeIn 0.3s ease;
        `;

        modal.innerHTML = `
            <div style="
                max-width: 480px; width: 90%;
                background: linear-gradient(135deg, #0f0a22, #1a0a35);
                border: 1px solid rgba(212,175,55,0.4);
                border-radius: 24px;
                padding: 2.5rem 2rem;
                text-align: center;
                position: relative;
                box-shadow: 0 40px 80px rgba(0,0,0,0.5);
                animation: slideUp 0.4s cubic-bezier(0.4,0,0.2,1);
            ">
                <button id="exit-close" type="button" style="
                    position: absolute; top: 1rem; right: 1rem;
                    background: none; border: none; color: rgba(255,255,255,0.4);
                    font-size: 1.5rem; cursor: pointer; line-height: 1;
                    transition: color 0.2s;
                " aria-label="Zavřít"
                    onmouseover="this.style.color='white'"
                    onmouseout="this.style.color='rgba(255,255,255,0.4)'">×</button>

                <div style="font-size: 3rem; margin-bottom: 1rem;">🌟</div>
                <h2 style="font-family: 'Cinzel', serif; color: #d4af37; font-size: 1.4rem; margin-bottom: 0.75rem;">
                    Tvůj výklad jde mnohem dál
                </h2>
                <div style="color: rgba(255,255,255,0.7); line-height: 2; margin-bottom: 1.5rem; font-size: 0.92rem; text-align: left; display: inline-block;">
                    <div>🔮 Natální karta a partnerská shoda</div>
                    <div>🌙 Horoskopy bez omezení</div>
                    <div>✨ Tarot, runy, výklady a mnohem víc</div>
                </div>
                <p style="color: rgba(255,255,255,0.45); line-height: 1.6; margin-bottom: 1.5rem; font-size: 0.88rem;">
                    Pokud už cítíš, že chceš víc než jen náhled, Hvězdný Průvodce tě vezme do hloubky.
                </p>

                <button id="exit-cta" type="button" style="
                    display: block; width: 100%;
                    padding: 0.9rem 2rem;
                    background: linear-gradient(135deg, #9b59b6, #6c3483);
                    border-radius: 50px; color: white; text-decoration: none;
                    font-weight: 700; font-size: 1rem; margin-bottom: 1rem;
                    border: none; cursor: pointer;
                    transition: transform 0.2s, box-shadow 0.2s;
                    box-shadow: 0 8px 30px rgba(155,89,182,0.4);
                " onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 12px 40px rgba(155,89,182,0.5)'"
                   onmouseout="this.style.transform='';this.style.boxShadow='0 8px 30px rgba(155,89,182,0.4)'">
                    ✨ Pokračovat k plnému přístupu →
                </button>

                <button id="exit-dismiss" type="button" style="
                    background: none; border: none;
                    color: rgba(255,255,255,0.35); font-size: 0.85rem;
                    cursor: pointer; padding: 0.5rem;
                    text-decoration: underline;
                " onmouseover="this.style.color='rgba(255,255,255,0.6)'"
                   onmouseout="this.style.color='rgba(255,255,255,0.35)'">
                    Zatím ne, zůstanu u základní verze
                </button>

                <p style="color: rgba(255,255,255,0.2); font-size: 0.75rem; margin-top: 0.75rem;">
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
            modal.style.animation = 'fadeOut 0.2s ease forwards';
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

    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes fadeOut { to { opacity: 0; } }
    `;
    document.head.appendChild(style);
})();
