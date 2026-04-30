const FALLBACK_PRICE_CONFIG = {
    monthly: {
        pruvodce: { amount: '199 Kč', suffix: '/měsíc', planId: 'pruvodce' },
        osviceni: { amount: '499 Kč', suffix: '/měsíc', planId: 'osviceni' }
    },
    yearly: {
        pruvodce: { amount: '1 990 Kč', suffix: '/rok', planId: 'pruvodce-rocne' },
        osviceni: { amount: '4 990 Kč', suffix: '/rok', planId: 'osviceni-rocne' }
    }
};

let priceConfig = FALLBACK_PRICE_CONFIG;
let currentBilling = 'monthly';

const PLAN_META = {
    pruvodce: {
        name: 'Hvězdný Průvodce',
        headline: 'Nejrychlejší cesta k plným výkladům a každodennímu vedení.',
        recommendedFor: 'Většina lidí začíná tady.'
    },
    'pruvodce-rocne': {
        name: 'Hvězdný Průvodce ročně',
        headline: 'Stejný každodenní přístup s výhodnější roční platbou.',
        recommendedFor: 'Dává smysl, pokud se chcete vracet pravidelně.'
    },
    osviceni: {
        name: 'Osvícení',
        headline: 'Pro chvíli, kdy chcete jít víc do hloubky a odemknout pokročilé nástroje.',
        recommendedFor: 'Doporučeno pro astrokartografii a hlubší analýzy.'
    },
    'osviceni-rocne': {
        name: 'Osvícení ročně',
        headline: 'Roční hlubší plán pro pokročilé analýzy, astrokartografii a dlouhodobý směr.',
        recommendedFor: 'Nejlepší volba pro dlouhodobou práci s výklady.'
    },
    'vip-majestrat': {
        name: 'VIP Majestrát',
        headline: 'Nejvyšší hloubka, priorita a osobní péče.',
        recommendedFor: 'Pro nejnáročnější uživatele.'
    }
};

const FALLBACK_FEATURE_PLAN_MAP = {
    angel_card_deep: 'pruvodce',
    andelske_karty_hluboky_vhled: 'pruvodce',
    astrocartography: 'osviceni',
    crystal_ball_unlimited: 'pruvodce',
    daily_guidance: 'pruvodce',
    horoskopy: 'pruvodce',
    hvezdny_mentor: 'pruvodce',
    journal_insights: 'pruvodce',
    kristalova_koule: 'pruvodce',
    medicine_wheel: 'pruvodce',
    minuly_zivot: 'pruvodce',
    monthly_horoscope: 'pruvodce',
    synastry: 'pruvodce',
    partnerska_detail: 'pruvodce',
    natalni_interpretace: 'pruvodce',
    natal_chart: 'pruvodce',
    numerologie_vyklad: 'pruvodce',
    past_life: 'pruvodce',
    rituals: 'pruvodce',
    runy_hluboky_vyklad: 'pruvodce',
    runes_deep_reading: 'pruvodce',
    shamanske_kolo_plne_cteni: 'pruvodce',
    tarot: 'pruvodce',
    tarot_multi_card: 'pruvodce',
    tarot_celtic_cross: 'vip-majestrat',
    weekly_horoscope: 'pruvodce',
    mentor: 'pruvodce'
};
let featurePlanMap = FALLBACK_FEATURE_PLAN_MAP;

function setFeatureText(item, text) {
    if (!item) return;

    const icon = item.querySelector('.feature-icon, svg');
    item.textContent = '';

    if (icon) {
        item.appendChild(icon);
        item.appendChild(document.createTextNode(` ${text}`));
        return;
    }

    item.textContent = text;
}

function getApiBaseUrl() {
    return window.API_CONFIG?.BASE_URL || '/api';
}

function getPriceSuffix(interval, fallback) {
    if (interval === 'month') return '/měsíc';
    if (interval === 'year') return '/rok';
    return fallback;
}

function buildPriceConfigFromManifest(manifest) {
    const plans = Array.isArray(manifest?.plans) ? manifest.plans : [];
    const byId = new Map(plans.map(plan => [plan.id, plan]));
    const pricingPage = manifest?.pricingPage || {};
    const nextConfig = {
        monthly: { ...FALLBACK_PRICE_CONFIG.monthly },
        yearly: { ...FALLBACK_PRICE_CONFIG.yearly }
    };

    ['monthly', 'yearly'].forEach((billing) => {
        Object.entries(FALLBACK_PRICE_CONFIG[billing]).forEach(([displayPlanKey, fallback]) => {
            const planId = pricingPage[billing]?.[displayPlanKey] || fallback.planId;
            const plan = byId.get(planId);
            if (!plan) return;

            nextConfig[billing][displayPlanKey] = {
                amount: plan.priceLabel || fallback.amount,
                suffix: getPriceSuffix(plan.interval, fallback.suffix),
                planId: plan.id
            };
        });
    });

    return nextConfig;
}

async function loadPlanManifest() {
    try {
        const response = await fetch(`${getApiBaseUrl()}/plans`, {
            credentials: 'same-origin'
        });
        if (!response.ok) throw new Error(`Plan manifest returned ${response.status}`);

        const manifest = await response.json();
        if (!manifest.success || !Array.isArray(manifest.plans)) {
            throw new Error('Plan manifest has invalid shape');
        }

        priceConfig = buildPriceConfigFromManifest(manifest);
        featurePlanMap = manifest.featurePlanMap && typeof manifest.featurePlanMap === 'object'
            ? { ...FALLBACK_FEATURE_PLAN_MAP, ...manifest.featurePlanMap }
            : FALLBACK_FEATURE_PLAN_MAP;
    } catch (error) {
        console.warn('[Pricing] Using fallback plan config:', error.message);
        priceConfig = FALLBACK_PRICE_CONFIG;
        featurePlanMap = FALLBACK_FEATURE_PLAN_MAP;
    }
}

function updatePricingCopy() {
    const heroTitle = document.querySelector('.section--hero .hero__title');
    const heroSubtitle = document.querySelector('.section--hero .hero__subtitle');
    const heroTrustBadge = document.querySelector('.hero__trust-badge');
    const pricingCards = document.querySelectorAll('.card--pricing');
    const premiumReasonsBadge = Array.from(document.querySelectorAll('.section__badge'))
        .find((badge) => badge.textContent?.includes('Proč lidé'));
    const premiumReasonsTitle = premiumReasonsBadge?.closest('.section__header')?.querySelector('.section__title');

    if (heroTitle) {
        heroTitle.innerHTML = 'Začněte zdarma. <span class="text-gradient">Plaťte až za hlubší osobní vedení.</span>';
    }

    if (heroSubtitle) {
        heroSubtitle.textContent = 'Bezplatný účet vytvoří denní návyk. Hvězdný Průvodce odemkne plné výklady, historii, osobní profil a týdenní i měsíční vedení pro chvíle, kdy se chcete vracet pravidelně.';
    }

    if (heroTrustBadge) {
        heroTrustBadge.innerHTML = '<span>Účet zdarma bez karty</span><span>|</span><span>Jasná cena před platbou</span><span>|</span><span>Zrušíte kdykoliv</span>';
    }

    const freeCard = pricingCards[0];
    const guideCard = pricingCards[1];

    if (freeCard) {
        const freeDescription = freeCard.querySelector('.card__text');
        const freeFeatures = freeCard.querySelectorAll('.card__features li');
        const freeCta = freeCard.querySelector('.btn');

        if (freeDescription) freeDescription.textContent = 'Pro první seznámení bez závazku';
        setFeatureText(freeFeatures[2], 'Vyzkoušejte si, co vám sedne nejvíc');
        if (freeCta) {
            freeCta.textContent = 'Začít zdarma';
            freeCta.href = 'prihlaseni.html?mode=register&redirect=/horoskopy.html&source=pricing_free_cta&feature=daily_guidance';
            freeCta.dataset.pricingFreeCta = 'true';
        }
    }

    if (guideCard) {
        const guideDescription = guideCard.querySelector('.card__text');
        const guideFeatures = guideCard.querySelectorAll('.card__features li');
        const guideCta = guideCard.querySelector('.plan-checkout-btn');

        if (guideDescription) guideDescription.textContent = 'Pro většinu lidí, kteří chtějí z webu udělat každodenní oporu';
        setFeatureText(guideFeatures[0], 'Neomezené výklady a každodenní vedení bez čekání');
        setFeatureText(guideFeatures[1], 'Plný rozbor natální karty, numerologie a vztahů');
        setFeatureText(guideFeatures[2], 'Historie výkladů a osobní profil pro pravidelný návrat');
        setFeatureText(guideFeatures[3], 'Nejrychlejší cesta k tomu, aby web dával hodnotu každý den');
        if (guideCta) guideCta.textContent = 'Odemknout Hvězdného Průvodce';
    }

    if (premiumReasonsTitle) {
        premiumReasonsTitle.textContent = 'Neplatíte za další ikonky. Platíte za hlubší odpovědi a pravidelný návrat k tomu, co vám pomáhá.';
    }
}

function setToggleState(billing) {
    const toggleMonthly = document.getElementById('toggle-monthly');
    const toggleYearly = document.getElementById('toggle-yearly');

    if (toggleMonthly) {
        toggleMonthly.classList.toggle('pricing-toggle--active', billing === 'monthly');
        toggleMonthly.setAttribute('aria-pressed', billing === 'monthly' ? 'true' : 'false');
    }

    if (toggleYearly) {
        toggleYearly.classList.toggle('pricing-toggle--active', billing === 'yearly');
        toggleYearly.setAttribute('aria-pressed', billing === 'yearly' ? 'true' : 'false');
    }
}

function setPrices(billing = currentBilling) {
    currentBilling = billing;
    const config = priceConfig[billing] || priceConfig.monthly;

    document.querySelectorAll('[data-price-plan]').forEach((element) => {
        const plan = element.dataset.pricePlan;
        const planConfig = config[plan] || priceConfig.monthly[plan];
        if (!planConfig) return;

        const amountEl = element.querySelector('.price-amount');
        const suffixEl = element.querySelector('.price-suffix');

        if (amountEl) amountEl.textContent = planConfig.amount;
        if (suffixEl) suffixEl.textContent = planConfig.suffix;

        const card = element.closest('.card--pricing');
        const checkoutButton = card?.querySelector('.plan-checkout-btn');
        if (checkoutButton) {
            checkoutButton.dataset.plan = planConfig.planId;
        }
    });

    setToggleState(billing);
}

function sanitizeRedirectUrl(url) {
    const parsed = new URL(url, window.location.origin);
    parsed.searchParams.delete('payment');
    parsed.searchParams.delete('plan');
    parsed.searchParams.delete('source');
    parsed.searchParams.delete('feature');
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}

function resolveCheckoutContext() {
    const params = new URLSearchParams(window.location.search);
    const pendingContext = window.Auth?.getPendingCheckoutContext?.() || {};
    const feature = params.get('feature') || pendingContext.feature || null;
    const explicitPlan = params.get('plan') || pendingContext.planId || null;
    const source = params.get('source') || pendingContext.source || 'pricing_page';
    const recommendedPlan = explicitPlan || featurePlanMap[feature] || 'pruvodce';

    return {
        feature,
        source,
        recommendedPlan
    };
}

function showPaymentReturnState(context) {
    const params = new URLSearchParams(window.location.search);
    const paymentState = params.get('payment');

    if (!paymentState) {
        return;
    }

    if (paymentState === 'cancel') {
        window.MH_ANALYTICS?.trackPaymentResult?.('cancel', {
            source: context.source || 'pricing_page_return',
            feature: context.feature || null
        });
        window.Auth?.showToast?.(
            'Platba byla zrušena',
            'Platbu jste nedokončili. Ceník zůstává otevřený, takže můžete pokračovat kdykoliv.',
            'info'
        );
    }

    history.replaceState({}, document.title, sanitizeRedirectUrl(window.location.href));
}

function renderRecommendationBanner(context) {
    const heroSubtitle = document.querySelector('.section--hero .hero__subtitle');
    if (!heroSubtitle) return;

    const planMeta = PLAN_META[context.recommendedPlan];
    if (!planMeta) return;

    const existing = document.getElementById('pricing-plan-recommendation');
    if (existing) existing.remove();

    const banner = document.createElement('div');
    const hasVisiblePlanCard = !!document.querySelector(`.plan-checkout-btn[data-plan="${context.recommendedPlan}"]`);
    const actionLabel = hasVisiblePlanCard ? 'Ukázat doporučený plán' : 'Pokračovat k doporučenému plánu';
    banner.id = 'pricing-plan-recommendation';
    banner.className = 'pricing-plan-recommendation';
    banner.innerHTML = `
        <div class="pricing-plan-recommendation__eyebrow">Doporučený další krok</div>
        <strong class="pricing-plan-recommendation__title">${planMeta.name}</strong>
        <p class="pricing-plan-recommendation__text">${planMeta.headline} ${planMeta.recommendedFor}</p>
        <button type="button" class="pricing-plan-recommendation__action" data-recommended-plan="${context.recommendedPlan}">${actionLabel}</button>
    `;

    heroSubtitle.insertAdjacentElement('afterend', banner);

    banner.querySelector('.pricing-plan-recommendation__action')?.addEventListener('click', () => {
        window.MH_ANALYTICS?.trackCTA?.('pricing_recommendation_cta', {
            source: context.source || 'pricing_page',
            feature: context.feature || null,
            plan_id: context.recommendedPlan
        });
        if (!highlightRecommendedPlan(context.recommendedPlan)) {
            startRecommendedCheckout(context.recommendedPlan, context);
        }
    });
}

function highlightPricingCard(card) {
    document.querySelectorAll('.card--pricing').forEach((card) => {
        card.classList.remove('pricing-card--recommended');
    });

    if (!card) return false;

    card.classList.add('pricing-card--recommended');
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return true;
}

function highlightRecommendedPlan(planId) {
    if (!planId) return false;

    const button = document.querySelector(`.plan-checkout-btn[data-plan="${planId}"]`);
    const card = button?.closest('.card--pricing');
    return highlightPricingCard(card);
}

function resolveDisplayedPlanId(planKey) {
    return priceConfig[currentBilling]?.[planKey]?.planId || priceConfig.monthly?.[planKey]?.planId || planKey;
}

function highlightFreePlan() {
    const card = document.querySelector('[data-pricing-free-cta]')?.closest('.card--pricing');
    return highlightPricingCard(card);
}

function startRecommendedCheckout(planId, context) {
    const checkoutContext = {
        source: context.source || 'pricing_recommendation',
        feature: context.feature || null,
        redirect: '/cenik.html',
        authMode: 'register'
    };

    if (window.Auth?.startPlanCheckout) {
        window.Auth.startPlanCheckout(planId, checkoutContext);
        return;
    }

    const authUrl = new URL('/prihlaseni.html', window.location.origin);
    authUrl.searchParams.set('mode', 'register');
    authUrl.searchParams.set('redirect', '/cenik.html');
    authUrl.searchParams.set('plan', planId);
    authUrl.searchParams.set('source', checkoutContext.source);
    if (checkoutContext.feature) authUrl.searchParams.set('feature', checkoutContext.feature);
    window.location.href = `${authUrl.pathname}${authUrl.search}`;
}

function bindCheckoutButtons(context) {
    document.querySelectorAll('.plan-checkout-btn').forEach((button) => {
        button.addEventListener('click', (event) => {
            event.preventDefault();
            const planId = button.dataset.plan;
            if (!planId) return;

            const isLoggedIn = !!window.Auth?.isLoggedIn?.();
            const checkoutContext = {
                source: context.source || 'pricing_page',
                feature: context.feature || null,
                billing_interval: currentBilling,
                redirect: '/cenik.html',
                authMode: 'register'
            };

            window.MH_ANALYTICS?.trackCTA?.('pricing_plan_cta', {
                label: button.textContent?.trim() || 'checkout',
                plan_id: planId,
                requires_auth: !isLoggedIn,
                destination: isLoggedIn ? 'stripe_checkout_session' : '/prihlaseni.html',
                source: checkoutContext.source,
                feature: checkoutContext.feature,
                billing_interval: currentBilling
            });

            if (window.Auth?.startPlanCheckout) {
                window.Auth.startPlanCheckout(planId, checkoutContext);
                return;
            }

            startRecommendedCheckout(planId, checkoutContext);
        });
    });
}

function bindProductLinks() {
    document.querySelectorAll('[data-product]').forEach((link) => {
        link.addEventListener('click', () => {
            window.MH_ANALYTICS?.trackCTA?.('pricing_one_time_product', {
                product_id: link.dataset.product || null,
                label: link.textContent?.trim() || 'one_time_product',
                destination: link.getAttribute('href') || null
            });
        });
    });
}

function bindFreePlanCta() {
    document.querySelector('[data-pricing-free-cta]')?.addEventListener('click', (event) => {
        const link = event.currentTarget;
        window.MH_ANALYTICS?.trackCTA?.('pricing_free_cta', {
            destination: link.getAttribute('href') || '/prihlaseni.html',
            auth_mode: 'register',
            source: 'pricing_free_cta',
            feature: 'daily_guidance'
        });
    });
}

function bindPricingDecisionGuide(context) {
    const choices = document.querySelectorAll('[data-pricing-choice]');
    choices.forEach((button) => {
        button.addEventListener('click', () => {
            const choice = button.dataset.pricingChoice;
            if (!choice) return;

            choices.forEach((item) => {
                item.classList.toggle('is-active', item === button);
                item.setAttribute('aria-pressed', item === button ? 'true' : 'false');
            });

            window.MH_ANALYTICS?.trackCTA?.('pricing_decision_choice', {
                choice,
                source: context.source || 'pricing_page',
                feature: context.feature || null,
                billing_interval: currentBilling
            });

            if (choice === 'free') {
                highlightFreePlan();
                return;
            }

            highlightRecommendedPlan(resolveDisplayedPlanId(choice));
        });
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadPlanManifest();
    setPrices('monthly');
    updatePricingCopy();

    const context = resolveCheckoutContext();
    showPaymentReturnState(context);
    renderRecommendationBanner(context);

    window.MH_ANALYTICS?.trackPricingViewed?.(context.recommendedPlan, {
        source: context.source || 'pricing_page',
        feature: context.feature || null
    });

    const toggleMonthly = document.getElementById('toggle-monthly');
    const toggleYearly = document.getElementById('toggle-yearly');

    toggleMonthly?.addEventListener('click', () => {
        setPrices('monthly');
        window.MH_ANALYTICS?.trackEvent?.('pricing_billing_toggled', { billing_interval: 'monthly' });
    });

    if (toggleYearly) {
        toggleYearly.title = 'Roční platba sníží cenu přibližně o dva měsíce';
        toggleYearly.addEventListener('click', () => {
            setPrices('yearly');
            window.MH_ANALYTICS?.trackEvent?.('pricing_billing_toggled', { billing_interval: 'yearly' });
        });
    }

    bindCheckoutButtons(context);
    bindProductLinks();
    bindFreePlanCta();
    bindPricingDecisionGuide(context);

    if (context.source !== 'pricing_page' || context.feature || context.recommendedPlan !== 'pruvodce') {
        window.requestAnimationFrame(() => {
            highlightRecommendedPlan(context.recommendedPlan);
        });
    }
});
