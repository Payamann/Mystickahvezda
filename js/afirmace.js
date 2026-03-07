/**
 * afirmace.js — Denní afirmace podle znamení + fáze Měsíce
 */

const signs = {
    beran: { name: 'Beran', emoji: '♈', color: '#e74c3c' },
    byk: { name: 'Byk', emoji: '♉', color: '#27ae60' },
    blizenci: { name: 'Blíženci', emoji: '♊', color: '#f39c12' },
    rak: { name: 'Rak', emoji: '♋', color: '#2980b9' },
    lev: { name: 'Lev', emoji: '♌', color: '#e67e22' },
    panna: { name: 'Panna', emoji: '♍', color: '#8e44ad' },
    vahy: { name: 'Váhy', emoji: '♎', color: '#16a085' },
    stir: { name: 'Štír', emoji: '♏', color: '#c0392b' },
    strelec: { name: 'Střelec', emoji: '♐', color: '#d35400' },
    kozoroh: { name: 'Kozoroh', emoji: '♑', color: '#7f8c8d' },
    vodnar: { name: 'Vodnář', emoji: '♒', color: '#2471a3' },
    ryby: { name: 'Ryby', emoji: '♓', color: '#1a5276' }
};

// 30 afirmací pro každé znamení
const affirmations = {
    beran: [
        { text: 'Má odvaha je mou největší silou. Jdu vpřed bez strachu.', sub: 'Dnes je den pro odvážné kroky a nové začátky.' },
        { text: 'Jsem lídrem svého vlastního života. Inspiruji ostatní svou energií.', sub: 'Vaše přirozená odhodlanost vám dnes otevírá dveře.' },
        { text: 'Přijímám výzvy jako příležitosti k růstu a síle.', sub: 'Mars vás podporuje — jednejte s odvahou.' },
        { text: 'Má vášeň je dar, který sdílím se světem.', sub: 'Nechte svůj oheň hřát ostatní.' },
        { text: 'Jsem svobodný/á a neporazitelný/á duch.', sub: 'Dnes nic nezastaví váš průchod.' },
        { text: 'Každý začátek je nová šance být lepší verzí sebe.', sub: 'Beran je průkopník — buďte první.' },
        { text: 'Má energie je nakažlivá v tom nejlepším smyslu slova.', sub: 'Sdílejte svůj entusiasmus s ostatními.' },
        { text: 'Důvěřuji svému instinktu. Ví, kudy jít.', sub: 'Vaše impulzivita může být dnes vaším největším darem.' },
        { text: 'Jsem tvůrce svého osudu, ne jeho oběť.', sub: 'Mocná slova pro den plný příležitostí.' },
        { text: 'Má síla roste s každou překonanou výzvou.', sub: 'Dnešní překážka je zítřejší vítězství.' },
    ],
    byk: [
        { text: 'Jsem pevný/á jako skála a jemný/á jako zem, která rodí.', sub: 'Vaše stabilita je dar pro vás i vaše okolí.' },
        { text: 'Přijímám hojnost ve všech formách s vděčností.', sub: 'Venuše vám dnes přináší krásu a dostatek.' },
        { text: 'Má trpělivost je mou nadpřirozenou silou.', sub: 'Dobré věci přicházejí těm, kdo čekají — a vy čekáte dobře.' },
        { text: 'Jsem v souladu s rytmem přírody a svého těla.', sub: 'Dopřejte si dnes chvíli ticha a zemního kontaktu.' },
        { text: 'Buduju svůj život krok za krokem, s jistotou a láskou.', sub: 'Každý kamínek tvoří pevnou základnu.' },
        { text: 'Má smyslnost je posvátná a hodná oslavy.', sub: 'Dnešní den je pro potěšení smyslů.' },
        { text: 'Věřím procesu. Vše přichází v pravý čas.', sub: 'Vaše vytrvalost nese ovoce.' },
        { text: 'Jsem magnetem pro krásu, lásku a hojnost.', sub: 'Venuše v akci.' },
        { text: 'Má hodnota není podmíněna výkonem, ale bytím.', sub: 'Připomenutí pro dnešní den.' },
        { text: 'Vytvářím bezpečný prostor pro sebe i pro ostatní.', sub: 'Váš domov je vaším klíčem.' },
    ],
    blizenci: [
        { text: 'Má zvídavost otvírá všechny dveře.', sub: 'Merkur vám dnes zapaluje mysl.' },
        { text: 'Přijímám svou mnohostrannost jako svůj největší dar.', sub: 'Blíženci mají dar vidět obě strany každé mince.' },
        { text: 'Má slova mají moc léčit, inspirovat a tvořit.', sub: 'Mluvte dnes opatrně a láskyplně.' },
        { text: 'Jsem mistrem/mistryní komunikace a porozumění.', sub: 'Vaše schopnost spojovat lidi je vzácná.' },
        { text: 'Každý nový pohled obohacuje mé chápání světa.', sub: 'Buďte dnes otevřeni neobvyklým perspektivám.' },
        { text: 'Propojuji lidi, myšlenky a příležitosti s lehkostí.', sub: 'Jste mostem tam, kde jsou jiní zdí.' },
        { text: 'Učení je mou přirozeností a radostí.', sub: 'Co nového se dnes naučíte?' },
        { text: 'Jsem adaptabilní jako vítr — ohýbám se, ale nelomím.', sub: 'Flexibilita je vaší superschopností.' },
        { text: 'Má kreativita nemá hranice.', sub: 'Nechte myšlenky volně plynout.' },
        { text: 'Přijímám změny jako pozvání k růstu, ne jako hrozbu.', sub: 'Blíženci jsou stvořeni pro pohyb vpřed.' },
    ],
    rak: [
        { text: 'Moje intuice je mým kompasem. Důvěřuji jí.', sub: 'Měsíc vám dnes posílá jasné signály.' },
        { text: 'Jsem láskyplným strážcem svého vnitřního světa.', sub: 'Chraňte svou energii s láskou.' },
        { text: 'Má empatie je dar, ne slabost.', sub: 'Vaše citlivost je vaší silou.' },
        { text: 'Přijímám a miluji všechny své emoce jako posly moudrosti.', sub: 'Dnes se dovolte cítit naplno.' },
        { text: 'Vytvářím domov v sobě samém/samé, kamkoliv jdu.', sub: 'Bezpečí nosíte uvnitř.' },
        { text: 'Jsem zdrojem lásky a útěchy pro ty kolem mě.', sub: 'Vaše péče dnes mnohým pomůže.' },
        { text: 'Moje kořeny jsou hluboké — nic mě nevykoří.', sub: 'Vaše emocionální stabilita je záštita.' },
        { text: 'Otevírám srdce lásce ve všech jejích podobách.', sub: 'Dnes je den otevřenosti.' },
        { text: 'Svá zranění přemění v moudrost a soucit.', sub: 'Vaše příběhy mají léčivou moc.' },
        { text: 'Jsem hluboce spojen/á s přirozenými rytmy Měsíce a přílivu.', sub: 'Nechte se dnes unést přirozeným tokem.' },
    ],
    lev: [
        { text: 'Má přítomnost osvětluje každou místnost.', sub: 'Slunce zářilo, když jste přišli na svět.' },
        { text: 'Jsem tvůrce/tvůrkyně a mé dílo mluví za mě.', sub: 'Co dnes vytvoříte pro svět?' },
        { text: 'Zasluhuji uznání a přijímám ho s grácií.', sub: 'Nezmenšujte svůj lesk, aby ostatní svítili jasněji.' },
        { text: 'Má velkorysost se vrací tisíckrát.', sub: 'Co dáte ze srdce, to se vrátí.' },
        { text: 'Jsem autentický/á, statečný/á a plný/á lásky.', sub: 'Vaše přirozené charisma je dar světu.' },
        { text: 'Má vášeň pro život je nakažlivá.', sub: 'Žijte naplno — inspire ostatní.' },
        { text: 'Jsem hrdý/á na to, kým jsem a kým se stávám.', sub: 'Hrdost z lásky, ne z ega.' },
        { text: 'Má kreativita plyne volně jako sluneční světlo.', sub: 'Dnes tvořte bez vnitřní cenzury.' },
        { text: 'Vůdcovsky se starám o ty, kteří mi důvěřují.', sub: 'Lev je strážce, ne tyran.' },
        { text: 'Přijímám lásku, která přichází mým směrem.', sub: 'Dovolte si přijímat tolik, kolik dáváte.' },
    ],
    panna: [
        { text: 'Jsem více než dost. Moje dokonalost je v mé lidskosti.', sub: 'Perfekcionismus se dnes přemění na sebevyjádření.' },
        { text: 'V detailech nacházím krásu a smysl.', sub: 'Vaše pečlivost je umění.' },
        { text: 'Sloužím sobě i ostatním s láskyplnou přesností.', sub: 'Pomáhání je vaše povolání.' },
        { text: 'Důvěřuji svému analytickému rozumu jako daru.', sub: 'Vaše mysl dnes vidí jasně.' },
        { text: 'Jsem schopen/schopna rozeznat skutečné od nepodstatného.', sub: 'Diskernment je dnes vaší superschopností.' },
        { text: 'Přijímám svou nedokonalost jako součást svého šarmu.', sub: 'Popraskaná místa pouštějí dovnitř světlo.' },
        { text: 'Má práce má hodnotu a přináší hojnost.', sub: 'Vaše pečlivost se dnes vyplatí.' },
        { text: 'Jsem v souladu se svým tělem a naslouchám jeho potřebám.', sub: 'Dopřejte si dnes péči o zdraví.' },
        { text: 'Organizuji svůj svět, aby pro mě pracoval — ne naopak.', sub: 'Systémy jsou vaším přítelem.' },
        { text: 'Propouštím potřebu kontroly a důvěřuji procesu.', sub: 'Dobré věci přicházejí, i když to jinak plánujeme.' },
    ],
    vahy: [
        { text: 'Přináším harmonii a rovnováhu tam, kde ji svět potřebuje.', sub: 'Váhy jsou strážci rovnováhy.' },
        { text: 'Jsem diplomatickým mostem mezi různými světy.', sub: 'Vaše diplomatické schopnosti jsou dnes klíčové.' },
        { text: 'Volím krásu ve všech projevech života.', sub: 'Venuše vás dnes vede k estetice.' },
        { text: 'Má spravedlnost pramení z lásky, ne ze strachu.', sub: 'Spravedlnost s soucitem je vaším darem.' },
        { text: 'Přijímám rozhodnutí s klidem a jistotou.', sub: 'Váš vnitřní kompas zná správný směr.' },
        { text: 'Jsem hodný/á krásných vztahů i seberealizace.', sub: 'Obojí je možné — nevybírejte si.' },
        { text: 'Nacházím rovnováhu mezi dáváním a přijímáním.', sub: 'Dnešní mantra pro zdravé vztahy.' },
        { text: 'Okolní krása mě inspiruje k vytváření krásy.', sub: 'Umění a příroda jsou dnes vaším palivem.' },
        { text: 'Komunikuji své potřeby s jemností a přesností.', sub: 'Říkejte co cítíte — laskavě.' },
        { text: 'Přitahuji lidi, kteří mě respektují a milují autenticky.', sub: 'Pouze zdravé vztahy mají přístup.' },
    ],
    stir: [
        { text: 'Má hloubka je mou silou, ne břemenem.', sub: 'Pluto vám dnes dává přístup k hlubokým pravdám.' },
        { text: 'Přeměňuji rány v moudrost a temnotu ve světlo.', sub: 'Fénix stoupá z popela — to jste vy.' },
        { text: 'Důvěřuji svému instinktu na úrovni, která přesahuje rozum.', sub: 'Vaše intuice je dnes mimořádně silná.' },
        { text: 'Jsem schopen/schopna jít tam, kam ostatní jít bojí.', sub: 'Hloubka je vaším domovem.' },
        { text: 'Propouštím star věci, aby nové mohlo přijít.', sub: 'Transformace je dnes vaším tématem.' },
        { text: 'Má vášeň je řídicí silou mého života.', sub: 'Nic napůl — to není váš styl.' },
        { text: 'Chráním svou energii jako posvátný zdroj.', sub: 'Komu důvěřujete — ti přístup dostanou.' },
        { text: 'Jsem schopen/schopna milovat hluboce a být milován/a zpět.', sub: 'Vaše srdce je otevřeno jen správným lidem.' },
        { text: 'Přijímám změny s odvahou a zvídavostí.', sub: 'Proměna je vaší přirozeností.' },
        { text: 'Vidím za povrch věcí — to je můj dar.', sub: 'Dnes se ptejte hlubokých otázek.' },
    ],
    strelec: [
        { text: 'Svět je má třída a každý den přináší novou lekci.', sub: 'Jupiter rozšiřuje vaše horizonty dnes.' },
        { text: 'Má svobodnná duše nalézá radost v pohybu a objevování.', sub: 'Dnes je den pro nové zážitky.' },
        { text: 'Moje pravda je jak šíp — přímá a míří přesně.', sub: 'Mluvte dnes upřímně a odvážně.' },
        { text: 'Přijímám dobrodružství jako způsob života.', sub: 'I malé dobrodružství dnes stačí.' },
        { text: 'Jsem optimistickým světlem pro ostatní.', sub: 'Váš optimismus je nakažlivý v tom nejlepším smyslu.' },
        { text: 'Filosofie mého srdce je pro mě kompasem.', sub: 'Čím věříte — tím se stáváte.' },
        { text: 'Má přirozenost je expanze, ne stagnace.', sub: 'Rostete dnes v jakémkoli směru.' },
        { text: 'Hledám smysl a nalézám ho ve velkých věcech i maličkostech.', sub: 'Smysl je všude — stačí se dívat.' },
        { text: 'Jsem plný/á vděčnosti za dary svobody a pohybu.', sub: 'Svoboda je váš nejdražší poklad.' },
        { text: 'Vzdělávám se a vzdělávám ostatní se stejnou radostí.', sub: 'Sdílení znalostí je vaším posláním.' },
    ],
    kozoroh: [
        { text: 'Každý krok na hoře mě přibližuje k vrcholu.', sub: 'Saturn odměňuje trpělivost a disciplínu.' },
        { text: 'Má disciplína je mou největší investicí do budoucnosti.', sub: 'Pracujete dnes pro svůj budoucí já.' },
        { text: 'Jsem tvůrce/tvůrkyně své vlastní cesty s každým rozhodnutím.', sub: 'Odpovědnost je vaší svobodou.' },
        { text: 'Mám trpělivost starých hor a vytrvalost přílivu.', sub: 'Vytrvalost vždy zvítězí.' },
        { text: 'Buduju odkaz, na který budu hrdý/á.', sub: 'Dnešní práce je základem legendy.' },
        { text: 'Má ambice jsou v souladu s mými hodnotami.', sub: 'Úspěch přichází, když cíle odpovídají duši.' },
        { text: 'Přijímám pomoc jako sílu, ne jako slabost.', sub: 'I nejsilnější hory mají opory.' },
        { text: 'Jsem schopen/schopna čekat na správný čas bez úzkosti.', sub: 'Správné tempo je vaší silou.' },
        { text: 'Má práce mluví hlasitěji než má slova.', sub: 'Výsledky jsou důkazem.' },
        { text: 'Vím, co chci — a věřím, že to dostanu.', sub: 'Nastavte dnes záměr a jednejte.' },
    ],
    vodnar: [
        { text: 'Jsem vizionář/ka světa, který teprve přijde.', sub: 'Uran vám dnes posílá nápady z budoucnosti.' },
        { text: 'Má originalita je můj největší příspěvek světu.', sub: 'Buďte dnes smělě jiní.' },
        { text: 'Propojuji lidi k vyšší společné vizi.', sub: 'Komunita je vaší superschopností.' },
        { text: 'Přijímám svou jedinečnost bez omluvy.', sub: 'Svět potřebuje přesně vás — takového/takovou, jaký/jaká jste.' },
        { text: 'Přispívám k lepšímu světu každou myšlenkou a akcí.', sub: 'Humanismus je vaší přirozeností.' },
        { text: 'Má svoboda myšlení je posvátná.', sub: 'Žádná myšlenka není příliš divná.' },
        { text: 'Jsem průkopník/průkopnice nových způsobů bytí.', sub: 'Svět potřebuje vaši progresivní vizi.' },
        { text: 'Hledám pravdu i za hranicemi konvenčního myšlení.', sub: 'Pravda je čekání za horizontem.' },
        { text: 'Má přátelství jsou hluboká a trvalá jako hvězdy.', sub: 'Pečujte dnes o vaše přátele.' },
        { text: 'Technologie a inovace mě inspirují k lepší budoucnosti.', sub: 'Jak můžete dnes inovovat?' },
    ],
    ryby: [
        { text: 'Má intuice je mou nejhlubší moudrostí.', sub: 'Neptun vám dnes posílá jasné vize.' },
        { text: 'Jsem oceánem soucitu a porozumění.', sub: 'Vaše empatie léčí svět kolem vás.' },
        { text: 'Mé sny mě vedou k mému pravému poslání.', sub: 'Věnujte dnes pozornost svým snům a vizím.' },
        { text: 'Propouštím to, co mi nepatří — emočně i fyzicky.', sub: 'Ryby potřebují čisté vody k plavání.' },
        { text: 'Jsem spolutvůrce/spolutvůrkyně krásy a magie around mě.', sub: 'Čím více vidíte magie, tím více jí je.' },
        { text: 'Přijímám svou citlivost jako posvátný dar, ne jako slabost.', sub: 'Jemnost je síla.' },
        { text: 'Má kreativita plyne jako řeka — stálá a hluboká.', sub: 'Tvořte dnes bez úsudku.' },
        { text: 'Jsem spojen/a se všemi živými bytostmi skrze lásku.', sub: 'Jednota je vaší přirozeností.' },
        { text: 'Uzdravuji sebe i ostatní svou přítomností.', sub: 'Vaše přítomnost je dar.' },
        { text: 'Věřím v magie každodenních okamžiků.', sub: 'Zázraky čekají všude — dívejte se.' },
    ]
};

const moonPhases = [
    { name: 'Nov — čas nových začátků', emoji: '🌑' },
    { name: 'Dorůstající srpek — čas plánování', emoji: '🌒' },
    { name: 'Dorůstající čtvrť — čas akce', emoji: '🌓' },
    { name: 'Dorůstající měsíc — čas expanze', emoji: '🌔' },
    { name: 'Úplněk — čas naplnění', emoji: '🌕' },
    { name: 'Couvající měsíc — čas vděčnosti', emoji: '🌖' },
    { name: 'Ubývající čtvrť — čas reflexe', emoji: '🌗' },
    { name: 'Ubývající srpek — čas uvolnění', emoji: '🌘' },
];

function getMoonPhase() {
    // Zjednodušený výpočet fáze Měsíce
    const known = new Date('2000-01-06'); // Nový Měsíc
    const now = new Date();
    const diff = (now - known) / (1000 * 60 * 60 * 24);
    const cycle = 29.53;
    const phase = ((diff % cycle) + cycle) % cycle;
    const index = Math.floor((phase / cycle) * 8);
    return moonPhases[Math.min(index, 7)];
}

function hashCode(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
        h = Math.imul(31, h) + str.charCodeAt(i) | 0;
    }
    return Math.abs(h);
}

window.showAffirmation = function (sign) {
    const today = new Date().toDateString();
    const list = affirmations[sign];
    if (!list) return;

    const index = hashCode(today + sign) % list.length;
    const aff = list[index];
    const moon = getMoonPhase();
    const signData = signs[sign];

    document.querySelectorAll('.zodiac-btn').forEach(b => b.classList.remove('active'));
    const btn = document.querySelector(`.zodiac-btn[data-sign="${sign}"]`);
    if (btn) btn.classList.add('active');

    const horoskopLink = document.getElementById('btn-horoskop-link');
    if (horoskopLink) horoskopLink.href = `horoskopy.html#${sign}`;

    document.getElementById('moon-badge').innerHTML = `${moon.emoji} ${moon.name}`;
    document.getElementById('sign-emoji').textContent = signData.emoji;
    document.getElementById('sign-name').textContent = signData.name.toUpperCase();
    document.getElementById('affirmation-text').textContent = `„${aff.text}"`;
    document.getElementById('affirmation-sub').textContent = aff.sub;

    const card = document.getElementById('affirmation-card');
    card.style.borderColor = signData.color + '44';
    card.classList.add('show');
    card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    // Store last used sign
    try { localStorage.setItem('mh_last_affirmation_sign', sign); } catch (e) { }
};

function copyAffirmation() {
    const text = document.getElementById('affirmation-text').textContent;
    navigator.clipboard.writeText(text + ' — Mystická Hvězda').then(() => {
        const el = document.getElementById('copy-confirm');
        el.style.display = 'block';
        setTimeout(() => el.style.display = 'none', 2000);
    });
}

function shareAffirmation() {
    const text = document.getElementById('affirmation-text').textContent;
    if (navigator.share) {
        navigator.share({ title: 'Moje dnešní afirmace', text: text, url: 'https://mystickahvezda.cz/afirmace.html' });
    } else {
        copyAffirmation();
    }
}

// Auto-load last sign on page load
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.zodiac-btn[data-sign]').forEach(btn => {
        btn.addEventListener('click', () => showAffirmation(btn.dataset.sign));
    });
    document.getElementById('btn-copy-affirmation').addEventListener('click', copyAffirmation);
    document.getElementById('btn-share-affirmation').addEventListener('click', shareAffirmation);

    try {
        const last = localStorage.getItem('mh_last_affirmation_sign');
        if (last && affirmations[last]) showAffirmation(last);
    } catch (e) { }
});
