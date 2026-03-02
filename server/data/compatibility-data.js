/**
 * Databáze kompatibility – rudimentální texty pro všechny 66 kombinací
 * Generátor použije tyto data pro vytvoření 66 statických HTML stránek
 */

export const SIGNS = [
    { key: 'beran', name: 'Beran', emoji: '♈', element: 'oheň', dates: '21. 3. – 19. 4.' },
    { key: 'byk', name: 'Býk', emoji: '♉', element: 'země', dates: '20. 4. – 20. 5.' },
    { key: 'blizenci', name: 'Blíženci', emoji: '♊', element: 'vzduch', dates: '21. 5. – 20. 6.' },
    { key: 'rak', name: 'Rak', emoji: '♋', element: 'voda', dates: '21. 6. – 22. 7.' },
    { key: 'lev', name: 'Lev', emoji: '♌', element: 'oheň', dates: '23. 7. – 22. 8.' },
    { key: 'panna', name: 'Panna', emoji: '♍', element: 'země', dates: '23. 8. – 22. 9.' },
    { key: 'vahy', name: 'Váhy', emoji: '♎', element: 'vzduch', dates: '23. 9. – 22. 10.' },
    { key: 'stir', name: 'Štír', emoji: '♏', element: 'voda', dates: '23. 10. – 21. 11.' },
    { key: 'strelec', name: 'Střelec', emoji: '♐', element: 'oheň', dates: '22. 11. – 21. 12.' },
    { key: 'kozoroh', name: 'Kozoroh', emoji: '♑', element: 'země', dates: '22. 12. – 19. 1.' },
    { key: 'vodnar', name: 'Vodnář', emoji: '♒', element: 'vzduch', dates: '20. 1. – 18. 2.' },
    { key: 'ryby', name: 'Ryby', emoji: '♓', element: 'voda', dates: '19. 2. – 20. 3.' },
];

// Element compatibility matrix
const ELEMENT_SCORES = {
    'oheň-oheň': 82, 'oheň-vzduch': 88, 'oheň-země': 55, 'oheň-voda': 62,
    'vzduch-vzduch': 80, 'vzduch-země': 58, 'vzduch-voda': 70,
    'země-země': 78, 'země-voda': 85,
    'voda-voda': 82,
};

function getScore(el1, el2) {
    const key = [el1, el2].sort().join('-');
    return ELEMENT_SCORES[key] || 70;
}

// Compatibility texts per element combo
const COMPAT_TEXTS = {
    'oheň-oheň': {
        love: 'Oba jste plni vášně, energie a spontaneity. Tento vztah hoří jasně – ale oheň se může i sežehnout. Klíčem je naučit se ustoupit a nechat prostor jeden druhému.',
        communication: 'Komunikujete přímočaře, někdy i příkře. Oba milujete otevřenost, ale ego může vytvářet třecí plochy. Naučte se naslouchat stejně aktivně, jako mluvíte.',
        challenges: 'Soupeřivost a potřeba dominovat mohou být zdrojem konfliktů. Oba chcete být ti první – v práci i ve vztahu. Spolupráce místo soutěžení je vaší hlavní lekci.',
        strengths: 'Neuvěřitelná energie, spontaneita a dobrodružný duch. Váš vztah nikdy nebude nudný. Společně dokážete hory přenášet a inspirovat okolí.',
        dateTip: 'Společná fyzická aktivita – turistika, tanec, nebo sport. Oheň potřebuje pohyb a sdílené dobrodružství.',
    },
    'oheň-vzduch': {
        love: 'Vzduch živí oheň – a právě tato chemie dělá z vašeho vztahu jeden z nejpřirozenějších a nejharmoničtějších kombinací zvěrokruhu. Ohnivý partner přináší akci, vzdušný intelekt.',
        communication: 'Komunikace vám přirozeně plyne. Vzdušné znamení miluje debaty, ohnivé okamžitou akci. Výsledkem je dynamický, stimulující dialog, kde jeden inspiruje druhého.',
        challenges: 'Vzdušné znamení může být příliš mentální a odtažité pro vášnivý oheň. Ohnivý partner zase impulzivní pro analytického vzdušného.',
        strengths: 'Kreativita, intelektuální stimulace a společná potřeba svobody. Tento pár bude vždy mít témata na rozhovor a plány na víkend.',
        dateTip: 'Výstava, divadlo nebo road trip. Oba milujete nové zážitky a intelektuální podněty.',
    },
    'oheň-země': {
        love: 'Klasická polarita přitažlivá i náročná zároveň. Zemské znamení přináší stabilitu, kterou oheň potřebuje, ale ne vždy chce přiznat. Spalující přitažlivost při prvním setkání.',
        communication: 'Zde jsou rozdíly největší. Oheň je spontánní a expresivní, země pečlivá a praktická. Naučit se respektovat tyto odlišné styly komunikace je klíčem.',
        challenges: 'Ohnivý partner může vnímat zemské znamení jako příliš konzervativní nebo pomalé. Zemské znamení zase ohnivého jako nezodpovědného.',
        strengths: 'Když to funguje, tento pár je soběstačný: oheň přináší vizi a nadšení, země realizaci a vytrvalost. Skvělá kombinace pro společné projekty.',
        dateTip: 'Vaření výjimečné večeře doma nebo výlet do přírody – kombinace pohodlí a dobrodružství.',
    },
    'oheň-voda': {
        love: 'Protiklady přitahují – a tato kombinace to dokazuje. Mezi ohněm a vodou může existovat hluboká, transformační láska, která mění oba partnery.',
        communication: 'Zde leží největší výzva. Oheň komunikuje přímočaře a razantně, voda intuitivně a emocionálně. Oheň si ani nevšimne, když partner trpí.',
        challenges: 'Oheň může hasit voda, voda se může odpařit od příliš intenzivního ohně. Oba potřebují prostor k dýchání a pochopení svých odlišných emočních jazyků.',
        strengths: 'Silná chemie, hloubka citového spojení a vzájemný růst. Když oba zaberou, mohou vytvořit vztah, který přetrvá cokoliv.',
        dateTip: 'Romantický výlet k vodě – jezero, řeka nebo moře. Příroda v tomto spojení doslova ladí.',
    },
    'vzduch-vzduch': {
        love: 'Intelektuální chemistry, brilantní konverzace a vzájemné porozumění bez nutnosti vysvětlovat. Tento vztah žije v říši myšlenek a svobody.',
        communication: 'Přirozená, plynná a stimulující. Budete si tykat velmi rychle – jazykové i myšlenkové zásoby jsou na stejné vlně. Danger: konverzace může nahradit intimitu.',
        challenges: 'Příliš mnoho vzdušnosti může vést k povrchnosti. Oba se vyhýbají těžkým emocím. Vztah potřebuje ukotvení v realitě a emocionální hloubce.',
        strengths: 'Nejlepší přátelé i milenci zároveň. Intelektuální spojení, smích a společné hodnoty svobody a nezávislosti.',
        dateTip: 'Kvíz v kavárně, book club nebo spontánní výlet do neznámého města. Vzduch miluje improvizaci.',
    },
    'vzduch-země': {
        love: 'Na první pohled odlišní – vzduch touží po svobodě a novosti, země po stabilitě a jistotě. Ale právě tato polarita může vytvořit velmi doplňující partnerství.',
        communication: 'Vzdušné znamení bude fascinováno praktičností zemského, zemské zase okouzleno intelektuální hravostí vzdušného. Musí se naučit mluvit různými jazyky.',
        challenges: 'Zemské znamení může cítit vzdušného jako nestálého a nespolehlivého. Vzdušné může cítit zemského jako příliš rigidní.',
        strengths: 'Vzájemné doplňování: jeden přináší vize a nápady, druhý realizaci. Potenciálně skvělý tým v práci i v osobním životě.',
        dateTip: 'Farmářský trh, výroba keramiky nebo procházka výstavou současného umění – dobrodružství s ukotvením v realitě.',
    },
    'vzduch-voda': {
        love: 'Intelekt setkává cit. Vzduch přitahuje emočně bohatou vodu, voda fascinuje analytický vzduch. Tato kombinace může být velmi obohacující.',
        communication: 'Vzduch komunikuje logicky, voda emočně – to může vést k nedorozuměním. Vzduch řeší problémy analýzou, voda intuicí.',
        challenges: 'Vodní znamení může vnímat vzdušného jako citově chlad­ného. Vzdušné zase vodní jako příliš senzitivní nebo iracionální.',
        strengths: 'Hluboká konverzace, kdy jeden přináší fakta a druhý emocionální kontext. Oba mohou hluboce obohacovat perspektivu toho druhého.',
        dateTip: 'Meditace nebo jóga, pak filozofická rozhovory při čajové ceremonii.',
    },
    'země-země': {
        love: 'Solídní, spolehlivý a hluboce věrný vztah. Oba chápete hodnotu stability, trpělivosti a budování dlouhodobého zázemí. Tichá, ale hluboká láska.',
        communication: 'Praktická, přímá a věcná. Žádné zbytečné drama. Oba preferují fakta před emocemi, což může vést k přehlížení citových potřeb.',
        challenges: 'Rutina a stereotyp jsou vaším nepřítelem. Oba jste konzervativní – kdo pak přinese spontaneitu a dobrodružství?',
        strengths: 'Neuvěřitelná vytrvalost, věrnost a schopnost budovat společně. Finanční stabilita, krásný domov a jistota jsou vaší přirozenou silnou stránkou.',
        dateTip: 'Piknik v přírodě, domácí vaření se svíčkami nebo výlet za historickými památkami.',
    },
    'země-voda': {
        love: 'Jedna z nejpřirozenějších a nejharmoničtějších kombinací zvěrokruhu. Voda živí zemi, země dává vodě tvar a směr. Hluboká, výživná a vytrvalá láska.',
        communication: 'Zemské znamení přináší strukturu, vodní emočně hloubku. Navzájem si rozumíte bez zbytečných slov. Intuice vodního doplňuje praktičnost zemského.',
        challenges: 'Zemské znamení může ignorovat emocionální potřeby vodního, pokud je příliš soustředěno na praktické aspekty. Vodní pak trpí tiše.',
        strengths: 'Bezpečí, hloubka a vzájemná podpora. Oba si váží věrnosti a dlouhodobého závazku. Přirozeně vytvářejí útulný domov.',
        dateTip: 'Společné zahradničení, výlet k přehradě nebo příprava domácího wellness spa.',
    },
    'voda-voda': {
        love: 'Dvě hluboko cítící duše. Tento vztah je naplněn empatií, intuicí a sdílenými city. Bez slov si rozumíte – ale zároveň potřebujete vnější ukotvení.',
        communication: 'Intuitivní a emocionálně bohatá. Nekomunikujete jen slovy – energeticky cítíte náladu partnera. Riziko přílišné absorpce emocí druhého.',
        challenges: 'Oba jste emocionálně náchylní. Bez pevné základny může vztah utopit v drama nebo escapizmu. Potřebujete vnější stabilizaci.',
        strengths: 'Hluboký empatický základ, duchovní spojení a schopnost bezpodmínečné lásky. V tomto vztahu se cítíte opravdově pochopeni.',
        dateTip: 'Spirituální retreat, meditace u vody nebo společné psaní snů a vizí.',
    },
};

function getCompatText(el1, el2) {
    const key = [el1, el2].sort().join('-');
    return COMPAT_TEXTS[key] || COMPAT_TEXTS['vzduch-voda'];
}

export function generateCompatibilityData(sign1, sign2) {
    const s1 = SIGNS.find(s => s.key === sign1);
    const s2 = SIGNS.find(s => s.key === sign2);
    if (!s1 || !s2) return null;

    const score = getScore(s1.element, s2.element);
    const text = getCompatText(s1.element, s2.element);
    const scoreEmoji = score >= 85 ? '💛' : score >= 75 ? '💚' : score >= 65 ? '💙' : '💜';

    return {
        sign1: s1, sign2: s2,
        score, scoreEmoji,
        scoreLabel: score >= 85 ? 'Výjimečná shoda' : score >= 75 ? 'Silná shoda' : score >= 65 ? 'Dobrá shoda' : 'Zajímavá polarita',
        ...text,
    };
}
