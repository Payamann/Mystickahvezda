// 🌕 Lunar Phase Calculation (pure JS, no external API)
const PHASES = [
    {
        name: 'Novolunění',
        emoji: '🌑',
        minAge: 0,
        maxAge: 1.5,
        illumination: 0,
        tags: ['Nové začátky', 'Záměry', 'Introspekce', 'Ticho'],
        interpretation: 'Novolunění je kosmickým resetem. Měsíc není na obloze vidět – celá jeho plocha je osvětlena ze strany, která se dívá pryč od nás. Tato tma není prázdnota, ale úrodná půda. Je to nejsilnější moment pro formulování záměrů, vizualizace a sázení semen toho, co chcete přivést do světa v průběhu nadcházejícího cyklu.',
        advice: '🌑 Dnešní praxe: Zapište si tři věci, které si přejete vytvořit nebo přitáhnout v příštích 29 dnech. Pak je pusťte – a sledujte, jak se vesmír začne pohybovat.'
    },
    {
        name: 'Dorůstající srpek',
        emoji: '🌒',
        minAge: 1.5,
        maxAge: 6.5,
        illumination: 25,
        tags: ['Akce', 'Iniciativa', 'Víra', 'Nadšení'],
        interpretation: 'Tenký srpek Měsíce se objevuje na večerní obloze jako první viditelný příslib. Energie tohoto období říká: Je čas začít jednat na základě záměrů, které jste zaseli při Novolunění. Ještě plné světlo nepřišlo, ale směr je jasný. Toto není čas na přemýšlení – je to čas na první kroky.',
        advice: '🌒 Dnešní praxe: Udělejte konkrétní první krok ke svému záměru. Jakkoli malý. Každý velký projekt začíná jednou neohrabanou akcí.'
    },
    {
        name: 'První čtvrť',
        emoji: '🌓',
        minAge: 6.5,
        maxAge: 10.0,
        illumination: 50,
        tags: ['Překážky', 'Rozhodnutí', 'Vůle', 'Konflikt'],
        interpretation: 'Přesně polovina Měsíce je osvětlena – symbolická rovnováha a zároveň napětí. Toto je bod, kdy se záměry střetávají s realitou. Může přijít první vnitřní nebo vnější odpor. Tyto překážky nejsou signálem k vzdání se – jsou zkouškou, zda chcete svůj cíl skutečně naplnit.',
        advice: '🌓 Dnešní praxe: Co vás brzdí? Pojmenujte jednu konkrétní překážku a rozhodněte se, jak přes ni projdete. Rozhodnutí je mocnější než plán.'
    },
    {
        name: 'Dorůstající měsíc',
        emoji: '🌔',
        minAge: 10.0,
        maxAge: 13.5,
        illumination: 75,
        tags: ['Vytrvalost', 'Zdokonalování', 'Analýza', 'Dolaďování'],
        interpretation: 'Měsíc je téměř plný a energie narůstá s téměř hmatatelnou intenzitou. Toto je čas pečlivé práce na detailech. Záměr je živý, první momentum je vytvořeno – teď je třeba vyladit, zdokonalit a vytrvat. Příprava vrcholí.',
        advice: '🌔 Dnešní praxe: Prostudujte, co funguje a co ne. Proveďte jednu konkrétní korekci kurzu. Mistrovství leží ve vyladění drobností.'
    },
    {
        name: 'Úplněk',
        emoji: '🌕',
        minAge: 13.5,
        maxAge: 16.0,
        illumination: 100,
        tags: ['Vrchol', 'Manifestace', 'Emoce', 'Odhalení', 'Naplnění'],
        interpretation: 'Úplněk je esoterickem posvátným momentem lunárního cyklu. Měsíc je plně osvětlen a na obloze září jako malé druhé slunce. Emoce jsou zesileny, intuice maximálně naostřena. To, co bylo zaseto, se nyní plně projevuje – dobré i špatné. Věci se vynořují na povrch. Toto je okamžik sklizně, rituálů vděčnosti a propuštění starého, co již neslouží.',
        advice: '🌕 Dnešní praxe: Vytvořte prostor pro rituál vděčnosti. Napište si, co jste od posledního Novolunění dosáhli, a poté vědomě propusťte vše, čeho je třeba se vzdát.'
    },
    {
        name: 'Ubývající měsíc',
        emoji: '🌖',
        minAge: 16.0,
        maxAge: 21.5,
        illumination: 75,
        tags: ['Sdílení', 'Moudrost', 'Gratitudine', 'Odpočinek'],
        interpretation: 'Světlo pomalu ustupuje, ale zkušenost a moudrost ze sklizně Úplňku zůstávají. Toto je čas sdílení – toho, co jste se naučili, prožili a vytvořili. Energie přirozeně volá k introverzi, k předávání vědomostí a k ocenění cesty.',
        advice: '🌖 Dnešní praxe: Podělte se o něco, čemu jste se naučili – ať už s přítelem, v deníku, nebo na sociálních sítích. Moudrost, která není sdílena, chřadne.'
    },
    {
        name: 'Poslední čtvrť',
        emoji: '🌗',
        minAge: 21.5,
        maxAge: 25.0,
        illumination: 50,
        tags: ['Propuštění', 'Čištění', 'Transformace', 'Přehodnocení'],
        interpretation: 'Opět polovina – ale tentokrát na sestupné části cyklu. Přichází čas hlubokého úklidu: fyzického, emocionálního i mentálního. Co starého, přebytečného nebo již nepotřebného je v mém životě? Toto je energie propuštění, ne přidávání.',
        advice: '🌗 Dnešní praxe: Vyhoďte, darujte nebo propusťte jednu věc z fyzického prostoru i z mysli. Úklid energie vytváří prostor pro nové.'
    },
    {
        name: 'Ubývající srpek',
        emoji: '🌘',
        minAge: 25.0,
        maxAge: 28.5,
        illumination: 15,
        tags: ['Obnova', 'Odpočinek', 'Ticho', 'Příprava'],
        interpretation: 'Měsíc se vrací k temnotě a cyklus se uzavírá. Toto je nejintrovertovanější fáze lunárního cyklu – čas skutečného odpočinku, regenerace a přípravy na nový začátek. Nenutit se do akce. Spát víc. Meditovat. Být v tichu.',
        advice: '🌘 Dnešní praxe: Dovolte si dnes odpočinout bez výčitek. Spánek a ticho jsou stejně produktivní jako akce – jen jiným způsobem.'
    }
];

function getLunarAge(date) {
    const knownNewMoon = new Date('2026-02-17T12:01:12Z');
    const LUNAR_CYCLE = 29.53058867;
    const diffMs = date - knownNewMoon;
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    let age = diffDays % LUNAR_CYCLE;
    if (age < 0) age += LUNAR_CYCLE;
    return age;
}

function getPhase(age) {
    return PHASES.find(p => age >= p.minAge && age < p.maxAge) || PHASES[0];
}

function formatDate(date) {
    return date.toLocaleDateString('cs-CZ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function renderCycleGrid(currentPhase) {
    const grid = document.getElementById('lunarCycleGrid');
    grid.innerHTML = PHASES.map(p => `
        <div class="cycle-item ${p.name === currentPhase.name ? 'active' : ''}">
            <span class="cycle-emoji">${p.emoji}</span>
            <div class="cycle-name">${p.name}</div>
        </div>
    `).join('');
}

function renderPhase() {
    const now = new Date();
    const age = getLunarAge(now);
    const phase = getPhase(age);
    const illumination = Math.round(phase.illumination);

    document.getElementById('moonEmoji').textContent = phase.emoji;
    document.getElementById('phaseName').textContent = phase.name;
    document.getElementById('phaseDate').textContent = formatDate(now) + ` · Věk Měsíce: ${age.toFixed(1)} dní`;
    document.getElementById('illuminationFill').style.width = illumination + '%';
    document.getElementById('illuminationLabel').textContent = `Osvícení: ${illumination} %`;

    document.getElementById('phaseIntroTitle').textContent = `${phase.emoji} ${phase.name}`;
    document.getElementById('phaseTags').innerHTML = phase.tags.map(t => `<span class="tag">${t}</span>`).join('');
    document.getElementById('phaseInterpretation').textContent = phase.interpretation;
    document.getElementById('phaseAdvice').textContent = phase.advice;

    document.title = `${phase.emoji} ${phase.name} – Dnešní Lunární Fáze | Mystická Hvězda`;

    renderCycleGrid(phase);
}

renderPhase();
