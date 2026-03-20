        const monthlyPrices = { pruvodce: '199 Kč', osviceni: '499 Kč', vip: '999 Kč' };
        const yearlyPrices = { pruvodce: '159 Kč', osviceni: '399 Kč', vip: '799 Kč' };

        function setPrices(yearly) {
            const prices = yearly ? yearlyPrices : monthlyPrices;
            const suffix = yearly ? '/měsíc (ročně)' : '/měsíc';

            document.getElementById('toggle-monthly').style.cssText = yearly
                ? 'cursor:pointer; padding:0.6rem 1.6rem; border-radius:30px; font-size:0.85rem; font-weight:500; color:rgba(255,255,255,0.5); background:transparent; border:none; transition:all 0.2s;'
                : 'cursor:pointer; padding:0.6rem 1.6rem; border-radius:30px; font-size:0.85rem; font-weight:700; background:var(--color-mystic-gold); color:#000; border:none; transition:all 0.2s;';

            document.getElementById('toggle-yearly').style.cssText = yearly
                ? 'cursor:pointer; padding:0.6rem 1.6rem; border-radius:30px; font-size:0.85rem; font-weight:700; background:var(--color-mystic-gold); color:#000; border:none; transition:all 0.2s;'
                : 'cursor:pointer; padding:0.6rem 1.6rem; border-radius:30px; font-size:0.85rem; font-weight:500; color:rgba(255,255,255,0.5); background:transparent; border:none; transition:all 0.2s;';

            document.querySelectorAll('[data-price-plan]').forEach(el => {
                const plan = el.dataset.pricePlan;
                if (prices[plan]) {
                    el.querySelector('.price-amount').textContent = prices[plan];
                    el.querySelector('.price-suffix').textContent = suffix;
                }
            });
        }

        document.getElementById('toggle-monthly').addEventListener('click', () => setPrices(false));
        document.getElementById('toggle-yearly').addEventListener('click', () => setPrices(true));

        const PLAN_LABELS = {
            pruvodce: 'Otevřít bránu',
            osviceni: 'Probudit se',
            'vip-majestrat': 'Vstoupit do VIP'
        };

        async function startCheckout(planId) {
            const btn = document.querySelector(`[data-plan="${planId}"]`);
            if (btn) { btn.textContent = 'Přesměrovávám...'; btn.disabled = true; }
            try {
                const baseUrl = (typeof API_CONFIG !== 'undefined' ? API_CONFIG.BASE_URL : null) || '/api';
                const res = await fetch(`${baseUrl}/payment/create-checkout-session`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ planId })
                });
                const data = await res.json();
                if (data.url) {
                    window.location.href = data.url;
                } else {
                    if (btn) { btn.disabled = false; btn.textContent = PLAN_LABELS[planId] || 'Pokračovat'; }
                    alert('Nepodařilo se spustit platbu. Zkuste to prosím znovu.');
                }
            } catch (err) {
                console.error('Checkout error:', err);
                if (btn) { btn.disabled = false; btn.textContent = PLAN_LABELS[planId] || 'Pokračovat'; }
            }
        }

        // Plan checkout handler
        document.querySelectorAll('.plan-checkout-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                const planId = btn.dataset.plan;
                if (!planId) return;

                // Wait for Auth to be available (defer scripts)
                const auth = window.Auth;
                if (!auth || !auth.isLoggedIn()) {
                    sessionStorage.setItem('pending_plan', planId);
                    window.location.href = '/registrace.html';
                    return;
                }

                await startCheckout(planId);
            });
        });

        // After login redirect back: auto-trigger checkout if pending plan
        document.addEventListener('DOMContentLoaded', () => {
            const pending = sessionStorage.getItem('pending_plan');
            if (!pending) return;

            // Poll for Auth (loaded via defer)
            const wait = setInterval(() => {
                if (!window.Auth) return;
                clearInterval(wait);
                if (window.Auth.isLoggedIn()) {
                    sessionStorage.removeItem('pending_plan');
                    startCheckout(pending);
                }
            }, 100);
            setTimeout(() => clearInterval(wait), 5000);
        });
