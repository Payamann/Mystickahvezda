/**
 * nameday.js — Svátek dne pro česká jména
 * Použití: automaticky zobrazí „Dnes slaví: Kamil · Zítra: Stela" v headeru
 */
(function () {
    'use strict';

    // Databáze českých jmenin (měsíc-den → [jméno])
    const nameDays = {
        '1-1': ['Nový rok'], '1-2': ['Karina'], '1-3': ['Radmila'], '1-4': ['Diana'],
        '1-5': ['Dalimil'], '1-6': ['Tři králové', 'Kašpar'], '1-7': ['Vilma'],
        '1-8': ['Čestmír'], '1-9': ['Vladan'], '1-10': ['Břetislav'],
        '1-11': ['Bohdana'], '1-12': ['Pravoslav'], '1-13': ['Řehoř'],
        '1-14': ['Radovan'], '1-15': ['Alice'], '1-16': ['Ctirad'],
        '1-17': ['Drahoslav'], '1-18': ['Vladislav'], '1-19': ['Doubravka'],
        '1-20': ['Ilona'], '1-21': ['Běla'], '1-22': ['Slavomír'],
        '1-23': ['Zdeněk'], '1-24': ['Milena'], '1-25': ['Miloš'],
        '1-26': ['Zora'], '1-27': ['Ingrid'], '1-28': ['Otýlie'],
        '1-29': ['Zdislava'], '1-30': ['Robin'], '1-31': ['Marika'],
        '2-1': ['Hynek'], '2-2': ['Nela'], '2-3': ['Blažej'],
        '2-4': ['Jarmila'], '2-5': ['Dobromila'], '2-6': ['Vanda'],
        '2-7': ['Veronika'], '2-8': ['Milada'], '2-9': ['Apolena'],
        '2-10': ['Mojmír'], '2-11': ['Božena'], '2-12': ['Slavěna'],
        '2-13': ['Věnceslava'], '2-14': ['Valentýn', 'Valentin'],
        '2-15': ['Jiřina'], '2-16': ['Ljuba'], '2-17': ['Miloslava'],
        '2-18': ['Gizela'], '2-19': ['Patrik'], '2-20': ['Oldřich'],
        '2-21': ['Lenka'], '2-22': ['Petr'], '2-23': ['Romana'],
        '2-24': ['Matěj'], '2-25': ['Liliana'], '2-26': ['Dorota'],
        '2-27': ['Alexandr'], '2-28': ['Lumír'], '2-29': ['Horymír'],
        '3-1': ['Bedřich'], '3-2': ['Anežka'], '3-3': ['Kamil'],
        '3-4': ['Stela'], '3-5': ['Kazimír'], '3-6': ['Miroslav'],
        '3-7': ['Tomáš'], '3-8': ['Gabriela'], '3-9': ['Františka'],
        '3-10': ['Viktorie'], '3-11': ['Anděla'], '3-12': ['Řehoř'],
        '3-13': ['Růžena'], '3-14': ['Rút'], '3-15': ['Ida'],
        '3-16': ['Elena'], '3-17': ['Vlastimil'], '3-18': ['Eduard'],
        '3-19': ['Josef'], '3-20': ['Světlana'], '3-21': ['Radek'],
        '3-22': ['Leona'], '3-23': ['Ivona'], '3-24': ['Gabriel'],
        '3-25': ['Marián'], '3-26': ['Emanuel'], '3-27': ['Dita'],
        '3-28': ['Soňa'], '3-29': ['Taťána'], '3-30': ['Arnošt'],
        '3-31': ['Kvido'],
        '4-1': ['Hugo'], '4-2': ['Erika'], '4-3': ['Richard'],
        '4-4': ['Ivana'], '4-5': ['Miroslava'], '4-6': ['Vendula'],
        '4-7': ['Heřman'], '4-8': ['Ema'], '4-9': ['Dušan'],
        '4-10': ['Darja'], '4-11': ['Izabela'], '4-12': ['Julius'],
        '4-13': ['Aleš'], '4-14': ['Vincenc'], '4-15': ['Anastázie'],
        '4-16': ['Irena'], '4-17': ['Rudolf'], '4-18': ['Valérie'],
        '4-19': ['Rostislav'], '4-20': ['Marcela'], '4-21': ['Alexandra'],
        '4-22': ['Evžénie'], '4-23': ['Vojtěch'], '4-24': ['Jiří'],
        '4-25': ['Marek'], '4-26': ['Oto'], '4-27': ['Jaroslav'],
        '4-28': ['Vlastislav'], '4-29': ['Robert'], '4-30': ['Blahoslav'],
        '5-1': ['Svátek práce'], '5-2': ['Zikmund'], '5-3': ['Alexej'],
        '5-4': ['Florian'], '5-5': ['Klaudie'], '5-6': ['Radoslav'],
        '5-7': ['Stanislav'], '5-8': ['Den vítězství'], '5-9': ['Ctibor'],
        '5-10': ['Blažena'], '5-11': ['Svatava'], '5-12': ['Pankrác'],
        '5-13': ['Servác'], '5-14': ['Bonifác'], '5-15': ['Žofie'],
        '5-16': ['Přemysl'], '5-17': ['Anežka'], '5-18': ['Nataša'],
        '5-19': ['Ivo'], '5-20': ['Zbyšek'], '5-21': ['Konstantin'],
        '5-22': ['Emil'], '5-23': ['Vladimír'], '5-24': ['Jana'],
        '5-25': ['Viola'], '5-26': ['Filip'], '5-27': ['Augustin'],
        '5-28': ['Vilém'], '5-29': ['Maxmilián'], '5-30': ['Ferdinand'],
        '5-31': ['Kamila'],
        '6-1': ['Laura'], '6-2': ['Jarmil'], '6-3': ['Kevin'],
        '6-4': ['Dalibor'], '6-5': ['Dobroslav'], '6-6': ['Norbert'],
        '6-7': ['Iveta'], '6-8': ['Medard'], '6-9': ['Stanislava'],
        '6-10': ['Gita'], '6-11': ['Bruno'], '6-12': ['Antonie'],
        '6-13': ['Antonín'], '6-14': ['Roland'], '6-15': ['Vít'],
        '6-16': ['Zbyněk'], '6-17': ['Adolf'], '6-18': ['Milan'],
        '6-19': ['Sylvie'], '6-20': ['Květa'], '6-21': ['Alois'],
        '6-22': ['Pavla'], '6-23': ['Zdeňka'], '6-24': ['Jan'],
        '6-25': ['Ivan'], '6-26': ['Adriana'], '6-27': ['Ladislav'],
        '6-28': ['Lubomír'], '6-29': ['Petr', 'Pavel'], '6-30': ['Šárka'],
        '7-1': ['Jaroslava'], '7-2': ['Patricie'], '7-3': ['Radomír'],
        '7-4': ['Prokop'], '7-5': ['Cyril', 'Metoděj'], '7-6': ['Jan Hus'],
        '7-7': ['Bohuslava'], '7-8': ['Nora'], '7-9': ['Drahomíra'],
        '7-10': ['Libuše'], '7-11': ['Olga'], '7-12': ['Bořek'],
        '7-13': ['Markéta'], '7-14': ['Karolína'], '7-15': ['Jindřich'],
        '7-16': ['Luboš'], '7-17': ['Martina'], '7-18': ['Drahomír'],
        '7-19': ['Čeněk'], '7-20': ['Ilja'], '7-21': ['Vítězslav'],
        '7-22': ['Magdaléna'], '7-23': ['Libor'], '7-24': ['Kristýna'],
        '7-25': ['Jakub'], '7-26': ['Anna'], '7-27': ['Věroslav'],
        '7-28': ['Viktor'], '7-29': ['Marta'], '7-30': ['Bořivoj'],
        '7-31': ['Ignác'],
        '8-1': ['Oskar'], '8-2': ['Gustav'], '8-3': ['Miluše'],
        '8-4': ['Dominik'], '8-5': ['Kristián'], '8-6': ['Oldřiška'],
        '8-7': ['Lada'], '8-8': ['Soběslav'], '8-9': ['Roman'],
        '8-10': ['Vavřinec'], '8-11': ['Zuzana'], '8-12': ['Klára'],
        '8-13': ['Alžběta'], '8-14': ['Alan'], '8-15': ['Hana'],
        '8-16': ['Jáchym'], '8-17': ['Petra'], '8-18': ['Helena'],
        '8-19': ['Ludvík'], '8-20': ['Bernard'], '8-21': ['Johana'],
        '8-22': ['Bohuslav'], '8-23': ['Sandra'], '8-24': ['Bartoloměj'],
        '8-25': ['Radim'], '8-26': ['Luděk'], '8-27': ['Otakar'],
        '8-28': ['Augustýn'], '8-29': ['Ota'], '8-30': ['Vladěna'],
        '8-31': ['Pavlína'],
        '9-1': ['Linda'], '9-2': ['Adéla'], '9-3': ['Bronislav'],
        '9-4': ['Jindřiška'], '9-5': ['Boris'], '9-6': ['Boleslav'],
        '9-7': ['Regína'], '9-8': ['Mariana'], '9-9': ['Daniela'],
        '9-10': ['Irma'], '9-11': ['Denisa'], '9-12': ['Maria'],
        '9-13': ['Lubor'], '9-14': ['Radka'], '9-15': ['Jolana'],
        '9-16': ['Ludmila'], '9-17': ['Naděžda'], '9-18': ['Kryštof'],
        '9-19': ['Zita'], '9-20': ['Oleg'], '9-21': ['Matouš'],
        '9-22': ['Darina'], '9-23': ['Bořislava'], '9-24': ['Jaromír'],
        '9-25': ['Zlata'], '9-26': ['Andrea'], '9-27': ['Jonáš'],
        '9-28': ['Václav'], '9-29': ['Michal'], '9-30': ['Jeroným'],
        '10-1': ['Igor'], '10-2': ['Olivie'], '10-3': ['Bohumil'],
        '10-4': ['František'], '10-5': ['Eliška'], '10-6': ['Hanuš'],
        '10-7': ['Justýna'], '10-8': ['Simona'], '10-9': ['Štefan'],
        '10-10': ['Blanka'], '10-11': ['Andrej'], '10-12': ['Marcel'],
        '10-13': ['Renáta'], '10-14': ['Agáta'], '10-15': ['Tereza'],
        '10-16': ['Havel'], '10-17': ['Hedvika'], '10-18': ['Lukáš'],
        '10-19': ['Michaela'], '10-20': ['Vendulka'], '10-21': ['Brigita'],
        '10-22': ['Sabina'], '10-23': ['Teodor'], '10-24': ['Nina'],
        '10-25': ['Beáta'], '10-26': ['Erik'], '10-27': ['Šarlota'],
        '10-28': ['Den vzniku ČSR'], '10-29': ['Silvie'], '10-30': ['Tadeáš'],
        '10-31': ['Štěpánka'],
        '11-1': ['Felix'], '11-2': ['Památka zesnulých'], '11-3': ['Hubert'],
        '11-4': ['Karel'], '11-5': ['Miriam'], '11-6': ['Liběna'],
        '11-7': ['Saskie'], '11-8': ['Bohumír'], '11-9': ['Bohdan'],
        '11-10': ['Evžen'], '11-11': ['Martin'], '11-12': ['Benedikta'],
        '11-13': ['Tibor'], '11-14': ['Sáva'], '11-15': ['Leopold'],
        '11-16': ['Otmar'], '11-17': ['Mahulena'], '11-18': ['Romana'],
        '11-19': ['Alžběta'], '11-20': ['Nikola'], '11-21': ['Albert'],
        '11-22': ['Cecílie'], '11-23': ['Klement'], '11-24': ['Emílie'],
        '11-25': ['Kateřina'], '11-26': ['Artur'], '11-27': ['Xenie'],
        '11-28': ['René'], '11-29': ['Zina'], '11-30': ['Ondřej'],
        '12-1': ['Iva'], '12-2': ['Blanka'], '12-3': ['Svatoslav'],
        '12-4': ['Barbora'], '12-5': ['Jitka'], '12-6': ['Mikuláš'],
        '12-7': ['Ambrož'], '12-8': ['Květoslava'], '12-9': ['Vratislav'],
        '12-10': ['Julie'], '12-11': ['Dana'], '12-12': ['Simona'],
        '12-13': ['Lucie'], '12-14': ['Lýdie'], '12-15': ['Radana'],
        '12-16': ['Albína'], '12-17': ['Daniel'], '12-18': ['Miloslava'],
        '12-19': ['Ester'], '12-20': ['Dagmar'], '12-21': ['Natálie'],
        '12-22': ['Šimon'], '12-23': ['Vlasta'], '12-24': ['Štědrý den', 'Adam', 'Eva'],
        '12-25': ['Boží hod', 'Anastázie'], '12-26': ['Štěpán'],
        '12-27': ['Žaneta'], '12-28': ['Bohumila'], '12-29': ['Judita'],
        '12-30': ['David'], '12-31': ['Silvestra'],
    };

    // --- Astrological Wisdom Data ---
    const wisdoms = {
        general: [
            "Ve stínech tvých včerejších obav dnes klíčí světlo nové cesty. Naslouchej mu.",
            "Vesmír nevykřikuje, on šeptá skrze ticho mezi tvými myšlenkami.",
            "Každá planeta ve tvém horoskopu je strunou v symfonii tvého osudu.",
            "Retrográdní čas není zpoždění, ale posvátná pauza pro tvůj vnitřní dech.",
            "Jak nahoře v klenbě hvězd, tak hluboko v tepu tvého srdce.",
            "Trpělivost je mostem, po kterém kráčejí hvězdy k tvému prahu.",
            "Důvěřuj tanci atomů; vše se děje v rytmu, který tvá duše zná.",
            "Tvá energie je tkání, ze které vesmír spřádá zítřejší úsvit.",
            "Pravda není v mapách, ale v odvaze podívat se do zrcadla věčnosti.",
            "Každý nádech je šancí se znovu narodit do záře vlastní existence."
        ],
        moon: {
            'new-moon': "Novoluní je časem pro setí nových záměrů. Co si dnes přejete zasadit?",
            'full-moon': "Úplněk osvětluje to, co má být propuštěno. Odevzdejte vesmíru své břemeno.",
            'waxing': "Měsíc dorůstá a s ním i vaše síla. Je čas na akci a budování.",
            'waning': "Měsíc ubývá. Čas pro očistu, odpočinek a vnitřní reflexi."
        }
    };

    function getMoonPhase() {
        const known_new_moon = new Date('2026-02-17T12:01:00Z').getTime();
        const lp = 2551442877; 
        let diff = Date.now() - known_new_moon;
        let phase = (diff % lp) / lp;
        if (phase < 0) phase += 1;
        if (phase < 0.05 || phase > 0.95) return 'new-moon';
        if (phase > 0.45 && phase < 0.55) return 'full-moon';
        if (phase >= 0.05 && phase <= 0.45) return 'waxing';
        return 'waning';
    }

    function hashCode(str) {
        let h = 0;
        for (let i = 0; i < str.length; i++) {
            h = Math.imul(31, h) + str.charCodeAt(i) | 0;
        }
        return Math.abs(h);
    }

    function getNameDay(date) {
        const key = `${date.getMonth() + 1}-${date.getDate()}`;
        return nameDays[key] || ['—'];
    }

    function initNameDayWidget() {
        if (document.getElementById('nameday-widget')) return;

        const widget = document.createElement('div');
        widget.id = 'nameday-widget';
        widget.style.cssText = `
            text-align: center; 
            font-size: 0.74rem; 
            color: rgba(255,255,255,0.5);
            padding: 0.45rem 1rem; 
            background: rgba(10, 10, 26, 0.98);
            border-bottom: 1px solid rgba(212,175,55,0.12);
            letter-spacing: 0.4px;
            width: 100%;
            position: relative;
            z-index: 1001;
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            height: 34px;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
        `;

        // Content Preparing
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        const todayNames = getNameDay(today).join(', ');
        const tomorrowNames = getNameDay(tomorrow).join(', ');

        const moon = getMoonPhase();
        const todayStr = new Date().toLocaleDateString('cs-CZ');
        const userSign = window.MH_PERSONALIZATION?.getSign() || '';
        
        // --- AI Wisdom Fetching & Caching ---
        const CACHE_KEY = `mh_ai_wisdom_v4_${todayStr}_${userSign}`;
        
        const getFallbackWisdom = () => {
             const key = today.toDateString();
             return (hashCode(key) % 10 < 3 && wisdoms.moon[moon]) 
                ? wisdoms.moon[moon] 
                : wisdoms.general[hashCode(key) % wisdoms.general.length];
        };

        const container = document.createElement('div');
        container.style.cssText = `
            position: relative;
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        widget.appendChild(container);

        const createSlide = (html) => {
            const slide = document.createElement('div');
            slide.style.cssText = `
                position: absolute;
                width: 100%;
                opacity: 0;
                transition: opacity 1s ease-in-out, transform 1s ease-out;
                transform: translateY(5px);
                pointer-events: none;
                display: flex;
                align-items: center;
                justify-content: center;
                white-space: nowrap;
            `;
            slide.innerHTML = html;
            return slide;
        };

        const slide1 = createSlide(`✨ Dnes slaví: <strong style="color:rgba(212,175,55,0.95); margin-left:5px">${todayNames}</strong> &nbsp;·&nbsp; <span style="opacity:0.7">Zítra: ${tomorrowNames}</span>`);
        
        // Initial wisdom fallback
        let initialWisdom = localStorage.getItem(CACHE_KEY) || getFallbackWisdom();
        
        const updateWidgetContent = (wisdom) => {
            const isMobile = window.innerWidth < 1024;
            
            if (!isMobile) {
                // Single line for desktop
                container.innerHTML = `
                    <div style="display:flex; align-items:center; gap:20px; opacity:0; transition:opacity 0.6s ease-in; width:100%; justify-content:center;">
                        <div style="white-space:nowrap">✨ Dnes: <strong>${todayNames}</strong> | Zítra: ${tomorrowNames}</div>
                        <div style="width:1px; height:12px; background:rgba(212,175,55,0.2)"></div>
                        <div style="white-space:nowrap; font-style:italic">🔮 Moudro dne: <span id="wisdom-content">${wisdom}</span></div>
                    </div>
                `;
                setTimeout(() => {
                    const el = container.firstElementChild;
                    if (el) el.style.opacity = '1';
                }, 50);
                return;
            }

            // Ticker for mobile
            container.innerHTML = '';
            const createSlide = (html) => {
                const slide = document.createElement('div');
                slide.style.cssText = `
                    position: absolute; width: 100%; opacity: 0;
                    transition: opacity 0.8s ease-in-out, transform 0.8s ease-out;
                    transform: translateY(5px); pointer-events: none;
                    display: flex; align-items: center; justify-content: center; text-align: center;
                `;
                slide.innerHTML = html;
                return slide;
            };

            const slide1 = createSlide(`✨ <strong>${todayNames}</strong> (zítra ${tomorrowNames})`);
            const slide2 = createSlide(`🔮 <span id="wisdom-label" style="font-weight:600; font-size:0.7rem; opacity:0.6; text-transform:uppercase; margin-right:5px">Moudro dne:</span> <span style="font-style:italic">${wisdom}</span>`);
            container.appendChild(slide1);
            container.appendChild(slide2);

            let current = 0;
            const slides = [slide1, slide2];
            const showSlide = (index) => {
                slides.forEach((s, i) => {
                    const isActive = i === index;
                    s.style.opacity = isActive ? '1' : '0';
                    s.style.transform = isActive ? 'translateY(0)' : 'translateY(-5px)';
                    s.style.pointerEvents = isActive ? 'auto' : 'none';
                });
            };

            showSlide(0);
            if (window.namedayTickerInterval) clearInterval(window.namedayTickerInterval);
            window.namedayTickerInterval = setInterval(() => {
                current = (current + 1) % slides.length;
                showSlide(current);
            }, 5000); // Faster ticker (5s)
        };

        // Initial render
        updateWidgetContent(initialWisdom);

        // Resize handler
        window.addEventListener('resize', () => {
             const wisdom = localStorage.getItem(CACHE_KEY) || initialWisdom;
             updateWidgetContent(wisdom);
        });

        // Fetch AI Wisdom asynchronously if not cached (with retry if service not yet loaded)
        const fetchWithRetry = (retries = 10) => {
            if (localStorage.getItem(CACHE_KEY)) {
                console.log('[Wisdom] Using cached AI wisdom.');
                return;
            }
            
            if (window.GeminiService) {
                console.log('[Wisdom] GeminiService found, fetching AI wisdom...');
                window.GeminiService.getDailyWisdom(userSign, moon)
                    .then(aiWisdom => {
                        if (aiWisdom && aiWisdom.length > 5) {
                            console.log('[Wisdom] AI wisdom successfully fetched.');
                            localStorage.setItem(CACHE_KEY, aiWisdom);
                            updateWidgetContent(aiWisdom);
                        } else {
                            console.warn('[Wisdom] AI returned empty or short response, staying on fallback.');
                        }
                    })
                    .catch(err => {
                        console.error('[Wisdom] AI fetch failed:', err);
                    });
            } else if (retries > 0) {
                console.log(`[Wisdom] GeminiService not ready, retrying (${retries} left)...`);
                setTimeout(() => fetchWithRetry(retries - 1), 1000);
            } else {
                console.warn('[Wisdom] GeminiService failed to load after multiple retries.');
            }
        };

        fetchWithRetry();

        const mount = () => {
            const header = document.querySelector('.header');
            if (header) {
                if (!header.contains(widget)) header.prepend(widget);
            } else {
                if (!document.body.contains(widget)) document.body.insertBefore(widget, document.body.firstChild);
            }
        };

        mount();
        document.addEventListener('components:loaded', mount);
        setTimeout(mount, 1000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initNameDayWidget);
    } else {
        initNameDayWidget();
    }
})();
