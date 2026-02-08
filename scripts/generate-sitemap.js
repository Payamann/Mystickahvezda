
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');
const SITEMAP_FILE = path.join(ROOT_DIR, 'sitemap.xml');
const DOMAIN = 'https://mystickahvezda.cz';

const staticPages = [
    'index.html',
    'horoskopy.html',
    'tarot.html',
    'kristalova-koule.html',
    'natalni-karta.html',
    'partnerska-shoda.html',
    'partnerska-shoda/index.html',
    'cenik.html',
    'o-nas.html'
];

function getFormattedDate() {
    return new Date().toISOString().split('T')[0];
}

function generateSitemap() {
    console.log('🗺️ Generating Sitemap...');

    let urls = [];

    // 1. Add Static Pages (check if they exist)
    staticPages.forEach(page => {
        if (fs.existsSync(path.join(ROOT_DIR, page))) {
            // Should be consistent with slashes
            const urlPath = page.replace('index.html', '').replace('.html', ''); // Clean URLs if using clean URLs, but let's stick to .html for safety or standard
            // Actually, let's keep exact filenames for this setup as it's static files
            const finalUrl = `${DOMAIN}/${page}`;
            urls.push({ loc: finalUrl, priority: page === 'index.html' ? '1.0' : '0.8' });
        }
    });

    // 2. Add Programmatic Pages
    const compatibilityDir = path.join(ROOT_DIR, 'partnerska-shoda');
    if (fs.existsSync(compatibilityDir)) {
        const files = fs.readdirSync(compatibilityDir);
        files.forEach(file => {
            if (file.endsWith('.html') && file !== 'index.html') {
                urls.push({
                    loc: `${DOMAIN}/partnerska-shoda/${file}`,
                    priority: '0.6'
                });
            }
        });
    }

    // 3. Build XML
    const date = getFormattedDate();
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

    urls.forEach(url => {
        xml += `
  <url>
    <loc>${url.loc}</loc>
    <lastmod>${date}</lastmod>
    <changefreq>daily</changefreq>
    <priority>${url.priority}</priority>
  </url>`;
    });

    xml += `
</urlset>`;

    fs.writeFileSync(SITEMAP_FILE, xml);
    console.log(`✅ Sitemap generated with ${urls.length} URLs at ${SITEMAP_FILE}`);
}

generateSitemap();
