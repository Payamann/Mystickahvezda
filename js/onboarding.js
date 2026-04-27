let selectedSign = null;

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

function withSource(path, source = 'onboarding_complete') {
    const url = new URL(path, window.location.origin);
    url.searchParams.set('source', source);
    return `${url.pathname}${url.search}`;
}

function buildHoroscopeDestination(source = 'onboarding_complete') {
    const url = new URL('/horoskopy.html', window.location.origin);
    url.searchParams.set('source', source);
    if (selectedSign) {
        url.searchParams.set('sign', selectedSign);
    }

    return `${url.pathname}${url.search}${selectedSign ? `#${selectedSign}` : ''}`;
}

const INTEREST_DESTINATIONS = {
    horoskopy: {
        label: () => selectedSign ? `Zobrazit horoskop pro ${SIGN_LABELS[selectedSign]}` : 'Zobrazit denní horoskop',
        copy: () => selectedSign
            ? `Po dokončení otevřeme denní horoskop pro ${SIGN_LABELS[selectedSign]}.`
            : 'Po dokončení otevřeme denní horoskop.',
        href: () => buildHoroscopeDestination()
    },
    tarot: {
        label: () => 'Otevřít tarotový výklad',
        copy: () => 'Po dokončení přejdete rovnou k první tarotové otázce.',
        href: () => withSource('/tarot.html')
    },
    numerologie: {
        label: () => 'Otevřít numerologii',
        copy: () => 'Po dokončení otevřeme numerologický výklad jako první krok.',
        href: () => withSource('/numerologie.html')
    },
    vztahy: {
        label: () => 'Otevřít partnerskou shodu',
        copy: () => 'Po dokončení přejdete k partnerské shodě a vztahovému výkladu.',
        href: () => withSource('/partnerska-shoda.html')
    },
    'natalni-karta': {
        label: () => 'Otevřít natální kartu',
        copy: () => 'Po dokončení otevřeme natální kartu pro hlubší osobní vhled.',
        href: () => withSource('/natalni-karta.html')
    },
    sny: {
        label: () => 'Otevřít snář',
        copy: () => 'Po dokončení přejdete do snáře a můžete začít výkladem snu.',
        href: () => withSource('/snar.html')
    },
    spiritualita: {
        label: () => 'Otevřít Hvězdného průvodce',
        copy: () => 'Po dokončení můžete položit první otázku Hvězdnému průvodci.',
        href: () => withSource('/mentor.html')
    },
    vesteni: {
        label: () => 'Otevřít věštecký výklad',
        copy: () => 'Po dokončení přejdete k tarotu jako rychlému prvnímu výkladu.',
        href: () => withSource('/tarot.html')
    },
    kariera: {
        label: () => selectedSign ? `Zobrazit kariérní vhled pro ${SIGN_LABELS[selectedSign]}` : 'Zobrazit kariérní horoskop',
        copy: () => 'Po dokončení otevřeme denní horoskop, kde začnete pracovním a kariérním vhledem.',
        href: () => buildHoroscopeDestination()
    },
    astrokartografie: {
        label: () => 'Otevřít astro mapu',
        copy: () => 'Po dokončení přejdete k astro mapě a tématu míst, která s vámi ladí.',
        href: () => withSource('/astro-mapa.html')
    }
};

function getSelectedInterests() {
    return [...document.querySelectorAll('.interest-chip.selected')];
}

function getPrimaryDestination() {
    const selectedInterest = getSelectedInterests()[0]?.dataset.interest || 'horoskopy';
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
        step_number: n
    });
}

function selectSign(btn) {
    document.querySelectorAll('.zodiac-btn').forEach((item) => {
        item.classList.remove('selected');
        item.setAttribute('aria-pressed', 'false');
    });

    btn.classList.add('selected');
    btn.setAttribute('aria-pressed', 'true');
    selectedSign = btn.dataset.sign;
    localStorage.setItem('mh_zodiac', selectedSign);
    savePersonalizationSign(selectedSign);
    updateFinishCta();

    window.MH_ANALYTICS?.trackEvent?.('onboarding_sign_selected', {
        sign: selectedSign
    });

    const nextBtn = document.getElementById('btn-step2');
    if (nextBtn) {
        nextBtn.disabled = false;
        nextBtn.classList.add('onboarding-next-enabled');
    }
}

function toggleInterest(btn) {
    btn.classList.toggle('selected');
    btn.setAttribute('aria-pressed', btn.classList.contains('selected') ? 'true' : 'false');
    updateFinishCta();

    window.MH_ANALYTICS?.trackEvent?.('onboarding_interest_toggled', {
        interest: btn.dataset.interest || btn.textContent.trim(),
        selected: btn.classList.contains('selected')
    });
}

async function notifyBackendOnboardingComplete() {
    try {
        const API_URL = window.API_CONFIG?.BASE_URL || '/api';
        const csrfToken = window.getCSRFToken ? await window.getCSRFToken() : null;
        const res = await fetch(`${API_URL}/auth/onboarding/complete`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                ...(csrfToken && { 'X-CSRF-Token': csrfToken })
            }
        });

        if (!res.ok) {
            console.warn('Failed to notify backend of onboarding completion:', res.status);
        }
    } catch (error) {
        console.warn('Error notifying backend of onboarding:', error);
    }
}

async function finishOnboarding() {
    const interests = getSelectedInterests().map((chip) => chip.dataset.interest || chip.textContent.trim());
    const destination = getPrimaryDestination();

    if (interests.length) {
        localStorage.setItem('mh_interests', JSON.stringify(interests));
    }
    markOnboardingComplete();

    window.MH_ANALYTICS?.trackEvent?.('onboarding_completed', {
        sign: selectedSign,
        interests_count: interests.length,
        destination: destination.href()
    });

    await notifyBackendOnboardingComplete();
    window.location.href = destination.href();
}

async function skipOnboarding(event) {
    event.preventDefault();
    markOnboardingComplete();

    window.MH_ANALYTICS?.trackEvent?.('onboarding_skipped', {
        destination: buildHoroscopeDestination('onboarding_skip')
    });

    await notifyBackendOnboardingComplete();
    window.location.href = buildHoroscopeDestination('onboarding_skip');
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
        finishOnboarding();
    } else if (actionType === 'skipOnboarding') {
        skipOnboarding(event);
    }
});

document.addEventListener('DOMContentLoaded', updateFinishCta);
