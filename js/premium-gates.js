// ============================================
// PAYWALL & PREMIUM UI COMPONENTS
// ============================================

window.Premium = {
    _escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    async checkStatus() {
        if (window.Auth?.isPremium?.()) {
            console.log('Premium Verified (Local)');
            return true;
        }

        if (window.Auth && !window.Auth.isLoggedIn()) return false;

        try {
            const response = await fetch(`${API_CONFIG.BASE_URL}/payment/subscription/status`, {
                credentials: 'include'
            });

            if (!response.ok) return false;

            const data = await response.json();
            const isPremium = ['premium_monthly', 'exclusive_monthly', 'vip_majestrat'].includes(data.planType);
            const isActive = data.status === 'active' || data.status === 'trialing' || data.status === 'cancel_pending';
            const notExpired = !data.currentPeriodEnd || new Date(data.currentPeriodEnd) > new Date();

            return isPremium && isActive && notExpired;
        } catch (error) {
            console.error('Premium check error:', error);
            return false;
        }
    },

    startUpgradeFlow(planId, featureName, source = 'paywall', authMode = null) {
        window.Auth?.startPlanCheckout?.(planId, {
            source,
            feature: featureName || null,
            redirect: '/cenik.html',
            authMode: authMode || (window.Auth?.isLoggedIn?.() ? 'login' : 'register')
        });
    },

    createOverlay({ icon, title, message, benefits, ctaLabel, footer }) {
        const overlay = document.createElement('div');
        overlay.className = 'paywall-overlay';
        overlay.innerHTML = `
            <div class="paywall-content">
                <div class="paywall-icon">${icon}</div>
                <h3 class="paywall-title">${title}</h3>
                <p class="paywall-message">${message}</p>
                <div class="paywall-benefits">
                    ${benefits.map((item) => `<div class="benefit-item">${item}</div>`).join('')}
                </div>
                <div class="paywall-actions">
                    <button class="btn btn--primary paywall-upgrade">${ctaLabel}</button>
                    <button class="btn btn--ghost paywall-close">Teď ne</button>
                </div>
                <p class="paywall-footer">${footer}</p>
            </div>
        `;

        document.body.appendChild(overlay);
        return overlay;
    },

    bindOverlayActions(overlay, onUpgrade) {
        overlay.querySelector('.paywall-upgrade').addEventListener('click', () => {
            const btn = overlay.querySelector('.paywall-upgrade');
            btn.textContent = 'Přesměrovávám...';
            btn.disabled = true;
            onUpgrade();
        });

        overlay.querySelector('.paywall-close').addEventListener('click', () => overlay.remove());
        overlay.addEventListener('click', (event) => {
            if (event.target === overlay) overlay.remove();
        });
    },

    showPaywall(featureName, message = null) {
        const defaultMessages = {
            numerology: 'Vaše čísla skrývají víc, než čekáte. Hluboký výklad odemknete v plánu Hvězdný Průvodce.',
            weekly_horoscope: 'Detailní týdenní průvodce planetami čeká na vás. Odemkněte ho s Hvězdným Průvodcem.',
            monthly_horoscope: 'Celý měsíc pod hvězdami. Kompletní měsíční předpověď patří Hvězdným Průvodcům.',
            natal_chart: 'Váš vesmírný plán čeká. Plná interpretace natální karty je součástí Hvězdného Průvodce.',
            synastry: 'Hloubková synastrie prozradí, zda jste pro sebe stvořeni. Dostupná je v Hvězdném Průvodci.',
            astrocartography: 'Kde na světě vás hvězdy volají? Astrokartografie je dostupná od vyššího plánu.',
            journal_insights: 'Hluboká analýza vzorců ve vašem deníku je funkce Hvězdného Průvodce.',
            mentor: 'Váš duchovní průvodce bez omezení zpráv čeká v Hvězdném Průvodci.',
            rituals: 'Lunární rituály vás vedou hluboko do noci. Plný přístup patří Hvězdným Průvodcům.'
        };

        const displayMessage = this._escapeHTML(message || defaultMessages[featureName] || 'Tato funkce vyžaduje Premium předplatné.');
        this.trackPaywallHit(featureName);

        const overlay = this.createOverlay({
            icon: '✨',
            title: 'Hvězdný Průvodce',
            message: displayMessage,
            benefits: [
                '✓ Neomezený tarot kdykoliv a na cokoliv',
                '✓ Týdenní i měsíční horoskopy přesně pro vás',
                '✓ Duchovní průvodce bez limitu zpráv',
                '✓ Plná natální karta s interpretací'
            ],
            ctaLabel: '🌟 Stát se Průvodcem – 199 Kč/měsíc',
            footer: 'Bez závazků • Zrušení jedním kliknutím • 7 dní zdarma'
        });

        this.bindOverlayActions(overlay, () => this.startUpgradeFlow('pruvodce', featureName, 'inline_paywall'));
    },

    showExclusivePaywall(featureName) {
        this.trackPaywallHit(featureName);

        const overlay = this.createOverlay({
            icon: '🔭',
            title: 'Osvícení',
            message: 'Tato funkce je dostupná od plánu Osvícení.',
            benefits: [
                '✓ Astrokartografie a vaše hvězdná mapa světa',
                '✓ Pokročilá natální karta s hlubším výkladem',
                '✓ Exkluzivní lunární rituály',
                '✓ Prioritní odpovědi duchovního průvodce'
            ],
            ctaLabel: '🔭 Probudit se — 499 Kč/měsíc',
            footer: 'Bez závazků • Zrušení jedním kliknutím'
        });

        this.bindOverlayActions(overlay, () => this.startUpgradeFlow('osviceni', featureName, 'exclusive_paywall'));
    },

    showLoginGate(container, message = null, featureName = null, source = 'inline_login_gate') {
        const defaultMsg = '⭐ Přihlaste se zdarma a získejte plný osobní výklad';
        const safeMsg = this._escapeHTML(message || defaultMsg);

        const gate = document.createElement('div');
        gate.className = 'login-gate';
        gate.style.cssText = 'text-align:center;padding:2rem;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:16px;margin-top:1.5rem;';
        gate.innerHTML = `
            <p style="color:var(--color-mystic-gold);font-size:1.05rem;margin-bottom:0.75rem;">${safeMsg}</p>
            <p style="color:rgba(255,255,255,0.55);font-size:0.9rem;margin-bottom:1.5rem;">Registrace je zdarma, trvá 30 sekund</p>
            <button class="btn btn--primary login-gate-btn" style="min-width:200px;">Přihlásit se zdarma →</button>
        `;

        container.appendChild(gate);
        gate.querySelector('.login-gate-btn').addEventListener('click', () => {
            this.startUpgradeFlow('pruvodce', featureName, source, 'register');
        });
    },

    markAsPremium(element) {
        const badge = document.createElement('span');
        badge.className = 'premium-badge';
        badge.innerHTML = '💎 Premium';
        badge.title = 'Tato funkce vyžaduje Premium předplatné';

        element.style.position = 'relative';
        element.appendChild(badge);
    },

    lockContent(container, featureName) {
        container.classList.add('premium-locked');

        const lockOverlay = document.createElement('div');
        lockOverlay.className = 'premium-lock-overlay';
        lockOverlay.innerHTML = `
            <div class="lock-icon">🔒</div>
            <p class="lock-text">Premium obsah</p>
            <button class="btn btn--sm btn--gold unlock-btn">Odemknout</button>
        `;

        container.style.position = 'relative';
        container.appendChild(lockOverlay);

        lockOverlay.querySelector('.unlock-btn').addEventListener('click', (event) => {
            event.stopPropagation();
            this.showPaywall(featureName);
        });
    },

    trackPaywallHit(featureName) {
        try {
            if (window.analytics) {
                window.analytics.track('Paywall Hit', {
                    feature: featureName,
                    timestamp: new Date().toISOString()
                });
            }
            console.log(`[ANALYTICS] Paywall hit: ${featureName}`);
        } catch (error) {
            console.error('Analytics tracking error:', error);
        }
    },

    showTrialPaywall(featureName) {
        this.trackPaywallHit(featureName);

        const featureMessages = {
            rituals: 'Lunární rituály tě provedou každou fází měsíce.',
            partnerska_detail: 'Detailní analýza odhalí hlubší dynamiku vašeho vztahu.',
            numerologie_vyklad: 'AI výklad odhalí, co tvá čísla skutečně znamenají.',
            natalni_interpretace: 'Plná AI interpretace tvé natální karty.'
        };

        const overlay = document.createElement('div');
        overlay.className = 'paywall-overlay';
        overlay.innerHTML = `
            <div class="paywall-content">
                <div class="paywall-icon">✨</div>
                <div style="background:linear-gradient(135deg,#f9d423,#ff4e50);color:#000;padding:6px 16px;border-radius:20px;font-size:0.75rem;font-weight:800;letter-spacing:1px;display:inline-block;margin-bottom:1rem;">7 DNÍ ZDARMA</div>
                <h3 class="paywall-title">Hvězdný Průvodce</h3>
                <p class="paywall-message">${this._escapeHTML(featureMessages[featureName] || 'Tato funkce je součástí Hvězdného Průvodce.')}</p>
                <div class="paywall-benefits">
                    <div class="benefit-item">✓ Neomezený chat bez limitu</div>
                    <div class="benefit-item">✓ Lunární rituály a výklady</div>
                    <div class="benefit-item">✓ Natální karta s interpretací</div>
                    <div class="benefit-item">✓ Numerologický výklad bez omezení</div>
                </div>
                <div class="paywall-actions">
                    <button class="btn btn--primary paywall-upgrade">🌟 Vyzkoušet 7 dní zdarma</button>
                    <button class="btn btn--ghost paywall-close">Teď ne</button>
                </div>
                <p class="paywall-footer">Zrušíš kdykoliv • Karta požadována po trialu • 199 Kč/měsíc</p>
            </div>
        `;

        document.body.appendChild(overlay);
        this.bindOverlayActions(overlay, () => this.startUpgradeFlow('pruvodce', featureName, 'trial_paywall'));
    },

    async init() {
        const isPremium = await this.checkStatus();
        document.body.classList.toggle('is-premium', isPremium);

        if (!isPremium) {
            document.querySelectorAll('[data-premium="true"]').forEach((element) => {
                const badge = document.createElement('span');
                badge.className = 'nav-premium-badge';
                badge.textContent = '💎';
                element.appendChild(badge);
            });
        }

        if (!isPremium && document.getElementById('header-placeholder')) {
            const addUpgradeCTA = () => {
                const header = document.querySelector('header nav');
                if (header && !document.getElementById('upgrade-cta')) {
                    const upgradeCTA = document.createElement('a');
                    upgradeCTA.id = 'upgrade-cta';
                    upgradeCTA.href = '/cenik.html';
                    upgradeCTA.className = 'btn btn--sm btn--gold upgrade-cta-btn';
                    upgradeCTA.addEventListener('click', (event) => {
                        event.preventDefault();
                        this.startUpgradeFlow('pruvodce', 'premium_membership', 'header_upgrade_cta');
                    });
                    upgradeCTA.innerHTML = '\u2728 Vyzkou\u0161et Premium';
                    header.appendChild(upgradeCTA);
                }
            };

            if (document.querySelector('header nav')) {
                addUpgradeCTA();
            } else {
                document.addEventListener('components:loaded', addUpgradeCTA);
            }
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    window.Premium.init();
});
