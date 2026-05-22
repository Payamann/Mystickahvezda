import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ZODIAC_SIGNS from '../data/zodiac-signs.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../../');
const OUTPUT_DIR = path.join(ROOT, 'horoskop');
const SITEMAP_ENTRIES_PATH = path.join(ROOT, 'data/zodiac-sitemap.json');

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

function buildPage(sign) {
    const strengthsList = sign.strengths.map(s => `<li>${s}</li>`).join('\n                    ');
    const weaknessesList = sign.weaknesses.map(w => `<li>${w}</li>`).join('\n                    ');
    const compatList = sign.compatible_signs.map(c => `
        <span class="sign-chip">${c}</span>`).join('');
    const luckyNums = sign.lucky_numbers.map(n => `<span class="sign-number">${n}</span>`).join(' ');
    const natalCtaLink = sign.natal_cta.link.includes('source=')
        ? sign.natal_cta.link
        : `${sign.natal_cta.link}?source=seo_zodiac_sign&feature=natal_chart&sign=${sign.slug}`;
    const answerSummary = sign.answer_summary
        || `${sign.name} je ${sign.en}, znamení zvěrokruhu pro období ${sign.dates}. Patří k elementu ${sign.element}, vládne mu ${sign.ruling_planet} a v astrologii popisuje základní temperament, vztahový styl a první vrstvu osobního horoskopu.`;

    const faqSchema = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
            {
                "@type": "Question",
                "name": `Jaké jsou silné stránky znamení ${sign.name}?`,
                "acceptedAnswer": { "@type": "Answer", "text": sign.strengths.join(', ') }
            },
            {
                "@type": "Question",
                "name": `S jakými znameními je ${sign.name} nejkompatibilnější?`,
                "acceptedAnswer": { "@type": "Answer", "text": sign.compatible_signs.join(', ') }
            },
            {
                "@type": "Question",
                "name": `Kdy se rodí ${sign.name}?`,
                "acceptedAnswer": { "@type": "Answer", "text": sign.dates }
            }
        ]
    }, null, 2);

    return `<!DOCTYPE html>
<html lang="cs">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <title>${sign.name} / ${sign.en} znamení: vlastnosti, láska a horoskop | Mystická Hvězda</title>
    <meta name="description" content="${sign.name} / ${sign.en} znamení (${sign.dates}): vlastnosti, láska, silné stránky, slabiny a partnerská kompatibilita. Pokračujte na natální kartu pro osobní výklad.">
    <meta name="robots" content="index, follow">

    <!-- Open Graph -->
    <meta property="og:title" content="${sign.name} / ${sign.en} znamení | Mystická Hvězda">
    <meta property="og:description" content="${sign.name} (${sign.dates}): vlastnosti, láska, silné stránky, slabiny a další krok k osobní natální kartě.">
    <meta property="og:type" content="article">
    <meta property="og:image" content="../img/hero-bg-2.webp">
    <meta property="og:url" content="https://www.mystickahvezda.cz/horoskop/${sign.slug}.html">
    <link rel="canonical" href="https://www.mystickahvezda.cz/horoskop/${sign.slug}.html">

    <!-- Fonts & Styles -->
    <link rel="stylesheet" href="/fonts/local-fonts.css">
    <link rel="stylesheet" href="../css/style.v2.css">
    <link rel="stylesheet" href="../css/pages/horoskop-znameni.css">

    <script type="application/ld+json">${faqSchema}</script>
</head>
<body>
    <div class="stars" aria-hidden="true"></div>
    <header class="header">
        <div class="container">
            <div class="header__inner">
                <a href="../index.html" class="logo">
                    <span class="sign-logo-text">Mystická<span class="text-gradient">Hvězda</span></span>
                </a>
                <nav class="nav">
                    <button class="nav__toggle" aria-label="Menu"><span></span><span></span><span></span></button>
                    <ul class="nav__list">
                        <li><a href="../index.html" class="nav__link">Domů</a></li>
                        <li><a href="../horoskopy.html" class="nav__link active">Horoskopy</a></li>
                        <li><a href="../blog.html" class="nav__link">Blog</a></li>
                        <li><a href="../slovnik.html" class="nav__link">Slovník</a></li>
                        <li><a href="../natalni-karta.html" class="nav__link">Natální Karta</a></li>
                        <li><a href="../tarot.html" class="nav__link">Tarot</a></li>
                    </ul>
                    <div class="auth-buttons sign-auth-buttons">
                        <a href="#" id="auth-register-btn" class="btn btn--secondary sign-register-btn">Registrace</a>
                        <a href="#" id="auth-btn" class="btn btn--primary">Přihlásit</a>
                    </div>
                </nav>
            </div>
        </div>
    </header>

    <main>
        <section class="sign-hero">
            <div class="container">
                <div class="bread"><a href="../index.html">Domů</a> &raquo; <a href="../horoskopy.html">Horoskopy</a> &raquo; ${sign.name}</div>
                <span class="sign-emoji">${sign.emoji}</span>
                <h1 class="hero__title">${sign.name} <span class="text-gradient">(${sign.en})</span></h1>
                <p class="sign-dates">📅 ${sign.dates}</p>

                <div class="sign-answer-box">
                    <strong class="sign-answer-label">Rychlá odpověď:</strong>
                    ${answerSummary}
                </div>

                <div class="sign-meta-grid">
                    <div class="meta-card">
                        <div class="meta-label">Element</div>
                        <div class="meta-value">${sign.element}</div>
                    </div>
                    <div class="meta-card">
                        <div class="meta-label">Vládce</div>
                        <div class="meta-value">${sign.ruling_planet}</div>
                    </div>
                    <div class="meta-card">
                        <div class="meta-label">Modalita</div>
                        <div class="meta-value">${sign.modality}</div>
                    </div>
                </div>
            </div>
        </section>

        <section class="section sign-section">
            <div class="container">
                <div class="sign-content">
                    <div class="sign-panel sign-panel--body">
                        ${sign.description}
                    </div>

                    <div class="traits-grid">
                        <div class="traits-card strengths">
                            <h3>✅ Silné stránky</h3>
                            <ul>${strengthsList}</ul>
                        </div>
                        <div class="traits-card weaknesses">
                            <h3>⚠️ Slabé stránky</h3>
                            <ul>${weaknessesList}</ul>
                        </div>
                    </div>

                    <div class="sign-panel">
                        <h2 class="sign-section-title">💞 Partnerská kompatibilita</h2>
                        <p class="sign-muted">Znamení, se kterými ${sign.name} přirozeně rezonuje:</p>
                        <div>${compatList}</div>
                        <div class="sign-center-action">
                            <a href="${sign.featured_tool.link}" class="btn btn--secondary sign-secondary-cta">${sign.featured_tool.label}</a>
                        </div>
                    </div>

                    <div class="sign-panel">
                        <h2 class="sign-section-title">🔢 Šťastná čísla</h2>
                        <div class="sign-number-grid">${luckyNums}</div>
                    </div>

                    <div class="sign-cta-panel">
                        <h2 class="sign-cta-title">Vaše hvězdná mapa jde hlouběji</h2>
                        <p class="sign-cta-text">Sluneční znamení je jen jedno ze stovek bodů vaší Natální mapy. Zjistěte, kde skutečně leží váš Ascendent, Měsíc v znamení a pozice klíčových planet.</p>
                        <a href="${natalCtaLink}" class="btn btn--primary sign-primary-cta">${sign.natal_cta.label}</a>
                    </div>

                    <!-- FAQ Section -->
                    <div class="sign-faq">
                        <h2 class="sign-section-title">❓ Nejčastější otázky o ${sign.name}</h2>
                        <div class="sign-faq-list">
                            <details class="sign-faq-item">
                                <summary class="sign-faq-summary">Kdy se rodí ${sign.name}?</summary>
                                <p class="sign-faq-answer">${sign.dates}</p>
                            </details>
                            <details class="sign-faq-item">
                                <summary class="sign-faq-summary">Jaký je element a vládce ${sign.name}?</summary>
                                <p class="sign-faq-answer">Element: <strong>${sign.element}</strong>. Vládnoucí planeta: <strong>${sign.ruling_planet}</strong>. Modalita: <strong>${sign.modality}</strong>.</p>
                            </details>
                            <details class="sign-faq-item sign-faq-item--last">
                                <summary class="sign-faq-summary">S jakými znameními je ${sign.name} nejkompatibilnější?</summary>
                                <p class="sign-faq-answer">Nejharmoničtější vztahy bývají se znameními: ${sign.compatible_signs.join(', ')}. Pro přesnou analýzu doporučujeme výpočet Synastrie (porovnání dvou Natálních map).</p>
                            </details>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    </main>

    <footer class="footer">
        <div class="container">
            <div class="footer__bottom">
                <p>© 2026 Mystická Hvězda. Všechna práva vyhrazena.</p>
            </div>
        </div>
    </footer>

    <script src="../js/dist/api-config.js" defer></script>
    <script src="../js/dist/auth-client.js?v=20260522-recovery-flush" defer></script>
    <script src="../js/dist/components.js" defer></script>
    <script type="module" src="../js/dist/main.js"></script>
</body>
</html>`;
}

const sitemapEntries = [];

for (const sign of ZODIAC_SIGNS) {
    const html = buildPage(sign);
    const outPath = path.join(OUTPUT_DIR, `${sign.slug}.html`);
    fs.writeFileSync(outPath, html, 'utf8');
    console.log(`✅ Vygenerováno: /horoskop/${sign.slug}.html`);

    if (sign.slug === 'vodnar') {
        const legacyHtml = html.replace(
            '<meta name="robots" content="index, follow">',
            '<meta name="robots" content="noindex, follow">'
        );
        fs.writeFileSync(path.join(OUTPUT_DIR, 'vodnár.html'), legacyHtml, 'utf8');
        console.log('✅ Vygenerováno: /horoskop/vodnár.html (legacy noindex)');
    }

    sitemapEntries.push({ url: `/horoskop/${sign.slug}.html`, changefreq: 'weekly', priority: '0.8' });
}

fs.writeFileSync(SITEMAP_ENTRIES_PATH, JSON.stringify(sitemapEntries, null, 2), 'utf8');
console.log(`\n🗺️  Sitemap data uložena: data/zodiac-sitemap.json`);
console.log(`🎉 Vygenerováno ${ZODIAC_SIGNS.length} stránek znamení!`);
