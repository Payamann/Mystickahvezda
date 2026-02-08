import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../');

// Comprehensive replacement map for corrupted Czech text
// Format: [corrupted pattern, correct text]
const REPLACEMENTS = [
    // Common words and phrases
    ['Du?e', 'Duše'],
    ['du?e', 'duše'],
    ['v?m', 'vám'],
    ['V?m', 'Vám'],
    ['mus?te', 'musíte'],
    ['ud?lat', 'udělat'],
    ['Uk??', 'Ukáží'],
    ['uk??', 'ukáží'],
    ['va?e', 'vaše'],
    ['Va?e', 'Vaše'],
    ['u?', 'už'],
    ['U?', 'Už'],
    ['zn?', 'zná'],
    ['Zn?', 'Zná'],
    ['mo?n?', 'možná'],
    ['Mo?n?', 'Možná'],
    ['nevid?', 'nevidí'],
    ['Nevid?', 'Nevidí'],
    ['Rychl?', 'Rychlá'],
    ['rychl?', 'rychlá'],
    ['odpov??', 'odpověď'],
    ['Odpov??', 'Odpověď'],
    ['ot?zku', 'otázku'],
    ['Ot?zku', 'Otázku'],
    ['Ide?ln?', 'Ideální'],
    ['ide?ln?', 'ideální'],
    ['denn?', 'denní'],
    ['Denn?', 'Denní'],
    ['Klasick?', 'Klasický'],
    ['klasick?', 'klasický'],
    ['P??tomnost', 'Přítomnost'],
    ['p??tomnost', 'přítomnost'],
    ['Pochopen?', 'Pochopení'],
    ['pochopen?', 'pochopení'],
    ['souvislost?', 'souvislostí'],
    ['Nejkomplexn???', 'Nejkomplexnější'],
    ['nejkomplexn???', 'nejkomplexnější'],
    ['kartov?', 'kartový'],
    ['Kartov?', 'Kartový'],
    ['Hlubok?', 'Hluboká'],
    ['hlubok?', 'hluboká'],
    ['anal?za', 'analýza'],
    ['Anal?za', 'Analýza'],
    ['vliv?', 'vlivů'],
    ['Vliv?', 'Vlivů'],
    ['UK?ZKA', 'UKÁZKA'],
    ['V?KLAD?', 'VÝKLADŮ'],
    ['VYLO?IT', 'VYLOŽIT'],
    ['T?I', 'TŘI'],
    ['t?i', 'tři'],
    ['K??', 'KŘÍ'],
    ['k??', 'kří'],
    ['KELTSK?', 'KELTSKÝ'],
    ['keltsk?', 'keltský'],
    ['inspirac?', 'inspirací'],
    ['Inspirac?', 'Inspirací'],
    ['jednoduch?', 'jednoduchou'],
    ['Jednoduch?', 'Jednoduchou'],
    ['Budoucnost', 'Budoucnost'],
    ['Minulost', 'Minulost'],
    ['situace', 'situace'],
    ['DOM?', 'DOMŮ'],
    ['NAT?LN?', 'NATÁLNÍ'],
    ['OR?KULUM', 'ORÁKULUM'],
    ['CEN?K', 'CENÍK'],
    ['Hv?zda', 'Hvězda'],
    ['HV?ZDA', 'HVĚZDA'],
    ['hv?zda', 'hvězda'],
    ['zv?rokruh', 'zvěrokruh'],
    ['Zv?rokruh', 'Zvěrokruh'],
    ['zname?', 'znamení'],
    ['Zname?', 'Znamení'],
    ['horn?', 'horní'],
    ['Horn?', 'Horní'],
    ['doln?', 'dolní'],
    ['Doln?', 'Dolní'],
    ['lev?', 'levá'],
    ['Lev?', 'Levá'],
    ['prav?', 'pravá'],
    ['Prav?', 'Pravá'],
    ['??slo', 'Číslo'],
    ['??slo', 'číslo'],
    ['?ivot', 'život'],
    ['?ivot', 'Život'],
    ['cest', 'cest'],
    ['Cest', 'Cest'],
    ['osud', 'osud'],
    ['Osud', 'Osud'],
    ['du?e', 'duše'],
    ['Du?e', 'Duše'],
    ['osobnost', 'osobnost'],
    ['Osobnost', 'Osobnost'],
    ['partner', 'partner'],
    ['Partner', 'Partner'],
    ['shod', 'shod'],
    ['Shod', 'Shod'],
    ['synastri', 'synastri'],
    ['Synastri', 'Synastri'],
    ['kompat', 'kompat'],
    ['Kompat', 'Kompat'],
    ['vztah', 'vztah'],
    ['Vztah', 'Vztah'],
    ['astrolog', 'astrolog'],
    ['Astrolog', 'Astrolog'],
    ['kartograf', 'kartograf'],
    ['Kartograf', 'Kartograf'],
    ['relokac', 'relokac'],
    ['Relokac', 'Relokac'],
    ['cestov', 'cestov'],
    ['Cestov', 'Cestov'],
    ['planet', 'planet'],
    ['Planet', 'Planet'],
    ['lini', 'lini'],
    ['Lini', 'Lini'],
    ['k??', 'kří'],
    ['K??', 'Kří'],
    ['koul', 'koul'],
    ['Koul', 'Koul'],
    ['v??t', 'věšt'],
    ['V??t', 'Věšt'],
    ['or?kul', 'orákul'],
    ['Or?kul', 'Orákul'],
    ['p?edpov', 'předpov'],
    ['P?edpov', 'Předpov'],
    ['cen?k', 'ceník'],
    ['Cen?k', 'Ceník'],
    ['p?edplatn', 'předplatn'],
    ['P?edplatn', 'Předplatn'],
    ['premi', 'premi'],
    ['Premi', 'Premi'],
    ['slu?b', 'služb'],
    ['Slu?b', 'Služb'],
    ['t?m', 'tým'],
    ['T?m', 'Tým'],
    ['mis', 'mis'],
    ['Mis', 'Mis'],
    ['FAQ', 'FAQ'],
    ['ot?zk', 'otázk'],
    ['Ot?zk', 'Otázk'],
    ['pomoc', 'pomoc'],
    ['Pomoc', 'Pomoc'],
    ['podpor', 'podpor'],
    ['Podpor', 'Podpor'],
    ['kontakt', 'kontakt'],
    ['Kontakt', 'Kontakt'],
    ['email', 'email'],
    ['Email', 'Email'],
    // Single character fixes (order matters - do these last)
    ['?', 'š'], // This is too aggressive, skip
];

// More targeted replacements for specific phrases we know
const PHRASE_REPLACEMENTS = [
    // Tarot page
    ['Zrcadlo Du?e', 'Zrcadlo Duše'],
    ['neřeknou, co mus?te ud?lat', 'neřeknou, co musíte udělat'],
    ['Uk?ží v?m cestu', 'Ukáží vám cestu'],
    ['vaše srdce u? zn?', 'vaše srdce už zná'],
    ['rozum ji mo?n? nevid?', 'rozum ji možná nevidí'],
    ['JEDNA KARTA', 'JEDNA KARTA'],
    ['Rychl? odpov??', 'Rychlá odpověď'],
    ['jednoduch? ot?zku', 'jednoduchou otázku'],
    ['Ide?ln? pro denn? inspiraci', 'Ideální pro denní inspiraci'],
    ['TŘI KARTY', 'TŘI KARTY'],
    ['T?I KARTY', 'TŘI KARTY'],
    ['Klasick? rozklad', 'Klasický rozklad'],
    ['P??tomnost', 'Přítomnost'],
    ['Pochopen? souvislost?', 'Pochopení souvislostí'],
    ['KELTSKÝ K???', 'KELTSKÝ KŘÍŽ'],
    ['KELTSK? K???', 'KELTSKÝ KŘÍŽ'],
    ['KELTSK? K??', 'KELTSKÝ KŘÍŽ'],
    ['Nejkomplexn??? 10-kartov? rozklad', 'Nejkomplexnější 10-kartový rozklad'],
    ['Hlubok? anal?za situace a vliv?', 'Hluboká analýza situace a vlivů'],
    ['UK?ZKA V?KLAD?', 'UKÁZKA VÝKLADŮ'],
    ['VYLO?IT KARTU', 'VYLOŽIT KARTU'],
    ['VYLO?IT KARTY', 'VYLOŽIT KARTY'],
    // Navigation
    ['DOM?', 'DOMŮ'],
    ['NAT?LN? KARTA', 'NATÁLNÍ KARTA'],
    ['Nat?ln? Karta', 'Natální Karta'],
    ['OR?KULUM', 'ORÁKULUM'],
    ['Or?kulum', 'Orákulum'],
    ['CEN?K', 'CENÍK'],
    ['Cen?k', 'Ceník'],
    ['MYSTICK?HV?ZDA', 'MYSTICKÁHVĚZDA'],
    ['Mystick?Hv?zda', 'MystickáHvězda'],
    // Footer and common
    ['Mystick? Hv?zda', 'Mystická Hvězda'],
    ['Mystická Hvězda', 'Mystická Hvězda'], // Ensure correct stays correct
];

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
    'index.html',
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

    // Apply phrase replacements first (more specific)
    for (const [corrupted, correct] of PHRASE_REPLACEMENTS) {
        if (content.includes(corrupted) && corrupted !== correct) {
            content = content.split(corrupted).join(correct);
            changed = true;
        }
    }

    // Apply word replacements
    for (const [corrupted, correct] of REPLACEMENTS) {
        if (content.includes(corrupted) && corrupted !== correct) {
            content = content.split(corrupted).join(correct);
            changed = true;
        }
    }

    if (changed) {
        // Remove BOM if present, then add it back for Windows compatibility
        content = content.replace(/^\uFEFF/, '');
        content = '\uFEFF' + content;

        fs.writeFileSync(filepath, content, 'utf8');
        console.log(`✅ Fixed: ${filename}`);
        return true;
    } else {
        console.log(`✓ OK: ${filename}`);
        return false;
    }
}

async function main() {
    console.log('🔧 Fixing Czech character encoding...\n');

    let fixedCount = 0;
    for (const filename of htmlFiles) {
        if (fixFile(filename)) {
            fixedCount++;
        }
    }

    // Also fix components
    const componentFiles = ['components/header.html', 'components/footer.html'];
    for (const filename of componentFiles) {
        if (fixFile(filename)) {
            fixedCount++;
        }
    }

    console.log(`\n🎉 Fixed ${fixedCount} files!`);
    console.log('Please refresh your browser (Ctrl+Shift+R) to see changes.');
}

main();
