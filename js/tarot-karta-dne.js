(() => {
    const DATA_URL = 'data/tarot-cards.json';
    const SOURCE = 'tarot_daily_card_widget';
    const FEATURE = 'tarot';

    function getLocalDateKey(date = new Date()) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function getDailyIndex(cardCount) {
        const key = getLocalDateKey();
        let hash = 0;
        for (let i = 0; i < key.length; i += 1) {
            hash = ((hash << 5) - hash + key.charCodeAt(i)) | 0;
        }
        return Math.abs(hash) % cardCount;
    }

    function slugify(value) {
        return String(value || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    function buildToolUrl(cardName) {
        const url = new URL('/tarot.html', window.location.origin);
        url.searchParams.set('source', SOURCE);
        url.searchParams.set('feature', FEATURE);
        url.searchParams.set('intent', 'daily_card');
        url.searchParams.set('card', cardName);
        return `${url.pathname}${url.search}`;
    }

    function buildDetailUrl(cardName) {
        const url = new URL(`/tarot-vyznam/${slugify(cardName)}.html`, window.location.origin);
        url.searchParams.set('source', SOURCE);
        return `${url.pathname}${url.search}`;
    }

    function trackDailyCard(eventName, cardName, extra = {}) {
        window.MH_ANALYTICS?.trackAction?.(eventName, {
            source: SOURCE,
            feature: FEATURE,
            card: cardName,
            date_key: getLocalDateKey(),
            ...extra
        });
    }

    function dailyAdvice(card) {
        const meaning = String(card.meaning || '').toLowerCase();
        return meaning
            ? `Konkrétní krok: všimněte si dnes tématu „${meaning}“ a udělejte jednu malou věc, která s ním bude v souladu.`
            : 'Konkrétní krok: vezměte kartu jako jemnou připomínku a vyberte si jednu věc, kterou dnes nebudete odkládat.';
    }

    async function loadCards() {
        const response = await fetch(DATA_URL, { credentials: 'same-origin' });
        if (!response.ok) throw new Error(`Tarot data failed: ${response.status}`);
        const cards = await response.json();
        return Object.entries(cards).map(([name, card]) => ({ name, ...card }));
    }

    function setupShareButton(shareButton, cardName, card) {
        if (!shareButton) return;

        shareButton.hidden = false;
        shareButton.onclick = async () => {
            const text = `Moje tarot karta dne: ${cardName}. ${card.meaning || ''}`.trim();
            const shareUrl = new URL(window.location.href);
            shareUrl.hash = 'denni-karta';

            try {
                if (navigator.share) {
                    await navigator.share({
                        title: `Tarot karta dne: ${cardName}`,
                        text,
                        url: shareUrl.toString()
                    });
                } else if (navigator.clipboard?.writeText) {
                    await navigator.clipboard.writeText(`${text} ${shareUrl}`);
                    shareButton.textContent = 'Zkopírováno';
                    setTimeout(() => { shareButton.textContent = 'Sdílet kartu'; }, 1800);
                }
                trackDailyCard('tarot_daily_card_shared', cardName);
            } catch (error) {
                if (error.name !== 'AbortError') {
                    console.warn('[Tarot karta dne] Share failed:', error.message);
                }
            }
        };
    }

    function revealCard(card, elements) {
        elements.result.dataset.state = 'revealed';
        elements.image.src = card.image || 'img/tarot/tarot_card_back_straight_v2.webp';
        elements.image.alt = `Tarot karta dne: ${card.name}`;
        elements.date.textContent = `Karta pro ${getLocalDateKey()}`;
        elements.name.textContent = card.name;
        elements.meaning.textContent = card.meaning || 'Symbol pro dnešní energii.';
        elements.advice.textContent = dailyAdvice(card);
        elements.fullReading.href = buildToolUrl(card.name);
        elements.detail.href = buildDetailUrl(card.name);
        elements.button.textContent = 'Zobrazit znovu dnešní kartu';
        setupShareButton(elements.share, card.name, card);
        trackDailyCard('tarot_daily_card_revealed', card.name);
    }

    async function initDailyTarotCard() {
        const elements = {
            button: document.getElementById('tarot-daily-reveal'),
            result: document.getElementById('tarot-daily-card-result'),
            image: document.getElementById('tarot-daily-card-image'),
            date: document.getElementById('tarot-daily-date'),
            name: document.getElementById('tarot-daily-card-name'),
            meaning: document.getElementById('tarot-daily-card-meaning'),
            advice: document.getElementById('tarot-daily-card-advice'),
            fullReading: document.getElementById('tarot-daily-full-reading'),
            detail: document.getElementById('tarot-daily-card-detail'),
            share: document.getElementById('tarot-daily-share')
        };

        if (!elements.button || !elements.result || !elements.image) return;

        try {
            elements.button.disabled = true;
            elements.button.textContent = 'Načítám kartu...';
            const cards = await loadCards();
            if (cards.length === 0) throw new Error('Tarot data is empty');
            const card = cards[getDailyIndex(cards.length)];
            elements.button.disabled = false;
            elements.button.textContent = 'Otočit kartu dne';
            elements.button.addEventListener('click', () => revealCard(card, elements));
        } catch (error) {
            console.warn('[Tarot karta dne] Could not load daily card:', error.message);
            elements.button.disabled = false;
            elements.button.textContent = 'Přejít do tarotu';
            elements.button.addEventListener('click', () => {
                window.location.href = 'tarot.html?source=tarot_daily_card_widget_error&feature=tarot&intent=daily_card';
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initDailyTarotCard);
    } else {
        initDailyTarotCard();
    }
})();
