document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;

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

    if (path.endsWith('/horoskopy.html') || path.endsWith('horoskopy.html')) {
        document.title = 'Denní Horoskop Zdarma — Všechna Znamení Dnes | Mystická Hvězda';
        setMeta('meta[name="description"]', 'Denní, týdenní a měsíční horoskopy pro 12 znamení jako praktický astrologický rámec pro vztahy, práci a vnitřní klid.');
        setMeta('meta[property="og:title"]', 'Denní Horoskop Zdarma — Všechna Znamení Dnes | Mystická Hvězda');
        setMeta('meta[property="og:description"]', 'Horoskopy pro 12 znamení jako denní rámec pro témata, otázky a další krok.');
        setHtml('.hero__title', 'Denní <span class="text-gradient">horoskop</span>');
        setText('.hero__subtitle', 'Astrologický kontext pro dnešní den. Berte ho jako mapu témat a otázek, ne jako pevnou předpověď.');
    }

    if (path.endsWith('/natalni-karta.html') || path.endsWith('natalni-karta.html')) {
        document.title = 'Natální Karta | Mystická Hvězda';
        setMeta('meta[name="description"]', 'Vytvořte si svou osobní natální kartu a objevte pozice planet v okamžiku vašeho narození.');
        setMeta('meta[property="og:title"]', 'Natální Karta | Mystická Hvězda');
        setMeta('meta[property="og:description"]', 'Vytvořte si svou osobní natální kartu a objevte pozice planet v okamžiku vašeho narození.');
        setHtml('.hero__title', 'Natální karta jako <span class="text-gradient">klíč k sebepoznání</span>');
        setText('.hero__subtitle', 'Vaše natální karta není jen obrázek. Je to mapa vaší duše, talentů a výzev, které jste si přišli prožít.');
    }

    if (path.endsWith('/andelske-karty.html') || path.endsWith('andelske-karty.html')) {
        document.title = 'Andělské karty | Mystická Hvězda';
        setMeta('meta[name="description"]', 'Vytáhněte si andělskou kartu z balíčku 44 poselství. Jemná andělská podpora, symbolika a hlubší vhled pro vaši duši.');
        setMeta('meta[property="og:title"]', 'Andělské karty | Mystická Hvězda');
        setMeta('meta[property="og:description"]', 'Vytáhněte si andělskou kartu z balíčku 44 poselství. Jemná andělská podpora, symbolika a hlubší vhled pro vaši duši.');
        setHtml('.hero__title', 'Andělské <span class="text-gradient">karty</span>');
        setText('.hero__subtitle', 'Samostatný výklad z andělského balíčku 44 karet. Karta dne je rychlý symbol; tady otevíráš hlubší andělské poselství.');
    }

    if (path.endsWith('/runy.html') || path.endsWith('runy.html')) {
        document.title = 'Věštění z Run | Mystická Hvězda';
        setMeta('meta[name="description"]', 'Vytáhněte si denní runu. Prastarý severský systém Elder Futhark vám nabídne poselství a radu na dnešní den.');
        setMeta('meta[property="og:title"]', 'Věštění z Run | Mystická Hvězda');
        setMeta('meta[property="og:description"]', 'Vytáhněte si denní runu. Prastarý severský systém Elder Futhark vám nabídne poselství a radu na dnešní den.');
        setHtml('.hero__title', 'Věštění z <span class="text-gradient">run</span>');
        setText('.hero__subtitle', 'Sáhněte do pomyslného měšce a vytáhněte si kámen s poselstvím na dnešní den. Prastará severská moudrost čeká.');
    }

    if (path.endsWith('/lunace.html') || path.endsWith('lunace.html')) {
        document.title = 'Dnešní Lunární Fáze | Co říká Měsíc právě dnes | Mystická Hvězda';
        setMeta('meta[name="description"]', 'Zjistěte, v jaké fázi je dnes Měsíc a jak ji můžete použít jako praktický rámec pro denní rytmus, vztahy a reflexi.');
        setMeta('meta[property="og:title"]', 'Dnešní Lunární Fáze | Mystická Hvězda');
        setMeta('meta[property="og:description"]', 'Aktuální fáze Měsíce jako symbolický rytmus pro dnešní krok, reflexi a jemnější plánování.');
        setHtml('.hero__title', 'Dnešní <span class="text-gradient">lunární fáze</span>');
        setText('.hero__subtitle', 'Vezměte aktuální fázi jako jednoduchý rytmus pro dnešní krok, ne jako pevný osud.');
    }

    if (path.endsWith('/kristalova-koule.html') || path.endsWith('kristalova-koule.html')) {
        document.title = 'Křišťálová Koule | Mystická Hvězda';
        setMeta('meta[name="description"]', 'Křišťálová koule jako symbolický průvodce pro osobní otázku. Pojmenujte situaci, získejte vhled a jeden další krok bez slibu pevné budoucnosti.');
        setMeta('meta[property="og:title"]', 'Křišťálová Koule | Mystická Hvězda');
        setMeta('meta[property="og:description"]', 'Symbolický vhled pro osobní otázku: pojmenujte situaci a odneste si jeden další krok bez slibu pevné budoucnosti.');
        setHtml('.hero__title', 'Křišťálová koule a <span class="text-gradient">hlas intuice</span>');
        const existingSubtitle = document.querySelector('.hero__subtitle');
        if (existingSubtitle) {
            existingSubtitle.textContent = 'Položte jednu otázku, ztište mysl a nechte odpověď vystoupit z mlhy toho, co právě potřebujete vidět jasněji.';
        } else {
            const heroTitle = document.querySelector('.hero__title');
            const subtitle = document.createElement('p');
            subtitle.className = 'hero__subtitle';
            subtitle.textContent = 'Položte jednu otázku, ztište mysl a nechte odpověď vystoupit z mlhy toho, co právě potřebujete vidět jasněji.';
            heroTitle?.insertAdjacentElement('afterend', subtitle);
        }
    }

    if (path.endsWith('/minuly-zivot.html') || path.endsWith('minuly-zivot.html')) {
        document.title = 'Minulý Život — Akashické Záznamy | Mystická Hvězda';
        setMeta('meta[name="description"]', 'Vytvořte si symbolický výklad minulého života pro sebereflexi. Objevte archetypální příběh, karmické motivy, dary a téma, které může inspirovat současný život.');
        setMeta('meta[property="og:title"]', 'Minulý Život — Akashické Záznamy | Mystická Hvězda');
        setMeta('meta[property="og:description"]', 'Symbolický výklad minulého života pro sebereflexi: archetypální příběh, karmické motivy, dary a téma pro současný život.');
        setHtml('.past-life-hero h1, .hero__title', 'Minulý život a <span class="text-gradient">akashické záznamy</span>');
        setText('.past-life-hero p, .hero__subtitle', 'Vytvořte symbolický obraz minulého života, který může odhalit opakující se motivy, dary a téma pro současnou cestu.');
    }
});
