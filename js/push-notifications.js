/**
 * Mystická Hvězda – Push Notifications Client
 * Asks permission after 2nd visit, manages subscription
 */
(function () {
    'use strict';

    const VISIT_KEY = 'mh_visit_count';
    const SUB_KEY = 'mh_push_subscribed';

    // Only proceed if Push API supported
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    function getVisitCount() {
        return parseInt(localStorage.getItem(VISIT_KEY) || '0', 10);
    }

    function incrementVisit() {
        const n = getVisitCount() + 1;
        localStorage.setItem(VISIT_KEY, n);
        return n;
    }

    async function subscribeToPush() {
        try {
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                localStorage.setItem(SUB_KEY, 'denied');
                return false;
            }

            const registration = await navigator.serviceWorker.ready;

            // VAPID public key (replace with real key from server on deploy)
            // For now we use a placeholder – subscription will still save endpoint
            let subscription;
            try {
                subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(
                        window.VAPID_PUBLIC_KEY ||
                        'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBrqLHy9-Ndgo292mkiw'
                    )
                });
            } catch {
                // VAPID not configured yet – just record intent
                localStorage.setItem(SUB_KEY, 'intent');
                return true;
            }

            // Send subscription to server
            const token = localStorage.getItem('auth_token');
            const BASE = window.API_CONFIG?.BASE_URL || '/api';
            await fetch(`${BASE}/push/subscribe`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({ subscription })
            });

            localStorage.setItem(SUB_KEY, 'active');
            return true;
        } catch (error) {
            console.warn('[Push] Subscription failed:', error);
            return false;
        }
    }

    function urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
        const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
        const rawData = atob(base64);
        return new Uint8Array([...rawData].map(c => c.charCodeAt(0)));
    }

    function showNotificationPrompt() {
        // Don't show if already subscribed/denied
        const status = localStorage.getItem(SUB_KEY);
        if (status === 'active' || status === 'denied') return;

        const banner = document.createElement('div');
        banner.id = 'mh-push-banner';
        banner.style.cssText = `
            position:fixed; bottom:1.5rem; left:50%; transform:translateX(-50%);
            z-index:8888; background:linear-gradient(135deg,#1a0a2e,#0f0a1f);
            border:1px solid rgba(235,192,102,0.3); border-radius:16px;
            padding:1rem 1.5rem; max-width:420px; width:90%;
            box-shadow:0 20px 60px rgba(0,0,0,0.7);
            display:flex; align-items:center; gap:1rem;
            animation:slideUp 0.4s ease;
            font-family:'Inter',sans-serif;
        `;

        const sign = window.MH_PERSONALIZATION?.getSign();
        const signText = sign && window.SIGNS_CZ?.[sign] ? `pro ${window.SIGNS_CZ[sign].label}` : '';

        banner.innerHTML = `
            <div style="font-size:2rem; flex-shrink:0;">🔔</div>
            <div style="flex:1; min-width:0;">
                <div style="color:#ebc066; font-weight:600; font-size:0.9rem; margin-bottom:0.2rem;">
                    Denní horoskop ${signText} do notifikací?
                </div>
                <div style="color:rgba(255,255,255,0.5); font-size:0.78rem;">
                    Každý den ráno v 8:00 – bez emailu
                </div>
            </div>
            <div style="display:flex; gap:0.5rem; flex-shrink:0;">
                <button id="mh-push-yes" style="
                    padding:0.5rem 1rem; background:linear-gradient(135deg,#d4af37,#b8860b);
                    border:none; border-radius:50px; color:#0f0a1f;
                    font-weight:700; font-size:0.83rem; cursor:pointer; white-space:nowrap;
                ">Zapnout</button>
                <button id="mh-push-no" style="
                    padding:0.5rem 0.7rem; background:none;
                    border:1px solid rgba(255,255,255,0.15); border-radius:50px;
                    color:rgba(255,255,255,0.4); font-size:0.78rem; cursor:pointer;
                ">Ne</button>
            </div>
        `;

        // CSS animation
        const style = document.createElement('style');
        style.textContent = `@keyframes slideUp{from{opacity:0;transform:translateX(-50%) translateY(20px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}`;
        document.head.appendChild(style);

        document.body.appendChild(banner);

        document.getElementById('mh-push-yes').addEventListener('click', async () => {
            banner.remove();
            const ok = await subscribeToPush();
            if (ok) {
                // Small success toast
                const toast = document.createElement('div');
                toast.style.cssText = `position:fixed;bottom:1.5rem;left:50%;transform:translateX(-50%);z-index:9999;background:#166534;color:#fff;padding:0.75rem 1.5rem;border-radius:50px;font-size:0.9rem;font-family:'Inter',sans-serif;`;
                toast.textContent = '🔔 Notifikace zapnuty! Uvidíme se zítra ráno.';
                document.body.appendChild(toast);
                setTimeout(() => toast.remove(), 3000);
            }
        });

        document.getElementById('mh-push-no').addEventListener('click', () => {
            localStorage.setItem(SUB_KEY, 'denied');
            banner.remove();
        });

        // Auto-dismiss after 12s
        setTimeout(() => banner?.remove(), 12000);
    }

    // Init: show prompt on 2nd+ visit after 5s
    window.addEventListener('DOMContentLoaded', () => {
        const count = incrementVisit();
        
        // Handle manual button if exists
        const subBtn = document.getElementById('subscribe-push-btn');
        if (subBtn) {
            // Check status for button text
            const status = localStorage.getItem(SUB_KEY);
            if (status === 'active') {
                subBtn.innerHTML = '🔕 Zrušit odběr horoskopu';
                subBtn.classList.add('btn--active');
            }
            
            subBtn.addEventListener('click', async () => {
                const currentStatus = localStorage.getItem(SUB_KEY);
                if (currentStatus === 'active') {
                    // Unsubscribe logic (simplified: clear local storage for this demo)
                    localStorage.removeItem(SUB_KEY);
                    subBtn.innerHTML = '🔔 Odebírat denní horoskop';
                    subBtn.classList.remove('btn--active');
                    if (window.Auth?.showToast) window.Auth.showToast('Info', 'Odběr horoskopu byl zrušen.', 'info');
                } else {
                    const ok = await subscribeToPush();
                    if (ok) {
                        subBtn.innerHTML = '🔕 Zrušit odběr horoskopu';
                        subBtn.classList.add('btn--active');
                        if (window.Auth?.showToast) window.Auth.showToast('Úspěch', 'Odběr horoskopu byl aktivován.', 'success');
                    }
                }
            });
        }

        if (count >= 2) {
            // Wait for cookie consent before showing push banner
            // so we never show two interruptive banners at the same time
            const cookieConsent = localStorage.getItem('cookieConsent');
            if (cookieConsent) {
                // Cookie already resolved → show after 5s
                setTimeout(showNotificationPrompt, 5000);
            } else {
                // Cookie banner is still up → poll until dismissed, then wait 3s more
                const waitForConsent = setInterval(() => {
                    if (localStorage.getItem('cookieConsent')) {
                        clearInterval(waitForConsent);
                        setTimeout(showNotificationPrompt, 3000);
                    }
                }, 500);
            }
        }
    });
})();
