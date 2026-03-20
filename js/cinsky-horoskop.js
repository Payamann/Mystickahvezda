// js/cinsky-horoskop.js

const CHINESE_ANIMALS = {
    krysa: {
        name: 'Krysa', emoji: '🐭', fixedElement: 'Voda', years: '1900,1912,1924,1936,1948,1960,1972,1984,1996,2008,2020',
        desc: 'Krysy jsou chytré, přizpůsobivé a obratné. Mají přirozený dar pro obchod a vyjednávání. Jsou věrní přátelé, i když se navenek tváří rezervovaně.',
        love: 'V lásce jsou nesmírně věrní a oddaní. Hledají partnera, s nímž sdílí intelektuální spojení. Ideálně Drak nebo Opice.',
        career: 'Podnikání, finance, politika, věda — kdekoli se uplatní jejich bystrost a adaptabilita.',
        y2026: 'Rok Koně přináší Krysám dynamiku a příležitosti k expanzi. Je to čas odvážných kroků, zvláště v kariéře. Pozor na impulzivní finanční rozhodnutí.',
        good: ['🐲 Drak', '🐒 Opice', '🐂 Buvol'], bad: ['🐴 Kůň', '🐓 Kohout']
    },
    buvol: {
        name: 'Buvol', emoji: '🐂', fixedElement: 'Země', years: '1901,1913,1925,1937,1949,1961,1973,1985,1997,2009,2021',
        desc: 'Buvoli jsou spolehliví, pracovití a trpěliví. Dosahují cílů vytrvalostí a pečlivostí. Jsou pilíři svých komunit a rodin.',
        love: 'V lásce jsou věrní, ale potřebují čas otevřít se. Ideálně Had nebo Kohout, kteří ocení jejich stabilitu.',
        career: 'Zemědělství, stavebnictví, medicina, právo — vse co vyžaduje pečlivost a systematičnost.',
        y2026: 'Rok Koně přináší Buvolům potřebu flexibility — což není jejich silná stránka. Ale ti, kteří se otevřou novým přístupům, zažijí průlom.',
        good: ['🐍 Had', '🐓 Kohout', '🐭 Krysa'], bad: ['🐐 Koza', '🐕 Pes']
    },
    tygr: {
        name: 'Tygr', emoji: '🐯', fixedElement: 'Dřevo', years: '1902,1914,1926,1938,1950,1962,1974,1986,1998,2010,2022',
        desc: 'Tygři jsou odvážní, charismatičtí a přiroznení vůdci. Jsou ochotni bojovat za to, v co věří. Jejich přítomnost je neodmyslitelná.',
        love: 'V lásce jsou vášniví a intenzivní. Hledají partnera silného ducha. Nejlepší shoda: Kůň nebo Pes.',
        career: 'Armáda, sport, podnikání, herectví — ve všem kde je potřeba odvaha a charisma.',
        y2026: 'Rok Koně je pro Tygry příznivý — oba sdílejí energii a touhu po svobodě. Je ideální čas na realizaci dlouholetých ambicí.',
        good: ['🐴 Kůň', '🐕 Pes', '🐲 Drak'], bad: ['🐒 Opice', '🐂 Buvol']
    },
    zajic: {
        name: 'Zajíc', emoji: '🐰', fixedElement: 'Dřevo', years: '1903,1915,1927,1939,1951,1963,1975,1987,1999,2011,2023',
        desc: 'Zajíci jsou klidní, empatičtí a diplomatičtí. Mají jemný smysl pro krásu a estetiku. Jsou přirozenými mírotvorci a vyhýbají se konfliktu.',
        love: 'V lásce jsou romantiční a nežní. Hledají harmonický vztah. Nejlepší shoda: Koza nebo Prase.',
        career: 'Umění, diplomacie, medicína, zahradnictví, psychologie — vše kde je potřeba jemnost a empatie.',
        y2026: 'Rok Koně může Zajícům připadat příliš rychlý a hlasitý. Je důležité udržet si svůj klid a nespěchat. Příležitosti přijdou pro trpělivé.',
        good: ['🐐 Koza', '🐷 Prase', '🐕 Pes'], bad: ['🐓 Kohout', '🐲 Drak']
    },
    drak: {
        name: 'Drak', emoji: '🐲', fixedElement: 'Země', years: '1904,1916,1928,1940,1952,1964,1976,1988,2000,2012,2024',
        desc: 'Draci jsou nejenergetičtějším a nejcharismatičtějším ze všech čínských znamení. Mají přirozenou autoritu a velkorysost. Jsou narozeni pro velké věci.',
        love: 'V lásce jsou vášniví a oddaní, i když někdy dominantní. Ideální partner: Krysa, Opice nebo Kůň.',
        career: 'Politika, podnikání, umění, věda — Draci excelují tam, kde mohou být středem pozornosti.',
        y2026: 'Rok Koně přináší Drakům dynamiku a příležitosti pro expanzi. Je to jejich rok pro velké investice a odvážné projekty. Energie je na vaší straně.',
        good: ['🐭 Krysa', '🐒 Opice', '🐴 Kůň'], bad: ['🐕 Pes', '🐰 Zajíc']
    },
    had: {
        name: 'Had', emoji: '🐍', fixedElement: 'Oheň', years: '1905,1917,1929,1941,1953,1965,1977,1989,2001,2013,2025',
        desc: 'Hadi jsou moudré, intuitivní a tajemné bytosti. Mají přirozený dar pro analýzu situací a vidí za povrch věcí. Jsou přitažliví svou záhadností.',
        love: 'V lásce jsou intenzivní a věrní, ale i žárliví. Ideální: Buvol nebo Kohout — pro jejich stabilitu.',
        career: 'Filozofie, věda, finance, astrologie, medicína — vše co vyžaduje hloubku a analytické myšlení.',
        y2026: 'Rok Koně přináší Hadům výzvy ve formě rychlosti — Koně chvátají tam, kde Had preferuje promyšlené kroky. Buďte trpěliví a nedejte se strhnout.',
        good: ['🐂 Buvol', '🐓 Kohout', '🐲 Drak'], bad: ['🐯 Tygr', '🐷 Prase']
    },
    kun: {
        name: 'Kůň', emoji: '🐴', fixedElement: 'Oheň', years: '1906,1918,1930,1942,1954,1966,1978,1990,2002,2014,2026',
        desc: 'Koně jsou svobodnými dušemi — energičtí, nezávislí a charismatičtí. Milují pohyb, cestování a nové dobrodružství. Jsou přirozenými optimisty.',
        love: 'V lásce jsou vášniví, ale potřebují svobodu. Ideální: Tygr nebo Koza, kteří jim tu svobodu dají.',
        career: 'Sport, cestovní ruch, obchod, politika, herectví — vše kde mohou projevit svou energii a charismus.',
        y2026: 'Rok 2026 je rok Koně — to je pro vás výjimečně příznivé! Toto je váš velký rok. Energie, příležitosti a láska jsou na vaší straně. Jednejte odvážně!',
        good: ['🐯 Tygr', '🐐 Koza', '🐲 Drak'], bad: ['🐭 Krysa', '🐂 Buvol']
    },
    koza: {
        name: 'Koza', emoji: '🐐', fixedElement: 'Země', years: '1907,1919,1931,1943,1955,1967,1979,1991,2003,2015,2027',
        desc: 'Kozy jsou kreativní, empatické a umělecky nadané bytosti. Jsou přirozenými estetiky s hlubokým smyslem pro krásu. Potřebují harmonické prostředí.',
        love: 'V lásce jsou romantické a idealistické. Ideální: Zajíc nebo Prase — kteří ocení jejich jemnost.',
        career: 'Umění, móda, zahradnictví, péče o ostatní, muzika — vše kde se uplatní kreativita a smysl pro krásu.',
        y2026: 'Rok Koně přináší Kozám velkou energii a příležitosti, ale také potřebu ukotvit se. Nesklouzněte k impulzivním rozhodnutím. Partnertví přináší stabilitu.',
        good: ['🐰 Zajíc', '🐷 Prase', '🐴 Kůň'], bad: ['🐂 Buvol', '🐕 Pes']
    },
    opice: {
        name: 'Opice', emoji: '🐒', fixedElement: 'Kov', years: '1908,1920,1932,1944,1956,1968,1980,1992,2004,2016,2028',
        desc: 'Opice jsou inteligentní, vtipné a přizpůsobivé. Jsou mistry improvizace a mají dar řešit komplikované problémy s lehkostí a humorem.',
        love: 'V lásce jsou hravé a stimulující. Potřebují partnera, který drží krok s jejich energií. Ideální: Krysa nebo Drak.',
        career: 'Věda, technologie, humor, obchod, marketing — ovšem tam kde mohou využít svůj bystrý intelekt.',
        y2026: 'Rok Koně přináší Opicím příležitosti v kariéře, zvláště v technologiích a komunikaci. Finanční situace se zlepší, ale pozor na přehnaný optimismus.',
        good: ['🐭 Krysa', '🐲 Drak', '🐯 Tygr'], bad: ['🐷 Prase', '🐍 Had']
    },
    kohout: {
        name: 'Kohout', emoji: '🐓', fixedElement: 'Kov', years: '1909,1921,1933,1945,1957,1969,1981,1993,2005,2017,2029',
        desc: 'Kohouti jsou precizní, spolehliví a estetičtí. Mají přirozený smysl pro detail a organizaci. Jsou hrdí na svůj vzhled a výkon.',
        love: 'V lásce jsou oddaní, ale perfekcionisticky nároční. Ideální: Buvol nebo Had, kteří ocení jejich preciznost.',
        career: 'Armáda, medicína, účetnictví, móda, gastronomie — vše co vyžaduje precisnost a pečlivost.',
        y2026: 'Rok Koně přináší Kohoutům potřebu flexibility — ale flexibilita není jejich nejsilnější stránka. Zaměřte se na spolupráci a diplomacii.',
        good: ['🐂 Buvol', '🐍 Had', '🐲 Drak'], bad: ['🐰 Zajíc', '🐴 Kůň']
    },
    pes: {
        name: 'Pes', emoji: '🐕', fixedElement: 'Země', years: '1910,1922,1934,1946,1958,1970,1982,1994,2006,2018,2030',
        desc: 'Psi jsou věrní, upřímní a spravedliví. Jsou přirozenými ochránci a bojovníky za spravedlnost. Jejich loajalita je legendární.',
        love: 'V lásce jsou věrní jako žádné jiné znamení. Hledají výhradně čestné a věrné partnery. Ideální: Tygr nebo Zajíc.',
        career: 'Právo, záchranáři, armáda, sociální práce, aktivismus — vše kde se bojuje za spravedlnost.',
        y2026: 'Rok Koně je pro Psy aktivní a plný příležitostí k sociálnímu angažmá. Je to čas bojovat za věci, na nichž záleží. Zdraví si zaslouží pozornost.',
        good: ['🐯 Tygr', '🐰 Zajíc', '🐴 Kůň'], bad: ['🐲 Drak', '🐐 Koza']
    },
    prase: {
        name: 'Prase', emoji: '🐷', fixedElement: 'Voda', years: '1911,1923,1935,1947,1959,1971,1983,1995,2007,2019,2031',
        desc: 'Prasata jsou laskavá, velkorysá a upřímná. Jsou přirozenými poskytovateli a mají velké srdce. Milují komfort a sdílení radostí se svými blízkými.',
        love: 'V lásce jsou hluboce oddaní a romantičtí. Ideální: Zajíc nebo Koza — jako romantičtí idealisté se dobře doplní.',
        career: 'Gastronomie, umění, léčitelství, finance — zvláště v rolích kde mohou pečovat a sdílet hojnost.',
        y2026: 'Rok Koně přináší Prasatům příležitosti v oblasti financí a rodinného života. Je to čas investovat do vztahů a do sebe. Cestování může přinést klíčové setkání.',
        good: ['🐰 Zajíc', '🐐 Koza', '🐯 Tygr'], bad: ['🐍 Had', '🐒 Opice']
    }
};

const ZODIAC_ORDER = ['krysa', 'buvol', 'tygr', 'zajic', 'drak', 'had', 'kun', 'koza', 'opice', 'kohout', 'pes', 'prase'];

/**
 * Returns Chinese Animal object based on birth year.
 */
function getChineseAnimalData(year) {
    if (!year || isNaN(year)) return null;
    const baseYear = 1900;
    // V cinske astrologii rok 1900 byl rokem Krysy. 
    // Spocitame zbytek a pripadne ho znormalizujeme do kladnych hodnot 0-11
    const idx = ((year - baseYear) % 12 + 12) % 12;
    const slug = ZODIAC_ORDER[idx];
    return {
        slug: slug,
        ...CHINESE_ANIMALS[slug]
    };
}

/**
 * Returns Element of the specific birth year (depends on the last digit of the year).
 * Voda (0-1), Dřevo (2-3) - Wait!
 * Podle čínské astrologie (poslení číslo roku):
 * 0, 1: Kov
 * 2, 3: Voda
 * 4, 5: Dřevo
 * 6, 7: Oheň
 * 8, 9: Země
 */
function getChineseElement(year) {
    if (!year || isNaN(year)) return null;
    const lastDigit = parseInt(year.toString().slice(-1), 10);

    switch (lastDigit) {
        case 0:
        case 1:
            return { name: 'Kov', suffix: 'Kovový', icon: '⚔️', color: '#B0C4DE' }; // Light Steel Blue
        case 2:
        case 3:
            return { name: 'Voda', suffix: 'Vodní', icon: '🌊', color: '#3498DB' }; // Blue
        case 4:
        case 5:
            return { name: 'Dřevo', suffix: 'Dřevěný', icon: '🌳', color: '#2ECC71' }; // Green
        case 6:
        case 7:
            return { name: 'Oheň', suffix: 'Ohnivý', icon: '🔥', color: '#E74C3C' }; // Red
        case 8:
        case 9:
            return { name: 'Země', suffix: 'Zemní', icon: '🌍', color: '#F39C12' }; // Orange/Brown
    }
    return null;
}

/**
 * Exposed to global scope for HTML inline calls (or ideally migrated later)
 */
window.calculateAnimal = function () {
    const input = document.getElementById('birth-year');
    if (!input) return;

    input.style.borderColor = '';
    const year = parseInt(input.value);

    if (!year || year < 1900 || year > 2100) {
        input.style.borderColor = 'rgba(231,76,60,0.8)';
        return;
    }
    window.showAnimal(null, year);
};

window.showAnimal = function (slugOverride, exactYear = null) {
    let data;
    let computedElement = null;
    let isSpecificYear = false;

    if (exactYear) {
        // Zavolano pres tlacitko formular s rocnikem (Ma zivel!)
        data = getChineseAnimalData(exactYear);
        computedElement = getChineseElement(exactYear);
        isSpecificYear = true;
    } else if (slugOverride) {
        // Zavolano jen pres ikonku (nema zivel, nevime presny rocnik)
        data = CHINESE_ANIMALS[slugOverride];
        data.slug = slugOverride;
    }

    if (!data) return;

    // Reset buttons
    document.querySelectorAll('.animal-btn').forEach(b => b.classList.remove('active'));
    const activeBtn = document.getElementById('btn-' + data.slug);
    if (activeBtn) activeBtn.classList.add('active');

    // Display Hero Section
    const hero = document.getElementById('result-hero');
    hero.style.background = 'linear-gradient(135deg, rgba(212,175,55,0.1), rgba(155,89,182,0.1))';
    hero.style.border = '1px solid rgba(212,175,55,0.25)';

    document.getElementById('result-emoji').textContent = data.emoji;

    // Customization based on Element
    if (isSpecificYear && computedElement) {
        document.getElementById('result-name').textContent = `${computedElement.suffix} ${data.name}`;
        document.getElementById('result-element').innerHTML = `${computedElement.icon} Aktivní Živel: <strong style="color:${computedElement.color}">${computedElement.name}</strong>`;
        document.getElementById('result-years').textContent = `Ročník: ${exactYear}`;
    } else {
        document.getElementById('result-name').textContent = data.name;
        document.getElementById('result-element').textContent = `Fixní Živel: ${data.fixedElement}`;
        document.getElementById('result-years').textContent = 'Roky: ' + data.years;
    }

    // Assign text nodes
    document.getElementById('result-desc').textContent = data.desc;
    document.getElementById('result-love').textContent = data.love;
    document.getElementById('result-career').textContent = data.career;
    document.getElementById('result-2026').textContent = data.y2026;

    // Compatibility badges (sanitized HTML)
    const elGood = document.getElementById('compat-good');
    const elBad = document.getElementById('compat-bad');
    if (elGood) {
        const rawGood = data.good.map(a => `<span class="compat-badge compat-good">${a}</span>`).join('');
        elGood.innerHTML = typeof DOMPurify !== 'undefined' ? DOMPurify.sanitize(rawGood) : rawGood;
    }
    if (elBad) {
        const rawBad = data.bad.map(a => `<span class="compat-badge compat-bad">${a}</span>`).join('');
        elBad.innerHTML = typeof DOMPurify !== 'undefined' ? DOMPurify.sanitize(rawBad) : rawBad;
    }

    // Vztahova analyza zobrazeni/schovani containeru "Rozsirena AI"
    const resultSec = document.getElementById('result-section');
    resultSec.classList.add('show');

    // Smart scroll k precteni horoskopu
    setTimeout(() => {
        resultSec.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
};

// Inicializace listeneru
document.addEventListener('DOMContentLoaded', () => {
    // Horoskop (Enter přes input)
    const input = document.getElementById('birth-year');
    if (input) {
        input.addEventListener('keydown', e => {
            if (e.key === 'Enter') window.calculateAnimal();
        });
    }

    // Hlavní tlačítko "Zjistit mé znamení"
    const btnCalculate = document.getElementById('btn-calculate');
    if (btnCalculate) {
        btnCalculate.addEventListener('click', () => window.calculateAnimal());
    }

    // Zvířecí tlačítka
    document.querySelectorAll('.animal-btn[data-slug]').forEach(btn => {
        btn.addEventListener('click', () => window.showAnimal(btn.dataset.slug));
    });

    // Synastrie button (prevence CSP onclick z HTML)
    const btnSynastry = document.getElementById('btn-synastry');
    if (btnSynastry) {
        btnSynastry.addEventListener('click', () => {
            window.calculateChineseSynastry();
        });
    }
});

/**
 * Chinese Synastry Calculator
 */
window.calculateChineseSynastry = function () {
    const input1 = document.getElementById('synastry-year1');
    const input2 = document.getElementById('synastry-year2');

    // Reset borders
    input1.style.borderColor = '';
    input2.style.borderColor = '';

    const year1 = parseInt(input1.value);
    const year2 = parseInt(input2.value);

    let hasError = false;
    if (!year1 || year1 < 1900 || year1 > 2100) {
        input1.style.borderColor = 'rgba(231,76,60,0.8)';
        hasError = true;
    }
    if (!year2 || year2 < 1900 || year2 > 2100) {
        input2.style.borderColor = 'rgba(231,76,60,0.8)';
        hasError = true;
    }

    if (hasError) return;

    const data1 = getChineseAnimalData(year1);
    const data2 = getChineseAnimalData(year2);
    const elem1 = getChineseElement(year1);
    const elem2 = getChineseElement(year2);

    if (!data1 || !data2 || !elem1 || !elem2) return;

    // Populate UI
    document.getElementById('syn-emoji1').textContent = data1.emoji;
    document.getElementById('syn-name1').textContent = `${elem1.suffix} ${data1.name}`;

    document.getElementById('syn-emoji2').textContent = data2.emoji;
    document.getElementById('syn-name2').textContent = `${elem2.suffix} ${data2.name}`;

    // Determine compatibility level
    // using base strings to match arrays ex. "🐲 Drak"
    const isGood = data1.good.some(str => str.includes(data2.name));
    const isBad = data1.bad.some(str => str.includes(data2.name));

    const titleEl = document.getElementById('syn-title');
    const descEl = document.getElementById('syn-desc');

    if (isGood) {
        titleEl.textContent = 'Ideální partnerství ✨';
        titleEl.style.color = '#2ecc71';
        descEl.textContent = `Tato dvě znamení tvoří naprosto přirozený a prosperující pár. ${data1.name} a ${data2.name} se skvěle doplňují a jejich životní energie jdou ruku v ruce. Navíc specifická interakce vrstev "${elem1.name}" a "${elem2.name}" může toto spojení ještě více rozsvítit!`;
    } else if (isBad) {
        titleEl.textContent = 'Náročný (Karmický) vztah ⚔️';
        titleEl.style.color = '#e74c3c';
        descEl.textContent = `V čínské astrologii jde o tzv. opoziční dvojici, která vidí svět jinýma očima. Může to být velmi vášnivé, ale vyžaduje to kompromisy. Zatímco ${data1.name} míří jedním směrem, ${data2.name} druhým. Interakce vašich živlů (${elem1.name} vs ${elem2.name}) hraje klíčovou roli v kompromisech.`;
    } else {
        titleEl.textContent = 'Harmonické spojení 💖';
        titleEl.style.color = 'var(--color-mystic-gold)';
        descEl.textContent = `Tento svazek je vyvážený. Nebojujete proti sobě, ale ani nejste vyloženě slepenou dvojicí. Váš vztah se tvoří na klidných kompromisech a respektu. Právě zde hrají obrovskou roli vaše unikátní elementy (${elem1.name} & ${elem2.name}), které dávají vašemu domovu barvu.`;
    }

    const res = document.getElementById('synastry-result');
    res.style.display = 'block';
    setTimeout(() => {
        res.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
};

// Event delegation for +/- year input buttons
document.addEventListener('click', (e) => {
    const action = e.target.getAttribute('data-action');
    if (action === 'stepDown' || action === 'stepUp') {
        const input = e.target.parentNode.querySelector('input');
        if (action === 'stepDown') {
            input.stepDown();
        } else {
            input.stepUp();
        }
        input.dispatchEvent(new Event('change'));
    }
});
