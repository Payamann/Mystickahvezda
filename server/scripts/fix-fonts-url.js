import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../');

const htmlFiles = [
    'numerologie.html',
    'partnerska-shoda.html',
    'astro-mapa.html',
    'kristalova-koule.html',
    'cenik.html',
    'o-nas.html',
    'faq.html',
    'kontakt.html',
    'profil.html',
    'podminky.html',
    'soukromi.html'
];

function fixFile(filename) {
    const filepath = path.join(projectRoot, filename);

    if (!fs.existsSync(filepath)) {
        console.log(`⏩ Skipping ${filename} (not found)`);
        return false;
    }

    let content = fs.readFileSync(filepath, 'utf8');
    let changed = false;

    // Fix Google Fonts URL (š instead of ?)
    if (content.includes('css2šfamily') || content.includes('css2\u0161family')) {
        content = content.replace(/css2[š\u0161]family/g, 'css2?family');
        changed = true;
        console.log(`  ✓ Fixed Google Fonts URL in ${filename}`);
    }

    // Fix common corrupted patterns
    const replacements = [
        // Skip link
        ['Přeskočit na obsah', 'Přeskočit na obsah'],
        ['P\ufffdeskočit', 'Přeskočit'],
        ['P\ufffdko\ufffd', 'Přesko'],

        // Navigation items (if not using dynamic header)
        ['Dom\ufffd', 'Domů'],
        ['Nat\ufffdn\ufffd', 'Natální'],
        ['Or\ufffdkulum', 'Orákulum'],
        ['Cen\ufffdk', 'Ceník'],
        ['P\ufffdihl\ufffdsit', 'Přihlásit'],

        // Common words
        ['Mystick\ufffd', 'Mystická'],
        ['Hv\uffzda', 'Hvězda'],
        ['\ufffd', ''], // Remove replacement character completely only as last resort
    ];

    for (const [corrupted, correct] of replacements) {
        if (content.includes(corrupted) && corrupted !== correct) {
            content = content.split(corrupted).join(correct);
            changed = true;
        }
    }

    if (changed) {
        fs.writeFileSync(filepath, content, 'utf8');
        console.log(`✅ Fixed: ${filename}`);
        return true;
    } else {
        console.log(`✓ OK: ${filename}`);
        return false;
    }
}

async function main() {
    console.log('🔧 Fixing Google Fonts URLs in remaining HTML files...\n');

    let fixedCount = 0;
    for (const filename of htmlFiles) {
        if (fixFile(filename)) {
            fixedCount++;
        }
    }

    console.log(`\n🎉 Fixed ${fixedCount} files!`);
}

main();
