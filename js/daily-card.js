// js/daily-card.js
(function () {
    const CARDS = [
        { name: 'Andělé Ochránci', emoji: '👼', keyword: 'Ochrana', text: 'Dnes jste obklopeni neviditelnou ochranou. Důvěřujte svému vnitřnímu hlasu a nebojte se udělat první krok. Andělé vás provázejí.', link: 'andelska-cisla.html' },
        { name: 'Hojnost', emoji: '🌟', keyword: 'Prosperita', text: 'Energie hojnosti proudí vaším životem. Otevřete se přijímání – ať už jde o lásku, příležitosti nebo uznání. Jste toho hodni.', link: 'hojnost.html' },
        { name: 'Nový začátek', emoji: '🌱', keyword: 'Obnova', text: 'Jitřní energie nese poselství čerstvého startu. Co jste odkládali, nyní dostává zelenou. Důvěřujte procesu a jděte vpřed.', link: 'tarot-blazen.html' },
        { name: 'Vnitřní mír', emoji: '☮️', keyword: 'Klid', text: 'Dnešní den volá po ztišení. Věnujte chvíli sobě, svému dechu a vnitřnímu prostoru. Z klidu vychází ta nejlepší rozhodnutí.', link: 'anahata.html' },
        { name: 'Odvaha', emoji: '🦁', keyword: 'Síla', text: 'Hvězdy vám dnes přidávají na odvaze. Je čas říct ano věcem, které jste se dosud báli. Vaše srdce zná správný směr.', link: 'tiwaz.html' },
        { name: 'Láska', emoji: '❤️', keyword: 'Spojení', text: 'Energie dne je prodchnuta láskou. Ať jde o vztah, přátelství nebo vztah k sobě – otevřete své srdce a lásku přijměte i dejte.', link: 'anahata.html' },
        { name: 'Intuice', emoji: '🔮', keyword: 'Vhled', text: 'Váš šestý smysl je dnes obzvláště aktivní. Věřte prvním pocitům a nalézejte odpovědi uvnitř sebe, ne jen ve vnějším světě.', link: 'muladhara.html' },
        { name: 'Transformace', emoji: '🦋', keyword: 'Změna', text: 'Jako motýl procházíte proměnou. Nenechte se vystrašit tím, co se rozpadá – to, co přichází, je krásnější. Přijměte změnu s otevřenou náručí.', link: 'reinkarnace.html' },
        { name: 'Vděčnost', emoji: '🙏', keyword: 'Hojnost', text: 'Zastavte se a všimněte si všeho, za co můžete být vděční. Vděčnost otevírá dveře dalším darům. Dnešní den ocení i ty nejmenší věci.', link: 'synchronicita.html' },
        { name: 'Harmonie', emoji: '⚖️', keyword: 'Rovnováha', text: 'Hledejte rovnováhu ve všech oblastech svého života. Harmonie přichází z vyrovnání vnitřního a vnějšího světa. Nenásilí a klid jsou vaše síla.', link: 'karma.html' },
        { name: 'Vůdce', emoji: '👑', keyword: 'Vedení', text: 'Dnes vás ostatní přirozeně sledují. Vaše slova a činy mají větší váhu, než si myslíte. Buďte lídrem, jakým byste chtěli mít vzor.', link: 'velka-arkana.html' },
        { name: 'Propojení', emoji: '🌐', keyword: 'Síť', text: 'Dnešní energie posiluje vaše vztahy a propojení s druhými. Nebojte se oslovit starého přítele nebo navázat nové kontakty – vesmír to podporuje.', link: 'synchronicita.html' },
        { name: 'Hojení', emoji: '💚', keyword: 'Uzdravení', text: 'Zelená energie hojení prostupuje vaším tělem i duší. Je čas pustit staré rány a dovolit si plně se uzdravit. Jste na správné cestě.', link: 'anahata.html' },
        { name: 'Moudrost', emoji: '🦉', keyword: 'Poznání', text: 'Dnes vám jsou k dispozici hluboká moudrost a vhled. Naslouchejte starším, čtěte mezi řádky a hledejte smysl za povrchem věcí.', link: 'akasicke-zaznamy.html' },
        { name: 'Radost', emoji: '😊', keyword: 'Lehkost', text: 'Dnes si dovolte být lehcí a radostní. Hrajte si, smějte se, užijte si okamžik. Radost je vaším přirozeným stavem a právem.', link: 'mala-arkana.html' },
        { name: 'Průlom', emoji: '⚡', keyword: 'Zjevení', text: 'Dnes může přijít nečekané zjevení nebo průlom v situaci, která se zdála zablokovaná. Buďte otevření a pozorní – osvícení přichází náhle.', link: 'aspekty.html' },
        { name: 'Důvěra', emoji: '🤝', keyword: 'Víra', text: 'Důvěřujte procesu, i když nevidíte celý obraz. Vesmír pracuje za kulisami ve váš prospěch. Pusťte kontrolu a uvěřte, že vše dopadne dobře.', link: 'nativni-karta.html' },
        { name: 'Kreativita', emoji: '🎨', keyword: 'Tvorba', text: 'Vaše kreativní energie je dnes na vrcholu. Vraťte se k projektu, který jste odkládali, nebo vyzkoušejte něco zcela nového. Tvořte!', link: 'svadhisthana.html' },
        { name: 'Uvolnění', emoji: '🌊', keyword: 'Tok', text: 'Přestaňte zadržovat dech a plavte s proudem. Uvolnění napětí a odporu vám otvírá cestu k snadnějšímu a radostnějšímu životu.', link: 'lucidni-sen.html' },
        { name: 'Záměr', emoji: '🎯', keyword: 'Fokus', text: 'Jasně si definujte, co chcete. Dnešní energie podporuje záměry a manifesty. Napište si cíl nebo ho vyslovte nahlas – vesmír naslouchá.', link: 'aspekty.html' },
        { name: 'Kořeny', emoji: '🌳', keyword: 'Stabilita', text: 'Ukotvěte se ve svých kořenech – rodině, hodnotách, tradici. Síla vyrůstá ze stability a hlubokého zakotvení. Dnes oceňte, odkud pocházíte.', link: 'muladhara.html' },
        { name: 'Zrcadlo', emoji: '🪞', keyword: 'Reflexe', text: 'Cokoliv vás dnes na druhých dráždí nebo nadchne, je zrcadlem vašeho vlastního nitra. Den pro sebereflexi a hluboké pochopení sebe sama.', link: 'karmicky-uzel.html' },
        { name: 'Přijetí', emoji: '🌸', keyword: 'Soucit', text: 'Přijměte sebe i druhé přesně takovými, jací jsou. Dnešní den volá po soucitu namísto souzení. Z přijetí roste skutečná láska.', link: 'anahata.html' },
        { name: 'Zázrak', emoji: '✨', keyword: 'Požehnání', text: 'Otevřete oči pro malé zázraky kolem sebe. Dnes je den, kdy se vesmír dává o sobě vědět skrze synchronicity a náhody. Žádné není.', link: 'synchronicita.html' },
        { name: 'Přátelství', emoji: '🤗', keyword: 'Komunita', text: 'Vaši přátelé jsou vaší rodinou, kterou si sami volíte. Dnes se ozvěte těm, na které myslíte. Jedno upřímné slovo může změnit celý den.', link: 'synchronicita.html' },
        { name: 'Ohraničení', emoji: '🛡️', keyword: 'Hranice', text: 'Naučit se říkat ne je akt lásky k sobě samému. Dnes posilujte zdravé hranice – bez viny, bez omluv. Vaše energie je darem, ne povinností.', link: 'saturnosky-navrat.html' },
        { name: 'Vizionář', emoji: '🔭', keyword: 'Vize', text: 'Povzneste pohled nad každodennost. Jaká je vaše velká vize? Dnešní den přeje snění, plánování a nastavování smělých cílů.', link: 'draci-uzly.html' },
        { name: 'Hravost', emoji: '🎭', keyword: 'Spontánnost', text: 'Je čas přerušit rutinu a vnést do dne trochu překvapení. Buďte spontánní, hraví, nebojte se vypadat trochu bláznivě. Život je příliš krátký na vážnost.', link: 'tarot-blazen.html' },
        { name: 'Propojen se zemí', emoji: '🌍', keyword: 'Zemění', text: 'Vyjděte ven, dotkněte se přírody, zhluboka dýchejte. Zemský magnetismus vám dodá sílu a jasnost mysli. Příroda je vaším nejlepším lékem.', link: 'muladhara.html' },
        { name: 'Paradox', emoji: '🌙', keyword: 'Tajemství', text: 'Ne vše musí být ihned vysvětleno. Dnes se smiřte s nejistotou a mysteriem. Pravda má mnoho vrstev – ponořte se do hlubiny bez strachu.', link: 'velka-arkana.html' },
        { name: 'Vítěz', emoji: '🏆', keyword: 'Úspěch', text: 'Vaše vytrvalost byla oceněna. Dnes celebrujte svůj pokrok – i ten nejmenší úspěch si zaslouží uznání. Jste na správné cestě k vítězství.', link: 'fehu.html' },
    ];

    const CARD_IMAGES = {
        'Andělé Ochránci': 'andele-ochranci',
        'Hojnost': 'hojnost',
        'Nový začátek': 'novy-zacatek',
        'Vnitřní mír': 'vnitrni-mir',
        'Odvaha': 'odvaha',
        'Láska': 'laska',
        'Intuice': 'intuice',
        'Transformace': 'transformace',
        'Vděčnost': 'vdecnost',
        'Harmonie': 'harmonie',
        'Vůdce': 'vudce',
        'Propojení': 'propojeni',
        'Hojení': 'hojeni',
        'Moudrost': 'moudrost',
        'Radost': 'radost',
        'Průlom': 'prulom',
        'Důvěra': 'duvera',
        'Kreativita': 'kreativita',
        'Uvolnění': 'uvolneni',
        'Záměr': 'zamer',
        'Kořeny': 'koreny',
        'Zrcadlo': 'zrcadlo',
        'Přijetí': 'prijeti',
        'Zázrak': 'zazrak',
        'Přátelství': 'pratelstvi',
        'Ohraničení': 'ohraniceni',
        'Vizionář': 'vizionar',
        'Hravost': 'hravost',
        'Propojen se zemí': 'propojen-se-zemi',
        'Paradox': 'paradox',
        'Vítěz': 'vitez'
    };

    function getCardSlug(card) {
        return CARD_IMAGES[card?.name] || '';
    }

    function buildAngelCardsUrl(source, card, feature = 'daily_angel_card') {
        const url = new URL('/andelske-karty.html', window.location.origin);
        const slug = getCardSlug(card);

        url.searchParams.set('source', source);
        url.searchParams.set('feature', feature);
        if (slug) url.searchParams.set('daily_card', slug);

        return `${url.pathname}${url.search}`;
    }

    function setTemporaryButtonLabel(button, label) {
        if (!button) return;

        const originalHtml = button.dataset.defaultHtml || button.innerHTML;
        button.dataset.defaultHtml = originalHtml;
        button.textContent = label;

        window.setTimeout(() => {
            button.innerHTML = button.dataset.defaultHtml || originalHtml;
        }, 2200);
    }

    async function copyTextToClipboard(text) {
        if (navigator.clipboard?.writeText) {
            try {
                await navigator.clipboard.writeText(text);
                return true;
            } catch (error) {
                if (window.MH_DEBUG) console.debug('Clipboard API copy failed, trying textarea fallback:', error);
            }
        }

        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.className = 'kdd-share-copy-buffer';

        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        textarea.setSelectionRange(0, textarea.value.length);

        try {
            return document.execCommand('copy');
        } catch (error) {
            if (window.MH_DEBUG) console.debug('Textarea copy fallback failed:', error);
            return false;
        } finally {
            textarea.remove();
        }
    }

    function showManualShareFallback(button, shareUrl) {
        if (!button || !shareUrl) return;

        const container = button.closest('div') || button.parentElement;
        if (!container) return;

        let fallback = container.querySelector('.kdd-share-fallback');
        if (!fallback) {
            fallback = document.createElement('div');
            fallback.className = 'kdd-share-fallback';
            fallback.setAttribute('role', 'status');
            fallback.innerHTML = `
                <span>Odkaz je připravený ke zkopírování:</span>
                <input type="text" readonly aria-label="Odkaz pro sdílení karty dne">
            `;
            container.appendChild(fallback);
        }

        const input = fallback.querySelector('input');
        if (!input) return;

        input.value = shareUrl;
        fallback.hidden = false;
        input.focus();
        input.select();
    }

    async function shareCard(card, button) {
        if (!card) return;

        const shareUrl = `${window.location.origin}${buildAngelCardsUrl('homepage_daily_card_share', card)}`;
        const sharePayload = {
            title: `Karta dne: ${card.name}`,
            text: `Moje dnešní karta je ${card.name} (${card.keyword}). ${card.text}`,
            url: shareUrl
        };

        window.MH_ANALYTICS?.trackCTA?.('homepage_daily_card_share', {
            card_name: card.name,
            feature: 'daily_angel_card',
            destination: shareUrl
        });

        const shareText = `${sharePayload.title}\n\n${sharePayload.text}\n${sharePayload.url}`;

        try {
            if (navigator.share) {
                try {
                    await navigator.share(sharePayload);
                    setTemporaryButtonLabel(button, 'Sdíleno');
                    return;
                } catch (shareError) {
                    if (shareError?.name === 'AbortError') return;
                    if (window.MH_DEBUG) console.debug('Web Share API failed, trying clipboard fallback:', shareError);
                }
            }

            const copied = await copyTextToClipboard(shareText);
            if (copied) {
                setTemporaryButtonLabel(button, 'Zkopírováno');
            } else {
                showManualShareFallback(button, shareUrl);
                setTemporaryButtonLabel(button, 'Odkaz připraven');
            }
        } catch (error) {
            if (window.MH_DEBUG) console.debug('Daily card share failed:', error);
            showManualShareFallback(button, shareUrl);
            setTemporaryButtonLabel(button, 'Odkaz připraven');
        }
    }

    function renderCardSymbol(target, card) {
        if (!target || !card) return;

        const slug = getCardSlug(card);
        target.textContent = '';

        if (!slug) {
            target.textContent = card.emoji;
            return;
        }

        const image = new Image();
        image.className = 'kdd-card-image';
        image.src = `/img/daily-cards/${slug}.webp`;
        image.alt = `${card.name} - ${card.keyword}`;
        image.loading = 'lazy';
        image.fetchPriority = 'low';
        image.decoding = 'async';
        target.appendChild(image);
    }

    document.addEventListener('DOMContentLoaded', () => {
        const el = id => document.getElementById(id);
        const cardContainer = el('kdd-card');
        const inner = el('kdd-inner');
        if (!cardContainer || !inner) return;

        const setInlineBlockVisible = (element, visible) => {
            if (!element) return;
            element.hidden = !visible;
            element.classList.toggle('mh-inline-block-visible', visible);
        };

        const setBlockVisible = (element, visible) => {
            if (!element) return;
            element.hidden = !visible;
            element.classList.toggle('mh-block-visible', visible);
        };

        // LocalStorage keys
        const KEY_DATE = 'mh_kdd_date';
        const KEY_INDEX = 'mh_kdd_index';
        const KEY_STREAK = 'mh_kdd_streak';

        const getTodayStr = () => {
            const d = new Date();
            return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
        };

        // Yesterday for streak calculating
        const getYesterdayStr = () => {
            const d = new Date();
            d.setDate(d.getDate() - 1);
            return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
        };

        const todayStr = getTodayStr();
        const yesterdayStr = getYesterdayStr();

        let lastDate = localStorage.getItem(KEY_DATE);
        let streakCount = parseInt(localStorage.getItem(KEY_STREAK) || '0', 10);
        let cardIndex = -1;
        // removed auto-reveal flag

        if (lastDate === todayStr) {
            // Already initialized today (user might not have flipped it yet, or they did)
            cardIndex = parseInt(localStorage.getItem(KEY_INDEX), 10);
        } else {
            // New day, assign a specific new card for today, but do NOT increment streak until flipped
            cardIndex = Math.floor(Math.random() * CARDS.length);
            localStorage.setItem(KEY_INDEX, cardIndex.toString());
            // Intentionally not setting KEY_DATE here yet, so we know if they flipped it or not.
            // If they just visit and don't flip, they might come back later today to flip.
            // Actually, setting KEY_DATE is fine so they don't get a different card if they refresh without flipping.
            localStorage.setItem(KEY_DATE, todayStr);
        }

        // Safety fallback
        if (isNaN(cardIndex) || cardIndex < 0 || cardIndex >= CARDS.length) {
            cardIndex = 0;
        }

        const card = CARDS[cardIndex];
        let cardVisualRendered = false;

        // Poplate content
        if (el('kdd-name')) el('kdd-name').textContent = card.name;
        if (el('kdd-keyword')) el('kdd-keyword').textContent = card.keyword;
        if (el('kdd-text')) el('kdd-text').textContent = card.text;

        const renderCardVisual = () => {
            if (cardVisualRendered) return;
            cardVisualRendered = true;
            renderCardSymbol(el('kdd-emoji'), card);
            el('kdd-front')?.classList.add('kdd-front--image-ready');
        };

        const detailLink = el('kdd-lexicon-link');
        if (detailLink) {
            detailLink.href = buildAngelCardsUrl('homepage_daily_card_detail', card);
            detailLink.addEventListener('click', () => {
                window.MH_ANALYTICS?.trackCTA?.('homepage_daily_card_detail', {
                    card_name: card.name,
                    feature: 'daily_angel_card',
                    destination: detailLink.href
                });
            });
        }

        const fullReadingLink = el('kdd-full-reading-link');
        if (fullReadingLink) {
            fullReadingLink.href = buildAngelCardsUrl('homepage_daily_card_full_reading', card, 'andelske_karty_hluboky_vhled');
            fullReadingLink.addEventListener('click', () => {
                window.MH_ANALYTICS?.trackCTA?.('homepage_daily_card_full_reading', {
                    card_name: card.name,
                    feature: 'andelske_karty_hluboky_vhled',
                    destination: fullReadingLink.href
                });
            });
        }

        // Update streak badge
        const badge = el('kdd-streak-badge');
        if (badge && streakCount > 0) {
            setInlineBlockVisible(badge, true);
            const streakCountEl = el('kdd-streak-count');
            if (streakCountEl) streakCountEl.textContent = streakCount;
        }

        // Web Share API
        const shareBtn = el('kdd-share-btn');
        if (shareBtn) {
            setInlineBlockVisible(shareBtn, true);
            shareBtn.addEventListener('click', (e) => {
                e.preventDefault();
                shareCard(card, shareBtn);
            });
        }

        // Reveal UI Logic
        const revealCard = () => {
            // If already flipped, do nothing
            if (inner.classList.contains('kdd-inner--flipped')) return;
            renderCardVisual();

            // They flipped it! Now increment the streak if appropriate.
            // We need a separate flag so we don't increment multiple times a day if they refresh and flip again.
            const KEY_LAST_FLIP_DATE = 'mh_kdd_last_flip_date';
            let lastFlip = localStorage.getItem(KEY_LAST_FLIP_DATE);

            if (lastFlip !== todayStr) {
                // First flip of the day! Handle streak logic.
                if (lastFlip === yesterdayStr) {
                    streakCount++;
                } else if (lastFlip !== todayStr) { // Only reset if they missed a day, and it's not today.
                    streakCount = 1;
                }
                localStorage.setItem(KEY_STREAK, streakCount.toString());
                localStorage.setItem(KEY_LAST_FLIP_DATE, todayStr);

                // Update badge UI since it might have changed
                const badge = el('kdd-streak-badge');
                if (badge && streakCount > 0) {
                    setInlineBlockVisible(badge, true);
                    const streakCountEl = el('kdd-streak-count');
                    if (streakCountEl) streakCountEl.textContent = streakCount;
                }
            }

            // Always animate the flip (no immediate reveal on page load)
            inner.classList.add('kdd-inner--flipped');

            setTimeout(() => {
                if (el('kdd-hint')) el('kdd-hint').hidden = true;
                const msg = el('kdd-message');
                if (msg) {
                    setBlockVisible(msg, true);
                    msg.classList.add('kdd-message--visible');
                }
            }, 400);
        };

        // We removed auto-reveal "if (cardWasAlreadyRevealedToday) { revealCard(true); }"
        // Card is always faced down on initial load.

        cardContainer.addEventListener('click', () => revealCard());
    });
})();
