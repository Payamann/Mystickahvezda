const ANNUAL_HOROSCOPE_PRODUCT = {
    id: 'rocni_horoskop_2026',
    type: 'annual_horoscope',
    name: 'Roční horoskop na míru 2026',
    price: 199,
    currency: 'CZK'
};

function getAnnualContext() {
    const params = new URLSearchParams(window.location.search);
    return {
        source: params.get('source') || 'annual_horoscope_page',
        feature: params.get('feature') || ANNUAL_HOROSCOPE_PRODUCT.id
    };
}

function getAnnualEventPayload(extra = {}) {
    const context = getAnnualContext();
    return {
        product_id: ANNUAL_HOROSCOPE_PRODUCT.id,
        product_type: ANNUAL_HOROSCOPE_PRODUCT.type,
        product_name: ANNUAL_HOROSCOPE_PRODUCT.name,
        price: ANNUAL_HOROSCOPE_PRODUCT.price,
        currency: ANNUAL_HOROSCOPE_PRODUCT.currency,
        source: context.source,
        feature: context.feature,
        ...extra
    };
}

function trackAnnualEvent(eventName, payload = {}) {
    const eventPayload = getAnnualEventPayload(payload);
    window.MH_ANALYTICS?.trackEvent?.(eventName, eventPayload);
    void trackAnnualFunnelEvent(eventName, eventPayload);
}

async function trackAnnualFunnelEvent(eventName, payload = {}) {
    if (![
        'one_time_product_cta_clicked',
        'one_time_form_started',
        'one_time_form_validation_failed',
        'one_time_checkout_failed'
    ].includes(eventName)) {
        return;
    }

    try {
        const csrfToken = await getCsrfToken();
        await fetch('/api/payment/funnel-event', {
            method: 'POST',
            credentials: 'include',
            keepalive: true,
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': csrfToken
            },
            body: JSON.stringify({
                eventName,
                source: payload.source || getAnnualContext().source,
                feature: ANNUAL_HOROSCOPE_PRODUCT.id,
                planId: ANNUAL_HOROSCOPE_PRODUCT.id,
                planType: ANNUAL_HOROSCOPE_PRODUCT.type,
                metadata: {
                    product_id: ANNUAL_HOROSCOPE_PRODUCT.id,
                    product_type: ANNUAL_HOROSCOPE_PRODUCT.type,
                    product_name: ANNUAL_HOROSCOPE_PRODUCT.name,
                    price: ANNUAL_HOROSCOPE_PRODUCT.price,
                    currency: ANNUAL_HOROSCOPE_PRODUCT.currency,
                    ...payload
                }
            })
        });
    } catch (error) {
        console.warn('[Annual horoscope funnel] Could not record event:', error.message);
    }
}

function trackAnnualProductView() {
    trackAnnualEvent('one_time_product_viewed');
}

function handleAnnualPaymentStatus() {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');
    const sessionId = params.get('session_id') || null;
    const context = getAnnualContext();

    if (status === 'success') {
        document.getElementById('bannerSuccess')?.classList.add('visible');

        const formSection = document.getElementById('form');
        const sampleSection = document.querySelector('.sample-section');
        if (formSection) formSection.hidden = true;
        if (sampleSection) sampleSection.hidden = true;

        window.MH_ANALYTICS?.trackPaymentResult?.('success', {
            product_id: ANNUAL_HOROSCOPE_PRODUCT.id,
            product_type: ANNUAL_HOROSCOPE_PRODUCT.type,
            session_id: sessionId,
            source: context.source,
            feature: context.feature
        });
        window.MH_ANALYTICS?.trackPurchaseCompleted?.(
            ANNUAL_HOROSCOPE_PRODUCT.id,
            ANNUAL_HOROSCOPE_PRODUCT.price,
            ANNUAL_HOROSCOPE_PRODUCT.currency,
            {
                product_type: ANNUAL_HOROSCOPE_PRODUCT.type,
                product_name: ANNUAL_HOROSCOPE_PRODUCT.name,
                transaction_id: sessionId || undefined,
                source: context.source,
                feature: context.feature
            }
        );
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (status === 'cancel') {
        document.getElementById('bannerCancel')?.classList.add('visible');
        window.MH_ANALYTICS?.trackPaymentResult?.('cancel', {
            product_id: ANNUAL_HOROSCOPE_PRODUCT.id,
            product_type: ANNUAL_HOROSCOPE_PRODUCT.type,
            source: context.source,
            feature: context.feature
        });
    }
}

function bindAnnualScrollButtons() {
    document.querySelectorAll('[data-scroll-target]').forEach((button) => {
        button.addEventListener('click', () => {
            const target = document.getElementById(button.dataset.scrollTarget);
            trackAnnualEvent('one_time_product_cta_clicked', {
                cta_location: button.className || 'annual_horoscope_page',
                target: button.dataset.scrollTarget || null
            });
            target?.scrollIntoView({ behavior: 'smooth' });
        });
    });
}

function getOrderBody() {
    return {
        name: document.getElementById('name')?.value.trim() || '',
        birthDate: document.getElementById('birthDate')?.value || '',
        sign: document.getElementById('sign')?.value || '',
        email: document.getElementById('email')?.value.trim() || ''
    };
}

function bindAnnualUpgradeLinks() {
    document.querySelectorAll('[data-annual-upgrade]').forEach((link) => {
        link.addEventListener('click', () => {
            window.MH_ANALYTICS?.trackCTA?.('annual_horoscope_success_upgrade', {
                product_id: ANNUAL_HOROSCOPE_PRODUCT.id,
                destination: link.getAttribute('href') || '/cenik.html',
                source: 'annual_horoscope_success',
                feature: 'daily_guidance',
                plan_id: 'pruvodce'
            });
        });
    });
}

async function getCsrfToken() {
    const csrfRes = await fetch('/api/csrf-token', { credentials: 'include' });
    const { csrfToken } = await csrfRes.json();
    return csrfToken;
}

function resetAnnualSubmitButton(button) {
    button.disabled = false;
    button.textContent = 'Pokračovat k platbě (199 Kč) →';
}

function bindAnnualOrderForm() {
    const form = document.getElementById('orderForm');
    const button = document.getElementById('submitBtn');
    const errorElement = document.getElementById('formError');

    if (!form || !button || !errorElement) return;

    let formStartedTracked = false;
    form.addEventListener('focusin', (event) => {
        if (formStartedTracked) return;
        formStartedTracked = true;
        trackAnnualEvent('one_time_form_started', {
            field: event.target?.name || event.target?.id || 'unknown'
        });
    });

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        button.disabled = true;
        button.textContent = 'Přesměrovávám na platbu...';
        errorElement.hidden = true;
        errorElement.classList.remove('visible');

        if (!form.checkValidity()) {
            trackAnnualEvent('one_time_form_validation_failed', {
                validation_source: 'browser'
            });
            form.reportValidity();
            resetAnnualSubmitButton(button);
            return;
        }

        try {
            window.MH_ANALYTICS?.trackCheckoutStarted?.(ANNUAL_HOROSCOPE_PRODUCT.id, {
                product_type: ANNUAL_HOROSCOPE_PRODUCT.type,
                value: ANNUAL_HOROSCOPE_PRODUCT.price,
                currency: ANNUAL_HOROSCOPE_PRODUCT.currency,
                source: getAnnualContext().source,
                feature: getAnnualContext().feature
            });

            const csrfToken = await getCsrfToken();
            const res = await fetch('/api/rocni-horoskop/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
                credentials: 'include',
                body: JSON.stringify({
                    ...getOrderBody(),
                    source: getAnnualContext().source
                })
            });
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Něco se pokazilo. Zkuste to prosím znovu.');
            }

            window.location.href = data.url;
        } catch (err) {
            window.MH_ANALYTICS?.trackEvent?.('one_time_checkout_failed', {
                product_id: ANNUAL_HOROSCOPE_PRODUCT.id,
                error_message: err.message,
                source: getAnnualContext().source,
                feature: getAnnualContext().feature
            });
            void trackAnnualFunnelEvent('one_time_checkout_failed', {
                ...getAnnualEventPayload(),
                error_message: err.message
            });
            errorElement.textContent = err.message;
            errorElement.hidden = false;
            errorElement.classList.add('visible');
            resetAnnualSubmitButton(button);
        }
    });
}

function initAnnualHoroscopePage() {
    trackAnnualProductView();
    handleAnnualPaymentStatus();
    bindAnnualScrollButtons();
    bindAnnualUpgradeLinks();
    bindAnnualOrderForm();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAnnualHoroscopePage);
} else {
    initAnnualHoroscopePage();
}
