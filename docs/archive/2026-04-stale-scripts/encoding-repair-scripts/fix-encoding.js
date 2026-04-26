import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rawReplacements = {
    // Zodiac explicit mappings with precise unicode sequences
    '\u00E2\u2122\u0088': '♈', // â™\x88
    '\u00E2\u2122\u0089': '♉', // â™\x89

    // Punctuation & Other Emojis
    '\u00F0\u009F\u0093\u0085': '📅', // đź“…
    'â€“': '–', // en dash (E2 80 93)
    'â€”': '—', // em dash 
    'â€ž': '„', // low quote 
    'â€ś': '“', // left quote 
    'â€™': '’', // right single quote 
    'â€ť': '”', // right quote 

    // Lowcase czech
    'Ăˇ': 'á',
    'Ă©': 'é',
    'Ă\xAD': 'í',  // \xAD is correctly read in regex
    'Ăł': 'ó',
    'Ăş': 'ú',
    'Ă˝': 'ý',
    'ÄŤ': 'č',
    'ÄŹ': 'ď',
    'Ä›': 'ě',
    'Ĺˆ': 'ň',
    'Ĺ™': 'ř',
    'Ĺˇ': 'š',
    'Ĺ\x88': 'ň',
    'ĹĄ': 'ť',
    'ĹŻ': 'ů',
    'Ĺľ': 'ž',

    // Uppercase czech
    'Ă\x81': 'Á',
    'Ă\x89': 'É',
    'Ă\x8D': 'Í',
    'Ă\x93': 'Ó',
    'Ă\x9A': 'Ú',
    'Ă\x9D': 'Ý',
    'Ä\x8C': 'Č',
    'Ä\x8E': 'Ď',
    'Ä\x9A': 'Ě',
    'Ĺ\x87': 'Ň',
    'Ĺ\x98': 'Ř',
    'Ĺ\xA0': 'Š',
    'Ĺ\xA4': 'Ť',
    'Ĺ\xAE': 'Ů',
    'Ĺ\xBD': 'Ž'
};

const sortedKeys = Object.keys(rawReplacements).sort((a, b) => b.length - a.length);

const dir = path.join(__dirname, '../../horoskop');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

let totalFixed = 0;

for (const file of files) {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    if (content.charCodeAt(0) === 0xFEFF) {
        content = content.slice(1);
    }

    let changed = false;
    for (const bad of sortedKeys) {
        if (content.includes(bad)) {
            content = content.split(bad).join(rawReplacements[bad]);
            changed = true;
        }
    }

    if (changed) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Opraveno: ${file}`);
        totalFixed++;
    } else {
        console.log(`⏩ Přeskočeno (v pořádku): ${file}`);
    }
}

console.log(`Opraveno celkem ${totalFixed} souborů.`);
