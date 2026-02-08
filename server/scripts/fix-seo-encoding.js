import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../');

// SEO data for each page - CORRECT UTF-8
const SEO_DATA = {
    'tarot.html': {
        title: 'Tarotové Výklady Online | Mystická Hvězda',
        description: 'Online tarotové výklady s AI interpretací. Vyberte si z 22 karet Velké Arkány a získejte personalizovaný výklad.',
        ogImage: 'img/tarot-back.webp',
        keywords: 'tarot, tarotové karty, výklad, věštění, velká arkána'
    },
    'horoskopy.html': {
        title: 'Denní Horoskopy | Mystická Hvězda',
        description: 'Přesné denní horoskopy pro všech 12 znamení zvěrokruhu. Zjistěte, co vám hvězdy přináší dnes.',
        ogImage: 'img/icon-zodiac.webp',
        keywords: 'horoskop, denní horoskop, znamení, zvěrokruh, astrologie'
    },
    'natalni-karta.html': {
        title: 'Natální Karta | Mystická Hvězda',
        description: 'Vytvořte si svou osobní natální kartu a objevte pozice planet v okamžiku vašeho narození.',
        ogImage: 'img/icon-natal.webp',
        keywords: 'natální karta, horoskop narození, planety, astrologie'
    },
    'numerologie.html': {
        title: 'Numerologie Online | Mystická Hvězda',
        description: 'Objevte skrytý význam čísel ve vašem životě. Výpočet čísla životní cesty, osudu a duše.',
        ogImage: 'img/icon-numerology.webp',
        keywords: 'numerologie, číslo životní cesty, číslo osudu, výklad čísel'
    },
    'partnerska-shoda.html': {
        title: 'Partnerská Shoda | Mystická Hvězda',
        description: 'Zjistěte kompatibilitu mezi dvěma znameními. Synastrie a analýza partnerského vztahu.',
        ogImage: 'img/icon-synastry.webp',
        keywords: 'partnerská shoda, synastrie, kompatibilita, vztahy, astrologie'
    },
    'astro-mapa.html': {
        title: 'Astrokartografie | Mystická Hvězda',
        description: 'Objevte svá silová místa na Zemi. Astrokartografická mapa pro cestování a relokaci.',
        ogImage: 'img/mystical-earth.webp',
        keywords: 'astrokartografie, relokace, cestování, planetární linie'
    },
    'kristalova-koule.html': {
        title: 'Křišťálová Koule | Mystická Hvězda',
        description: 'Zeptejte se křišťálové koule na cokoliv. AI věštba pro váš osobní dotaz.',
        ogImage: 'img/crystal-ball-3d.webp',
        keywords: 'křišťálová koule, věštění, orákulum, předpověď'
    },
    'cenik.html': {
        title: 'Ceník Služeb | Mystická Hvězda',
        description: 'Přehled cen a předplatných pro Premium funkce Mystické Hvězdy.',
        ogImage: 'img/hero-3d.webp',
        keywords: 'ceník, předplatné, premium, služby'
    },
    'o-nas.html': {
        title: 'O Nás | Mystická Hvězda',
        description: 'Seznamte se s týmem Mystické Hvězdy. Náš příběh a mise.',
        ogImage: 'img/hero-3d.webp',
        keywords: 'o nás, tým, mise, astrologie'
    },
    'faq.html': {
        title: 'Často Kladené Dotazy | Mystická Hvězda',
        description: 'Odpovědi na nejčastější otázky o našich astrologických službách.',
        ogImage: 'img/hero-3d.webp',
        keywords: 'FAQ, otázky, pomoc, podpora'
    },
    'kontakt.html': {
        title: 'Kontakt | Mystická Hvězda',
        description: 'Kontaktujte nás s vašimi dotazy nebo návrhy.',
        ogImage: 'img/hero-3d.webp',
        keywords: 'kontakt, email, podpora'
    }
};

function fixFile(filename, seoData) {
    const filepath = path.join(projectRoot, filename);

    if (!fs.existsSync(filepath)) {
        console.log(`⏩ Skipping ${filename} (not found)`);
        return;
    }

    // Read file as buffer
    let buffer = fs.readFileSync(filepath);
    let content = buffer.toString('utf8');

    // Replace corrupted meta tags with correct ones
    // Fix title
    content = content.replace(/<title>.*?<\/title>/i, `<title>${seoData.title}</title>`);

    // Fix description - match any corrupted version
    content = content.replace(
        /<meta name="description"[^>]*>/i,
        `<meta name="description" content="${seoData.description}">`
    );

    // Fix keywords
    content = content.replace(
        /<meta name="keywords"[^>]*>/i,
        `<meta name="keywords" content="${seoData.keywords}">`
    );

    // Fix OG title
    content = content.replace(
        /<meta property="og:title"[^>]*>/i,
        `<meta property="og:title" content="${seoData.title}">`
    );

    // Fix OG description
    content = content.replace(
        /<meta property="og:description"[^>]*>/i,
        `<meta property="og:description" content="${seoData.description}">`
    );

    // Write with explicit UTF-8 encoding (with BOM for Windows compatibility)
    const BOM = '\uFEFF';
    if (!content.startsWith(BOM)) {
        content = BOM + content;
    }

    fs.writeFileSync(filepath, content, 'utf8');
    console.log(`✅ Fixed: ${filename}`);
}

async function main() {
    console.log('🔧 Fixing SEO meta tags with correct UTF-8...\n');

    for (const [filename, seoData] of Object.entries(SEO_DATA)) {
        fixFile(filename, seoData);
    }

    console.log('\n🎉 Encoding fix complete!');
}

main();
