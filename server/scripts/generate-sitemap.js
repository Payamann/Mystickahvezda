import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.join(__dirname, '../../');
const BASE_URL = 'https://mystickahvezda.cz';

async function generateSitemap() {
    console.log('Generating sitemap.xml...');

    try {
        const files = fs.readdirSync(ROOT_DIR);
        const htmlFiles = files.filter(f =>
            f.endsWith('.html') &&
            !['admin.html', '404.html', 'template.html', 'prihlaseni.html', 'profil.html', 'premium-test.html'].includes(f)
        );

        let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
        xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

        for (const file of htmlFiles) {
            const stats = fs.statSync(path.join(ROOT_DIR, file));
            const lastMod = stats.mtime.toISOString().split('T')[0];
            const url = `${BASE_URL}/${file === 'index.html' ? '' : file}`;

            // Priority & Frequency (custom logic)
            let priority = '0.5';
            let freq = 'monthly';

            if (file === 'index.html') {
                priority = '1.0';
                freq = 'daily';
            } else if (['horoskop.html', 'tarot.html'].includes(file)) {
                priority = '0.9';
                freq = 'daily';
            } else if (['numerologie.html', 'natalni-karta.html', 'synastrie.html'].includes(file)) {
                priority = '0.8';
                freq = 'weekly';
            }

            xml += `  <url>\n`;
            xml += `    <loc>${url}</loc>\n`;
            xml += `    <lastmod>${lastMod}</lastmod>\n`;
            xml += `    <changefreq>${freq}</changefreq>\n`;
            xml += `    <priority>${priority}</priority>\n`;
            xml += `  </url>\n`;
        }

        xml += `</urlset>`;

        fs.writeFileSync(path.join(ROOT_DIR, 'sitemap.xml'), xml);
        console.log(`✅ sitemap.xml generated with ${htmlFiles.length} pages.`);
    } catch (err) {
        console.error('❌ Error generating sitemap:', err);
    }
}

generateSitemap();
