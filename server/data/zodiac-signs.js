const ZODIAC_SIGNS = [
    {
        slug: 'beran',
        name: 'Beran',
        en: 'Aries',
        emoji: '♈',
        symbol: 'Beran',
        element: 'Oheň',
        ruling_planet: 'Mars',
        dates: '21. března – 19. dubna',
        modality: 'Kardinální',
        color: '#e74c3c',
        lucky_numbers: [1, 9, 19, 28],
        strengths: ['Odvaha', 'Průkopnický duch', 'Energie', 'Přímočarost', 'Nadšení'],
        weaknesses: ['Impulzivita', 'Netrpělivost', 'Sobeckost', 'Krátkozrakost'],
        description: `
            <p>Beran otevírá astrologický rok. Ve chvíli, kdy Slunce vstupuje do Berana (jarní rovnodennost), celá příroda se probouzí po zimním spánku – a tato energie probuzení, prvního impulzu a neustrašeného vykročení je samotnou podstatou prvního znamení zvěrokruhu.</p>
            <p>Lidé narozeni ve znamení Berana jsou přirozenými průkopníky. Tam, kde ostatní přemýšlejí, Beran jedná. Tam, kde ostatní váhají, Beran vykračuje. Tato schopnost jednat bez analýzy je jejich největší silou – a zároveň Achillovou patou. Impulzivita, která nespočítá následky, může přivést Berana do zbytečných konfliktů nebo zpackaných začátků.</p>
            <p>Vládcem Berana je Mars – planeta akce, odvahy a vůle. Berani mají přirozenou soutěživost a silnou potřebu být první, nejlepší, nejrychlejší. Nejlépe prosperují v prostředích, kde mohou vést, iniciovat a dobývat nová území.</p>
            <h2>Beran ve vztazích</h2>
            <p>V lásce jsou Berani vášniví a přímí – žádná plaše zaslaná SMS, ale osobní, statečné vyznání. Potřebují partnera, který je přiměřeně rovnocenný a dokáže postavit se jim na odpor bez zbytečných her. Beran se nudí v příliš pasivních vztazích a potřebuje udržovat elán dobývání.</p>
        `,
        compatible_signs: ['Lev', 'Střelec', 'Blíženci', 'Vodnář'],
        featured_tool: { label: 'Zjistit kompatibilitu s Beranem', link: '../partnerska-shoda.html' },
        natal_cta: { label: 'Vygenerovat Natální kartu', link: '../natalni-karta.html' }
    },
    {
        slug: 'byk',
        name: 'Býk',
        en: 'Taurus',
        emoji: '♉',
        symbol: 'Býk',
        element: 'Země',
        ruling_planet: 'Venuše',
        dates: '20. dubna – 20. května',
        modality: 'Fixní',
        color: '#27ae60',
        lucky_numbers: [2, 6, 9, 12, 24],
        strengths: ['Spolehlivost', 'Trpělivost', 'Smyslovost', 'Vytrvalost', 'Praktičnost'],
        weaknesses: ['Tvrdohlavost', 'Materialismus', 'Lenost', 'Odpor ke změně'],
        description: `
            <p>Býk je druhé znamení zvěrokruhu, pevně ukotvené v elementu Země. Po energetickém výbuchu Berana přichází Býk zpomalit, zakořenit a vychutnat. Toto znamení vládne světu smyslů, fyzické krásy, trvalé hodnoty a pozemských potěšení.</p>
            <p>Vládkyní Býka je Venuše – planeta krásy, luxusu, harmonie a lásky. Býci jsou přirozeně přitahováni vším, co je esteticky hodnotné: dobrým jídlem, krásnou hudbou, kvalitním oblečením, přírodou. Dokáží být nesmírně štědří k těm, které milují.</p>
            <p>Fixní modalita Býka způsobuje jeho pověstnou tvrdohlavost. Co si Býk jednou rozhodne, to drží s neuvěřitelnou zarputilostí. Tato vlastnost je při budování dlouhodobých cílů neocenitelná – ale v interpersonálních konfliktech může vést k eskalaci, protože Býk neustupuje snadno.</p>
            <h2>Býk ve vztazích</h2>
            <p>Jsou věrnými a loajálními partnery. Láska Býka není vyjadřována grandiózními gesty, ale každodenní péčí, fyzickou přítomností a stabilitou. Potřebují romantiku s hloubkou – vztah, kde lze plánovat budoucnost.</p>
        `,
        compatible_signs: ['Panna', 'Kozoroh', 'Rak', 'Ryby'],
        featured_tool: { label: 'Partnerská shoda s Býkem', link: '../partnerska-shoda.html' },
        natal_cta: { label: 'Vygenerovat Natální kartu', link: '../natalni-karta.html' }
    },
    {
        slug: 'blizenci',
        name: 'Blíženci',
        en: 'Gemini',
        emoji: '♊',
        symbol: 'Blíženci',
        element: 'Vzduch',
        ruling_planet: 'Merkur',
        dates: '21. května – 20. června',
        modality: 'Mutabilní',
        color: '#f39c12',
        lucky_numbers: [3, 8, 12, 23],
        strengths: ['Inteligence', 'Adaptabilita', 'Komunikace', 'Vtip', 'Zvídavost'],
        weaknesses: ['Nerozhodnost', 'Povrchnost', 'Nestálost', 'Nervozita'],
        description: `
            <p>Blíženci jsou intelektuálem a komunikátorem zvěrokruhu. Vládne jim Merkur – planeta mysli, řeči a výměny informací. Blíženecké myšlení pracuje rychlostí kulometu, vidí všechny strany každé otázky najednou a miluje různorodost nad opakováním.</p>
            <p>Symbol Dvojčat je přesný: Blíženci nosí uvnitř sebe dualitu. Mohou být v jeden moment hluboce analytičtí a v druhý hraví a lehkovážní. Tato dvojakost je není pokrytectvím – je to přirozená šíře jejich charakteru.</p>
            <p>Blíženci jsou mistry konverzace. Dokáží se bavit s absolutně kýmkoli, rychle vstřebávají nové informace a milují sdílení nápadů. Jejich největší výzvou je dokončování věcí – rozptyl zájmů a nástupů nových impulzů vede k tomu, že zanechávají za sebou nedokončené projekty.</p>
        `,
        compatible_signs: ['Vodnář', 'Váhy', 'Beran', 'Lev'],
        featured_tool: { label: 'Partnerská shoda s Blíženci', link: '../partnerska-shoda.html' },
        natal_cta: { label: 'Vygenerovat Natální kartu', link: '../natalni-karta.html' }
    },
    {
        slug: 'rak',
        name: 'Rak',
        en: 'Cancer',
        emoji: '♋',
        symbol: 'Rak',
        element: 'Voda',
        ruling_planet: 'Měsíc',
        dates: '21. června – 22. července',
        modality: 'Kardinální',
        color: '#95a5a6',
        lucky_numbers: [2, 3, 15, 20],
        strengths: ['Empatie', 'Intuice', 'Loajalita', 'Pečující povaha', 'Hluboké emoce'],
        weaknesses: ['Přecitlivělost', 'Nálady', 'Uzavřenost', 'Lpění na minulosti'],
        description: `
            <p>Rak je prvním vodním znamením zvěrokruhu a jeho vládcem je Měsíc – nebeské těleso emocí, intuice, vzpomínek a cyklů. Lidé narozeni ve znamení Raka jsou hluboce vnitřní bytosti se silnou potřebou emocionálního bezpečí a domova.</p>
            <p>Symbolu Raka, tedy korýše v pevném krunýři, nejde minout: Rak vypadá na povrchu tvrdě a uzavřeně, ale uvnitř krunýře bije jedno z nejcitlivějších srdcí celého zvěrokruhu. Jakmile si Rak buduje důvěru s člověkem, otevírá se s nesmírnou hloubkou a loajalitou.</p>
            <p>Rak je archetypem Rodičovské Pečující energie. Přirozeně vyživují, chrání a starají se – o rodinu, o přátele, o každého, koho přijmou pod svůj ochranný krunýř. Jejich domov je pro ně posvátným místem.</p>
        `,
        compatible_signs: ['Štír', 'Ryby', 'Býk', 'Panna'],
        featured_tool: { label: 'Partnerská shoda s Rakem', link: '../partnerska-shoda.html' },
        natal_cta: { label: 'Vygenerovat Natální kartu', link: '../natalni-karta.html' }
    },
    {
        slug: 'lev',
        name: 'Lev',
        en: 'Leo',
        emoji: '♌',
        symbol: 'Lev',
        element: 'Oheň',
        ruling_planet: 'Slunce',
        dates: '23. července – 22. srpna',
        modality: 'Fixní',
        color: '#e67e22',
        lucky_numbers: [1, 3, 10, 19],
        strengths: ['Charisma', 'Velkorysost', 'Kreativita', 'Sebevědomí', 'Vůdcovství'],
        weaknesses: ['Arrogance', 'Domýšlivost', 'Fixní ego', 'Potřeba pozornosti'],
        description: `
            <p>Lev je jediné znamení ovládané přímo Sluncem – a tato asociace říká vše. Stejně jako Slunce je středem naší sluneční soustavy, Lev přirozeně gravituje do středu pozornosti. Přináší světlo, teplo a živost do každé místnosti, do které vstoupí.</p>
            <p>Lvi jsou bytostní tvůrci a performeři. Mají vrozený smysl pro dramatičnost a prezentaci. Rádi se oblékají, rádi vystupují, rádi jsou obdivováni. A v tomto není nic povrchního – jejich touha po uznání pramení z upřímné potřeby vyjadřovat svůj vnitřní plamen.</p>
            <p>Jsou to nesmírně velkorysí lidé. Lev, který vás miluje, vás zahrnuje dary, časem a pozorností. Jejich loajalita je absolutní – ale na oplátku potřebují věrnost, obdiv a uznání.</p>
        `,
        compatible_signs: ['Beran', 'Střelec', 'Blíženci', 'Váhy'],
        featured_tool: { label: 'Partnerská shoda se Lvem', link: '../partnerska-shoda.html' },
        natal_cta: { label: 'Vygenerovat Natální kartu', link: '../natalni-karta.html' }
    },
    {
        slug: 'panna',
        name: 'Panna',
        en: 'Virgo',
        emoji: '♍',
        symbol: 'Panna',
        element: 'Země',
        ruling_planet: 'Merkur',
        dates: '23. srpna – 22. září',
        modality: 'Mutabilní',
        color: '#8e44ad',
        lucky_numbers: [5, 14, 15, 23, 32],
        strengths: ['Analytičnost', 'Preciznost', 'Spolehlivost', 'Skromnost', 'Pracovitost'],
        weaknesses: ['Kritičnost', 'Perfekcionismus', 'Přílišná sebekritika', 'Úzkostnost'],
        description: `
            <p>Panna je druhé Merkurem ovládané znamení, ale zásadně jiné od Blíženců. Kde Blíženci sbírají informace napříč tématy, Panna je hloubí, třídí a analyzuje s precizností chirurga. Pracuje v elementu Země – to znamená, že její analytická mysl je vždy zakotvená v praktické realitě.</p>
            <p>Panny jsou mistryně detailu. Vidí chyby, nekonzistence a nedostatky tam, kde ostatní nic nepostřehnou. Tato schopnost z nich dělá vynikající pracovníky v oborech jako medicína, věda, redakce, právo nebo data. Jejich výzvou je naučit se tuto pozorovatelnost neobrátit destruktivně na sebe i na ostatní.</p>
            <p>Perfekcionismus Panny je dvojsečná zbraň. Přináší vynikající výsledky, ale také chronickou nespokojenost – pocit, že nic není nikdy dost dobré. Duchovní lekcí Panny je přijmout nedokonalost jako součást krásy.</p>
        `,
        compatible_signs: ['Kozoroh', 'Býk', 'Rak', 'Štír'],
        featured_tool: { label: 'Partnerská shoda s Pannou', link: '../partnerska-shoda.html' },
        natal_cta: { label: 'Vygenerovat Natální kartu', link: '../natalni-karta.html' }
    },
    {
        slug: 'vahy',
        name: 'Váhy',
        en: 'Libra',
        emoji: '♎',
        symbol: 'Váhy',
        element: 'Vzduch',
        ruling_planet: 'Venuše',
        dates: '23. září – 22. října',
        modality: 'Kardinální',
        color: '#3498db',
        lucky_numbers: [4, 6, 13, 15, 24],
        strengths: ['Diplomatičnost', 'Spravedlivost', 'Sociálnost', 'Estetický vkus', 'Empatie'],
        weaknesses: ['Nerozhodnost', 'Vyhýbání se konfliktu', 'Povrchnost', 'Závislost na druhých'],
        description: `
            <p>Váhy jsou jediným neživým symbolem zvěrokruhu – a přesto (nebo právě proto) reprezentují jeden z nejlidštějších archetypů: hledání rovnováhy, harmonie a spravedlnosti. Vládne jim Venuše, která v Vahách projevuje svou intelektuálnější stránku.</p>
            <p>Váhy žijí pro vztahy. Nejsou šťastné samy – potřebují druhého člověka jako zrcadlo i jako prostor pro výměnu. Jsou to mistři diplomacie a umí se pohybovat v sociálním prostoru s neobyčejnou elegancí a taktem.</p>
            <p>Jejich největší výzva je rozhodování. Protože přirozeně vidí všechny strany každé situace, rozhodnutí pro ně bývá agonií nekonečného zvažování. Duchovní lekcí Vah je pochopit, že perfektní rozhodnutí neexistuje – a odhodlat se i přes nejistotu.</p>
        `,
        compatible_signs: ['Blíženci', 'Vodnář', 'Lev', 'Střelec'],
        featured_tool: { label: 'Partnerská shoda s Vahami', link: '../partnerska-shoda.html' },
        natal_cta: { label: 'Vygenerovat Natální kartu', link: '../natalni-karta.html' }
    },
    {
        slug: 'stir',
        name: 'Štír',
        en: 'Scorpio',
        emoji: '♏',
        symbol: 'Štír',
        element: 'Voda',
        ruling_planet: 'Pluto / Mars',
        dates: '23. října – 21. listopadu',
        modality: 'Fixní',
        color: '#c0392b',
        lucky_numbers: [8, 11, 18, 22],
        strengths: ['Hloubka', 'Intenzita', 'Odhodlání', 'Transformační síla', 'Intuice'],
        weaknesses: ['Žárlivost', 'Manipulace', 'Mstivost', 'Uzavřenost', 'Posedlost'],
        description: `
            <p>Štír je nejintenzivnějším a nejkomplexnějším znamením zvěrokruhu. Vládnou mu dvě planety: původní Mars (odvaha, energie, sexualita) a Pluto (smrt, znovuzrození, transformace, moc). Tato kombinace dává Štírům přítomnost, která je cítit, i když mlčí.</p>
            <p>Štíři žijí v hlubinách – psychologických, emočních i spirituálních. Povrchní konverzace je v agonii. Potřebují pravdu, celou pravdu a nic než pravdu. A za tu samou pravdivost odměňují absolutní loajalitou.</p>
            <p>Jejich archetypem je Fénix – mýtický pták, který se opakovaně rodí z vlastního popela. Štíři prochází v životě hlubokými transformacemi, z nichž vycházejí silnější. Naučili se ztrátu, zradu, devastaci – a přežili.</p>
        `,
        compatible_signs: ['Rak', 'Ryby', 'Kozoroh', 'Panna'],
        featured_tool: { label: 'Partnerská shoda se Štírem', link: '../partnerska-shoda.html' },
        natal_cta: { label: 'Vygenerovat Natální kartu', link: '../natalni-karta.html' }
    },
    {
        slug: 'strelec',
        name: 'Střelec',
        en: 'Sagittarius',
        emoji: '♐',
        symbol: 'Střelec',
        element: 'Oheň',
        ruling_planet: 'Jupiter',
        dates: '22. listopadu – 21. prosince',
        modality: 'Mutabilní',
        color: '#9b59b6',
        lucky_numbers: [3, 7, 9, 12, 21],
        strengths: ['Optimismus', 'Svobodomyslnost', 'Filosofické myšlení', 'Přímočarost', 'Dobrodružnost'],
        weaknesses: ['Neopatrnost', 'Nezávaznost', 'Taktická slepota', 'Hyperbolismus'],
        description: `
            <p>Střelec je věčný hledač – filosof, cestovatel, učitel. Vládne mu Jupiter, největší planeta sluneční soustavy, a s ním přichází přirozený optimismus, touha po expanzi a víra, že za horizontem vždy čeká něco úžasného.</p>
            <p>Střelci žijí pro svobodu pohybu – fyzického i mentálního. Potřebují cestovat, studovat, filosofovat, nacházet systémy smyslu a rozšiřovat svůj pohled na svět. Zastavení a stagnace jsou pro Střelce téměř fyzicky bolestivé.</p>
            <p>Jsou nesmírně přímí – někdy až brutálně. To, co si myslí, říkají. Bez filtrování a diplomatické obálky. Není to záměrná krutost, ale přirozená touha po pravdivosti. Jejich největší výzvou je naučit se, že pravda podaná s empatií je účinnější než pravda podaná jako facka.</p>
        `,
        compatible_signs: ['Beran', 'Lev', 'Váhy', 'Vodnář'],
        featured_tool: { label: 'Partnerská shoda se Střelcem', link: '../partnerska-shoda.html' },
        natal_cta: { label: 'Vygenerovat Natální kartu', link: '../natalni-karta.html' }
    },
    {
        slug: 'kozoroh',
        name: 'Kozoroh',
        en: 'Capricorn',
        emoji: '♑',
        symbol: 'Kozoroh',
        element: 'Země',
        ruling_planet: 'Saturn',
        dates: '22. prosince – 19. ledna',
        modality: 'Kardinální',
        color: '#7f8c8d',
        lucky_numbers: [4, 8, 13, 22],
        strengths: ['Disciplína', 'Ambice', 'Trpělivost', 'Zodpovědnost', 'Vytrvalost'],
        weaknesses: ['Chladnost', 'Workoholismus', 'Pesimismus', 'Rigidita'],
        description: `
            <p>Kozoroh je nejvytrvalejším climberem zvěrokruhu. Řízenou Saturnem – planetou disciplíny, limitů a dlouhodobé sklizně – Kozoroh ví, že velké cíle se nedosahují přes noc. Stoupá metodicky, krůček za krůčkem, a nikdy se nevzdává.</p>
            <p>Kozorohové jsou přirozenými budovateli. Kariéra, rodina, majetek, reputace – to jsou domény, kde vynikají. Mají přirozené pochopení pro struktury, hierarchie a systémy. Jsou spolehliví, zodpovědní a plní sliby.</p>
            <p>Jejich výzvou je naučit se relaxovat bez pocitu viny a dovolit si emocionální zranitelnost. Saturnský krunýř zodpovědnosti a sebeovládání může vést k emočnímu odcizení od vlastního nitra i od blízkých.</p>
        `,
        compatible_signs: ['Panna', 'Býk', 'Štír', 'Ryby'],
        featured_tool: { label: 'Partnerská shoda s Kozorhem', link: '../partnerska-shoda.html' },
        natal_cta: { label: 'Vygenerovat Natální kartu', link: '../natalni-karta.html' }
    },
    {
        slug: 'vodnár',
        name: 'Vodnář',
        en: 'Aquarius',
        emoji: '♒',
        symbol: 'Vodnář',
        element: 'Vzduch',
        ruling_planet: 'Uran / Saturn',
        dates: '20. ledna – 18. února',
        modality: 'Fixní',
        color: '#1abc9c',
        lucky_numbers: [4, 7, 11, 22, 29],
        strengths: ['Originálnost', 'Humanitárnost', 'Vizionářství', 'Nezávislost', 'Intelekt'],
        weaknesses: ['Emoční vzdálenost', 'Tvrdohlavost', 'Nepředvídatelnost', 'Odtažitost'],
        description: `
            <p>Vodnář je vizionářem zvěrokruhu. Vzduch jako element, ale ovládaný Uranem – planetou revoluce, inovace a průlomů – dává Vodnáři schopnost vidět svět tak, jak bude existovat za deset nebo dvacet let. Jsou přirozenými revolucionáři, reformátory a humanisty.</p>
            <p>Vodnáři milují lidstvo jako celek, ale mívají komplikovaný vztah s konkrétními jednotlivci. Jsou přátelští a otevření, ale emočně vzdálení – jejich hluboký zájem o světové problémy někdy přijde lidem kolem nich jako odtažitost.</p>
            <p>Jsou fixním znamením – to znamená, že jakmile si vytvoří názor nebo hodnotu, drží ji s překvapivou tvrdohlavostí pro tak nekonvenční myslitele. Jejich paradoxem je, že bojují za svobodu všech, ale zároveň mívají silná pravidla o tom, jak by věci správně fungovat měly.</p>
        `,
        compatible_signs: ['Blíženci', 'Váhy', 'Beran', 'Střelec'],
        featured_tool: { label: 'Partnerská shoda s Vodnářem', link: '../partnerska-shoda.html' },
        natal_cta: { label: 'Vygenerovat Natální kartu', link: '../natalni-karta.html' }
    },
    {
        slug: 'ryby',
        name: 'Ryby',
        en: 'Pisces',
        emoji: '♓',
        symbol: 'Ryby',
        element: 'Voda',
        ruling_planet: 'Neptun / Jupiter',
        dates: '19. února – 20. března',
        modality: 'Mutabilní',
        color: '#2980b9',
        lucky_numbers: [3, 9, 12, 15, 18],
        strengths: ['Empatie', 'Spiritualita', 'Kreativita', 'Intuice', 'Soucit'],
        weaknesses: ['Únik od reality', 'Obětovat se', 'Naivita', 'Závislost'],
        description: `
            <p>Ryby jsou posledním a nejduchaplnějším znamením. Vládne jim Neptun – planeta iluzí, snů, spirituality a transcendence. Ryby dokáží splynout s emocemi a energią okolí způsobem, který hraničí s mimořádnou empatií.</p>
            <p>Jsou to přirození mystici, umělci a léčitelé. Jejich přechodová, mutabilní energie jim dává schopnost pohybovat se ve vodách nevědomí – vlastního i kolektivního – s přirozenou lehkostí. Sny, vize a intuice jsou pro Ryby stejně reálné jako fyzický svět.</p>
            <p>Jejich stinnou stránkou je tendence mizet do snů jako útěku před tvrdou realitou. Ryby mají sklony k sebeobetování – na úkor vlastních hranic a potřeb. Duchovní lekcí Ryb je naučit se soucítit bez ztráty sebe. Pomáhat bez self-destrukce.</p>
        `,
        compatible_signs: ['Štír', 'Rak', 'Kozoroh', 'Býk'],
        featured_tool: { label: 'Partnerská shoda s Rybami', link: '../partnerska-shoda.html' },
        natal_cta: { label: 'Vygenerovat Natální kartu', link: '../natalni-karta.html' }
    }
];

export default ZODIAC_SIGNS;
