const DICTIONARY_TERMS = [
    // ── ASTROLOGIE ──────────────────────────────────────────────────────────
    {
        slug: 'ascendent',
        title: 'Ascendent',
        category: 'Astrologie',
        short_description: 'Znamení vycházející na východním obzoru v okamžiku vašeho narození. Určuje vaši masku pro vnější svět – jak vás vidí ostatní na první pohled.',
        content_html: `
            <p>Ascendent (latinsky <em>Ascendens</em> – „vystupující") je jeden z nejdůležitějších bodů celé vaší Natální mapy. Zatímco Sluneční znamení říká, kdo jste ve svém jádru, Ascendent odráží to, jak se <strong>prezentujete světu kolem sebe</strong>. Je to vaše první vrstva – osobnost, kterou nasazujete při setkání s cizím člověkem, u pracovního pohovoru nebo na první schůzce.</p>
            <p>Ascendent je extrémně citlivý na přesný čas a místo narození. Koteč zodiaku se otočí za 24 hodin, takže každé 2 hodiny se na obzoru vynoří nové znamení. Rozdíl pouhých 4 minut v čase narození může z Panny udělat Vahu.</p>
            <h2>Ascendent vs. Sluneční znamení</h2>
            <p>Pokud je vaše Sluneční znamení Štír, ale Ascendent Lev, lidé vás budou považovat za sebejistého, teatrálního a veselého člověka (Lví maska). Teprve při bližším poznání odhalí hloubku, intenzitu a tajnůstkářství Štíra, který se skrývá uvnitř.</p>
            <p>Právě proto mnozí lidé říkají, že jejich horoskop jim „nesedí" – čtou Sluneční popis, ale žijí Ascendentovou osobností. Ascendent je obálka knihy; Slunce je samotný příběh uvnitř.</p>
        `,
        related_slugs: ['nativni-karta', 'slunecni-znameni', 'aspekty'],
        linked_blog_slug: 'tajemstvi-12-astrologickych-domu'
    },
    {
        slug: 'retrogradi-planeta',
        title: 'Retrográdní planeta',
        category: 'Astrologie',
        short_description: 'Zdánlivý pohyb planety pozpátku (od Země) po obloze. Každý retrográd spouští zpomalení a přehodnocení dané sféry života.',
        content_html: `
            <p>Z pohledu Země se planety čas od času zdánlivě zastaví a začnou se pohybovat opačným směrem. Toto je optický klam způsobený různými rychlostmi oběhu planet kolem Slunce, ale <strong>v astrologii má retrográd velmi reálné dopady</strong> na naši psychiku a události.</p>
            <p>Každá planeta vládne konkrétní sférou života. Když je retrográdní, tato sféra přechází z aktivity do reflexe. Vnitřní procesy nabývají na síle, vnější akce se komplikují.</p>
            <h2>Nejzásadnější retrogrády</h2>
            <ul>
                <li><strong>Merkur Rx (3x ročně, 3 týdny):</strong> Komunikace, technologie, smlouvy, cestování. Klasický „nepodepisujte nic, nezačínejte nové projekty".</li>
                <li><strong>Venuše Rx (každých 18 měsíců):</strong> Vztahy, hodnoty, finance. Staří partneři se vracejí, přehodnocujeme, co pro nás láska znamená.</li>
                <li><strong>Mars Rx (každé 2 roky):</strong> Energie, vůle, akce. Tlačit na pilu je kontraproduktivní – ideální na strategické plánování.</li>
            </ul>
        `,
        related_slugs: ['merkur', 'tranizty'],
        linked_blog_slug: null
    },
    {
        slug: 'aspekty',
        title: 'Aspekty',
        category: 'Astrologie',
        short_description: 'Úhly, které svírají planety mezi sebou v Natální mapě. Harmonické aspekty (triny, sekstily) přinášejí dar; napjaté (opozice, kvadratury) přinášejí výzvy.',
        content_html: `
            <p>Aspekty jsou geometrické úhly, které spolu svírají planety na horoskopu. Dva Štíři se mohou setkávat úplně jinak, pokud má jeden Slunce v trigonu k Jupiteru (štěstí a expanze) a druhý v kvadratuře k Saturnu (překážky a zkoušky). <strong>Aspekty jsou „dialog" mezi energiemi planet</strong>.</p>
            <h2>Hlavní aspekty</h2>
            <ul>
                <li><strong>Konjunkce (0°):</strong> Dvě energie splývají. Výsledek záleží na planetách – Slunce + Jupiter = velkorysost, Slunce + Saturn = závažnost a disciplína.</li>
                <li><strong>Trigon (120°):</strong> Harmonický tok. Schopnosti přicházejí přirozeně, bez velké námahy.</li>
                <li><strong>Opozice (180°):</strong> Napětí, hledání rovnováhy mezi dvěma protichůdnými silami.</li>
                <li><strong>Kvadratura (90°):</strong> Třecí plocha, motivace přes frustraci. Nejsilnější motor osobního růstu.</li>
                <li><strong>Sextil (60°):</strong> Lehce harmonický, přináší příležitosti – ale je třeba z nich záměrně těžit.</li>
            </ul>
        `,
        related_slugs: ['nativni-karta', 'tranizty'],
        linked_blog_slug: 'tajemstvi-12-astrologickych-domu'
    },
    {
        slug: 'nativni-karta',
        title: 'Natální karta (Horoskop)',
        category: 'Astrologie',
        short_description: 'Mapa oblohy zachycená v okamžiku vašeho narození. Kompletní energetický otisk vaší duše, ukazující potenciály, výzvy i dary, se kterými jste přišli na svět.',
        content_html: `
            <p>Natální karta (nebo natální horoskop) je kruhový diagram zachycující přesné rozmístění Slunce, Měsíce a všech planet Sluneční soustavy ve chvíli, kdy jste se narodili. Každá planeta visí v určitém znamení (energie) a v konkrétním domě (sféra života) – a tyto kombinace spolu tvoří neopakovatelný kosmický otisk.</p>
            <p>Jde o nejpodrobnější astrlogický nástroj, jaký existuje. Zatímco populární „horoskop podle znamení" říká jen část pravdy (Sluneční znamení), natální karta pracuje s desítkami různých bodů a vztahů mezi nimi.</p>
            <h2>Co natální karta odhaluje?</h2>
            <ul>
                <li><strong>Životní poslání a výzvy</strong> (poloha Slunce a Saturnu)</li>
                <li><strong>Emoční a vztahový vzorec</strong> (Měsíc, Venuše, 7. dům)</li>
                <li><strong>Kariéra a veřejný obraz</strong> (10. dům, MC)</li>
                <li><strong>Karmická břemena z minulých životů</strong> (Dračí uzly, Chiron)</li>
                <li><strong>Talenty a skryté dary</strong> (Jupiter, 5. dům)</li>
            </ul>
        `,
        related_slugs: ['ascendent', 'aspekty'],
        linked_blog_slug: 'tajemstvi-12-astrologickych-domu'
    },
    {
        slug: 'saturnosky-navrat',
        title: 'Saturnský návrat',
        category: 'Astrologie',
        short_description: 'Okamžik, kdy Saturn ve svém 29letém cyklu dosáhne stejné pozice jako při vašem narození. Bývá nemilosrdnou zkouškou dospělosti.',
        content_html: `
            <p>Saturn obíhá Slunci přibližně 29,5 roku. Saturnský návrat nastane, když se vrátí na přesné místo, kde stál při vašem zrození – zpravidla okolo 28.–30. roku věku. A podruhé kolem 57.–60. roku.</p>
            <p>Lidé v astrologické komunitě říkají, že Saturnský návrat je <strong>"kosmická inventura"</strong>: co jste si postavili v životě, to se prověří. Co stojí na pevných základech, přežije a posílí. Co bylo stavěno ze strachu, ze socizálního tlaku nebo ze sebeklamání, se rozpadne.</p>
            <p>Typická témata: krize identity, změna kariéry, rozchod nebo sňatek, ztráta blízkého, stěhování. Saturnský návrat nebývá příjemný, ale je extrémně transformativní – a zpravidla vede k autentičtějšímu životu.</p>
        `,
        related_slugs: ['aspekty', 'nativni-karta'],
        linked_blog_slug: null
    },

    // ── TAROT ──────────────────────────────────────────────────────────────
    {
        slug: 'velka-arkana',
        title: 'Velká Arkána',
        category: 'Tarot',
        short_description: '22 hlavních karet tarotového balíčku zobrazující velké životní archetypy – od naivního Blázna přes Smrt až po osvícení Světa.',
        content_html: `
            <p>Standardní tarotový balík se skládá ze 78 karet rozdělených na Velkou Arkánu (22 karet) a Malou Arkánu (56 karet). <strong>Velká Arkána je srdcem celého systému</strong>. Každá z 22 karet reprezentuje jeden z archetypů kolektivního nevědomí lidstva.</p>
            <p>Archetypem rozumíme vzorce psychiky, které jsou společné všem lidem bez ohledu na kulturu a dobu. C. G. Jung tyto vzorce popsal jako usazeniny v hlubokém nevědomí – a tarotové karty jsou jejich vizuálním slovníkem.</p>
            <h2>Cesta Bláznova</h2>
            <p>22 karet Velké Arkány sleduje „Cestu Bláznova" – putování duše od nevědomé naivity (Blázen 0) přes setkání se silami světa (Moc, Spravedlnost, Smrt) až po absolutní integraci a osvícení (Svět XXI). Je to mytologická cestovní mapa lidského vývoje.</p>
        `,
        related_slugs: ['mala-arkana', 'tarot-blazen', 'spreads'],
        linked_blog_slug: 'lekce-padajici-veze-tarot'
    },
    {
        slug: 'mala-arkana',
        title: 'Malá Arkána',
        category: 'Tarot',
        short_description: '56 karet rozdělených do 4 suit (Hůlky, Meče, Číše, Pentakly). Odráží každodenní situace a konkrétní životní oblasti.',
        content_html: `
            <p>Malá Arkána se dělí na čtyři suity, z nichž každá obsahuje 14 karet (esa, číslované 2–10, a čtyři dvorní karty: Kluk, Rytíř, Královna, Král). Každá suita odpovídá jednomu ze čtyř elementů a jedné oblasti lidského prožívání.</p>
            <ul>
                <li><strong>Hůlky (Oheň):</strong> Vůle, kreativita, podnikání, vášeň, energie, inspirace.</li>
                <li><strong>Meče (Vzduch):</strong> Mysl, komunikace, konflikty, rozhodnutí, pravda.</li>
                <li><strong>Číše (Voda):</strong> Emoce, vztahy, intuice, sny, spiritualita.</li>
                <li><strong>Pentakly (Země):</strong> Hmota, peníze, práce, zdraví, stabilita.</li>
            </ul>
            <p>Zatímco Velká Arkána ukazuje velké životní arény a duchovní lekce, Malá Arkána se zaměřuje na konkrétní situace každodenního života – hádku s kolegou (Meče), pracovní nabídku (Pentakly) nebo začátek vztahu (Číše).</p>
        `,
        related_slugs: ['velka-arkana'],
        linked_blog_slug: null
    },
    {
        slug: 'tarot-blazen',
        title: 'Blázen (Tarot)',
        category: 'Tarot',
        short_description: 'Nultá karta Velké Arkány. Symbol neohroženého začátku, čisté naivity a odevzdání se vesmírné cestě bez záruky výsledku.',
        content_html: `
            <p>Blázen nese číslo 0 – číslo nekonečna, potenciálu a absolutního počátku. Stojí na okraji útesu s malým batohem na rameni a dívá se vstříc obloze. Nespočítával rizika, nečetl mapu, neptal se zkušených. Zkrátka vykročil.</p>
            <p>Ve výkladu karet Blázen téměř vždy signalizuje nový začátek. Výzvu, která vás volá, aniž byste tušili, kam povede. Nástup do neznáma s ryzí důvěrou. Prvotní zapálení pro projekt, vztah nebo cestu.</p>
            <blockquote>Nejlepšími kroky v životě jsou ty, které podnikáme ještě před tím, než „víme jak na to".</blockquote>
            <p><strong>Blázen obrácený</strong> naopak varuje před lehkomyslností přecházející v hazardérství, nebo před strachem vykročit, který nás drží zahnízděné v komfortní zóně.</p>
        `,
        related_slugs: ['velka-arkana'],
        linked_blog_slug: 'lekce-padajici-veze-tarot'
    },

    // ── NUMEROLOGIE ─────────────────────────────────────────────────────────
    {
        slug: 'zivotni-cislo',
        title: 'Životní číslo',
        category: 'Numerologie',
        short_description: 'Nejzákladnější numerologický ukazatel. Získáte ho redukcí data narození na jednu číslici (1–9, výjimky 11, 22, 33). Odráží vaši životní cestu.',
        content_html: `
            <p>Životní číslo (nebo „číslo životní cesty") je alfou numerologického systému. Získáte ho tak, že sečtete všechny číslice svého data narození a výsledek opakovaně redukujete, až dorazíte k jediné číslici – nebo k tzv. Mistrovskému číslu (11, 22 nebo 33).</p>
            <h2>Příklad výpočtu</h2>
            <p>Datum: 15. 8. 1992 → 1+5 = 6 (den) + 8 (měsíc) + 1+9+9+2 = 21 → 2+1 = 3 (rok) → 6+8+3 = 17 → 1+7 = <strong>8</strong></p>
            <p>Životní číslo 8 nese energii moci, hojnosti, karmické vyrovnanosti a zodpovědnosti za materiální svět.</p>
            <p>Životní číslo není rozsudek. Je to <em>vibrace</em>, se kterou jste přišli – paleta barev, se kterou malujete svůj obraz. Naplnění tohoto čísla (a nikoliv jeho negace nebo přehánění) je cílem numerologické cesty.</p>
        `,
        related_slugs: ['mistrovska-cisla'],
        linked_blog_slug: 'zivotni-cislo-odhaleni-kodu-vasi-duse'
    },
    {
        slug: 'mistrovska-cisla',
        title: 'Mistrovská čísla (11, 22, 33)',
        category: 'Numerologie',
        short_description: 'Čísla s dvojitou silou, která se při numerologické redukci neredukují dál. Nositelé nesou výjimečný potenciál, ale i těžší životní lekce.',
        content_html: `
            <p>Tři výjimky z pravidla numerologické redukce jsou čísla 11, 22 a 33 – tzv. <strong>Mistrovská čísla</strong>. Pokud vám předposlední součet dá právě jedno z těchto čísel, neredukujete je na 2, 4 nebo 6.</p>
            <ul>
                <li><strong>11 – Vizionář:</strong> Intuice a duchovní vnímání za hranicí běžného chápání. Slouží jako most mezi vyšší pravdou a lidstvem. Hluboce empatiký, snadno přetížitelný emocemi okolí.</li>
                <li><strong>22 – Mistr Stavitel:</strong> Schopnost přetavit velké vize do reálných struktur, které mění životy tisíců lidí. Obrovská zodpovědnost a riziko přetíženosti.</li>
                <li><strong>33 – Mistr Učitel:</strong> Nejřidší a nejnáročnější vibrace. Obětavost, soucit a léčení v globálním měřítku. Pokud nositel toto číslo nenaplňuje, žije redukovanou trojkou.</li>
            </ul>
        `,
        related_slugs: ['zivotni-cislo'],
        linked_blog_slug: 'zivotni-cislo-odhaleni-kodu-vasi-duse'
    },

    // ── KARMA & SPIRITUALITA ─────────────────────────────────────────────────
    {
        slug: 'karma',
        title: 'Karma',
        category: 'Spiritualita',
        short_description: 'Zákon příčiny a následku přesahující hranice jednoho života. Vše, co vysíláme (myšlenky, slova, činy), se k nám vrátí – v tomto nebo budoucím životě.',
        content_html: `
            <p>Slovo karma pochází ze sanskrtu a znamená prostě „čin" nebo „jednání". V rámci hinduistické a buddhistické filosofie ale nese mnohem hlubší smysl: je to zákon přesné příčiny a následku, který přesahuje hranice jednoho pozemského života.</p>
            <p>Karma neznamená trest nebo odplatu. Je to <strong>energetická rovnováha</strong>. Každá naše akce vytváří vlnění, které musí dojít ke svému přirozenému závěru – ať v tomto nebo v některém z budoucích životů.</p>
            <h2>Pozitivní karma vs. Karmanická dluh</h2>
            <p>Pozitivní karma (dárcovství, soucit, pravdivost) vysvětluje, proč se jedni lidé rodí do příznivých podmínek zdánlivě bez námahy. Karmický dluh naopak vysvětluje, proč jiní lidi opakovaně narážejí na stejný typ bolesti – mají nevyrovnanou emisi energie z minulých životů.</p>
            <p>Astrologie umisťuje karmické informace do polohy Severního a Jižního dračího uzlu v Natální mapě.</p>
        `,
        related_slugs: ['reinkarnace', 'draci-uzly'],
        linked_blog_slug: 'iluze-spriznene-duse-karmicke-vztahy'
    },
    {
        slug: 'reinkarnace',
        title: 'Reinkarnace',
        category: 'Spiritualita',
        short_description: 'Víra v opakované zrození duše v novém těle. Každý život přináší specifické lekce a příležitosti k duchovnímu růstu.',
        content_html: `
            <p>Reinkarnace (z latiny „vtělení znovu do masa") je přesvědčení, že duše přežívá smrt fyzického těla a rodí se v novém. Tato idea je jádrem hinduismu, buddhismu, džinismu i mnoha dalších duchovních tradic světa.</p>
            <p>Z pohledu reinkarnace je každý pozemský život jako jedna třída ve velké škole. Přicházíme s konkrétním učebním plánem (kartou), s karmickými dluhy z minulých lekcí i s dary, které jsme si přinesli ze zkušeností předchozích vtělení.</p>
            <h2>Reinkarnace a astrologie</h2>
            <p>Karmičtí astrologové věří, že poloha Dračích uzlů v Natální mapě odráží orientaci celého vtělení: <strong>Jižní uzel</strong> ukazuje, co jsme zvládli v minulých životech (přirozené talenty, ale i tendence k regresi), zatímco <strong>Severní uzel</strong> ukazuje směr, kam nás toto vtělení volá – naší životní výzvu a duchovní cíl.</p>
        `,
        related_slugs: ['karma', 'draci-uzly'],
        linked_blog_slug: null
    },
    {
        slug: 'draci-uzly',
        title: 'Dračí uzly (Severní a Jižní)',
        category: 'Astrologie',
        short_description: 'Dva matematické body (ne planety) v Natální mapě. Jižní uzel = karmická minulost a vrozené způsoby reakcí. Severní uzel = duchovní výzva tohoto vtělení.',
        content_html: `
            <p>Dračí uzly nejsou planety, ale matematické body: průsečíky dráhy Měsíce s ekliptikou (dráhou Slunce). Vždy stojí přesně naproti sobě v kruhu Natální mapy.</p>
            <ul>
                <li><strong>Jižní uzel (Ocas Draka):</strong> Označuje to, co je vám přirozené – protože jste to již prožívali. Minulé životy, vrozené reflexy, komfortní zóna duše. Pobývat neustále u Jižního uzlu znamená stagnaci.</li>
                <li><strong>Severní uzel (Hlava Draka):</strong> Směr duchovního růstu pro toto vtělení. Věci, které vám zpočátku nepřijdou přirozené, ale přinášejí největší naplnění, jakmile na jejich cestě vytrváte.</li>
            </ul>
            <p>Planetární tranzity přes Dračí uzly (zejména zatmění) bývají přelomovými životními událostmi – obratovými body, které nás buď silou okolností, nebo skrze magickou synchronicitu, tlačí ke Světelné straně Severního uzlu.</p>
        `,
        related_slugs: ['karma', 'reinkarnace', 'nativni-karta'],
        linked_blog_slug: 'iluze-spriznene-duse-karmicke-vztahy'
    },

    // ── VĚŠTĚNÍ ─────────────────────────────────────────────────────────────
    {
        slug: 'synchronicita',
        title: 'Synchronicita',
        category: 'Spiritualita',
        short_description: 'Pojem zavedený C. G. Jungem pro „smysluplné náhody" – kdy vnější události a vnitřní stavy spolu zdánlivě nesouvisí, ale přesto tvoří soudržný celek.',
        content_html: `
            <p>Psycholog Carl Gustav Jung zavedl pojem <em>synchronicita</em> jako alternativu k mechanistickému pohledu na kauzalitu. Jde o princip, kdy dvě nebo více událostí nemají kauzální (příčinný) vztah, ale jsou propojeny <strong>smysluplností</strong>.</p>
            <p>Klasický příklad: myslíte intenzivně na starého přítele, se kterým jste se léta neviděli, a ten vám v ten samý okamžik napíše. Vědecký materialismus to pojmenuje jako statistickou shodu. Jung řekl: vesmír vám posílá zprávu.</p>
            <p>Synchronicita je fundamentálním mechanismem fungování věšteckých systémů – Tarotu, Rún, Numerologie i věštění z křišťálové koule. Věština nefunguje proto, že „čte budoucnost". Funguje proto, že naše podvědomí rezonuje s tím, co v daný moment potřebuje vidět – a náhoda výběru karet, rún nebo čísel tuto synchronicitu zprostředkuje.</p>
        `,
        related_slugs: ['akasicke-zaznamy'],
        linked_blog_slug: 'andelska-cisla-1111'
    },
    {
        slug: 'akasicke-zaznamy',
        title: 'Akášické záznamy',
        category: 'Spiritualita',
        short_description: 'Ezoterický pojem pro „kosmickou paměť" – nefyzickou databázi všech myšlenek, slov, činů a událostí, jaké se kdy odehrály ve vesmíru.',
        content_html: `
            <p>Slovo <em>Akáša</em> pochází ze sanskrtu a označuje „éter" nebo „prostor". Akášické záznamy jsou podle ezoteriků součástí tohoto éterického prostoru – obrovský, nefyzický archiv veškerých informací o všem, co kdy existovalo nebo existuje.</p>
            <p>Alice Bailey, Helena Blavatská a Edgar Cayce (slavný americký medium 20. století) popsali Akášické záznamy jako živou knihovnu přesně dostupnou těm, kteří dokáží rozšířit vědomí za hranice běžné racionální percepce.</p>
            <h2>Přístup k Akášickým záznamům</h2>
            <p>Meditace, práce se sny, hypnotická regrese do minulých životů, hluboký scrying nebo channeling jsou techniky, skrze které zkušení adepti tvrdí, že k těmto záznamům přistupují. Z nich pak čerpají informace o minulých životech, karmických vazbách nebo budoucích pravděpodobnostech.</p>
        `,
        related_slugs: ['synchronicita', 'reinkarnace'],
        linked_blog_slug: 'tajemstvi-kristalove-koule-scrying'
    },

    // ── RUNY ────────────────────────────────────────────────────────────────
    {
        slug: 'fehu',
        title: 'Fehu (Runa)',
        category: 'Runosloví',
        short_description: 'První runa staršího Futharku. Symbolizuje dobytek, majetek a pohybující se bohatství. Energie plodnosti, hojnosti a sílu manifestace.',
        content_html: `
            <p>Fehu (výslovnost „fe-hu") je první z 24 run staršího Futharku. Vizuálně připomíná písmeno F s oběma větvemi skloněnými doprava – evokuje rohy dobytka, který v germánské kultuře představoval pohyblivé, živé bohatství.</p>
            <p>Na rozdíl od pevného majetku (pole, dům) je Fehu energií peněz, které cirkulují, rostou a plodí další plodnost. To je klíčový rozdíl – Fehu není o hromadění, ale o zdravém toku hojnosti.</p>
            <h2>Ve výkladu</h2>
            <p>Fehu vzpřímená: Čas sklizně. Příchod financí, úspěšný projekt, plodná práce přináší výsledky. Dobré znamení pro zahájení podnikání nebo investice.</p>
            <p>Fehu obrácená: Ztráta, plýtvání, chamtivost vedoucí k úpadku. Výzva k přehodnocení vztahu k penězům a hojnosti.</p>
        `,
        related_slugs: ['hagalaz', 'tiwaz'],
        linked_blog_slug: 'runy-severska-magie-v-modernim-svete'
    },
    {
        slug: 'hagalaz',
        title: 'Hagalaz (Runa)',
        category: 'Runosloví',
        short_description: 'Devátá runa – runa krupobití, chaosu a náhlé destrukce. Přichází nevyzvaná a bez ohledu na vaše plány. Je zároveň zárodkem budoucí transformace.',
        content_html: `
            <p>Hagalaz je deváto runa Futharku a jedinou, která nemá obrácenou polohu (je symetrická). Symbolizuje krupobití – zuřivou sílu přírody, která nelze kontrolovat, vyjednávat s ní ani ji odvrátit. Prostě přijde.</p>
            <p>V kontextu věštby přináší Hagalaz zprávu o nadcházejícím (nebo probíhajícím) rušivém průlomu: neočekávané změně, krizi nebo šoku, který rozbíjí zavedené pořádky. Není to „trest" – je to nutnost, která přichází v momentech, kdy se zbytečně upínáme na zastaralé struktury.</p>
            <blockquote>Za každou bouří přichází úleva a prostor pro nové setí. Hagalaz ničí to, co by nás stejně dříve nebo později udusilo.</blockquote>
            <p>Pracovat s Hegalaz znamená naučit se uvolnit kontrolu a důvěřovat transformačnímu procesu – i když je bolestivý.</p>
        `,
        related_slugs: ['fehu', 'tiwaz'],
        linked_blog_slug: 'runy-severska-magie-v-modernim-svete'
    },
    {
        slug: 'tiwaz',
        title: 'Tiwaz (Runa)',
        category: 'Runosloví',
        short_description: 'Runa boha Týra, spravedlnosti a mužské oběti. Šipka ukazující vskyř – symbol nezlomné vůle a ochoty obětovat osobní zisk pro vyšší dobro.',
        content_html: `
            <p>Tiwaz je runou boha Týra (anglosaské Tiw nebo Tiu – po něm pojmenované úterý, Tuesday). Týr byl severskym bohem spravedlnosti a zákona. Podle ságy obětoval vlastní pravou ruku, aby stvůra Fenrir neohrožovala svět – a přijal tuto ztrátu s naprostou odvahou a klidem.</p>
            <p>Tiwaz ve výkladu proto hovoří o odvaze dělat správnou věc i za cenu osobní oběti. O schopnosti upřednostnit čestnost a integritu před pohodlím nebo ziskem. Bývá runovou patronkou vojáků, soudců a všech, kdo nesou tíhu obtížných rozhodnutí.</p>
            <p><strong>Tiwaz ve věštbě:</strong> Čas soustředěného odhodlání. Výzva k čestnosti, disciplíně a plnění závazků bez výmluv. Hledáte-li spravedlnost, Tiwaz vám fandí.</p>
        `,
        related_slugs: ['fehu', 'hagalaz'],
        linked_blog_slug: 'runy-severska-magie-v-modernim-svete'
    },

    // ── ČAKRY ───────────────────────────────────────────────────────────────
    {
        slug: 'muladhara',
        title: 'Muladhara – Kořenová čakra',
        category: 'Energie',
        short_description: 'První čakra sídlící u kostrče. Vládne bezpečí, přežití a fyzickému uzemění. Asociována s červenou barvou a elementem Země.',
        content_html: `
            <p>Muladhara je první ze sedmi hlavních čaker – energetický základ celého systému. Slovo pochází ze sanskrtu: <em>mula</em> = kořen, <em>adhara</em> = podpora, základ. Je to místo, odkud vyrůstáme jako stromy – bez pevných kořenů nelze zdravě vzrůst do výše.</p>
            <p>Governs: fyzická bezpečnost, bydlení, peníze, přežití, zdraví těla, pocit sounáležitosti k rodině a kmenu. Zdravá Muladhara se projevuje jako fundamentální pocit „jsem v pořádku, o mě bude postaráno".</p>
            <h2>Jak Muladharu uvolnit</h2>
            <ul>
                <li>Chůze naboso po přírodě (doslova uzemnění)</li>
                <li>Fyzická práce s tělem (jóga, silový trénink, zahradničení)</li>
                <li>Červené potraviny a minerály (granát, červený jaspis)</li>
                <li>Mantramé opakování: <em>„Jsem uzemen. Jsem v bezpečí."</em></li>
            </ul>
        `,
        related_slugs: ['svadhisthana', 'anahata'],
        linked_blog_slug: 'zaklady-sedmi-caker-anatomie'
    },
    {
        slug: 'svadhisthana',
        title: 'Svadhisthana – Sakrální čakra',
        category: 'Energie',
        short_description: 'Druhá čakra, sídlící pod pupíkem. Centrum smyslnosti, kreativity, radosti a emocí. Asociována s oranžovou barvou a elementem Vody.',
        content_html: `
            <p>Svadhisthana, druhá čakra, leží asi 5 cm pod pupíkem. Její element je Voda – a stejně jako voda, tato čakra touží po volném toku, fluiditě a pohybu. Blokovaná Svadhisthana ucpané emoce, tvůrčí blok nebo neschopnost si dovolit radost.</p>
            <p>Zdravá sakrální čakra se projevuje jako přirozená chuť do tvoření: malovat, psát, tancovat, vařit, milovat. Je také zdrojem emočního bohatství – schopnosti cítit radost, smutek, vášeň a touhu bez studu nebo přepínání.</p>
        `,
        related_slugs: ['muladhara', 'anahata'],
        linked_blog_slug: 'zaklady-sedmi-caker-anatomie'
    },
    {
        slug: 'anahata',
        title: 'Anahata – Srdeční čakra',
        category: 'Energie',
        short_description: 'Čtvrtá čakra, most mezi nižšími a vyššími energiemi. Centrum lásky, soucitu, léčení a schopnosti otevřít se druhým lidem. Barva: zelená / růžová.',
        content_html: `
            <p>Anahata stojí přesně uprostřed sedmičkového systému – je to most. Propojuje tři nižší čakry (zemité, přežívající, tvořivé) se třemi vyššími (komunikační, intuitivní, duchovní). Bezhybnost srdce paralyzuje celý systém v obou směrech.</p>
            <p>Anahata vládne nejen romantické lásce, ale především <strong>nepodmínečnému přijetí</strong> – sebe sama i ostatních. Lidé se zdravou Anahata dokáží odpustit bez vymazání hranic, pomoci bez sebezničení a milovat bez posedlosti.</p>
            <p>Léčení Anahata: různé formy laskavosti (i k sobě), práce s rodovými traumaty, meditace na zelené světlo, objetí, příroda, hugging (fyzický kontakt), práce s dýcháním.</p>
        `,
        related_slugs: ['muladhara', 'svadhisthana'],
        linked_blog_slug: 'zaklady-sedmi-caker-anatomie'
    },

    // ── SEN ─────────────────────────────────────────────────────────────────
    {
        slug: 'lucidni-sen',
        title: 'Lucidní sen',
        category: 'Snář',
        short_description: 'Stav, kdy si ve snu uvědomujete, že sníte, a dokážete záměrně ovlivňovat obsah snu. Starověká praxe i moderní vědecky ověřitelný fenomén.',
        content_html: `
            <p>Lucidní sen je stav vědomí, kdy spíte, ale vaše mysl je vědomá faktum, že se nacházíte ve snu – a dokáže s tímto prostorem záměrně interagovat. Letěli jste ve snu? Mluvili s mrtvým příbuzným? Prozkoumali neexistující město? To byly pravděpodobně záblesky lucidity.</p>
            <p>Výzkumy z 80. let (Stephen LaBerge, Stanford) prokázaly, že lucidní sny jsou reálný, měřitelný neurologický stav – snívač a výzkumník se dohodli na signálním pohybu očí, který snívač provedl zevnitř snu, a přístroje to zaznamenaly.</p>
            <h2>Jak luciditu natrénovat</h2>
            <ul>
                <li><strong>Deník snů:</strong> Zapisovat sny ráno ihned po probuzení. Mozek si na udržení snové paměti „zvykne".</li>
                <li><strong>Realitní testy:</strong> Přes den si opakovaně klást otázku „Sním právě teď?" a provést test (narušená fyzika snu vs. bdění). Zvyk se přenese do snu.</li>
                <li><strong>MILD technika:</strong> Před usnutím opakovat záměr „Uvědomím si, že sním" a vizualizovat probuzení vědomí ve snu.</li>
            </ul>
        `,
        related_slugs: [],
        linked_blog_slug: 'psychologie-snu-stici-stromy'
    },

    // ── ANDĚLÉ & NUMEROLOGIE ─────────────────────────────────────────────────
    {
        slug: 'andelska-cisla',
        title: 'Andělská čísla',
        category: 'Numerologie',
        short_description: 'Opakující se číselné posloupnosti (111, 222, 333...) interpretované jako poselství z vyšších vědomí nebo duchovních průvodců.',
        content_html: `
            <p>Andělská čísla jsou číselné sekvence, které se s neobvyklou frekvencí opakují v každodenním životě: čas na hodinkách, číslo domu, účet v restauraci. Esoterika je interpretuje jako záměrnou komunikaci duchovních průvodců nebo vyšší dimenze.</p>
            <p>Základní interpretační rámec vychází z numerologie: každé číslo nese vibraci a trojité (nebo čtyřné) opakování tuto vibraci zesiluje na úroveň nevyhnutelné zprávy.</p>
            <ul>
                <li><strong>111:</strong> Okamžik silné tvorby. Vaše myšlenky se zhmotňují – myslete záměrně.</li>
                <li><strong>222:</strong> Přijde čas. Trpělivost, semínko teprve klíčí.</li>
                <li><strong>333:</strong> Jste obklopeni ochranou. Mistrové vás provází.</li>
                <li><strong>444:</strong> Pevná půda, anděl za každým rohem. Jste v bezpečí.</li>
                <li><strong>555:</strong> Masivní změna na obzoru.</li>
                <li><strong>777:</strong> Duchovní zarovnání. Jdete správnou cestou.</li>
                <li><strong>888:</strong> Finanční hojnost, karma se vrací k dobru.</li>
                <li><strong>999:</strong> Uzavření cyklu. Konec jedné éry.</li>
            </ul>
        `,
        related_slugs: ['synchronicita', 'zivotni-cislo'],
        linked_blog_slug: 'andelska-cisla-1111'
    }
];

export default DICTIONARY_TERMS;
