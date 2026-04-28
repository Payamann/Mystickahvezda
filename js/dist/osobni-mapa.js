(() => {
    const PRODUCT = {
        id: 'osobni_mapa_2026',
        type: 'personal_map',
        name: 'Osobní mapa zbytku roku 2026',
        price: 299,
        currency: 'CZK'
    };

    function getAttribution() {
        const params = new URLSearchParams(window.location.search);
        return {
            source: params.get('source') || 'personal_map_page',
            feature: params.get('feature') || PRODUCT.id
        };
    }

    function trackView() {
        window.MH_ANALYTICS?.trackEvent?.('one_time_product_viewed', {
            product_id: PRODUCT.id,
            product_type: PRODUCT.type,
            price: PRODUCT.price,
            currency: PRODUCT.currency,
            source: getAttribution().source,
            feature: getAttribution().feature
        });
    }

    function initIcons() {
        if (window.lucide?.createIcons) {
            window.lucide.createIcons();
        }
    }

    function initStatusBanners() {
        const params = new URLSearchParams(window.location.search);
        const status = params.get('status');
        const sessionId = params.get('session_id') || null;
        const attribution = getAttribution();

        if (status === 'success') {
            document.getElementById('bannerSuccess')?.classList.add('visible');
            document.getElementById('order')?.setAttribute('hidden', 'true');
            window.MH_ANALYTICS?.trackPaymentResult?.('success', {
                product_id: PRODUCT.id,
                product_type: PRODUCT.type,
                session_id: sessionId,
                source: attribution.source,
                feature: attribution.feature
            });
            window.MH_ANALYTICS?.trackPurchaseCompleted?.(PRODUCT.id, PRODUCT.price, PRODUCT.currency, {
                product_type: PRODUCT.type,
                product_name: PRODUCT.name,
                transaction_id: sessionId || undefined,
                source: attribution.source,
                feature: attribution.feature
            });
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        if (status === 'cancel') {
            document.getElementById('bannerCancel')?.classList.add('visible');
            window.MH_ANALYTICS?.trackPaymentResult?.('cancel', {
                product_id: PRODUCT.id,
                product_type: PRODUCT.type,
                source: attribution.source,
                feature: attribution.feature
            });
        }
    }

    function initScrollButtons() {
        document.querySelectorAll('[data-scroll-target]').forEach((button) => {
            button.addEventListener('click', () => {
                const target = document.getElementById(button.dataset.scrollTarget);
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        });
    }

    async function getCsrfToken() {
        const response = await fetch('/api/csrf-token', { credentials: 'include' });
        if (!response.ok) {
            throw new Error('Nepodařilo se připravit bezpečnou platbu. Zkus to prosím znovu.');
        }
        const data = await response.json();
        return data.csrfToken;
    }

    function collectPayload(form) {
        const formData = new FormData(form);
        const attribution = getAttribution();
        return {
            name: String(formData.get('name') || '').trim(),
            email: String(formData.get('email') || '').trim(),
            birthDate: String(formData.get('birthDate') || ''),
            birthTime: String(formData.get('birthTime') || ''),
            birthPlace: String(formData.get('birthPlace') || '').trim(),
            sign: String(formData.get('sign') || ''),
            grammaticalGender: String(formData.get('grammaticalGender') || 'neutral'),
            focus: String(formData.get('focus') || '').trim(),
            source: attribution.source
        };
    }

    function setButtonLoading(button, isLoading) {
        button.disabled = isLoading;
        button.innerHTML = isLoading
            ? '<span>Otevírám bezpečnou platbu...</span>'
            : '<i data-lucide="lock-keyhole" aria-hidden="true"></i><span>Pokračovat k platbě 299 Kč</span>';
        initIcons();
    }

    function showError(errorBox, message) {
        errorBox.textContent = message;
        errorBox.hidden = false;
    }

    function hideError(errorBox) {
        errorBox.textContent = '';
        errorBox.hidden = true;
    }

    function initOrderForm() {
        const form = document.getElementById('personalMapForm');
        const submitButton = document.getElementById('submitBtn');
        const errorBox = document.getElementById('formError');
        const birthDate = document.getElementById('birthDate');

        if (!form || !submitButton || !errorBox) return;

        if (birthDate) {
            birthDate.max = new Date().toISOString().slice(0, 10);
        }

        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            hideError(errorBox);

            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }

            setButtonLoading(submitButton, true);

            try {
                const payload = collectPayload(form);
                window.localStorage?.setItem?.('mh_personal_map_last_order', JSON.stringify({
                    ...payload,
                    email: payload.email,
                    createdAt: new Date().toISOString()
                }));

                window.MH_ANALYTICS?.trackCheckoutStarted?.(PRODUCT.id, {
                    product_type: PRODUCT.type,
                    value: PRODUCT.price,
                    currency: PRODUCT.currency,
                    source: payload.source,
                    feature: PRODUCT.id
                });

                const csrfToken = await getCsrfToken();
                const response = await fetch('/api/osobni-mapa/checkout', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-Token': csrfToken
                    },
                    credentials: 'include',
                    body: JSON.stringify(payload)
                });
                const data = await response.json().catch(() => ({}));

                if (!response.ok) {
                    throw new Error(data.error || 'Platbu se nepodařilo spustit. Zkus to prosím znovu.');
                }

                window.location.href = data.url;
            } catch (error) {
                window.MH_ANALYTICS?.trackEvent?.('one_time_checkout_failed', {
                    product_id: PRODUCT.id,
                    product_type: PRODUCT.type,
                    error_message: error.message,
                    source: getAttribution().source,
                    feature: PRODUCT.id
                });
                showError(errorBox, error.message);
                setButtonLoading(submitButton, false);
            }
        });
    }

    function init() {
        initIcons();
        trackView();
        initStatusBanners();
        initScrollButtons();
        initOrderForm();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
