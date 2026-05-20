/**
 * Angel Cards Logic
 * Handles card drawing, 3D animations, and API communication for deep readings.
 */

let angelCardsData = [];
let drawnCard = null;

const DAILY_CARD_FALLBACKS = {
    'andele-ochranci': {
        name: 'Andělé Ochránci',
        keyword: 'Ochrana',
        text: 'Dnes jste obklopeni neviditelnou ochranou. Důvěřujte svému vnitřnímu hlasu a nebojte se udělat první krok. Andělé vás provázejí.',
        archetype: 'guidance'
    },
    hojnost: {
        name: 'Hojnost',
        keyword: 'Prosperita',
        text: 'Energie hojnosti proudí vaším životem. Otevřete se přijímání – ať už jde o lásku, příležitosti nebo uznání. Jste toho hodni.',
        archetype: 'guidance'
    },
    'novy-zacatek': {
        name: 'Nový začátek',
        keyword: 'Obnova',
        text: 'Jitřní energie nese poselství čerstvého startu. Co jste odkládali, nyní dostává zelenou. Důvěřujte procesu a jděte vpřed.',
        archetype: 'guidance'
    },
    'vnitrni-mir': {
        name: 'Vnitřní mír',
        keyword: 'Klid',
        text: 'Dnešní den volá po ztišení. Věnujte chvíli sobě, svému dechu a vnitřnímu prostoru. Z klidu vychází ta nejlepší rozhodnutí.',
        archetype: 'guidance'
    },
    odvaha: {
        name: 'Odvaha',
        keyword: 'Síla',
        text: 'Hvězdy vám dnes přidávají na odvaze. Je čas říct ano věcem, které jste se dosud báli. Vaše srdce zná správný směr.',
        archetype: 'guidance'
    },
    laska: {
        name: 'Láska',
        keyword: 'Spojení',
        text: 'Energie dne je prodchnuta láskou. Ať jde o vztah, přátelství nebo vztah k sobě – otevřete své srdce a lásku přijměte i dejte.',
        archetype: 'guidance'
    },
    intuice: {
        name: 'Intuice',
        keyword: 'Vhled',
        text: 'Váš šestý smysl je dnes obzvláště aktivní. Věřte prvním pocitům a nalézejte odpovědi uvnitř sebe, ne jen ve vnějším světě.',
        archetype: 'guidance'
    },
    transformace: {
        name: 'Transformace',
        keyword: 'Změna',
        text: 'Jako motýl procházíte proměnou. Nenechte se vystrašit tím, co se rozpadá – to, co přichází, je krásnější. Přijměte změnu s otevřenou náručí.',
        archetype: 'guidance'
    },
    vdecnost: {
        name: 'Vděčnost',
        keyword: 'Hojnost',
        text: 'Zastavte se a všimněte si všeho, za co můžete být vděční. Vděčnost otevírá dveře dalším darům. Dnešní den ocení i ty nejmenší věci.',
        archetype: 'guidance'
    },
    harmonie: {
        name: 'Harmonie',
        keyword: 'Rovnováha',
        text: 'Hledejte rovnováhu ve všech oblastech svého života. Harmonie přichází z vyrovnání vnitřního a vnějšího světa. Nenásilí a klid jsou vaše síla.',
        archetype: 'guidance'
    },
    vudce: {
        name: 'Vůdce',
        keyword: 'Vedení',
        text: 'Dnes vás ostatní přirozeně sledují. Vaše slova a činy mají větší váhu, než si myslíte. Buďte lídrem, jakým byste chtěli mít vzor.',
        archetype: 'guidance'
    },
    propojeni: {
        name: 'Propojení',
        keyword: 'Síť',
        text: 'Dnešní energie posiluje vaše vztahy a propojení s druhými. Nebojte se oslovit starého přítele nebo navázat nové kontakty – vesmír to podporuje.',
        archetype: 'guidance'
    },
    hojeni: {
        name: 'Hojení',
        keyword: 'Uzdravení',
        text: 'Zelená energie hojení prostupuje vaším tělem i duší. Je čas pustit staré rány a dovolit si plně se uzdravit. Jste na správné cestě.',
        archetype: 'guidance'
    },
    moudrost: {
        name: 'Moudrost',
        keyword: 'Poznání',
        text: 'Dnes vám jsou k dispozici hluboká moudrost a vhled. Naslouchejte starším, čtěte mezi řádky a hledejte smysl za povrchem věcí.',
        archetype: 'guidance'
    },
    radost: {
        name: 'Radost',
        keyword: 'Lehkost',
        text: 'Dnes si dovolte být lehcí a radostní. Hrajte si, smějte se, užijte si okamžik. Radost je vaším přirozeným stavem a právem.',
        archetype: 'guidance'
    },
    prulom: {
        name: 'Průlom',
        keyword: 'Zjevení',
        text: 'Dnes může přijít nečekané zjevení nebo průlom v situaci, která se zdála zablokovaná. Buďte otevření a pozorní – osvícení přichází náhle.',
        archetype: 'guidance'
    },
    duvera: {
        name: 'Důvěra',
        keyword: 'Víra',
        text: 'Důvěřujte procesu, i když nevidíte celý obraz. Vesmír pracuje za kulisami ve váš prospěch. Pusťte kontrolu a uvěřte, že vše dopadne dobře.',
        archetype: 'guidance'
    },
    kreativita: {
        name: 'Kreativita',
        keyword: 'Tvorba',
        text: 'Vaše kreativní energie je dnes na vrcholu. Vraťte se k projektu, který jste odkládali, nebo vyzkoušejte něco zcela nového. Tvořte!',
        archetype: 'guidance'
    },
    uvolneni: {
        name: 'Uvolnění',
        keyword: 'Tok',
        text: 'Přestaňte zadržovat dech a plavte s proudem. Uvolnění napětí a odporu vám otvírá cestu k snadnějšímu a radostnějšímu životu.',
        archetype: 'guidance'
    },
    zamer: {
        name: 'Záměr',
        keyword: 'Fokus',
        text: 'Jasně si definujte, co chcete. Dnešní energie podporuje záměry a manifesty. Napište si cíl nebo ho vyslovte nahlas – vesmír naslouchá.',
        archetype: 'guidance'
    },
    koreny: {
        name: 'Kořeny',
        keyword: 'Stabilita',
        text: 'Ukotvěte se ve svých kořenech – rodině, hodnotách, tradici. Síla vyrůstá ze stability a hlubokého zakotvení. Dnes oceňte, odkud pocházíte.',
        archetype: 'guidance'
    },
    zrcadlo: {
        name: 'Zrcadlo',
        keyword: 'Reflexe',
        text: 'Cokoliv vás dnes na druhých dráždí nebo nadchne, je zrcadlem vašeho vlastního nitra. Den pro sebereflexi a hluboké pochopení sebe sama.',
        archetype: 'guidance'
    },
    prijeti: {
        name: 'Přijetí',
        keyword: 'Soucit',
        text: 'Přijměte sebe i druhé přesně takovými, jací jsou. Dnešní den volá po soucitu namísto souzení. Z přijetí roste skutečná láska.',
        archetype: 'guidance'
    },
    zazrak: {
        name: 'Zázrak',
        keyword: 'Požehnání',
        text: 'Otevřete oči pro malé zázraky kolem sebe. Dnes je den, kdy se vesmír dává o sobě vědět skrze synchronicity a náhody. Žádné není.',
        archetype: 'guidance'
    },
    pratelstvi: {
        name: 'Přátelství',
        keyword: 'Komunita',
        text: 'Vaši přátelé jsou vaší rodinou, kterou si sami volíte. Dnes se ozvěte těm, na které myslíte. Jedno upřímné slovo může změnit celý den.',
        archetype: 'guidance'
    },
    ohraniceni: {
        name: 'Ohraničení',
        keyword: 'Hranice',
        text: 'Naučit se říkat ne je akt lásky k sobě samému. Dnes posilujte zdravé hranice – bez viny, bez omluv. Vaše energie je darem, ne povinností.',
        archetype: 'guidance'
    },
    vizionar: {
        name: 'Vizionář',
        keyword: 'Vize',
        text: 'Povzneste pohled nad každodennost. Jaká je vaše velká vize? Dnešní den přeje snění, plánování a nastavování smělých cílů.',
        archetype: 'guidance'
    },
    hravost: {
        name: 'Hravost',
        keyword: 'Spontánnost',
        text: 'Je čas přerušit rutinu a vnést do dne trochu překvapení. Buďte spontánní, hraví, nebojte se vypadat trochu bláznivě. Život je příliš krátký na vážnost.',
        archetype: 'guidance'
    },
    'propojen-se-zemi': {
        name: 'Propojen se zemí',
        keyword: 'Zemění',
        text: 'Vyjděte ven, dotkněte se přírody, zhluboka dýchejte. Zemský magnetismus vám dodá sílu a jasnost mysli. Příroda je vaším nejlepším lékem.',
        archetype: 'guidance'
    },
    paradox: {
        name: 'Paradox',
        keyword: 'Tajemství',
        text: 'Ne vše musí být ihned vysvětleno. Dnes se smiřte s nejistotou a mysteriem. Pravda má mnoho vrstev – ponořte se do hlubiny bez strachu.',
        archetype: 'guidance'
    },
    vitez: {
        name: 'Vítěz',
        keyword: 'Úspěch',
        text: 'Vaše vytrvalost byla oceněna. Dnes celebrujte svůj pokrok – i ten nejmenší úspěch si zaslouží uznání. Jste na správné cestě k vítězství.',
        archetype: 'guidance'
    }
};

function setBlockVisible(element, visible) {
    if (!element) return;
    element.hidden = !visible;
    element.classList.toggle('mh-block-visible', visible);
}

function getVisibleCookieBannerOffset() {
    const banner = document.getElementById('cookie-banner');
    if (!banner || banner.hidden || !banner.classList.contains('visible')) return 0;

    const viewportHeight = window.visualViewport?.height || window.innerHeight;
    const rect = banner.getBoundingClientRect();
    return Math.max(0, viewportHeight - rect.top + 16);
}

function scrollAngelResultsIntoView(behavior = 'smooth') {
    const results = document.getElementById('angel-results');
    if (!results?.classList.contains('mh-block-visible')) return;

    const viewportHeight = window.visualViewport?.height || window.innerHeight;
    const reservedBottom = getVisibleCookieBannerOffset();
    const availableHeight = Math.max(320, viewportHeight - reservedBottom);
    const resultsRect = results.getBoundingClientRect();
    let targetTop = window.scrollY + resultsRect.top - Math.max(86, (availableHeight - resultsRect.height) / 2);
    const action = document.getElementById('angel-deep-action') || document.getElementById('btn-deep-angel');

    if (reservedBottom && action) {
        const bannerTop = viewportHeight - reservedBottom + 16;
        const actionRect = action.getBoundingClientRect();
        const predictedActionBottom = actionRect.bottom - (targetTop - window.scrollY);
        const overlap = predictedActionBottom - (bannerTop - 8);
        if (overlap > 0) {
            targetTop += overlap;
        }
    }

    window.scrollTo({
        top: Math.max(0, targetTop),
        behavior
    });
}

function scheduleMobileAngelResultsScroll(behavior = 'smooth') {
    if (!window.matchMedia('(max-width: 700px)').matches) return;

    scrollAngelResultsIntoView(behavior);
    setTimeout(() => scrollAngelResultsIntoView(behavior), 320);
    setTimeout(() => scrollAngelResultsIntoView(behavior), 900);
    setTimeout(() => scrollAngelResultsIntoView(behavior), 1600);
}

function setCardBack(backEl, card) {
    if (!backEl || !card) return;

    const archetype = card.archetype || 'guidance';
    backEl.className = `angel-card-back angel-card-back--${archetype}`;
    if (card.dailyImageSlug) {
        backEl.classList.add('angel-card-back--daily', `angel-card-back--daily-${card.dailyImageSlug}`);
    }
    backEl.innerHTML = `
        <div class="angel-card-overlay"></div>
        <div class="angel-card-content">
            <div class="angel-card-sparkle">✨</div>
            <h3 class="angel-name">${card.name}</h3>
            <div class="angel-theme">${card.theme}</div>
        </div>
    `;
}

function animateCardTilt(inner, transform) {
    if (!inner) return;
    inner.animate([
        { transform }
    ], {
        duration: 120,
        easing: 'ease-out',
        fill: 'forwards'
    });
}

function cancelCardTilt(inner) {
    if (!inner) return;
    inner.getAnimations().forEach(animation => animation.cancel());
}

function apiBase() {
    return window.API_CONFIG?.BASE_URL || '/api';
}

function getStoredDailyCard(slug) {
    try {
        const saved = JSON.parse(localStorage.getItem('mh_kdd_card') || 'null');
        if (saved?.slug === slug && saved?.card) return saved.card;
    } catch (error) {
        if (window.MH_DEBUG) console.debug('Stored daily card read failed:', error);
    }
    return null;
}

function getDailyCardFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const slug = params.get('daily_card');
    if (!slug) return null;

    const sourceCard = getStoredDailyCard(slug) || DAILY_CARD_FALLBACKS[slug];
    if (!sourceCard) return null;

    return {
        id: `daily_${slug}`,
        name: sourceCard.name,
        theme: sourceCard.keyword || sourceCard.theme || 'Denní symbol',
        short_message: sourceCard.text || sourceCard.short_message || '',
        archetype: sourceCard.archetype || 'guidance',
        dailyImageSlug: slug,
        isDailyCardDetail: true
    };
}

function buildAngelUpgradeUrl(source) {
    const pricingUrl = new URL('/cenik.html', window.location.origin);
    pricingUrl.searchParams.set('plan', 'pruvodce');
    pricingUrl.searchParams.set('source', source);
    pricingUrl.searchParams.set('feature', 'andelske_karty_hluboky_vhled');
    pricingUrl.searchParams.set('entry_source', source);
    pricingUrl.searchParams.set('entry_feature', 'andelske_karty_hluboky_vhled');
    return `${pricingUrl.pathname}${pricingUrl.search}`;
}

function startAngelUpgradeFlow(source, authMode = 'register') {
    window.MH_ANALYTICS?.trackCTA?.(source, {
        plan_id: 'pruvodce',
        feature: 'andelske_karty_hluboky_vhled'
    });

    if (window.Auth?.startPlanCheckout) {
        window.Auth.startPlanCheckout('pruvodce', {
            source,
            feature: 'andelske_karty_hluboky_vhled',
            metadata: {
                entry_source: source,
                entry_feature: 'andelske_karty_hluboky_vhled'
            },
            redirect: '/cenik.html',
            authMode
        });
        return;
    }

    window.location.href = buildAngelUpgradeUrl(source);
}

function getDeepInsightHost() {
    return document.querySelector('#angel-results .message-box') || document.getElementById('angel-results');
}

function ensureDeepInsightElements() {
    const host = getDeepInsightHost();
    if (!host) return {};

    let action = document.getElementById('angel-deep-action');
    if (!action) {
        action = document.createElement('div');
        action.id = 'angel-deep-action';
        action.className = 'mt-lg text-center angel-deep-action';

        const button = document.createElement('button');
        button.id = 'btn-deep-angel';
        button.className = 'btn btn--primary';
        button.type = 'button';
        button.textContent = 'Získat hluboký vhled';
        button.addEventListener('click', requestDeepInsight);

        action.appendChild(button);
        const shareAction = document.getElementById('btn-share-card')?.closest('div');
        if (shareAction && shareAction.parentElement === host) {
            host.insertBefore(action, shareAction);
        } else {
            host.appendChild(action);
        }
    }

    let response = document.getElementById('angel-ai-response');
    if (!response) {
        response = document.createElement('div');
        response.id = 'angel-ai-response';
        response.className = 'angel-ai-response mt-lg';
        response.hidden = true;
        host.appendChild(response);
    }

    return { action, response };
}

function renderDeepInsightText(container, text) {
    container.textContent = '';
    const content = String(text || '').trim();
    const looksLikeHtml = /<\/?[a-z][\s\S]*>/i.test(content);

    if (looksLikeHtml && window.DOMPurify) {
        container.innerHTML = window.DOMPurify.sanitize(content, {
            ALLOWED_TAGS: ['div', 'h4', 'p', 'ul', 'li', 'em', 'strong', 'b', 'i', 'br', 'span'],
            ALLOWED_ATTR: ['class']
        });
        container.hidden = false;
        container.classList.add('mh-block-visible');
        return;
    }

    content
        .split(/\n{2,}/)
        .map(part => part.trim())
        .filter(Boolean)
        .forEach(part => {
            const paragraph = document.createElement('p');
            paragraph.textContent = part.replace(/\*\*/g, '');
            container.appendChild(paragraph);
        });
    container.hidden = false;
    container.classList.add('mh-block-visible');
}

function appendFavoriteAction(container, readingId) {
    if (!container || !readingId || document.getElementById('favorite-angel-card-btn')) return;

    const action = document.createElement('div');
    action.className = 'text-center favorite-reading-action';
    action.innerHTML = `
        <button id="favorite-angel-card-btn" class="btn btn--glass favorite-reading-action__button">
            <span class="favorite-icon">☆</span> Přidat do oblíbených
        </button>
    `;
    container.appendChild(action);

    action.querySelector('#favorite-angel-card-btn')?.addEventListener('click', async () => {
        if (typeof window.toggleFavorite === 'function') {
            await window.toggleFavorite(readingId, 'favorite-angel-card-btn');
        }
    });
}

async function requestDeepInsight() {
    if (!drawnCard) return;

    if (!window.Auth?.isLoggedIn?.()) {
        window.Auth?.showToast?.('Přihlášení vyžadováno', 'Hluboký vhled k andělské kartě je dostupný po přihlášení.', 'info');
        startAngelUpgradeFlow('angel_card_auth_gate', 'register');
        return;
    }

    if (!window.Auth?.isPremium?.()) {
        window.Auth?.showToast?.('Premium vyžadováno', 'Hluboký vhled je dostupný pro Hvězdné Průvodce.', 'info');
        startAngelUpgradeFlow('angel_card_premium_gate', 'login');
        return;
    }

    const { response } = ensureDeepInsightElements();
    const button = document.getElementById('btn-deep-angel');
    if (!response || !button) return;

    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = 'Andělé předávají vhled...';
    response.hidden = false;
    response.textContent = 'Naslouchám poselství karty...';

    try {
        const csrfToken = window.getCSRFToken ? await window.getCSRFToken() : null;
        const res = await fetch(`${apiBase()}/angel-card`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                ...(csrfToken && { 'X-CSRF-Token': csrfToken })
            },
            body: JSON.stringify({
                card: drawnCard,
                intention: 'hluboký vhled k andělské kartě'
            })
        });

        const data = await res.json();

        if (res.status === 401 || res.status === 402 || res.status === 403 || data.isTeaser) {
            startAngelUpgradeFlow('angel_card_api_gate', 'login');
            response.hidden = true;
            return;
        }

        if (!res.ok || !data.success) {
            throw new Error(data.error || 'Nepodařilo se načíst hluboký vhled.');
        }

        renderDeepInsightText(response, data.response);

        if (window.Auth?.saveReading) {
            const saveResult = await window.Auth.saveReading('angel-card', {
                card: {
                    name: drawnCard.name,
                    theme: drawnCard.theme,
                    message: drawnCard.message
                },
                intention: 'hluboký vhled k andělské kartě',
                response: data.response,
                fallback: !!data.fallback
            });

            if (saveResult?.id) {
                appendFavoriteAction(response, saveResult.id);
            }
        }

        scrollAngelResultsIntoView();
    } catch (error) {
        console.error('Angel deep insight failed:', error);
        response.textContent = 'Hluboký vhled se teď nepodařilo načíst. Zkuste to prosím znovu.';
    } finally {
        button.disabled = false;
        button.textContent = originalText;
    }
}

// Initialization
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Load card database
    try {
        const res = await fetch('/data/angel-cards.json');
        if (!res.ok) throw new Error('Nepodařilo se načíst databázi karet.');
        angelCardsData = await res.json();
    } catch (error) {
        console.error('Error loading angel cards:', error);
        alert('Došlo k chybě při načítání karet. Zkuste prosím obnovit stránku.');
        return;
    }

    // 2. Homepage daily-card deep links are already a chosen card, so open them revealed.
    const linkedDailyCard = getDailyCardFromUrl();
    if (linkedDailyCard) {
        drawnCard = linkedDailyCard;
        revealPreDrawnCard({
            message: `Tvoje andělská karta: ${linkedDailyCard.name}`
        });
    } else {
        checkDailyLock();
    }

    // 3. Attach listeners
    const drawBtn = document.getElementById('draw-btn');
    if (drawBtn) {
        drawBtn.addEventListener('click', drawCard);
        drawBtn.addEventListener('keydown', event => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault();
            drawCard();
        });

        drawBtn.addEventListener('mousemove', handleMouseMove);
        drawBtn.addEventListener('mouseleave', () => {
            const inner = drawBtn.querySelector('.angel-card-inner');
            if (inner && !drawBtn.classList.contains('is-flipped')) {
                animateCardTilt(inner, 'rotateX(0deg) rotateY(0deg)');
            }
        });
    }

    const shareBtn = document.getElementById('btn-share-card');
    if (shareBtn) {
        shareBtn.addEventListener('click', shareCard);
    }

    window.addEventListener('mh_cookie_banner_visible', () => {
        scheduleMobileAngelResultsScroll();
    });
});

/**
 * Handles sharing the drawn card using the Web Share API if available.
 */
function shareCard() {
    if (!drawnCard) return;

    const shareTitle = `Moje andělská karta: ${drawnCard.name} ✨`;
    const shareText = `Dnes mě provází anděl ${drawnCard.name} s tématem: ${drawnCard.theme}. Zjistěte, jaká karta čeká na vás na Mystické Hvězdě! 🕊️`;
    const shareUrl = window.location.href;

    if (navigator.share) {
        navigator.share({
            title: shareTitle,
            text: shareText,
            url: shareUrl
        }).catch(err => {
            console.warn('Share API failed:', err);
        });
    } else {
        // Fallback for desktop/unsupported browsers
        navigator.clipboard.writeText(`${shareTitle}\n\n${shareText}\n${shareUrl}`).then(() => {
            alert('Odkaz a poselství byly zkopírovány do schránky! Můžete je vložit přátelům.');
        }).catch(err => {
            console.error('Clipboard failed', err);
            alert('Bohužel se nepodařilo zkopírovat odkaz.');
        });
    }
}

/**
 * Checks if the user has already drawn a card today and sets up the UI accordingly.
 */
function checkDailyLock() {
    const today = new Date().toISOString().split('T')[0];
    const savedDataStr = localStorage.getItem('angelCardDaily');

    if (savedDataStr) {
        try {
            const savedData = JSON.parse(savedDataStr);
            if (savedData.date === today && savedData.cardData) {
                // User already drew a card today
                drawnCard = savedData.cardData;
                revealPreDrawnCard();
            } else {
                // Different day, clear the old reading to be safe
                localStorage.removeItem('angelCardDaily');
            }
        } catch (e) {
            console.error('Error parsing daily card:', e);
            localStorage.removeItem('angelCardDaily');
        }
    }
}

/**
 * Bypasses the animation for returning users and shows their already drawn card.
 */
function revealPreDrawnCard(options = {}) {
    const container = document.getElementById('draw-btn');
    if (!container) return;

    // Populate Back of Card
    const backEl = container.querySelector('.angel-card-back');
    if (backEl) {
        setCardBack(backEl, drawnCard);
    }

    // Populate Results Area
    const shortMessageEl = document.getElementById('angel-short-message');
    if (shortMessageEl) {
        shortMessageEl.textContent = drawnCard.short_message;
    }

    // Skip animation lock
    const inner = container.querySelector('.angel-card-inner');
    if (inner) cancelCardTilt(inner);
    // Turn off transition temporarily so it just appears flipped
    if (inner) inner.classList.add('angel-card-inner--no-transition');

    container.classList.add('is-flipped');
    container.classList.remove('glow-effect');
    container.classList.add('angel-card-container--drawn');

    // Show results section immediately
    const intro = document.getElementById('angel-intro');
    if (intro) {
        const introTexts = intro.querySelectorAll('p');
        introTexts.forEach(p => {
            p.hidden = true;
        });

        // Add a small title for returning users
        intro.querySelector('.angel-return-message')?.remove();
        const returnMsg = document.createElement('p');
        returnMsg.className = 'mb-xl text-lg w-mx-md mx-auto angel-return-message';
        const returnMessage = options.message || 'Tvoje andělská karta pro dnešek už je otevřená...';
        const emphasis = document.createElement('em');
        emphasis.textContent = returnMessage;
        returnMsg.appendChild(emphasis);
        intro.prepend(returnMsg);
    }

    const results = document.getElementById('angel-results');
    if (results) {
        setBlockVisible(results, true);
        results.classList.add('animate-in');
        requestAnimationFrame(() => scheduleMobileAngelResultsScroll('auto'));
    }

    ensureDeepInsightElements();

    // Restore transition after a tiny delay so future interactions aren't broken
    setTimeout(() => {
        if (inner) inner.classList.remove('angel-card-inner--no-transition');
    }, 50);
}

/**
 * Creates a subtle 3D tilt effect before drawing
 */
function handleMouseMove(e) {
    const cardEl = e.currentTarget;
    if (cardEl.classList.contains('is-flipped')) return;

    const rect = cardEl.getBoundingClientRect();
    const x = e.clientX - rect.left; // x position within the element
    const y = e.clientY - rect.top; // y position within the element

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -10; // Max 10 deg rotation
    const rotateY = ((x - centerX) / centerX) * 10;

    const inner = cardEl.querySelector('.angel-card-inner');
    if (inner) {
        animateCardTilt(inner, `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`);
    }
}

/**
 * Draws a random angel card and triggers the flip animation
 */
function drawCard() {
    const container = document.getElementById('draw-btn');
    if (container.classList.contains('is-flipped')) return; // Already drawn

    const hasPreselectedDailyCard = Boolean(drawnCard?.isDailyCardDetail);

    if (!hasPreselectedDailyCard) {
        // Select random card
        const randomIndex = Math.floor(Math.random() * angelCardsData.length);
        drawnCard = angelCardsData[randomIndex];

        // Save to Daily Lock
        const today = new Date().toISOString().split('T')[0];
        localStorage.setItem('angelCardDaily', JSON.stringify({
            date: today,
            cardData: drawnCard
        }));
    }

    // Populate Back of Card
    const backEl = container.querySelector('.angel-card-back');
    if (backEl) {
        // We will use a soft abstract background image or CSS gradient
        setCardBack(backEl, drawnCard);
    }

    // Populate Results Area
    const shortMessageEl = document.getElementById('angel-short-message');
    if (shortMessageEl) {
        shortMessageEl.textContent = drawnCard.short_message;
    }

    // Trigger Flip
    // Reset any transform from mouse move
    const inner = container.querySelector('.angel-card-inner');
    if (inner) cancelCardTilt(inner);

    container.classList.add('is-flipped');
    container.classList.remove('glow-effect');
    container.classList.add('angel-card-container--drawn');

    // Show results section after flip completes smoothly
    setTimeout(() => {
        const intro = document.getElementById('angel-intro');
        if (intro) {
            // Hide intro text
            const introTexts = intro.querySelectorAll('p');
            introTexts.forEach(p => p.classList.add('angel-intro-text--hidden'));
        }

        const results = document.getElementById('angel-results');
        if (results) {
            setBlockVisible(results, true);
            // Trigger animation frame
            requestAnimationFrame(() => {
                results.classList.add('animate-in');
                ensureDeepInsightElements();
                scheduleMobileAngelResultsScroll();
            });
        }
    }, 800);
}
