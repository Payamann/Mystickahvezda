/**
 * afirmace.js — Denní afirmace generované AI (konzistentní s horoskopem)
 * Volá stejné API jako horoscope.js — výsledek je identický s afirmací v horoskopu.
 */

const signs = {
    beran:   { name: 'Beran',    emoji: '♈', color: '#e74c3c', apiName: 'Beran' },
    byk:     { name: 'Byk',      emoji: '♉', color: '#27ae60', apiName: 'Býk' },
    blizenci:{ name: 'Blíženci', emoji: '♊', color: '#f39c12', apiName: 'Blíženci' },
    rak:     { name: 'Rak',      emoji: '♋', color: '#2980b9', apiName: 'Rak' },
    lev:     { name: 'Lev',      emoji: '♌', color: '#e67e22', apiName: 'Lev' },
    panna:   { name: 'Panna',    emoji: '♍', color: '#8e44ad', apiName: 'Panna' },
    vahy:    { name: 'Váhy',     emoji: '♎', color: '#16a085', apiName: 'Váhy' },
    stir:    { name: 'Štír',     emoji: '♏', color: '#c0392b', apiName: 'Štír' },
    strelec: { name: 'Střelec',  emoji: '♐', color: '#d35400', apiName: 'Střelec' },
    kozoroh: { name: 'Kozoroh',  emoji: '♑', color: '#7f8c8d', apiName: 'Kozoroh' },
    vodnar:  { name: 'Vodnář',   emoji: '♒', color: '#2471a3', apiName: 'Vodnář' },
    ryby:    { name: 'Ryby',     emoji: '♓', color: '#1a5276', apiName: 'Ryby' }
};

const moonPhases = [
    { name: 'Nov — čas nových začátků',       emoji: '🌑' },
    { name: 'Dorůstající srpek — čas plánování', emoji: '🌒' },
    { name: 'Dorůstající čtvrť — čas akce',   emoji: '🌓' },
    { name: 'Dorůstající měsíc — čas expanze',emoji: '🌔' },
    { name: 'Úplněk — čas naplnění',          emoji: '🌕' },
    { name: 'Couvající měsíc — čas vděčnosti',emoji: '🌖' },
    { name: 'Ubývající čtvrť — čas reflexe',  emoji: '🌗' },
    { name: 'Ubývající srpek — čas uvolnění', emoji: '🌘' },
];

function getMoonPhase() {
    const known = new Date('2000-01-06');
    const now   = new Date();
    const diff  = (now - known) / (1000 * 60 * 60 * 24);
    const cycle = 29.53;
    const phase = ((diff % cycle) + cycle) % cycle;
    return moonPhases[Math.min(Math.floor((phase / cycle) * 8), 7)];
}

// Jednoduché fallbacky pro případ výpadku API
const fallbackAffirmations = {
    beran:    'Má odvaha tvoří mosty tam, kde ostatní vidí propasti.',
    byk:      'Jsem pevným základem, ze kterého roste vše krásné a trvalé.',
    blizenci: 'Má zvídavost otvírá dveře, které jiní ani nevidí.',
    rak:      'Má intuice je dnes nejjasnějším světlem na mé cestě.',
    lev:      'Nesu v sobě slunce — a dnes ho naplno sdílím se světem.',
    panna:    'V každém detailu nalézám krásu a smysl, který ostatní přehlíží.',
    vahy:     'Přináším rovnováhu tam, kde ji svět nejvíce potřebuje.',
    stir:     'Z každé hloubky stoupám silnější — to je má přirozenost.',
    strelec:  'Má svoboda je má síla — dnes ji naplno žiji a sdílím.',
    kozoroh:  'Každý krok, který dělám, je investicí do mé budoucnosti.',
    vodnar:   'Má originalita je dar světu — dnes ji přijímám bez omluvy.',
    ryby:     'Jsem oceánem soucitu — hluboký, klidný a nekonečný.',
};

window.showAffirmation = async function (sign) {
    const signData = signs[sign];
    if (!signData) return;

    // Aktivní tlačítko
    document.querySelectorAll('.zodiac-btn').forEach(b => b.classList.remove('active'));
    const btn = document.querySelector(`.zodiac-btn[data-sign="${sign}"]`);
    if (btn) btn.classList.add('active');

    const horoskopLink = document.getElementById('btn-horoskop-link');
    if (horoskopLink) horoskopLink.href = `horoskopy.html#${sign}`;

    const moon = getMoonPhase();
    document.getElementById('moon-badge').innerHTML = `${moon.emoji} ${moon.name}`;
    document.getElementById('sign-emoji').textContent = signData.emoji;
    document.getElementById('sign-name').textContent = signData.name.toUpperCase();

    const card = document.getElementById('affirmation-card');
    card.style.borderColor = signData.color + '44';

    // Zobraz kartu s loading textem
    document.getElementById('affirmation-text').textContent = '✨ Naladění na energii vašeho znamení…';
    document.getElementById('affirmation-sub').textContent = '';
    card.classList.add('show');
    card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    // Session cache — vyhne se opakovaným API voláním
    const cacheKey = `mh_aff_${sign}_${new Date().toDateString()}`;
    try {
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
            const { text } = JSON.parse(cached);
            document.getElementById('affirmation-text').textContent = `„${text}"`;
            document.getElementById('affirmation-sub').textContent = moon.name;
            try { localStorage.setItem('mh_last_affirmation_sign', sign); } catch (e) { }
            return;
        }
    } catch (e) { }

    try {
        const data = await window.callAPI('/horoscope', { sign: signData.apiName, period: 'daily' });

        const parsed = typeof data.response === 'string' ? JSON.parse(data.response) : data.response;
        const affirmation = parsed?.affirmation;
        if (!affirmation) throw new Error('No affirmation in response');

        document.getElementById('affirmation-text').textContent = `„${affirmation}"`;
        document.getElementById('affirmation-sub').textContent = moon.name;

        try { sessionStorage.setItem(cacheKey, JSON.stringify({ text: affirmation })); } catch (e) { }

    } catch (err) {
        console.warn('[Afirmace] API fallback:', err.message);
        const text = fallbackAffirmations[sign] || 'Jsem v souladu se svou nejhlubší pravdou.';
        document.getElementById('affirmation-text').textContent = `„${text}"`;
        document.getElementById('affirmation-sub').textContent = moon.name;
    }

    try { localStorage.setItem('mh_last_affirmation_sign', sign); } catch (e) { }
};

function copyAffirmation() {
    const raw = document.getElementById('affirmation-text').textContent;
    const text = raw.replace(/^„|"$/g, '').trim();
    navigator.clipboard.writeText(text + ' — Mystická Hvězda').then(() => {
        const el = document.getElementById('copy-confirm');
        el.style.display = 'block';
        setTimeout(() => el.style.display = 'none', 2000);
    });
}

function shareAffirmation() {
    const raw = document.getElementById('affirmation-text').textContent;
    const text = raw.replace(/^„|"$/g, '').trim();
    if (navigator.share) {
        navigator.share({ title: 'Moje dnešní afirmace', text, url: 'https://mystickahvezda.cz/afirmace.html' });
    } else {
        copyAffirmation();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.zodiac-btn[data-sign]').forEach(btn => {
        btn.addEventListener('click', () => showAffirmation(btn.dataset.sign));
    });
    document.getElementById('btn-copy-affirmation').addEventListener('click', copyAffirmation);
    document.getElementById('btn-share-affirmation').addEventListener('click', shareAffirmation);

    try {
        const last = localStorage.getItem('mh_last_affirmation_sign');
        if (last && signs[last]) showAffirmation(last);
    } catch (e) { }
});
