import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../');

// Mapping of corrupted characters to correct Czech characters
const ENCODING_FIXES = {
    // Common corrupted patterns -> correct UTF-8
    'á': 'á',
    'č': 'č',
    'ď': 'ď',
    'é': 'é',
    'ě': 'ě',
    'í': 'í',
    'ň': 'ň',
    'ó': 'ó',
    'ř': 'ř',
    'š': 'š',
    'ť': 'ť',
    'ú': 'ú',
    'ů': 'ů',
    'ý': 'ý',
    'ž': 'ž',
    'Á': 'Á',
    'Č': 'Č',
    'Ď': 'Ď',
    'É': 'É',
    'Ě': 'Ě',
    'Í': 'Í',
    'Ň': 'Ň',
    'Ó': 'Ó',
    'Ř': 'Ř',
    'Š': 'Š',
    'Ť': 'Ť',
    'Ú': 'Ú',
    'Ů': 'Ů',
    'Ý': 'Ý',
    'Ž': 'Ž',
    // Replacement character
    '�': ''
};

const htmlFiles = [
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
    'kontakt.html',
    'index.html'
];

async function fixEncoding() {
    console.log('🔧 Fixing UTF-8 encoding in HTML files...\n');

    for (const filename of htmlFiles) {
        const filepath = path.join(projectRoot, filename);

        if (!fs.existsSync(filepath)) {
            console.log(`⏩ Skipping ${filename} (not found)`);
            continue;
        }

        // Read as binary buffer first
        let content = fs.readFileSync(filepath);

        // Try to detect if it's already valid UTF-8
        let contentStr = content.toString('utf8');

        // Check for common corruption patterns
        if (contentStr.includes('�') || contentStr.includes('Ã')) {
            console.log(`🔧 Fixing: ${filename}`);

            // Apply fixes
            for (const [corrupted, correct] of Object.entries(ENCODING_FIXES)) {
                contentStr = contentStr.split(corrupted).join(correct);
            }

            // Write back as UTF-8
            fs.writeFileSync(filepath, contentStr, { encoding: 'utf8' });
            console.log(`✅ Fixed: ${filename}`);
        } else {
            console.log(`✓ OK: ${filename}`);
        }
    }

    console.log('\n🎉 Encoding fix complete!');
}

fixEncoding();
