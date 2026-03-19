/**
 * Archetyp Vaší Duše Quiz
 * Interactive tarot archetype discovery test
 */

document.addEventListener('DOMContentLoaded', () => {
    const steps = document.querySelectorAll('.question-step[data-step]');
    const progressBar = document.getElementById('progress-bar');
    const scores = { magician: 0, priestess: 0, empress: 0, hermit: 0, star: 0 };
    let currentStep = 1;
    const totalSteps = steps.length;

    const resultsData = {
        magician: {
            title: "Máh",
            subtitle: "Tvůrce reality",
            icon: "🪄",
            desc: "Váš archetyp je postava plná potenciálu. Máte schopnost manifestovat své myšlenky do hmotné reality. Vaše vůle je vaším nejmocnějším nástrojem.",
            advice: "Nezapomeňte, že s velkou mocí přichází zodpovědnost. Zaměřte svou energii na to, co skutečně milujete."
        },
        priestess: {
            title: "Velekněžka",
            subtitle: "Strážkyně tajemství",
            icon: "🌒",
            desc: "Váš archetyp je ztělesněním hluboké intuice a vnitřního vědění. Rozumíte věcem, které zůstávají ostatním skryty, a pohybujete se s lehkostí v říši snů.",
            advice: "Důvěřujte svému vnitřnímu hlasu i tehdy, když mu logika okolního světa nerozumí. Vaše ticho je vaší silou."
        },
        empress: {
            title: "Císařovna",
            subtitle: "Matka hojnosti",
            icon: "🌿",
            desc: "Vaše duše promlouvá skrze tvořivost, lásku a spojení s přírodou. Jste zdrojem inspirace a péče pro všechny ve vašem okolí.",
            advice: "Dovolte si rozkvétat. Pečujte o sebe stejně tak, jako pečujete o svět kolem sebe. Hojnost je váš přirozený stav."
        },
        hermit: {
            title: "Poustevník",
            subtitle: "Hledač pravdy",
            icon: "💡",
            desc: "Váš archetyp dává přednost hloubce před povrchností. Hledáte odpovědi ve svém nitru a vaše osamělá cesta vás vede k nejvyšším vrcholům moudrosti.",
            advice: "Nebojte se své samoty. Je to prostor, kde se rodí vaše největší pravdy. Staňte se světlem pro ty, kteří ještě bloudí."
        },
        star: {
            title: "Hvězda",
            subtitle: "Maják naděje",
            icon: "✨",
            desc: "Vaše duše je plná světla, optimismu a duchovní čistoty. Přinášíte naději tam, kde je tma, a inspirujete ostatní k lepším zítřkům.",
            advice: "Zůstaňte napojeni na vesmírné proudy. Vaše vize jsou důležité. Důvěřujte procesu života a nechte své světlo zářit."
        }
    };

    function updateProgress() {
        const percent = (currentStep / totalSteps) * 100;
        progressBar.style.width = percent + '%';
    }

    function showStep(stepNum) {
        steps.forEach(s => s.classList.remove('active'));
        const nextStep = document.querySelector(`.question-step[data-step="${stepNum}"]`);
        if (nextStep) {
            nextStep.classList.add('active');
            updateProgress();
        } else {
            showLoading();
        }
    }

    function showLoading() {
        steps.forEach(s => s.classList.remove('active'));
        document.getElementById('loading-step').classList.add('active');
        progressBar.style.width = '100%';

        setTimeout(showResult, 2500);
    }

    function showResult() {
        const winner = Object.keys(scores).reduce((a, b) => scores[a] > scores[b] ? a : b);
        const data = resultsData[winner];

        // Store result for sharing
        window.lastResult = data.title;

        const resultHtml = `
            <div class="result-card" style="border-color: var(--quiz-accent);">
                <div class="result-card__header">
                    <h4 class="result-card__title">${data.title}</h4>
                    <p style="color: rgba(255,215,0,0.6); font-size: 0.8rem;">Váš duchovní archetyp</p>
                </div>
                <div class="result-card__image animate-glow">${data.icon}</div>
                <div class="result-card__body">
                    <h5 style="margin-bottom: 0.5rem; color: #fff;">${data.subtitle}</h5>
                    <p style="font-size: 0.9rem; color: rgba(255,255,255,0.8); line-height: 1.4;">${data.desc}</p>
                </div>
                <div class="result-card__footer" style="margin-top: 1rem; border-top: 1px solid rgba(255,215,0,0.2); padding-top: 1rem;">
                    <p style="font-style: italic; font-size: 0.85rem; color: var(--quiz-accent);">"${data.advice}"</p>
                </div>
            </div>
            <div class="mt-xl">
                <h2 class="text-gradient">Vaše cesta je osvětlena</h2>
                <p>Tento archetyp vám ukazuje cestu v příštích měsících.</p>
            </div>
        `;

        document.getElementById('loading-step').classList.remove('active');
        const resultStep = document.getElementById('result-step');
        document.getElementById('result-box').innerHTML = resultHtml;
        resultStep.classList.add('active');
    }

    // Attach event listeners to option buttons
    document.querySelectorAll('.option-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const scoreKey = btn.dataset.score;
            scores[scoreKey]++;
            currentStep++;
            showStep(currentStep);
        });
    });

    // Event delegation for share and reload buttons
    document.addEventListener('click', (e) => {
        const action = e.target.getAttribute('data-action');
        if (action === 'shareResult') {
            window.shareResult();
        } else if (action === 'reloadPage') {
            location.reload();
        }
    });

    window.shareResult = () => {
        const text = `Mým tarotovým archetypem je ${window.lastResult}! Odhal ten svůj na Mystické Hvězdě.`;
        if (navigator.share) {
            navigator.share({
                title: 'Můj Tarotový Archetyp',
                text: text,
                url: window.location.href
            }).catch(console.error);
        } else {
            const dummy = document.createElement('input');
            document.body.appendChild(dummy);
            dummy.value = text + ' ' + window.location.href;
            dummy.select();
            document.execCommand('copy');
            document.body.removeChild(dummy);
            alert('Výsledek zkopírován do schránky!');
        }
    };
});
