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
        setMeta('meta[name="description"]', 'Denní horoskop zdarma pro všech 12 znamení zvěrokruhu. Přesné předpovědi pro lásku, kariéru a zdraví. Zjistěte, co vám hvězdy přináší dnes.');
        setMeta('meta[property="og:title"]', 'Denní Horoskop Zdarma — Všechna Znamení Dnes | Mystická Hvězda');
        setMeta('meta[property="og:description"]', 'Denní horoskop zdarma pro všech 12 znamení zvěrokruhu. Přesné předpovědi pro lásku, kariéru a zdraví. Zjistěte, co vám hvězdy přináší dnes.');
        setHtml('.hero__title', 'Denní <span class="text-gradient">horoskop</span>');
        setText('.hero__subtitle', 'Energie planet se mění každý den. Zjistěte, jak je dnes využít pro svůj prospěch, vztahy a vnitřní klid.');
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
        document.title = 'Andělská Karta Dne | Mystická Hvězda';
        setMeta('meta[name="description"]', 'Vytáhněte si svou andělskou kartu pro dnešní den. Jemná andělská podpora a poselství světla pro vaši duši.');
        setMeta('meta[property="og:title"]', 'Andělská Karta Dne | Mystická Hvězda');
        setMeta('meta[property="og:description"]', 'Vytáhněte si svou andělskou kartu pro dnešní den. Jemná andělská podpora a poselství světla pro vaši duši.');
        setHtml('.hero__title', 'Andělská <span class="text-gradient">karta dne</span>');
        setText('.hero__subtitle', 'Zastavte se, zhluboka se nadechněte a dovolte nebeským průvodcům, aby vám předali zprávu plnou naděje a lásky.');
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
        setMeta('meta[name="description"]', 'Zeptejte se křišťálové koule na cokoliv. Intuitivní věštba pro váš osobní dotaz a aktuální situaci.');
        setMeta('meta[property="og:title"]', 'Křišťálová Koule | Mystická Hvězda');
        setMeta('meta[property="og:description"]', 'Zeptejte se křišťálové koule na cokoliv. Intuitivní věštba pro váš osobní dotaz a aktuální situaci.');
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
        setMeta('meta[name="description"]', 'Odhalte svůj minulý život prostřednictvím akashických záznamů. Zjistěte, jaké karmické lekce nesete a co máte v tomto životě dokončit.');
        setMeta('meta[property="og:title"]', 'Minulý Život — Akashické Záznamy | Mystická Hvězda');
        setMeta('meta[property="og:description"]', 'Odhalte svůj minulý život prostřednictvím akashických záznamů. Zjistěte, jaké karmické lekce nesete a co máte v tomto životě dokončit.');
        setHtml('.past-life-hero h1, .hero__title', 'Minulý život a <span class="text-gradient">akashické záznamy</span>');
        setText('.past-life-hero p, .hero__subtitle', 'Podívejte se za oponu minulých inkarnací a zjistěte, jaké dary, vzorce a karmické lekce si nesete do současného života.');
    }
});
