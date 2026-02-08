import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../');

// SEO data for each page
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

function generateOGTags(data) {
    return `
    <!-- Open Graph -->
    <meta property="og:type" content="website">
    <meta property="og:title" content="${data.title}">
    <meta property="og:description" content="${data.description}">
    <meta property="og:image" content="${data.ogImage}">
    <meta property="og:locale" content="cs_CZ">
    <meta name="twitter:card" content="summary_large_image">`;
}

function generateJSONLD(data) {
    const jsonld = {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        "name": data.title.split(' | ')[0],
        "applicationCategory": "LifestyleApplication",
        "operatingSystem": "Web"
    };
    return `
    <!-- JSON-LD Structured Data -->
    <script type="application/ld+json">
    ${JSON.stringify(jsonld, null, 4)}
    </script>`;
}

async function updateFile(filename, seoData) {
    const filepath = path.join(projectRoot, filename);

    if (!fs.existsSync(filepath)) {
        console.log(`⏩ Skipping ${filename} (not found)`);
        return;
    }

    let content = fs.readFileSync(filepath, 'utf8');

    // Check if already has OG tags
    if (content.includes('og:title')) {
        console.log(`⏩ Skipping ${filename} (already has OG tags)`);
        return;
    }

    // Update title
    content = content.replace(/<title>.*?<\/title>/i, `<title>${seoData.title}</title>`);

    // Update description
    content = content.replace(
        /<meta name="description"[^>]*>/i,
        `<meta name="description" content="${seoData.description}">`
    );

    // Add keywords if missing
    if (!content.includes('name="keywords"')) {
        content = content.replace(
            /<meta name="description"[^>]*>/i,
            `<meta name="description" content="${seoData.description}">\n    <meta name="keywords" content="${seoData.keywords}">`
        );
    }

    // Insert OG tags after theme-color or before </head>
    const ogTags = generateOGTags(seoData);
    const jsonld = generateJSONLD(seoData);

    if (content.includes('theme-color')) {
        content = content.replace(
            /(<meta name="theme-color"[^>]*>)/i,
            `$1${ogTags}${jsonld}`
        );
    } else {
        content = content.replace(
            /<\/head>/i,
            `${ogTags}${jsonld}\n</head>`
        );
    }

    fs.writeFileSync(filepath, content, 'utf8');
    console.log(`✅ Updated: ${filename}`);
}

async function main() {
    console.log('🔍 Starting SEO optimization...\n');

    for (const [filename, seoData] of Object.entries(SEO_DATA)) {
        await updateFile(filename, seoData);
    }

    console.log('\n🎉 SEO optimization complete!');
}

main();
