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
        <span style="display:inline-block; padding: 0.4rem 1rem; background: rgba(212,175,55,0.1); border: 1px solid rgba(212,175,55,0.3); border-radius: 50px; color: #d4af37; margin: 0.3rem; font-size: 0.95rem;">${c}</span>`).join('');
    const luckyNums = sign.lucky_numbers.map(n => `<span style="display:inline-flex; align-items:center; justify-content:center; width: 3rem; height: 3rem; border-radius: 50%; background: rgba(155,89,182,0.2); border: 1px solid rgba(155,89,182,0.4); font-family:'Cinzel',serif; font-size:1.1rem; color:white;">${n}</span>`).join(' ');

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
    <title>${sign.emoji} ${sign.name} (${sign.en}) – Horoskop, vlastnosti a láska | Mystická Hvězda</title>
    <meta name="description" content="${sign.name} (${sign.dates}): Vše o vlastnostech, silných stránkách, slabostech a partnerské kompatibilitě tohoto znamení. Element: ${sign.element}, vládce: ${sign.ruling_planet}.">
    <meta name="robots" content="index, follow">

    <!-- Open Graph -->
    <meta property="og:title" content="${sign.emoji} ${sign.name} – Horoskop a vlastnosti | Mystická Hvězda">
    <meta property="og:description" content="${sign.name} (${sign.dates}): Vlastnosti, silné stránky, slabiny a partnerská kompatibilita.">
    <meta property="og:type" content="article">
    <meta property="og:image" content="../img/hero-bg-2.png">
    <meta property="og:url" content="https://www.mystickahvezda.cz/horoskop/${sign.slug}.html">

    <!-- Fonts & Styles -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="../css/style.v2.css">

    <script type="application/ld+json">${faqSchema}</script>

    <style>
        .sign-hero { padding: 5rem 0 3rem; text-align: center; }
        .sign-emoji { font-size: 5rem; display: block; margin-bottom: 1rem; animation: float 4s ease-in-out infinite; }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-15px)} }
        .sign-dates { color: var(--color-mystic-gold); font-size: 1.1rem; letter-spacing: 1px; margin-bottom: 2rem; }
        .sign-meta-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 1rem; margin: 2rem 0; max-width: 700px; margin-inline: auto; }
        .meta-card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 1.2rem; text-align: center; }
        .meta-label { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px; color: var(--color-text-mutated); margin-bottom: 0.4rem; }
        .meta-value { font-family: 'Cinzel', serif; font-size: 1rem; color: var(--color-mystic-gold); }
        .sign-content { max-width: 800px; margin: 0 auto; }
        .traits-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin: 2rem 0; }
        .traits-card { background: rgba(255,255,255,0.04); border-radius: 16px; padding: 2rem; border: 1px solid rgba(255,255,255,0.08); }
        .traits-card.strengths { border-top: 3px solid #27ae60; }
        .traits-card.weaknesses { border-top: 3px solid #e74c3c; }
        .traits-card h3 { margin-top: 0; }
        .traits-card ul { padding-left: 1.2rem; }
        .traits-card li { margin-bottom: 0.5rem; }
        .bread a { color: var(--color-mystic-gold); text-decoration: none; }
        .bread { font-size: 0.9rem; color: var(--color-text-mutated); margin-bottom: 2rem; }
        @media(max-width:600px) { .traits-grid { grid-template-columns: 1fr; } }
    </style>
</head>
<body>
    <div class="stars" aria-hidden="true"></div>
    <header class="header">
        <div class="container">
            <div class="header__inner">
                <a href="../index.html" class="logo">
                    <span style="margin-left: 10px;">Mystická<span class="text-gradient">Hvězda</span></span>
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
                    <div class="auth-buttons" style="display: flex; gap: 0.5rem; align-items: center;">
                        <a href="#" id="auth-register-btn" class="btn btn--secondary" style="margin-left: 1rem; font-size: 0.9em; padding: 0.5rem 1rem;">Registrace</a>
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

        <section class="section" style="padding-top:0;">
            <div class="container">
                <div class="sign-content">
                    <div style="background: rgba(10,10,26,0.6); border: 1px solid rgba(255,255,255,0.05); border-radius: 20px; padding: 3rem; font-size: 1.1rem; line-height: 1.8; color: var(--color-text-light); margin-bottom: 2rem;">
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

                    <div style="background: rgba(10,10,26,0.6); border: 1px solid rgba(255,255,255,0.05); border-radius: 20px; padding: 2.5rem; margin-bottom: 2rem;">
                        <h2 style="margin-top:0; color: var(--color-mystic-gold);">💞 Partnerská kompatibilita</h2>
                        <p style="color: var(--color-text-mutated); margin-bottom: 1.5rem;">Znamení, se kterými ${sign.name} přirozeně rezonuje:</p>
                        <div>${compatList}</div>
                        <div style="margin-top: 2rem; text-align: center;">
                            <a href="${sign.featured_tool.link}" class="btn btn--secondary" style="font-size: 1rem;">${sign.featured_tool.label}</a>
                        </div>
                    </div>

                    <div style="background: rgba(10,10,26,0.6); border: 1px solid rgba(255,255,255,0.05); border-radius: 20px; padding: 2.5rem; margin-bottom: 2rem;">
                        <h2 style="margin-top:0; color: var(--color-mystic-gold);">🔢 Šťastná čísla</h2>
                        <div style="display: flex; flex-wrap: wrap; gap: 0.8rem; justify-content: center; margin-top: 1rem;">${luckyNums}</div>
                    </div>

                    <div style="background: linear-gradient(135deg, rgba(155,89,182,0.15), rgba(10,10,26,0.9)); border: 1px solid rgba(155,89,182,0.3); border-radius: 20px; padding: 3rem; text-align: center; margin-bottom: 2rem;">
                        <h2 style="margin-top:0; font-family:'Cinzel',serif; font-size: 1.8rem;">Vaše hvězdná mapa jde hlouběji</h2>
                        <p style="font-size: 1.1rem; line-height: 1.8; margin-bottom: 2rem; color: #cbd5e1;">Sluneční znamení je jen jedno ze stovek bodů vaší Natální mapy. Zjistěte, kde skutečně leží váš Ascendent, Měsíc v znamení a pozice klíčových planet.</p>
                        <a href="${sign.natal_cta.link}" class="btn btn--primary" style="font-size: 1.1rem; padding: 1.2rem 2.5rem;">${sign.natal_cta.label}</a>
                    </div>

                    <!-- FAQ Section -->
                    <div style="background: rgba(10,10,26,0.6); border: 1px solid rgba(255,255,255,0.05); border-radius: 20px; padding: 2.5rem;">
                        <h2 style="margin-top:0; color: var(--color-mystic-gold);">❓ Nejčastější otázky o ${sign.name}</h2>
                        <div style="margin-top: 1.5rem;">
                            <details style="border-bottom: 1px solid rgba(255,255,255,0.05); padding: 1rem 0; cursor: pointer;">
                                <summary style="font-weight:600; color:white;">Kdy se rodí ${sign.name}?</summary>
                                <p style="margin: 1rem 0 0; color: var(--color-text-mutated);">${sign.dates}</p>
                            </details>
                            <details style="border-bottom: 1px solid rgba(255,255,255,0.05); padding: 1rem 0; cursor: pointer;">
                                <summary style="font-weight:600; color:white;">Jaký je element a vládce ${sign.name}?</summary>
                                <p style="margin: 1rem 0 0; color: var(--color-text-mutated);">Element: <strong>${sign.element}</strong>. Vládnoucí planeta: <strong>${sign.ruling_planet}</strong>. Modalita: <strong>${sign.modality}</strong>.</p>
                            </details>
                            <details style="padding: 1rem 0; cursor: pointer;">
                                <summary style="font-weight:600; color:white;">S jakými znameními je ${sign.name} nejkompatibilnější?</summary>
                                <p style="margin: 1rem 0 0; color: var(--color-text-mutated);">Nejharmoničtější vztahy bývají se znameními: ${sign.compatible_signs.join(', ')}. Pro přesnou analýzu doporučujeme výpočet Synastrie (porovnání dvou Natálních map).</p>
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

    <script src="../js/api-config.js" defer></script>
    <script src="../js/auth-client.js" defer></script>
    <script src="../js/components.js" defer></script>
    <script type="module" src="../js/main.js"></script>
</body>
</html>`;
}

const sitemapEntries = [];

for (const sign of ZODIAC_SIGNS) {
    const html = buildPage(sign);
    const outPath = path.join(OUTPUT_DIR, `${sign.slug}.html`);
    fs.writeFileSync(outPath, html, 'utf8');
    console.log(`✅ Vygenerováno: /horoskop/${sign.slug}.html`);
    sitemapEntries.push({ url: `/horoskop/${sign.slug}.html`, changefreq: 'weekly', priority: '0.8' });
}

fs.writeFileSync(SITEMAP_ENTRIES_PATH, JSON.stringify(sitemapEntries, null, 2), 'utf8');
console.log(`\n🗺️  Sitemap data uložena: data/zodiac-sitemap.json`);
console.log(`🎉 Vygenerováno ${ZODIAC_SIGNS.length} stránek znamení!`);
