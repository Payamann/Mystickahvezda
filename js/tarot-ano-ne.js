/**
 * tarot-ano-ne.js - Logika pro Tarot ANO/NE
 */
(function () {
    const answers = {
        ano: {
            label: 'ANO', emoji: '✅', class: 'ano',
            texts: [
                'Hvězdy hovoří jasně — ano, je to správná cesta. Důvěřujte svému instinktu.',
                'Karty naznačují pozitivní výsledek. Jednejte s důvěrou.',
                'Energie je příznivá. Toto je správný čas pro váš záměr.',
                'Vesmír vám dává zelenou. Vaše intuice vás vede správně.',
                'Ano — ale pamatujte, že akce jsou v rukou vaší svobodné vůle.',
                'Výsledek bude pozitivní, pokud jednat s upřímností a odvahou.',
                'Karty vidí příznivou cestu. Máte vnitřní sílu to uskutečnit.',
                'Ano. Připravte se přijmout to, o co jste žádali.',
                'Tarot souhlasí. Vaše srdce zná odpověď.',
                'Ano — a brzké kroky tuto šanci posílí.',
            ]
        },
        spise_ano: {
            label: 'SPÍŠE ANO', emoji: '🌟', class: 'mozna',
            texts: [
                'Znamení ukazují spíše pozitivní výsledek, ale záleží na vašich dalších krocích.',
                'Pravděpodobně ano — i když cesta nemusí být přímočará.',
                'Šance je na vaší straně, ale buďte trpěliví.',
                'Karty vidí naději. Věci se vyvíjejí správným směrem.',
                'Spíše ano, pokud zachováte jasnou mysl a otevřenost.',
            ]
        },
        nejasne: {
            label: 'NEJASNÉ', emoji: '🔮', class: 'mozna',
            texts: [
                'Budoucnost je zatím otevřená. Otázka možná ještě není zralá.',
                'Karty vidí mlhu. Zkuste se zeptat znovu jinou cestou nebo jindy.',
                'Energie jsou nevyvážené. Počkejte a pak se znovu zeptejte.',
                'Odpověď není ještě pevná — záleží na mnoha faktorech.',
                'Výsledek závisí na vašich příštích rozhodnutích.',
            ]
        },
        spise_ne: {
            label: 'SPÍŠE NE', emoji: '⚠️', class: 'ne',
            texts: [
                'Karty varují před touto cestou. Zvažte alternativy.',
                'Spíše ne — ale není to definitivní. Okolnosti se mohou změnit.',
                'Energie není příznivá pro tento záměr v tuto chvíli.',
                'Tarot doporučuje opatrnost a přehodnocení situace.',
                'Možná není vhodný čas. Zeptejte se, co vás brzdí.',
            ]
        },
        ne: {
            label: 'NE', emoji: '🚨', class: 'ne',
            texts: [
                'Karty jasně varují. Tato cesta není pro vás to pravé.',
                'Ne — ale každá zavřená brána vede k jiným možnostem.',
                'Tarot vidí překážky. Přijměte tuto odpověď jako vedení, ne jako trest.',
                'Tento záměr nenese dobré ovoce. Hledejte jinou cestu.',
                'Ne. Vaše intuice vám možná říká totéž.',
            ]
        }
    };

    // Distribuce: 25% ANO, 20% SPÍŠE ANO, 20% NEJASNÉ, 20% SPÍŠE NE, 15% NE
    const pool = [
        'ano', 'ano', 'ano', 'ano', 'ano',
        'spise_ano', 'spise_ano', 'spise_ano', 'spise_ano',
        'nejasne', 'nejasne', 'nejasne', 'nejasne',
        'spise_ne', 'spise_ne', 'spise_ne', 'spise_ne',
        'ne', 'ne', 'ne'
    ];

    let used = false;

    function flipCard(card, index) {
        if (used) return;

        const inputEl = document.getElementById('question-input');
        const q = inputEl.value.trim();

        if (!q) {
            // Zobrazíme UX upozornění - uživatel musí vyplnit otázku
            inputEl.focus();
            inputEl.style.borderColor = 'rgba(231,76,60,0.8)';

            // Přidat "shake" animaci k elementu
            inputEl.classList.remove('shake');
            void inputEl.offsetWidth; // trigger reflow
            inputEl.classList.add('shake');

            // Zpráva do konzole pro jistotu (lze pak ztlumit)
            console.warn('Tarot: Pokus o tažení karty bez zadané otázky.');
            return;
        }

        // Obnovíme původní barvu ohraničení InputBoxu
        inputEl.style.borderColor = 'rgba(212,175,55,0.5)';
        inputEl.classList.remove('shake');

        used = true;

        // Uzamčeme ostatní karty
        document.querySelectorAll('.tarot-card').forEach(c => c.style.cursor = 'default');

        // Vyhodnocení
        const key = pool[Math.floor(Math.random() * pool.length)];
        const ans = answers[key];
        const text = ans.texts[Math.floor(Math.random() * ans.texts.length)];

        // Vložení resultu na Front (Přední líc karty)
        const front = card.querySelector('.card-front');
        front.classList.add(ans.class);
        front.innerHTML = `<span class="card-emoji">${ans.emoji}</span><span class="answer-label">${ans.label}</span>`;

        // Otočení animací
        card.classList.add('flipped');

        // Mírné zpoždění na otočku a zobrazení panelu s textem
        setTimeout(() => {
            document.getElementById('result-emoji').textContent = ans.emoji;
            document.getElementById('result-title').textContent = ans.label;
            document.getElementById('result-title').style.color = ans.class === 'ano' ? '#2ed573' : (ans.class === 'ne' ? '#ff6b6b' : '#d4af37');
            document.getElementById('result-text').textContent = text;
            const panel = document.getElementById('result-panel');
            panel.classList.add('show');
            panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 800);
    }

    function resetCards() {
        used = false;
        document.getElementById('question-input').value = '';
        document.getElementById('question-input').style.borderColor = '';
        document.getElementById('result-panel').classList.remove('show');

        document.querySelectorAll('.tarot-card').forEach(c => {
            c.classList.remove('flipped');
            c.style.cursor = 'pointer';
            const front = c.querySelector('.card-front');
            front.className = 'card-front card-face';
            front.innerHTML = '';
        });

        // Smooth srcoll opět lehce zpátky k inputu po tichém doznění
        setTimeout(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 150);
    }

    function initTarotAnoNe() {
        const cardsArea = document.getElementById('cards-area');
        const btnReset = document.getElementById('btn-reset');

        if (cardsArea) {
            cardsArea.addEventListener('click', (e) => {
                const card = e.target.closest('.tarot-card');
                if (card) {
                    const idx = card.getAttribute('data-index');
                    if (idx !== null) {
                        flipCard(card, parseInt(idx));
                    }
                }
            });
        }

        if (btnReset) {
            btnReset.addEventListener('click', resetCards);
        }
    }

    // Spolehlivě ukotví listenery i pro případy dynamického loadu
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTarotAnoNe);
    } else {
        initTarotAnoNe();
    }
})();
