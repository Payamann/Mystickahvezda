// ============================================
// PAYWALL & PREMIUM UI COMPONENTS
// ============================================

/**
 * Check if user has premium access
 * @returns {boolean}
 */
window.Premium = {
    _escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    async checkStatus() {
        // 1. Check local state first (Optimistic & Offline-friendly)
        if (window.Auth && typeof window.Auth.isPremium === 'function') {
            if (window.Auth.isPremium()) {
                console.log('Premium Verified (Local)');
                return true;
            }
        }

        const token = localStorage.getItem('auth_token');
        if (!token) return false;

        try {
            const response = await fetch(`${API_CONFIG.BASE_URL}/payment/subscription/status`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) return false;

            const data = await response.json();
            const isPremium = ['premium_monthly', 'exclusive_monthly', 'vip', 'premium_yearly', 'premium_pro'].includes(data.planType);
            const isActive = data.status === 'active' || data.status === 'trialing' || data.status === 'cancel_pending';
            const notExpired = !data.currentPeriodEnd || new Date(data.currentPeriodEnd) > new Date();

            return isPremium && isActive && notExpired;
        } catch (error) {
            console.error('Premium check error:', error);
            // Fallback: If network error but localStorage says premium (handled above), we are good.
            // If we are here, it means local wasn't premium usually.
            return false;
        }
    },

    /**
     * Show paywall overlay for a feature
     * @param {string} featureName - Name of the locked feature
     * @param {string} message - Custom message
     */
    showPaywall(featureName, message = null) {
        const defaultMessages = {
            'numerology': '🔢 Vaše čísla skrývají víc, než čekáte – hluboký výklad čísel odemknete v plánu Hvězdný Průvodce',
            'weekly_horoscope': '🌟 Detailní týdenní průvodce planetami čeká na vás – odemkněte ho s Hvězdným Průvodcem',
            'monthly_horoscope': '📅 Celý měsíc pod hvězdami – kompletní měsíční předpověď patří Hvězdným Průvodcům',
            'natal_chart': '⭐ Váš vesmírný plán čeká – plná interpretace natální karty je součástí Hvězdného Průvodce',
            'synastry': '💫 Hloubková synastrie prozradí, zda jste pro sebe stvořeni – dostupná v Hvězdném Průvodci',
            'astrocartography': '🌍 Kde na světě vás hvězdy volají? Astrokartografie je jen pro Hvězdné Průvodce',
            'journal_insights': '📖 Hluboká analýza vzorců ve vašem deníku – funkce Hvězdného Průvodce',
            'mentor': '🌙 Váš duchovní průvodce bez omezení zpráv – staňte se Hvězdným Průvodcem'
        };

        const displayMessage = message || defaultMessages[featureName] || 'Tato funkce vyžaduje Premium předplatné';

        // Track analytics
        this.trackPaywallHit(featureName);

        // Escape user-influenced content to prevent XSS
        const safeMessage = this._escapeHTML(displayMessage);

        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'paywall-overlay';
        overlay.innerHTML = `
            <div class="paywall-content">
                <div class="paywall-icon">✨</div>
                <h3 class="paywall-title">Hvězdný Průvodce</h3>
                <p class="paywall-message">${safeMessage}</p>
                <div class="paywall-benefits">
                    <div class="benefit-item">✓ Neomezený tarot – kdykoliv, na cokoliv</div>
                    <div class="benefit-item">✓ Týdenní + měsíční horoskopy přesně pro vás</div>
                    <div class="benefit-item">✓ AI průvodce bez limitu zpráv</div>
                    <div class="benefit-item">✓ Plná natální karta s interpretací</div>
                </div>
                <div class="paywall-actions">
                    <button class="btn btn--primary paywall-upgrade">
                        🌟 Stát se Průvodcem – 199 Kč/měsíc
                    </button>
                    <button class="btn btn--ghost paywall-close">Teď ne</button>
                </div>
                <p class="paywall-footer">Bez závazků • Zrušení jedním kliknutím • 7 dní zdarma</p>
            </div>
        `;

        document.body.appendChild(overlay);

        // Event listeners
        overlay.querySelector('.paywall-upgrade').addEventListener('click', () => {
            window.location.href = '/cenik.html';
        });

        overlay.querySelector('.paywall-close').addEventListener('click', () => {
            overlay.remove();
        });

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
            }
        });
    },

    /**
     * Show inline premium badge/lock
     * @param {HTMLElement} element - Element to mark as premium
     */
    markAsPremium(element) {
        const badge = document.createElement('span');
        badge.className = 'premium-badge';
        badge.innerHTML = '💎 Premium';
        badge.title = 'Tato funkce vyžaduje Premium předplatné';

        element.style.position = 'relative';
        element.appendChild(badge);
    },

    /**
     * Blur/lock content for free users
     * @param {HTMLElement} container - Container to blur
     * @param {string} featureName - Feature identifier
     */
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

        lockOverlay.querySelector('.unlock-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.showPaywall(featureName);
        });
    },

    /**
     * Track paywall hit event (analytics)
     */
    trackPaywallHit(featureName) {
        try {
            // Track with analytics service
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

    /**
     * Initialize premium gates on page load
     */
    async init() {
        const isPremium = await this.checkStatus();
        document.body.classList.toggle('is-premium', isPremium);

        // Add premium badges to navigation
        if (!isPremium) {
            document.querySelectorAll('[data-premium="true"]').forEach(el => {
                const badge = document.createElement('span');
                badge.className = 'nav-premium-badge';
                badge.textContent = '💎';
                el.appendChild(badge);
            });
        }

        // Add upgrade CTA to header (for free users)
        if (!isPremium && document.getElementById('header-placeholder')) {
            setTimeout(() => {
                const header = document.querySelector('header nav');
                if (header && !document.getElementById('upgrade-cta')) {
                    const upgradeCTA = document.createElement('a');
                    upgradeCTA.id = 'upgrade-cta';
                    upgradeCTA.href = '/cenik.html';
                    upgradeCTA.className = 'btn btn--sm btn--gold upgrade-cta-btn';
                    upgradeCTA.innerHTML = '✨ Vyzkoušet Premium';
                    header.appendChild(upgradeCTA);
                }
            }, 500);
        }
    }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    window.Premium.init();
});
