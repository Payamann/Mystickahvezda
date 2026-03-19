/**
 * Upgrade Modal - Trial-aware Soft Wall Upsell
 * Shows premium trial offer when user hits feature limits
 */

export function showUpgradeModal(data) {
    const {
        title = 'Odemkni neomezený přístup',
        message = 'Dosáhl jsi denního limitu. Vyzkoušej Premium 7 dní zdarma.',
        feature = 'Unknown Feature',
        plan = 'pruvodce',
        price = 199,
        priceLabel = 'Kč/měsíc',
        trialDays = 7,
        features = [
            '✓ Neomezený AI Průvodce',
            '✓ Neomezený Tarot, Runy & Andělské karty',
            '✓ Lunární rituály',
            '✓ Natální karta s interpretací'
        ]
    } = data;

    const existingModal = document.getElementById('upgrade-modal-overlay');
    if (existingModal) existingModal.remove();

    const trialBadge = trialDays > 0
        ? `<div class="upgrade-modal-trial-badge">✨ ${trialDays} DNÍ ZDARMA</div>`
        : '';

    const priceBlock = trialDays > 0
        ? `<div class="upgrade-modal-price">
               <div class="price-trial">Prvních ${trialDays} dní zdarma</div>
               <div class="price-then">pak ${price} ${priceLabel}</div>
           </div>`
        : `<div class="upgrade-modal-price">
               <div class="price-number">${price}</div>
               <div class="price-unit">${priceLabel}</div>
           </div>`;

    const ctaText = trialDays > 0 ? `Vyzkoušet ${trialDays} dní zdarma` : 'Upgradovat Teď';

    const modalHTML = `
        <div id="upgrade-modal-overlay" class="upgrade-modal-overlay">
            <div class="upgrade-modal-content">
                <button class="upgrade-modal-close" id="upgrade-close-btn" aria-label="Zavřít">×</button>
                ${trialBadge}
                <div class="upgrade-modal-badge">⭐ HVĚZDNÝ PRŮVODCE</div>
                <h2 class="upgrade-modal-title">${title}</h2>
                <p class="upgrade-modal-message">${message}</p>
                <div class="upgrade-modal-features">
                    ${features.map(f => `<div class="upgrade-feature-item">${f}</div>`).join('')}
                </div>
                ${priceBlock}
                <div class="upgrade-modal-buttons">
                    <button class="btn-upgrade-primary" id="upgrade-cta-btn">
                        ${ctaText}
                    </button>
                    <button class="btn-upgrade-secondary" id="upgrade-later-btn">
                        Teď ne
                    </button>
                </div>
                <div class="upgrade-modal-trust">
                    <span>💳 Karta požadována po trialu</span>
                    <span>↩️ Zrušíš kdykoliv</span>
                    <span>🔒 Zabezpečená platba</span>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modal = document.getElementById('upgrade-modal-overlay');
    const closeBtn = document.getElementById('upgrade-close-btn');
    const laterBtn = document.getElementById('upgrade-later-btn');
    const ctaBtn = document.getElementById('upgrade-cta-btn');

    const closeModal = () => {
        modal.classList.add('closing');
        setTimeout(() => modal.remove(), 300);
    };

    closeBtn.addEventListener('click', closeModal);
    laterBtn.addEventListener('click', closeModal);

    ctaBtn.addEventListener('click', async () => {
        ctaBtn.textContent = 'Přesměrovávám...';
        ctaBtn.disabled = true;

        if (typeof gtag !== 'undefined') {
            gtag('event', 'upgrade_cta_clicked', { feature, plan });
        }

        // If user is logged in, go directly to checkout
        if (window.Auth && window.Auth.isLoggedIn()) {
            try {
                const res = await fetch(`${window.API_CONFIG?.BASE_URL || '/api'}/payment/create-checkout-session`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ planId: plan })
                });
                const data = await res.json();
                if (data.url) {
                    window.location.href = data.url;
                    return;
                }
            } catch (e) {
                console.error('Checkout error:', e);
            }
        }

        // Not logged in: save plan, go to register
        sessionStorage.setItem('pending_plan', plan);
        window.location.href = '/registrace.html';
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal && document.body.contains(modal)) closeModal();
    });

    if (typeof gtag !== 'undefined') {
        gtag('event', 'upgrade_modal_shown', { feature, plan, price });
    }

    requestAnimationFrame(() => modal.classList.add('active'));

    return modal;
}

export function handleUpgradeResponse(response) {
    if (response && response.upsell) {
        showUpgradeModal(response.upsell);
        return true;
    }
    return false;
}
