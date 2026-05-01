import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const cardsPath = path.join(rootDir, 'data', 'tarot-cards.json');
const pagePath = path.join(rootDir, 'tarot-vyznam-karet.html');

const majorArcana = new Set([
    'Blázen',
    'Mág',
    'Velekněžka',
    'Císařovna',
    'Císař',
    'Velekněz',
    'Milenci',
    'Vůz',
    'Síla',
    'Poustevník',
    'Kolo štěstí',
    'Spravedlnost',
    'Viselec',
    'Smrt',
    'Mírnost',
    'Ďábel',
    'Věž',
    'Hvězda',
    'Luna',
    'Slunce',
    'Soud',
    'Svět'
]);

const groupLabels = {
    major: 'Velká arkána',
    wands: 'Hůlky',
    cups: 'Poháry',
    swords: 'Meče',
    pentacles: 'Pentákly'
};

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function getCardGroup(name) {
    if (majorArcana.has(name)) return 'major';
    if (name.includes('holí')) return 'wands';
    if (name.includes('pohárů')) return 'cups';
    if (name.includes('mečů')) return 'swords';
    if (name.includes('pentáklů')) return 'pentacles';
    return 'major';
}

function getFirstSentence(text) {
    const cleaned = String(text || '').trim();
    if (!cleaned) return '';
    const firstDot = cleaned.indexOf('.');
    if (firstDot === -1) return cleaned.slice(0, 180);
    return cleaned.slice(0, firstDot + 1);
}

function buildCard(name, card) {
    const group = getCardGroup(name);
    const groupLabel = groupLabels[group] || 'Tarot';
    const image = card.image || 'img/tarot/tarot_placeholder.webp';
    const meaning = card.meaning || '';
    const interpretation = getFirstSentence(card.interpretation || '');

    return `                    <article class="tarot-meaning-card" data-group="${escapeHtml(group)}">
                        <div class="tarot-meaning-card__image">
                            <img loading="lazy" src="${escapeHtml(image)}" alt="${escapeHtml(name)} tarot karta" width="180" height="300">
                        </div>
                        <div class="tarot-meaning-card__body">
                            <div class="tarot-meaning-card__meta">${escapeHtml(groupLabel)}</div>
                            <h3>${escapeHtml(name)}</h3>
                            <p class="tarot-meaning-card__meaning">${escapeHtml(meaning)}</p>
                            <p>${escapeHtml(interpretation)}</p>
                            <a href="tarot.html?source=tarot_meaning_card&amp;card=${encodeURIComponent(name)}" class="tarot-meaning-card__link">Vyložit tarot s touto energií</a>
                        </div>
                    </article>`;
}

const cards = JSON.parse(fs.readFileSync(cardsPath, 'utf8'));
const generatedCards = Object.entries(cards)
    .map(([name, card]) => buildCard(name, card))
    .join('\n');

const page = fs.readFileSync(pagePath, 'utf8');
const cardsMarkerPattern = /<!-- TAROT_MEANING_CARDS_START -->[\s\S]*?<!-- TAROT_MEANING_CARDS_END -->/;
const countPattern = /<div id="tarot-card-count" class="tarot-meaning-count" aria-live="polite">.*?<\/div>/;

if (!cardsMarkerPattern.test(page) || !countPattern.test(page)) {
    throw new Error('tarot-vyznam-karet.html is missing generation markers.');
}

const nextPage = page
    .replace(
        cardsMarkerPattern,
        `<!-- TAROT_MEANING_CARDS_START -->\n${generatedCards}\n                    <!-- TAROT_MEANING_CARDS_END -->`
    )
    .replace(
        countPattern,
        `<div id="tarot-card-count" class="tarot-meaning-count" aria-live="polite">${Object.keys(cards).length} karet</div>`
    );

if (nextPage === page) {
    console.log(`Static tarot card entries already up to date in ${path.relative(rootDir, pagePath)}`);
} else {
    fs.writeFileSync(pagePath, nextPage, 'utf8');
    console.log(`Generated ${Object.keys(cards).length} static tarot card entries in ${path.relative(rootDir, pagePath)}`);
}
