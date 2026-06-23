(() => {
    const API_URL = window.API_CONFIG?.BASE_URL || '/api';

    const defineFeature = (id, config) => Object.freeze({
        id,
        label: config.label,
        cluster: config.cluster,
        primaryPath: config.primaryPath,
        activationStep: config.activationStep || 'first_value'
    });

    const FALLBACK_FEATURES = Object.freeze({
        account: defineFeature('account', { label: 'Account', cluster: 'activation', primaryPath: '/prihlaseni.html', activationStep: 'signup' }),
        daily_guidance: defineFeature('daily_guidance', { label: 'Daily guidance', cluster: 'horoscopes', primaryPath: '/horoskopy.html' }),
        horoskopy: defineFeature('horoskopy', { label: 'Horoscopes', cluster: 'horoscopes', primaryPath: '/horoskopy.html' }),
        weekly_horoscope: defineFeature('weekly_horoscope', { label: 'Weekly horoscope', cluster: 'horoscopes', primaryPath: '/tydenni-horoskop.html' }),
        monthly_horoscope: defineFeature('monthly_horoscope', { label: 'Monthly horoscope', cluster: 'horoscopes', primaryPath: '/mesicni-horoskop.html' }),
        lunar_calendar: defineFeature('lunar_calendar', { label: 'Lunar calendar', cluster: 'rituals', primaryPath: '/lunace.html' }),
        rituals: defineFeature('rituals', { label: 'Rituals', cluster: 'rituals', primaryPath: '/lunace.html' }),
        ritual_memory: defineFeature('ritual_memory', { label: 'Ritual memory', cluster: 'profile', primaryPath: '/profil.html#ritual-memory-card' }),
        profile_history: defineFeature('profile_history', { label: 'Profile history', cluster: 'profile', primaryPath: '/profil.html' }),
        another_reading: defineFeature('another_reading', { label: 'Follow-up reading', cluster: 'profile', primaryPath: '/profil.html' }),
        tarot: defineFeature('tarot', { label: 'Tarot', cluster: 'tarot', primaryPath: '/tarot.html' }),
        tarot_yes_no: defineFeature('tarot_yes_no', { label: 'Tarot yes/no', cluster: 'tarot', primaryPath: '/tarot-ano-ne.html' }),
        tarot_daily_card_profile_save: defineFeature('tarot_daily_card_profile_save', { label: 'Daily tarot card save', cluster: 'tarot', primaryPath: '/tarot-karta-dne.html' }),
        tarot_multi_card: defineFeature('tarot_multi_card', { label: 'Multi-card tarot', cluster: 'tarot', primaryPath: '/tarot.html' }),
        tarot_celtic_cross: defineFeature('tarot_celtic_cross', { label: 'Celtic cross tarot', cluster: 'tarot', primaryPath: '/tarot-keltsky-kriz.html' }),
        andelske_karty_hluboky_vhled: defineFeature('andelske_karty_hluboky_vhled', { label: 'Angel cards', cluster: 'divination', primaryPath: '/andelske-karty.html' }),
        angel_card_deep: defineFeature('angel_card_deep', { label: 'Angel card deep reading', cluster: 'divination', primaryPath: '/andelske-karty.html' }),
        daily_angel_card: defineFeature('daily_angel_card', { label: 'Daily angel card', cluster: 'divination', primaryPath: '/andelske-karty.html' }),
        angel_numbers: defineFeature('angel_numbers', { label: 'Angel numbers', cluster: 'content', primaryPath: '/andelske-karty.html' }),
        kristalova_koule: defineFeature('kristalova_koule', { label: 'Crystal ball', cluster: 'divination', primaryPath: '/kristalova-koule.html' }),
        crystal_ball_unlimited: defineFeature('crystal_ball_unlimited', { label: 'Crystal ball unlimited', cluster: 'divination', primaryPath: '/kristalova-koule.html' }),
        runy_hluboky_vyklad: defineFeature('runy_hluboky_vyklad', { label: 'Runes deep reading', cluster: 'divination', primaryPath: '/runy.html' }),
        runes_deep_reading: defineFeature('runes_deep_reading', { label: 'Runes deep reading alias', cluster: 'divination', primaryPath: '/runy.html' }),
        shamanske_kolo_plne_cteni: defineFeature('shamanske_kolo_plne_cteni', { label: 'Shamanic wheel full reading', cluster: 'divination', primaryPath: '/shamansko-kolo.html' }),
        medicine_wheel: defineFeature('medicine_wheel', { label: 'Medicine wheel', cluster: 'divination', primaryPath: '/shamansko-kolo.html' }),
        minuly_zivot: defineFeature('minuly_zivot', { label: 'Past life', cluster: 'divination', primaryPath: '/minuly-zivot.html' }),
        past_life: defineFeature('past_life', { label: 'Past life alias', cluster: 'divination', primaryPath: '/minuly-zivot.html' }),
        numerologie_vyklad: defineFeature('numerologie_vyklad', { label: 'Numerology reading', cluster: 'numerology', primaryPath: '/numerologie.html' }),
        numerology: defineFeature('numerology', { label: 'Numerology alias', cluster: 'numerology', primaryPath: '/numerologie.html' }),
        natalni_interpretace: defineFeature('natalni_interpretace', { label: 'Natal chart interpretation', cluster: 'natal', primaryPath: '/natalni-karta.html' }),
        natal_chart: defineFeature('natal_chart', { label: 'Natal chart', cluster: 'natal', primaryPath: '/natalni-karta.html' }),
        natalni_karta: defineFeature('natalni_karta', { label: 'Natal chart product link', cluster: 'natal', primaryPath: '/natalni-karta.html' }),
        astrocartography: defineFeature('astrocartography', { label: 'Astrocartography', cluster: 'natal', primaryPath: '/astro-mapa.html' }),
        partnerska_detail: defineFeature('partnerska_detail', { label: 'Relationship compatibility', cluster: 'relationships', primaryPath: '/partnerska-shoda.html' }),
        synastry: defineFeature('synastry', { label: 'Synastry', cluster: 'relationships', primaryPath: '/partnerska-shoda.html' }),
        compatibility: defineFeature('compatibility', { label: 'Compatibility content', cluster: 'relationships', primaryPath: '/partnerska-shoda.html' }),
        mentor: defineFeature('mentor', { label: 'Star guide', cluster: 'mentor', primaryPath: '/mentor.html' }),
        hvezdny_mentor: defineFeature('hvezdny_mentor', { label: 'Star guide alias', cluster: 'mentor', primaryPath: '/mentor.html' }),
        mentor_unlimited: defineFeature('mentor_unlimited', { label: 'Mentor unlimited', cluster: 'mentor', primaryPath: '/mentor.html' }),
        journal_insights: defineFeature('journal_insights', { label: 'Journal insights', cluster: 'profile', primaryPath: '/profil.html' }),
        premium_membership: defineFeature('premium_membership', { label: 'Premium membership', cluster: 'pricing', primaryPath: '/cenik.html' }),
        subscription_management: defineFeature('subscription_management', { label: 'Subscription management', cluster: 'pricing', primaryPath: '/profil.html#tab-settings' }),
        billing: defineFeature('billing', { label: 'Billing', cluster: 'pricing', primaryPath: '/profil.html#tab-settings' }),
        rocni_horoskop_2026: defineFeature('rocni_horoskop_2026', { label: 'Annual horoscope 2026', cluster: 'one_time', primaryPath: '/rocni-horoskop.html' }),
        annual_horoscope: defineFeature('annual_horoscope', { label: 'Annual horoscope', cluster: 'one_time', primaryPath: '/rocni-horoskop.html' }),
        rocni_horoskop: defineFeature('rocni_horoskop', { label: 'Annual horoscope alias', cluster: 'one_time', primaryPath: '/rocni-horoskop.html' }),
        osobni_mapa_2026: defineFeature('osobni_mapa_2026', { label: 'Personal map 2026', cluster: 'one_time', primaryPath: '/osobni-mapa.html' }),
        personal_map: defineFeature('personal_map', { label: 'Personal map', cluster: 'one_time', primaryPath: '/osobni-mapa.html' }),
        zodiac_signs: defineFeature('zodiac_signs', { label: 'Zodiac signs', cluster: 'content', primaryPath: '/horoskop/' })
    });

    const ACTIVATION_FEATURE_ALIASES = Object.freeze({
        angel_card_deep: 'andelske_karty_hluboky_vhled',
        angel_numbers: 'andelske_karty_hluboky_vhled',
        compatibility: 'partnerska_detail',
        crystal_ball_unlimited: 'kristalova_koule',
        hvezdny_mentor: 'mentor',
        journal_insights: 'mentor',
        medicine_wheel: 'shamanske_kolo_plne_cteni',
        natal_chart: 'natalni_interpretace',
        natalni_karta: 'natalni_interpretace',
        numerology: 'numerologie_vyklad',
        osobni_mapa_2026: 'personal_map',
        past_life: 'minuly_zivot',
        rocni_horoskop_2026: 'annual_horoscope',
        rocni_horoskop: 'annual_horoscope',
        runes_deep_reading: 'runy_hluboky_vyklad',
        synastry: 'partnerska_detail',
        tarot_celtic_cross: 'tarot_multi_card'
    });

    const SOURCE_DEFAULT_FEATURES = Object.freeze({
        homepage_hero: 'daily_guidance',
        pricing_free_cta: 'daily_guidance',
        homepage_pricing_free_cta: 'daily_guidance',
        newsletter_form: 'daily_guidance',
        newsletter_popup: 'daily_guidance',
        homepage_daily_card_detail: 'daily_angel_card',
        homepage_daily_card_full_reading: 'daily_angel_card',
        tarot_daily_card_profile_save: 'tarot_daily_card_profile_save'
    });

    const REDIRECT_DEFAULT_FEATURES = Object.freeze({
        '/horoskopy.html': 'daily_guidance',
        '/tarot.html': 'tarot',
        '/andelske-karty.html': 'andelske_karty_hluboky_vhled',
        '/partnerska-shoda.html': 'partnerska_detail',
        '/natalni-karta.html': 'natalni_interpretace',
        '/numerologie.html': 'numerologie_vyklad',
        '/rocni-horoskop.html': 'annual_horoscope',
        '/osobni-mapa.html': 'personal_map',
        '/mentor.html': 'mentor'
    });

    let manifestPromise = null;
    let manifest = null;
    let featuresById = new Map(Object.entries(FALLBACK_FEATURES));

    function normalizePath(path) {
        if (!path || typeof path !== 'string') return '';
        try {
            const url = new URL(path, window.location.origin);
            return `${url.pathname}${url.search}${url.hash}`;
        } catch {
            return path.startsWith('/') ? path : `/${path}`;
        }
    }

    function formatAppUrl(url) {
        return `${url.pathname}${url.search}${url.hash}`;
    }

    function indexManifest(nextManifest) {
        const nextFeatures = Array.isArray(nextManifest?.features) ? nextManifest.features : [];
        if (!nextFeatures.length) return null;

        manifest = nextManifest;
        featuresById = new Map(nextFeatures.map((feature) => [feature.id, Object.freeze({
            ...feature,
            primaryPath: normalizePath(feature.primaryPath)
        })]));
        return manifest;
    }

    function loadManifest() {
        if (manifestPromise) return manifestPromise;

        manifestPromise = fetch(`${API_URL}/growth-loop`, { credentials: 'same-origin' })
            .then(async (response) => {
                if (!response.ok) throw new Error(`Growth-loop manifest returned ${response.status}`);
                const payload = await response.json();
                return indexManifest(payload) || payload;
            })
            .catch((error) => {
                console.warn('[Growth Loop] Using fallback feature contract:', error.message);
                return null;
            });

        return manifestPromise;
    }

    function getActivationFeatureId(featureId) {
        return ACTIVATION_FEATURE_ALIASES[featureId] || featureId || '';
    }

    function getFeature(featureId) {
        if (!featureId) return null;
        return featuresById.get(featureId) || featuresById.get(getActivationFeatureId(featureId)) || null;
    }

    function getFeatureLabel(featureId, fallback = '') {
        return getFeature(featureId)?.label || fallback || featureId || '';
    }

    function getFeatureDestination(featureId, fallbackPath = '/horoskopy.html') {
        return normalizePath(getFeature(featureId)?.primaryPath || fallbackPath);
    }

    function getSourceDefaultFeature(source) {
        return SOURCE_DEFAULT_FEATURES[source] || '';
    }

    function getRedirectDefaultFeature(redirect) {
        const normalized = normalizePath(redirect).split('?')[0].split('#')[0];
        return REDIRECT_DEFAULT_FEATURES[normalized] || '';
    }

    function getPostSignupActivation(context = {}) {
        const requestedFeature = context.feature || '';
        let featureId = requestedFeature;
        let featureConfig = getFeature(featureId);

        if (requestedFeature && featureConfig?.activationStep === 'signup') {
            return null;
        }

        if (!featureConfig && !requestedFeature) {
            featureId = getSourceDefaultFeature(context.source) || getRedirectDefaultFeature(context.redirect);
            featureConfig = getFeature(featureId);
        }

        if (!featureConfig || featureConfig.activationStep === 'signup') {
            return null;
        }

        return {
            featureId,
            canonicalFeatureId: getActivationFeatureId(featureId),
            label: featureConfig.label,
            path: getFeatureDestination(featureId),
            feature: featureConfig
        };
    }

    function buildActivationUrl(path, context = {}, options = {}) {
        const url = new URL(path || '/profil.html', window.location.origin);
        const source = options.source || context.source || 'signup_activation';
        const featureParam = Object.prototype.hasOwnProperty.call(options, 'featureParam')
            ? options.featureParam
            : context.feature;
        const entrySource = context.entry_source || context.entrySource || context.source;
        const entryFeature = context.entry_feature || context.entryFeature || context.feature;

        if (source) url.searchParams.set('source', source);
        if (featureParam && options.includeFeature !== false) url.searchParams.set('feature', featureParam);
        if (entrySource) url.searchParams.set('entry_source', entrySource);
        if (entryFeature) url.searchParams.set('entry_feature', entryFeature);
        if (context.plan) url.searchParams.set('plan', context.plan);
        if (context.redirect && options.includeRedirect) url.searchParams.set('redirect', context.redirect);

        for (const [key, value] of Object.entries(options.extraParams || {})) {
            if (value) url.searchParams.set(key, value);
        }

        return formatAppUrl(url);
    }

    function buildFeatureUrl(featureId, source = 'signup_activation', context = {}, options = {}) {
        const featureParam = options.preserveFeature
            ? featureId
            : getActivationFeatureId(featureId);
        return buildActivationUrl(getFeatureDestination(featureId, options.fallbackPath), {
            ...context,
            feature: featureParam
        }, {
            ...options,
            source,
            featureParam
        });
    }

    function buildSignupIntent(context = {}, destination = null) {
        if (!context.source && !context.feature && !destination) return null;

        return {
            source: context.source || null,
            feature: context.feature || null,
            plan: context.plan || null,
            redirect: context.redirect || null,
            destination: destination || context.redirect || null,
            createdAt: Date.now()
        };
    }

    window.MH_GROWTH_LOOP = Object.freeze({
        loadManifest,
        get manifest() {
            return manifest;
        },
        get fallbackFeatures() {
            return FALLBACK_FEATURES;
        },
        get activationFeatureAliases() {
            return ACTIVATION_FEATURE_ALIASES;
        },
        get sourceDefaultFeatures() {
            return SOURCE_DEFAULT_FEATURES;
        },
        get redirectDefaultFeatures() {
            return REDIRECT_DEFAULT_FEATURES;
        },
        getActivationFeatureId,
        getFeature,
        getFeatureLabel,
        getFeatureDestination,
        getSourceDefaultFeature,
        getRedirectDefaultFeature,
        getPostSignupActivation,
        buildActivationUrl,
        buildFeatureUrl,
        buildSignupIntent
    });

    loadManifest();
})();
