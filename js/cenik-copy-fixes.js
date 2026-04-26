document.addEventListener('DOMContentLoaded', () => {
    document.title = 'Ceník | Mystická Hvězda';

    const setMeta = (selector, value) => {
        const el = document.querySelector(selector);
        if (el) el.setAttribute('content', value);
    };

    const setText = (selector, value) => {
        const el = document.querySelector(selector);
        if (el) el.textContent = value;
    };

    const setHtml = (selector, value) => {
        const el = document.querySelector(selector);
        if (el) el.innerHTML = value;
    };

    const setAttr = (selector, attr, value) => {
        const el = document.querySelector(selector);
        if (el) el.setAttribute(attr, value);
    };

    setMeta('meta[name="description"]', 'Začněte zdarma a odemkněte osobní výklady, denní vedení, natální kartu a hlubší vhled od 199 Kč měsíčně.');
    setMeta('meta[name="keywords"]', 'ceník, předplatné, astrologie, tarot, numerologie, premium');
    setMeta('meta[property="og:title"]', 'Ceník | Mystická Hvězda');
    setMeta('meta[property="og:description"]', 'Začněte zdarma a vyberte si plán podle toho, jak hluboké vedení právě chcete.');

    setText('.section--hero .section__badge', 'Předplatné');
    setHtml('.section--hero .hero__title', 'Začněte zdarma. <span class="text-gradient">Přechod na Premium udělejte až ve chvíli, kdy chcete víc.</span>');
    setText('.section--hero .hero__subtitle', 'Bezplatný účet vám ukáže, jak Mystická Hvězda funguje. Pokud budete chtít osobní výklady, plné horoskopy, natální kartu a každodenní vedení bez limitu, odemyká je Hvězdný Průvodce.');

    const trustBadge = document.querySelector('.hero__trust-badge');
    if (trustBadge) {
        trustBadge.innerHTML = '<span>12 000+ aktivních uživatelů</span><span>|</span><span>Bez karty pro start zdarma</span><span>|</span><span>Zrušíte kdykoliv</span>';
    }

    setText('#toggle-monthly', 'Měsíčně');
    const yearly = document.getElementById('toggle-yearly');
    if (yearly) {
        yearly.innerHTML = 'Ročně <span class="pricing-soon-badge">brzy</span>';
    }

    const pricingCards = document.querySelectorAll('.card--pricing');
    if (pricingCards[0]) {
        setText('.card--pricing:nth-of-type(1) .card__title', 'Poutník');
        setText('.card--pricing:nth-of-type(1) .card__text', 'Pro první vyzkoušení bez závazku');
        const features = pricingCards[0].querySelectorAll('.card__features li');
        if (features[0]) features[0].lastChild.textContent = ' Denní horoskop a základní výklady';
        if (features[1]) features[1].lastChild.textContent = ' 15+ nástrojů bez placení';
        if (features[2]) features[2].lastChild.textContent = ' Vyzkoušejte si, co vám sedne nejvíc';
        setText('.card--pricing:nth-of-type(1) .btn', 'Vytvořit účet zdarma');
    }

    if (pricingCards[1]) {
        setText('.card--pricing:nth-of-type(2) .vip-badge', 'Nejlepší start');
        setText('.card--pricing:nth-of-type(2) .card__title', 'Hvězdný Průvodce');
        setText('.card--pricing:nth-of-type(2) .card__text', 'Nejlepší poměr ceny a skutečné hodnoty');
        const features = pricingCards[1].querySelectorAll('.card__features li');
        if (features[0]) features[0].lastChild.textContent = ' Neomezené výklady a denní vedení';
        if (features[1]) features[1].lastChild.textContent = ' Natální karta a numerologický rozbor';
        if (features[2]) features[2].lastChild.textContent = ' Minulý život, rituály a plné horoskopy';
        if (features[3]) features[3].lastChild.textContent = ' Plán, na kterém většina lidí opravdu zůstane';
        setText('.card--pricing:nth-of-type(2) .plan-checkout-btn', 'Chci plný přístup');
    }

    if (pricingCards[2]) {
        setText('.card--pricing:nth-of-type(3) .card__text', 'Pro ty, kdo chtějí ještě víc detailu');
        const features = pricingCards[2].querySelectorAll('.card__features li');
        if (features[0]) features[0].lastChild.textContent = ' Vše z Průvodce';
        if (features[1]) features[1].lastChild.textContent = ' Astrokartografie a pokročilé analýzy';
        if (features[2]) features[2].lastChild.textContent = ' Prioritní přístup k novým funkcím';
        setText('.card--pricing:nth-of-type(3) .plan-checkout-btn', 'Chci jít víc do hloubky');
    }

    if (pricingCards[3]) {
        setText('.card--pricing:nth-of-type(4) .card__title', 'VIP Majestrát');
        setText('.card--pricing:nth-of-type(4) .card__text', 'Pro nejnáročnější a největší hloubku');
        const features = pricingCards[3].querySelectorAll('.card__features li');
        if (features[0]) features[0].lastChild.textContent = ' Vše z Exclusive';
        if (features[1]) features[1].lastChild.textContent = ' Roční mapa a VIP odpovědi';
        if (features[2]) features[2].lastChild.textContent = ' Prioritní podpora a nejvyšší hloubka';
        setText('.card--pricing:nth-of-type(4) .plan-checkout-btn', 'Vstoupit do VIP');
    }

    setText('.section--alt .section__badge', 'Srovnání plánů');
    setText('.section--alt .section__title', 'Co v plánech skutečně získáte');
    setText('.section--alt .section__text', 'Rychlé srovnání toho, co se odemkne po registraci a po přechodu na placený plán.');

    const comparisonHeaders = document.querySelectorAll('.comparison-table-wrap th');
    const headerTexts = ['Funkce', 'Poutník', 'Průvodce', 'Exclusive', 'VIP Majestrát'];
    comparisonHeaders.forEach((cell, index) => {
        if (headerTexts[index]) cell.textContent = headerTexts[index];
    });

    const comparisonMobileTitles = document.querySelectorAll('.comparison-mobile__title');
    const comparisonMobileSubtitles = document.querySelectorAll('.comparison-mobile__subtitle');
    const mobileTitles = ['Poutník', 'Hvězdný Průvodce', 'Exclusive', 'VIP Majestrát'];
    const mobileSubs = [
        'Bezplatný vstup do aplikace',
        'Nejlepší volba pro většinu lidí',
        'Více detailu a priorita',
        'Nejvyšší hloubka a osobní péče'
    ];
    comparisonMobileTitles.forEach((el, index) => {
        if (mobileTitles[index]) el.textContent = mobileTitles[index];
    });
    comparisonMobileSubtitles.forEach((el, index) => {
        if (mobileSubs[index]) el.textContent = mobileSubs[index];
    });

    setText('#faq .section__title', 'Časté otázky');
    document.querySelectorAll('#faq .faq-question').forEach((question, index) => {
        const q = [
            'Jak zruším předplatné? ',
            'Musím zadávat kartu při registraci zdarma? ',
            'Který plán je nejlepší na začátek? '
        ];
        if (q[index]) {
            const icon = question.querySelector('.faq-icon')?.outerHTML || '';
            question.innerHTML = `${q[index]}${icon}`;
        }
    });

    const faqAnswers = document.querySelectorAll('#faq .faq-answer p');
    const answers = [
        'Kdykoliv ve svém profilu. Přístup vám zůstane do konce zaplaceného období.',
        'Ne. Bezplatný účet vytvoříte bez karty. Kartu zadáváte až při přechodu na placený plán.',
        'Pro většinu lidí je nejlepší Hvězdný Průvodce. Odemkne klíčové funkce bez zbytečně vysoké ceny.'
    ];
    faqAnswers.forEach((answer, index) => {
        if (answers[index]) answer.textContent = answers[index];
    });

    document.querySelectorAll('[data-price-plan]').forEach((el) => {
        const suffixEl = el.querySelector('.price-suffix');
        if (suffixEl && suffixEl.textContent.includes('m\u00c4')) {
            suffixEl.textContent = '/měsíc';
        }
    });

    setAttr('#toggle-yearly', 'title', 'Roční plány připravujeme');
});
