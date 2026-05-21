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
        headline: 'Plné výklady, historie a pravidelný návrat k jednomu tématu.',
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
    ritual_memory: 'pruvodce',
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
    ritual_memory: { path: '/profil.html#ritual-memory-card', label: 'Vr\u00e1tit se k pam\u011bti ritu\u00e1lu' },
    rituals: { path: '/lunace.html', label: 'Nejd\u0159\u00edv otev\u0159\u00edt lun\u00e1rn\u00ed kalend\u00e1\u0159' },
    runes_deep_reading: { path: '/runy.html', label: 'Nejd\u0159\u00edv otev\u0159\u00edt runy zdarma' },
    runy_hluboky_vyklad: { path: '/runy.html', label: 'Nejd\u0159\u00edv otev\u0159\u00edt runy zdarma' },
    shamanske_kolo_plne_cteni: { path: '/shamansko-kolo.html', label: 'Nejd\u0159\u00edv otev\u0159\u00edt \u0161amansk\u00e9 kolo' },
    synastry: { path: '/partnerska-shoda.html', label: 'Nejd\u0159\u00edv otev\u0159\u00edt partnerskou shodu' },
    tarot: { path: '/tarot.html', label: 'Nejd\u0159\u00edv otev\u0159\u00edt tarot zdarma' },
    tarot_celtic_cross: {
        path: '/tarot.html',
        label: 'Vr\u00e1tit se ke Keltsk\u00e9mu k\u0159\u00ed\u017ei zdarma',
        params: { feature: 'tarot_celtic_cross', intent: 'celtic_cross', spread: 'celtic_cross' }
    },
    tarot_multi_card: {
        path: '/tarot.html',
        label: 'Vr\u00e1tit se k v\u00fdkladu 3 karet zdarma',
        params: { feature: 'tarot_multi_card', intent: 'three_cards', spread: 'three_cards' }
    },
    weekly_horoscope: { path: '/horoskopy.html', label: 'Nejd\u0159\u00edv otev\u0159\u00edt horoskopy zdarma' }
};

const CANCEL_DOWNSELL_PRODUCTS = {
    rocni_horoskop_2026: {
        path: '/rocni-horoskop.html',
        label: 'Jednorázový roční horoskop',
        productId: 'rocni_horoskop_2026'
    },
    osobni_mapa_2026: {
        path: '/osobni-mapa.html',
        label: 'Jednorázová Osobní mapa',
        productId: 'osobni_mapa_2026'
    }
};

const CANCEL_DOWNSELL_FEATURE_PRODUCTS = {
    angel_card_deep: 'osobni_mapa_2026',
    andelske_karty_hluboky_vhled: 'osobni_mapa_2026',
    astrocartography: 'osobni_mapa_2026',
    crystal_ball_unlimited: 'osobni_mapa_2026',
    daily_guidance: 'rocni_horoskop_2026',
    horoskopy: 'rocni_horoskop_2026',
    hvezdny_mentor: 'osobni_mapa_2026',
    journal_insights: 'osobni_mapa_2026',
    kristalova_koule: 'osobni_mapa_2026',
    medicine_wheel: 'osobni_mapa_2026',
    mentor: 'osobni_mapa_2026',
    minuly_zivot: 'osobni_mapa_2026',
    monthly_horoscope: 'rocni_horoskop_2026',
    natal_chart: 'osobni_mapa_2026',
    natalni_interpretace: 'osobni_mapa_2026',
    numerologie_vyklad: 'osobni_mapa_2026',
    numerology: 'osobni_mapa_2026',
    partnerska_detail: 'osobni_mapa_2026',
    past_life: 'osobni_mapa_2026',
    ritual_memory: 'osobni_mapa_2026',
    rituals: 'rocni_horoskop_2026',
    runes_deep_reading: 'osobni_mapa_2026',
    runy_hluboky_vyklad: 'osobni_mapa_2026',
    shamanske_kolo_plne_cteni: 'osobni_mapa_2026',
    synastry: 'osobni_mapa_2026',
    tarot: 'osobni_mapa_2026',
    tarot_celtic_cross: 'osobni_mapa_2026',
    tarot_multi_card: 'osobni_mapa_2026',
    weekly_horoscope: 'rocni_horoskop_2026'
};

const SOURCE_RECOMMENDATION_COPY = {
    annual_horoscope_email_day3: {
        eyebrow: 'Navazuje na Roční horoskop',
        title: 'Roční výhled dal směr. Průvodce drží denní rytmus.',
        text: 'Roční horoskop ukázal hlavní témata roku. Hvězdný Průvodce k tomu přidá denní a týdenní výklady, tarot a návrat k otázce: co z toho pro mě platí právě dnes?',
        actionLabel: 'Ukázat plán Průvodce'
    },
    annual_horoscope_success: {
        eyebrow: 'Další krok po Ročním horoskopu',
        title: 'PDF dá velký směr. Průvodce pomáhá vracet se k němu každý den.',
        text: 'Roční horoskop je jednorázový výhled. Hvězdný Průvodce z něj udělá pravidelnou oporu přes horoskopy, tarot, historii výkladů a osobní návratový rituál.',
        actionLabel: 'Ukázat plán Průvodce'
    },
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
    },
    profile_memory: {
        eyebrow: 'Navazuje na Pam\u011b\u0165 ritu\u00e1lu',
        title: 'Pam\u011b\u0165 uk\u00e1zala opakuj\u00edc\u00ed se t\u00e9ma. Pr\u016fvodce z n\u011bj ud\u011bl\u00e1 pravideln\u00fd sm\u011br.',
        text: 'Profil u\u017e dr\u017e\u00ed v\u00fdklady, zp\u011btnou vazbu a reflexe pohromad\u011b. Hv\u011bzdn\u00fd Pr\u016fvodce p\u0159id\u00e1 hlub\u0161\u00ed v\u00fdklady a osobn\u00ed historii, aby se z opakovan\u00e9ho t\u00e9matu stal konkr\u00e9tn\u00ed dal\u0161\u00ed krok.',
        actionLabel: 'Odemknout hlub\u0161\u00ed pam\u011b\u0165'
    },
    tarot_love_landing: {
        eyebrow: 'Navazuje na tarot na l\u00e1sku',
        title: 'Vztahov\u00e1 ot\u00e1zka pot\u0159ebuje souvislosti, ne jen rychlou odpov\u011b\u010f.',
        text: 'Hv\u011bzdn\u00fd Pr\u016fvodce odemkne v\u00edcekartov\u00fd vztahov\u00fd tarot, historii v\u00fdklad\u016f a osobn\u00ed kontext, aby se z nejistoty stal konkr\u00e9tn\u00ed dal\u0161\u00ed krok.',
        actionLabel: 'Odemknout vztahov\u00fd v\u00fdklad'
    }
};

const FEATURE_RECOMMENDATION_COPY = {
    tarot_multi_card: {
        eyebrow: 'Navazuje na v\u00fdklad 3 karet',
        title: 'Jedna karta otev\u0159e t\u00e9ma. T\u0159i karty uk\u00e1\u017eou souvislosti.',
        text: 'Hv\u011bzdn\u00fd Pr\u016fvodce odemkne cel\u00fd t\u0159\u00edkartov\u00fd v\u00fdklad s minulost\u00ed, p\u0159\u00edtomnost\u00ed a nejbli\u017e\u0161\u00edm krokem, aby odpov\u011b\u010f nebyla jen pocit, ale praktick\u00fd sm\u011br.',
        actionLabel: 'Odemknout v\u00fdklad 3 karet'
    },
    tarot_celtic_cross: {
        eyebrow: 'Navazuje na Keltsk\u00fd k\u0159\u00ed\u017e',
        title: 'Velk\u00e1 ot\u00e1zka pot\u0159ebuje v\u00edc ne\u017e rychlou kartu.',
        text: 'VIP Majestr\u00e1t odemkne Keltsk\u00fd k\u0159\u00ed\u017e s deseti pozicemi, hlub\u0161\u00edm kontextem a osobn\u00edm veden\u00edm pro situace, kde rozhoduje nuance.',
        actionLabel: 'Odemknout Keltsk\u00fd k\u0159\u00ed\u017e'
    }
};

const CHECKOUT_METADATA_PARAM_KEYS = [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_content',
    'requested_card'
];
const PRICING_RECOVERY_CONTEXT_KEY = 'pricing_recovery_context_v1';
const PRICING_RECOVERY_CONTEXT_TTL_MS = 20 * 60 * 1000;

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
        setFeatureText(guideFeatures[3], 'Hodnota roste hlavně při opakovaném návratu a uložené historii');
        if (guideCta) guideCta.textContent = 'Odemknout Hvězdného Průvodce';
    }

    if (premiumReasonsTitle) {
        premiumReasonsTitle.textContent = 'Neplatíte za další ikonky. Platíte za historii, souvislosti a pravidelný návrat k tomu, co řešíte.';
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

function readRecoveryContext() {
    try {
        const raw = sessionStorage.getItem(PRICING_RECOVERY_CONTEXT_KEY);
        if (!raw) return null;

        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') {
            sessionStorage.removeItem(PRICING_RECOVERY_CONTEXT_KEY);
            return null;
        }

        const expiresAt = Number(parsed.expiresAt || 0);
        if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
            sessionStorage.removeItem(PRICING_RECOVERY_CONTEXT_KEY);
            return null;
        }

        return parsed;
    } catch {
        sessionStorage.removeItem(PRICING_RECOVERY_CONTEXT_KEY);
        return null;
    }
}

function writeRecoveryContext(context = {}) {
    try {
        const metadata = context.metadata && typeof context.metadata === 'object' && !Array.isArray(context.metadata)
            ? context.metadata
            : {};

        sessionStorage.setItem(PRICING_RECOVERY_CONTEXT_KEY, JSON.stringify({
            source: context.source || null,
            feature: context.feature || null,
            recommendedPlan: context.recommendedPlan || null,
            metadata,
            expiresAt: Date.now() + PRICING_RECOVERY_CONTEXT_TTL_MS
        }));
    } catch {
        // Ignore storage failures to avoid blocking checkout recovery UI.
    }
}

function clearRecoveryContext() {
    try {
        sessionStorage.removeItem(PRICING_RECOVERY_CONTEXT_KEY);
    } catch {
        // Ignore storage failures.
    }
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

function appendCheckoutMetadataParams(url, metadata = {}) {
    const paramMap = {
        entry_source: 'entry_source',
        entry_feature: 'entry_feature',
        utm_source: 'utm_source',
        utm_medium: 'utm_medium',
        utm_campaign: 'utm_campaign',
        utm_content: 'utm_content',
        requested_card: 'requested_card',
        card_param: 'card'
    };

    Object.entries(paramMap).forEach(([key, param]) => {
        const sanitized = sanitizeCheckoutMetadataValue(metadata[key]);
        if (sanitized) url.searchParams.set(param, sanitized);
    });
}

function resolveCheckoutMetadata(params, pendingContext = {}, recoveryContext = null) {
    const metadata = {};
    const pendingMetadata = pendingContext.metadata && typeof pendingContext.metadata === 'object' && !Array.isArray(pendingContext.metadata)
        ? pendingContext.metadata
        : {};
    const recoveryMetadata = recoveryContext?.metadata && typeof recoveryContext.metadata === 'object' && !Array.isArray(recoveryContext.metadata)
        ? recoveryContext.metadata
        : {};

    setCheckoutMetadataValue(
        metadata,
        'entry_source',
        params.get('entry_source')
        || pendingMetadata.entry_source
        || params.get('source')
        || pendingContext.source
        || recoveryMetadata.entry_source
        || recoveryContext?.source
    );
    setCheckoutMetadataValue(
        metadata,
        'entry_feature',
        params.get('entry_feature')
        || pendingMetadata.entry_feature
        || params.get('feature')
        || pendingContext.feature
        || recoveryMetadata.entry_feature
        || recoveryContext?.feature
    );

    CHECKOUT_METADATA_PARAM_KEYS.forEach((key) => {
        setCheckoutMetadataValue(metadata, key, params.get(key) || pendingMetadata[key] || recoveryMetadata[key]);
    });
    setCheckoutMetadataValue(metadata, 'card_param', params.get('card') || pendingMetadata.card_param || recoveryMetadata.card_param);

    return metadata;
}

function resolveCheckoutContext() {
    const params = new URLSearchParams(window.location.search);
    const pendingContext = window.Auth?.getPendingCheckoutContext?.() || {};
    const recoveryContext = readRecoveryContext();
    const feature = params.get('feature') || pendingContext.feature || recoveryContext?.feature || null;
    const explicitPlan = params.get('plan') || pendingContext.planId || recoveryContext?.recommendedPlan || null;
    const source = params.get('source') || pendingContext.source || recoveryContext?.source || 'pricing_page';
    const recommendedPlan = explicitPlan || featurePlanMap[feature] || 'pruvodce';
    const metadata = resolveCheckoutMetadata(params, pendingContext, recoveryContext);

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
    Object.entries(destination.params || {}).forEach(([key, value]) => {
        url.searchParams.set(key, value);
    });
    url.searchParams.set('source', 'pricing_recommendation_preview');
    if (context.source) url.searchParams.set('entry_source', context.source);
    if (context.feature) url.searchParams.set('entry_feature', context.feature);

    return {
        ...destination,
        href: `${url.pathname}${url.search}${url.hash}`
    };
}

function getCancelDownsellDestination(context) {
    const product = getCancelDownsellProduct(context);
    const url = new URL(product.path, window.location.origin);
    url.searchParams.set('source', 'checkout_cancel_recovery');
    if (context.source) url.searchParams.set('entry_source', context.source);
    if (context.feature) url.searchParams.set('entry_feature', context.feature);
    if (context.recommendedPlan) url.searchParams.set('entry_plan', context.recommendedPlan);
    return {
        ...product,
        href: `${url.pathname}${url.search}`
    };
}

function getCancelDownsellProduct(context) {
    if (context.source?.includes('annual_horoscope')) {
        return CANCEL_DOWNSELL_PRODUCTS.osobni_mapa_2026;
    }

    if (context.source?.includes('personal_map')) {
        return CANCEL_DOWNSELL_PRODUCTS.rocni_horoskop_2026;
    }

    const productId = CANCEL_DOWNSELL_FEATURE_PRODUCTS[context.feature] || 'rocni_horoskop_2026';
    return CANCEL_DOWNSELL_PRODUCTS[productId] || CANCEL_DOWNSELL_PRODUCTS.rocni_horoskop_2026;
}

function getRecoveryPreviewLabel(label) {
    return (label || 'Vr\u00e1tit se k p\u016fvodn\u00edmu v\u00fdkladu')
        .replace(/\s+zdarma\b/gi, '')
        .replace(/\bbezplatn[ýá]\s+/gi, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
}

async function trackPricingFunnelEvent(eventName, context, metadata = {}) {
    try {
        const csrfToken = window.getCSRFToken ? await window.getCSRFToken() : null;
        if (!csrfToken) return;

        const { planId, plan_id: planIdSnake, ...eventMetadata } = metadata;
        const eventPlanId = planId || planIdSnake || context.recommendedPlan || null;

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
                planId: eventPlanId,
                metadata: {
                    path: window.location.pathname,
                    ...(context.metadata || {}),
                    ...eventMetadata
                }
            })
        });
    } catch (error) {
        console.warn('[Pricing] Could not record funnel event:', error.message);
    }
}

function waitForFunnelEventBeforeNavigation(funnelEventPromise) {
    return Promise.race([
        funnelEventPromise,
        new Promise((resolve) => setTimeout(resolve, 800))
    ]);
}

function shouldControlTrackedNavigation(event) {
    return event.button === 0
        && !event.metaKey
        && !event.ctrlKey
        && !event.shiftKey
        && !event.altKey
        && !event.defaultPrevented;
}

function getEntryMetadata(context) {
    return {
        ...(context.metadata || {}),
        entry_source: context.source || null,
        entry_feature: context.feature || null
    };
}

function getPricingLinkLabel(element, fallback) {
    return element.querySelector('strong span:first-child')?.textContent?.trim()
        || element.textContent?.trim()
        || fallback;
}

function renderCheckoutCancelRecovery(context, paymentState = 'cancel') {
    const heroSubtitle = document.querySelector('.section--hero .hero__subtitle');
    if (!heroSubtitle) return;

    const existing = document.getElementById('pricing-cancel-recovery');
    if (existing) existing.remove();

    const planMeta = PLAN_META[context.recommendedPlan] || PLAN_META.pruvodce;
    const previewDestination = getPreviewDestination(context);
    const downsellProduct = getCancelDownsellDestination(context);
    const isFailure = paymentState === 'failure';
    const previewLabel = previewDestination ? getRecoveryPreviewLabel(previewDestination.label) : null;
    const panel = document.createElement('div');
    panel.id = 'pricing-cancel-recovery';
    panel.className = 'pricing-cancel-recovery';
    panel.innerHTML = `
        <div class="pricing-cancel-recovery__eyebrow">${isFailure ? 'Platbu se nepoda\u0159ilo spustit' : 'Platba nebyla dokon\u010dena'}</div>
        <strong class="pricing-cancel-recovery__title">${isFailure ? 'Kontext jsme zachovali. Zkuste bezpe\u010dn\u011b nav\u00e1zat.' : 'M\u016f\u017eete pokra\u010dovat bez hled\u00e1n\u00ed.'}</strong>
        <p class="pricing-cancel-recovery__text">${planMeta.name}: ${planMeta.headline}</p>
        <p class="pricing-cancel-recovery__note">Karta z\u016fst\u00e1v\u00e1 ve Stripe Checkoutu; Mystick\u00e1 Hv\u011bzda ji na webu neukl\u00e1d\u00e1. Cena a vybran\u00fd pl\u00e1n se zobraz\u00ed znovu p\u0159ed potvrzen\u00edm platby.</p>
        <div class="pricing-cancel-recovery__actions">
            <button type="button" class="pricing-cancel-recovery__primary" data-cancel-retry>${isFailure ? 'Zkusit platbu znovu' : 'Zobrazit vybran\u00fd pl\u00e1n a cenu'}</button>
            ${previewDestination ? `<a class="pricing-cancel-recovery__secondary" href="${previewDestination.href}" data-cancel-preview>${previewLabel}</a>` : ''}
            <a class="pricing-cancel-recovery__secondary" href="${downsellProduct.href}" data-cancel-downsell>${downsellProduct.label}</a>
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
            recovery: true,
            payment_state: paymentState
        });
        if (isFailure) {
            startRecommendedCheckout(context.recommendedPlan, context);
            return;
        }
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
            payment_state: paymentState,
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
            payment_state: paymentState,
            destination: link.getAttribute('href') || null,
            product: downsellProduct.productId
        });
    });
}

function showPaymentReturnState(context) {
    const params = new URLSearchParams(window.location.search);
    const paymentState = params.get('payment');

    if (!paymentState) {
        return;
    }

    if (paymentState === 'cancel' || paymentState === 'failure') {
        const result = paymentState === 'failure' ? 'failure' : 'cancel';
        window.MH_ANALYTICS?.trackPaymentResult?.(result, {
            source: context.source || 'pricing_page_return',
            feature: context.feature || null,
            plan_id: context.recommendedPlan || null,
            reason: params.get('reason') || null,
            ...(context.metadata || {})
        });
        void trackPricingFunnelEvent(
            paymentState === 'failure' ? 'checkout_returned_failure' : 'checkout_returned_cancel',
            context,
            {
                payment_state: paymentState,
                reason: params.get('reason') || null,
                recovery: true
            }
        );
        if (paymentState === 'failure') {
            window.Auth?.showToast?.(
                'Platbu se nepoda\u0159ilo spustit',
                'Zachovali jsme vybran\u00fd pl\u00e1n i p\u016fvodn\u00ed kontext, abyste mohli nav\u00e1zat bez hled\u00e1n\u00ed.',
                'error'
            );
        }
        if (paymentState !== 'failure') window.Auth?.showToast?.(
            'Platba byla zrušena',
            'Platbu jste nedokončili. Ceník zůstává otevřený, takže můžete pokračovat kdykoliv.',
            'info'
        );
        writeRecoveryContext(context);
        renderCheckoutCancelRecovery(context, paymentState);
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
    const recommendationCopy = SOURCE_RECOMMENDATION_COPY[context.source] || FEATURE_RECOMMENDATION_COPY[context.feature] || null;
    const actionLabel = recommendationCopy?.actionLabel || (hasVisiblePlanCard ? 'Ukázat doporučený plán' : 'Pokračovat k doporučenému plánu');
    const previewDestination = getPreviewDestination(context);
    banner.id = 'pricing-plan-recommendation';
    banner.className = 'pricing-plan-recommendation';
    banner.innerHTML = `
        <div class="pricing-plan-recommendation__eyebrow">${recommendationCopy?.eyebrow || 'Doporučený další krok'}</div>
        <strong class="pricing-plan-recommendation__title">${recommendationCopy?.title || planMeta.name}</strong>
        <p class="pricing-plan-recommendation__text">${recommendationCopy?.text || `${planMeta.headline} ${planMeta.recommendedFor}`}</p>
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
    document.querySelector('.pricing-addon')?.classList.remove('pricing-addon--recommended');
    document.querySelectorAll('.pricing-addon__product--recommended').forEach((product) => {
        product.classList.remove('pricing-addon__product--recommended');
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

function resolveBillingIntervalFromPlan(planId) {
    if (typeof planId !== 'string' || planId.length === 0) return null;
    return planId.endsWith('-rocne') ? 'yearly' : 'monthly';
}

function resolveDisplayedPlanId(planKey) {
    return priceConfig[currentBilling]?.[planKey]?.planId || priceConfig.monthly?.[planKey]?.planId || planKey;
}

function highlightFreePlan() {
    const card = document.querySelector('[data-pricing-free-cta]')?.closest('.card--pricing');
    return highlightPricingCard(card);
}

function highlightOneTimeProducts() {
    highlightPricingCard(null);

    const addon = document.querySelector('.pricing-addon');
    if (!addon) return false;

    const entryProduct = addon.querySelector('[data-product="rocni_horoskop_2026"]')
        || addon.querySelector('.pricing-addon__product');

    addon.classList.add('pricing-addon--recommended');
    entryProduct?.classList.add('pricing-addon__product--recommended');
    addon.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return true;
}

function startRecommendedCheckout(planId, context) {
    clearRecoveryContext();
    const resolvedBillingInterval = resolveBillingIntervalFromPlan(planId) || currentBilling;
    const checkoutContext = {
        source: context.source || 'pricing_recommendation',
        feature: context.feature || null,
        metadata: getEntryMetadata({
            source: context.source || 'pricing_recommendation',
            feature: context.feature || null,
            metadata: context.metadata || {}
        }),
        billing_interval: resolvedBillingInterval,
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
    authUrl.searchParams.set('billing_interval', checkoutContext.billing_interval);
    appendCheckoutMetadataParams(authUrl, checkoutContext.metadata);
    window.location.href = `${authUrl.pathname}${authUrl.search}`;
}

function bindCheckoutButtons(context) {
    let checkoutStatus = document.getElementById('pricing-checkout-status');
    if (!checkoutStatus) {
        checkoutStatus = document.createElement('p');
        checkoutStatus.id = 'pricing-checkout-status';
        checkoutStatus.className = 'sr-only';
        checkoutStatus.setAttribute('role', 'status');
        checkoutStatus.setAttribute('aria-live', 'polite');
        document.querySelector('.pricing-grid')?.insertAdjacentElement('beforebegin', checkoutStatus);
    }

    function setCheckoutPendingState(button, pending) {
        if (!(button instanceof HTMLElement)) return;

        if (pending) {
            if (!button.dataset.originalLabel) {
                button.dataset.originalLabel = button.textContent?.trim() || 'Pokračovat';
            }
            button.dataset.checkoutPending = '1';
            button.disabled = true;
            button.setAttribute('aria-busy', 'true');
            if (checkoutStatus) checkoutStatus.textContent = 'Připravuji bezpečný Stripe checkout. Cena a plán se znovu zobrazí před potvrzením platby.';
            button.textContent = 'Přesměrování na platbu...';
            return;
        }

        const fallbackLabel = button.dataset.originalLabel || 'Pokračovat';
        button.dataset.checkoutPending = '0';
        button.disabled = false;
        button.removeAttribute('aria-busy');
        button.textContent = fallbackLabel;
        if (checkoutStatus) checkoutStatus.textContent = '';
    }

    document.querySelectorAll('.plan-checkout-btn').forEach((button) => {
        if (checkoutStatus) {
            const describedBy = new Set((button.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean));
            describedBy.add(checkoutStatus.id);
            button.setAttribute('aria-describedby', Array.from(describedBy).join(' '));
        }

        if (button.dataset.checkoutBound === '1') return;
        button.dataset.checkoutBound = '1';

        button.addEventListener('click', async (event) => {
            event.preventDefault();
            const planId = button.dataset.plan;
            if (!planId) return;
            if (button.dataset.checkoutPending === '1') return;

            const isLoggedIn = !!window.Auth?.isLoggedIn?.();
            const activeContext = resolveCheckoutContext();
            const checkoutSource = activeContext.source || context.source || 'pricing_page';
            const checkoutFeature = activeContext.feature || context.feature || 'premium_membership';
            const checkoutContext = {
                source: checkoutSource,
                feature: checkoutFeature,
                metadata: getEntryMetadata({
                    source: checkoutSource,
                    feature: checkoutFeature,
                    metadata: activeContext.metadata || context.metadata || {}
                }),
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
                ...(activeContext.metadata || context.metadata || {})
            });

            const pricingIntentPromise = waitForFunnelEventBeforeNavigation(trackPricingFunnelEvent('pricing_plan_cta_clicked', {
                ...activeContext,
                recommendedPlan: planId
            }, {
                label: button.textContent?.trim() || 'checkout',
                requires_auth: !isLoggedIn,
                destination: isLoggedIn ? 'stripe_checkout_session' : '/prihlaseni.html',
                billing_interval: currentBilling
            }));

            setCheckoutPendingState(button, true);
            const pendingResetTimer = window.setTimeout(() => {
                setCheckoutPendingState(button, false);
            }, 10000);

            try {
                await pricingIntentPromise;

                if (window.Auth?.startPlanCheckout) {
                    clearRecoveryContext();
                    window.Auth.startPlanCheckout(planId, checkoutContext);
                    return;
                }

                startRecommendedCheckout(planId, checkoutContext);
            } catch (error) {
                window.clearTimeout(pendingResetTimer);
                setCheckoutPendingState(button, false);
                throw error;
            }
        });
    });
}

function bindProductLinks(context) {
    document.querySelectorAll('[data-product]').forEach((link) => {
        link.addEventListener('click', async (event) => {
            const href = link.getAttribute('href') || null;
            const productId = link.dataset.product || null;
            const label = getPricingLinkLabel(link, 'one_time_product');
            window.MH_ANALYTICS?.trackCTA?.('pricing_one_time_product', {
                product_id: productId,
                label,
                destination: href
            });

            const funnelEvent = trackPricingFunnelEvent('pricing_product_cta_clicked', {
                source: 'pricing_addon',
                feature: productId,
                metadata: getEntryMetadata(context)
            }, {
                product_id: productId,
                label,
                destination: href
            });

            if (!href || !shouldControlTrackedNavigation(event)) {
                void funnelEvent;
                return;
            }

            event.preventDefault();
            await waitForFunnelEventBeforeNavigation(funnelEvent);
            window.location.href = link.href;
        });
    });
}

function bindFreePlanCta(context) {
    document.querySelector('[data-pricing-free-cta]')?.addEventListener('click', (event) => {
        const link = event.currentTarget;
        const href = link.getAttribute('href') || '/prihlaseni.html';
        window.MH_ANALYTICS?.trackCTA?.('pricing_free_cta', {
            destination: href,
            auth_mode: 'register',
            source: 'pricing_free_cta',
            feature: 'daily_guidance'
        });

        const funnelEvent = trackPricingFunnelEvent('pricing_free_cta_clicked', {
            source: 'pricing_free_cta',
            feature: 'daily_guidance',
            metadata: getEntryMetadata(context)
        }, {
            label: link.textContent?.trim() || 'free_signup',
            destination: href,
            auth_mode: 'register'
        });

        if (!shouldControlTrackedNavigation(event)) {
            void funnelEvent;
            return;
        }

        event.preventDefault();
        waitForFunnelEventBeforeNavigation(funnelEvent).then(() => {
            window.location.href = link.href;
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

            if (choice === 'one_time') {
                highlightOneTimeProducts();
                return;
            }

            highlightRecommendedPlan(resolveDisplayedPlanId(choice));
        });
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    const initialContext = resolveCheckoutContext();
    bindCheckoutButtons(initialContext);

    await loadPlanManifest();
    const context = resolveCheckoutContext();
    const initialBilling = resolveBillingIntervalFromPlan(context.recommendedPlan) || 'monthly';
    setPrices(initialBilling);
    updatePricingCopy();

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
    bindProductLinks(context);
    bindFreePlanCta(context);
    bindPricingDecisionGuide(context);

    if (context.source !== 'pricing_page' || context.feature || context.recommendedPlan !== 'pruvodce') {
        window.requestAnimationFrame(() => {
            highlightRecommendedPlan(context.recommendedPlan);
        });
    }
});
