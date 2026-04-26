
        const NUMBERS = {

            1: {

                name: 'Vůdce a Průkopník',

                traits: ['Původnost', 'Odvaha', 'Nezávislost', 'Ambice', 'Leadership'],

                text: 'Jedničky jsou přirození vůdci s neúnavnou touhou po originalitě. Přišli jste na svět, abyste šli vlastní cestou – ne stopami druhých. Vaše silná vůle a schopnost začínat nové věci jsou vaší největší předností. Výzva: naučit se přijímat pomoc a nespadnout do arogance.'

            },

            2: {

                name: 'Diplomat a Mírotvůrce',

                traits: ['Empatie', 'Spolupráce', 'Intuice', 'Trpělivost', 'Harmonie'],

                text: 'Dvojky jsou mistry rovnováhy a partnerství. Máte výjimečnou schopnost cítit potřeby druhých a nacházet kompromis tam, kde ostatní vidí jen konflikt. Vaše intuice je vaším nejsilnějším nástrojem. Výzva: naučit se asertivitě a nepotlačovat vlastní potřeby.'

            },

            3: {

                name: 'Tvořivý Vyjadřovatel',

                traits: ['Kreativita', 'Komunikace', 'Optimismus', 'Charisma', 'Radost'],

                text: 'Trojky přišly na svět, aby tvořily a inspirovaly. Máte přirozený dar pro slova, umění a vyjadřování – ať skrze psaní, mluvení, zpěv nebo humor. Vaše přítomnost rozsvěcí místnost. Výzva: soustředit se a nedovolit roztříštěnosti, aby bránila dokončení projektů.'

            },

            4: {

                name: 'Stavitel a Organizátor',

                traits: ['Pořádek', 'Spolehlivost', 'Vytrvalost', 'Disciplína', 'Praktičnost'],

                text: 'Čtyřky jsou páteří každé organizace. Vaše schopnost budovat pevné základy a pracovat systematicky je vzácná. Nebojíte se tvrdé práce a věříte v hodnotu řádu. Výzva: pružnost a schopnost přijímat změny, které přicházejí bez vašeho plánování.'

            },

            5: {

                name: 'Dobrodružný Duch',

                traits: ['Svoboda', 'Adaptabilita', 'Zvídavost', 'Smyslnost', 'Změna'],

                text: 'Pětky milují svobodu nade vše. Přišli jste zažít co nejvíc – cestovat, zkoušet, měnit. Vaše adaptabilita a energie jsou nakažlivé. Svět se s vámi nikdy nezastaví na místě. Výzva: naučit se závazku a hloubce – ne každá věc musí být okamžitě vyměněna za novinku.'

            },

            6: {

                name: 'Pečovatel a Harmonizátor',

                traits: ['Láska', 'Odpovědnost', 'Péče', 'Idealizmus', 'Krása'],

                text: 'Šestky jsou přirozeni pečovatelé – rodiny, komunity i celého světa. Máte hluboký smysl pro krásu, spravedlnost a vztahy. Vaše přítomnost léčí. Výzva: naučit se, že péče o sebe samé není sobectví – bez ní ne­máte z čeho dávat.'

            },

            7: {

                name: 'Hledač Pravdy a Moudrec',

                traits: ['Introspekce', 'Analytičnost', 'Duchovno', 'Intuice', 'Perfekcionismus'],

                text: 'Sedmičky přišly hledat hlubší pravdu za povrchem věcí. Jste přirozeni analytici a filozofové s výjimečnou intuicí. Samota pro vás není trest – je palivem pro vaši hlubokou mysl. Výzva: důvěra – sobě, druhým i životu samotnému.'

            },

            8: {

                name: 'Mocný Realizátor',

                traits: ['Ambice', 'Moc', 'Materialismus', 'Autorita', 'Úspěch'],

                text: 'Osmičky přišly zvládnout hmotný svět. Máte přirozený smysl pro business, moc a vedení. Úspěch pro vás není náhoda – je výsledkem vaší jasné vize a schopnosti jednat. Výzva: rovnováha mezi ambicí a lidskostí; moc slouží nejlépe, když se sdílí.'

            },

            9: {

                name: 'Moudrý Humanista',

                traits: ['Soucit', 'Velkorysost', 'Idealizmus', 'Umění', 'Transcendence'],

                text: 'Devítky jsou nejuniverzálnějším číslem. Přišli jste sloužit celku – lidstvu, světu, vyššímu dobru. Vaše soucit přesahuje hranice rodin a národů. Jste přirozeně přitahováni k umění a humanitárním aktivitám. Výzva: propouštění – naučit se nevázat se na výsledky a nechat věci jít.'

            },

            11: {

                name: 'Master Number – Osvícený Vizionář',

                traits: ['Intuice', 'Inspirace', 'Duchovní vědomí', 'Senzitivita', 'Osvícení'],

                text: 'Jedenáctka je první Master Number – číslo vyšší intuice a duchovního osvícení. Přišli jste inspirovat ostatní svou citlivostí a vibrační vnímavostí. Vaše snění není slabost – je vaší schopností vidět, co jiní přehlíží. Výzva: uzemňování a přeměna vize v konkrétní činy.'

            },

            22: {

                name: 'Master Number – Velký Stavitel',

                traits: ['Vize', 'Disciplína', 'Praktická magie', 'Vedení', 'Transformace'],

                text: 'Dvaadvacítka je nejsilnější číslo v numerologii – Master Builder. Máte schopnost přetavit velké sny do reálných struktur, které mění svět. Vaše kombinace intuice a praktičnosti je vzácná. Výzva: nepodlehnout tlaku vlastních vysokých standardů a naučit se delegovat.'

            },

            33: {

                name: 'Master Number – Mistr Lásky',

                traits: ['Bezpodmínečná láska', 'Léčení', 'Vedení srdcem', 'Altruizmus', 'Vize'],

                text: 'Třiatřicítka – Master Teacher – je číslem bezpodmínečné lásky a léčení. Přišli jste povznášet ostatní svou moudrostí a soucitem. Vaše empatie není slabost – je největší silou. Výzva: zachovat si vlastní hranice při službě druhým.'

            }

        };



        function reduceToLifeNumber(day, month, year) {

            const digits = String(day) + String(month) + String(year);

            let sum = [...digits].reduce((a, c) => a + parseInt(c), 0);

            while (sum > 9 && sum !== 11 && sum !== 22 && sum !== 33) {

                sum = [...String(sum)].reduce((a, c) => a + parseInt(c), 0);

            }

            return sum;

        }



        let currentNumber = null;



        document.getElementById('calc-btn').addEventListener('click', () => {

            const day = parseInt(document.getElementById('inp-day').value);

            const month = parseInt(document.getElementById('inp-month').value);

            const year = parseInt(document.getElementById('inp-year').value);

            const err = document.getElementById('calc-error');

            err.textContent = '';



            if (!day || !month || !year || day < 1 || day > 31 || month < 1 || month > 12 || year < 1900 || year > 2025) {

                err.textContent = 'Zadejte prosím platné datum narození.';

                return;

            }



            currentNumber = reduceToLifeNumber(day, month, year);

            const data = NUMBERS[currentNumber];



            document.getElementById('res-number').textContent = currentNumber;

            document.getElementById('res-name').textContent = data.name;

            document.getElementById('res-traits').innerHTML = data.traits.map(t => `<span class="trait-chip">${t}</span>`).join('');

            document.getElementById('res-text').textContent = data.text;

            const result = document.getElementById('calc-result');

            result.hidden = false;

            result.classList.add('mh-block-visible');

            result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });



            // Save sign for personalization

            if (window.MH_PERSONALIZATION) {

                window.MH_PERSONALIZATION.set({ lifeNumber: currentNumber });

            }

        });



        // Enter key support

        ['inp-day', 'inp-month', 'inp-year'].forEach(id => {

            document.getElementById(id).addEventListener('keydown', e => {

                if (e.key === 'Enter') document.getElementById('calc-btn').click();

            });

        });



        // Event delegation for share buttons
        document.addEventListener('click', (e) => {
            const action = e.target.getAttribute('data-action');
            if (action === 'shareResult') {
                const platform = e.target.getAttribute('data-platform');
                shareResult(platform);
            }
        });

        function shareResult(platform) {

            if (!currentNumber) return;

            const data = NUMBERS[currentNumber];

            const text = `Moje Číslo Osudu je ${currentNumber} – ${data.name}! Zjistěte vaše na Mystické Hvězdě 🌟`;

            const url = 'https://www.mystickahvezda.cz/kalkulacka-cisla-osudu.html';



            if (platform === 'twitter') {

                window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');

            } else if (platform === 'facebook') {

                window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`, '_blank');

            } else if (platform === 'copy') {

                navigator.clipboard.writeText(`${text} ${url}`).then(() => {

                    const btn = document.getElementById('copy-btn');

                    btn.textContent = '✅ Zkopírováno!';

                    setTimeout(() => btn.textContent = '📋 Kopírovat', 2000);

                });

            }

        }
