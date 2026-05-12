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

    if (path.endsWith('/mentor.html') || path.endsWith('mentor.html')) {
        document.title = 'Hvězdný Průvodce | Mystická Hvězda';
        setMeta('meta[name="description"]', 'Hvězdný průvodce jako navazující AI chat pro vztahy, rozhodování a osobní témata. Pomůže pojmenovat otázky a další kroky bez slibů pevného osudu.');
        setMeta('meta[property="og:title"]', 'Hvězdný Průvodce | Mystická Hvězda');
        setMeta('meta[property="og:description"]', 'Navazující AI chat pro vztahy, rozhodování a osobní témata. Praktický rámec pro další krok, ne pevná předpověď.');
        setText('.hero__title', 'Hvězdný Průvodce');
        setText('.hero__subtitle', 'Zeptejte se na to, co právě řešíte. Hvězdný Průvodce vám pomůže najít klid, směr a souvislosti.');
        setText('.chat-header h2, .chat-header h3', 'Hvězdný Průvodce');
    }

    if (path.endsWith('/tarot.html') || path.endsWith('tarot.html')) {
        document.title = 'Tarotové Výklady Online | Mystická Hvězda';
        setMeta('meta[name="description"]', 'Online tarotové výklady s hvězdnou interpretací. Vyberte si z karet Velké arkány a získejte personalizovaný výklad.');
        setMeta('meta[property="og:title"]', 'Tarotové Výklady Online | Mystická Hvězda');
        setMeta('meta[property="og:description"]', 'Online tarotové výklady s hvězdnou interpretací. Vyberte si z karet Velké arkány a získejte personalizovaný výklad.');
        setHtml('.hero__title', 'Tarotové <span class="text-gradient">výklady</span>');
        setText('.hero__subtitle', 'Vyberte si výklad, zamíchejte karty a nechte symboliku tarotu promluvit do vaší aktuální situace.');
    }

    if (path.endsWith('/numerologie.html') || path.endsWith('numerologie.html')) {
        document.title = 'Numerologie Online | Mystická Hvězda';
        setMeta('meta[name="description"]', 'Numerologie jako symbolický rámec pro silné stránky, vztahy a opakující se vzorce. Výpočet čísla životní cesty, osobního tématu a duše.');
        setMeta('meta[property="og:title"]', 'Numerologie Online | Mystická Hvězda');
        setMeta('meta[property="og:description"]', 'Výpočet čísel pro sebereflexi a další krok, ne pevné určení osudu.');
        setHtml('.hero__title', '<span class="text-gradient">Numerologie</span>');
        setText('.hero__subtitle', 'Každé číslo berte jako symbolický rámec pro silné stránky, vztahy a opakující se vzorce. Výklad pomáhá pojmenovat další krok, ne určit váš osud.');
        setText('.card__title', 'Vypočítejte svá čísla');
        const profileToggle = document.querySelector('label[title]');
        if (profileToggle) profileToggle.setAttribute('title', 'Použít údaje z mého profilu');
    }

    if (path.endsWith('/partnerska-shoda.html') || path.endsWith('partnerska-shoda.html')) {
        document.title = 'Partnerská Shoda | Mystická Hvězda';
        setMeta('meta[name="description"]', 'Zjistěte kompatibilitu mezi dvěma znameními. Synastrie a analýza partnerského vztahu.');
        setMeta('meta[property="og:title"]', 'Partnerská Shoda | Mystická Hvězda');
        setMeta('meta[property="og:description"]', 'Zjistěte kompatibilitu mezi dvěma znameními. Synastrie a analýza partnerského vztahu.');
        setHtml('.hero__title', 'Partnerská <span class="text-gradient">shoda</span>');
        setText('.hero__subtitle', 'Porovnejte dvě energie, podívejte se na emoce, komunikaci i vášeň a zjistěte, kde se opravdu potkáváte.');
    }
});
