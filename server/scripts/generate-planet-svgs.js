import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Load env
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error('❌ Error: GEMINI_API_KEY not found in .env');
    process.exit(1);
}

// Model to use
const MODEL_NAME = 'gemini-1.5-flash';

const PLANETS = [
    { name: 'Sun', prompt: 'A simple, flat, vector SVG icon of the SUN. Orange and yellow colors. Circular. Clear rays. No background. Output raw SVG code.' },
    { name: 'Moon', prompt: 'A simple, flat, vector SVG icon of the MOON (Crescent). Silver/Grey/Yellow. No background. Output raw SVG code.' },
    { name: 'Mercury', prompt: 'A simple, flat, vector SVG icon of MERCURY. Grey/Blue. Small craters. No background. Output raw SVG code.' },
    { name: 'Venus', prompt: 'A simple, flat, vector SVG icon of VENUS. Yellow/White. Cloud texture. No background. Output raw SVG code.' },
    { name: 'Mars', prompt: 'A simple, flat, vector SVG icon of MARS. Red/Orange. No background. Output raw SVG code.' },
    { name: 'Jupiter', prompt: 'A simple, flat, vector SVG icon of JUPITER. Banded stripes. Tan/Brown. No background. Output raw SVG code.' },
    { name: 'Saturn', prompt: 'A simple, flat, vector SVG icon of SATURN with RINGS. Yellow/Gold. Rings visible. No background. Output raw SVG code.' }
];

const OUTPUT_DIR = path.join(__dirname, '../../public/images/planets');

async function generateSVG(planet) {
    console.log(`🎨 Generating SVG for ${planet.name}...`);
    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `Write the raw SVG code for: ${planet.prompt}. 
                        RULES:
                        - Output ONLY the raw <svg>...</svg> code.
                        - No markdown code blocks.
                        - ViewBox="0 0 100 100".
                        - Use standard SVG tags usually found in icons.
                        `
                    }]
                }]
            })
        });

        if (!response.ok) {
            // Try to parse error
            const txt = await response.text();
            throw new Error(`API Error ${response.status}: ${txt}`);
        }

        const data = await response.json();
        let svg = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!svg) throw new Error("No SVG returned");

        // Clean markdown
        svg = svg.replace(/```svg/g, '').replace(/```xml/g, '').replace(/```/g, '').trim();
        // Extract SVG part if extra text
        const start = svg.indexOf('<svg');
        const end = svg.lastIndexOf('</svg>');
        if (start !== -1 && end !== -1) {
            svg = svg.substring(start, end + 6);
        }

        const filePath = path.join(OUTPUT_DIR, `${planet.name.toLowerCase()}.svg`);
        await fs.writeFile(filePath, svg);
        console.log(`✅ Saved ${planet.name}`);
    } catch (error) {
        console.error(`❌ Failed to generate ${planet.name}:`, error.message);
    }
}

async function main() {
    try {
        await fs.mkdir(OUTPUT_DIR, { recursive: true });
        console.log(`📂 Output directory: ${OUTPUT_DIR}`);

        for (const p of PLANETS) {
            await generateSVG(p);
            await new Promise(r => setTimeout(r, 1500)); // Rate limit buffer
        }

    } catch (error) {
        console.error('Fatal Error:', error);
    }
}

main();
