/**
 * Main dashboard controller for Profile page
 */

import {
    escapeHtml,
    apiUrl,
    authHeaders,
    authHeadersWithCsrf,
    getZodiacSign,
    getZodiacIconName,
    getReadingTitle,
    loadPlanManifest,
    normalizePlanType,
    formatPlanLabel,
    getPlanPriceCzk
} from './shared.js';
import { loadReadings, showMoreReadings, handleFilterChange } from './readings.js';
import { loadFavorites } from './favorites.js';
import { toggleAvatarPicker, selectAvatar, loadSubscriptionStatus, initSettingsForm, saveSettings } from './settings.js';
import { viewReading, closeReadingModal, toggleFavoriteModal, toggleFavorite, deleteReading } from './modal.js';

const PREMIUM_ACTIVATION_KEY = 'mh_premium_activation_seen';
const SIGNUP_INTENT_KEY = 'mh_signup_intent';
const SIGNUP_INTENT_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;
let ritualMemoryViewTracked = false;
let dailyGuidanceViewTracked = false;
let activationChecklistViewTracked = false;

function trackProfileEvent(eventName, payload = {}, attemptsLeft = 12) {
    if (window.MH_ANALYTICS?.trackEvent) {
        window.MH_ANALYTICS.trackEvent(eventName, payload);
        return;
    }

    if (attemptsLeft > 0) {
        window.setTimeout(() => trackProfileEvent(eventName, payload, attemptsLeft - 1), 150);
    }
}

const PREMIUM_ACTIONS = {
    premium_monthly: [
        {
            href: '/mentor.html',
            title: 'Otevřít Hvězdného Průvodce',
            description: 'Začněte otázkou, která vás teď nejvíc táhne.'
        },
        {
            href: '/natalni-karta.html',
            title: 'Spustit natální kartu',
            description: 'Otevřete osobní mapu, ke které se dá vracet při dalších výkladech.'
        },
        {
            href: '/horoskopy.html',
            title: 'Otevřít plné horoskopy',
            description: 'Denní, týdenní i měsíční vedení už máte odemčené.'
        }
    ],
    exclusive_monthly: [
        {
            href: '/astro-mapa.html',
            title: 'Spustit astrokartografii',
            description: 'Teď dává největší smysl vyzkoušet funkci, která se právě odemkla.'
        },
        {
            href: '/mentor.html',
            title: 'Otevřít Hvězdného Průvodce',
            description: 'Použijte prioritní odpovědi rovnou na konkrétní téma.'
        },
        {
            href: '/natalni-karta.html',
            title: 'Jít hlouběji do natální karty',
            description: 'Propojte základní vhled s pokročilým výkladem.'
        }
    ],
    vip_majestrat: [
        {
            href: '/mentor.html',
            title: 'Začít VIP konzultaci',
            description: 'Začněte jednou konkrétní otázkou, aby plán hned navázal na reálné téma.'
        },
        {
            href: '/rocni-horoskop.html',
            title: 'Otevřít roční mapu',
            description: 'Využijte plán na dlouhodobý směr, ne jen jednorázový vhled.'
        },
        {
            href: '/profil.html#tab-settings',
            title: 'Dokončit nastavení profilu',
            description: 'Čím víc údajů doplníte, tím lépe na sebe navážou další výklady.'
        }
    ]
};

const ONBOARDING_SIGN_LABELS = {
    beran: { name: 'Beran', symbol: '♈' },
    byk: { name: 'Býk', symbol: '♉' },
    blizenci: { name: 'Blíženci', symbol: '♊' },
    rak: { name: 'Rak', symbol: '♋' },
    lev: { name: 'Lev', symbol: '♌' },
    panna: { name: 'Panna', symbol: '♍' },
    vahy: { name: 'Váhy', symbol: '♎' },
    stir: { name: 'Štír', symbol: '♏' },
    strelec: { name: 'Střelec', symbol: '♐' },
    kozoroh: { name: 'Kozoroh', symbol: '♑' },
    vodnar: { name: 'Vodnář', symbol: '♒' },
    ryby: { name: 'Ryby', symbol: '♓' }
};

const DAILY_FOCUS = [
    'Dnes se vyplatí zpomalit a pojmenovat, co od sebe opravdu potřebujete slyšet.',
    'Dnes má největší hodnotu první konkrétní krok, ne dokonalý plán.',
    'Dnes sledujte, kde reagujete ze zvyku a kde už můžete zvolit nový směr.',
    'Dnes pomůže jednoduchá otázka: co mi přináší klid a co jen bere energii?',
    'Dnes je dobré nechat si prostor na upřímný rozhovor nebo tiché rozhodnutí.',
    'Dnes se opřete o drobný rituál, který vrátí pozornost zpátky k sobě.',
    'Dnes si zapište jednu věc, která se opakuje. Právě tam začíná váš vzorec.'
];

const MEMORY_THEME_META = {
    relationships: {
        label: 'Vztahy',
        description: 'Blízkost, hranice a komunikace se vrací jako hlavní téma.',
        actionLabel: 'Prověřit partnerskou shodu',
        actionDescription: 'Navázat konkrétním vztahem místo obecného pocitu.',
        href: '/partnerska-shoda.html'
    },
    work: {
        label: 'Práce a směr',
        description: 'Rozhodnutí, výkon nebo profesní energie se objevují opakovaně.',
        actionLabel: 'Podívat se přes numerologii',
        actionDescription: 'Najít praktický rytmus pro další pracovní krok.',
        href: '/numerologie.html'
    },
    energy: {
        label: 'Energie',
        description: 'Tělo, únava, klid nebo přetížení potřebují jemnější vedení.',
        actionLabel: 'Otevřít dnešní horoskop',
        actionDescription: 'Začít krátkým denním kontextem pro dnešní režim.',
        href: '/horoskopy.html'
    },
    self: {
        label: 'Sebepoznání',
        description: 'Opakují se otázky identity, intuice, hranic nebo vnitřní jistoty.',
        actionLabel: 'Jít do natální karty',
        actionDescription: 'Opřít opakující se téma o osobní mapu.',
        href: '/natalni-karta.html'
    },
    timing: {
        label: 'Načasování',
        description: 'Vystupuje otázka, kdy udělat krok a kdy ještě počkat.',
        actionLabel: 'Zkontrolovat lunární rytmus',
        actionDescription: 'Dát rozhodnutí časový rámec místo tlačení na výsledek.',
        href: '/lunace.html'
    }
};

const MEMORY_TYPE_THEMES = {
    'angel': ['self'],
    'angel-card': ['self'],
    'astrocartography': ['work', 'timing'],
    'crystal': ['self'],
    'crystal-ball': ['self'],
    'daily-wisdom': ['timing'],
    'horoscope': ['timing', 'energy'],
    'medicine-wheel': ['self', 'timing'],
    'natal': ['self'],
    'natal-chart': ['self'],
    'numerology': ['work', 'self'],
    'past-life': ['self'],
    'runes': ['timing'],
    'synastry': ['relationships'],
    'tarot': ['self', 'timing']
};

const SIGNUP_INTENT_DESTINATIONS = {
    daily_guidance: {
        feature: 'daily_guidance',
        href: (sign) => buildDailyHoroscopeHref(sign, 'profile_signup_intent'),
        description: (sign) => sign
            ? `Navázat na registraci dnešním horoskopem pro ${sign.name}.`
            : 'Navázat na registraci denním horoskopem jako prvním konkrétním krokem.'
    },
    horoskopy: {
        feature: 'daily_guidance',
        href: (sign) => buildDailyHoroscopeHref(sign, 'profile_signup_intent'),
        description: (sign) => sign
            ? `Navázat na registraci horoskopem pro ${sign.name}.`
            : 'Navázat na registraci osobním horoskopem.'
    },
    tarot: {
        feature: 'tarot',
        href: () => 'tarot.html?source=profile_signup_intent&feature=tarot',
        description: () => 'Navázat na registrační záměr tarotovým výkladem.'
    },
    tarot_multi_card: {
        feature: 'tarot_multi_card',
        href: () => 'tarot.html?source=profile_signup_intent&feature=tarot_multi_card',
        description: () => 'Navázat vícekartovým tarotem na otázku, kvůli které účet vznikl.'
    },
    tarot_celtic_cross: {
        feature: 'tarot_celtic_cross',
        href: () => 'tarot-keltsky-kriz.html?source=profile_signup_intent&feature=tarot_celtic_cross',
        description: () => 'Navázat keltským křížem pro situaci, která potřebuje víc kontextu.'
    },
    daily_angel_card: {
        feature: 'daily_angel_card',
        href: () => 'andelske-karty.html?source=profile_signup_intent&feature=daily_angel_card',
        description: () => 'Vrátit se k andělské kartě, která spustila registraci.'
    },
    andelske_karty_hluboky_vhled: {
        feature: 'andelske_karty_hluboky_vhled',
        href: () => 'andelske-karty.html?source=profile_signup_intent&feature=andelske_karty_hluboky_vhled',
        description: () => 'Navázat andělskými kartami a vzít si jeden konkrétní signál.'
    },
    numerologie_vyklad: {
        feature: 'numerologie_vyklad',
        href: () => 'numerologie.html?source=profile_signup_intent&feature=numerologie_vyklad',
        description: () => 'Navázat numerologickým výkladem místo obecného prvního kroku.'
    },
    numerology: {
        feature: 'numerologie_vyklad',
        href: () => 'numerologie.html?source=profile_signup_intent&feature=numerologie_vyklad',
        description: () => 'Navázat numerologickým výkladem místo obecného prvního kroku.'
    },
    partnerska_detail: {
        feature: 'partnerska_detail',
        href: () => 'partnerska-shoda.html?source=profile_signup_intent&feature=partnerska_detail',
        description: () => 'Navázat partnerskou shodou, kvůli které účet vznikl.'
    },
    synastry: {
        feature: 'partnerska_detail',
        href: () => 'partnerska-shoda.html?source=profile_signup_intent&feature=partnerska_detail',
        description: () => 'Navázat partnerskou shodou, kvůli které účet vznikl.'
    },
    natalni_interpretace: {
        feature: 'natalni_interpretace',
        href: () => 'natalni-karta.html?source=profile_signup_intent&feature=natalni_interpretace',
        description: () => 'Navázat natální kartou jako prvním osobním vhledem.'
    },
    natal_chart: {
        feature: 'natalni_interpretace',
        href: () => 'natalni-karta.html?source=profile_signup_intent&feature=natalni_interpretace',
        description: () => 'Navázat natální kartou jako prvním osobním vhledem.'
    },
    runy_hluboky_vyklad: {
        feature: 'runy_hluboky_vyklad',
        href: () => 'runy.html?source=profile_signup_intent&feature=runy_hluboky_vyklad',
        description: () => 'Navázat runovým výkladem bez návratu do obecného menu.'
    },
    shamanske_kolo_plne_cteni: {
        feature: 'shamanske_kolo_plne_cteni',
        href: () => 'shamansko-kolo.html?source=profile_signup_intent&feature=shamanske_kolo_plne_cteni',
        description: () => 'Navázat šamanským kolem jako symbolickým směrem pro další krok.'
    },
    minuly_zivot: {
        feature: 'minuly_zivot',
        href: () => 'minuly-zivot.html?source=profile_signup_intent&feature=minuly_zivot',
        description: () => 'Navázat symbolickým výkladem minulého života, kvůli kterému účet vznikl.'
    },
    past_life: {
        feature: 'minuly_zivot',
        href: () => 'minuly-zivot.html?source=profile_signup_intent&feature=minuly_zivot',
        description: () => 'Navázat symbolickým výkladem minulého života, kvůli kterému účet vznikl.'
    },
    kristalova_koule: {
        feature: 'kristalova_koule',
        href: () => 'kristalova-koule.html?source=profile_signup_intent&feature=kristalova_koule',
        description: () => 'Navázat otázkou do křišťálové koule.'
    },
    crystal_ball_unlimited: {
        feature: 'kristalova_koule',
        href: () => 'kristalova-koule.html?source=profile_signup_intent&feature=kristalova_koule',
        description: () => 'Navázat otázkou do křišťálové koule.'
    },
    mentor: {
        feature: 'mentor',
        href: () => 'mentor.html?source=profile_signup_intent&feature=mentor',
        description: () => 'Navázat první otázkou pro Hvězdného průvodce.'
    },
    hvezdny_mentor: {
        feature: 'mentor',
        href: () => 'mentor.html?source=profile_signup_intent&feature=mentor',
        description: () => 'Navázat první otázkou pro Hvězdného průvodce.'
    }
};

const MEMORY_JOURNAL_KEYWORDS = {
    relationships: ['vztah', 'partner', 'laska', 'rodin', 'blizk', 'komunik'],
    work: ['prace', 'projekt', 'karier', 'penize', 'tym', 'klient', 'ukol'],
    energy: ['energie', 'unav', 'spanek', 'telo', 'klid', 'stres', 'vycerp'],
    self: ['hranice', 'pocit', 'intuic', 'strach', 'duver', 'sebe', 'jistot'],
    timing: ['cas', 'dnes', 'zitra', 'cek', 'rozhod', 'krok', 'termin']
};

function setProfileBlockVisible(element, visible) {
    if (!element) return;
    element.hidden = !visible;
    element.classList.toggle('profile-block-visible', visible);
}

function initTabs() {
    const tabs = document.querySelectorAll('.tab[data-tab], .profile-tab[data-tab]');
    const contents = document.querySelectorAll('.tab-content');

    contents.forEach(content => {
        const isActive = content.classList.contains('active');
        content.classList.toggle('is-active', isActive);
        content.hidden = !isActive;
    });

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetId = tab.dataset.tab;

            tabs.forEach(t => {
                t.classList.remove('active');
                t.setAttribute('aria-selected', 'false');
            });
            tab.classList.add('active');
            tab.setAttribute('aria-selected', 'true');

            contents.forEach(c => {
                const isTarget = c.id === `tab-${targetId}`;
                c.classList.toggle('active', isTarget);
                c.classList.toggle('is-active', isTarget);
                c.hidden = !isTarget;
            });

            if (targetId === 'favorites') {
                loadFavorites();
            }
        });
    });
}

function openProfileTab(tabId) {
    const tab = document.querySelector(`.profile-tab[data-tab="${tabId}"]`);
    tab?.click();
    document.getElementById(`tab-${tabId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function sanitizeProfileUrl(url) {
    const parsed = new URL(url, window.location.origin);
    parsed.searchParams.delete('payment');
    parsed.searchParams.delete('plan');
    parsed.searchParams.delete('session_id');
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}

function handlePaymentReturnState() {
    const params = new URLSearchParams(window.location.search);
    const paymentState = params.get('payment');

    if (!paymentState) {
        return;
    }

    if (paymentState === 'success') {
        const planId = params.get('plan') || null;
        const sessionId = params.get('session_id') || null;
        window.MH_ANALYTICS?.trackPaymentResult?.('success', {
            source: 'profile_return',
            plan_id: planId,
            session_id: sessionId
        });
        window.MH_ANALYTICS?.trackPurchaseCompleted?.(planId || 'subscription', getPlanPriceCzk(planId) || null, 'CZK', {
            product_type: 'subscription',
            transaction_id: sessionId,
            source: 'profile_return'
        });
        openProfileTab('settings');
        setTimeout(() => {
            document.getElementById('subscription-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 150);
        window.Auth?.showToast?.(
            'Platba proběhla úspěšně',
            'Předplatné je aktivní. Správu svého plánu najdete níže v nastavení účtu.',
            'success'
        );
    }

    history.replaceState({}, document.title, sanitizeProfileUrl(window.location.href));
}

function getActivationStorageKey(planType) {
    return `${PREMIUM_ACTIVATION_KEY}:${planType || 'free'}`;
}

function hasSeenActivation(planType) {
    return localStorage.getItem(getActivationStorageKey(planType)) === '1';
}

function markActivationSeen(planType) {
    localStorage.setItem(getActivationStorageKey(planType), '1');
}

function renderPremiumActivation(sub, user) {
    const card = document.getElementById('premium-activation-card');
    const titleEl = document.getElementById('premium-activation-title');
    const copyEl = document.getElementById('premium-activation-copy');
    const badgeEl = document.getElementById('premium-activation-badge');
    const actionsEl = document.getElementById('premium-activation-actions');
    const dismissBtn = document.getElementById('premium-activation-dismiss');

    if (!card || !titleEl || !copyEl || !badgeEl || !actionsEl || !dismissBtn || !sub) {
        return;
    }

    const planType = normalizePlanType(sub.planType);
    const isPremium = planType !== 'free';
    const paymentState = new URLSearchParams(window.location.search).get('payment');
    const shouldForceShow = paymentState === 'success';

    if (!isPremium) {
        setProfileBlockVisible(card, false);
        return;
    }

    if (!shouldForceShow && hasSeenActivation(planType)) {
        setProfileBlockVisible(card, false);
        return;
    }

    const displayName = user?.first_name || user?.email?.split('@')[0] || 'poutníku';
    const titleMap = {
        premium_monthly: `Vítejte v Hvězdném Průvodci, ${displayName}`,
        exclusive_monthly: `Odemkli jste Osvícení, ${displayName}`,
        vip_majestrat: `VIP Majestrát je aktivní, ${displayName}`
    };
    const copyMap = {
        premium_monthly: 'Největší šance na návrat je udělat teď první plný výklad. Začněte jedním z kroků níže.',
        exclusive_monthly: 'Právě jste odemkli pokročilé nástroje. Největší hodnotu teď přinese vyzkoušet funkci, kterou free plán neuměl.',
        vip_majestrat: 'Máte nejvyšší plán. Udělejte teď první krok, který z něj vytvoří každodenní oporu, ne jen aktivní členství.'
    };
    const badgeMap = {
        premium_monthly: 'Premium aktivní',
        exclusive_monthly: 'Osvícení aktivní',
        vip_majestrat: 'VIP aktivní'
    };

    titleEl.textContent = titleMap[planType] || 'Vítejte v Premium';
    copyEl.textContent = copyMap[planType] || 'Právě jste odemkli plné výklady a osobní vedení.';
    badgeEl.textContent = badgeMap[planType] || 'Premium aktivní';

    const actions = PREMIUM_ACTIONS[planType] || PREMIUM_ACTIONS.premium_monthly;
    actionsEl.innerHTML = actions.map((action) => `
        <a href="${action.href}" class="card glass-card premium-activation-action" data-activation-target="${action.href}">
            <strong class="premium-activation-action__title">${action.title}</strong>
            <span class="premium-activation-action__description">${action.description}</span>
        </a>
    `).join('');

    setProfileBlockVisible(card, true);
    card.dataset.planType = planType;
    card.dataset.source = paymentState === 'success' ? 'payment_return' : 'profile';

    if (!card.dataset.bound) {
        dismissBtn.addEventListener('click', () => {
            const activePlanType = card.dataset.planType || planType;
            const activeSource = card.dataset.source || 'profile';
            markActivationSeen(activePlanType);
            setProfileBlockVisible(card, false);
            trackProfileEvent('premium_activation_dismissed', {
                plan_type: activePlanType,
                source: activeSource
            });
        });

        actionsEl.addEventListener('click', (event) => {
            const link = event.target.closest('[data-activation-target]');
            if (!link) return;

            const activePlanType = card.dataset.planType || planType;
            const activeSource = card.dataset.source || 'profile';
            markActivationSeen(activePlanType);
            window.MH_ANALYTICS?.trackCTA?.('premium_activation_action', {
                destination: link.getAttribute('href'),
                plan_id: activePlanType,
                source: activeSource
            });
        });

        card.dataset.bound = 'true';
    }

    trackProfileEvent('premium_activation_shown', {
        plan_type: planType,
        source: paymentState === 'success' ? 'payment_return' : 'profile'
    });

    if (shouldForceShow) {
        markActivationSeen(planType);
    }
}

function handleLogout() {
    if (confirm('Opravdu se chcete odhlásit?')) {
        window.Auth?.logout();
    }
}

function calculateStreak(readings) {
    if (!readings || !readings.length) return 0;

    const dates = readings.map(r => new Date(r.created_at).toDateString());
    const uniqueDates = [...new Set(dates)].sort((a, b) => new Date(b) - new Date(a));

    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    if (uniqueDates[0] !== today && uniqueDates[0] !== yesterday) {
        return 0;
    }

    let streak = 0;
    let checkDate = new Date(uniqueDates[0]);

    for (const dateStr of uniqueDates) {
        if (new Date(dateStr).toDateString() === checkDate.toDateString()) {
            streak++;
            checkDate = new Date(checkDate.getTime() - 86400000);
        } else {
            break;
        }
    }

    return streak;
}

function isPremiumSubscription(sub) {
    const planType = normalizePlanType(sub?.planType);
    const activeStatuses = ['active', 'trialing', 'cancel_pending'];
    return planType !== 'free' && activeStatuses.includes(sub?.status || 'active');
}

function getSavedOnboardingSign() {
    try {
        const saved = localStorage.getItem('mh_zodiac');
        return saved && ONBOARDING_SIGN_LABELS[saved]
            ? { ...ONBOARDING_SIGN_LABELS[saved], slug: saved }
            : null;
    } catch (e) {
        return null;
    }
}

function getProfileSign(user) {
    if (user?.birth_date) {
        const sign = getZodiacSign(user.birth_date) || getZodiacSignLocal(user.birth_date);
        if (sign?.name) {
            const slug = Object.entries(ONBOARDING_SIGN_LABELS)
                .find(([, value]) => value.name === sign.name)?.[0] || null;
            return { ...sign, slug };
        }
    }

    return getSavedOnboardingSign();
}

function getReadingKinds(readings) {
    return new Set((readings || []).map(reading => reading.type));
}

function buildDailyHoroscopeHref(sign, source = 'profile_daily') {
    const url = new URL('/horoskopy.html', window.location.origin);
    url.searchParams.set('source', source);
    url.searchParams.set('feature', 'daily_guidance');

    if (sign?.slug) {
        url.searchParams.set('sign', sign.slug);
        url.hash = sign.slug;
    }

    const relativeUrl = `${url.pathname}${url.search}${url.hash}`;
    return relativeUrl.startsWith('/') ? relativeUrl.slice(1) : relativeUrl;
}

function readSignupIntent() {
    try {
        const intent = JSON.parse(localStorage.getItem(SIGNUP_INTENT_KEY) || 'null');
        if (!intent || typeof intent !== 'object') return null;

        const createdAt = Number(intent.createdAt || 0);
        if (createdAt && Date.now() - createdAt > SIGNUP_INTENT_MAX_AGE_MS) {
            localStorage.removeItem(SIGNUP_INTENT_KEY);
            return null;
        }

        return intent;
    } catch {
        localStorage.removeItem(SIGNUP_INTENT_KEY);
        return null;
    }
}

function addSignupIntentAttribution(href, intent, fallbackFeature) {
    const url = new URL(href, window.location.origin);
    url.searchParams.set('source', 'profile_signup_intent');
    url.searchParams.set('feature', fallbackFeature || intent?.feature || 'daily_guidance');

    if (intent?.source) {
        url.searchParams.set('entry_source', intent.source);
    }

    if (intent?.feature) {
        url.searchParams.set('entry_feature', intent.feature);
    }

    const relativeUrl = `${url.pathname}${url.search}${url.hash}`;
    return relativeUrl.startsWith('/') ? relativeUrl.slice(1) : relativeUrl;
}

function getSignupIntentDestination(sign) {
    const intent = readSignupIntent();
    const config = intent?.feature ? SIGNUP_INTENT_DESTINATIONS[intent.feature] : null;
    if (!config) return null;

    return {
        href: addSignupIntentAttribution(config.href(sign), intent, config.feature),
        description: config.description(sign),
        feature: config.feature
    };
}

function getLastReadingLabel(readings) {
    if (!readings?.length) return 'Zatím žádný uložený výklad';

    const latest = [...readings].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
    const date = new Date(latest.created_at);
    return `${date.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long' })} · ${getReadingTitle(latest.type)}`;
}

function getValidReadingDate(reading) {
    const date = new Date(reading?.created_at);
    return Number.isNaN(date.getTime()) ? null : date;
}

function isSameLocalDay(a, b) {
    if (!a || !b) return false;
    return a.getFullYear() === b.getFullYear()
        && a.getMonth() === b.getMonth()
        && a.getDate() === b.getDate();
}

function normalizeMemoryText(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}

function getReadingFeedback(reading) {
    const feedback = reading?.data?.feedback;
    if (!feedback || typeof feedback !== 'object' || Array.isArray(feedback)) return null;
    return feedback;
}

function addThemeSignal(themeScores, themeKey, score = 1) {
    if (!MEMORY_THEME_META[themeKey]) return;
    themeScores.set(themeKey, (themeScores.get(themeKey) || 0) + score);
}

function collectRitualMemorySignals(readings, now = new Date()) {
    const safeReadings = Array.isArray(readings) ? readings : [];
    const themeScores = new Map();
    const journals = [];
    const structuredReadings = [];
    const feedbackEntries = [];

    safeReadings.forEach(reading => {
        const type = reading?.type;

        if (type === 'journal') {
            journals.push(reading);
            const journalText = normalizeMemoryText(reading.data);
            Object.entries(MEMORY_JOURNAL_KEYWORDS).forEach(([themeKey, keywords]) => {
                if (keywords.some(keyword => journalText.includes(keyword))) {
                    addThemeSignal(themeScores, themeKey, 1.5);
                }
            });
            return;
        }

        structuredReadings.push(reading);
        (MEMORY_TYPE_THEMES[type] || []).forEach(themeKey => addThemeSignal(themeScores, themeKey, 1));

        const feedback = getReadingFeedback(reading);
        if (feedback) {
            feedbackEntries.push({ reading, feedback });
            if (feedback.focus) addThemeSignal(themeScores, feedback.focus, 3);
        }
    });

    const sortByDateDesc = (a, b) => (getValidReadingDate(b)?.getTime() || 0) - (getValidReadingDate(a)?.getTime() || 0);
    const themes = Array.from(themeScores.entries())
        .map(([key, score]) => ({ key, score, ...MEMORY_THEME_META[key] }))
        .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label, 'cs'));

    const todayJournal = journals.some(reading => isSameLocalDay(getValidReadingDate(reading), now));
    const totalSignals = structuredReadings.length + journals.length + feedbackEntries.length;
    const strengthLabel = feedbackEntries.length >= 2 || totalSignals >= 6
        ? 'Silná stopa'
        : totalSignals >= 2 ? 'Roste' : 'Nové';

    return {
        totalReadings: safeReadings.length,
        structuredCount: structuredReadings.length,
        journalCount: journals.length,
        feedbackCount: feedbackEntries.length,
        todayJournal,
        themes,
        topTheme: themes[0] || null,
        lastReading: [...structuredReadings].sort(sortByDateDesc)[0] || null,
        lastJournal: [...journals].sort(sortByDateDesc)[0] || null,
        lastFeedback: feedbackEntries.sort((a, b) => sortByDateDesc(a.reading, b.reading))[0] || null,
        strengthLabel
    };
}

function buildMemoryFeatureHref(themeKey) {
    const theme = MEMORY_THEME_META[themeKey];
    if (!theme?.href) return 'horoskopy.html?source=profile_memory&feature=ritual_memory';

    const url = new URL(theme.href, window.location.origin);
    url.searchParams.set('source', 'profile_memory');
    url.searchParams.set('feature', themeKey);
    const relativeUrl = `${url.pathname}${url.search}${url.hash}`;
    return relativeUrl.startsWith('/') ? relativeUrl.slice(1) : relativeUrl;
}

function buildRitualMemoryCopy(memory) {
    if (!memory.totalReadings) {
        return 'Paměť začne fungovat po prvním uloženém výkladu nebo večerní reflexi. Cílem není další archiv, ale návrat k tomu, co se v čase opravdu opakuje.';
    }

    if (!memory.topTheme) {
        return `Máte uložených ${memory.totalReadings} stop. Přidejte k výkladům zpětnou vazbu nebo večerní reflexi a paměť začne rozlišovat, které téma se vrací nejčastěji.`;
    }

    const signalSource = memory.feedbackCount
        ? 'zpětné vazby, výkladů a reflexí'
        : 'uložených výkladů a reflexí';

    return `Z ${memory.totalReadings} uložených stop nejvíc vystupuje téma ${memory.topTheme.label.toLowerCase()}. Je to pracovní hypotéza z ${signalSource}, ne diagnóza ani osud. Další krok má téma zpřesnit.`;
}

function getMemoryMeterBucket(score, topScore) {
    const ratio = topScore > 0 ? score / topScore : 0;
    if (ratio >= 0.92) return 100;
    if (ratio >= 0.78) return 85;
    if (ratio >= 0.62) return 70;
    if (ratio >= 0.48) return 55;
    if (ratio >= 0.34) return 40;
    if (ratio >= 0.2) return 25;
    return 18;
}

function renderRitualMemory(user, readings, subscription) {
    const titleEl = document.getElementById('ritual-memory-title');
    const strengthEl = document.getElementById('ritual-memory-strength');
    const copyEl = document.getElementById('ritual-memory-copy');
    const themesEl = document.getElementById('ritual-memory-themes');
    const actionsEl = document.getElementById('ritual-memory-actions');

    if (!titleEl || !strengthEl || !copyEl || !themesEl || !actionsEl) return;

    const memory = collectRitualMemorySignals(readings);
    const planType = normalizePlanType(subscription?.planType || user?.subscription_status);
    const isPremium = isPremiumSubscription(subscription) || ['premium_monthly', 'exclusive_monthly', 'vip_majestrat'].includes(planType);
    const topScore = memory.topTheme?.score || 1;

    titleEl.textContent = memory.topTheme
        ? `Co se ti opakuje: ${memory.topTheme.label}`
        : 'Co se ti opakuje';
    strengthEl.textContent = memory.strengthLabel;
    strengthEl.className = `badge ${memory.strengthLabel === 'Silná stopa' ? 'badge--premium' : 'badge--secondary'}`;
    copyEl.textContent = buildRitualMemoryCopy(memory);

    if (memory.themes.length) {
        themesEl.innerHTML = memory.themes.slice(0, 3).map(theme => {
            const meterBucket = getMemoryMeterBucket(theme.score, topScore);
            return `
                <div class="ritual-memory-theme" data-memory-theme="${theme.key}">
                    <strong>${escapeHtml(theme.label)}</strong>
                    <span>${escapeHtml(theme.description)}</span>
                    <div class="ritual-memory-theme__meter" aria-hidden="true"><span class="ritual-memory-theme__meter-fill ritual-memory-theme__meter-fill--${meterBucket}"></span></div>
                </div>
            `;
        }).join('');
    } else {
        themesEl.innerHTML = `
            <div class="ritual-memory-theme">
                <strong>Ještě sbíráme signály</strong>
                <span>Stačí první výklad, jedna reflexe nebo zpětná vazba. Pak se tu začne ukazovat návratový vzorec.</span>
                <div class="ritual-memory-theme__meter" aria-hidden="true"><span class="ritual-memory-theme__meter-fill ritual-memory-theme__meter-fill--18"></span></div>
            </div>
        `;
    }

    const actions = [];

    if (!memory.totalReadings) {
        actions.push({
            href: 'tarot.html?source=profile_memory&feature=ritual_memory',
            label: 'Uložit první výklad',
            description: 'Paměť začne pracovat ve chvíli, kdy má první stopu.',
            action: 'memory_first_reading',
            primary: true
        });
        actions.push({
            href: buildDailyHoroscopeHref(getProfileSign(user), 'profile_memory'),
            label: 'Začít dnešním směrem',
            description: 'Krátký denní kontext je nejrychlejší vstup do rituálu.',
            action: 'memory_daily_guidance'
        });
    } else {
        if (!memory.todayJournal) {
            actions.push({
                href: '#journal-input',
                label: 'Dopsat dnešní reflexi',
                description: 'Jedna věta večer stačí, aby se vzorec zítra neztratil.',
                action: 'memory_journal',
                primary: true
            });
        }

        if (memory.topTheme) {
            actions.push({
                href: buildMemoryFeatureHref(memory.topTheme.key),
                label: memory.topTheme.actionLabel,
                description: memory.topTheme.actionDescription,
                action: 'memory_theme',
                theme: memory.topTheme.key,
                primary: memory.todayJournal
            });
        }

        actions.push({
            href: '#tab-history',
            label: 'Projít historii',
            description: 'Zkontrolovat poslední výklady a zpětnou vazbu v jednom místě.',
            action: 'memory_history'
        });
    }

    if (!isPremium && memory.totalReadings >= 2) {
        actions.push({
            href: 'cenik.html?source=profile_memory&feature=ritual_memory',
            label: 'Odemknout hlubší paměť',
            description: 'Dává smysl ve chvíli, kdy už se k tématům pravidelně vracíte.',
            action: 'memory_upgrade'
        });
    }

    actionsEl.innerHTML = actions.map(action => `
        <a href="${action.href}" class="ritual-memory-action ${action.primary ? 'ritual-memory-action--primary' : ''}" data-memory-action="${action.action}" data-memory-theme="${action.theme || ''}">
            <strong>${escapeHtml(action.label)}</strong>
            <span>${escapeHtml(action.description)}</span>
        </a>
    `).join('');

    if (!ritualMemoryViewTracked) {
        ritualMemoryViewTracked = true;
        trackProfileEvent('profile_ritual_memory_viewed', {
            plan_type: planType,
            reading_count: memory.totalReadings,
            journal_count: memory.journalCount,
            feedback_count: memory.feedbackCount,
            top_theme: memory.topTheme?.key || null,
            has_today_journal: memory.todayJournal,
            strength: memory.strengthLabel
        });
    }
}

function renderDailyGuidance(user, readings, subscription) {
    const titleEl = document.getElementById('daily-guidance-title');
    const dateEl = document.getElementById('daily-guidance-date');
    const planEl = document.getElementById('daily-guidance-plan');
    const copyEl = document.getElementById('daily-guidance-copy');
    const focusEl = document.getElementById('daily-guidance-focus');
    const actionsEl = document.getElementById('daily-guidance-actions');

    if (!titleEl || !dateEl || !planEl || !copyEl || !focusEl || !actionsEl) return;

    const now = new Date();
    const sign = getProfileSign(user);
    const planType = normalizePlanType(subscription?.planType || user?.subscription_status);
    const isPremium = isPremiumSubscription(subscription) || ['premium_monthly', 'exclusive_monthly', 'vip_majestrat'].includes(planType);
    const readingKinds = getReadingKinds(readings);
    const dateLabel = now.toLocaleDateString('cs-CZ', { weekday: 'long', day: 'numeric', month: 'long' });
    const focus = DAILY_FOCUS[now.getDay()];

    dateEl.textContent = dateLabel;
    planEl.textContent = formatPlanLabel(planType);
    planEl.className = `badge ${isPremium ? 'badge--premium' : 'badge--secondary'}`;
    titleEl.textContent = sign
        ? `Dnešní směr pro znamení ${sign.name}`
        : 'Dnešní směr čeká na doplnění profilu';

    copyEl.textContent = sign
        ? `Máte připravený denní rituál podle svého profilu. Poslední stopa v historii: ${getLastReadingLabel(readings)}.`
        : 'Doplňte znamení nebo datum narození a denní přehled začne dávat přesnější osobní kontext.';

    focusEl.textContent = focus;

    const horoscopeHref = buildDailyHoroscopeHref(sign);
    const actions = [
        {
            href: horoscopeHref,
            label: 'Otevřít dnešní horoskop',
            description: sign ? `Denní vedení pro ${sign.name}.` : 'Nejrychlejší vstup do dnešního směru.',
            action: 'daily_horoscope',
            primary: true
        },
        {
            href: 'tarot.html?source=profile_daily&feature=tarot',
            label: readingKinds.has('tarot') ? 'Navázat dalším tarotem' : 'Vyložit kartu dne',
            description: 'Jeden symbol pro rozhodnutí, které máte před sebou.',
            action: 'daily_tarot'
        },
        {
            href: '#journal-input',
            label: 'Zapsat večerní reflexi',
            description: 'Zachytíte vzorec dřív, než z něj bude další opakování.',
            action: 'daily_journal'
        }
    ];

    if (!isPremium) {
        actions.push({
            href: 'cenik.html?source=profile_daily&feature=daily_guidance',
            label: 'Odemknout hlubší vedení',
            description: 'Plné výklady, historie a týdenní mapa v jednom plánu.',
            action: 'daily_upgrade'
        });
    }

    actionsEl.innerHTML = actions.map(action => `
        <a href="${action.href}" class="daily-guidance-action ${action.primary ? 'daily-guidance-action--primary' : ''}" data-daily-action="${action.action}">
            <strong>${escapeHtml(action.label)}</strong>
            <span>${escapeHtml(action.description)}</span>
        </a>
    `).join('');

    if (!dailyGuidanceViewTracked) {
        dailyGuidanceViewTracked = true;
        trackProfileEvent('profile_daily_guidance_viewed', {
            plan_type: planType,
            has_sign: Boolean(sign),
            reading_count: readings?.length || 0
        });
    }
}

function renderActivationChecklist(user, readings, subscription) {
    const labelEl = document.getElementById('activation-progress-label');
    const barEl = document.getElementById('activation-progress-bar');
    const itemsEl = document.getElementById('activation-checklist-items');
    if (!labelEl || !barEl || !itemsEl) return;

    const kinds = getReadingKinds(readings);
    const sign = getProfileSign(user);
    const streak = calculateStreak(readings);
    const isPremium = isPremiumSubscription(subscription);
    const signupIntentDestination = kinds.size ? null : getSignupIntentDestination(sign);
    const firstReadingHref = signupIntentDestination?.href || (sign
        ? buildDailyHoroscopeHref(sign, 'profile_activation')
        : 'tarot.html?source=profile_activation&feature=tarot');
    const firstReadingDescription = kinds.size
        ? 'Už máte první stopu, ke které se dá vracet.'
        : sign
            ? `Začněte dnešním horoskopem pro ${sign.name}, ať první krok naváže na profil.`
            : 'Vyberte první konkrétní krok: tarot, horoskop nebo otázku pro křišťálovou kouli.';

    const effectiveFirstReadingDescription = signupIntentDestination?.description || firstReadingDescription;

    const items = [
        {
            key: 'account_created',
            title: 'Účet je vytvořený',
            description: 'Základ osobního prostoru je připravený.',
            done: true,
            href: '#profile-dashboard'
        },
        {
            key: 'profile_personalized',
            title: 'Osobní profil je doplněný',
            description: sign ? `Dnešní vedení se může opřít o znamení ${sign.name}.` : 'Doplňte datum narození nebo znamení pro přesnější návraty.',
            done: Boolean(sign),
            href: sign ? '#tab-settings' : 'onboarding.html?source=profile_activation&feature=daily_guidance',
            action: sign ? 'open_settings' : 'start_onboarding'
        },
        {
            key: 'first_reading',
            title: 'První výklad je v historii',
            description: effectiveFirstReadingDescription,
            done: kinds.size > 0,
            href: kinds.size > 0 ? '#tab-history' : firstReadingHref,
            action: kinds.size > 0 ? 'open_history' : signupIntentDestination ? 'start_signup_intent' : sign ? 'start_daily_horoscope' : 'start_tarot'
        },
        {
            key: 'daily_reflection',
            title: 'Vzniká návratový rituál',
            description: streak > 1 ? `Aktuální série: ${streak} dny.` : 'Zapište si večerní reflexi nebo se vraťte zítra pro další výklad.',
            done: streak > 1 || kinds.has('journal'),
            href: '#journal-input',
            action: 'focus_journal'
        },
        {
            key: 'premium_depth',
            title: 'Hlubší vedení je odemčené',
            description: isPremium ? 'Plné výklady a osobní historie jsou aktivní.' : 'Premium dává smysl ve chvíli, kdy se chcete vracet pravidelně.',
            done: isPremium,
            href: isPremium ? '#daily-guidance-card' : 'cenik.html?source=profile_activation&feature=daily_guidance',
            action: isPremium ? 'daily_guidance' : 'upgrade'
        }
    ];

    const completed = items.filter(item => item.done).length;
    labelEl.textContent = `${completed}/${items.length}`;
    barEl.className = `activation-progress__bar activation-progress__bar--${completed}`;

    itemsEl.innerHTML = items.map(item => `
        <a href="${item.href}" class="activation-checklist-item ${item.done ? 'activation-checklist-item--done' : ''}" data-activation-step="${item.key}" data-activation-action="${item.action || ''}" data-completed="${item.done ? 'true' : 'false'}">
            <span class="activation-checklist-item__status">${item.done ? '✓' : '•'}</span>
            <span class="activation-checklist-item__body">
                <strong>${escapeHtml(item.title)}</strong>
                <span>${escapeHtml(item.description)}</span>
            </span>
        </a>
    `).join('');

    if (!activationChecklistViewTracked) {
        activationChecklistViewTracked = true;
        trackProfileEvent('profile_activation_checklist_viewed', {
            completed_steps: completed,
            total_steps: items.length,
            activated: completed >= 3
        });
    }
}

function focusJournalInput() {
    const input = document.getElementById('journal-input');
    if (!input) return;

    input.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => input.focus(), 250);
}

function handleDailyGuidanceClick(event) {
    const link = event.target.closest('[data-daily-action]');
    if (!link) return;

    const action = link.dataset.dailyAction;
    const destination = link.getAttribute('href');

    window.MH_ANALYTICS?.trackCTA?.('profile_daily_guidance', {
        action,
        destination
    });

    if (action === 'daily_journal') {
        event.preventDefault();
        focusJournalInput();
    }
}

function handleActivationChecklistClick(event) {
    const link = event.target.closest('[data-activation-step]');
    if (!link) return;

    const action = link.dataset.activationAction;
    const step = link.dataset.activationStep;
    const completed = link.dataset.completed === 'true';

    window.MH_ANALYTICS?.trackCTA?.('profile_activation_checklist', {
        step,
        action,
        completed,
        destination: link.getAttribute('href')
    });

    if (action === 'open_settings') {
        event.preventDefault();
        openProfileTab('settings');
        document.getElementById('settings-name')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
    }

    if (action === 'open_history') {
        event.preventDefault();
        openProfileTab('history');
        return;
    }

    if (action === 'focus_journal') {
        event.preventDefault();
        focusJournalInput();
        return;
    }

    if (action === 'daily_guidance') {
        event.preventDefault();
        document.getElementById('daily-guidance-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

function handleRitualMemoryClick(event) {
    const link = event.target.closest('[data-memory-action]');
    if (!link) return;

    const action = link.dataset.memoryAction;
    const destination = link.getAttribute('href');

    window.MH_ANALYTICS?.trackCTA?.('profile_ritual_memory', {
        action,
        theme: link.dataset.memoryTheme || null,
        destination
    });

    if (action === 'memory_journal') {
        event.preventDefault();
        focusJournalInput();
        return;
    }

    if (action === 'memory_history') {
        event.preventDefault();
        openProfileTab('history');
    }
}

function animateCounter(elementId, target) {
    const el = document.getElementById(elementId);
    if (!el) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        el.textContent = target;
        return;
    }

    const duration = 1000;
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(target * eased);

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }

    requestAnimationFrame(update);
}

function updateStats(readings) {
    const safeReadings = readings || [];
    const total = safeReadings.length;
    const now = new Date();
    const thisMonth = safeReadings.filter(r => {
        const date = new Date(r.created_at);
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).length;

    const favorites = safeReadings.filter(r => r.is_favorite).length;
    const streak = calculateStreak(safeReadings);

    animateCounter('stat-total', total);
    animateCounter('stat-month', thisMonth);
    animateCounter('stat-favorites', favorites);
    animateCounter('stat-streak', streak);
}

function getZodiacSignLocal(dateStr) {
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return null;

    const month = date.getMonth() + 1;
    const day = date.getDate();

    const signs = [
        { name: 'Kozoroh', symbol: '♑', start: [1, 1], end: [1, 19] },
        { name: 'Vodnář', symbol: '♒', start: [1, 20], end: [2, 18] },
        { name: 'Ryby', symbol: '♓', start: [2, 19], end: [3, 20] },
        { name: 'Beran', symbol: '♈', start: [3, 21], end: [4, 19] },
        { name: 'Býk', symbol: '♉', start: [4, 20], end: [5, 20] },
        { name: 'Blíženci', symbol: '♊', start: [5, 21], end: [6, 20] },
        { name: 'Rak', symbol: '♋', start: [6, 21], end: [7, 22] },
        { name: 'Lev', symbol: '♌', start: [7, 23], end: [8, 22] },
        { name: 'Panna', symbol: '♍', start: [8, 23], end: [9, 22] },
        { name: 'Váhy', symbol: '♎', start: [9, 23], end: [10, 22] },
        { name: 'Štír', symbol: '♏', start: [10, 23], end: [11, 21] },
        { name: 'Střelec', symbol: '♐', start: [11, 22], end: [12, 21] },
        { name: 'Kozoroh', symbol: '♑', start: [12, 22], end: [12, 31] }
    ];

    for (const sign of signs) {
        const [sm, sd] = sign.start;
        const [em, ed] = sign.end;
        if ((month === sm && day >= sd) || (month === em && day <= ed)) {
            return sign;
        }
    }

    return null;
}

function showZodiacSignLocal(birthDate) {
    const zodiacEl = document.getElementById('user-zodiac');
    if (!zodiacEl) return;

    const sign = getZodiacSignLocal(birthDate);
    if (sign) {
        zodiacEl.textContent = `${sign.symbol} ${sign.name}`;
        setProfileBlockVisible(zodiacEl, true);
    }
}

function renderJournalEntries(readings) {
    const container = document.getElementById('journal-entries');
    if (!container) return;

    const entries = (readings || [])
        .filter(r => r.type === 'journal')
        .slice(0, 5);

    if (entries.length === 0) {
        container.innerHTML = '<p class="journal-empty">Zatím prázdno...</p>';
        return;
    }

    container.innerHTML = entries.map(e => `
        <div class="journal-entry">
            <span class="journal-entry__date">${new Date(e.created_at).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long' })}</span>
            <p class="journal-entry__text">${escapeHtml(e.data)}</p>
        </div>
    `).join('');
}

let listenersAttached = false;

async function handleReadingListInteraction(event) {
    const actionButton = event.target.closest('[data-reading-action]');
    if (actionButton) {
        event.preventDefault();
        event.stopPropagation();

        const id = actionButton.dataset.readingId;
        if (!id) return;

        if (actionButton.dataset.readingAction === 'favorite') {
            await toggleFavorite(id, actionButton);
        } else if (actionButton.dataset.readingAction === 'view') {
            await viewReading(id);
        }
        return;
    }

    const card = event.target.closest('[data-reading-id]');
    if (card && event.currentTarget.contains(card)) {
        await viewReading(card.dataset.readingId);
    }
}

function handleReadingListKeyboard(event) {
    if (event.key !== 'Enter' && event.key !== ' ') return;

    const card = event.target.closest('[data-reading-id]');
    if (!card || !event.currentTarget.contains(card)) return;

    event.preventDefault();
    viewReading(card.dataset.readingId);
}

async function initProfile() {
    let retries = 0;
    while (!window.Auth && retries < 20) {
        await new Promise(r => setTimeout(r, 100));
        retries++;
    }

    const user = window.Auth?.user;
    const isLoggedIn = window.Auth?.isLoggedIn();

    const loginRequired = document.getElementById('login-required');
    const dashboard = document.getElementById('profile-dashboard');
    const greeting = document.getElementById('profile-greeting');

    if (!isLoggedIn) {
        setProfileBlockVisible(loginRequired, true);
        setProfileBlockVisible(dashboard, false);
        if (greeting) greeting.textContent = 'Přihlaste se pro zobrazení vašeho profilu';

        const loginBtn = document.getElementById('profile-login-btn');
        if (loginBtn && !loginBtn.dataset.listenerAttached) {
            loginBtn.addEventListener('click', () => {
                window.location.href = 'prihlaseni.html?redirect=/profil.html';
            });
            loginBtn.dataset.listenerAttached = 'true';
        }
        return;
    }

    setProfileBlockVisible(loginRequired, false);
    setProfileBlockVisible(dashboard, true);
    await loadPlanManifest();

    if (user) {
        const displayName = user.first_name || user.email.split('@')[0];
        if (greeting) greeting.textContent = `Vítejte zpět, ${displayName}! ✨`;

        const emailEl = document.getElementById('user-email');
        if (emailEl) emailEl.textContent = user.email;

        const rawPlan = user.subscription_status || user.subscriptions?.plan_type || 'free';
        const plan = normalizePlanType(rawPlan);
        const planClass = plan === 'free' ? 'badge--secondary' : 'badge--premium';
        const planLabel = formatPlanLabel(plan);

        const badgesContainer = document.getElementById('user-badges');
        if (badgesContainer) {
            badgesContainer.innerHTML = `<span id="user-plan" class="badge ${planClass}">${planLabel}</span>`;
        }

        const planEl = document.getElementById('user-plan');
        if (planEl) {
            planEl.textContent = planLabel;
            planEl.className = `badge ${planClass}`;
        }

        const avatarEl = document.getElementById('user-avatar');
        if (avatarEl && user.avatar) {
            avatarEl.textContent = user.avatar;
        }

        if (user.birth_date) {
            const sign = getZodiacSign(user.birth_date);
            const zodiacEl = document.getElementById('user-zodiac');
            if (zodiacEl && sign) {
                setProfileBlockVisible(zodiacEl, true);
                zodiacEl.innerHTML = `<i class="profile-zodiac-icon" data-lucide="${getZodiacIconName(sign.symbol)}"></i> ${sign.name}`;
            } else {
                showZodiacSignLocal(user.birth_date);
            }
        }
    }

    initTabs();
    initSettingsForm();

    const [readings, subscription] = await Promise.all([
        loadReadings(),
        loadSubscriptionStatus()
    ]);

    handlePaymentReturnState();
    renderPremiumActivation(subscription, user);
    renderDailyGuidance(user, readings, subscription);
    renderActivationChecklist(user, readings, subscription);
    renderRitualMemory(user, readings, subscription);
    updateStats(readings);
    renderJournalEntries(readings);

    if (window.location.hash === '#journal-input') {
        focusJournalInput();
    }

    if (!listenersAttached) {
        document.getElementById('logout-btn')?.addEventListener('click', handleLogout);
        document.getElementById('daily-guidance-card')?.addEventListener('click', handleDailyGuidanceClick);
        document.getElementById('activation-checklist-card')?.addEventListener('click', handleActivationChecklistClick);
        document.getElementById('ritual-memory-card')?.addEventListener('click', handleRitualMemoryClick);
        document.getElementById('readings-filter')?.addEventListener('change', handleFilterChange);
        document.getElementById('readings-load-more')?.addEventListener('click', showMoreReadings);
        document.getElementById('readings-list')?.addEventListener('click', handleReadingListInteraction);
        document.getElementById('readings-list')?.addEventListener('keydown', handleReadingListKeyboard);
        document.getElementById('favorites-list')?.addEventListener('click', handleReadingListInteraction);
        document.getElementById('favorites-list')?.addEventListener('keydown', handleReadingListKeyboard);

        document.getElementById('reading-modal-close')?.addEventListener('click', closeReadingModal);
        document.getElementById('modal-favorite-btn')?.addEventListener('click', toggleFavoriteModal);
        document.getElementById('modal-delete-btn')?.addEventListener('click', deleteReading);

        document.getElementById('reading-modal')?.addEventListener('click', e => {
            if (e.target.id === 'reading-modal') closeReadingModal();
        });

        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') {
                const modal = document.getElementById('reading-modal');
                if (modal && !modal.hidden) closeReadingModal();

                const picker = document.getElementById('avatar-picker');
                if (picker && !picker.hidden) {
                    picker.hidden = true;
                    picker.classList.remove('profile-block-visible');
                }
            }
        });

        document.getElementById('save-settings-btn')?.addEventListener('click', saveSettings);
        document.getElementById('user-avatar')?.addEventListener('click', toggleAvatarPicker);
        document.getElementById('avatar-picker')?.addEventListener('click', e => {
            const option = e.target.closest('.avatar-option');
            if (option) selectAvatar(option.dataset.avatar);
        });

        const journalBtn = document.getElementById('journal-submit');
        if (journalBtn) {
            journalBtn.addEventListener('click', async () => {
                const input = document.getElementById('journal-input');
                const text = input?.value.trim();
                if (!text) return;

                journalBtn.disabled = true;
                journalBtn.innerHTML = '<span class="loading-spinner--sm"></span> Ukládám...';

                try {
                    const response = await fetch(`${apiUrl()}/user/readings`, {
                        method: 'POST',
                        credentials: 'include',
                        headers: await authHeadersWithCsrf(true),
                        body: JSON.stringify({ type: 'journal', data: text })
                    });

                    if (response.ok) {
                        input.value = '';
                        window.Auth?.showToast?.('Reflexe uložena', 'Vrátíš se k ní v historii výkladů.', 'success');
                        if (window.createStardust) window.createStardust(journalBtn);
                        const refreshedReadings = await loadReadings();
                        updateStats(refreshedReadings);
                        renderJournalEntries(refreshedReadings);
                        renderDailyGuidance(window.Auth?.user, refreshedReadings, subscription);
                        renderActivationChecklist(window.Auth?.user, refreshedReadings, subscription);
                        renderRitualMemory(window.Auth?.user, refreshedReadings, subscription);
                        trackProfileEvent('profile_journal_saved', {
                            source: 'profile_dashboard'
                        });
                    } else {
                        const err = await response.json().catch(() => ({}));
                        window.Auth?.showToast?.('Chyba', err.error || 'Vesmír momentálně neodpovídá.', 'error');
                    }
                } catch (e) {
                    console.error('Journal error:', e);
                    window.Auth?.showToast?.('Chyba', 'Vesmír momentálně neodpovídá.', 'error');
                } finally {
                    journalBtn.disabled = false;
                    journalBtn.innerHTML = 'Uložit reflexi';
                }
            });
        }

        document.addEventListener('reading:updated', e => {
            if (e.detail?.readings) {
                updateStats(e.detail.readings);
                renderDailyGuidance(window.Auth?.user, e.detail.readings, subscription);
                renderActivationChecklist(window.Auth?.user, e.detail.readings, subscription);
                renderRitualMemory(window.Auth?.user, e.detail.readings, subscription);
            }
        });

        listenersAttached = true;
    }

    if (window.lucide) {
        window.lucide.createIcons();
    }
}

window.createStardust = function(element) {
    if (!element) return;

    const rect = element.getBoundingClientRect();
    const count = 20;

    for (let i = 0; i < count; i++) {
        const particle = document.createElement('div');
        particle.className = 'stardust-particle';

        const sizeClass = Math.random() > 0.66
            ? 'stardust-particle--lg'
            : (Math.random() > 0.5 ? 'stardust-particle--md' : 'stardust-particle--sm');
        particle.classList.add(sizeClass);

        const x = rect.left + Math.random() * rect.width;
        const y = rect.top + Math.random() * rect.height;

        const tx = (Math.random() - 0.5) * 200;
        const ty = (Math.random() - 0.5) * 200 - 100;
        const duration = (Math.random() * 1 + 0.5) * 1000;

        document.body.appendChild(particle);
        particle.animate([
            { transform: `translate(${x}px, ${y}px) scale(1)`, opacity: 1 },
            { transform: `translate(${x + tx}px, ${y + ty}px) scale(0)`, opacity: 0 }
        ], {
            duration,
            easing: 'ease-out',
            fill: 'forwards'
        }).finished.finally(() => particle.remove());
    }
};

window.viewReading = viewReading;
window.toggleFavorite = (id, el) => {
    import('./modal.js').then(m => m.toggleFavorite(id, el));
};

let profileInitRunning = false;

async function safeInitProfile() {
    if (profileInitRunning) return;
    profileInitRunning = true;

    try {
        await initProfile();
    } finally {
        profileInitRunning = false;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    safeInitProfile();
    document.addEventListener('auth:changed', () => safeInitProfile());
});
