// Event delegation for flipCard function
document.addEventListener('click', (e) => {
    const action = e.target.getAttribute('data-action');
    if (action === 'flipCard') {
        flipCard(e.target);
    }
});

function flipCard(el) {

    const cards = ['🌙', '⭐', '🔮', '🌟', '✨', '🌙'];

    const names = ['Měsíc', 'Hvězda', 'Věž', 'Slunce', 'Svět', 'Soudce'];

    const msgs = [

        'Naslouchejte svým emocím a snům.',

        'Naděje a inspirace jsou na vaší straně.',

        'Čas na změnu — pustit se staré struktury.',

        'Radost, úspěch a jasnost přichází.',

        'Naplnění a dokončení dlouhé cesty.',

        'Čas zúčtování a nového pohledu na minulost.'

    ];

    const i = Math.floor(Math.random() * cards.length);

    el.classList.add('flipped');

    el.textContent = cards[i];

    el.title = names[i] + ': ' + msgs[i];

    el.setAttribute('aria-label', names[i] + ': ' + msgs[i]);

}
