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

    function wrapCanvasText(ctx, text, maxWidth) {
        const words = String(text || '').split(/\s+/).filter(Boolean);
        const lines = [];
        let current = '';

        words.forEach((word) => {
            const test = current ? `${current} ${word}` : word;
            if (ctx.measureText(test).width <= maxWidth) {
                current = test;
            } else {
                if (current) lines.push(current);
                current = word;
            }
        });

        if (current) lines.push(current);
        return lines;
    }

    function drawCenteredLines(ctx, lines, x, y, lineHeight, maxLines = lines.length) {
        lines.slice(0, maxLines).forEach((line, index) => {
            ctx.fillText(line, x, y + index * lineHeight);
        });
        return y + Math.min(lines.length, maxLines) * lineHeight;
    }

    function drawSeededStars(ctx, seed, width, height) {
        for (let i = 0; i < 220; i += 1) {
            const rawX = (Math.sin(seed + i * 12.9898) * 43758.5453) % 1;
            const rawY = (Math.sin(seed + i * 78.233) * 24634.6345) % 1;
            const x = Math.abs(rawX) * width;
            const y = Math.abs(rawY) * height * 0.74;
            const radius = i % 10 === 0 ? 2.4 : 1.2;
            ctx.fillStyle = i % 7 === 0 ? 'rgba(230,195,80,0.76)' : 'rgba(235,240,255,0.72)';
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function loadCanvasImage(src) {
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = () => reject(new Error(`Image failed: ${src}`));
            image.src = src;
        });
    }

    function drawImageContain(ctx, image, x, y, width, height) {
        const ratio = Math.min(width / image.naturalWidth, height / image.naturalHeight);
        const drawWidth = image.naturalWidth * ratio;
        const drawHeight = image.naturalHeight * ratio;
        const drawX = x + (width - drawWidth) / 2;
        const drawY = y + (height - drawHeight) / 2;
        ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
    }

    async function drawDailyTarotResultCard(card) {
        const canvas = document.createElement('canvas');
        canvas.width = 1080;
        canvas.height = 1350;
        const ctx = canvas.getContext('2d');
        const centerX = canvas.width / 2;
        const seed = getLocalDateKey().split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)
            + String(card.name || '').length * 31;

        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#151039');
        gradient.addColorStop(0.46, '#070716');
        gradient.addColorStop(1, '#050510');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        drawSeededStars(ctx, seed, canvas.width, canvas.height);

        ctx.strokeStyle = 'rgba(212,175,55,0.84)';
        ctx.lineWidth = 5;
        ctx.strokeRect(54, 54, canvas.width - 108, canvas.height - 108);
        ctx.strokeStyle = 'rgba(212,175,55,0.34)';
        ctx.lineWidth = 2;
        ctx.strokeRect(78, 78, canvas.width - 156, canvas.height - 156);

        ctx.textAlign = 'center';
        ctx.fillStyle = '#d4af37';
        ctx.font = '600 42px Inter, Arial, sans-serif';
        ctx.fillText('Mystická Hvězda', centerX, 142);

        ctx.fillStyle = '#f1d06b';
        ctx.font = '700 48px Cinzel, Georgia, serif';
        ctx.fillText('TAROT KARTA DNE', centerX, 224);

        ctx.fillStyle = 'rgba(255,255,255,0.72)';
        ctx.font = '500 30px Inter, Arial, sans-serif';
        ctx.fillText(getLocalDateKey(), centerX, 272);

        let cardImage = null;
        try {
            cardImage = await loadCanvasImage(card.image || 'img/tarot/tarot_card_back_straight_v2.webp');
        } catch (error) {
            console.warn('[Tarot karta dne] Image export fallback:', error.message);
        }

        const cardBox = { x: 362, y: 330, width: 356, height: 520 };
        ctx.fillStyle = 'rgba(212,175,55,0.12)';
        ctx.fillRect(cardBox.x - 18, cardBox.y - 18, cardBox.width + 36, cardBox.height + 36);
        ctx.strokeStyle = 'rgba(212,175,55,0.58)';
        ctx.lineWidth = 3;
        ctx.strokeRect(cardBox.x - 18, cardBox.y - 18, cardBox.width + 36, cardBox.height + 36);
        if (cardImage) {
            drawImageContain(ctx, cardImage, cardBox.x, cardBox.y, cardBox.width, cardBox.height);
        } else {
            ctx.fillStyle = 'rgba(255,255,255,0.08)';
            ctx.fillRect(cardBox.x, cardBox.y, cardBox.width, cardBox.height);
        }

        ctx.fillStyle = '#fff7d6';
        ctx.font = '700 58px Cinzel, Georgia, serif';
        drawCenteredLines(ctx, wrapCanvasText(ctx, card.name, 820), centerX, 935, 66, 2);

        ctx.fillStyle = '#f6f1ff';
        ctx.font = '500 36px Inter, Arial, sans-serif';
        const meaning = card.meaning || 'Symbol pro dnešní energii.';
        let y = drawCenteredLines(ctx, wrapCanvasText(ctx, meaning, 820), centerX, 1036, 47, 3);

        ctx.fillStyle = 'rgba(212,175,55,0.88)';
        ctx.fillRect(180, y + 18, 720, 3);
        y += 82;

        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.font = '500 31px Inter, Arial, sans-serif';
        drawCenteredLines(ctx, wrapCanvasText(ctx, dailyAdvice(card), 820), centerX, y, 42, 3);

        ctx.fillStyle = 'rgba(255,255,255,0.78)';
        ctx.font = '500 30px Inter, Arial, sans-serif';
        ctx.fillText('mystickahvezda.cz/tarot-karta-dne.html', centerX, 1244);
        ctx.fillStyle = 'rgba(212,175,55,0.9)';
        ctx.font = '600 26px Inter, Arial, sans-serif';
        ctx.fillText('Ulož si dnešní symbol nebo ho pošli někomu, kdo ho potřebuje.', centerX, 1282);

        return canvas;
    }

    async function saveDailyCardImage(saveButton, card) {
        if (!card) return;

        const previousText = saveButton.textContent;
        saveButton.disabled = true;
        saveButton.textContent = 'Připravuji obrázek...';

        try {
            const canvas = await drawDailyTarotResultCard(card);
            const link = document.createElement('a');
            link.download = `tarot-karta-dne-${slugify(card.name)}-${getLocalDateKey()}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            saveButton.textContent = 'Obrázek uložen';
            trackDailyCard('tarot_daily_card_image_saved', card.name, { format: 'png' });
        } catch (error) {
            console.warn('[Tarot karta dne] Save image failed:', error.message);
            saveButton.textContent = 'Zkusit znovu';
        } finally {
            setTimeout(() => {
                saveButton.disabled = false;
                saveButton.textContent = previousText;
            }, 1400);
        }
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

    function setupSaveImageButton(saveButton, card) {
        if (!saveButton) return;

        saveButton.hidden = false;
        saveButton.onclick = () => saveDailyCardImage(saveButton, card);
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
        window.__lastTarotDailyShareResult = card;
        setupSaveImageButton(elements.saveImage, card);
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
            saveImage: document.getElementById('tarot-daily-save-image'),
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
