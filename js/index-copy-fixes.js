document.addEventListener('DOMContentLoaded', () => {
    document.title = 'Mystická Hvězda | Astrologie, tarot a osobní vedení';

    const setMeta = (selector, value) => {
        const element = document.querySelector(selector);
        if (element) element.setAttribute('content', value);
    };

    const setText = (selector, text) => {
        const element = document.querySelector(selector);
        if (element) element.textContent = text;
    };

    setMeta('meta[name="description"]', 'Horoskopy, tarot, natální karta a osobní vedení na jednom místě. Začněte zdarma a zjistěte, co se děje ve vztazích, práci i ve vašem vnitřním nastavení.');
    setMeta('meta[name="keywords"]', 'astrologie, tarot, numerologie, horoskop, natální karta, partnerská shoda, osobní růst');
    setMeta('meta[name="author"]', 'Mystická Hvězda');
    setMeta('meta[property="og:title"]', 'Mystická Hvězda | Astrologie, tarot a osobní vedení');
    setMeta('meta[property="og:description"]', 'Horoskopy, tarot, natální karta a osobní vedení na jednom místě. Začněte zdarma a odemkněte jasnější směr pro každý den.');

    setText('.skip-link', 'Přeskočit na obsah');

    const logoGradient = document.querySelector('.logo__text .text-gradient');
    const logoText = document.querySelector('.logo__text');
    if (logoText?.firstChild) logoText.firstChild.textContent = 'Mystická ';
    if (logoGradient) logoGradient.textContent = 'Hvězda';
    document.querySelectorAll('.logo__image').forEach((image) => {
        image.alt = 'Mystická Hvězda logo';
    });

    const homeLink = document.querySelector('.nav__item > .nav__link');
    if (homeLink) homeLink.textContent = 'Domů';

    const navMap = new Map([
        ['horoskop/index.html', 'Znamení zvěrokruhu'],
        ['natalni-karta.html', 'Natální karta'],
        ['lunace.html', 'Lunární fáze'],
        ['ritualy/', 'Lunární rituály'],
        ['astro-mapa.html', 'Astro mapa'],
        ['partnerska-shoda.html', 'Partnerská shoda'],
        ['cinsky-horoskop.html', 'Čínský horoskop'],
        ['minuly-zivot.html', 'Minulý život'],
        ['andelske-karty.html', 'Andělské karty'],
        ['andelska-posta.html', 'Andělská pošta'],
        ['runy.html', 'Výklad z run'],
        ['kristalova-koule.html', 'Křišťálová koule'],
        ['snar.html', 'Snář'],
        ['shamansko-kolo.html', 'Šamanské kolo'],
        ['aura.html', 'Aura kalkulačka'],
        ['afirmace.html', 'Denní afirmace'],
        ['jmena/', 'Databáze jmen'],
        ['slovnik.html', 'Ezoterický slovník'],
        ['blog.html', 'Mystický blog'],
        ['faq.html', 'Časté otázky'],
        ['o-nas.html', 'O nás'],
        ['mentor.html', 'Hvězdný průvodce'],
        ['cenik.html', 'Ceník']
    ]);

    document.querySelectorAll('a.nav__dropdown-link').forEach((link) => {
        const href = link.getAttribute('href');
        if (href && navMap.has(href)) link.textContent = navMap.get(href);
    });

    setText('#mobile-auth-btn', 'Přihlásit se');
    setText('#auth-btn', 'Přihlásit se');
    setText('#mobile-profile-link', 'Profil');
    setText('#profile-link', 'Profil');

    const heroTitle = document.querySelector('.hero__title');
    if (heroTitle) {
        heroTitle.innerHTML = 'Získejte jasnější <span class="text-gradient text-glow">směr</span> pro vztahy, práci i sebe';
    }

    setText('.hero__subtitle', 'Denní horoskopy, tarot, natální karta a osobní vedení na jednom místě. Začněte zdarma a během pár minut zjistěte, co vám dnes dává největší smysl.');

    const heroButton = document.getElementById('hero-cta-btn');
    if (heroButton) {
        heroButton.textContent = 'Vytvořit účet zdarma →';
        heroButton.setAttribute('href', 'prihlaseni.html?mode=register&source=homepage_hero&feature=daily_guidance');
    }

    const heroTrust = document.getElementById('hero-cta-trust');
    if (heroTrust) {
        heroTrust.innerHTML = 'Bez platební karty &nbsp;|&nbsp; Přístup okamžitě &nbsp;|&nbsp; Zrušíte kdykoliv';
    }

    const loggedInCta = document.querySelector('#hero-cta-logged-in a.btn--secondary');
    if (loggedInCta) loggedInCta.textContent = 'Otevřít dnešní horoskop';
    const loggedInTarot = document.querySelector('#hero-cta-logged-in a.btn--ghost');
    if (loggedInTarot) loggedInTarot.textContent = 'Vyložit tarot';

    const socialProof = document.querySelector('.social-proof__text');
    if (socialProof) {
        socialProof.innerHTML = '<strong>Soukromí na prvním místě</strong> | Jasná cena před platbou | Výklady jako sebereflexe, ne verdikt';
    }
    setText('.social-proof__stars', 'Transparentní vedení');

    const heroImage = document.querySelector('.hero__image');
    if (heroImage) heroImage.setAttribute('alt', 'Mystický astroláb');

    const headers = document.querySelectorAll('.section__header');
    if (headers[0]) {
        headers[0].querySelector('.section__badge').textContent = 'Naše nástroje';
        headers[0].querySelector('.section__title').textContent = 'Začněte tím, co právě řešíte';
        headers[0].querySelector('.section__text').textContent = 'Potřebujete rychlý vhled, hlubší výklad nebo osobní mapu? Vyberte si vstup podle otázky, kterou teď opravdu máte.';
    }
    if (headers[1]) {
        headers[1].querySelector('.section__badge').textContent = 'Hvězdná brána';
        headers[1].querySelector('.section__title').textContent = 'Objevte svůj další krok';
        headers[1].querySelector('.section__text').textContent = 'Vztahy, intuice, osobní růst i každodenní vedení. Každý nástroj vás dovede o kus blíž k jasnějšímu rozhodnutí.';
    }

    const serviceCards = document.querySelectorAll('#sluzby .card--service');
    if (serviceCards[0]) {
        serviceCards[0].querySelector('.card__title').textContent = 'Inspirace pro každý den';
        serviceCards[0].querySelector('.card__text').textContent = 'Zjistěte, co je dnes ve váš prospěch, čemu dát pozornost a kde naopak zvolnit.';
        serviceCards[0].querySelector('.btn').textContent = 'Zobrazit horoskopy →';
    }
    if (serviceCards[1]) {
        serviceCards[1].querySelector('.card__title').textContent = 'Zrcadlo vaší duše';
        serviceCards[1].querySelector('.card__text').textContent = 'Tarot pomůže pojmenovat to, co už cítíte, ale ještě to neumíte uchopit slovy.';
        serviceCards[1].querySelector('.btn').textContent = 'Vyložit karty →';
    }
    if (serviceCards[2]) {
        serviceCards[2].querySelector('.card__title').textContent = 'Hlas intuice';
        serviceCards[2].querySelector('.card__text').textContent = 'Když potřebujete rychlou odpověď nebo potvrzení směru, je to nejrychlejší vstup do celé aplikace.';
        serviceCards[2].querySelector('.btn').textContent = 'Zeptat se orákula →';
    }

    const pricingSection = document.querySelector('#cenik .section__header');
    if (pricingSection) {
        pricingSection.querySelector('.section__badge').textContent = 'Jednoduché ceny';
        pricingSection.querySelector('.section__title').textContent = 'Začněte zdarma. Přechod na Premium dává smysl až ve chvíli, kdy chcete víc.';
        const pricingText = pricingSection.querySelector('.section__text');
        if (pricingText) {
            pricingText.textContent = 'Většina lidí začíná plánem Hvězdný Průvodce, protože odemyká hlavní výklady a každodenní vedení bez zbytečně vysoké ceny.';
        }
    }

    const ctaBannerButton = document.getElementById('cta-banner-btn');
    if (ctaBannerButton) {
        ctaBannerButton.textContent = 'Porovnat Premium plány →';
        ctaBannerButton.setAttribute('href', 'cenik.html?plan=pruvodce&source=homepage_bottom_cta&feature=premium_membership');
    }

    const footerDesc = document.querySelector('.footer__desc');
    if (footerDesc) {
        footerDesc.textContent = 'Moderní astrologický prostor pro českou komunitu. Spojujeme dávnou symboliku s přehledným digitálním zážitkem.';
    }
});
