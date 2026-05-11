let selectedSign = null;
let isCompletingOnboarding = false;
let hasInteractedWithInterests = false;
let primaryInterestOverride = null;

const ONBOARDING_NOTIFY_TIMEOUT_MS = 1400;

const SIGN_LABELS = {
    beran: 'Berana',
    byk: 'Býka',
    blizenci: 'Blížence',
    rak: 'Raka',
    lev: 'Lva',
    panna: 'Pannu',
    vahy: 'Váhy',
    stir: 'Štíra',
    strelec: 'Střelce',
    kozoroh: 'Kozoroha',
    vodnar: 'Vodnáře',
    ryby: 'Ryby'
};

const VALID_SIGNS = new Set(Object.keys(SIGN_LABELS));

const FEATURE_INTEREST_MAP = {
    account: 'horoskopy',
    daily_guidance: 'horoskopy',
    weekly_horoscope: 'horoskopy',
    monthly_horoscope: 'horoskopy',
    tarot: 'tarot',
    tarot_multi_card: 'tarot',
    tarot_celtic_cross: 'tarot',
    angel_card_deep: 'andelske-karty',
    numerology: 'numerologie',
    numerologie_vyklad: 'numerologie',
    partnerska_detail: 'vztahy',
    synastry: 'vztahy',
    natalni_interpretace: 'natalni-karta',
    natal_chart: 'natalni-karta',
    astrocartography: 'astrokartografie',
    daily_angel_card: 'andelske-karty',
    andelske_karty_hluboky_vhled: 'andelske-karty',
    mentor: 'spiritualita',
    hvezdny_mentor: 'spiritualita',
    journal_insights: 'spiritualita',
    rituals: 'spiritualita',
    runy_hluboky_vyklad: 'runy',
    runes_deep_reading: 'runy',
    medicine_wheel: 'shamanske-kolo',
    shamanske_kolo_plne_cteni: 'shamanske-kolo',
    past_life: 'minuly-zivot',
    minuly_zivot: 'minuly-zivot',
    crystal_ball_unlimited: 'kristalova-koule',
    kristalova_koule: 'kristalova-koule'
};

const SOURCE_INTEREST_MAP = {
    header_register: 'horoskopy',
    mobile_menu: 'horoskopy',
    profile_activation: 'horoskopy',
    homepage_hero: 'horoskopy',
    pricing_free_cta: 'horoskopy',
    homepage_pricing_free_cta: 'horoskopy',
    newsletter_form: 'horoskopy',
    newsletter_popup: 'horoskopy',
    homepage_daily_card_detail: 'andelske-karty',
    homepage_daily_card_full_reading: 'andelske-karty'
};

const CONTEXT_COPY_BY_INTEREST = {
    horoskopy: {
        title: 'Začni jedním rituálem, ne dalším menu',
        subtitle: 'Vyber znamení a téma. Pak tě vezmeme rovnou k prvnímu dennímu kroku, který se dá uložit a později porovnat.'
    },
    tarot: {
        title: 'Navážeme tarotovým výkladem',
        subtitle: 'Vyberte znamení a téma. Potom otevřeme tarot, aby registrace hned vedla k výkladu.'
    },
    'andelske-karty': {
        title: 'Navážeme andělskou kartou',
        subtitle: 'Vyberte znamení a téma. Potom otevřeme andělské karty bez ztráty kontextu.'
    },
    numerologie: {
        title: 'Začněte numerologickým vhledem',
        subtitle: 'Vyberte znamení a téma. Po dokončení otevřeme numerologii jako první osobní krok.'
    },
    vztahy: {
        title: 'Začněte vztahovým vhledem',
        subtitle: 'Vyberte znamení a téma. Potom otevřeme partnerskou shodu jako první výklad.'
    },
    astrokartografie: {
        title: 'Začněte astro mapou',
        subtitle: 'Vyberte znamení a téma. Potom otevřeme astro mapu a místa, která s vámi ladí.'
    },
    'natalni-karta': {
        title: 'Začněte natální kartou',
        subtitle: 'Vyberte znamení a téma. Potom otevřeme natální kartu jako první hlubší osobní vhled.'
    },
    spiritualita: {
        title: 'Začněte Hvězdným průvodcem',
        subtitle: 'Vyberte znamení a téma. Potom otevřeme průvodce, aby první otázka navázala na váš denní záměr.'
    },
    runy: {
        title: 'Začněte runovým výkladem',
        subtitle: 'Vyberte znamení a téma. Potom otevřeme runy jako rychlý symbolický první krok.'
    },
    'shamanske-kolo': {
        title: 'Začněte šamanským kolem',
        subtitle: 'Vyberte znamení a téma. Potom otevřeme šamanské kolo pro hlubší osobní vhled.'
    },
    'minuly-zivot': {
        title: 'Začněte minulým životem',
        subtitle: 'Vyberte znamení a téma. Potom otevřeme výklad minulého života bez ztráty kontextu.'
    },
    'kristalova-koule': {
        title: 'Začněte křišťálovou koulí',
        subtitle: 'Vyberte znamení a téma. Potom otevřeme křišťálovou kouli pro první osobní otázku.'
    }
};

function getOnboardingContext() {
    const params = new URLSearchParams(window.location.search);
    return {
        source: params.get('source') || '',
        feature: params.get('feature') || ''
    };
}

function getContextDefaultInterest() {
    const { source, feature } = getOnboardingContext();
    return FEATURE_INTEREST_MAP[feature] || SOURCE_INTEREST_MAP[source] || '';
}

function appendEntryContext(url) {
    const { source, feature } = getOnboardingContext();
    if (source) url.searchParams.set('entry_source', source);
    if (feature) url.searchParams.set('entry_feature', feature);
    return url;
}

function formatAppUrl(url) {
    return `${url.pathname}${url.search}${url.hash}`;
}

function withSource(path, source = 'onboarding_complete') {
    const url = new URL(path, window.location.origin);
    url.searchParams.set('source', source);
    appendEntryContext(url);
    return formatAppUrl(url);
}

function buildHoroscopeDestination(source = 'onboarding_complete') {
    const url = new URL('/horoskopy.html', window.location.origin);
    url.searchParams.set('source', source);
    if (selectedSign) {
        url.searchParams.set('sign', selectedSign);
        url.hash = selectedSign;
    }

    appendEntryContext(url);
    return formatAppUrl(url);
}

const INTEREST_DESTINATIONS = {
    horoskopy: {
        label: () => selectedSign ? `Zobrazit horoskop pro ${SIGN_LABELS[selectedSign]}` : 'Zobrazit denní horoskop',
        copy: () => selectedSign
            ? `Po dokončení otevřeme denní horoskop pro ${SIGN_LABELS[selectedSign]}.`
            : 'Po dokončení otevřeme denní horoskop.',
        href: (source) => buildHoroscopeDestination(source)
    },
    tarot: {
        label: () => 'Otevřít tarotový výklad',
        copy: () => 'Po dokončení přejdete rovnou k první tarotové otázce.',
        href: (source) => withSource('/tarot.html', source)
    },
    numerologie: {
        label: () => 'Otevřít numerologii',
        copy: () => 'Po dokončení otevřeme numerologický výklad jako první krok.',
        href: (source) => withSource('/numerologie.html', source)
    },
    vztahy: {
        label: () => 'Otevřít partnerskou shodu',
        copy: () => 'Po dokončení přejdete k partnerské shodě a vztahovému výkladu.',
        href: (source) => withSource('/partnerska-shoda.html', source)
    },
    'natalni-karta': {
        label: () => 'Otevřít natální kartu',
        copy: () => 'Po dokončení otevřeme natální kartu pro hlubší osobní vhled.',
        href: (source) => withSource('/natalni-karta.html', source)
    },
    sny: {
        label: () => 'Otevřít snář',
        copy: () => 'Po dokončení přejdete do snáře a můžete začít výkladem snu.',
        href: (source) => withSource('/snar.html', source)
    },
    spiritualita: {
        label: () => 'Otevřít Hvězdného průvodce',
        copy: () => 'Po dokončení můžete položit první otázku Hvězdnému průvodci.',
        href: (source) => withSource('/mentor.html', source)
    },
    vesteni: {
        label: () => 'Otevřít symbolický vhled',
        copy: () => 'Po dokončení přejdete k tarotu jako rychlému prvnímu symbolickému kroku.',
        href: (source) => withSource('/tarot.html', source)
    },
    kariera: {
        label: () => selectedSign ? `Zobrazit kariérní vhled pro ${SIGN_LABELS[selectedSign]}` : 'Zobrazit kariérní horoskop',
        copy: () => 'Po dokončení otevřeme denní horoskop, kde začnete pracovním a kariérním vhledem.',
        href: (source) => buildHoroscopeDestination(source)
    },
    astrokartografie: {
        label: () => 'Otevřít astro mapu',
        copy: () => 'Po dokončení přejdete k astro mapě a tématu míst, která s vámi ladí.',
        href: (source) => withSource('/astro-mapa.html', source)
    },
    'andelske-karty': {
        label: () => 'Otevřít andělské karty',
        copy: () => 'Po dokončení otevřeme andělské karty, aby první vhled navázal na váš záměr.',
        href: (source) => withSource('/andelske-karty.html', source)
    },
    runy: {
        label: () => 'Otevřít runový výklad',
        copy: () => 'Po dokončení přejdete k runám jako rychlému symbolickému výkladu.',
        href: (source) => withSource('/runy.html', source)
    },
    'shamanske-kolo': {
        label: () => 'Otevřít šamanské kolo',
        copy: () => 'Po dokončení otevřeme šamanské kolo pro hlubší osobní vhled.',
        href: (source) => withSource('/shamansko-kolo.html', source)
    },
    'minuly-zivot': {
        label: () => 'Otevřít minulý život',
        copy: () => 'Po dokončení přejdete k výkladu minulého života.',
        href: (source) => withSource('/minuly-zivot.html', source)
    },
    'kristalova-koule': {
        label: () => 'Otevřít křišťálovou kouli',
        copy: () => 'Po dokončení můžete položit první osobní otázku křišťálové kouli.',
        href: (source) => withSource('/kristalova-koule.html', source)
    }
};

function getSelectedInterests() {
    return [...document.querySelectorAll('.interest-chip.selected')];
}

function getPrimaryInterestKey() {
    const selectedInterestKeys = getSelectedInterests().map((chip) => chip.dataset.interest).filter(Boolean);

    if (primaryInterestOverride && selectedInterestKeys.includes(primaryInterestOverride)) {
        return primaryInterestOverride;
    }

    if (selectedInterestKeys.length) {
        return selectedInterestKeys[0];
    }

    return hasInteractedWithInterests ? 'horoskopy' : getContextDefaultInterest() || 'horoskopy';
}

function readStoredJsonArray(key) {
    try {
        const parsed = JSON.parse(localStorage.getItem(key) || '[]');
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function getPrimaryDestination() {
    const selectedInterest = getPrimaryInterestKey();
    return INTEREST_DESTINATIONS[selectedInterest] || INTEREST_DESTINATIONS.horoskopy;
}

function updateFinishCta() {
    const finishBtn = document.getElementById('finish-onboarding-btn');
    const finishCopy = document.getElementById('finish-onboarding-copy');
    const destination = getPrimaryDestination();

    if (finishBtn) {
        finishBtn.textContent = `${destination.label()} ✨`;
    }
    if (finishCopy) {
        finishCopy.textContent = destination.copy();
    }
}

function setNextButtonEnabled(enabled) {
    const nextBtn = document.getElementById('btn-step2');
    if (!nextBtn) return;

    nextBtn.disabled = !enabled;
    nextBtn.classList.toggle('onboarding-next-enabled', enabled);
}

function applySelectedSign(sign, { persist = false } = {}) {
    if (!VALID_SIGNS.has(sign)) return;

    document.querySelectorAll('.zodiac-btn').forEach((item) => {
        const isSelected = item.dataset.sign === sign;
        item.classList.toggle('selected', isSelected);
        item.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
    });

    selectedSign = sign;
    setNextButtonEnabled(true);
    if (persist) {
        localStorage.setItem('mh_zodiac', selectedSign);
        savePersonalizationSign(selectedSign);
    }
    updateFinishCta();
}

function applySelectedInterests(interests = []) {
    const selectedInterests = new Set(interests);
    document.querySelectorAll('.interest-chip').forEach((chip) => {
        const isSelected = selectedInterests.has(chip.dataset.interest);
        chip.classList.toggle('selected', isSelected);
        chip.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
    });

    primaryInterestOverride = interests.find((interest) => INTEREST_DESTINATIONS[interest]) || null;
    updateFinishCta();
}

function restoreSavedSelections() {
    const params = new URLSearchParams(window.location.search);
    const storedPrefs = (() => {
        try {
            return JSON.parse(localStorage.getItem('mh_user_prefs') || '{}');
        } catch {
            return {};
        }
    })();
    const initialSign = params.get('sign')
        || params.get('znak')
        || localStorage.getItem('mh_zodiac')
        || storedPrefs.sign;
    const urlInterest = params.get('interest') || params.get('tema');
    const storedInterests = readStoredJsonArray('mh_interests');
    const contextInterest = getContextDefaultInterest();
    const initialInterests = urlInterest
        ? [urlInterest]
        : storedInterests.length
            ? storedInterests
            : contextInterest
                ? [contextInterest]
                : [];

    applySelectedSign(initialSign, { persist: false });
    applySelectedInterests(initialInterests);
}

function renderContextContent() {
    const primaryInterest = getPrimaryInterestKey();
    const contextCopy = CONTEXT_COPY_BY_INTEREST[primaryInterest];
    if (!contextCopy) return;

    const title = document.querySelector('#step-1 .step-title');
    const subtitle = document.querySelector('#step-1 .step-subtitle');
    const skipLink = document.querySelector('[data-action="skipOnboarding"]');

    if (title) title.textContent = contextCopy.title;
    if (subtitle) subtitle.textContent = contextCopy.subtitle;
    if (skipLink) {
        skipLink.textContent = 'přeskočit a otevřít první výklad';
        skipLink.setAttribute('href', getPrimaryDestination().href('onboarding_skip'));
    }
}

function savePersonalizationSign(sign) {
    if (!sign) return;

    try {
        const current = JSON.parse(localStorage.getItem('mh_user_prefs') || '{}');
        localStorage.setItem('mh_user_prefs', JSON.stringify({
            ...current,
            sign,
            signSetAt: Date.now(),
            version: current.version || '1.0'
        }));
    } catch {
        localStorage.setItem('mh_user_prefs', JSON.stringify({
            sign,
            signSetAt: Date.now(),
            version: '1.0'
        }));
    }
}

function markOnboardingComplete() {
    localStorage.setItem('mh_onboarded', '1');
    if (selectedSign) {
        localStorage.setItem('mh_zodiac', selectedSign);
        savePersonalizationSign(selectedSign);
    }
}

function goStep(n) {
    document.querySelectorAll('.step-view').forEach((step) => step.classList.remove('active'));
    document.getElementById(`step-${n}`)?.classList.add('active');

    for (let i = 1; i <= 3; i += 1) {
        const progress = document.getElementById(`prog-${i}`);
        progress?.classList.toggle('active', i === n);
        progress?.classList.toggle('done', i < n);
    }

    if (n === 3) updateFinishCta();

    window.MH_ANALYTICS?.trackEvent?.('onboarding_step_viewed', {
        step_number: n,
        entry_source: getOnboardingContext().source || null,
        entry_feature: getOnboardingContext().feature || null
    });
}

function selectSign(btn) {
    applySelectedSign(btn.dataset.sign, { persist: true });

    window.MH_ANALYTICS?.trackEvent?.('onboarding_sign_selected', {
        sign: selectedSign
    });
}

function toggleInterest(btn) {
    hasInteractedWithInterests = true;
    btn.classList.toggle('selected');
    btn.setAttribute('aria-pressed', btn.classList.contains('selected') ? 'true' : 'false');

    if (btn.classList.contains('selected')) {
        primaryInterestOverride = btn.dataset.interest || null;
    } else if (primaryInterestOverride === btn.dataset.interest) {
        primaryInterestOverride = getSelectedInterests()[0]?.dataset.interest || null;
    }

    updateFinishCta();

    window.MH_ANALYTICS?.trackEvent?.('onboarding_interest_toggled', {
        interest: btn.dataset.interest || btn.textContent.trim(),
        selected: btn.classList.contains('selected')
    });
}

function setCompletionPending(action, pending) {
    const element = action || document.getElementById('finish-onboarding-btn');
    if (!element) return;

    if (pending) {
        element.dataset.originalText = element.textContent;
        element.setAttribute('aria-busy', 'true');
        element.classList.add('onboarding-pending');
        if ('disabled' in element) element.disabled = true;
        if (element.tagName === 'A') element.setAttribute('aria-disabled', 'true');
        element.textContent = action?.dataset.action === 'skipOnboarding' ? 'Otevírám horoskop...' : 'Otevírám výklad...';
        return;
    }

    if ('disabled' in element) element.disabled = false;
    element.removeAttribute('aria-busy');
    element.removeAttribute('aria-disabled');
    element.classList.remove('onboarding-pending');
    if (element.dataset.originalText) {
        element.textContent = element.dataset.originalText;
        delete element.dataset.originalText;
    }
}

async function notifyBackendOnboardingComplete(context = {}) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), ONBOARDING_NOTIFY_TIMEOUT_MS);
    const entryContext = getOnboardingContext();

    try {
        const API_URL = window.API_CONFIG?.BASE_URL || '/api';
        const csrfToken = window.getCSRFToken
            ? await Promise.race([
                window.getCSRFToken(),
                new Promise((resolve) => {
                    controller.signal.addEventListener('abort', () => resolve(null), { once: true });
                })
            ])
            : null;

        if (controller.signal.aborted) return;

        const res = await fetch(`${API_URL}/auth/onboarding/complete`, {
            method: 'POST',
            credentials: 'include',
            signal: controller.signal,
            headers: {
                'Content-Type': 'application/json',
                ...(csrfToken && { 'X-CSRF-Token': csrfToken })
            },
            body: JSON.stringify({
                source: entryContext.source || null,
                feature: entryContext.feature || null,
                destination: context.destination || null,
                skipped: context.skipped === true
            })
        });

        if (!res.ok) {
            console.warn('Failed to notify backend of onboarding completion:', res.status);
        }
    } catch (error) {
        if (error.name !== 'AbortError') {
            console.warn('Error notifying backend of onboarding:', error);
        }
    } finally {
        window.clearTimeout(timeout);
    }
}

async function finishOnboarding(action) {
    if (isCompletingOnboarding) return;
    isCompletingOnboarding = true;
    setCompletionPending(action, true);

    const interests = getSelectedInterests().map((chip) => chip.dataset.interest || chip.textContent.trim());
    const destination = getPrimaryDestination();
    const destinationHref = destination.href('onboarding_complete');

    if (interests.length) {
        localStorage.setItem('mh_interests', JSON.stringify(interests));
    }
    markOnboardingComplete();

    window.MH_ANALYTICS?.trackEvent?.('onboarding_completed', {
        sign: selectedSign,
        interests_count: interests.length,
        destination: destinationHref,
        entry_source: getOnboardingContext().source || null,
        entry_feature: getOnboardingContext().feature || null
    });

    await notifyBackendOnboardingComplete({ destination: destinationHref, skipped: false });
    window.location.href = destinationHref;
}

async function skipOnboarding(event, action) {
    event.preventDefault();
    if (isCompletingOnboarding) return;
    isCompletingOnboarding = true;
    setCompletionPending(action, true);

    markOnboardingComplete();

    window.MH_ANALYTICS?.trackEvent?.('onboarding_skipped', {
        destination: getPrimaryDestination().href('onboarding_skip'),
        entry_source: getOnboardingContext().source || null,
        entry_feature: getOnboardingContext().feature || null
    });

    const destination = getPrimaryDestination().href('onboarding_skip');
    await notifyBackendOnboardingComplete({ destination, skipped: true });
    window.location.href = destination;
}

document.addEventListener('click', (event) => {
    const action = event.target.closest('[data-action]');
    if (!action) return;

    const actionType = action.dataset.action;

    if (actionType === 'goStep') {
        goStep(parseInt(action.dataset.step, 10));
    } else if (actionType === 'selectSign') {
        selectSign(action);
    } else if (actionType === 'toggleInterest') {
        toggleInterest(action);
    } else if (actionType === 'finishOnboarding') {
        finishOnboarding(action);
    } else if (actionType === 'skipOnboarding') {
        skipOnboarding(event, action);
    }
});

document.addEventListener('DOMContentLoaded', () => {
    restoreSavedSelections();
    renderContextContent();
    updateFinishCta();
});
