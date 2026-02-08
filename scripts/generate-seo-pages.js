
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Validations and Setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.join(__dirname, '..');
const DATA_FILE = path.join(ROOT_DIR, 'data', 'zodiac-matrix.json');
const TEMPLATE_FILE = path.join(ROOT_DIR, 'templates', 'compatibility-template.html');
const OUTPUT_DIR = path.join(ROOT_DIR, 'partnerska-shoda');
const ENV_FILE = path.join(ROOT_DIR, 'server', '.env');

// Parse .env manually
let GEMINI_API_KEY = '';
try {
    const envContent = fs.readFileSync(ENV_FILE, 'utf8');
    const match = envContent.match(/GEMINI_API_KEY=(.*)/);
    if (match) {
        GEMINI_API_KEY = match[1].trim();
    }
} catch (e) {
    console.error('Error reading .env file:', e);
    process.exit(1);
}

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// Load Data
const zodiacSigns = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
const template = fs.readFileSync(TEMPLATE_FILE, 'utf8');

// Ensure output dir exists
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// System Prompt
const SYSTEM_PROMPT = `Jsi expert na partnerskou astrologii. Píšeš poutavé, mystické, ale realistické rozbory pro web.
Tvým úkolem je napsat obsah pro stránku "Partnerská shoda" pro dvě konkrétní znamení.
Výstup musí být ve formátu HTML (jen obsah uvnitř <body>, bez hlaviček).
Používej <h3> pro nadpisy sekcí.
Sekce, které musíš zahrnout:
1. Emoční propojení (jak se cítí)
2. Komunikace a intelekt (jak si rozumí)
3. Intimita a vášeň (fyzická stránka)
4. Verdikt (shrnutí)

Zároveň vygeneruj:
- "Skóre shody" jako číslo 0-100.
- "Tip na rande" (krátký odstavec, co podniknout).

Formát odpovědi musí být JSON objekt:
{
  "score_number": 85,
  "content": "<h3>Emoční propojení...</h3><p>Text...</p>...",
  "date_tip": "Vemte ho na..."
}`;

// Helper: Call Gemini
async function generateContent(sign1, sign2) {
    const prompt = `Znamení 1: ${sign1.name} (${sign1.element})
Znamení 2: ${sign2.name} (${sign2.element})
Vytvoř detailní rozbor kompatibility.`;

    try {
        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `${SYSTEM_PROMPT}\n\n---\n\n${prompt}`
                    }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    response_mime_type: "application/json"
                }
            })
        });

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error('No content generated');
        return JSON.parse(text);

    } catch (error) {
        console.error(`Error generating for ${sign1.name} + ${sign2.name}:`, error);
        return null;
    }
}

// Generate JSON-LD Schema
function generateSchema(sign1, sign2, result) {
    const schema = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "FAQPage",
                "mainEntity": [{
                    "@type": "Question",
                    "name": `Hodí se k sobě ${sign1.name} a ${sign2.name}?`,
                    "acceptedAnswer": {
                        "@type": "Answer",
                        "text": `Jejich shoda je ${result.score_number}%. ${extractSummary(result.content)}`
                    }
                }, {
                    "@type": "Question",
                    "name": `Jaké je ideální rande pro ${sign1.name} a ${sign2.name}?`,
                    "acceptedAnswer": {
                        "@type": "Answer",
                        "text": result.date_tip
                    }
                }]
            },
            {
                "@type": "BreadcrumbList",
                "itemListElement": [{
                    "@type": "ListItem",
                    "position": 1,
                    "name": "Domů",
                    "item": "https://mystickahvezda.cz"
                }, {
                    "@type": "ListItem",
                    "position": 2,
                    "name": "Partnerská shoda",
                    "item": "https://mystickahvezda.cz/partnerska-shoda"
                }, {
                    "@type": "ListItem",
                    "position": 3,
                    "name": `${sign1.name} a ${sign2.name}`,
                    "item": `https://mystickahvezda.cz/partnerska-shoda/${sign1.id}-${sign2.id}.html`
                }]
            }
        ]
    };
    return JSON.stringify(schema, null, 2);
}

function extractSummary(html) {
    // Very basic extraction of first paragraph text for schema
    const match = html.match(/<p>(.*?)<\/p>/);
    return match ? match[1].replace(/<[^>]*>/g, '') : "Zjistěte jejich detailní shodu v našem rozboru.";
}

// Main Loop
async function main() {
    console.log('✨ Starting Programmatic SEO Generation (Enhanced)...');

    // Generating just a few combinations for demonstration and speed
    // To generate ALL 144, remove the .slice()
    // We will generate ALL signs against all others (144 pages)
    const sourceSigns = zodiacSigns;

    let count = 0;

    for (const sign1 of sourceSigns) {
        for (const sign2 of zodiacSigns) {
            const fileName = `${sign1.id}-${sign2.id}.html`;
            const filePath = path.join(OUTPUT_DIR, fileName);

            // Force regenerate to apply new template features
            // if (fs.existsSync(filePath)) {
            //     console.log(`Skipping ${fileName} (already exists)`);
            //     continue;
            // }

            console.log(`Generating: ${sign1.name} + ${sign2.name}...`);

            const result = await generateContent(sign1, sign2);

            if (result) {
                // Generate Related Links
                const relatedLinks = zodiacSigns
                    .filter(s => s.id !== sign1.id) // Don't link to self-compatibility if weird, or keep it
                    .map(s => `<a href="${sign1.id}-${s.id}.html" class="related-chip">${sign1.name} + ${s.name}</a>`)
                    .join('\n');

                const schemaJson = generateSchema(sign1, sign2, result);

                let html = template
                    .replace(/{{SIGN1_NAME}}/g, sign1.name)
                    .replace(/{{SIGN2_NAME}}/g, sign2.name)
                    .replace(/{{COMPATIBILITY_SCORE}}/g, result.score_number + '%')
                    .replace(/{{COMPATIBILITY_SCORE_NUM}}/g, result.score_number)
                    .replace(/{{CONTENT_TEXT}}/g, result.content)
                    .replace(/{{DATE_TIP}}/g, result.date_tip)
                    .replace(/{{SCHEMA_JSON}}/g, schemaJson)
                    .replace(/{{model_valid_links}}/g, relatedLinks);

                fs.writeFileSync(filePath, html);
                console.log(`✅ Saved ${fileName}`);
                count++;

                // Sleep to be nice to API
                await new Promise(r => setTimeout(r, 1000));
            }
        }
    }

    console.log(`🎉 Finished! Generated ${count} enhanced pages.`);
}

main();
