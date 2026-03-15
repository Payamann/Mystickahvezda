/**
 * Mystická Hvězda – Newsletter Exit-Intent Popup
 * Triggers: cursor exit OR 45 seconds on page
 * Respects: localStorage dismissal for 7 days
 */
(function () {
    'use strict';

    const STORAGE_KEY = 'mh_newsletter_dismissed';
    const DISMISS_DAYS = 7;
    let triggered = false;

    function shouldShow() {
        const val = localStorage.getItem(STORAGE_KEY);
        if (!val) return true;
        const dismissedAt = parseInt(val, 10);
        const daysPassed = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24);
        return daysPassed >= DISMISS_DAYS;
    }

    function dismiss() {
        localStorage.setItem(STORAGE_KEY, Date.now().toString());
        const popup = document.getElementById('mh-newsletter-popup');
        if (popup) {
            popup.style.opacity = '0';
            popup.style.transform = 'translate(-50%, -50%) scale(0.95)';
            setTimeout(() => popup.remove(), 400);
        }
        const overlay = document.getElementById('mh-popup-overlay');
        if (overlay) {
            overlay.style.opacity = '0';
            setTimeout(() => overlay.remove(), 400);
        }
    }

    async function subscribe(email) {
        const btn = document.getElementById('mh-popup-submit');
        const msg = document.getElementById('mh-popup-msg');
        btn.disabled = true;
        btn.textContent = 'Přihlašuji...';

        try {
            const BASE = window.API_CONFIG?.BASE_URL || '/api';
            const res = await fetch(`${BASE}/newsletter/subscribe`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, source: 'web_popup' })
            });
            const data = await res.json();
            if (data.success) {
                msg.textContent = '🌟 Skvělé! Brzy vám přijde první hvězdná zpráva.';
                msg.style.color = '#4ade80';
                setTimeout(dismiss, 2500);
            } else {
                msg.textContent = data.error || 'Chyba. Zkuste to znovu.';
                msg.style.color = '#f87171';
                btn.disabled = false;
                btn.textContent = 'Odebírat zdarma';
            }
        } catch {
            msg.textContent = 'Chyba připojení. Zkuste to znovu.';
            msg.style.color = '#f87171';
            btn.disabled = false;
            btn.textContent = 'Odebírat zdarma';
        }
    }

    function createPopup() {
        if (triggered || !shouldShow()) return;
        triggered = true;

        // Overlay
        const overlay = document.createElement('div');
        overlay.id = 'mh-popup-overlay';
        overlay.style.cssText = `
            position:fixed; inset:0; background:rgba(0,0,0,0.65);
            z-index:9998; opacity:0; transition:opacity 0.4s ease;
            backdrop-filter:blur(4px);
        `;
        overlay.addEventListener('click', dismiss);

        // Popup
        const popup = document.createElement('div');
        popup.id = 'mh-newsletter-popup';
        popup.setAttribute('role', 'dialog');
        popup.setAttribute('aria-label', 'Přihlásit se k odběru');
        popup.style.cssText = `
            position:fixed; top:50%; left:50%; z-index:9999;
            transform:translate(-50%, -50%) scale(0.92);
            background:linear-gradient(135deg,#0f0a1f,#1a0a2e);
            border:1px solid rgba(235,192,102,0.35);
            border-radius:24px; padding:2.5rem;
            max-width:440px; width:90%;
            box-shadow:0 30px 80px rgba(0,0,0,0.8), 0 0 60px rgba(235,192,102,0.08);
            opacity:0; transition:opacity 0.4s ease, transform 0.4s ease;
            text-align:center; font-family:'Inter',sans-serif;
        `;

        const signEmoji = (() => {
            const emojis = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];
            const m = new Date().getMonth();
            return emojis[m] || '⭐';
        })();

        popup.innerHTML = `
            <button id="mh-popup-close" aria-label="Zavřít" style="
                position:absolute;top:1rem;right:1rem;background:none;border:none;
                color:rgba(255,255,255,0.5);font-size:1.5rem;cursor:pointer;line-height:1;
                transition:color 0.2s;
            " onmouseover="this.style.color='#fff'" onmouseout="this.style.color='rgba(255,255,255,0.5)'">×</button>

            <div style="font-size:3rem;margin-bottom:0.5rem;">${signEmoji} 🌙</div>
            <h2 style="font-family:'Cinzel',serif;color:#ebc066;font-size:1.5rem;margin:0 0 0.75rem;font-weight:600;">
                Hvězdy vám píší každý den
            </h2>
            <p style="color:rgba(255,255,255,0.7);line-height:1.6;margin:0 0 1.5rem;font-size:0.95rem;">
                Dostávejte denní horoskop, výklad Měsíce a esoterické tipy přímo do vašeho emailu. Zcela zdarma.
            </p>

            <div style="display:flex;gap:0.5rem;margin-bottom:0.75rem;flex-wrap:wrap;">
                <input id="mh-popup-email" type="email" placeholder="váš@email.cz"
                    style="
                        flex:1;min-width:0;padding:0.85rem 1.2rem;
                        background:rgba(255,255,255,0.07);
                        border:1px solid rgba(235,192,102,0.3);
                        border-radius:50px;color:#fff;font-size:0.95rem;
                        outline:none;transition:border-color 0.2s;
                    "
                    onfocus="this.style.borderColor='rgba(235,192,102,0.7)'"
                    onblur="this.style.borderColor='rgba(235,192,102,0.3)'"
                />
                <button id="mh-popup-submit" style="
                    padding:0.85rem 1.5rem; white-space:nowrap;
                    background:linear-gradient(135deg,#d4af37,#b8860b);
                    border:none;border-radius:50px;color:#0f0a1f;
                    font-weight:700;font-size:0.95rem;cursor:pointer;
                    transition:transform 0.2s,box-shadow 0.2s;
                "
                onmouseover="this.style.transform='scale(1.04)';this.style.boxShadow='0 0 20px rgba(212,175,55,0.4)'"
                onmouseout="this.style.transform='';this.style.boxShadow=''">
                    Odebírat zdarma ✨
                </button>
            </div>
            <div id="mh-popup-msg" style="font-size:0.85rem;min-height:1.2em;color:rgba(255,255,255,0.5);"></div>
            <p style="font-size:0.75rem;color:rgba(255,255,255,0.3);margin:1rem 0 0;">
                Žádný spam. Odhlásit se můžete kdykoli jedním kliknutím.
            </p>
        `;

        document.body.appendChild(overlay);
        document.body.appendChild(popup);

        // Animate in
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                overlay.style.opacity = '1';
                popup.style.opacity = '1';
                popup.style.transform = 'translate(-50%, -50%) scale(1)';
            });
        });

        // Events
        document.getElementById('mh-popup-close').addEventListener('click', dismiss);
        document.getElementById('mh-popup-submit').addEventListener('click', () => {
            const email = document.getElementById('mh-popup-email').value.trim();
            if (!email) {
                document.getElementById('mh-popup-msg').textContent = 'Zadejte prosím emailovou adresu.';
                document.getElementById('mh-popup-msg').style.color = '#f87171';
                return;
            }
            subscribe(email);
        });
        document.getElementById('mh-popup-email').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') document.getElementById('mh-popup-submit').click();
        });

        // Trap focus in popup
        popup.querySelector('#mh-popup-email').focus();
    }

    function init() {
        if (!shouldShow()) return;

        // Exit intent – mouse leaves top of viewport
        document.addEventListener('mouseleave', (e) => {
            if (e.clientY <= 0) createPopup();
        }, { passive: true });

        // Timed trigger – 45 seconds
        setTimeout(createPopup, 45000);

        // Scroll trigger – 70% of page scrolled
        let scrollTriggered = false;
        window.addEventListener('scroll', () => {
            if (scrollTriggered) return;
            const scrolled = window.scrollY / (document.body.scrollHeight - window.innerHeight);
            if (scrolled > 0.70) {
                scrollTriggered = true;
                setTimeout(createPopup, 2000);
            }
        }, { passive: true });
    }

    // Init after DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
