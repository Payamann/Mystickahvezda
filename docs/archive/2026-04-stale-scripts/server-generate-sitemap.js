import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../../');

const DOMAIN = 'https://mystickahvezda.cz';
const TODAY = new Date().toISOString().split('T')[0];

// Static pages with their priorities and change frequencies
const STATIC_PAGES = [
    { path: '/', freq: 'daily', priority: '1.0' },
    { path: '/blog.html', freq: 'daily', priority: '0.9' },
    { path: '/horoskopy.html', freq: 'daily', priority: '0.9' },
    { path: '/lunace.html', freq: 'daily', priority: '0.9' },
    { path: '/tarot.html', freq: 'daily', priority: '0.9' },
    { path: '/slovnik.html', freq: 'weekly', priority: '0.9' },
    { path: '/natalni-karta.html', freq: 'weekly', priority: '0.8' },
    { path: '/numerologie.html', freq: 'weekly', priority: '0.8' },
    { path: '/partnerska-shoda.html', freq: 'weekly', priority: '0.8' },
    { path: '/snar.html', freq: 'weekly', priority: '0.8' },
    { path: '/runy.html', freq: 'weekly', priority: '0.7' },
    { path: '/kristalova-koule.html', freq: 'weekly', priority: '0.7' },
    { path: '/biorytmy.html', freq: 'weekly', priority: '0.7' },
    { path: '/andelske-karty.html', freq: 'weekly', priority: '0.7' },
    { path: '/astro-mapa.html', freq: 'monthly', priority: '0.6' },
    { path: '/mentor.html', freq: 'monthly', priority: '0.6' },
    { path: '/faq.html', freq: 'monthly', priority: '0.5' },
    { path: '/kalkulacka-cisla-osudu.html', freq: 'weekly', priority: '0.8' },
    { path: '/o-nas.html', freq: 'monthly', priority: '0.5' },
    { path: '/cenik.html', freq: 'monthly', priority: '0.5' },
    { path: '/kontakt.html', freq: 'monthly', priority: '0.4' },
    { path: '/ochrana-soukromi.html', freq: 'monthly', priority: '0.3' },
    { path: '/podminky.html', freq: 'monthly', priority: '0.3' },
];

function scanDirectory(dir, urlPrefix, freq, priority) {
    const entries = [];
    const fullDir = path.join(ROOT, dir);
    if (!fs.existsSync(fullDir)) return entries;

    fs.readdirSync(fullDir).forEach(file => {
        if (file.endsWith('.html')) {
            entries.push({ path: `/${dir}/${file}`, freq, priority });
        }
    });
    return entries;
}

function buildSitemap(urls) {
    const items = urls.map(u => `  <url>
    <loc>${DOMAIN}${u.path}</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>${u.freq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">

${items}

</urlset>`;
}

// Collect all URLs
const blogPages = scanDirectory('blog', '', 'monthly', '0.8');
const zodiacPages = scanDirectory('horoskop', '', 'weekly', '0.8');
const dictionaryPages = scanDirectory('slovnik', '', 'monthly', '0.6');
const compatPages = scanDirectory('kompatibilita', '', 'monthly', '0.6');

const allUrls = [
    ...STATIC_PAGES,
    ...blogPages,
    ...zodiacPages,
    ...dictionaryPages,
    ...compatPages,
];

const xml = buildSitemap(allUrls);
const outPath = path.join(ROOT, 'sitemap.xml');
fs.writeFileSync(outPath, xml, 'utf8');

console.log(`✅ Sitemap vygenerována: ${outPath}`);
console.log(`📊 Celkem URL: ${allUrls.length}`);
console.log(`  - Statické stránky: ${STATIC_PAGES.length}`);
console.log(`  - Blog příspěvky: ${blogPages.length}`);
console.log(`  - Stránky znamení: ${zodiacPages.length}`);
console.log(`  - Slovníkové pojmy: ${dictionaryPages.length}`);
console.log(`  - Kompatibilita: ${compatPages.length}`);

