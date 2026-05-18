#!/usr/bin/env node
/**
 * Local daily horoscope prefill.
 *
 * Generates deterministic Czech daily horoscopes without Claude/Gemini API calls
 * and writes them into the same cache table used by /api/horoscope and
 * /horoskop/:sign/:date.
 *
 * Usage:
 *   node server/scripts/prefill-horoscopes-local.js --from 2026-05-11 --to 2026-05-31
 *   node server/scripts/prefill-horoscopes-local.js --from 2026-05-11 --to 2026-05-31 --write
 *   node server/scripts/prefill-horoscopes-local.js --from 2026-05-11 --to 2026-05-31 --write --force
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../..');
config({ path: path.join(__dirname, '../.env') });

const OUTPUT_DIR = path.join(rootDir, 'scripts', 'output');
const ASTRO_EVENTS_PATH = path.join(rootDir, 'scripts', 'astro_events_2026.json');
const PERIOD_LABEL = 'Denní inspirace';

const MONTHS_CS = [
    'ledna', 'února', 'března', 'dubna', 'května', 'června',
    'července', 'srpna', 'září', 'října', 'listopadu', 'prosince'
];

const SIGNS = [
    {
        slug: 'beran',
        name: 'Beran',
        vocative: 'Berane',
        accusative: 'Berana',
        element: 'ohně',
        gift: 'odvaha',
        shadow: 'tlak na okamžitý výsledek',
        practical: 'začni jednu věc dřív, než ji stihneš zbytečně rozebrat',
        affirmation: 'Volím klidný krok, důvěřuji své odvaze a každý další pohyb opírám o pravdu, která ve mně zraje.'
    },
    {
        slug: 'byk',
        name: 'Býk',
        vocative: 'Býku',
        accusative: 'Býka',
        element: 'země',
        gift: 'stabilita',
        shadow: 'lpění na jistotě, která už netěší',
        practical: 'zjednoduš jeden závazek a vrať pozornost k tomu, co má skutečnou hodnotu',
        affirmation: 'Vracím se k tělu, rytmu a hodnotám, které mi dávají sílu růst bez spěchu každý den.'
    },
    {
        slug: 'blizenci',
        name: 'Blíženci',
        vocative: 'Blíženci',
        accusative: 'Blížence',
        element: 'vzduchu',
        gift: 'zvědavost',
        shadow: 'přeskakování mezi možnostmi',
        practical: 'polož jednu přímou otázku a nech odpověď zúžit další směr',
        affirmation: 'Moje slova dnes tvoří mosty, vybírám jasnost, lehkost a rozhovor, který otevírá nový prostor pro mě.'
    },
    {
        slug: 'rak',
        name: 'Rak',
        vocative: 'Raku',
        accusative: 'Raka',
        element: 'vody',
        gift: 'intuice',
        shadow: 'přebírání cizích emocí',
        practical: 'pojmenuj jednu hranici jemně, ale bez omluvy',
        affirmation: 'Naslouchám své citlivosti, chráním svůj klid a dovoluji pravdě přijít měkce, ale jasně do mého dne.'
    },
    {
        slug: 'lev',
        name: 'Lev',
        vocative: 'Lve',
        accusative: 'Lva',
        element: 'ohně',
        gift: 'sebevyjádření',
        shadow: 'čekání na uznání zvenku',
        practical: 'dej prostor tomu, co chceš tvořit, i když to zatím nikdo nehodnotí',
        affirmation: 'Moje světlo je přirozené, tvořím z radosti a nechávám odvahu promluvit bez potřeby dokazovat s klidem.'
    },
    {
        slug: 'panna',
        name: 'Panna',
        vocative: 'Panno',
        accusative: 'Pannu',
        element: 'země',
        gift: 'přesnost',
        shadow: 'snaha opravit i to, co není tvoje',
        practical: 'vyber jeden detail, který opravdu pomůže, a zbytek nech chvíli být',
        affirmation: 'Volím jednoduchost, pečuji o řád a vidím krásu v kroku, který je malý, ale poctivý.'
    },
    {
        slug: 'vahy',
        name: 'Váhy',
        vocative: 'Váhy',
        accusative: 'Váhy',
        element: 'vzduchu',
        gift: 'rovnováha',
        shadow: 'uhýbání před nepohodlnou volbou',
        practical: 'řekni, co potřebuješ, aniž bys vše zjemňoval za každou cenu',
        affirmation: 'Vybírám rovnováhu, která nezrazuje moje potřeby, a tvořím vztahy z pravdivosti i laskavosti každý dnešní okamžik.'
    },
    {
        slug: 'stir',
        name: 'Štír',
        vocative: 'Štíre',
        accusative: 'Štíra',
        element: 'vody',
        gift: 'hloubka',
        shadow: 'držení staré obrany',
        practical: 'pusť jednu kontrolu a sleduj, kolik energie se tím uvolní',
        affirmation: 'Nebojím se hloubky, přijímám proměnu a svou sílu používám k pravdivému uzdravení v sobě i kolem sebe.'
    },
    {
        slug: 'strelec',
        name: 'Střelec',
        vocative: 'Střelče',
        accusative: 'Střelce',
        element: 'ohně',
        gift: 'nadhled',
        shadow: 'útěk do další možnosti',
        practical: 'vyber směr, který rozšiřuje obzor, ale neobchází zodpovědnost',
        affirmation: 'Důvěřuji svému směru, kráčím za pravdou a nechávám svobodu vyrůst z vnitřní poctivosti každý dnešní krok.'
    },
    {
        slug: 'kozoroh',
        name: 'Kozoroh',
        vocative: 'Kozorohu',
        accusative: 'Kozoroha',
        element: 'země',
        gift: 'disciplína',
        shadow: 'tichý tlak na výkon',
        practical: 'udělej jeden krok pro budoucnost a dovol si nepřidávat další břemeno',
        affirmation: 'Stavím pomalu, pevně a s důvěrou, protože moje vytrvalost nepotřebuje spěch, aby byla silná v mém směru.'
    },
    {
        slug: 'vodnar',
        name: 'Vodnář',
        vocative: 'Vodnáři',
        accusative: 'Vodnáře',
        element: 'vzduchu',
        gift: 'originalita',
        shadow: 'odstup, který se mění v izolaci',
        practical: 'sdílej jeden neobvyklý nápad s někým, kdo mu dá zdravou zpětnou vazbu',
        affirmation: 'Moje jinakost má směr, přináším nový pohled a zůstávám spojený se světem kolem sebe s klidem.'
    },
    {
        slug: 'ryby',
        name: 'Ryby',
        vocative: 'Ryby',
        accusative: 'Ryby',
        element: 'vody',
        gift: 'vnímavost',
        shadow: 'rozpouštění vlastních hranic',
        practical: 'chraň si ticho a jednej až ve chvíli, kdy se pocit spojí s jasným krokem',
        affirmation: 'Důvěřuji své vnímavosti, chráním svůj prostor a nechávám intuici vést jen tam, kde je klid.'
    }
];

const DAY_THEMES = [
    { label: 'hranice', area: 'hranic', action: 'pojmenuj, kde končí tvoje odpovědnost a kde už začíná prostor pro klid' },
    { label: 'hodnota', area: 'hodnoty', action: 'vrať pozornost k tomu, co má cenu i bez okamžitého uznání' },
    { label: 'komunikace', area: 'komunikace', action: 'řekni jednu větu jednodušeji a nech ji bez dlouhého vysvětlování' },
    { label: 'tělo', area: 'těla', action: 'zpomal tempo a všimni si signálu, který se opakuje už několik dní' },
    { label: 'vztahy', area: 'vztahů', action: 'dej přednost pravdivosti před dlouhým přizpůsobováním' },
    { label: 'práce', area: 'práce', action: 'dokonči jeden konkrétní krok a neotvírej další tři směry najednou' },
    { label: 'intuice', area: 'intuice', action: 'ověř vnitřní pocit jedním praktickým rozhodnutím' },
    { label: 'domov', area: 'domova', action: 'uprav drobnost v prostoru, která ti zbytečně bere energii' },
    { label: 'peníze', area: 'peněz', action: 'podívej se na jednu volbu přes hodnotu, ne přes strach' },
    { label: 'odvaha', area: 'odvahy', action: 'udělej malý krok, který se pořád tváří jako příliš velký' },
    { label: 'odpočinek', area: 'odpočinku', action: 'nech jednu věc chvíli nedokončenou a vrať se k sobě' },
    { label: 'směr', area: 'směru', action: 'vyber jednu prioritu, podle které se dnes rozhodneš' },
    { label: 'důvěra', area: 'důvěry', action: 'přestaň kontrolovat detail, který už nepotřebuje další důkaz' },
    { label: 'změna', area: 'změny', action: 'přijmi malý posun dřív, než se z něj stane tlak' },
    { label: 'radost', area: 'radosti', action: 'udělej místo jedné věci, která tě vrací k lehkosti' },
    { label: 'pravda', area: 'pravdy', action: 'pojmenuj podstatné bez ostrých hran a bez ustupování od sebe' }
];

const THEME_ACTION_VARIANTS = {
    hranice: [
        'pojmenuj, kde končí tvoje odpovědnost a kde už začíná prostor pro klid',
        'nech jedno jasné ne zaznít bez dlouhé obhajoby',
        'odděl pomoc od povinnosti a vrať se k vlastnímu středu'
    ],
    hodnota: [
        'vrať pozornost k tomu, co má cenu i bez okamžitého uznání',
        'vyber to, co podporuje stabilitu, ne jen krátký pocit úlevy',
        'připomeň si, že hodnota nemusí křičet, aby byla skutečná'
    ],
    komunikace: [
        'řekni jednu větu jednodušeji a nech ji bez dlouhého vysvětlování',
        'zvol krátké pravdivé sdělení místo dlouhého obcházení tématu',
        'polož otázku, která otevře jasno místo dalšího domýšlení'
    ],
    telo: [
        'zpomal tempo a všimni si signálu, který se opakuje už několik dní',
        'dej tělu jednu jasnou odpověď: vodu, pohyb nebo skutečný odpočinek',
        'přestaň přehlušovat únavu a udělej jednu věc jednodušeji'
    ],
    vztahy: [
        'dej přednost pravdivosti před dlouhým přizpůsobováním',
        'řekni potřebu dřív, než se z ní stane tiché očekávání',
        'všímej si, kde klid vzniká z upřímnosti, ne z ustupování'
    ],
    prace: [
        'dokonči jeden konkrétní krok a neotvírej další tři směry najednou',
        'uzavři drobný úkol, který ti vrátí pocit pevné půdy',
        'seřaď si práci podle dopadu, ne podle tlaku zvenku'
    ],
    intuice: [
        'ověř vnitřní pocit jedním praktickým rozhodnutím',
        'nech intuici promluvit a potom ji ukotvi jednoduchým krokem',
        'rozliš tichý signál od nálady, která jen na chvíli zesílila'
    ],
    domov: [
        'uprav drobnost v prostoru, která ti zbytečně bere energii',
        'vrať domovu jeden prvek klidu, který dnes ucítíš hned',
        'odlož věc, která z prostoru bere lehkost i soustředění'
    ],
    penize: [
        'podívej se na jednu volbu přes hodnotu, ne přes strach',
        'udělej jedno finanční rozhodnutí pomalu a bez paniky',
        'odděl skutečnou potřebu od nákupu, který jen tlumí napětí'
    ],
    odvaha: [
        'udělej malý krok, který se pořád tváří jako příliš velký',
        'začni tam, kde se strach zmenší na jeden konkrétní pohyb',
        'pojmenuj první odvážný krok a nech ho být dostatečný'
    ],
    odpocinek: [
        'nech jednu věc chvíli nedokončenou a vrať se k sobě',
        'vypni jednu povinnost dřív, než z ní vznikne zbytečný nárok',
        'dopřej si pauzu, která není odměnou, ale součástí rovnováhy'
    ],
    smer: [
        'vyber jednu prioritu, podle které se dnes rozhodneš',
        'nech hlavní směr rozhodnout dřív než všechny vedlejší možnosti',
        'zapiš si jeden důvod, proč stojí za to zůstat na cestě'
    ],
    duvera: [
        'přestaň kontrolovat detail, který už nepotřebuje další důkaz',
        'opři se o fakt, který už máš, a nepřidávej další zkoušku',
        'dovol jistotě přijít postupně místo okamžitého potvrzení'
    ],
    zmena: [
        'přijmi malý posun dřív, než se z něj stane napětí',
        'uvolni pravidlo, které kdysi chránilo, ale dnes už svazuje',
        'dovol jedné věci změnit tvar bez toho, aby ses za to omlouval'
    ],
    radost: [
        'udělej místo jedné věci, která tě vrací k lehkosti',
        'vyber drobnou radost, která nepotřebuje výkon ani vysvětlení',
        'dovol si chvíli lehkosti bez toho, aby musela být užitečná'
    ],
    pravda: [
        'pojmenuj podstatné bez ostrých hran a bez ustupování od sebe',
        'řekni si pravdu nejdřív v sobě a teprve potom ji zjednoduš pro druhé',
        'nepřikrášluj odpověď jen proto, aby zněla přijatelněji'
    ]
};

const SIGN_PRACTICALS = {
    beran: [
        'začni jednu věc dřív, než ji stihneš zbytečně rozebrat',
        'dej energii do prvního kroku, ne do dokazování, že máš pravdu',
        'neodpovídej z impulsu a nech si pár minut na jasnější volbu',
        'vyber boj, který má smysl, a zbytek dnes nech bez reakce',
        'přesměruj neklid do pohybu, krátkého rozhodnutí nebo dokončeného úkolu',
        'dovol odvaze ztišit se dřív, než se změní v nárok na okolí'
    ],
    byk: [
        'zjednoduš jeden závazek a vrať pozornost k tomu, co má skutečnou hodnotu',
        'nech tělo rozhodnout, které tempo je dnes udržitelné',
        'nepřidávej další povinnost jen proto, že umíš vydržet hodně',
        'vyber klidnou jistotu místo pohodlí, které tě už jen drží na místě',
        'dopřej si pevný rytmus a nenech se zatlačit do cizího spěchu',
        'udělej praktickou věc, která ti zítra ušetří sílu'
    ],
    blizenci: [
        'polož jednu přímou otázku a nech odpověď zúžit další směr',
        'nepřeskakuj mezi třemi verzemi pravdy a řekni tu nejjednodušší',
        'zapiš si první jasnou myšlenku dřív, než ji přehluší další možnosti',
        'vyber jeden rozhovor, který opravdu posune věc dál',
        'neplň ticho slovy, pokud už odpověď uvnitř znáš',
        'dej hlavě prostor, ale rozhodnutí opři o konkrétní krok'
    ],
    rak: [
        'pojmenuj jednu hranici jemně, ale bez omluvy',
        'neber si do srdce náladu, která ti nepatří',
        'vrať se k tomu, co tě uklidní, než začneš zachraňovat ostatní',
        'řekni pravdu tišeji, ale neschovávej ji úplně',
        'dopřej si chvilku soukromí dřív, než odpovíš na cizí očekávání',
        'nech citlivost pracovat jako kompas, ne jako břemeno'
    ],
    lev: [
        'dej prostor tomu, co chceš tvořit, i když to zatím nikdo nehodnotí',
        'ukaž jednu věc přirozeně, ne proto, aby sis zasloužil pozornost',
        'nečekej na perfektní chvíli a dovol radosti být dostatečným důvodem',
        'vrať se k tvorbě, která tě rozsvítí i bez publika',
        'řekni si o uznání přímo, místo abys kolem něj stavěl zkoušku',
        'nech hrdost změknout tam, kde by blízkost byla silnější'
    ],
    panna: [
        'vyber jeden detail, který opravdu pomůže, a zbytek nech chvíli být',
        'neopravuj všechno najednou a vrať pořadí tomu, co má prioritu',
        'udělej jednu věc jednodušeji, než by dovolil vnitřní kritik',
        'odlož seznam, který už neslouží přehledu, ale jen napětí',
        'pojmenuj konkrétní další krok a nehledej deset dalších výjimek',
        'dopřej si řád, který uklidňuje, ne řád, který svazuje'
    ],
    vahy: [
        'řekni, co potřebuješ, aniž bys vše zjemňoval za každou cenu',
        'nevyvažuj situaci tím, že zmenšíš vlastní potřebu',
        'dej přednost jasné dohodě před úsměvem, který něco zakrývá',
        'vyber možnost, která je férová i k tobě, nejen k ostatním',
        'pojmenuj nerovnováhu dřív, než se promění v tichou vzdálenost',
        'nech krásu vztahu vyrůst z pravdy, ne z obcházení napětí'
    ],
    stir: [
        'pusť jednu kontrolu a sleduj, kolik energie se tím uvolní',
        'nevracej se k podezření, pokud už máš dost jasných faktů',
        'dovol pravdě vyjít na povrch bez potřeby vše hned proměnit v závěr',
        'vyber ticho, které léčí, ne ticho, které trestá',
        'nech starou obranu spadnout tam, kde už není co chránit',
        'použij hloubku k uzdravení, ne k dalšímu zkoumání bolesti'
    ],
    strelec: [
        'vyber směr, který rozšiřuje obzor, ale neobchází zodpovědnost',
        'neutíkej do nové možnosti jen proto, že stará chce dokončení',
        'řekni si pravdu bez přehánění a podle ní udělej jeden krok',
        'otevři větší perspektivu, ale neztrať kontakt s dnešní realitou',
        'nech dobrodružství začít malým rozhodnutím, ne velkým slibem',
        'vyber svobodu, která má směr, ne jen únikový východ'
    ],
    kozoroh: [
        'udělej jeden krok pro budoucnost a dovol si nepřidávat další břemeno',
        'neposuzuj celý den podle výkonu, který ještě není hotový',
        'vrať ambici do praktického tempa a nenech ji ztvrdnout do tlaku',
        'dokonči malou věc, která posílí dlouhodobou stabilitu',
        'připomeň si, že odpovědnost nemusí znamenat samotu',
        'postav hranici tam, kde se disciplína začala měnit ve vyčerpání'
    ],
    vodnar: [
        'sdílej jeden neobvyklý nápad s někým, kdo mu dá zdravou zpětnou vazbu',
        'neutíkej do odstupu, pokud situace potřebuje lidskou blízkost',
        'dovol si jiné řešení, ale ukotvi ho v něčem praktickém',
        'vyber komunitu, kde nemusíš zmenšovat vlastní originalitu',
        'nech nápad dozrát přes rozhovor, ne jen přes vnitřní analýzu',
        'spoj vizi s jedním konkrétním krokem, který jde udělat dnes'
    ],
    ryby: [
        'chraň si ticho a jednej až ve chvíli, kdy se pocit spojí s jasným krokem',
        'nepřebírej smutek, který jen prošel kolem tebe',
        'dovol intuici promluvit, ale ověř ji jednoduchou realitou',
        'vyber soucit, který neznamená ztrátu vlastních hranic',
        'vrať se k tvorbě, modlitbě nebo tichu, které uklidní vnitřní hladinu',
        'nech sen zůstat inspirací, ale rozhodnutí postav na dnešním kroku'
    ]
};

const OPENERS = [
    ({ sign, theme, season, dayLabel }) => `${sign.vocative}, ${dayLabel} otevírá oblast ${theme.area}; ${season}, takže dar jménem ${sign.gift} potřebuje vědomější použití.`,
    ({ sign, theme, season, dayLabel }) => `${sign.vocative}, ${dayLabel} v oblasti ${theme.area} nejvíc pomůže klidná přesnost, protože ${season}.`,
    ({ sign, theme, season, dayLabel }) => `${sign.vocative}, energie ${dayLabel} se dotýká oblasti ${theme.area} a připomíná, že dar jménem ${sign.gift} nejlépe funguje bez dokazování.`,
    ({ sign, theme, season, dayLabel }) => `${sign.vocative}, tam, kde se ${dayLabel} ozývá oblast ${theme.area}, nepomůže spěch, ale poctivé naladění na vlastní rytmus.`,
    ({ sign, theme, season, dayLabel }) => `${sign.vocative}, ${season}, a proto se ${dayLabel} vyplatí projít oblast ${theme.area} s větší pravdivostí než obvykle.`,
    ({ sign, theme, season, dayLabel }) => `${sign.vocative}, obloha ${dayLabel} nevolá po velkém obratu; spíš tě jemně vrací k oblasti ${theme.area} a k tomu, co už dávno víš.`,
    ({ sign, theme, season, dayLabel }) => `${sign.vocative}, ${dayLabel} se v oblasti ${theme.area} může ukázat drobný, ale důležitý rozdíl mezi zvykem a skutečnou potřebou.`,
    ({ sign, theme, season, dayLabel }) => `${sign.vocative}, ${season}; ${dayLabel} proto v oblasti ${theme.area} hledej pevný bod, ne dokonalou odpověď.`,
    ({ sign, theme, season, dayLabel }) => `${sign.vocative}, ${dayLabel} ti v oblasti ${theme.area} nabízí šanci zvolnit a použít dar jménem ${sign.gift} konkrétněji.`,
    ({ sign, theme, season, dayLabel }) => `${sign.vocative}, obloha ${dayLabel} vede pozornost k oblasti ${theme.area}; ${season}, ale odpověď hledej v jednom klidném kroku.`,
    ({ sign, theme, season, dayLabel }) => `${sign.vocative}, ${dayLabel} není o velkém dokazování, spíš o přesnosti v oblasti ${theme.area}, kde se může opřít ${sign.gift}.`,
    ({ sign, theme, season, dayLabel }) => `${sign.vocative}, ${dayLabel} v oblasti ${theme.area} nejvíc zabere jednoduchost; ${season}.`,
    ({ sign, theme, season, dayLabel }) => `${sign.vocative}, obloha ${dayLabel} jemně zvýrazňuje oblast ${theme.area} a zve tě k rozhodnutí, které nebude stát na napětí.`,
    ({ sign, theme, season, dayLabel }) => `${sign.vocative}, ${season}; ${dayLabel} v oblasti ${theme.area} stačí méně slov a víc poctivé přítomnosti.`,
    ({ sign, theme, season, dayLabel }) => `${sign.vocative}, obloha ${dayLabel} ukazuje, že oblast ${theme.area} potřebuje jasný, ale laskavý pohled, protože ${season}.`,
    ({ sign, theme, season, dayLabel }) => `${sign.vocative}, obloha ${dayLabel} může v oblasti ${theme.area} přinést tiché zpřesnění toho, co už uvnitř dávno tušíš.`
];

const MIDDLE_LINES = [
    ({ event, moon, sign }) => `${event} a ${moon} ukazují, kde se vzorec „${sign.shadow}“ může změnit v jasnější rozhodnutí.`,
    ({ event, moon, sign }) => `${moon} spolu s aktuální oblohou připomíná, že starý reflex nemusí řídit celý den, i když se ozve velmi přesvědčivě.`,
    ({ event, moon, sign }) => `${event} odkrývá místo, kde ${sign.shadow} může působit jako ochrana, ale ve skutečnosti už bere sílu.`,
    ({ event, moon, sign }) => `Fáze Měsíce (${moon.toLowerCase()}) dnes pomáhá rozeznat rozdíl mezi vnitřním klidem a automatickou reakcí.`,
    ({ event, moon, sign }) => `${event} přináší jemné napětí kolem pravdivosti a ${moon} ti pomáhá rozlišit, co už není nutné držet.`,
    ({ event, moon, sign }) => `Den nepůsobí hlučně; nastavuje zrcadlo tam, kde se opakuje ${sign.shadow}.`,
    ({ event, moon, sign }) => `${moon} dává dni citlivější tón a ${event} připomíná, že posun dnes začíná u jedné poctivé vnitřní volby.`,
    ({ event, moon, sign }) => `Když se objeví ${sign.shadow}, neber to jako selhání; je to přesné označení místa, které potřebuje péči.`,
    ({ event, moon, sign }) => `${event} zvýrazňuje drobný vnitřní uzel a ${moon} ukazuje, že odpověď může dozrát potichu.`,
    ({ event, moon, sign }) => `Měsíc ve fázi „${moon.toLowerCase()}“ dnes zjemňuje tempo a pomáhá ti uvidět, kde ${sign.shadow} zbytečně zužuje možnosti.`,
    ({ event, moon, sign }) => `${event} dnes funguje jako tichá připomínka: ne všechno, co se ozve silně, potřebuje okamžitou reakci.`,
    ({ event, moon, sign }) => `Pod vlivem fáze „${moon.toLowerCase()}“ se lépe ukáže, co je skutečná potřeba a co jen naučený pohyb bez směru.`,
    ({ event, moon, sign }) => `${event} pomáhá oddělit pravdivý impulz od staré obrany, která už nemusí určovat celý den.`,
    ({ event, moon, sign }) => `Dnešní rytmus je jemný, ale přesný; ${moon.toLowerCase()} podporuje rozhodnutí, které šetří energii.`,
    ({ event, moon, sign }) => `Tam, kde se vrací ${sign.shadow}, dnes pomůže méně vysvětlování a víc jednoduché přítomnosti.`,
    ({ event, moon, sign }) => `${event} otevírá prostor pro klidnější volbu a ${moon} ukazuje, co už můžeš pustit bez dramatu.`
];

const CLOSERS = [
    ({ theme, practical }) => `Dnes se opři o jednoduchou praxi: ${theme.action}; ${practical}.`,
    ({ theme, practical }) => `Praktická rada zní: ${theme.action}; ${practical}.`,
    ({ theme, practical }) => `Dnes si dovol jednoduchost: ${theme.action}; ${practical}.`,
    ({ theme, practical }) => `Zaměř se na jeden poctivý krok: ${theme.action}; ${practical}.`,
    ({ theme, practical }) => `Dnešní klíč je tichý, ale jasný: ${theme.action}; ${practical}.`,
    ({ theme, practical }) => `Nejvíc dnes pomůže, když nebudeš přidávat další vrstvu nároku: ${theme.action}; ${practical}.`,
    ({ theme, practical }) => `V praxi to znamená: ${theme.action}; ${practical}.`,
    ({ theme, practical }) => `Začni u maličkosti: ${theme.action}; pokud přijde nejistota, ${practical}.`,
    ({ theme, practical }) => `Dnes nehledej složitý plán: ${theme.action}; ${practical}.`,
    ({ theme, practical }) => `Stačí jeden vědomý posun: ${theme.action}; ${practical}.`,
    ({ theme, practical }) => `Udělej den praktičtější: ${theme.action}; ${practical}.`,
    ({ theme, practical }) => `Nech odpověď projít přes jednoduchost: ${theme.action}; ${practical}.`,
    ({ theme, practical }) => `Drž se toho, co můžeš udělat hned: ${theme.action}; ${practical}.`,
    ({ theme, practical }) => `Zbytek dne opři o klidný detail: ${theme.action}; ${practical}.`,
    ({ theme, practical }) => `Vyber si jednu konkrétní oporu: ${theme.action}; ${practical}.`,
    ({ theme, practical }) => `Dnešní směr se ukáže v maličkosti: ${theme.action}; ${practical}.`
];

const SEASON_TEXTS = {
    byk: [
        'Slunce v Býku zpomaluje tempo a vrací pozornost k jistotě, tělu a poctivému rytmu',
        'býčí sezóna učí vybírat pomaleji, pevněji a s větším respektem k vlastní energii',
        'Slunce v Býku připomíná hodnotu jednoduchosti, těla a kroků, které mají skutečnou oporu',
        'energie Býka dnes přeje klidnému rozhodnutí, trpělivosti a návratu k tomu, co dává smysl',
        'býčí Slunce ztišuje spěch a ukazuje, kde se jistota rodí z poctivého rytmu'
    ],
    blizenci: [
        'Slunce v Blížencích otevírá komunikaci, nové souvislosti a pružnější rozhodování',
        'blíženecká sezóna přeje jasnějším slovům, rychlejším souvislostem a lehčímu pohybu mysli',
        'Slunce v Blížencích rozhýbává otázky, rozhovory a schopnost změnit úhel pohledu',
        'energie Blíženců dnes vede k přesnějším slovům, kratším rozhodnutím a větší mentální lehkosti',
        'blíženecké Slunce podporuje zvědavost, upřímný dialog a schopnost nezůstat v jediné odpovědi'
    ],
    rak: [
        'Slunce v Raku vrací pozornost k domovu, citům a hranicím, které chrání vnitřní klid',
        'račí sezóna ztišuje tempo a vede pozornost k domovu, tělu a citové bezpečnosti',
        'Slunce v Raku posiluje potřebu bezpečí, jemných hranic a pravdivého vnitřního prostoru',
        'energie Raka připomíná, že citlivost potřebuje oporu, ne další nápor',
        'račí Slunce otevírá téma blízkosti, péče a hranic, které dovolí klidně dýchat'
    ]
};

function parseArgs(argv) {
    const args = {
        write: argv.includes('--write'),
        force: argv.includes('--force'),
        from: null,
        to: null,
        output: null
    };

    for (let i = 0; i < argv.length; i += 1) {
        if (argv[i] === '--from') args.from = argv[i + 1];
        if (argv[i] === '--to') args.to = argv[i + 1];
        if (argv[i] === '--output') args.output = argv[i + 1];
    }

    if (!args.from || !args.to) {
        const now = new Date();
        const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 12));
        const lastDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 12));
        args.from = formatIsoDate(tomorrow);
        args.to = formatIsoDate(lastDay);
    }

    return args;
}

function assertIsoDate(value, label) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) {
        throw new Error(`${label} musí být ve formátu YYYY-MM-DD.`);
    }
    const date = new Date(`${value}T12:00:00Z`);
    if (Number.isNaN(date.getTime()) || formatIsoDate(date) !== value) {
        throw new Error(`${label} není platné datum: ${value}`);
    }
}

function formatIsoDate(date) {
    return date.toISOString().slice(0, 10);
}

function datesBetween(from, to) {
    assertIsoDate(from, '--from');
    assertIsoDate(to, '--to');

    const start = new Date(`${from}T12:00:00Z`);
    const end = new Date(`${to}T12:00:00Z`);
    if (start > end) throw new Error('--from musí být před --to.');

    const dates = [];
    for (const cursor = new Date(start); cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
        dates.push(formatIsoDate(cursor));
    }
    return dates;
}

function formatCzechDate(dateStr) {
    const [year, month, day] = dateStr.split('-').map(Number);
    return `${day}. ${MONTHS_CS[month - 1]} ${year}`;
}

function normalizeSupabaseUrl(value) {
    if (!value) return value;
    return value.startsWith('http') ? value : `https://${value}.supabase.co`;
}

function cacheKey(sign, date) {
    return `${sign.slug}_daily_${date}_v3-cs-nocontext`;
}

function deterministicIndex(seed, modulo) {
    const hash = crypto.createHash('sha256').update(seed).digest();
    return hash.readUInt32BE(0) % modulo;
}

function luckyNumbers(seed) {
    const numbers = [];
    let counter = 0;
    while (numbers.length < 4) {
        const next = deterministicIndex(`${seed}:${counter}`, 49) + 1;
        if (!numbers.includes(next)) numbers.push(next);
        counter += 1;
    }
    return numbers.sort((a, b) => a - b);
}

function leadingWord(text) {
    const [word = ''] = String(text)
        .trim()
        .toLocaleLowerCase('cs-CZ')
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .split(/\s+/);

    return word.replace(/[^\p{L}]/gu, '');
}

function normalizeLabel(label) {
    return String(label)
        .toLocaleLowerCase('cs-CZ')
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .replace(/[^\p{L}0-9]+/gu, '');
}

function pickThemeAction(theme, seed) {
    const options = THEME_ACTION_VARIANTS[normalizeLabel(theme.label)] || [theme.action];
    return {
        ...theme,
        action: options[deterministicIndex(`${seed}:theme-action:${theme.label}`, options.length)]
    };
}

function pickSignPractical(sign, date, theme) {
    const options = SIGN_PRACTICALS[sign.slug] || [sign.practical];
    const start = deterministicIndex(`${date}:${sign.slug}:${theme.label}:practical`, options.length);
    const themeLead = leadingWord(theme.action);

    for (let offset = 0; offset < options.length; offset += 1) {
        const candidate = options[(start + offset) % options.length];
        if (leadingWord(candidate) !== themeLead) return candidate;
    }

    return options[start];
}

function buildAffirmation(sign, date, theme) {
    const dayLabel = formatCzechDate(date).replace(/ \d{4}$/, '');
    const templates = [
        () => `Dnes ${dayLabel} v oblasti ${theme.area} důvěřuji daru jménem ${sign.gift}, chráním svůj prostor a volím krok podporující klid.`,
        () => `Dnes ${dayLabel} se moje síla jmenuje ${sign.gift}; v oblasti ${theme.area} jednám pomalu, pravdivě a bez dokazování.`,
        () => `Dnes ${dayLabel} se vracím k elementu ${sign.element}, k daru jménem ${sign.gift} a k rozhodnutí vyrůstajícímu z klidu.`,
        () => `Dnes ${dayLabel} používám dar ${sign.gift} vědomě; v oblasti ${theme.area} pouštím cizí tlak a vybírám klidnou pravdu.`,
        () => `Dnes ${dayLabel} moje energie ${sign.element} zraje v jednoduchosti; dar jménem ${sign.gift} mě vede k laskavosti a jasnému kroku.`,
        () => `Dnes ${dayLabel} v oblasti ${theme.area} nemusím všechno unést najednou; stačí jeden poctivý krok, ${sign.gift} a tichá důvěra.`
    ];
    return templates[deterministicIndex(`${date}:${sign.slug}:affirmation`, templates.length)]();
}

function calculateMoonPhase(dateStr) {
    const now = new Date(`${dateStr}T12:00:00Z`);
    const synodic = 29.53058867;
    const knownNewMoon = new Date('2024-01-11T11:57:00Z');
    const diffDays = (now - knownNewMoon) / 86400000;
    let currentPhase = diffDays % synodic;
    if (currentPhase < 0) currentPhase += synodic;

    if (currentPhase < 1.5 || currentPhase > 28) return 'Nov';
    if (currentPhase < 7) return 'Dorůstající srpek';
    if (currentPhase < 9) return 'První čtvrť';
    if (currentPhase < 14) return 'Dorůstající Měsíc';
    if (currentPhase < 16) return 'Úplněk';
    if (currentPhase < 21) return 'Couvající Měsíc';
    if (currentPhase < 23) return 'Poslední čtvrť';
    return 'Couvající srpek';
}

function seasonText(key, seed) {
    const options = SEASON_TEXTS[key];
    return options[deterministicIndex(`${seed}:season:${key}`, options.length)];
}

function seasonFor(dateStr, seed = dateStr) {
    const monthDay = dateStr.slice(5);
    if (monthDay >= '04-20' && monthDay <= '05-20') {
        return seasonText('byk', seed);
    }
    if (monthDay >= '05-21' && monthDay <= '06-20') {
        return seasonText('blizenci', seed);
    }
    if (monthDay >= '06-21' && monthDay <= '07-22') {
        return seasonText('rak', seed);
    }
    return 'aktuální obloha žádá vědomější tempo a konkrétní volbu';
}

function loadAstroEvents() {
    try {
        return JSON.parse(fs.readFileSync(ASTRO_EVENTS_PATH, 'utf8'));
    } catch {
        return [];
    }
}

function activeEventFor(dateStr, signName, events) {
    const active = events.filter((event) => {
        const starts = event.start || event.date;
        const ends = event.end || event.date;
        const signMatch = !Array.isArray(event.signs) || event.signs.includes(signName);
        return starts <= dateStr && ends >= dateStr && signMatch;
    });

    if (!active.length) return 'Aktuální obloha';
    const nonSeasonal = active.filter((event) => !String(event.event || '').startsWith('Slunce v '));
    const pool = nonSeasonal.length ? nonSeasonal : active;
    const picked = pool[deterministicIndex(`${dateStr}:${signName}:event`, pool.length)];
    return String(picked.event).split('—')[0].trim();
}

function buildHoroscope(sign, date, events) {
    const seed = `${date}:${sign.slug}`;
    const theme = pickThemeAction(
        DAY_THEMES[deterministicIndex(`${seed}:theme`, DAY_THEMES.length)],
        seed
    );
    const opener = OPENERS[deterministicIndex(`${seed}:opener`, OPENERS.length)];
    const middle = MIDDLE_LINES[deterministicIndex(`${seed}:middle`, MIDDLE_LINES.length)];
    const closer = CLOSERS[deterministicIndex(`${seed}:closer`, CLOSERS.length)];
    const practical = pickSignPractical(sign, date, theme);
    const event = activeEventFor(date, sign.name, events);
    const moon = calculateMoonPhase(date);
    const season = seasonFor(date, seed);
    const dayLabel = formatCzechDate(date).replace(/ \d{4}$/, '');

    const prediction = [
        opener({ sign, theme, season, dayLabel }),
        middle({ sign, theme, event, moon }),
        closer({ sign, theme, event, moon, practical })
    ].join(' ');

    return {
        prediction,
        affirmation: buildAffirmation(sign, date, theme),
        luckyNumbers: luckyNumbers(seed)
    };
}

function buildRows(dates, events) {
    const rows = [];
    for (const date of dates) {
        for (const sign of SIGNS) {
            rows.push({
                cache_key: cacheKey(sign, date),
                sign: sign.name,
                period: 'daily',
                response: JSON.stringify(buildHoroscope(sign, date, events)),
                period_label: PERIOD_LABEL,
                generated_at: new Date(`${date}T06:00:00+02:00`).toISOString()
            });
        }
    }
    return rows;
}

async function findExistingKeys(supabase, keys) {
    const existing = new Set();
    const chunkSize = 100;
    for (let i = 0; i < keys.length; i += chunkSize) {
        const chunk = keys.slice(i, i + chunkSize);
        const { data, error } = await supabase
            .from('cache_horoscopes')
            .select('cache_key')
            .in('cache_key', chunk);

        if (error) throw new Error(error.message);
        for (const row of data || []) existing.add(row.cache_key);
    }
    return existing;
}

async function upsertRows(supabase, rows) {
    const chunkSize = 100;
    let written = 0;
    for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        const { error } = await supabase
            .from('cache_horoscopes')
            .upsert(chunk, { onConflict: 'cache_key' });

        if (error) throw new Error(error.message);
        written += chunk.length;
    }
    return written;
}

function writeReport({ args, dates, rows, skipped, written, sample }) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    const outputPath = args.output
        ? path.resolve(args.output)
        : path.join(OUTPUT_DIR, `horoscope_prefill_local_${args.from}_${args.to}.json`);

    const report = {
        generated_at: new Date().toISOString(),
        mode: args.write ? 'write' : 'dry-run',
        from: args.from,
        to: args.to,
        days: dates.length,
        total_rows: rows.length,
        written,
        skipped_existing: skipped,
        sample
    };
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf8');
    return outputPath;
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    const dates = datesBetween(args.from, args.to);
    const events = loadAstroEvents();
    const rows = buildRows(dates, events);
    const sample = JSON.parse(rows[0].response);

    let skipped = 0;
    let written = 0;

    if (!args.write) {
        console.log('[DRY RUN] Lokální horoskopy nebyly zapsány do databáze.');
        console.log(`[DRY RUN] Rozsah: ${args.from} až ${args.to}, řádků: ${rows.length}`);
        console.log('[DRY RUN] Pro zápis přidej --write.');
    } else {
        const supabaseUrl = normalizeSupabaseUrl(process.env.SUPABASE_URL);
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
        if (!supabaseUrl || !supabaseKey) {
            throw new Error('Chybí SUPABASE_URL nebo SUPABASE_SERVICE_ROLE_KEY v server/.env.');
        }

        const supabase = createClient(supabaseUrl, supabaseKey, {
            auth: { persistSession: false }
        });

        let rowsToWrite = rows;
        if (!args.force) {
            const existing = await findExistingKeys(supabase, rows.map((row) => row.cache_key));
            rowsToWrite = rows.filter((row) => !existing.has(row.cache_key));
            skipped = rows.length - rowsToWrite.length;
        }

        written = await upsertRows(supabase, rowsToWrite);
        console.log(`Zapsáno: ${written}, přeskočeno existujících: ${skipped}, celkem v rozsahu: ${rows.length}`);
    }

    const reportPath = writeReport({ args, dates, rows, skipped, written, sample });
    console.log(`Report: ${reportPath}`);
    console.log(`Ukázka (${SIGNS[0].name}, ${formatCzechDate(args.from)}):`);
    console.log(JSON.stringify(sample, null, 2));
}

main().catch((error) => {
    console.error('Fatal:', error.message || error);
    process.exit(1);
});
