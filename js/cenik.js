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
    osobni_mapa_2026: 'pruvodce',
    synastry: 'pruvodce',
    partnerska_detail: 'pruvodce',
    natalni_interpretace: 'pruvodce',
    natal_chart: 'pruvodce',
    numerologie_vyklad: 'pruvodce',
    past_life: 'pruvodce',
    premium_membership: 'pruvodce',
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

const FEATURE_PREVIEW_DESTINATIONS = {
    account: { path: '/horoskopy.html', label: 'Nejd\u0159\u00edv otev\u0159\u00edt denn\u00ed horoskop zdarma' },
    angel_card_deep: { path: '/andelske-karty.html', label: 'Nejd\u0159\u00edv otev\u0159\u00edt and\u011blsk\u00e9 karty zdarma' },
    andelske_karty_hluboky_vhled: { path: '/andelske-karty.html', label: 'Nejd\u0159\u00edv otev\u0159\u00edt and\u011blsk\u00e9 karty zdarma' },
    astrocartography: { path: '/astro-mapa.html', label: 'Nejd\u0159\u00edv otev\u0159\u00edt astro mapu' },
    crystal_ball_unlimited: { path: '/kristalova-koule.html', label: 'Nejd\u0159\u00edv otev\u0159\u00edt k\u0159i\u0161\u0165\u00e1lovou kouli' },
    daily_angel_card: { path: '/andelske-karty.html', label: 'Nejd\u0159\u00edv otev\u0159\u00edt and\u011blskou kartu zdarma' },
    daily_guidance: { path: '/horoskopy.html', label: 'Nejd\u0159\u00edv otev\u0159\u00edt denn\u00ed horoskop zdarma' },
    horoskopy: { path: '/horoskopy.html', label: 'Nejd\u0159\u00edv otev\u0159\u00edt horoskopy zdarma' },
    hvezdny_mentor: { path: '/mentor.html', label: 'Nejd\u0159\u00edv otev\u0159\u00edt Hv\u011bzdn\u00e9ho pr\u016fvodce' },
    journal_insights: { path: '/mentor.html', label: 'Nejd\u0159\u00edv otev\u0159\u00edt Hv\u011bzdn\u00e9ho pr\u016fvodce' },
    kristalova_koule: { path: '/kristalova-koule.html', label: 'Nejd\u0159\u00edv otev\u0159\u00edt k\u0159i\u0161\u0165\u00e1lovou kouli' },
    medicine_wheel: { path: '/shamansko-kolo.html', label: 'Nejd\u0159\u00edv otev\u0159\u00edt \u0161amansk\u00e9 kolo' },
    mentor: { path: '/mentor.html', label: 'Nejd\u0159\u00edv otev\u0159\u00edt Hv\u011bzdn\u00e9ho pr\u016fvodce' },
    minuly_zivot: { path: '/minuly-zivot.html', label: 'Nejd\u0159\u00edv otev\u0159\u00edt minul\u00fd \u017eivot' },
    monthly_horoscope: { path: '/horoskopy.html', label: 'Nejd\u0159\u00edv otev\u0159\u00edt horoskopy zdarma' },
    natal_chart: { path: '/natalni-karta.html', label: 'Nejd\u0159\u00edv otev\u0159\u00edt nat\u00e1ln\u00ed kartu' },
    natalni_interpretace: { path: '/natalni-karta.html', label: 'Nejd\u0159\u00edv otev\u0159\u00edt nat\u00e1ln\u00ed kartu' },
    numerologie_vyklad: { path: '/numerologie.html', label: 'Nejd\u0159\u00edv otev\u0159\u00edt numerologii zdarma' },
    numerology: { path: '/numerologie.html', label: 'Nejd\u0159\u00edv otev\u0159\u00edt numerologii zdarma' },
    osobni_mapa_2026: { path: '/osobni-mapa.html', label: 'Vr\u00e1tit se k Osobn\u00ed map\u011b' },
    partnerska_detail: { path: '/partnerska-shoda.html', label: 'Nejd\u0159\u00edv otev\u0159\u00edt partnerskou shodu' },
    past_life: { path: '/minuly-zivot.html', label: 'Nejd\u0159\u00edv otev\u0159\u00edt minul\u00fd \u017eivot' },
    premium_membership: { path: '/mentor.html', label: 'Nejd\u0159\u00edv otev\u0159\u00edt Hv\u011bzdn\u00e9ho pr\u016fvodce' },
    rituals: { path: '/lunace.html', label: 'Nejd\u0159\u00edv otev\u0159\u00edt lun\u00e1rn\u00ed kalend\u00e1\u0159' },
    runes_deep_reading: { path: '/runy.html', label: 'Nejd\u0159\u00edv otev\u0159\u00edt runy zdarma' },
    runy_hluboky_vyklad: { path: '/runy.html', label: 'Nejd\u0159\u00edv otev\u0159\u00edt runy zdarma' },
    shamanske_kolo_plne_cteni: { path: '/shamansko-kolo.html', label: 'Nejd\u0159\u00edv otev\u0159\u00edt \u0161amansk\u00e9 kolo' },
    synastry: { path: '/partnerska-shoda.html', label: 'Nejd\u0159\u00edv otev\u0159\u00edt partnerskou shodu' },
    tarot: { path: '/tarot.html', label: 'Nejd\u0159\u00edv otev\u0159\u00edt tarot zdarma' },
    tarot_celtic_cross: { path: '/tarot.html', label: 'Nejd\u0159\u00edv otev\u0159\u00edt tarot zdarma' },
    tarot_multi_card: { path: '/tarot.html', label: 'Nejd\u0159\u00edv otev\u0159\u00edt tarot zdarma' },
    weekly_horoscope: { path: '/horoskopy.html', label: 'Nejd\u0159\u00edv otev\u0159\u00edt horoskopy zdarma' }
};

const SOURCE_RECOMMENDATION_COPY = {
    personal_map_email_day3: {
        eyebrow: 'Navazuje na Osobn\u00ed mapu',
        title: 'Mapa ti dala sm\u011br. Pr\u016fvodce pom\u016f\u017ee dr\u017eet rytmus.',
        text: 'Osobn\u00ed mapa uk\u00e1zala hlavn\u00ed t\u00e9ma. Hv\u011bzdn\u00fd Pr\u016fvodce k tomu p\u0159id\u00e1 pravideln\u00e9 v\u00fdklady, historii a n\u00e1vrat k tomu, co \u0159e\u0161\u00ed\u0161 pr\u00e1v\u011b te\u010f.',
        actionLabel: 'Uk\u00e1zat pl\u00e1n Pr\u016fvodce'
    },
    personal_map_success: {
        eyebrow: 'Dal\u0161\u00ed krok po Osobn\u00ed map\u011b',
        title: 'Jednor\u00e1zov\u00fd vhled m\u00e1 navazovat na ka\u017edodenn\u00ed veden\u00ed.',
        text: 'Hv\u011bzdn\u00fd Pr\u016fvodce odemkne hlub\u0161\u00ed v\u00fdklady a osobn\u00ed historii, aby se z mapy stal pravideln\u00fd kompas.',
        actionLabel: 'Uk\u00e1zat pl\u00e1n Pr\u016fvodce'
    }
};

const CHECKOUT_METADATA_PARAM_KEYS = [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_content',
    'requested_card'
];

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

function sanitizeCheckoutMetadataValue(value, maxLength = 120) {
    if (typeof value !== 'string') return null;

    const cleaned = value.trim().replace(/[^\w.:-]/g, '');
    if (!cleaned) return null;

    return cleaned.slice(0, maxLength);
}

function setCheckoutMetadataValue(metadata, key, value) {
    const sanitized = sanitizeCheckoutMetadataValue(value);
    if (sanitized) metadata[key] = sanitized;
}

function resolveCheckoutMetadata(params, pendingContext = {}) {
    const metadata = {};
    const pendingMetadata = pendingContext.metadata && typeof pendingContext.metadata === 'object' && !Array.isArray(pendingContext.metadata)
        ? pendingContext.metadata
        : {};

    setCheckoutMetadataValue(
        metadata,
        'entry_source',
        params.get('entry_source') || pendingMetadata.entry_source || params.get('source') || pendingContext.source
    );
    setCheckoutMetadataValue(
        metadata,
        'entry_feature',
        params.get('entry_feature') || pendingMetadata.entry_feature || params.get('feature') || pendingContext.feature
    );

    CHECKOUT_METADATA_PARAM_KEYS.forEach((key) => {
        setCheckoutMetadataValue(metadata, key, params.get(key) || pendingMetadata[key]);
    });
    setCheckoutMetadataValue(metadata, 'card_param', params.get('card') || pendingMetadata.card_param);

    return metadata;
}

function resolveCheckoutContext() {
    const params = new URLSearchParams(window.location.search);
    const pendingContext = window.Auth?.getPendingCheckoutContext?.() || {};
    const feature = params.get('feature') || pendingContext.feature || null;
    const explicitPlan = params.get('plan') || pendingContext.planId || null;
    const source = params.get('source') || pendingContext.source || 'pricing_page';
    const recommendedPlan = explicitPlan || featurePlanMap[feature] || 'pruvodce';
    const metadata = resolveCheckoutMetadata(params, pendingContext);

    return {
        feature,
        source,
        recommendedPlan,
        metadata
    };
}

function shouldShowPreviewDestination(context) {
    return Boolean(context.feature || (context.source && context.source !== 'pricing_page'));
}

function getPreviewDestination(context) {
    if (!shouldShowPreviewDestination(context)) return null;

    const destination = FEATURE_PREVIEW_DESTINATIONS[context.feature] || {
        path: '/horoskopy.html',
        label: 'Nejd\u0159\u00edv otev\u0159\u00edt bezplatn\u00fd v\u00fdklad'
    };
    const url = new URL(destination.path, window.location.origin);
    url.searchParams.set('source', 'pricing_recommendation_preview');
    if (context.source) url.searchParams.set('entry_source', context.source);
    if (context.feature) url.searchParams.set('entry_feature', context.feature);

    return {
        ...destination,
        href: `${url.pathname}${url.search}${url.hash}`
    };
}

function getCancelDownsellDestination(context) {
    const url = new URL('/rocni-horoskop.html', window.location.origin);
    url.searchParams.set('source', 'checkout_cancel_recovery');
    if (context.source) url.searchParams.set('entry_source', context.source);
    if (context.feature) url.searchParams.set('entry_feature', context.feature);
    if (context.recommendedPlan) url.searchParams.set('entry_plan', context.recommendedPlan);
    return `${url.pathname}${url.search}`;
}

async function trackPricingFunnelEvent(eventName, context, metadata = {}) {
    try {
        const csrfToken = window.getCSRFToken ? await window.getCSRFToken() : null;
        if (!csrfToken) return;

        await fetch(`${getApiBaseUrl()}/payment/funnel-event`, {
            method: 'POST',
            credentials: 'include',
            keepalive: true,
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': csrfToken
            },
            body: JSON.stringify({
                eventName,
                source: context.source || 'pricing_page',
                feature: context.feature || null,
                planId: context.recommendedPlan || null,
                metadata: {
                    path: window.location.pathname,
                    ...(context.metadata || {}),
                    ...metadata
                }
            })
        });
    } catch (error) {
        console.warn('[Pricing] Could not record funnel event:', error.message);
    }
}

function renderCheckoutCancelRecovery(context) {
    const heroSubtitle = document.querySelector('.section--hero .hero__subtitle');
    if (!heroSubtitle) return;

    const existing = document.getElementById('pricing-cancel-recovery');
    if (existing) existing.remove();

    const planMeta = PLAN_META[context.recommendedPlan] || PLAN_META.pruvodce;
    const previewDestination = getPreviewDestination(context);
    const downsellHref = getCancelDownsellDestination(context);
    const panel = document.createElement('div');
    panel.id = 'pricing-cancel-recovery';
    panel.className = 'pricing-cancel-recovery';
    panel.innerHTML = `
        <div class="pricing-cancel-recovery__eyebrow">Platba nebyla dokon\u010dena</div>
        <strong class="pricing-cancel-recovery__title">M\u016f\u017eete pokra\u010dovat bez hled\u00e1n\u00ed</strong>
        <p class="pricing-cancel-recovery__text">${planMeta.name}: ${planMeta.headline}</p>
        <div class="pricing-cancel-recovery__actions">
            <button type="button" class="pricing-cancel-recovery__primary" data-cancel-retry>Zobrazit vybran\u00fd pl\u00e1n</button>
            ${previewDestination ? `<a class="pricing-cancel-recovery__secondary" href="${previewDestination.href}" data-cancel-preview>${previewDestination.label}</a>` : ''}
            <a class="pricing-cancel-recovery__secondary" href="${downsellHref}" data-cancel-downsell>Jednor\u00e1zov\u00fd ro\u010dn\u00ed horoskop</a>
        </div>
    `;

    heroSubtitle.insertAdjacentElement('afterend', panel);

    panel.querySelector('[data-cancel-retry]')?.addEventListener('click', () => {
        window.MH_ANALYTICS?.trackCTA?.('pricing_cancel_retry_plan', {
            source: context.source || 'pricing_cancel',
            feature: context.feature || null,
            plan_id: context.recommendedPlan
        });
        void trackPricingFunnelEvent('pricing_recommendation_clicked', context, {
            recovery: true
        });
        if (!highlightRecommendedPlan(context.recommendedPlan)) {
            startRecommendedCheckout(context.recommendedPlan, context);
        }
    });

    panel.querySelector('[data-cancel-preview]')?.addEventListener('click', (event) => {
        const link = event.currentTarget;
        window.MH_ANALYTICS?.trackCTA?.('pricing_cancel_preview', {
            source: context.source || 'pricing_cancel',
            feature: context.feature || null,
            plan_id: context.recommendedPlan,
            destination: link.getAttribute('href') || null
        });
        void trackPricingFunnelEvent('pricing_preview_clicked', context, {
            recovery: true,
            destination: link.getAttribute('href') || null,
            label: link.textContent?.trim() || 'preview'
        });
    });

    panel.querySelector('[data-cancel-downsell]')?.addEventListener('click', (event) => {
        const link = event.currentTarget;
        window.MH_ANALYTICS?.trackCTA?.('pricing_cancel_downsell', {
            source: context.source || 'pricing_cancel',
            feature: context.feature || null,
            plan_id: context.recommendedPlan,
            destination: link.getAttribute('href') || null
        });
        void trackPricingFunnelEvent('pricing_downsell_clicked', context, {
            recovery: true,
            destination: link.getAttribute('href') || null,
            product: 'rocni_horoskop_2026'
        });
    });
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
            feature: context.feature || null,
            ...(context.metadata || {})
        });
        window.Auth?.showToast?.(
            'Platba byla zrušena',
            'Platbu jste nedokončili. Ceník zůstává otevřený, takže můžete pokračovat kdykoliv.',
            'info'
        );
        renderCheckoutCancelRecovery(context);
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
    const sourceCopy = SOURCE_RECOMMENDATION_COPY[context.source] || null;
    const actionLabel = sourceCopy?.actionLabel || (hasVisiblePlanCard ? 'Ukázat doporučený plán' : 'Pokračovat k doporučenému plánu');
    const previewDestination = getPreviewDestination(context);
    banner.id = 'pricing-plan-recommendation';
    banner.className = 'pricing-plan-recommendation';
    banner.innerHTML = `
        <div class="pricing-plan-recommendation__eyebrow">${sourceCopy?.eyebrow || 'Doporučený další krok'}</div>
        <strong class="pricing-plan-recommendation__title">${sourceCopy?.title || planMeta.name}</strong>
        <p class="pricing-plan-recommendation__text">${sourceCopy?.text || `${planMeta.headline} ${planMeta.recommendedFor}`}</p>
        <div class="pricing-plan-recommendation__actions">
            <button type="button" class="pricing-plan-recommendation__action" data-recommended-plan="${context.recommendedPlan}">${actionLabel}</button>
            ${previewDestination ? `<a class="pricing-plan-recommendation__preview" href="${previewDestination.href}" data-preview-destination>${previewDestination.label}</a>` : ''}
        </div>
    `;

    heroSubtitle.insertAdjacentElement('afterend', banner);

    banner.querySelector('.pricing-plan-recommendation__action')?.addEventListener('click', () => {
        window.MH_ANALYTICS?.trackCTA?.('pricing_recommendation_cta', {
            source: context.source || 'pricing_page',
            feature: context.feature || null,
            plan_id: context.recommendedPlan
        });
        void trackPricingFunnelEvent('pricing_recommendation_clicked', context, {
            visible_plan_card: hasVisiblePlanCard
        });
        if (!highlightRecommendedPlan(context.recommendedPlan)) {
            startRecommendedCheckout(context.recommendedPlan, context);
        }
    });

    banner.querySelector('[data-preview-destination]')?.addEventListener('click', (event) => {
        const link = event.currentTarget;
        window.MH_ANALYTICS?.trackCTA?.('pricing_recommendation_preview', {
            source: context.source || 'pricing_page',
            feature: context.feature || null,
            plan_id: context.recommendedPlan,
            destination: link.getAttribute('href') || null
        });
        void trackPricingFunnelEvent('pricing_preview_clicked', context, {
            destination: link.getAttribute('href') || null,
            label: link.textContent?.trim() || 'preview'
        });
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
        metadata: context.metadata || {},
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
                metadata: context.metadata || {},
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
                billing_interval: currentBilling,
                ...(context.metadata || {})
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
        feature: context.feature || null,
        ...(context.metadata || {})
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
