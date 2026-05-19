/**
 * Runes Logic
 * Handles rune drawing, shuffling animation, and AI interpretations.
 */

let runesData = [];
let drawnRune = null;
const RUNES_DEEP_FEATURE = 'runy_hluboky_vyklad';
const RUNES_PAYMENT_REASSURANCE = 'Cena a p\u0159\u00edpadn\u00e9 zku\u0161ebn\u00ed obdob\u00ed se zobraz\u00ed ve Stripe p\u0159ed potvrzen\u00edm.';

function apiBase() {
    return window.API_CONFIG?.BASE_URL || '/api';
}

async function buildJsonHeaders() {
    const csrfToken = window.getCSRFToken ? await window.getCSRFToken() : null;
    return {
        'Content-Type': 'application/json',
        ...(csrfToken && { 'X-CSRF-Token': csrfToken })
    };
}

function buildRuneUpgradeUrl(source, feature) {
    const pricingUrl = new URL('/cenik.html', window.location.origin);
    pricingUrl.searchParams.set('plan', 'pruvodce');
    pricingUrl.searchParams.set('source', source);
    pricingUrl.searchParams.set('feature', feature);
    return `${pricingUrl.pathname}${pricingUrl.search}`;
}

function escapeHtml(value) {
    const div = document.createElement('div');
    div.textContent = String(value ?? '');
    return div.innerHTML;
}

function startRuneUpgradeFlow(source, feature, redirect = '/cenik.html') {
    window.MH_ANALYTICS?.trackCTA?.(source, {
        plan_id: 'pruvodce',
        feature
    });

    if (window.Auth?.startPlanCheckout) {
        window.Auth.startPlanCheckout('pruvodce', {
            source,
            feature,
            redirect,
            authMode: 'register'
        });
        return;
    }

    window.location.href = buildRuneUpgradeUrl(source, feature);
}

function showRuneUpgradePreview(source = 'runes_inline_gate', intention = '') {
    const aiContainer = document.getElementById('ai-response-container');
    if (!aiContainer || !drawnRune) return;

    const escapedRuneName = escapeHtml(drawnRune.name || 'vyta\u017Een\u00E1 runa');
    const escapedRuneMeaning = escapeHtml(drawnRune.meaning || '');
    const escapedIntention = escapeHtml(intention || 'tv\u016Fj aktu\u00E1ln\u00ED z\u00E1m\u011Br');

    aiContainer.hidden = false;
    aiContainer.classList.add('mh-block-visible', 'runes-upgrade-preview');
    aiContainer.innerHTML = `
        <div class="runes-upgrade-preview__lock" aria-hidden="true">\uD83D\uDD12</div>
        <h4>Odemknout hlubok\u00FD v\u00FDklad runy ${escapedRuneName}</h4>
        <p>Z\u00E1kladn\u00ED poselstv\u00ED u\u017E m\u00E1\u0161. Pln\u00FD v\u00FDklad propojuje runu, tv\u016Fj z\u00E1m\u011Br a konkr\u00E9tn\u00ED dal\u0161\u00ED krok pro dne\u0161ek.</p>
        <div class="runes-upgrade-preview__sample">
            <strong>N\u00E1hled odem\u010Den\u00E9 \u010D\u00E1sti:</strong>
            <span>Pro z\u00E1m\u011Br \u201E${escapedIntention}\u201C by se otev\u0159el osobn\u00ED v\u00FDklad, jak energie ${escapedRuneName}${escapedRuneMeaning ? ` (${escapedRuneMeaning})` : ''} mluv\u00ED do tv\u00E9 situace.</span>
        </div>
        <div class="runes-upgrade-preview__actions">
            <button type="button" class="btn btn--gold runes-upgrade-preview__cta">Odemknout \u0161amansk\u00FD v\u00FDklad</button>
            <button type="button" class="btn btn--ghost runes-upgrade-preview__free">Z\u016Fstat u runy zdarma</button>
        </div>
        <p class="runes-upgrade-preview__reassurance">${RUNES_PAYMENT_REASSURANCE}</p>
    `;

    window.MH_ANALYTICS?.trackAction?.('paywall_viewed', {
        source,
        feature: RUNES_DEEP_FEATURE,
        plan_id: 'pruvodce',
        rune: drawnRune.name || '',
        has_intention: Boolean(intention)
    });

    aiContainer.querySelector('.runes-upgrade-preview__cta')?.addEventListener('click', () => {
        startRuneUpgradeFlow(source, RUNES_DEEP_FEATURE);
    });

    aiContainer.querySelector('.runes-upgrade-preview__free')?.addEventListener('click', () => {
        window.MH_ANALYTICS?.trackAction?.('paywall_dismissed', {
            source,
            feature: RUNES_DEEP_FEATURE
        });
        aiContainer.hidden = true;
        aiContainer.classList.remove('mh-block-visible', 'runes-upgrade-preview');
    });

    aiContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
function appendRuneFavoriteAction(container, readingId) {
    if (!container || !readingId) return;

    document.getElementById('favorite-rune-action')?.remove();

    const action = document.createElement('div');
    action.id = 'favorite-rune-action';
    action.className = 'text-center favorite-reading-action mt-md';
    action.innerHTML = `
        <button id="favorite-rune-btn" class="btn btn--glass favorite-reading-action__button">
            <span class="favorite-icon">☆</span> Přidat do oblíbených
        </button>
    `;
    container.appendChild(action);

    action.querySelector('#favorite-rune-btn')?.addEventListener('click', async () => {
        if (typeof window.toggleFavorite === 'function') {
            await window.toggleFavorite(readingId, 'favorite-rune-btn');
        }
    });
}

async function saveRuneReading({ response = null, intention = '', fallback = false } = {}) {
    if (!drawnRune || !window.Auth?.saveReading) return null;

    if (!window.Auth.isLoggedIn?.()) {
        window.Auth.showToast?.('Přihlášení vyžadováno', 'Pro uložení runy se prosím přihlaste.', 'info');
        startRuneUpgradeFlow('runes_save_gate', 'runy_ulozeni', '/runy.html');
        return null;
    }

    const saveResult = await window.Auth.saveReading('runes', {
        rune: {
            name: drawnRune.name,
            symbol: drawnRune.symbol,
            meaning: drawnRune.meaning,
            element: drawnRune.element
        },
        intention,
        response,
        fallback
    });

    if (saveResult?.id) {
        window.Auth.showToast?.('Uloženo', 'Runový výklad je uložený v profilu.', 'success');
    }

    return saveResult;
}

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Load rune database
    try {
        const res = await fetch('/data/runes.json');
        if (!res.ok) throw new Error('Nepodařilo se načíst databázi run.');
        runesData = await res.json();
    } catch (error) {
        console.error('Error loading runes:', error);
        alert('Došlo k chybě při načítání run. Zkuste prosím obnovit stránku.');
        return;
    }

    // 2. Initial setup
    const runeEl = document.getElementById('active-rune');
    const drawBtn = document.getElementById('btn-draw');
    const deepReadBtn = document.getElementById('btn-deep-reading');
    const saveBtn = document.getElementById('btn-save');
    const shareBtn = document.getElementById('btn-share');

    // 3. Check Daily Lock
    checkDailyLock();
    updateRuneFreemiumBanner();

    // 4. Attach listeners
    if (runeEl) {
        runeEl.addEventListener('click', drawRune);
    }
    if (drawBtn) {
        drawBtn.addEventListener('click', drawRune);
    }

    if (deepReadBtn) {
        deepReadBtn.addEventListener('click', requestDeepReading);
    }

    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            if (!drawnRune) {
                window.Auth?.showToast?.('Nejdřív vytáhněte runu', 'Uložit lze až konkrétní runový výklad.', 'info');
                return;
            }

            try {
                const saveResult = await saveRuneReading({
                    intention: document.getElementById('rune-intention')?.value?.trim() || ''
                });
                if (saveResult?.id) {
                    appendRuneFavoriteAction(document.getElementById('rune-result'), saveResult.id);
                }
            } catch (error) {
                console.error('Rune save failed:', error);
                window.Auth?.showToast?.('Chyba', 'Runu se nepodařilo uložit.', 'error');
            }
        });
    }

    if (shareBtn) {
        shareBtn.addEventListener('click', shareRune);
    }
});

function shareRune() {
    if (!drawnRune) return;

    const shareTitle = `Moje runa dne: ${drawnRune.name} 🪨`;
    const shareText = `Dnes mě provází runa ${drawnRune.name} (${drawnRune.symbol}) - ${drawnRune.meaning}. Zjistěte, jaký kámen čeká na vás na Mystické Hvězdě! ✨`;
    const shareUrl = window.location.href;

    if (navigator.share) {
        navigator.share({
            title: shareTitle,
            text: shareText,
            url: shareUrl
        }).catch(console.warn);
    } else {
        navigator.clipboard.writeText(`${shareTitle}\n\n${shareText}\n${shareUrl}`).then(() => {
            alert('Odkaz a poselství byly zkopírovány do schránky! Můžete je vložit přátelům.');
        }).catch(err => {
            console.error('Clipboard failed', err);
        });
    }
}

function checkDailyLock() {
    const today = new Date().toISOString().split('T')[0];
    const savedDataStr = localStorage.getItem('runeDaily');

    if (savedDataStr) {
        try {
            const savedData = JSON.parse(savedDataStr);
            if (savedData.date === today && savedData.runeData) {
                drawnRune = savedData.runeData;
                revealPreDrawnRune();
            } else {
                localStorage.removeItem('runeDaily');
            }
        } catch (e) {
            console.error('Error parsing daily rune:', e);
            localStorage.removeItem('runeDaily');
        }
    }
}

function updateRuneFreemiumBanner() {
    const countEl = document.getElementById('freemium-count');
    if (!countEl) return;

    const today = new Date().toISOString().split('T')[0];
    let used = 0;

    try {
        const savedData = JSON.parse(localStorage.getItem('runeDaily') || 'null');
        used = savedData?.date === today && savedData?.runeData ? 1 : 0;
    } catch {
        used = 0;
    }

    countEl.textContent = `${Math.max(0, 1 - used)} / 1`;
}

function revealPreDrawnRune() {
    const runeEl = document.getElementById('active-rune');
    const drawBtn = document.getElementById('btn-draw');

    if (runeEl) {
        runeEl.classList.remove('hidden');
        document.getElementById('rune-symbol').textContent = drawnRune.symbol;
        runeEl.classList.add('rune-stone--drawn');
        // Remove click listener manually by cloning if needed, or check drawnRune in click handler
    }

    if (drawBtn) {
        drawBtn.hidden = true;
    }

    showResultData();
}

async function drawRune() {
    if (drawnRune) return; // Already drawn

    const runeEl = document.getElementById('active-rune');
    const drawBtn = document.getElementById('btn-draw');
    const loadingEl = document.getElementById('loading');

    // UI state
    if (drawBtn) drawBtn.hidden = true;
    if (runeEl) {
        runeEl.classList.add('shuffling', 'rune-stone--disabled');
    }

    // Play sound / wait for animation
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Pick random
    const randomIndex = Math.floor(Math.random() * runesData.length);
    drawnRune = runesData[randomIndex];

    // Remove shuffling
    if (runeEl) {
        runeEl.classList.remove('shuffling', 'hidden', 'rune-stone--disabled');
        runeEl.classList.add('rune-stone--drawn');
        document.getElementById('rune-symbol').textContent = drawnRune.symbol;
    }

    // Save to local storage
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem('runeDaily', JSON.stringify({
        date: today,
        runeData: drawnRune
    }));
    updateRuneFreemiumBanner();

    // Show results
    showResultData();
}

function showResultData() {
    const resultFrame = document.getElementById('rune-result');
    if (!resultFrame) return;

    document.getElementById('rune-name').textContent = `${drawnRune.name} ${drawnRune.symbol}`;
    document.getElementById('rune-meaning').textContent = drawnRune.meaning;
    document.getElementById('rune-desc').textContent = drawnRune.description;

    // Show frame nicely
    resultFrame.classList.add('visible');

    // Scroll to it on mobile if needed
    setTimeout(() => {
        resultFrame.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 300);
}

async function requestDeepReading() {
    if (!window.Auth || !window.Auth.isLoggedIn()) {
        const intention = document.getElementById('rune-intention')?.value || '';
        sessionStorage.setItem('pendingRuneContext', JSON.stringify({ rune: drawnRune, intention }));
        window.Auth?.showToast?.('V\u00FDklad je zam\u010Den\u00FD', 'Runa dne z\u016Fst\u00E1v\u00E1 zdarma. Pln\u00FD \u0161amansk\u00FD v\u00FDklad odemkne\u0161 a\u017E po rozhodnut\u00ED.', 'info');
        showRuneUpgradePreview('runes_auth_gate', intention.trim());
        return;
    }

    const intentionInput = document.getElementById('rune-intention');
    const intention = intentionInput ? intentionInput.value.trim() : '';
    const btn = document.getElementById('btn-deep-reading');
    const aiContainer = document.getElementById('ai-response-container');
    const originUpsell = document.getElementById('premium-upsell');

    btn.disabled = true;
    btn.innerHTML = 'Šaman přijímá vedení... <div class="loading__spinner loading__spinner--inline"></div>';

    try {
        const response = await fetch(`${apiBase()}/runes`, {
            method: 'POST',
            credentials: 'include',
            headers: await buildJsonHeaders(),
            body: JSON.stringify({
                rune: drawnRune,
                intention
            }),
        });

        const data = await response.json();

        if (response.status === 401 || response.status === 402 || response.status === 403) {
            sessionStorage.setItem('pendingRuneContext', JSON.stringify({ rune: drawnRune, intention }));
            window.Auth?.showToast?.('Premium vy\u017Eadov\u00E1no', '\u0160amansk\u00FD v\u00FDklad vy\u017Eaduje pr\u00E9miov\u00E9 \u010Dlenstv\u00ED Hv\u011Bzdn\u00E9ho Pr\u016Fvodce.', 'info');
            showRuneUpgradePreview('runes_premium_gate', intention);
            return;
        }

        if (!data.success) {
            throw new Error(data.error || 'Neznámá chyba API');
        }

        // Hide upsell block
        if (originUpsell) originUpsell.hidden = true;

        // Show response safely
        aiContainer.hidden = false;
        aiContainer.classList.remove('runes-upgrade-preview');
        aiContainer.classList.add('mh-block-visible');
        const div = document.createElement('div');
        div.textContent = data.response;
        let safeHTML = div.innerHTML.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        aiContainer.innerHTML = typeof DOMPurify !== 'undefined' ? DOMPurify.sanitize(safeHTML) : safeHTML;

        const saveResult = await saveRuneReading({
            response: data.response,
            intention,
            fallback: !!data.fallback
        });

        if (saveResult?.id) {
            appendRuneFavoriteAction(aiContainer, saveResult.id);
        }

        aiContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    } catch (error) {
        console.error('Deep read failed:', error);
        alert('Nepodařilo se načíst hluboký výklad. Zkuste to prosím znovu.');
        btn.disabled = false;
        btn.innerHTML = 'Získat šamanský výklad (Zkusit znovu)';
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Získat šamanský výklad';
    }
}
