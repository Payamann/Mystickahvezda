/**
 * Growth-loop contract for acquisition, activation and monetization.
 *
 * This file is intentionally server-owned: public endpoints and static audits
 * derive their feature/product vocabulary from here so checkout, onboarding,
 * profile and paywall work do not drift into separate naming systems.
 */

export const GROWTH_LOOP_VERSION = '2026-05-18';

export const TRACKING_PAYLOAD_KEYS = Object.freeze([
    'source',
    'feature',
    'product_id',
    'plan_id',
    'entry_source',
    'entry_feature',
    'intent',
    'variant',
    'step'
]);

export const NORTH_STAR = Object.freeze({
    id: 'weekly_ritual_to_paid_intent',
    label: 'Weekly ritual completed before paid intent',
    description: 'Users who complete a personal ritual in a week and then trigger a paid intent.',
    requiredEvents: Object.freeze([
        'first_value_completed',
        'activation_completed',
        'daily_ritual_completed',
        'paywall_viewed',
        'pricing_plan_cta_clicked',
        'checkout_auth_required',
        'checkout_auth_page_viewed',
        'checkout_auth_form_submitted',
        'checkout_session_requested',
        'checkout_session_created',
        'subscription_checkout_completed',
        'one_time_purchase_completed'
    ])
});

export const CORE_FUNNEL_EVENTS = Object.freeze([
    'first_value_completed',
    'activation_completed',
    'daily_ritual_completed',
    'return_ritual_completed',
    'reading_feedback_submitted',
    'paywall_viewed',
    'login_gate_viewed',
    'pricing_plan_cta_clicked',
    'pricing_product_cta_clicked',
    'one_time_product_cta_clicked',
    'checkout_auth_required',
    'checkout_auth_page_viewed',
    'checkout_auth_form_submitted',
    'checkout_post_verification_pending',
    'checkout_post_verification_recovered',
    'checkout_session_requested',
    'checkout_session_created',
    'subscription_checkout_completed',
    'one_time_purchase_completed'
]);

export const REVENUE_HEALTH_EVENTS = Object.freeze([
    'subscription_invoice_paid',
    'subscription_payment_failed',
    'checkout_post_verification_pending',
    'checkout_post_verification_recovered',
    'checkout_session_failed',
    'one_time_checkout_failed',
    'payment_refunded',
    'subscription_cancel_requested'
]);

export const PRODUCT_CATALOG = Object.freeze({
    premium_membership: Object.freeze({
        id: 'premium_membership',
        label: 'Premium membership',
        productType: 'subscription',
        primaryPlanId: 'pruvodce',
        primaryPath: '/cenik.html',
        freeValue: 'Try the daily guidance loop without a card.',
        paidValue: 'Unlock full readings, history and recurring guidance.'
    }),
    rocni_horoskop_2026: Object.freeze({
        id: 'rocni_horoskop_2026',
        label: 'Annual horoscope 2026',
        productType: 'one_time',
        primaryPlanId: null,
        primaryPath: '/rocni-horoskop.html',
        freeValue: 'Preview what the annual reading contains.',
        paidValue: 'Receive a personalized one-time PDF for the year.'
    }),
    osobni_mapa_2026: Object.freeze({
        id: 'osobni_mapa_2026',
        label: 'Personal map 2026',
        productType: 'one_time',
        primaryPlanId: null,
        primaryPath: '/osobni-mapa.html',
        freeValue: 'Understand what a deeper personal map includes.',
        paidValue: 'Receive a deeper personalized one-time PDF.'
    }),
    natalni_karta: Object.freeze({
        id: 'natalni_karta',
        label: 'Natal chart',
        productType: 'feature',
        primaryPlanId: 'pruvodce',
        primaryPath: '/natalni-karta.html',
        freeValue: 'Generate the basic chart and core placements.',
        paidValue: 'Unlock interpretation, history and deeper context.'
    })
});

function feature({
    id,
    label,
    cluster,
    primaryPath,
    freeValue,
    premiumValue,
    recommendedPlanId = 'pruvodce',
    productId = 'premium_membership',
    activationStep = 'first_value'
}) {
    return Object.freeze({
        id,
        label,
        cluster,
        primaryPath,
        freeValue,
        premiumValue,
        recommendedPlanId,
        productId,
        activationStep
    });
}

export const FEATURE_CATALOG = Object.freeze({
    account: feature({
        id: 'account',
        label: 'Account',
        cluster: 'activation',
        primaryPath: '/prihlaseni.html',
        freeValue: 'Create a free account without a card.',
        premiumValue: 'Account context keeps paid checkout and saved readings connected.',
        recommendedPlanId: null,
        productId: null,
        activationStep: 'signup'
    }),
    daily_guidance: feature({
        id: 'daily_guidance',
        label: 'Daily guidance',
        cluster: 'horoscopes',
        primaryPath: '/horoskopy.html',
        freeValue: 'Open today\'s horoscope and one concrete next step.',
        premiumValue: 'Unlock full daily, weekly and monthly guidance with history.'
    }),
    horoskopy: feature({
        id: 'horoskopy',
        label: 'Horoscopes',
        cluster: 'horoscopes',
        primaryPath: '/horoskopy.html',
        freeValue: 'Read the daily horoscope hub.',
        premiumValue: 'Unlock deeper periods and personal continuity.'
    }),
    weekly_horoscope: feature({
        id: 'weekly_horoscope',
        label: 'Weekly horoscope',
        cluster: 'horoscopes',
        primaryPath: '/tydenni-horoskop.html',
        freeValue: 'Preview the weekly direction.',
        premiumValue: 'Unlock week-level timing and context.'
    }),
    monthly_horoscope: feature({
        id: 'monthly_horoscope',
        label: 'Monthly horoscope',
        cluster: 'horoscopes',
        primaryPath: '/mesicni-horoskop.html',
        freeValue: 'Preview the month theme.',
        premiumValue: 'Unlock month-level planning and context.'
    }),
    lunar_calendar: feature({
        id: 'lunar_calendar',
        label: 'Lunar calendar',
        cluster: 'rituals',
        primaryPath: '/lunace.html',
        freeValue: 'Check today\'s lunar phase.',
        premiumValue: 'Turn lunar timing into a saved ritual.'
    }),
    rituals: feature({
        id: 'rituals',
        label: 'Rituals',
        cluster: 'rituals',
        primaryPath: '/lunace.html',
        freeValue: 'Use a simple lunar practice.',
        premiumValue: 'Unlock deeper ritual guidance and return prompts.'
    }),
    ritual_memory: feature({
        id: 'ritual_memory',
        label: 'Ritual memory',
        cluster: 'profile',
        primaryPath: '/profil.html#ritual-memory-card',
        freeValue: 'See recent readings and reflection prompts.',
        premiumValue: 'Connect recurring themes across readings and rituals.'
    }),
    profile_history: feature({
        id: 'profile_history',
        label: 'Profile history',
        cluster: 'profile',
        primaryPath: '/profil.html',
        freeValue: 'Keep readings in one account.',
        premiumValue: 'Use history as a personalized return loop.'
    }),
    another_reading: feature({
        id: 'another_reading',
        label: 'Follow-up reading',
        cluster: 'profile',
        primaryPath: '/profil.html',
        freeValue: 'Continue from the latest reading context.',
        premiumValue: 'Unlock deeper follow-up interpretation.'
    }),
    tarot: feature({
        id: 'tarot',
        label: 'Tarot',
        cluster: 'tarot',
        primaryPath: '/tarot.html',
        freeValue: 'Draw a first card and receive a useful answer.',
        premiumValue: 'Unlock deeper spreads, context and saved history.'
    }),
    tarot_daily_card_profile_save: feature({
        id: 'tarot_daily_card_profile_save',
        label: 'Daily tarot card save',
        cluster: 'tarot',
        primaryPath: '/tarot-karta-dne.html',
        freeValue: 'Open the daily card.',
        premiumValue: 'Save the card and connect it to profile history.'
    }),
    tarot_multi_card: feature({
        id: 'tarot_multi_card',
        label: 'Multi-card tarot',
        cluster: 'tarot',
        primaryPath: '/tarot.html',
        freeValue: 'Start with a one-card answer.',
        premiumValue: 'Unlock multi-card context and next steps.'
    }),
    tarot_celtic_cross: feature({
        id: 'tarot_celtic_cross',
        label: 'Celtic cross tarot',
        cluster: 'tarot',
        primaryPath: '/tarot-keltsky-kriz.html',
        freeValue: 'Understand when the Celtic cross is useful.',
        premiumValue: 'Unlock the full deep spread.',
        recommendedPlanId: 'vip-majestrat'
    }),
    andelske_karty_hluboky_vhled: feature({
        id: 'andelske_karty_hluboky_vhled',
        label: 'Angel cards',
        cluster: 'divination',
        primaryPath: '/andelske-karty.html',
        freeValue: 'Draw an angel card.',
        premiumValue: 'Unlock deeper interpretation and saved context.'
    }),
    angel_card_deep: feature({
        id: 'angel_card_deep',
        label: 'Angel card deep reading',
        cluster: 'divination',
        primaryPath: '/andelske-karty.html',
        freeValue: 'Draw an angel card.',
        premiumValue: 'Unlock the deeper angel card reading.'
    }),
    daily_angel_card: feature({
        id: 'daily_angel_card',
        label: 'Daily angel card',
        cluster: 'divination',
        primaryPath: '/andelske-karty.html',
        freeValue: 'Open today\'s symbol.',
        premiumValue: 'Connect the daily card to a deeper reading.'
    }),
    angel_numbers: feature({
        id: 'angel_numbers',
        label: 'Angel numbers',
        cluster: 'content',
        primaryPath: '/andelske-karty.html',
        freeValue: 'Read the angel number meaning.',
        premiumValue: 'Connect the symbol to a deeper angel reading.'
    }),
    kristalova_koule: feature({
        id: 'kristalova_koule',
        label: 'Crystal ball',
        cluster: 'divination',
        primaryPath: '/kristalova-koule.html',
        freeValue: 'Ask a first symbolic question.',
        premiumValue: 'Unlock more personal questions and saved context.'
    }),
    crystal_ball_unlimited: feature({
        id: 'crystal_ball_unlimited',
        label: 'Crystal ball unlimited',
        cluster: 'divination',
        primaryPath: '/kristalova-koule.html',
        freeValue: 'Ask a limited symbolic question.',
        premiumValue: 'Unlock more questions and deeper continuity.'
    }),
    runy_hluboky_vyklad: feature({
        id: 'runy_hluboky_vyklad',
        label: 'Runes deep reading',
        cluster: 'divination',
        primaryPath: '/runy.html',
        freeValue: 'Draw a rune and take one direction.',
        premiumValue: 'Unlock deeper rune interpretation and history.'
    }),
    runes_deep_reading: feature({
        id: 'runes_deep_reading',
        label: 'Runes deep reading alias',
        cluster: 'divination',
        primaryPath: '/runy.html',
        freeValue: 'Draw a rune.',
        premiumValue: 'Unlock deeper rune interpretation.'
    }),
    shamanske_kolo_plne_cteni: feature({
        id: 'shamanske_kolo_plne_cteni',
        label: 'Shamanic wheel full reading',
        cluster: 'divination',
        primaryPath: '/shamansko-kolo.html',
        freeValue: 'Open the symbolic wheel.',
        premiumValue: 'Unlock full reading and return prompts.'
    }),
    medicine_wheel: feature({
        id: 'medicine_wheel',
        label: 'Medicine wheel',
        cluster: 'divination',
        primaryPath: '/shamansko-kolo.html',
        freeValue: 'Open the symbolic wheel.',
        premiumValue: 'Unlock full reading and continuity.'
    }),
    minuly_zivot: feature({
        id: 'minuly_zivot',
        label: 'Past life',
        cluster: 'divination',
        primaryPath: '/minuly-zivot.html',
        freeValue: 'Open a symbolic archetype story.',
        premiumValue: 'Unlock deeper reflection and saved context.'
    }),
    past_life: feature({
        id: 'past_life',
        label: 'Past life alias',
        cluster: 'divination',
        primaryPath: '/minuly-zivot.html',
        freeValue: 'Open a symbolic archetype story.',
        premiumValue: 'Unlock deeper reflection.'
    }),
    numerologie_vyklad: feature({
        id: 'numerologie_vyklad',
        label: 'Numerology reading',
        cluster: 'numerology',
        primaryPath: '/numerologie.html',
        freeValue: 'Calculate a first number and meaning.',
        premiumValue: 'Unlock cycles, timing and profile history.'
    }),
    numerology: feature({
        id: 'numerology',
        label: 'Numerology alias',
        cluster: 'numerology',
        primaryPath: '/numerologie.html',
        freeValue: 'Calculate a first number.',
        premiumValue: 'Unlock deeper numerology interpretation.'
    }),
    natalni_interpretace: feature({
        id: 'natalni_interpretace',
        label: 'Natal chart interpretation',
        cluster: 'natal',
        primaryPath: '/natalni-karta.html',
        freeValue: 'Generate the basic natal chart.',
        premiumValue: 'Unlock houses, aspects and interpretation.'
    }),
    natal_chart: feature({
        id: 'natal_chart',
        label: 'Natal chart',
        cluster: 'natal',
        primaryPath: '/natalni-karta.html',
        freeValue: 'Generate the basic natal chart.',
        premiumValue: 'Unlock deeper interpretation.'
    }),
    natalni_karta: feature({
        id: 'natalni_karta',
        label: 'Natal chart product link',
        cluster: 'natal',
        primaryPath: '/natalni-karta.html',
        freeValue: 'Generate the basic natal chart.',
        premiumValue: 'Unlock full interpretation.'
    }),
    astrocartography: feature({
        id: 'astrocartography',
        label: 'Astrocartography',
        cluster: 'natal',
        primaryPath: '/astro-mapa.html',
        freeValue: 'Preview places and map context.',
        premiumValue: 'Unlock advanced location interpretation.',
        recommendedPlanId: 'osviceni'
    }),
    partnerska_detail: feature({
        id: 'partnerska_detail',
        label: 'Relationship compatibility',
        cluster: 'relationships',
        primaryPath: '/partnerska-shoda.html',
        freeValue: 'Calculate a first compatibility score.',
        premiumValue: 'Unlock deeper dynamics and communication advice.'
    }),
    synastry: feature({
        id: 'synastry',
        label: 'Synastry',
        cluster: 'relationships',
        primaryPath: '/partnerska-shoda.html',
        freeValue: 'Calculate a first compatibility score.',
        premiumValue: 'Unlock deeper relationship interpretation.'
    }),
    compatibility: feature({
        id: 'compatibility',
        label: 'Compatibility content',
        cluster: 'relationships',
        primaryPath: '/partnerska-shoda.html',
        freeValue: 'Read compatibility context.',
        premiumValue: 'Run a personal relationship analysis.'
    }),
    mentor: feature({
        id: 'mentor',
        label: 'Star guide',
        cluster: 'mentor',
        primaryPath: '/mentor.html',
        freeValue: 'Ask a limited first question.',
        premiumValue: 'Unlock ongoing guidance and history.'
    }),
    hvezdny_mentor: feature({
        id: 'hvezdny_mentor',
        label: 'Star guide alias',
        cluster: 'mentor',
        primaryPath: '/mentor.html',
        freeValue: 'Ask a limited first question.',
        premiumValue: 'Unlock ongoing guidance.'
    }),
    mentor_unlimited: feature({
        id: 'mentor_unlimited',
        label: 'Mentor unlimited',
        cluster: 'mentor',
        primaryPath: '/mentor.html',
        freeValue: 'Ask a limited first question.',
        premiumValue: 'Unlock unlimited guidance.'
    }),
    journal_insights: feature({
        id: 'journal_insights',
        label: 'Journal insights',
        cluster: 'profile',
        primaryPath: '/profil.html',
        freeValue: 'Save a reflection.',
        premiumValue: 'Find recurring themes across journal and readings.'
    }),
    premium_membership: feature({
        id: 'premium_membership',
        label: 'Premium membership',
        cluster: 'pricing',
        primaryPath: '/cenik.html',
        freeValue: 'Compare free and paid value.',
        premiumValue: 'Unlock the recurring paid plan.'
    }),
    subscription_management: feature({
        id: 'subscription_management',
        label: 'Subscription management',
        cluster: 'pricing',
        primaryPath: '/profil.html#tab-settings',
        freeValue: 'Understand current plan state.',
        premiumValue: 'Manage active subscription safely.',
        recommendedPlanId: null,
        productId: null
    }),
    billing: feature({
        id: 'billing',
        label: 'Billing',
        cluster: 'pricing',
        primaryPath: '/profil.html#tab-settings',
        freeValue: 'Understand billing state.',
        premiumValue: 'Manage subscription safely.',
        recommendedPlanId: null,
        productId: null
    }),
    rocni_horoskop_2026: feature({
        id: 'rocni_horoskop_2026',
        label: 'Annual horoscope 2026',
        cluster: 'one_time',
        primaryPath: '/rocni-horoskop.html',
        freeValue: 'Preview the annual PDF.',
        premiumValue: 'Buy the annual PDF or bridge into Premium.',
        productId: 'rocni_horoskop_2026'
    }),
    annual_horoscope: feature({
        id: 'annual_horoscope',
        label: 'Annual horoscope',
        cluster: 'one_time',
        primaryPath: '/rocni-horoskop.html',
        freeValue: 'Preview the annual PDF.',
        premiumValue: 'Buy the annual PDF or bridge into Premium.',
        productId: 'rocni_horoskop_2026'
    }),
    rocni_horoskop: feature({
        id: 'rocni_horoskop',
        label: 'Annual horoscope alias',
        cluster: 'one_time',
        primaryPath: '/rocni-horoskop.html',
        freeValue: 'Preview the annual PDF.',
        premiumValue: 'Buy the annual PDF or bridge into Premium.',
        productId: 'rocni_horoskop_2026'
    }),
    osobni_mapa_2026: feature({
        id: 'osobni_mapa_2026',
        label: 'Personal map 2026',
        cluster: 'one_time',
        primaryPath: '/osobni-mapa.html',
        freeValue: 'Preview the personal map.',
        premiumValue: 'Buy the personal map or bridge into Premium.',
        productId: 'osobni_mapa_2026'
    }),
    personal_map: feature({
        id: 'personal_map',
        label: 'Personal map',
        cluster: 'one_time',
        primaryPath: '/osobni-mapa.html',
        freeValue: 'Preview the personal map.',
        premiumValue: 'Buy the personal map or bridge into Premium.',
        productId: 'osobni_mapa_2026'
    }),
    zodiac_signs: feature({
        id: 'zodiac_signs',
        label: 'Zodiac signs',
        cluster: 'content',
        primaryPath: '/horoskop/',
        freeValue: 'Read sign context.',
        premiumValue: 'Continue into a personal horoscope or natal chart.'
    })
});

export const FEATURE_PLAN_MAP = Object.freeze(
    Object.fromEntries(
        Object.values(FEATURE_CATALOG)
            .filter((featureConfig) => featureConfig.recommendedPlanId)
            .map((featureConfig) => [featureConfig.id, featureConfig.recommendedPlanId])
    )
);

export function getFeatureConfig(featureId) {
    return FEATURE_CATALOG[featureId] || null;
}

export function getProductConfig(productId) {
    return PRODUCT_CATALOG[productId] || null;
}

export function getPublicGrowthLoopManifest() {
    return {
        version: GROWTH_LOOP_VERSION,
        northStar: NORTH_STAR,
        trackingPayloadKeys: TRACKING_PAYLOAD_KEYS,
        funnelEvents: CORE_FUNNEL_EVENTS,
        revenueHealthEvents: REVENUE_HEALTH_EVENTS,
        features: Object.values(FEATURE_CATALOG),
        products: Object.values(PRODUCT_CATALOG)
    };
}
