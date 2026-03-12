/**
 * Programmatic Horoscope Day Pages
 * GET /horoskop/:sign/:date  → Server-rendered HTML page for SEO
 * GET /horoskop/:sign        → Redirects to today's date
 * GET /sitemap-horoscopes.xml → Dynamic sitemap for Google
 *
 * Each sign+date combination is a unique, indexable URL targeting
 * long-tail searches like "horoskop štír 12 března 2026".
 */
import express from 'express';
import { callGemini } from '../services/gemini.js';
import { getCachedHoroscope, saveCachedHoroscope } from '../services/astrology.js';

export const router = express.Router();

const SIGN_MAP = {
    'beran':    { name: 'Beran',    nameGen: 'Berana',    symbol: '♈', dates: '21.3. – 19.4.' },
    'byk':      { name: 'Býk',      nameGen: 'Býka',      symbol: '♉', dates: '20.4. – 20.5.' },
    'blizenci': { name: 'Blíženci', nameGen: 'Blíženců',  symbol: '♊', dates: '21.5. – 20.6.' },
    'rak':      { name: 'Rak',      nameGen: 'Raka',      symbol: '♋', dates: '21.6. – 22.7.' },
    'lev':      { name: 'Lev',      nameGen: 'Lva',       symbol: '♌', dates: '23.7. – 22.8.' },
    'panna':    { name: 'Panna',    nameGen: 'Panny',     symbol: '♍', dates: '23.8. – 22.9.' },
    'vahy':     { name: 'Váhy',     nameGen: 'Vah',       symbol: '♎', dates: '23.9. – 22.10.' },
    'stir':     { name: 'Štír',     nameGen: 'Štíra',     symbol: '♏', dates: '23.10. – 21.11.' },
    'strelec':  { name: 'Střelec',  nameGen: 'Střelce',   symbol: '♐', dates: '22.11. – 21.12.' },
    'kozoroh':  { name: 'Kozoroh',  nameGen: 'Kozoroha',  symbol: '♑', dates: '22.12. – 19.1.' },
    'vodnar':   { name: 'Vodnář',   nameGen: 'Vodnáře',   symbol: '♒', dates: '20.1. – 18.2.' },
    'ryby':     { name: 'Ryby',     nameGen: 'Ryb',       symbol: '♓', dates: '19.2. – 20.3.' },
};

const CZECH_MONTHS = ['ledna', 'února', 'března', 'dubna', 'května', 'června',
    'července', 'srpna', 'září', 'října', 'listopadu', 'prosince'];

function formatCzechDate(dateStr) {
    const [year, month, day] = dateStr.split('-').map(Number);
    return `${day}. ${CZECH_MONTHS[month - 1]} ${year}`;
}

function shiftDate(dateStr, days) {
    const d = new Date(dateStr + 'T12:00:00Z');
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().split('T')[0];
}

function getTodayStr() {
    return new Date().toISOString().split('T')[0];
}

// ============================================================
// DYNAMIC SITEMAP — /sitemap-horoscopes.xml
// Covers last 60 days + next 7 days for all 12 signs
// ============================================================
router.get('/sitemap-horoscopes.xml', (req, res) => {
    const today = getTodayStr();
    const dates = [];
    for (let i = -60; i <= 7; i++) {
        dates.push(shiftDate(today, i));
    }

    const urls = [];
    for (const date of dates) {
        for (const slug of Object.keys(SIGN_MAP)) {
            const loc = `https://mystickahvezda.cz/horoskop/${slug}/${date}`;
            const priority = date === today ? '1.0' : date > today ? '0.6' : '0.7';
            urls.push(`  <url>
    <loc>${loc}</loc>
    <lastmod>${date}</lastmod>
    <changefreq>daily</changefreq>
    <priority>${priority}</priority>
  </url>`);
        }
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=43200');
    res.send(xml);
});

// ============================================================
// REDIRECT /:sign → today's date
// ============================================================
router.get('/:sign', (req, res, next) => {
    const slug = req.params.sign.toLowerCase();
    if (!SIGN_MAP[slug]) return next();
    res.redirect(301, `/horoskop/${slug}/${getTodayStr()}`);
});

// ============================================================
// MAIN ROUTE — /horoskop/:sign/:date
// ============================================================
router.get('/:sign/:date', async (req, res, next) => {
    try {
        const slug = req.params.sign.toLowerCase();
        const date = req.params.date;

        const signData = SIGN_MAP[slug];
        if (!signData) return next();

        // Validate date format
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return next();
        const targetDate = new Date(date + 'T12:00:00Z');
        if (isNaN(targetDate.getTime())) return next();

        // Restrict range: 2 years back, 30 days forward
        const todayMs = Date.now();
        const diffDays = (targetDate.getTime() - todayMs) / 86400000;
        if (diffDays > 30 || diffDays < -730) return next();

        const todayStr = getTodayStr();
        const czechDate = formatCzechDate(date);

        // Cache key matches the existing daily cache pattern in astrology.js
        const signNormalized = signData.name.toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const cacheKey = `${signNormalized}_daily_${date}_v2`;

        // Try cache first
        let parsed;
        const cached = await getCachedHoroscope(cacheKey);
        if (cached) {
            try {
                parsed = JSON.parse(cached.response);
            } catch {
                parsed = { prediction: cached.response, affirmation: '', luckyNumbers: [] };
            }
        } else {
            // Generate via Gemini
            const prompt = `Jsi laskavý astrologický průvodce.\nGeneruj denní horoskop ve formátu JSON.\nOdpověď MUSÍ být validní JSON objekt bez markdown formátování (žádné \`\`\`json).\nStruktura:\n{\n  "prediction": "Text horoskopu (3-4 věty). Hlavní energie dne a jedna konkrétní rada.",\n  "affirmation": "Krátká pozitivní afirmace pro tento den.",\n  "luckyNumbers": [číslo1, číslo2, číslo3, číslo4]\n}\nText piš česky, poeticky a povzbudivě.`;
            const message = `Znamení: ${signData.name}\nDatum: ${czechDate}`;

            const raw = await callGemini(prompt, message);
            const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
            await saveCachedHoroscope(cacheKey, signData.name, 'daily', cleaned, 'Denní inspirace');
            try {
                parsed = JSON.parse(cleaned);
            } catch {
                parsed = { prediction: cleaned, affirmation: '', luckyNumbers: [] };
            }
        }

        const prevDate = shiftDate(date, -1);
        const nextDate = shiftDate(date, 1);
        const hasNext = diffDays < 0;
        const isToday = date === todayStr;

        const canonicalUrl = `https://mystickahvezda.cz/horoskop/${slug}/${date}`;
        const titleStr = `Horoskop ${signData.nameGen} — ${czechDate} | Mystická Hvězda`;
        const prediction = parsed.prediction || '';
        const descStr = `Denní horoskop pro ${signData.name} na ${czechDate}. ${prediction.substring(0, 130).replace(/"/g, '&quot;')}…`;
        // Only index past+today, not future
        const robotsContent = diffDays > 7 ? 'noindex, follow' : 'index, follow';

        const luckyNumbersHtml = Array.isArray(parsed.luckyNumbers) && parsed.luckyNumbers.length
            ? `<div style="display:flex;align-items:center;gap:1rem;flex-wrap:wrap;margin-bottom:2rem;">
                <span style="color:rgba(255,255,255,0.6);font-size:0.9rem;">✨ Čísla štěstí:</span>
                ${parsed.luckyNumbers.map(n =>
                `<span style="background:rgba(212,175,55,0.15);border:1px solid rgba(212,175,55,0.3);border-radius:50%;width:40px;height:40px;display:inline-flex;align-items:center;justify-content:center;font-family:var(--font-heading);color:var(--color-mystic-gold);font-weight:600;">${Number(n)}</span>`
            ).join('')}
              </div>`
            : '';

        const affirmationHtml = parsed.affirmation
            ? `<div style="background:rgba(212,175,55,0.08);border-left:3px solid var(--color-mystic-gold);border-radius:0 12px 12px 0;padding:1.25rem 1.5rem;margin-bottom:2rem;">
                <p style="font-family:var(--font-heading);color:var(--color-mystic-gold);font-size:0.8rem;letter-spacing:2px;text-transform:uppercase;margin-bottom:0.5rem;">Afirmace dne</p>
                <p style="font-size:1.05rem;color:rgba(255,255,255,0.9);font-style:italic;margin:0;">&ldquo;${parsed.affirmation}&rdquo;</p>
              </div>`
            : '';

        const otherSignsHtml = Object.entries(SIGN_MAP).map(([s, d]) =>
            `<a href="/horoskop/${s}/${date}" class="zodiac-card" ${s === slug ? 'style="border-color:rgba(212,175,55,0.5);"' : ''}>
                <span class="zodiac-card__symbol">${d.symbol}</span>
                <h3 class="zodiac-card__name">${d.name}</h3>
                <span class="zodiac-card__dates">${d.dates}</span>
             </a>`
        ).join('');

        const html = `<!DOCTYPE html>
<html lang="cs">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <title>${titleStr}</title>
  <meta name="description" content="${descStr}">
  <meta name="keywords" content="horoskop ${signData.name.toLowerCase()}, ${signData.name.toLowerCase()} horoskop, denní horoskop ${signData.name.toLowerCase()}, astrologie ${czechDate}">
  <meta name="robots" content="${robotsContent}">
  <meta name="theme-color" content="#0a0a1a">

  <meta property="og:type" content="article">
  <meta property="og:title" content="${titleStr}">
  <meta property="og:description" content="${descStr}">
  <meta property="og:image" content="https://mystickahvezda.cz/img/icon-zodiac.webp">
  <meta property="og:locale" content="cs_CZ">
  <meta property="og:url" content="${canonicalUrl}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${titleStr}">
  <meta name="twitter:description" content="${descStr}">

  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "${titleStr.replace(/"/g, '\\"')}",
    "description": "${descStr.replace(/"/g, '\\"')}",
    "datePublished": "${date}T00:00:00+01:00",
    "dateModified": "${date}T00:00:00+01:00",
    "inLanguage": "cs",
    "publisher": {
      "@type": "Organization",
      "name": "Mystická Hvězda",
      "url": "https://mystickahvezda.cz"
    },
    "mainEntityOfPage": "${canonicalUrl}"
  }
  </script>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {"@type": "ListItem", "position": 1, "name": "Horoskopy", "item": "https://mystickahvezda.cz/horoskopy.html"},
      {"@type": "ListItem", "position": 2, "name": "${signData.name}", "item": "https://mystickahvezda.cz/horoskop/${slug}/${todayStr}"},
      {"@type": "ListItem", "position": 3, "name": "${czechDate}", "item": "${canonicalUrl}"}
    ]
  }
  </script>

  <link rel="canonical" href="${canonicalUrl}">
  <link rel="alternate" hreflang="cs" href="${canonicalUrl}">
  <link rel="prev" href="https://mystickahvezda.cz/horoskop/${slug}/${prevDate}">
  ${hasNext ? `<link rel="next" href="https://mystickahvezda.cz/horoskop/${slug}/${nextDate}">` : ''}

  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>${signData.symbol}</text></svg>">
  <link rel="manifest" href="/manifest.json">
  <link rel="apple-touch-icon" href="/img/icon-192.webp">

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap&subset=latin,latin-ext" rel="stylesheet">
  <link rel="stylesheet" href="/css/style.v2.min.css?v=9">
</head>
<body>
  <a href="#main-content" class="skip-link">Přeskočit na obsah</a>
  <div class="stars" aria-hidden="true"></div>
  <div id="header-placeholder"></div>

  <main id="main-content">

    <!-- HERO -->
    <section class="section section--hero" style="min-height:50vh;">
      <div class="container">
        <div class="hero__content">
          <nav aria-label="Drobečková navigace" style="margin-bottom:1rem;font-size:0.85rem;color:rgba(255,255,255,0.5);">
            <a href="/horoskopy.html" style="color:var(--color-mystic-gold);text-decoration:none;">Horoskopy</a>
            <span style="margin:0 0.5rem;">›</span>
            <a href="/horoskop/${slug}/${todayStr}" style="color:var(--color-mystic-gold);text-decoration:none;">${signData.name}</a>
            <span style="margin:0 0.5rem;">›</span>
            <span>${czechDate}</span>
          </nav>
          <p style="font-size:5rem;margin:0;line-height:1;" aria-hidden="true">${signData.symbol}</p>
          <h1 class="hero__title" style="font-size:clamp(1.8rem,5vw,3rem);">
            <span class="text-gradient">Horoskop ${signData.nameGen}</span>
          </h1>
          <p class="hero__subtitle" style="font-size:1.1rem;">${czechDate} • ${signData.dates}</p>
          ${isToday ? '<p style="display:inline-block;background:rgba(212,175,55,0.15);border:1px solid rgba(212,175,55,0.3);border-radius:20px;padding:0.3rem 1rem;font-size:0.85rem;color:var(--color-mystic-gold);">✨ Dnešní předpověď</p>' : ''}
        </div>
      </div>
    </section>

    <!-- HOROSCOPE CONTENT -->
    <section class="section section--alt">
      <div class="container" style="max-width:800px;">
        <div class="card" style="padding:2.5rem;" data-animate>
          <span class="section__badge">Denní inspirace • ${signData.name} ${signData.symbol}</span>
          <h2 style="font-family:var(--font-heading);color:var(--color-starlight);margin:1rem 0 1.5rem;font-size:1.6rem;">
            Co vám hvězdy říkají
          </h2>
          <p style="font-size:1.15rem;line-height:1.8;color:rgba(255,255,255,0.9);margin-bottom:2rem;">${prediction}</p>
          ${affirmationHtml}
          ${luckyNumbersHtml}

          <!-- Day navigation -->
          <div style="display:flex;justify-content:space-between;align-items:center;padding-top:1.5rem;border-top:1px solid rgba(255,255,255,0.08);flex-wrap:wrap;gap:0.75rem;">
            <a href="/horoskop/${slug}/${prevDate}" class="btn btn--glass" style="font-size:0.9rem;">‹ Předchozí den</a>
            ${!isToday ? `<a href="/horoskop/${slug}/${todayStr}" style="color:var(--color-mystic-gold);font-size:0.85rem;text-decoration:none;">→ Dnes</a>` : ''}
            ${hasNext ? `<a href="/horoskop/${slug}/${nextDate}" class="btn btn--glass" style="font-size:0.9rem;">Následující den ›</a>` : '<span></span>'}
          </div>
        </div>
      </div>
    </section>

    <!-- OTHER SIGNS SAME DAY -->
    <section class="section" style="padding-top:0;">
      <div class="container">
        <h3 style="font-family:var(--font-heading);color:var(--color-mystic-gold);text-align:center;margin-bottom:1.5rem;font-size:1.1rem;letter-spacing:1px;">
          Horoskop pro jiné znamení — ${czechDate}
        </h3>
        <div class="zodiac-grid" data-animate>
          ${otherSignsHtml}
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="section" style="padding-top:0;">
      <div class="container" style="max-width:700px;">
        <div class="cta-banner" data-animate>
          <div class="cta-banner__content">
            <h2 class="cta-banner__title">Chcete přesnější horoskop?</h2>
            <p class="cta-banner__text">Zadejte datum, čas a místo narození pro plně personalizovaný natální výklad s přesností až 95 %.</p>
            <a href="/cenik.html" class="btn btn--primary btn--lg">Vyzkoušet zdarma</a>
          </div>
        </div>
      </div>
    </section>

  </main>

  <div id="footer-placeholder"></div>

  <script src="/js/api-config.js?v=5" defer></script>
  <script src="/js/templates.js?v=10" defer></script>
  <script src="/js/auth-client.js?v=5" defer></script>
  <script src="/js/components.js?v=10" defer></script>
  <script type="module" src="/js/main.js?v=10"></script>
</body>
</html>`;

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        // Cache 1h browser, 24h CDN — content is stable once generated
        res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400');
        res.send(html);

    } catch (err) {
        console.error('[HoroscopePage] Error:', err.message);
        next(err);
    }
});

export default router;
