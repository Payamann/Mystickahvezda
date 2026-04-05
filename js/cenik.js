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

        const STRIPE_URLS = {
            pruvodce: 'https://buy.stripe.com/14A7sKfqRdNg2BJeTTc7u02',
            osviceni: 'https://buy.stripe.com/dRm6oG1A18sW9077rrc7u01',
            'vip-majestrat': 'https://buy.stripe.com/bJebJ0ceF4cG6RZ5jjc7u00'
        };

        function startCheckout(planId) {
            const url = STRIPE_URLS[planId];
            if (url) {
                window.location.href = url;
            }
        }

        // Plan checkout handler
        document.querySelectorAll('.plan-checkout-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const planId = btn.dataset.plan;
                if (!planId) return;

                const auth = window.Auth;
                if (!auth || !auth.isLoggedIn()) {
                    sessionStorage.setItem('pending_plan', planId);
                    window.location.href = '/prihlaseni.html?registrace=1&redirect=/cenik.html';
                    return;
                }

                startCheckout(planId);
            });
        });

        // After login redirect back: auto-trigger checkout if pending plan
        document.addEventListener('DOMContentLoaded', () => {
            const pending = sessionStorage.getItem('pending_plan');
            if (!pending) return;

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
