import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODEL = 'claude-sonnet-4-5';
const PERSONAL_MAP_TIMEOUT_MS = 120000;

const SIGN_NAMES = {
    beran: 'Beran',
    byk: 'Býk',
    blizenci: 'Blíženci',
    rak: 'Rak',
    lev: 'Lev',
    panna: 'Panna',
    vahy: 'Váhy',
    stir: 'Štír',
    strelec: 'Střelec',
    kozoroh: 'Kozoroh',
    vodnar: 'Vodnář',
    ryby: 'Ryby'
};

const SIGN_GLYPHS = {
    beran: '♈︎',
    byk: '♉︎',
    blizenci: '♊︎',
    rak: '♋︎',
    lev: '♌︎',
    panna: '♍︎',
    vahy: '♎︎',
    stir: '♏︎',
    strelec: '♐︎',
    kozoroh: '♑︎',
    vodnar: '♒︎',
    ryby: '♓︎'
};

const DEFAULT_SECTIONS = {
    starSignature: {
        title: '',
        text: '',
        keywords: [],
        guidingQuestion: ''
    },
    essence: [],
    yearMantra: {
        sentence: '',
        text: ''
    },
    mainTheme: '',
    innerMirror: '',
    love: '',
    workMoney: '',
    growth: '',
    shadowGift: '',
    months: [],
    actionPlan: [],
    ritual: '',
    journalPrompts: [],
    closing: ''
};

const GENDER_LABELS = {
    feminine: 'ženský rod',
    masculine: 'mužský rod',
    neutral: 'neutrální formulace bez rodových shod'
};

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function paragraphs(text) {
    const chunks = String(text || '')
        .split(/\n{2,}|\r?\n/)
        .map(chunk => chunk.trim())
        .filter(Boolean);

    if (!chunks.length) return '<p>Text této části se připravuje.</p>';
    return chunks.map(chunk => `<p>${escapeHtml(chunk)}</p>`).join('');
}

function cardItems(items, fallbackTitle = 'Osobní vhled') {
    if (!Array.isArray(items) || !items.length) {
        return `
        <div class="insight-card">
          <div class="insight-card__label">01</div>
          <h3>${escapeHtml(fallbackTitle)}</h3>
          <p>Tenhle prostor se doplní podle osobního výkladu.</p>
        </div>`;
    }

    return items.slice(0, 4).map((item, index) => `
        <div class="insight-card">
          <div class="insight-card__label">${String(index + 1).padStart(2, '0')}</div>
          <h3>${escapeHtml(item?.title || fallbackTitle)}</h3>
          <p>${escapeHtml(item?.text || '')}</p>
        </div>`).join('');
}

function actionItems(items) {
    if (!Array.isArray(items) || !items.length) {
        return '<p>Konkrétní kroky se doplní podle osobního výkladu.</p>';
    }

    return items.slice(0, 5).map((item, index) => `
        <div class="action-row">
          <div class="action-number">${String(index + 1).padStart(2, '0')}</div>
          <div>
            <div class="action-title">${escapeHtml(item?.title || 'Krok')}</div>
            <p>${escapeHtml(item?.text || '')}</p>
          </div>
        </div>`).join('');
}

function journalItems(items) {
    if (!Array.isArray(items) || !items.length) {
        return '<p>Otázky k zápisu se doplní podle osobního výkladu.</p>';
    }

    return items.slice(0, 6).map((item, index) => `
        <div class="journal-row">
          <div class="journal-index">${String(index + 1).padStart(2, '0')}</div>
          <div>
            <p>${escapeHtml(item)}</p>
            <div class="journal-lines" aria-hidden="true"></div>
          </div>
        </div>`).join('');
}

function normalizeMonths(months) {
    if (!Array.isArray(months)) return [];
    return months
        .map(item => ({
            month: escapeHtml(item?.month || ''),
            title: escapeHtml(item?.title || ''),
            text: escapeHtml(item?.text || '')
        }))
        .filter(item => item.month || item.title || item.text)
        .slice(0, 6);
}

function formatDateCz(dateValue) {
    const parsed = new Date(dateValue);
    if (Number.isNaN(parsed.getTime())) return escapeHtml(dateValue || '');
    return parsed.toLocaleDateString('cs-CZ', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}

function fileUrl(relativePath) {
    return pathToFileURL(path.join(rootDir, relativePath)).href;
}

function imageDataUri(relativePath) {
    const extension = path.extname(relativePath).toLowerCase();
    const mimeType = extension === '.webp'
        ? 'image/webp'
        : extension === '.jpg' || extension === '.jpeg'
            ? 'image/jpeg'
            : 'image/png';
    const imagePath = path.join(rootDir, relativePath);
    return `data:${mimeType};base64,${fs.readFileSync(imagePath).toString('base64')}`;
}

async function callClaudeForPersonalMap(systemPrompt, userPrompt) {
    if (process.env.MOCK_AI === 'true' || process.env.NODE_ENV === 'test') {
        return JSON.stringify(samplePersonalMapData.sections);
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        throw new Error('ANTHROPIC_API_KEY not set');
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PERSONAL_MAP_TIMEOUT_MS);

    try {
        const response = await fetch(CLAUDE_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: CLAUDE_MODEL,
                max_tokens: 8192,
                system: systemPrompt,
                messages: [{ role: 'user', content: userPrompt }]
            }),
            signal: controller.signal
        });

        if (!response.ok) {
            throw new Error(`Claude API ${response.status}: ${await response.text()}`);
        }

        const data = await response.json();
        return data.content?.[0]?.text || '';
    } finally {
        clearTimeout(timer);
    }
}

function extractJsonPayload(raw) {
    const text = String(raw || '').trim()
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```$/i, '')
        .trim();
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');

    if (start === -1 || end === -1 || end <= start) {
        throw new Error('Claude returned no JSON object.');
    }

    return text.slice(start, end + 1);
}

function normalizePersonalMapSections(value) {
    const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    return {
        starSignature: {
            ...DEFAULT_SECTIONS.starSignature,
            ...(source.starSignature && typeof source.starSignature === 'object' ? source.starSignature : {})
        },
        essence: Array.isArray(source.essence) ? source.essence.slice(0, 4) : [],
        yearMantra: {
            ...DEFAULT_SECTIONS.yearMantra,
            ...(source.yearMantra && typeof source.yearMantra === 'object' ? source.yearMantra : {})
        },
        mainTheme: typeof source.mainTheme === 'string' ? source.mainTheme : '',
        innerMirror: typeof source.innerMirror === 'string' ? source.innerMirror : '',
        love: typeof source.love === 'string' ? source.love : '',
        workMoney: typeof source.workMoney === 'string' ? source.workMoney : '',
        growth: typeof source.growth === 'string' ? source.growth : '',
        shadowGift: typeof source.shadowGift === 'string' ? source.shadowGift : '',
        months: Array.isArray(source.months) ? source.months.slice(0, 6) : [],
        actionPlan: Array.isArray(source.actionPlan) ? source.actionPlan.slice(0, 5) : [],
        ritual: typeof source.ritual === 'string' ? source.ritual : '',
        journalPrompts: Array.isArray(source.journalPrompts) ? source.journalPrompts.slice(0, 6) : [],
        closing: typeof source.closing === 'string' ? source.closing : ''
    };
}

function buildPersonalMapFallbackSections({
    name = '',
    sign = '',
    focus = '',
    year = new Date().getFullYear()
} = {}) {
    const signName = SIGN_NAMES[sign] || sign || 'tvoje znameni';
    const displayName = name || 'ty';
    const focusText = focus
        ? `Tema, se kterym prichazis, je: ${focus}`
        : 'Hlavni tema neni zadane, proto se mapa soustredi na smer, hranice a klid v beznem dni.';

    return {
        starSignature: {
            title: `Tichy kompas ${signName}`,
            text: `${displayName}, tahle mapa vznikla jako bezpecny zalozni vyklad pro pripad, kdy se AI generovani zpozdi nebo selze. Je postavena kolem znameni ${signName} a roku ${year}. Nehraje si na jistou predpoved; slouzi jako osobni zrcadlo pro dalsi kroky. ${focusText} V beznem dni si vsimej hlavne toho, kde se ti telo uvolni, kdyz neco zjednodusis, a kde se naopak stahuje, kdyz rikas ano jen ze zvyku.`,
            keywords: ['smer', 'hranice', 'klid'],
            guidingQuestion: 'Kde uz znam odpoved, ale porad cekam na dokonale potvrzeni?'
        },
        essence: [
            {
                title: 'Hlavni dar',
                text: `Tvuj dar je schopnost citit, kdy je cas zpomalit a kdy je cas udelat jasny krok. U znameni ${signName} se to muze ukazovat jako citlivost na naladu prostoru, ale i jako odvaha chranit vlastni rytmus. Prakticky to poznas podle okamziku, kdy ti jednoduchost vrati vic energie nez dalsi vysvetlovani.`
            },
            {
                title: 'Opakujici se vzorec',
                text: 'Stary vzorec se muze objevit ve chvili, kdy zacnes odkladat vlastni potrebu, aby se nikdo jiny nemusel citit neprijemne. V beznem dni to poznas podle rychle omluvy, dlouhe zpravy nebo pocitu, ze musis vse uhladit driv, nez si dovolis rict pravdu.'
            },
            {
                title: 'Prahove tema',
                text: `Rok ${year} te vede k tomu, aby sis vybral jeden konkretni smer misto mnoha rozevrenych moznosti. Nejde o tlak na vykon. Jde o vycisteni prostoru, ve kterem uz dlouho drzis veci jen proto, ze jsou rozepsane, slibene nebo pro nekoho pohodlne.`
            },
            {
                title: 'Co se chce zmenit',
                text: 'Zmena zacina tam, kde prestanes brat vlastni klid jako odmenu az po splneni vsech ukolu. Dej mu misto driv. Jeden odmitnuty zavazek, jedna kratsi odpoved nebo jeden vecer bez dalsiho reseni muze ukazat, kolik energie se vrati, kdyz se neprepisujes podle okoli.'
            }
        ],
        yearMantra: {
            sentence: 'Volim krok, ktery mi vraci klid, ne jen prijatelny obraz.',
            text: `Tahle veta je kotva pro rok ${year}. Vracej se k ni ve chvili, kdy budes chtit udelat rozhodnuti jen proto, aby bylo po napeti. Klid neni vzdy nejrychlejsi odpoved. Casto je to ta nejpravdivejsi. Poznas ho podle toho, ze po nem zustane vic prostoru v tele i v mysli.`
        },
        mainTheme: `${displayName}, hlavni tema teto mapy je navrat k jednodussimu smeru. ${focusText} V praxi to znamena mene dokazovani a vice presnosti. Nemusis menit cely zivot najednou. Staci najit jedno misto, kde dlouho davas vic energie, nez se ti vraci. Tam zacina skutecny posun. Poznas ho podle drobnych signalu: odkladana odpoved, unava po rozhovoru, tlak v hrudi pred slibem nebo zvlastni uleva, kdyz si dovolis rict pravdu kratce. Znameni ${signName} tu neni jako nalepka, ale jako jazyk pro zpusob, jakym se vracis k sobe. Tvuj prakticky krok je vybrat jednu vec, kterou prestanes ridit za ostatni.`,
        innerMirror: 'Vnitrni zrcadlo ukazuje rozdil mezi zodpovednosti a prevzetim cizi vahy. Pokud se pristihnes, ze v hlave dokola skladas dokonale vysvetleni, zastav se. Mozna uz nehledas pravdu, ale bezpecnou formu, ktera nikoho nerozhodi. V beznem dni se to ukaze pri zprave, na kterou odpovidas moc rychle, nebo pri nabidce, kterou prijimas driv, nez se zeptas tela. Prakticky krok je jednoduchy: pred dulezitym ano dej deset minut ticha a napis si jednu vetu, kterou nechces zjemnovat.',
        love: 'Ve vztazich se nejvic pocita pravdivost bez zbytecne tvrdosti. Pokud cekas, az druhy clovek pochopi vse sam, muzes ztratit spoustu sil. Pokud naopak reknes potrebu vcas, vztah dostane sanci stat na realite, ne na domnence. Poznas to podle toho, jestli se po kontaktu citis vic sebou, nebo vic ve strehu. Tvuj prakticky krok je rict jednu konkretni potrebu bez dlouhe obhajoby.',
        workMoney: 'V praci a penezich je hlavni tema hodnota. Ne vse, co umis, ma automaticky dostat tvuj cas. Vsimni si ukolu, ktere te stoji nejvic energie proto, ze nemaji jasne hranice. Rok preje tomu, abys pojmenoval cenu, rozsah, termin nebo odpovednost. Nejde o slib rychleho zisku. Jde o to, aby tvoje energie netekla do mlhy. Jeden jasnejsi ramec muze uvolnit vic sily nez dalsi snaha.',
        growth: 'Rust v tomto obdobi neni o dramatickem obratu. Je o opakovanem navratu k tomu, co uz vis. Vsimni si, kde se snazis ziskat povoleni pro rozhodnuti, ktere je uvnitr jasne. Prakticky krok je zapisovat si male momenty ulevy. Casto ukazuji smer presneji nez velke argumenty.',
        shadowGift: 'Stin se muze projevit jako prehnana ochota zustat dostupny. Dar tohoto stinu je presnost: kdyz prestanes dokazovat svou hodnotu tim, kolik uneses, zacnes lepe videt, komu patri tvoje blizkost, cas a pozornost. Nejde o chlad. Jde o laskavost, ktera nezapomina na tebe.',
        months: [
            { month: 'Kveten', title: 'vyjasneni rytmu', text: 'Vsimni si, co ti bere klid opakovane. Jeden maly signal se muze vratit nekolikrat, aby ukazal, kde je cas zjednodusit pravidla.' },
            { month: 'Cervenec', title: 'viditelny krok', text: 'Dobre obdobi pro jasnejsi rozhodnuti nebo verejnejsi krok. Nepotrebujes dokonalost, potrebujes smer a jednu konkretni akci.' },
            { month: 'Zari', title: 'hranice v praxi', text: 'Zari proveri, jestli sve hranice jen citis, nebo je umis i pojmenovat. Kratka pravdiva veta bude silnejsi nez dlouhe vysvetlovani.' },
            { month: 'Listopad', title: 'hlubsi pravda', text: 'Neco pod povrchem bude chtit dostat slova. Vyhni se dramatizaci, ale ani pravdu nezmensuj jen proto, aby byla pohodlna.' },
            { month: 'Prosinec', title: 'uzavreni kruhu', text: 'Konec roku je vhodny pro odlozeni zavazku, ktere uz neodpovidaji tomu, kam jdes. Zapis si, co nechces prenaset dal.' }
        ],
        actionPlan: [
            { title: 'Vyber jednu zatez', text: 'Napis si jednu vec, kterou drzis hlavne proto, aby mel nekdo jiny klid. Rozhodni, jestli ji ohranicis, predas nebo uzavres.' },
            { title: 'Zkrat jednu odpoved', text: 'Tam, kde bys normalne vysvetloval dlouze, zkus jednu jasnou vetu. Sleduj, jestli prijde uleva nebo potreba se hned omlouvat.' },
            { title: 'Over telo pred ano', text: 'Pred dulezitym souhlasem se zastav na deset minut. Vsimni si, jestli telo mekne, nebo tuhne. Ber ten signal vazne.' },
            { title: 'Zjednodus zavazek', text: 'Vyber jeden pracovni nebo osobni zavazek a dopln mu hranici: termin, cenu, rozsah nebo jasne ne.' },
            { title: 'Vrat se k jedne otazce', text: 'Na konci tydne si poloz otazku: kde jsem se tento tyden neopustil? Odpoved ukaze, co ma pokracovat.' }
        ],
        ritual: 'Vecer si nech deset minut bez telefonu. Napis tri vety: co uz nechci drzet za ostatni, kde potrebuji vic pravdy a jaky maly krok udelam do sedmi dnu. Potom jednu vetu zakrouzkuj. Nech ji na viditelnem miste. Kdykoli zacnes znovu vysvetlovat nebo odkladat jasny krok, vrat se k ni jako ke kotve.',
        journalPrompts: [
            'Kde si pletu klid s odkladanim pravdy?',
            'Ktera jedna povinnost uz potrebuje hranici?',
            'Co mi telo rika driv nez hlava?',
            'Kde cekam na potvrzeni, ktere nepotrebuji?',
            'Jaky maly krok mi tento tyden vrati prostor?',
            'Co nechci prenaset do dalsiho obdobi?'
        ],
        closing: `${displayName}, tahle mapa neni rozsudek ani slib. Je to zrcadlo pro rok ${year}. Pokud si z ni vezmes jen jednu vec, at je to dovoleni zjednodusit tam, kde uz dlouho delas vse slozitejsi, nez musi byt. Skutecny posun se casto neohlasi velkym znamenim. Prijde jako kratka veta, klidnejsi odpoved, jasnejsi hranice nebo vecer, kdy poprve neprevezmes cizi tlak. To je dost. Odtud muze zacit dalsi krok.`
    };
}

function sectionPage({
    kicker,
    title,
    children,
    accent = '✦',
    variant = 'standard',
    sideTitle = '',
    sideText = ''
}) {
    const sideNote = sideText
        ? `<aside class="side-note">
            <div class="side-note__label">${escapeHtml(sideTitle || 'V běžném dni')}</div>
            <p>${escapeHtml(sideText)}</p>
          </aside>`
        : '';

    return `
    <section class="mh-pdf-page mh-pdf-page--content mh-pdf-page--${escapeHtml(variant)}">
      <div class="page-rail" aria-hidden="true">${accent}</div>
      <header class="content-header">
        <div class="content-kicker">${escapeHtml(kicker)}</div>
        <h2>${escapeHtml(title)}</h2>
      </header>
      <div class="chapter-rule"></div>
      <div class="content-flow">
        <div class="body-copy">${children}</div>
        ${sideNote}
      </div>
    </section>`;
}

function buildPersonalMapGenerationPrompt({
    name,
    birthDate,
    sign,
    birthTime = '',
    birthPlace = '',
    focus = '',
    grammaticalGender = 'neutral',
    year = new Date().getFullYear()
} = {}) {
    const signName = SIGN_NAMES[sign] || sign || '';
    const genderLabel = GENDER_LABELS[grammaticalGender] || GENDER_LABELS.neutral;

    const system = `Jsi Mystická Hvězda, česká autorka prémiových osobních výkladů. Píšeš intimně, konkrétně a lidsky. Tykáš. Nevěštíš deterministicky, nedáváš zdravotní, právní ani finanční jistoty. Nepíšeš obecné fráze typu "čeká tě mnoho změn" bez konkrétního vysvětlení. Každý odstavec musí odpovědět: co to pro člověka prakticky znamená a čeho si má všimnout.`;

    const user = `Vytvoř hluboký osobní výklad pro placené PDF "Osobní mapa zbytku roku ${year}".

Profil:
- Jméno: ${name || '[jméno]'}
- Datum narození: ${birthDate || '[datum narození]'}
- Čas narození: ${birthTime || '[nezadáno]'}
- Místo narození: ${birthPlace || '[nezadáno]'}
- Znamení: ${signName || '[znamení]'}
- Hlavní otázka / zaměření: ${focus || '[nezadáno]'}
- Preferovaný gramatický rod adresace: ${genderLabel}

Vrať pouze validní JSON bez markdownu. Struktura:
{
  "starSignature": {
    "title": "2-5 slov. Osobní archetyp člověka, ne znamení samotné.",
    "text": "120-160 slov. Prémiový úvodní podpis: jak člověk působí, co je jeho tichá síla a kde se v běžném životě ztrácí.",
    "keywords": ["3 krátká osobní slova"],
    "guidingQuestion": "jedna hluboká otázka pro celé období"
  },
  "essence": [
    {"title": "Hlavní dar", "text": "55-75 slov"},
    {"title": "Opakující se vzorec", "text": "55-75 slov"},
    {"title": "Prahové téma", "text": "55-75 slov"},
    {"title": "Co se chce změnit", "text": "55-75 slov"}
  ],
  "yearMantra": {
    "sentence": "jedna silná osobní věta na 10-18 slov",
    "text": "70-100 slov. Vysvětli, proč je tahle věta pro člověka důležitá a kdy se k ní vracet."
  },
  "mainTheme": "220-280 slov. Osobní syntéza období, konkrétně propojená se znamením a zadaným zaměřením.",
  "innerMirror": "220-280 slov. Vnitřní emoční vzorec, způsob rozhodování, co člověk přehlušuje a co potřebuje slyšet.",
  "love": "220-280 slov. Vztahy, blízkost, hranice, komunikace. Piš pro zadaný stav obecně, bez předpokladu partnera.",
  "workMoney": "220-280 slov. Práce, peníze, hodnota, energie, rozhodnutí. Žádné finanční sliby.",
  "growth": "180-230 slov. Vývojová lekce a konkrétní posun chování.",
  "shadowGift": "180-230 slov. Stínová stránka a její dar, bez odsuzování.",
  "months": [
    {"month": "Měsíc", "title": "krátký název", "text": "45-65 slov"}
  ],
  "actionPlan": [
    {"title": "Konkrétní krok", "text": "45-60 slov"}
  ],
  "ritual": "100-140 slov. Jednoduchý bezpečný rituál bez nároků na speciální pomůcky.",
  "journalPrompts": [
    "5-6 hlubokých otázek k zápisu, každá otázka max 18 slov, konkrétní k výkladu"
  ],
  "closing": "180-230 slov. Osobní závěrečné poselství se jménem, silné a citlivé, ale ne přehnaně dramatické."
}

Pravidla kvality:
- Piš jako prémiový osobní výklad, ne jako denní horoskop.
- Každá sekce musí obsahovat alespoň 2 konkrétní signály v běžném životě.
- Každá hlavní kapitola musí obsahovat formulaci typu: "poznáš to podle...", "v běžném dni se to ukáže..." nebo "tvůj praktický krok je...".
- Nepoužívej stejný hlavní motiv pořád dokola. Střídej vztahové situace, tělesné signály, pracovní realitu, komunikaci, odpočinek a rozhodování.
- Dodrž zadaný gramatický rod. Pokud je rod neutrální, vyhýbej se tvarům jako připravená/připravený, silná/silný, laskavá/laskavý.
- StarSignature, YearMantra a JournalPrompts musí působit jako osobní bonusové stránky, ne jako výplň.
- Vyhni se prázdným slovům: energie, transformace, vesmír, pokud je hned nevysvětlíš konkrétně.
- Nepiš diagnózy, jisté předpovědi ani manipulativní strach.
- Jazyk: čeština, 2. osoba jednotného čísla.`;

    return { system, user };
}

export async function generatePersonalMapContent(input = {}) {
    const { system, user } = buildPersonalMapGenerationPrompt(input);
    try {
        const raw = await callClaudeForPersonalMap(system, user);
        const parsed = JSON.parse(extractJsonPayload(raw));
        const sections = parsed?.sections && typeof parsed.sections === 'object' ? parsed.sections : parsed;
        return normalizePersonalMapSections(sections);
    } catch (error) {
        console.error('[PERSONAL_MAP] AI generation failed, using local fallback:', error.message);
        return normalizePersonalMapSections(buildPersonalMapFallbackSections(input));
    }
}

export function buildPersonalMapHtml(input) {
    const sections = { ...DEFAULT_SECTIONS, ...(input.sections || {}) };
    const signName = SIGN_NAMES[input.sign] || input.sign || '';
    const glyph = SIGN_GLYPHS[input.sign] || '✦';
    const year = input.year || new Date().getFullYear();
    const productName = input.productName || `Osobní mapa zbytku roku ${year}`;
    const name = escapeHtml(input.name || 'Tvoje jméno');
    const birthDate = formatDateCz(input.birthDate);
    const question = escapeHtml(input.focus || 'vnitřní klid, vztahy a směr');
    const starSignature = {
        title: sections.starSignature?.title || 'Tichá rovnováha',
        text: sections.starSignature?.text || 'Tahle část se doplní podle osobního výkladu.',
        keywords: Array.isArray(sections.starSignature?.keywords) ? sections.starSignature.keywords.slice(0, 3) : [],
        guidingQuestion: sections.starSignature?.guidingQuestion || 'Kde se vracíš k sobě, i když kolem tebe zůstává hluk?'
    };
    const yearMantra = {
        sentence: sections.yearMantra?.sentence || 'Nemusím se zmenšit, aby kolem mě mohl být klid.',
        text: sections.yearMantra?.text || 'Tahle věta se doplní podle osobního výkladu.'
    };
    const months = normalizeMonths(sections.months);
    const coverArt = input.assets?.cover || imageDataUri('img/personal-map/cover-luxury-pdf.jpg');
    const pageBg = input.assets?.pageBackground || imageDataUri('img/personal-map/page-bg-luxury-pdf.jpg');

    const monthHtml = months.length
        ? months.map((item, index) => `
            <div class="month-row">
              <div class="month-index">${String(index + 1).padStart(2, '0')}</div>
              <div>
                <div class="month-title">${item.month}${item.title ? ` · ${item.title}` : ''}</div>
                <p>${item.text}</p>
              </div>
            </div>`).join('')
        : '<p>Klíčové měsíce se doplní podle osobního výkladu.</p>';

    const keywordHtml = starSignature.keywords.length
        ? starSignature.keywords.map(keyword => `<span>${escapeHtml(keyword)}</span>`).join('')
        : '<span>klid</span><span>pravda</span><span>návrat</span>';

    return `<!DOCTYPE html>
<html lang="cs">
<head>
<meta charset="utf-8">
<title>${escapeHtml(productName)} · ${name}</title>
<style>
@font-face {
  font-family: 'CinzelLocal';
  src: url('${fileUrl('fonts/cinzel-latin-ext.woff2')}') format('woff2');
  font-weight: 400 800;
}
@font-face {
  font-family: 'InterLocal';
  src: url('${fileUrl('fonts/inter-latin-ext.woff2')}') format('woff2');
  font-weight: 100 900;
}

@page { size: A4; margin: 0; }

* { box-sizing: border-box; }

html { color-scheme: dark; }

body {
  margin: 0;
  background: #050510;
  color: #f4ead6;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 12.2pt;
  line-height: 1.68;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

.mh-pdf-page {
  width: 210mm;
  min-height: 297mm;
  position: relative;
  overflow: hidden;
  page-break-after: always;
  background: #050510;
}

.mh-pdf-page:last-child { page-break-after: auto; }

.mh-pdf-page:not(.mh-pdf-page--cover)::before {
  content: 'Mystická Hvězda · Osobní mapa';
  position: absolute;
  top: 9mm;
  left: 18mm;
  right: 18mm;
  z-index: 2;
  padding-bottom: 3mm;
  border-bottom: 1px solid rgba(255, 215, 0, .22);
  font-family: InterLocal, Arial, sans-serif;
  text-transform: uppercase;
  letter-spacing: 3px;
  color: rgba(255, 215, 0, .58);
  font-size: 7.2pt;
}

.mh-pdf-page:not(.mh-pdf-page--cover)::after {
  content: 'mystickahvezda.cz';
  position: absolute;
  left: 18mm;
  right: 18mm;
  bottom: 8mm;
  z-index: 2;
  padding-top: 3mm;
  border-top: 1px solid rgba(255, 215, 0, .18);
  font-family: InterLocal, Arial, sans-serif;
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 3px;
  color: rgba(255, 215, 0, .42);
  font-size: 7pt;
}

.mh-pdf-page--cover {
  background-color: #050510;
  background-image: url('${coverArt}');
  background-size: cover;
  background-position: center;
  display: grid;
  place-items: center;
  text-align: center;
  padding: 18mm 18mm;
}

.cover-frame {
  width: 100%;
  height: 100%;
  border: 1px solid rgba(238, 197, 95, .34);
  outline: 1px solid rgba(238, 197, 95, .1);
  outline-offset: -6mm;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  padding: 16mm 14mm 14mm;
  background: transparent;
}

.cover-title-block {
  margin-top: 122mm;
}

.brand-mark,
.content-kicker,
.footer-mark {
  font-family: InterLocal, Arial, sans-serif;
  text-transform: uppercase;
  letter-spacing: 3.5px;
  color: rgba(238, 197, 95, .72);
  font-size: 8.3pt;
}

.cover-title {
  font-family: CinzelLocal, Georgia, serif;
  font-size: 27pt;
  line-height: 1.18;
  letter-spacing: 1.4px;
  text-transform: uppercase;
  max-width: 140mm;
  margin: 0 auto 4mm;
}

.cover-subtitle {
  max-width: 128mm;
  margin: 0 auto;
  color: rgba(244, 234, 214, .78);
  font-size: 12pt;
}

.cover-name {
  font-family: CinzelLocal, Georgia, serif;
  font-size: 15pt;
  letter-spacing: 1.8px;
  color: #fff8e8;
  text-transform: uppercase;
}

.cover-meta {
  margin-top: 2mm;
  font-family: InterLocal, Arial, sans-serif;
  font-size: 8.8pt;
  color: rgba(244, 234, 214, .58);
  letter-spacing: .7px;
}

.mh-pdf-page--intro,
.mh-pdf-page--signature,
.mh-pdf-page--essence,
.mh-pdf-page--mantra,
.mh-pdf-page--content,
.mh-pdf-page--timeline,
.mh-pdf-page--actions,
.mh-pdf-page--ritual,
.mh-pdf-page--journal,
.mh-pdf-page--closing {
  padding: 28mm 19mm 23mm;
  background-color: #050510;
  background-image: url('${pageBg}');
  background-size: cover;
  background-position: center;
  box-shadow:
    inset 0 0 0 1px rgba(255, 215, 0, .08),
    inset 12mm 0 40mm rgba(5,5,16,.28);
}

.mh-pdf-page--intro {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.mh-pdf-page--essence,
.mh-pdf-page--actions {
  padding: 27mm 18mm 23mm;
}

.essence-title {
  margin-top: 4mm;
  font-family: CinzelLocal, Georgia, serif;
  color: #f1cf76;
  text-transform: uppercase;
  letter-spacing: 1.2px;
  font-size: 22pt;
  line-height: 1.18;
}

.essence-subtitle {
  margin: 5mm 0 9mm;
  color: rgba(244,234,214,.76);
  max-width: 152mm;
}

.insight-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 5mm;
}

.insight-card {
  min-height: 63mm;
  border: 1px solid rgba(255,215,0,.24);
  background: rgba(10, 12, 30, .9);
  padding: 6mm;
  position: relative;
  box-shadow: 0 12px 34px rgba(0,0,0,.16);
}

.insight-card__label {
  font-family: CinzelLocal, Georgia, serif;
  color: rgba(241,207,118,.44);
  font-size: 15pt;
  margin-bottom: 3mm;
}

.insight-card h3 {
  margin: 0 0 3mm;
  font-family: InterLocal, Arial, sans-serif;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: #f1cf76;
  font-size: 8.8pt;
}

.insight-card p {
  margin: 0;
  color: rgba(244,234,214,.82);
  font-size: 10.7pt;
  line-height: 1.5;
}

.mh-pdf-page--mantra {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 28mm 24mm 26mm;
  text-align: center;
}

.mantra-shell {
  width: 100%;
  max-width: 150mm;
  border-top: 1px solid rgba(212,175,55,.34);
  border-bottom: 1px solid rgba(212,175,55,.34);
  padding: 18mm 10mm;
}

.mantra-sentence {
  margin: 5mm auto 7mm;
  max-width: 135mm;
  font-family: CinzelLocal, Georgia, serif;
  color: #fff8e8;
  font-size: 25pt;
  line-height: 1.18;
  text-transform: uppercase;
  letter-spacing: 1px;
  text-wrap: balance;
}

.mantra-copy {
  max-width: 122mm;
  margin: 0 auto;
  color: rgba(244,234,214,.8);
  font-size: 12pt;
  line-height: 1.65;
}

.intro-panel {
  border: 1px solid rgba(255,215,0,.28);
  padding: 18mm 16mm;
  background: rgba(10, 12, 30, .92);
  box-shadow: inset 0 0 70px rgba(255,215,0,.05), 0 16px 48px rgba(0,0,0,.22);
}

.intro-title,
.content-header h2,
.timeline-title,
.closing-title {
  font-family: CinzelLocal, Georgia, serif;
  color: #f1cf76;
  text-transform: uppercase;
  letter-spacing: 1.2px;
  line-height: 1.18;
  margin: 0;
  text-wrap: balance;
}

.intro-title { font-size: 24pt; }

.intro-lede {
  margin: 8mm 0 0;
  color: rgba(244,234,214,.84);
  font-size: 13.4pt;
}

.signal-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4mm;
  margin-top: 13mm;
}

.signal {
  border-top: 1px solid rgba(212,175,55,.42);
  padding-top: 4mm;
}

.signal-label {
  font-family: InterLocal, Arial, sans-serif;
  font-size: 7.4pt;
  letter-spacing: 2px;
  color: rgba(238,197,95,.72);
  text-transform: uppercase;
}

.signal-value {
  margin-top: 2mm;
  color: #fff8e8;
  font-size: 11pt;
}

.mh-pdf-page--signature {
  padding: 30mm 22mm 24mm;
}

.signature-layout {
  min-height: 235mm;
  display: grid;
  grid-template-columns: 64mm minmax(0, 1fr);
  gap: 13mm;
  align-items: center;
}

.signature-seal {
  position: relative;
  width: 58mm;
  height: 58mm;
  border: 1px solid rgba(212,175,55,.44);
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: #f1cf76;
  background: transparent;
  box-shadow: none;
}

.signature-seal::before,
.signature-seal::after {
  content: '';
  position: absolute;
  border: 1px solid rgba(212,175,55,.2);
  border-radius: 50%;
}

.signature-seal::before { inset: 7mm; }
.signature-seal::after {
  inset: 15mm;
}

.signature-glyph {
  font-family: CinzelLocal, Georgia, serif;
  font-size: 29pt;
  line-height: 1;
}

.signature-title {
  margin: 4mm 0 6mm;
  font-family: CinzelLocal, Georgia, serif;
  color: #f1cf76;
  font-size: 24pt;
  line-height: 1.14;
  text-transform: uppercase;
  letter-spacing: 1.2px;
}

.signature-copy {
  color: rgba(244,234,214,.86);
  font-size: 12.4pt;
  line-height: 1.66;
}

.signature-copy p { margin: 0 0 4.4mm; }

.signature-keywords {
  display: flex;
  flex-wrap: wrap;
  gap: 3mm;
  margin-top: 8mm;
}

.signature-keywords span {
  border: 1px solid rgba(212,175,55,.24);
  padding: 2mm 4mm;
  font-family: InterLocal, Arial, sans-serif;
  font-size: 7.6pt;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: rgba(241,207,118,.82);
  background: rgba(10,12,30,.58);
}

.signature-question {
  margin-top: 10mm;
  padding: 6mm 7mm;
  border-left: 2px solid rgba(212,175,55,.62);
  background: rgba(212,175,55,.07);
  color: rgba(255,248,232,.9);
  font-size: 12pt;
}

.page-rail {
  position: absolute;
  left: 7mm;
  top: 18mm;
  bottom: 18mm;
  width: 8mm;
  border-right: 1px solid rgba(212,175,55,.22);
  color: rgba(212,175,55,.38);
  font-family: Georgia, serif;
  font-size: 18pt;
  display: flex;
  align-items: center;
  justify-content: center;
}

.content-header {
  margin-left: 8mm;
  padding-right: 6mm;
}

.content-header h2 {
  font-size: 20pt;
  margin-top: 3mm;
}

.chapter-rule {
  height: 1px;
  background: rgba(212,175,55,.46);
  margin: 7mm 0 8mm 8mm;
}

.content-flow {
  position: relative;
  z-index: 1;
}

.body-copy {
  margin-left: 8mm;
  color: rgba(244,234,214,.86);
}

.body-copy p {
  margin: 0 0 4.6mm;
}

.body-copy p:first-child::first-letter {
  font-family: CinzelLocal, Georgia, serif;
  float: left;
  font-size: 34pt;
  line-height: .9;
  padding: 1.6mm 2mm 0 0;
  color: #f1cf76;
}

.callout {
  margin-top: 8mm;
  padding: 6mm 7mm;
  border-left: 2px solid rgba(212,175,55,.58);
  background: rgba(212,175,55,.075);
  color: rgba(255,248,232,.9);
}

.deep-note {
  margin-top: 6mm;
  padding: 5mm 6mm;
  border: 1px solid rgba(212,175,55,.18);
  background: rgba(5,5,16,.36);
  color: rgba(244,234,214,.78);
  font-size: 11.4pt;
}

.mh-pdf-page--split .content-flow {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 45mm;
  gap: 8mm;
  margin-left: 8mm;
}

.mh-pdf-page--split .body-copy {
  margin-left: 0;
}

.mh-pdf-page--split .body-copy p {
  font-size: 11.4pt;
  line-height: 1.62;
}

.side-note {
  align-self: start;
  border: 1px solid rgba(212,175,55,.22);
  border-top: 3px solid rgba(212,175,55,.54);
  padding: 5mm;
  background: rgba(10,12,30,.76);
  color: rgba(244,234,214,.78);
}

.side-note__label {
  margin-bottom: 3mm;
  font-family: InterLocal, Arial, sans-serif;
  font-size: 7.3pt;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: #f1cf76;
}

.side-note p {
  margin: 0;
  font-size: 10.2pt;
  line-height: 1.55;
}

.mh-pdf-page--timeline {
  padding-left: 22mm;
}

.timeline-title {
  font-size: 22pt;
  margin-top: 4mm;
}

.timeline-subtitle {
  margin: 5mm 0 10mm;
  max-width: 145mm;
  color: rgba(244,234,214,.76);
}

.month-row {
  display: grid;
  grid-template-columns: 15mm 1fr;
  gap: 5mm;
  padding: 3.6mm 0;
  border-top: 1px solid rgba(212,175,55,.18);
}

.month-index {
  font-family: CinzelLocal, Georgia, serif;
  color: rgba(241,207,118,.62);
  font-size: 14pt;
}

.month-title {
  font-family: InterLocal, Arial, sans-serif;
  text-transform: uppercase;
  letter-spacing: 1.6px;
  font-size: 8.5pt;
  color: #f1cf76;
  margin-bottom: 1.5mm;
}

.month-row p {
  margin: 0;
  color: rgba(244,234,214,.82);
  font-size: 10.7pt;
  line-height: 1.45;
}

.actions-title {
  margin-top: 4mm;
  font-family: CinzelLocal, Georgia, serif;
  color: #f1cf76;
  text-transform: uppercase;
  letter-spacing: 1.2px;
  font-size: 22pt;
  line-height: 1.18;
}

.actions-subtitle {
  margin: 5mm 0 8mm;
  max-width: 145mm;
  color: rgba(244,234,214,.76);
}

.action-row {
  display: grid;
  grid-template-columns: 14mm 1fr;
  gap: 5mm;
  padding: 3.3mm 0;
  border-top: 1px solid rgba(212,175,55,.18);
}

.action-number {
  font-family: CinzelLocal, Georgia, serif;
  color: rgba(241,207,118,.62);
  font-size: 14pt;
}

.action-title {
  font-family: InterLocal, Arial, sans-serif;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  font-size: 8.4pt;
  color: #f1cf76;
  margin-bottom: 1.5mm;
}

.action-row p {
  margin: 0;
  color: rgba(244,234,214,.82);
  font-size: 10.6pt;
  line-height: 1.44;
}

.mh-pdf-page--ritual {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 28mm 25mm 26mm;
}

.ritual-shell {
  width: 100%;
  max-width: 150mm;
  border: 1px solid rgba(212,175,55,.3);
  padding: 15mm 16mm;
  background: rgba(10,12,30,.78);
}

.ritual-title {
  margin: 0 0 7mm;
  font-family: CinzelLocal, Georgia, serif;
  color: #f1cf76;
  font-size: 23pt;
  line-height: 1.15;
  text-transform: uppercase;
  letter-spacing: 1.2px;
}

.ritual-copy {
  color: rgba(244,234,214,.86);
  font-size: 12.2pt;
}

.ritual-copy p {
  margin: 0 0 4.4mm;
}

.mh-pdf-page--journal {
  padding: 27mm 19mm 23mm;
}

.journal-title {
  margin: 4mm 0 5mm;
  font-family: CinzelLocal, Georgia, serif;
  color: #f1cf76;
  font-size: 22pt;
  line-height: 1.16;
  text-transform: uppercase;
  letter-spacing: 1.2px;
}

.journal-subtitle {
  max-width: 142mm;
  margin: 0 0 8mm;
  color: rgba(244,234,214,.74);
}

.journal-row {
  display: grid;
  grid-template-columns: 13mm 1fr;
  gap: 5mm;
  padding: 4.2mm 0;
  border-top: 1px solid rgba(212,175,55,.18);
}

.journal-index {
  font-family: CinzelLocal, Georgia, serif;
  color: rgba(241,207,118,.62);
  font-size: 13pt;
}

.journal-row p {
  margin: 0 0 3mm;
  color: rgba(244,234,214,.88);
}

.journal-lines {
  height: 11mm;
  border-top: 1px solid rgba(244,234,214,.18);
  border-bottom: 1px solid rgba(244,234,214,.12);
}

.mh-pdf-page--closing {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 26mm 24mm;
  text-align: center;
}

.closing-title {
  font-size: 24pt;
}

.closing-copy {
  margin-top: 9mm;
  color: rgba(244,234,214,.88);
  font-size: 12.6pt;
  line-height: 1.64;
}

.footer-mark {
  position: absolute;
  bottom: 12mm;
  left: 0;
  right: 0;
  text-align: center;
  color: rgba(238,197,95,.42);
}
</style>
</head>
<body>
  <section class="mh-pdf-page mh-pdf-page--cover">
    <div class="cover-frame">
      <div class="brand-mark">Mystická Hvězda · ${escapeHtml(year)}</div>
      <div class="cover-title-block">
        <h1 class="cover-title">${escapeHtml(productName)}</h1>
        <p class="cover-subtitle">Personalizovaný výklad pro další období. Ne obecný horoskop, ale mapa energie, rozhodnutí a malých kroků, které tě povedou dál.</p>
      </div>
      <div>
        <div class="cover-name">${name}</div>
        <div class="cover-meta">${escapeHtml(signName)} · ${birthDate}</div>
      </div>
      <div class="footer-mark">mystickahvezda.cz</div>
    </div>
  </section>

  <section class="mh-pdf-page mh-pdf-page--intro">
    <div class="intro-panel">
      <div class="content-kicker">Osobní vstup</div>
      <h2 class="intro-title">Tvoje mapa není předpověď, která tě sváže. Je to kompas.</h2>
      <p class="intro-lede">Tenhle výklad bere jako základ tvoje znamení, datum narození a otázku, se kterou do dalšího období vstupuješ. Čti ho jako klidné zrcadlo: neříká ti, co musíš, ale pomáhá rozpoznat, kde máš přestat tlačit a kde je čas udělat vědomý krok.</p>
      <div class="signal-grid">
        <div class="signal">
          <div class="signal-label">Znamení</div>
          <div class="signal-value">${escapeHtml(signName)} ${escapeHtml(glyph)}</div>
        </div>
        <div class="signal">
          <div class="signal-label">Zaměření</div>
          <div class="signal-value">${question}</div>
        </div>
        <div class="signal">
          <div class="signal-label">Období</div>
          <div class="signal-value">${escapeHtml(year)}</div>
        </div>
      </div>
    </div>
  </section>

  <section class="mh-pdf-page mh-pdf-page--signature">
    <div class="signature-layout">
      <div class="signature-seal" aria-hidden="true">
        <div class="signature-glyph">${escapeHtml(glyph)}</div>
      </div>
      <div>
        <div class="content-kicker">Osobní hvězdný podpis</div>
        <h2 class="signature-title">${escapeHtml(starSignature.title)}</h2>
        <div class="signature-copy">${paragraphs(starSignature.text)}</div>
        <div class="signature-keywords">${keywordHtml}</div>
        <div class="signature-question">${escapeHtml(starSignature.guidingQuestion)}</div>
      </div>
    </div>
  </section>

  <section class="mh-pdf-page mh-pdf-page--essence">
    <div class="content-kicker">Osobní syntéza</div>
    <h2 class="essence-title">Čtyři věci, které si máš přečíst pomalu</h2>
    <p class="essence-subtitle">Tahle stránka je záměrně krátká. Má fungovat jako první zrcadlo: ne jako hotová pravda, ale jako destilace témat, ke kterým se ve výkladu budeš vracet.</p>
    <div class="insight-grid">${cardItems(sections.essence)}</div>
  </section>

  <section class="mh-pdf-page mh-pdf-page--mantra">
    <div class="mantra-shell">
      <div class="content-kicker">Tvoje věta roku</div>
      <div class="mantra-sentence">${escapeHtml(yearMantra.sentence)}</div>
      <div class="mantra-copy">${paragraphs(yearMantra.text)}</div>
    </div>
  </section>

  ${sectionPage({
      kicker: 'Hlavní energie',
      title: 'Co se v tobě letos rovná',
      accent: glyph,
      children: `${paragraphs(sections.mainTheme)}<div class="callout">Základní otázka tohoto období: kde už nemusíš dokazovat svou hodnotu a kde ji naopak potřebuješ ukázat jasněji?</div>`
  })}

  ${sectionPage({
      kicker: 'Vnitřní zrcadlo',
      title: 'Vzorec, který tě formuje zevnitř',
      accent: '☽',
      children: `${paragraphs(sections.innerMirror)}<div class="deep-note">Sleduj hlavně situace, ve kterých navenek řekneš „to je v pohodě“, ale tělo zůstane stažené. Právě tam často leží pravdivější odpověď než v hlavě.</div>`
  })}

  ${sectionPage({
      kicker: 'Láska a vztahy',
      title: 'Co chce větší pravdivost',
      accent: '♡',
      children: paragraphs(sections.love)
  })}

  ${sectionPage({
      kicker: 'Práce a peníze',
      title: 'Kde se má energie změnit v čin',
      accent: '◆',
      children: paragraphs(sections.workMoney)
  })}

  ${sectionPage({
      kicker: 'Vnitřní růst',
      title: 'Lekce, kterou nejde obejít',
      accent: '✦',
      variant: 'split',
      sideTitle: 'Poznáš to podle',
      sideText: 'Tahle kapitola je nejsilnější ve chvíli, kdy ji nepoužiješ jako tlak na výkon. Hledej jednu konkrétní situaci, kde můžeš tento týden zvolnit reakci a přitom zůstat v pravdě.',
      children: paragraphs(sections.growth)
  })}

  ${sectionPage({
      kicker: 'Stín a dar',
      title: 'Co nechceš vidět, ale může tě osvobodit',
      accent: '◇',
      variant: 'split',
      sideTitle: 'Praktický signál',
      sideText: 'Všímej si okamžiku, kdy začneš sama sobě vysvětlovat, proč něco vlastně nevadí. Pokud tělo ztuhne dřív než hlava najde důvod, je to stopa.',
      children: `${paragraphs(sections.shadowGift)}<div class="callout">Stín tu neznamená chybu. Je to část síly, která dlouho fungovala jako obrana. Když ji uvidíš bez studu, může se změnit v jasnější směr.</div>`
  })}

  <section class="mh-pdf-page mh-pdf-page--timeline">
    <div class="content-kicker">Klíčové měsíce</div>
    <h2 class="timeline-title">Kdy zpomalit, kdy vykročit</h2>
    <p class="timeline-subtitle">Tyto měsíce nejsou pevný osud. Jsou to období, ve kterých se téma roku pravděpodobně ozve silněji a bude chtít tvoji pozornost.</p>
    ${monthHtml}
  </section>

  <section class="mh-pdf-page mh-pdf-page--actions">
    <div class="content-kicker">Konkrétní kroky</div>
    <h2 class="actions-title">Co s tím udělat v běžném životě</h2>
    <p class="actions-subtitle">Výklad má hodnotu až ve chvíli, kdy se z něj stane malé rozhodnutí. Tohle nejsou úkoly pro dokonalou verzi tebe. Jsou to kroky pro reálný týden, reálný vztah a reálnou energii.</p>
    ${actionItems(sections.actionPlan)}
  </section>

  <section class="mh-pdf-page mh-pdf-page--ritual">
    <div class="ritual-shell">
      <div class="content-kicker">Malý rituál pro ukotvení</div>
      <h2 class="ritual-title">Aby z výkladu nezůstal jen krásný text</h2>
      <div class="ritual-copy">${paragraphs(sections.ritual)}</div>
    </div>
  </section>

  <section class="mh-pdf-page mh-pdf-page--journal">
    <div class="content-kicker">Otázky k návratu</div>
    <h2 class="journal-title">Stránka, ke které se vrátíš později</h2>
    <p class="journal-subtitle">Neodpovídej hned dokonale. Tyto otázky mají otevřít prostor, ve kterém výklad přestane být jen textem a začne se potkávat s běžným dnem.</p>
    ${journalItems(sections.journalPrompts)}
  </section>

  <section class="mh-pdf-page mh-pdf-page--closing">
    <div class="content-kicker">Závěrečné poselství</div>
    <h2 class="closing-title">Tvoje další světlo</h2>
    <div class="closing-copy">${paragraphs(sections.closing)}</div>
  </section>
</body>
</html>`;
}

export async function renderPersonalMapPdf(input, outputPath = null) {
    const html = buildPersonalMapHtml(input);
    const browser = await chromium.launch({ args: ['--no-sandbox'] });

    try {
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle' });
        return await page.pdf({
            ...(outputPath ? { path: outputPath } : {}),
            format: 'A4',
            printBackground: true,
            margin: { top: '0', right: '0', bottom: '0', left: '0' }
        });
    } finally {
        await browser.close();
    }
}

export async function renderPersonalMapCoverPreview(input, outputPath) {
    const html = buildPersonalMapHtml(input);
    const browser = await chromium.launch({ args: ['--no-sandbox'] });

    try {
        const page = await browser.newPage({ viewport: { width: 1200, height: 1700 }, deviceScaleFactor: 1 });
        await page.setContent(html, { waitUntil: 'networkidle' });
        await page.locator('.mh-pdf-page--cover').screenshot({ path: outputPath });
    } finally {
        await browser.close();
    }
}

export async function renderPersonalMapPagePreview(input, outputPath, selector = '.mh-pdf-page--essence') {
    const html = buildPersonalMapHtml(input);
    const browser = await chromium.launch({ args: ['--no-sandbox'] });

    try {
        const page = await browser.newPage({ viewport: { width: 1200, height: 1700 }, deviceScaleFactor: 1 });
        await page.setContent(html, { waitUntil: 'networkidle' });
        await page.locator(selector).first().screenshot({ path: outputPath });
    } finally {
        await browser.close();
    }
}

export { buildPersonalMapFallbackSections, buildPersonalMapGenerationPrompt };

export const samplePersonalMapData = {
    name: 'Jana',
    birthDate: '1994-10-08',
    sign: 'vahy',
    focus: 'vztahy, práce a vnitřní klid',
    grammaticalGender: 'feminine',
    year: 2026,
    productName: 'Osobní mapa zbytku roku 2026',
    sections: {
        starSignature: {
            title: 'Strážkyně tiché rovnováhy',
            text: `Tvůj hvězdný podpis není o tom, že máš být pořád vyrovnaná. Je spíš o schopnosti rozpoznat, kdy se rovnováha změnila v tiché potlačení sebe. Působíš jako člověk, který umí dát věcem tvar, uklidnit prostor a najít slova tam, kde ostatní cítí jen napětí. Jenže právě tahle schopnost tě někdy svádí k tomu, abys zůstala klidná i ve chvíli, kdy by bylo zdravější být pravdivá.

V tomto období se tvoje vnitřní síla bude ukazovat méně v tom, kolik zvládneš ustát, a víc v tom, co už odmítneš držet sama. Tvoje mapa neříká, že máš přestat být laskavá. Ukazuje, kde se laskavost konečně potřebuje obrátit i k tobě. Právě tam začne tvůj rok působit méně jako čekání a víc jako vědomý návrat.`,
            keywords: ['rovnováha', 'pravda', 'návrat'],
            guidingQuestion: 'Kde se snažíš udržet klid tak moc, až přestáváš slyšet sebe?'
        },
        essence: [
            { title: 'Hlavní dar', text: 'Tvůj dar je cit pro rovnováhu, ale ne tu povrchní, kdy se všichni usmívají a nikdo neřekne pravdu. Umíš vycítit, kde se místnost sevře, kde někdo mluví opatrněji a kde se pod slušností skrývá únava. Letos se tenhle dar učíš používat jinak: ne k tomu, abys všechno uhladila, ale abys poznala, kde už máš chránit i sebe.' },
            { title: 'Opakující se vzorec', text: 'Když se bojíš zklamání, začneš být příliš rozumná. Vysvětlíš si cizí mlčení, přepíšeš vlastní reakci a čekáš, až se věci samy vyjasní. V běžném dni to poznáš podle chvíle, kdy už máš připravenou omluvu za někoho jiného. Tenhle rok tě vede k jedné jednodušší větě dřív, než se z ticha stane vnitřní tlak a zbytečně tě unaví.' },
            { title: 'Prahové téma', text: 'Stojíš na prahu větší jednoduchosti. Ne všechno musíš zachránit, pochopit do posledního detailu nebo vysvětlit tak jemně, aby to nikoho nezatížilo. Zbytek roku tě povede k rozhodnutím, která budou méně zdvořilá k chaosu a laskavější k tobě. Nejvíc to ucítíš tam, kde se ti uleví hned po tom, co přestaneš vyjednávat sama se sebou a čekat na dokonalé pochopení.' },
            { title: 'Co se chce změnit', text: 'Klid už nemá být odměna až po práci, po rozhovoru, po uklidnění druhých a po vyřešení všeho, co visí ve vzduchu. Má být základ, ze kterého se rozhoduješ. Pokud si letos dovolíš brát vlastní vnitřní prostor vážně, některé vztahy se pročistí a některé úkoly konečně ztratí neviditelnou moc nad tvým dnem, i když to nikdo zvenku nepotvrdí.' }
        ],
        yearMantra: {
            sentence: 'Nemusím se zmenšit, aby kolem mě mohl být skutečný klid.',
            text: `Tahle věta je pro tebe kotva hlavně ve chvílích, kdy začneš automaticky uhlazovat atmosféru. Vrať se k ní, když budeš chtít odpovědět dřív, než si uvědomíš, co opravdu cítíš. Vrať se k ní, když budeš přemýšlet, jestli nejsi moc náročná. Nejde o vzdor. Jde o připomenutí, že skutečný klid nemůže stát na tom, že se v něm ty sama ztratíš. Pokud tě věta nejdřív znejistí, je to v pořádku. Pravda bývá nezvykle jednoduchá.`
        },
        mainTheme: `V tomto období se v tobě probouzí potřeba jednoduššího života. Ne proto, že bys měla méně cítit, ale proto, že už nechceš dávat svou pozornost věcem, které tě pokaždé nechají prázdnou. Jako Váhy přirozeně vnímáš náladu druhých lidí a často ji začneš vyrovnávat dřív, než se vůbec zeptáš, jestli je to tvoje práce. Právě tady se letos láme starý způsob fungování: přestane stačit, že je kolem tebe klid, pokud uvnitř tebe zůstává nevyřčené napětí.

Zbytek roku tě povede k jemné, ale pevné hranici. Ne k tvrdosti. Spíš k tichému rozhodnutí, že harmonie nemá vznikat tím, že se zmenšíš. Vztahy, práce i každodenní volby budou testovat, jestli umíš zůstat laskavá a zároveň konkrétní. Poznáš to podle drobných okamžiků: zpráva, na kterou se ti nechce odpovědět hned; schůzka, po které jsi unavená ještě dřív, než začne; nabídka, která vypadá hezky, ale v těle se stáhne jako příliš těsné šaty.

Tohle období ti také ukazuje rozdíl mezi klidem a odkládáním. Klid je čistý. Po rozhodnutí cítíš víc prostoru. Odkládání je lepkavé. V hlavě se k němu vracíš pořád dokola, i když navenek působíš v pohodě. Tvůj praktický krok není všechno hned rozseknout. Je to přestat si lhát v první malé věci, kde už odpověď znáš. Když ten rozdíl začneš brát vážně, některé volby se zjednoduší samy, protože z nich odejde potřeba vypadat přijatelně.`,
        innerMirror: `Uvnitř tebe je silný pozorovatel. Všímá si tónu hlasu, drobné změny v odpovědi, zpožděné zprávy i atmosféry v místnosti. Tahle citlivost ti mnohokrát pomohla. Díky ní umíš reagovat jemně, nepřidávat zbytečný tlak a najít větu, která druhému dovolí vydechnout. Jenže letos se ukazuje, že stejná schopnost tě může od sebe odvést, pokud zůstane pořád namířená ven.

V běžném dni se to ukáže ve chvíli, kdy víš přesně, co potřebuje druhý člověk, ale neumíš stejně rychle říct, co potřebuješ ty. Můžeš poznat, že máš plnou hlavu cizích nálad, domněnek a neodeslaných odpovědí, zatímco tvoje vlastní únava stojí někde v koutě a čeká, až si jí všimneš. Tohle není slabost. Je to signál, že tvůj vnitřní kompas potřebuje víc místa než další vysvětlování.

Nejsilnější posun přijde přes jednoduché přiznání. Nemusíš hned vědět řešení. Stačí si dovolit pravdu dřív, než ji zabalíš do přijatelné formy. Zkus si všímat tří tělesných signálů: sevřeného břicha, rychlé potřeby odpovědět a únavy po rozhovoru, který navenek vypadal klidně. Neber je jako důkaz, že něco nezvládáš. Jsou to malé navigační body. Když je zachytíš včas, nemusíš čekat na výbuch, pláč nebo úplné vyčerpání, aby sis dovolila změnit směr. Díky tomu zůstane víc síly pro skutečnou volbu bez tlaku. Právě tam se často objevuje tvoje skutečná odpověď dřív, než ji hlava začne upravovat tak, aby byla pro všechny pohodlná.`,
        love: `V lásce se otevírá téma pravdivosti. Můžeš si všimnout, že některé rozhovory už nejde dál uhlazovat úsměvem nebo změnou tématu. Neznamená to konflikt. Znamená to, že vztahy, které mají pokračovat, potřebují víc dospělosti a méně domýšlení. Tvoje citlivost umí zachytit, když se někdo vzdálí, když odpověď ztratí teplo nebo když se mezi slovy objeví něco nevyřčeného. Jenže letos bude důležité neudělat z každého signálu úkol, který musíš sama vyřešit.

Pokud jsi sama, nejsilnější posun nepřichází přes honbu za pozorností, ale přes návrat k vlastnímu rytmu. Přitáhneš člověka, který lépe uvidí, kdo opravdu jsi, když se přestaneš přizpůsobovat každému signálu zvenku. Nejde o to být nedostupná. Jde o to nepředávat svůj vnitřní střed prvnímu člověku, který v tobě probudí naději. Všímej si, jestli se vedle někoho cítíš klidnější, nebo jestli jen silněji toužíš být vybraná.

Pokud ve vztahu jsi, bude důležité říkat potřeby dřív, než se změní v tichou výčitku. Největší změnu nepřinese jeden velký rozhovor, ale menší pravdy vyslovené včas: co ti chybí, co už nechceš nést sama, kde potřebuješ víc přítomnosti. Poznáš to podle okamžiku, kdy začneš větu zjemňovat ještě předtím, než ji vyslovíš. Nejvíc si všímej rozdílu mezi klidem a napjatým čekáním. Tvůj praktický krok je říct méně slov, ale přesněji. Vztah, který má sílu, takovou pravdu unese. Vztah, který stojí jen na tvém přizpůsobení, ji bude vnímat jako narušení.`,
        workMoney: `V práci se ukazuje prostor pro větší přesnost. Ne všechno, co umíš, má stejnou cenu a ne každý požadavek si zaslouží okamžitou odpověď. Zbytek roku přeje rozhodnutím, která zjednoduší tvůj systém: jasnější nabídka, méně roztříštěných úkolů a odvážnější pojmenování hodnoty. Můžeš si všimnout, že nejvíc síly ti neberou těžké úkoly, ale úkoly nejasné. Takové, kde není domluvený konec, hranice, cena, odpovědnost nebo očekávání.

Finance se mohou stabilizovat ve chvíli, kdy přestaneš zaměňovat klid za odkládání. Jedna věc, kterou dlouho posouváš před sebou, bude chtít uzavřít. Když ji vezmeš prakticky a bez dramat, uvolní se energie pro nový příjem nebo lepší pracovní směr. Neznamená to riskovat naslepo. Spíš si konečně přiznat, kde dáváš příliš mnoho za příliš málo, nebo kde se bojíš říct si o férovější podmínky.

Tvůj pracovní růst letos nepůjde přes větší výkon, ale přes lepší výběr. Všímej si, které činnosti ti po dokončení vrací pocit síly a které tě nechávají vnitřně rozdrobenou. Tam je důležitá stopa. Pokud budeš dál přidávat další závazky bez vyčištění těch starých, budeš mít pocit, že se snažíš víc, ale neposouváš se. Prakticky to znamená vybrat jednu nabídku, jeden závazek nebo jednu cenu, kde potřebuješ jasnější pravidla. Nemusíš měnit všechno. Stačí přestat být dostupná tam, kde už tě dostupnost zlevňuje. Tahle přesnost není tvrdost. Je to úcta k tvému času a k práci, která má skutečnou hodnotu.`,
        growth: `Tvůj růst letos nestojí na velkém zlomu, ale na každodenním návratu k sobě. Největší lekce zní: nemusíš být příjemná, aby sis zasloužila lásku. Nemusíš být neustále dostupná, aby lidé zůstali. A nemusíš všechno chápat hned, aby ses mohla rozhodnout správně. Tohle pro tebe může být nezvyklé, protože část tvé jistoty vznikala z toho, že jsi dokázala číst situace, předcházet napětí a být tou, která věci zvládne s grácií.

Vnitřně dozrává schopnost slyšet první jemný signál těla. Únavu. Sevření. Radost. Lehkost. Když jim dáš prostor dřív, než přerostou v tlak, začneš dělat méně rozhodnutí ze strachu a víc rozhodnutí z důvěry. Prakticky to znamená zpomalit hlavně ve chvílích, kdy chceš rychle odpovědět, rychle vyhovět nebo rychle uklidnit atmosféru.

Největší posun přijde, až si dovolíš nebýt okamžitě srozumitelná pro všechny. Některé tvoje hranice druhý člověk pochopí až později. Některé vůbec. To ale neznamená, že jsou špatně. Znamená to, že se tvůj život přestává řídit jen tím, co je pro okolí pohodlné. Poznáš to podle zvláštního klidu po větě, které ses bála. Ne euforie, spíš tichého pocitu: konečně jsem se neopustila, i bez potlesku okolí.`,
        shadowGift: `Tvůj stín se nejčastěji neukáže jako výbuch. Ukáže se jako přehnaná vstřícnost ve chvíli, kdy už by bylo pravdivější říct: teď ne. Může se ukázat jako úsměv, kterým zakryješ zklamání, nebo jako schopnost všechno pochopit tak dokonale, že se sama připravíš o právo být zraněná. Navenek to může vypadat jako zralost. Uvnitř to ale poznáš podle toho, že po rozhovoru ještě dlouho vedeš druhou verzi v hlavě.

Dar ukrytý v tomhle stínu je obrovský. Když přestaneš používat empatii proti sobě, stane se z ní přesnost. Najednou nebudeš jen chápat druhé, ale také poznáš, komu má tvoje blízkost patřit a kde už jen vyplňuješ prázdné místo. Tohle není cesta k chladu. Je to cesta k čistší lásce, práci i vlastnímu rozhodování.

Poznáš to podle zvláštní úlevy, která přijde, když přestaneš opravovat dojem druhých lidí. Možná se ti nejdřív ozve vina, protože starý zvyk si bude chtít vzít prostor zpátky. Vydrž pár minut bez okamžité reakce. Právě tady se stín začíná měnit v dar. Tvůj praktický krok je jednoduchý: když začneš někoho omlouvat, polož si otázku, jestli bys stejnou laskavost nabídla i sobě.`,
        months: [
            { month: 'Květen', title: 'tiché vyjasnění', text: 'Vztahové téma se ozve přes maličkost, která ve skutečnosti ukáže větší vzorec. Může jít o zprávu, tón hlasu nebo pocit po setkání. Neřeš jen formu. Všímej si, jestli se po kontaktu cítíš víc sama sebou, nebo víc přizpůsobená. Tahle stopa bude důležitější než samotná událost.' },
            { month: 'Červenec', title: 'návrat viditelnosti', text: 'Přichází prostor pro tvořivost, prezentaci a osobní krok, který nemusí být dokonalý. Dobré období pro nabídku, nový projekt nebo otevřenější rozhovor o tom, co chceš. Nečekej na chvíli, kdy nebudeš mít strach. Sleduj, kde se strach míchá s radostí. Malý krok teď udělá víc než dlouhé plánování.' },
            { month: 'Září', title: 'hranice a směr', text: 'Září tě může postavit před jasnější ano a jasnější ne. Právě tím se otevře víc klidu než dalším přizpůsobením. Pokud budeš váhat, zeptej se jednoduše: co bych zvolila, kdybych nemusela nikomu dokazovat, že jsem hodná, rozumná nebo vděčná? Odpověď se objeví v těle dřív než v argumentech.' },
            { month: 'Listopad', title: 'hlubší rozhovor', text: 'Něco, co bylo dlouho pod povrchem, může dostat slova. Nemusí to být dramatický rozhovor. Spíš okamžik, kdy přestaneš obcházet pravdu a pojmenuješ ji bez obalu. Dej si pozor na starý reflex všechno vysvětlit tak jemně, až se ztratí pointa. Pravda nemusí být ostrá, jen nesmí být rozmazaná.' },
            { month: 'Prosinec', title: 'uzavření kruhu', text: 'Konec roku přinese pocit, že některé věci už nechceš tahat dál. Může jít o závazek, staré očekávání nebo vnitřní slib, který už neodpovídá tomu, kým jsi. Udělej místo pro začátek, který nebude působit velkolepě, ale bude pravdivější. Zapiš si, co už nechceš nést do dalšího roku.' }
        ],
        actionPlan: [
            { title: 'Pojmenuj jednu neviditelnou zátěž', text: 'Vyber jednu věc, kterou pravidelně držíš v hlavě za ostatní: náladu v práci, napětí ve vztahu, rodinný úkol nebo cizí očekávání. Napiš si, co by se stalo, kdybys ji tento týden neřídila ty. Neřeš hned výsledek. Jen uvidíš, kolik prostoru zabírala a co je tvoje zodpovědnost.' },
            { title: 'Řekni potřebu dřív než výčitku', text: 'Jakmile ucítíš první stažení, zkus jednu krátkou větu: „Potřebuju vědět, na čem jsem.“ Nebo: „Teď na to nemám prostor.“ Nečekej, až budeš mít dokonalou formulaci. Krátká pravda vyslovená včas bude lepší než dlouhé mlčení, které se později změní v únavu a odstup bez pozdějšího vysvětlování.' },
            { title: 'Zjednoduš pracovní závazek', text: 'Vyber jeden úkol, nabídku nebo závazek, který bere víc síly, než vrací. Buď ho ohranič, zdraž, deleguj, nebo uzavři. Ne všechno má pokračovat jen proto, že to umíš. Změna nemusí být velká. Stačí jasnější pravidlo, po kterém se ti lépe dýchá už tento týden bez zbytečného pocitu viny.' },
            { title: 'Vrať tělo do rozhodování', text: 'Před jedním důležitým ano si dej deset minut bez obrazovky. Vnímej, jestli tělo měkne, nebo tuhne. Tvoje hlava umí najít argument pro cokoli, ale tělo často ví dřív, kde je klid a kde jen strach z nepříjemné reakce druhého člověka. Ber ho jako rovnocenný hlas.' },
            { title: 'Nech jeden vztah ukázat realitu', text: 'Neposílej další vysvětlující zprávu tam, kde už jsi řekla dost. Dej prostoru šanci ukázat, jestli druhá strana přijde blíž také sama. Pokud se ozve jen tehdy, když všechno držíš ty, není to důkaz tvé nedostatečnosti. Je to informace, se kterou můžeš dál pracovat, ne rozsudek.' }
        ],
        ritual: `Večer si zapal jednu svíčku nebo nech na stole jen malé světlo. Na papír napiš tři věty: co už nechci vyrovnávat za druhé, kde si přeju víc pravdy a jaký jeden malý krok udělám do sedmi dnů. Potom polož ruku na střed hrudi a třikrát se zeptej: „Co už vím, ale pořád si to dovoluji zpochybňovat?“ Nehledej hezkou odpověď. Napiš první větu, která přijde.

Papír si nech na místě, kam se běžně díváš. Ne jako úkol, ale jako kotvu. Kdykoli začneš znovu vysvětlovat, omlouvat nebo oddalovat jasné rozhodnutí, vrať se k jedné větě z papíru. Právě opakovaný návrat k jednoduché pravdě bude v tomto období silnější než velké sliby.`,
        journalPrompts: [
            'Kde jsem si v poslední době spletla klid s odkládáním pravdy?',
            'Který vztah mi ukazuje, že vysvětluji víc, než je zdravé?',
            'Co bych tento měsíc zjednodušila, kdybych se nebála reakce okolí?',
            'Kde moje tělo říká ne dřív, než ho hlava stihne přepsat?',
            'Jak by vypadal jeden laskavý krok, který nezradí moje hranice?',
            'Co už nepotřebuji nést do dalšího období jen proto, že jsem to nesla dlouho?'
        ],
        closing: `Jano, tvůj další krok nemusí být hlasitý. Stačí, když bude pravdivý. Když přestaneš hledat dokonalou chvíli a začneš věřit jemnému vnitřnímu ano, uvidíš, že klid není odměna na konci cesty. Je to způsob, jak po ní můžeš jít už teď. Ne všechno se vyřeší jedním rozhodnutím, ale jedno rozhodnutí může změnit způsob, jakým se k sobě začneš vracet.

Zbytek roku ti nebude brát citlivost. Spíš tě naučí, aby citlivost konečně patřila i tobě. Aby ses neptala jen na to, co druhý potřebuje, ale i na to, co se děje v tobě, když pořád dáváš. Aby ses nebála, že jasnější hranice zničí blízkost. Skutečná blízkost se nezničí pravdou. Jen se ukáže, jestli byla dost pevná na to, aby pravdu unesla.

Ať je tvoje další období méně o dokazování a víc o návratu. Méně o vysvětlování vlastní hodnoty a víc o životě, který ji začne tiše potvrzovat každý den. Všímej si jednoduchých znamení: lehčího dechu po upřímné větě, menší potřeby kontrolovat cizí reakci a pocitu, že některé dveře nemusíš držet otevřené jen proto, že jsi je kdysi sama otevřela. Tady se začíná tvoje další světlo. Ne v dokonalosti, ale v návratu k sobě.`
    }
};
