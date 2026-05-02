import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const cardsPath = path.join(rootDir, 'data', 'tarot-cards.json');
const pagePath = path.join(rootDir, 'tarot-vyznam-karet.html');
const detailDir = path.join(rootDir, 'tarot-vyznam');
const siteOrigin = 'https://www.mystickahvezda.cz';

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

function getSentences(text, limit = 3) {
    return String(text || '')
        .split(/(?<=[.!?])\s+/)
        .map(sentence => sentence.trim())
        .filter(Boolean)
        .slice(0, limit);
}

function slugify(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function detailFileName(name) {
    return `${slugify(name)}.html`;
}

function detailHref(name) {
    return `tarot-vyznam/${detailFileName(name)}`;
}

function detailCanonical(name) {
    return `${siteOrigin}/tarot-vyznam/${detailFileName(name)}`;
}

function assetUrl(relativePath) {
    const normalized = String(relativePath || 'img/tarot/tarot_placeholder.webp').replace(/^\/+/, '');
    return `${siteOrigin}/${normalized}`;
}

function rootAssetPath(relativePath) {
    const normalized = String(relativePath || 'img/tarot/tarot_placeholder.webp').replace(/^\/+/, '');
    return `/${normalized}`;
}

function compactText(value, maxLength = 155) {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength - 1).trim()}…`;
}

function jsonLd(value) {
    return JSON.stringify(value, null, 8).replace(/</g, '\\u003c');
}

function getReadingAngles(group, name, meaning) {
    const base = {
        major: {
            love: `${name} v lásce mluví o velkém tématu vztahu: o tom, co už nelze přehlížet a co potřebuje vědomé rozhodnutí.`,
            work: `V práci karta ${name} ukazuje směr, kde má větší váhu dlouhodobý smysl než rychlá reakce.`,
            action: `Dnes si polož otázku, kde se energie „${meaning}“ už objevuje a co po tobě chce v praxi.`
        },
        wands: {
            love: `${name} ve vztazích přináší oheň, odvahu a potřebu jednat otevřeně místo čekání na dokonalý okamžik.`,
            work: `V práci karta ${name} podporuje akci, kreativitu a jasnější rozhodnutí, kam chceš směřovat energii.`,
            action: `Vyber jeden krok, který posune téma „${meaning}“ z úvah do pohybu.`
        },
        cups: {
            love: `${name} v lásce otevírá citovou rovinu: potřebu naslouchat, pojmenovat emoce a nelhat si o tom, co cítíš.`,
            work: `V práci karta ${name} ukazuje, jak moc do situace vstupují vztahy, intuice a vnitřní motivace.`,
            action: `Zastav se u pocitu, který téma „${meaning}“ vyvolává, a převeď ho do jedné klidné věty.`
        },
        swords: {
            love: `${name} ve vztazích žádá pravdivou komunikaci, jasné hranice a ochotu slyšet i nepohodlnou část příběhu.`,
            work: `V práci karta ${name} pomáhá oddělit fakta od domněnek a udělat rozhodnutí s čistší hlavou.`,
            action: `Napiš si, kde tě téma „${meaning}“ vede k přesnějším slovům nebo férovější hranici.`
        },
        pentacles: {
            love: `${name} v lásce připomíná důvěru budovanou činy, stabilitu a péči, která je vidět v každodennosti.`,
            work: `V práci karta ${name} míří k praxi: penězům, tělu, času, výsledkům a tomu, co má pevný základ.`,
            action: `Udělej jeden konkrétní krok, který energii „${meaning}“ ukotví v reálném světě.`
        }
    };

    return base[group] || base.major;
}

function getRelatedCards(entries, index, limit = 3) {
    const [name] = entries[index];
    const group = getCardGroup(name);
    const candidates = [];

    const addCandidate = (candidate) => {
        if (!candidate) return;
        const [candidateName, candidateCard] = candidate;
        if (!candidateName || candidateName === name) return;
        if (candidates.some(([existingName]) => existingName === candidateName)) return;
        candidates.push([candidateName, candidateCard]);
    };

    addCandidate(entries[index - 1]);
    addCandidate(entries[index + 1]);

    for (const entry of entries) {
        if (candidates.length >= limit) break;
        if (getCardGroup(entry[0]) === group) addCandidate(entry);
    }

    return candidates.slice(0, limit);
}

function buildRelatedCardLinks(relatedCards) {
    return relatedCards
        .map(([relatedName, relatedCard]) => {
            const relatedGroup = groupLabels[getCardGroup(relatedName)] || 'Tarot';
            return `<a class="tarot-related-card" href="/${escapeHtml(detailHref(relatedName))}">
                        <span>${escapeHtml(relatedGroup)}</span>
                        <strong>${escapeHtml(relatedName)}</strong>
                        <small>${escapeHtml(relatedCard.meaning || '')}</small>
                    </a>`;
        })
        .join('\n                    ');
}

function buildCard(name, card) {
    const group = getCardGroup(name);
    const groupLabel = groupLabels[group] || 'Tarot';
    const image = card.image || 'img/tarot/tarot_placeholder.webp';
    const meaning = card.meaning || '';
    const interpretation = getFirstSentence(card.interpretation || '');
    const detail = detailHref(name);

    return `                    <article class="tarot-meaning-card" data-group="${escapeHtml(group)}" data-card="${escapeHtml(name)}">
                        <div class="tarot-meaning-card__image">
                            <img loading="lazy" src="${escapeHtml(image)}" alt="${escapeHtml(name)} tarot karta" width="180" height="300">
                        </div>
                        <div class="tarot-meaning-card__body">
                            <div class="tarot-meaning-card__meta">${escapeHtml(groupLabel)}</div>
                            <h3><a href="${escapeHtml(detail)}">${escapeHtml(name)}</a></h3>
                            <p class="tarot-meaning-card__meaning">${escapeHtml(meaning)}</p>
                            <p>${escapeHtml(interpretation)}</p>
                            <a href="${escapeHtml(detail)}" class="tarot-meaning-card__link">Význam karty</a>
                            <a href="tarot.html?source=tarot_meaning_card&amp;card=${encodeURIComponent(name)}" class="tarot-meaning-card__link">Vyložit tarot s touto energií</a>
                        </div>
                    </article>`;
}

function buildDetailPage(name, card, relatedCards = []) {
    const group = getCardGroup(name);
    const groupLabel = groupLabels[group] || 'Tarot';
    const image = card.image || 'img/tarot/tarot_placeholder.webp';
    const meaning = card.meaning || '';
    const interpretation = card.interpretation || getFirstSentence(meaning);
    const sentences = getSentences(interpretation, 4);
    const angles = getReadingAngles(group, name, meaning);
    const canonical = detailCanonical(name);
    const encodedName = encodeURIComponent(name);
    const description = compactText(`Karta ${name} v tarotu znamená: ${meaning}. Výklad pro lásku, práci i osobní rozhodnutí s přímým vstupem do online tarotu.`);
    const title = `${name} tarot význam | ${groupLabel} | Mystická Hvězda`;
    const relatedLinks = buildRelatedCardLinks(relatedCards);
    const articleSchema = {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: `${name} tarot význam`,
        description,
        image: assetUrl(image),
        author: { '@type': 'Organization', name: 'Mystická Hvězda', url: siteOrigin },
        publisher: {
            '@type': 'Organization',
            name: 'Mystická Hvězda',
            logo: { '@type': 'ImageObject', url: `${siteOrigin}/img/logo-3d.webp` }
        },
        mainEntityOfPage: canonical,
        inLanguage: 'cs-CZ',
        about: [
            { '@type': 'Thing', name: 'Tarot' },
            { '@type': 'Thing', name },
            { '@type': 'Thing', name: groupLabel }
        ]
    };
    const breadcrumbSchema = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Domů', item: `${siteOrigin}/` },
            { '@type': 'ListItem', position: 2, name: 'Význam tarotových karet', item: `${siteOrigin}/tarot-vyznam-karet.html` },
            { '@type': 'ListItem', position: 3, name, item: canonical }
        ]
    };
    const faqSchema = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
            {
                '@type': 'Question',
                name: `Co znamená karta ${name} v tarotu?`,
                acceptedAnswer: {
                    '@type': 'Answer',
                    text: `${name} nese téma: ${meaning}. Konkrétní výklad vždy závisí na otázce, pozici ve výkladu a dalších kartách.`
                }
            },
            {
                '@type': 'Question',
                name: `Je ${name} dobrá nebo špatná karta?`,
                acceptedAnswer: {
                    '@type': 'Answer',
                    text: `Tarotová karta ${name} není sama o sobě dobrá ani špatná. Ukazuje energii situace a praktický směr, se kterým můžeš vědomě pracovat.`
                }
            }
        ]
    };

    return `<!DOCTYPE html>
<html lang="cs">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}">
    <meta name="keywords" content="${escapeHtml(`${name} tarot význam, ${name} tarot, tarot karta ${name}, význam tarotových karet`)}">
    <meta name="robots" content="index, follow">
    <meta name="theme-color" content="#0a0a1a">
    <link rel="canonical" href="${escapeHtml(canonical)}">
    <meta property="og:type" content="article">
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:url" content="${escapeHtml(canonical)}">
    <meta property="og:image" content="${escapeHtml(assetUrl(image))}">
    <meta property="og:locale" content="cs_CZ">
    <meta property="og:site_name" content="Mystická Hvězda">
    <meta name="twitter:card" content="summary_large_image">
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🔮</text></svg>">
    <link rel="manifest" href="/manifest.json">
    <link rel="apple-touch-icon" href="/img/icon-192.webp">
    <link rel="stylesheet" href="/fonts/local-fonts.css">
    <link rel="stylesheet" href="/css/style.v2.min.css?v=11">
    <link rel="stylesheet" href="/css/pages/tarot-meaning-hub.css">
    <script type="application/ld+json">
${jsonLd([articleSchema, breadcrumbSchema, faqSchema])}
    </script>
    <script src="/js/dist/analytics-init.js" defer></script>
    <script src="/js/dist/analytics.js?v=7" defer></script>
</head>
<body>
    <a href="#main-content" class="skip-link">Přeskočit na obsah</a>
    <div class="stars" aria-hidden="true"></div>
    <div id="header-placeholder"></div>

    <main id="main-content">
        <section class="section section--hero tarot-card-detail-hero">
            <div class="container tarot-card-detail-hero__inner">
                <div class="tarot-card-detail-hero__copy">
                    <nav class="breadcrumb" aria-label="Drobečková navigace">
                        <a href="/">Domů</a> &raquo; <a href="/tarot-vyznam-karet.html">Význam tarotových karet</a> &raquo; ${escapeHtml(name)}
                    </nav>
                    <span class="section__badge">${escapeHtml(groupLabel)}</span>
                    <h1 class="section__title">${escapeHtml(name)} tarot význam</h1>
                    <p class="section__text hero__subtitle">${escapeHtml(meaning)}</p>
                    <div class="tarot-card-detail-actions">
                        <a href="/tarot.html?source=tarot_card_detail&amp;card=${encodedName}" class="btn btn--primary">Vyložit kartu ${escapeHtml(name)}</a>
                        <a href="/tarot-vyznam-karet.html?source=tarot_card_detail&amp;card=${encodedName}" class="btn btn--ghost">Zpět na všech 78 karet</a>
                    </div>
                </div>
                <div class="tarot-card-detail-hero__image">
                    <img src="${escapeHtml(rootAssetPath(image))}" alt="${escapeHtml(name)} tarot karta" width="300" height="500">
                </div>
            </div>
        </section>

        <section class="section section--alt">
            <div class="container tarot-card-detail-layout">
                <article class="tarot-card-detail-content">
                    <span class="section__badge">Hlavní výklad</span>
                    <h2>Co znamená karta ${escapeHtml(name)}</h2>
                    ${sentences.map(sentence => `<p>${escapeHtml(sentence)}</p>`).join('\n                    ')}

                    <h2>${escapeHtml(name)} v lásce</h2>
                    <p>${escapeHtml(angles.love)}</p>

                    <h2>${escapeHtml(name)} v práci a rozhodování</h2>
                    <p>${escapeHtml(angles.work)}</p>

                    <h2>Co si z karty odnést dnes</h2>
                    <p>${escapeHtml(angles.action)}</p>
                </article>

                <aside class="tarot-card-detail-panel" aria-label="Rychlý přehled karty">
                    <h2>Rychlý přehled</h2>
                    <dl>
                        <div><dt>Arkánum</dt><dd>${escapeHtml(groupLabel)}</dd></div>
                        <div><dt>Hlavní téma</dt><dd>${escapeHtml(meaning)}</dd></div>
                        <div><dt>Otázka pro tebe</dt><dd>Kde se toto téma ukazuje právě teď?</dd></div>
                    </dl>
                    <a href="/tarot.html?source=tarot_card_detail_panel&amp;card=${encodedName}" class="btn btn--primary">Použít ve výkladu</a>
                </aside>
            </div>
        </section>

        <section class="section">
            <div class="container">
                <div class="section__header">
                    <span class="section__badge">Související karty</span>
                    <h2 class="section__title">Kam pokračovat dál</h2>
                    <p class="section__text">Propoj význam karty ${escapeHtml(name)} s dalšími kartami ze stejného tarotovému toku.</p>
                </div>
                <div class="tarot-related-card-grid">
                    ${relatedLinks}
                </div>
            </div>
        </section>

        <section class="section">
            <div class="container u-narrow-center-760">
                <div class="section__header">
                    <span class="section__badge">Časté otázky</span>
                    <h2 class="section__title">${escapeHtml(name)} v tarotu</h2>
                </div>
                <details class="faq-item">
                    <summary>Co znamená karta ${escapeHtml(name)} v tarotu?</summary>
                    <p>${escapeHtml(name)} nese téma: ${escapeHtml(meaning)}. Přesný význam se mění podle otázky, pozice a okolních karet.</p>
                </details>
                <details class="faq-item">
                    <summary>Je ${escapeHtml(name)} dobré nebo špatné znamení?</summary>
                    <p>Karta není rozsudek. Ukazuje energii, se kterou můžeš vědomě pracovat, a pomáhá pojmenovat další krok.</p>
                </details>
                <details class="faq-item">
                    <summary>Jak kartu ${escapeHtml(name)} použít v online výkladu?</summary>
                    <p>Začni jasnou otázkou a nech kartu zasadit do kontextu. Online výklad ti pomůže propojit symbol s konkrétní situací.</p>
                </details>
                <div class="tarot-meaning-hero__actions">
                    <a href="/tarot.html?source=tarot_card_detail_bottom&amp;card=${encodedName}" class="btn btn--primary">Vyložit tarot s touto kartou</a>
                    <a href="/tarot-vyznam-karet.html" class="btn btn--ghost">Prohlédnout všechny karty</a>
                </div>
            </div>
        </section>
    </main>

    <div id="footer-placeholder"></div>
    <script src="/js/dist/api-config.js?v=5" defer></script>
    <script src="/js/dist/templates.js?v=10" defer></script>
    <script src="/js/dist/auth-client.js?v=5" defer></script>
    <script src="/js/dist/components.js?v=10" defer></script>
    <script type="module" src="/js/dist/main.js?v=10"></script>
</body>
</html>
`;
}

function writeIfChanged(filePath, content) {
    if (fs.existsSync(filePath) && fs.readFileSync(filePath, 'utf8') === content) {
        return false;
    }

    fs.writeFileSync(filePath, content, 'utf8');
    return true;
}

function generateDetailPages(cards) {
    fs.mkdirSync(detailDir, { recursive: true });
    const entries = Object.entries(cards);
    const desiredFiles = new Set();
    let changed = 0;

    for (const [index, [name, card]] of entries.entries()) {
        const fileName = detailFileName(name);
        desiredFiles.add(fileName);
        const filePath = path.join(detailDir, fileName);
        if (writeIfChanged(filePath, buildDetailPage(name, card, getRelatedCards(entries, index)))) changed += 1;
    }

    for (const entry of fs.readdirSync(detailDir, { withFileTypes: true })) {
        if (entry.isFile() && entry.name.endsWith('.html') && !desiredFiles.has(entry.name)) {
            fs.unlinkSync(path.join(detailDir, entry.name));
            changed += 1;
        }
    }

    return { total: desiredFiles.size, changed };
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

const detailResult = generateDetailPages(cards);
console.log(`Generated ${detailResult.total} tarot card detail page(s); changed ${detailResult.changed}.`);
