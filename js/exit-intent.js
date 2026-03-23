/**
 * exit-intent.js — Zachytí odcházejícího návštěvníka a nabídne mu trial nebo newsletter
 * Spustí se 1× za session, pouze při pohybu myší k hornímu okraji
 */
(function () {
    'use strict';

    const STORAGE_KEY = 'mh_exit_shown';
    const MIN_TIME_ON_PAGE = 15000; // jen po 15s+ na stránce
    let startTime = Date.now();
    let triggered = false;

    // Nespouštět na přihlášení, onboarding, 404
    const skipPages = ['/prihlaseni', '/onboarding', '/404', '/profil'];
    if (skipPages.some(p => window.location.pathname.includes(p))) return;

    // Nespouštět pokud už bylo zobrazeno dnes
    if (sessionStorage.getItem(STORAGE_KEY)) return;

    function createModal() {
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
                <button id="exit-close" style="
                    position: absolute; top: 1rem; right: 1rem;
                    background: none; border: none; color: rgba(255,255,255,0.4);
                    font-size: 1.5rem; cursor: pointer; line-height: 1;
                    transition: color 0.2s;
                " aria-label="Zavřít" onmouseover="this.style.color='white'" onmouseout="this.style.color='rgba(255,255,255,0.4)'">×</button>

                <div style="font-size: 3rem; margin-bottom: 1rem;">🌟</div>
                <h2 style="font-family: 'Cinzel', serif; color: #d4af37; font-size: 1.4rem; margin-bottom: 0.75rem;">
                    Tvůj výklad jde mnohem dál
                </h2>
                <div style="color: rgba(255,255,255,0.7); line-height: 2; margin-bottom: 1.5rem; font-size: 0.92rem; text-align: left; display: inline-block;">
                    <div>🔮 Natální karta &amp; partnerská shoda</div>
                    <div>🌙 Horoskopy bez omezení</div>
                    <div>✨ Tarot, runy, výklady a mnohem více</div>
                </div>
                <p style="color: rgba(255,255,255,0.45); line-height: 1.6; margin-bottom: 1.5rem; font-size: 0.88rem;">
                    <strong style="color: #d4af37;">Přes 12 000 lidí</strong> už zná svůj vesmírný plán.
                </p>

                <a href="/cenik.html" id="exit-cta" style="
                    display: block; padding: 0.9rem 2rem;
                    background: linear-gradient(135deg, #9b59b6, #6c3483);
                    border-radius: 50px; color: white; text-decoration: none;
                    font-weight: 700; font-size: 1rem; margin-bottom: 1rem;
                    transition: transform 0.2s, box-shadow 0.2s;
                    box-shadow: 0 8px 30px rgba(155,89,182,0.4);
                " onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 12px 40px rgba(155,89,182,0.5)'"
                   onmouseout="this.style.transform='';this.style.boxShadow='0 8px 30px rgba(155,89,182,0.4)'">
                    ✨ Zobrazit co získám →
                </a>

                <button id="exit-dismiss" style="
                    background: none; border: none;
                    color: rgba(255,255,255,0.35); font-size: 0.85rem;
                    cursor: pointer; padding: 0.5rem;
                    text-decoration: underline;
                " onmouseover="this.style.color='rgba(255,255,255,0.6)'" onmouseout="this.style.color='rgba(255,255,255,0.35)'">
                    Zatím ne, zůstanu u základní verze
                </button>

                <p style="color: rgba(255,255,255,0.2); font-size: 0.75rem; margin-top: 0.75rem;">
                    GDPR chráněno
                </p>
            </div>
        `;

        document.body.appendChild(modal);

        // Close handlers
        function close() {
            modal.style.animation = 'fadeOut 0.2s ease forwards';
            setTimeout(() => modal.remove(), 200);
        }

        modal.addEventListener('click', e => { if (e.target === modal) close(); });
        document.getElementById('exit-close').addEventListener('click', close);
        document.getElementById('exit-dismiss').addEventListener('click', close);
        document.getElementById('exit-cta').addEventListener('click', () => {
            sessionStorage.setItem(STORAGE_KEY, '1');
        });
    }

    function trigger() {
        if (triggered) return;
        if (Date.now() - startTime < MIN_TIME_ON_PAGE) return;
        if (typeof window.Auth !== 'undefined' && window.Auth.isPremium?.()) return; // nespouštět pro premium členy
        triggered = true;
        sessionStorage.setItem(STORAGE_KEY, '1');
        createModal();
    }

    // Desktop: pohyb myší k hornímu okraji
    document.addEventListener('mouseleave', e => {
        if (e.clientY <= 0) trigger();
    });

    // Mobile: přechod na background tab po 30s
    let mobileTimer;
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            mobileTimer = setTimeout(trigger, 1000);
        } else {
            clearTimeout(mobileTimer);
        }
    });

    // CSS animace
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes fadeOut { to { opacity: 0; } }
    `;
    document.head.appendChild(style);
})();
