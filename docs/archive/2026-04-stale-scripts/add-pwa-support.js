import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../');

const PWA_HEAD_TAGS = `
    <!-- PWA -->
    <link rel="manifest" href="manifest.json">
    <link rel="apple-touch-icon" href="img/icon-192.webp">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">`;

const SW_REGISTRATION = `
    <!-- Service Worker Registration -->
    <script>
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/service-worker.js')
                    .then(reg => console.log('✨ Service Worker registered'))
                    .catch(err => console.log('SW registration failed:', err));
            });
        }
    </script>
</body>`;

const htmlFiles = [
    'index.html',
    'tarot.html',
    'horoskopy.html',
    'natalni-karta.html',
    'numerologie.html',
    'partnerska-shoda.html',
    'astro-mapa.html',
    'kristalova-koule.html',
    'cenik.html',
    'o-nas.html',
    'faq.html',
    'kontakt.html'
];

async function updateFiles() {
    console.log('📱 Adding PWA support to HTML files...\n');

    for (const filename of htmlFiles) {
        const filepath = path.join(projectRoot, filename);

        if (!fs.existsSync(filepath)) {
            console.log(`⏩ Skipping ${filename} (not found)`);
            continue;
        }

        let content = fs.readFileSync(filepath, 'utf8');

        // Check if already has manifest
        if (content.includes('manifest.json')) {
            console.log(`⏩ Skipping ${filename} (already has PWA)`);
            continue;
        }

        // Add manifest link after favicon
        if (content.includes('<!-- Favicon -->')) {
            content = content.replace(
                /(<!-- Favicon -->[\s\S]*?<link[^>]*icon[^>]*>)/i,
                `$1${PWA_HEAD_TAGS}`
            );
        }

        // Add SW registration before </body>
        content = content.replace(
            /<\/body>/i,
            SW_REGISTRATION
        );

        fs.writeFileSync(filepath, content, 'utf8');
        console.log(`✅ Updated: ${filename}`);
    }

    console.log('\n🎉 PWA support added!');
}

updateFiles();
