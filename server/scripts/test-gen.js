
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load env vars
dotenv.config({ path: './.env' });

const API_KEY = process.env.GEMINI_API_KEY;
const OUTPUT_DIR = '../img/tarot';

if (!API_KEY) {
    console.error('❌ Error: GEMINI_API_KEY not found in .env');
    process.exit(1);
}

// Ensure output dir exists
if (!fs.existsSync(OUTPUT_DIR)) {
    // console.log('Creating directory...', OUTPUT_DIR); // It should exist based on previous steps
}

async function generateImage(prompt, filename) {
    console.log(`🎨 Generating ${filename} using Imagen 4.0...`);

    // Correct endpoint for Imagen 4.0
    const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${API_KEY}`;

    const body = {
        instances: [
            { prompt: prompt }
        ],
        parameters: {
            sampleCount: 1,
            aspectRatio: "3:4",
            outputOptions: {
                mimeType: "image/png"
            }
        }
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API Error ${response.status}: ${errorText}`);
        }

        const data = await response.json();

        // Response format usually: { predictions: [ { bytesBase64Encoded: "..." } ] }
        if (data.predictions && data.predictions[0] && data.predictions[0].bytesBase64Encoded) {
            const buffer = Buffer.from(data.predictions[0].bytesBase64Encoded, 'base64');
            const outputPath = path.join(OUTPUT_DIR, filename);
            fs.writeFileSync(outputPath, buffer);
            console.log(`✅ Saved to ${outputPath}`);
        } else if (data.predictions && data.predictions[0] && data.predictions[0].mimeType) {
            // Sometimes it returns a simplified structure?
            console.log('Received unknown format:', JSON.stringify(data).substring(0, 200));
        } else {
            console.error('❌ No image data in response');
            console.log(JSON.stringify(data, null, 2));
        }

    } catch (error) {
        console.error(`❌ Failed: ${error.message}`);
        if (error.message.includes('404')) {
            console.log("Tip: Check if 'imagen-4.0-generate-001' is enabled in your Google Cloud project.");
        }
    }
}

// Test with 'Blázen'
const prompt = "Tarot card 'Blázen', mystical tarot style. Young traveler stepping off a cliff into starlight, white dog barking. The word 'Blázen' written in elegant gold font at the bottom. 3d render, gold and dark purple color palette, ethereal lighting, cosmic background, high quality, no text, no letters.";


async function listModels() {
    console.log('📋 Listing available models...');
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.models) {
            console.log('Found models:');
            data.models.forEach(m => {
                // Filter for likely image candidates or just show all
                if (m.name.includes('gemini') || m.name.includes('image')) {
                    console.log(`- ${m.name} (${m.supportedGenerationMethods})`);
                }
            });
        } else {
            console.log('No models found in response:', data);
        }
    } catch (error) {
        console.error('ListModels Error:', error.message);
    }
}


const CARDS_TO_GENERATE = [
    {
        name: 'tarot_blazen.png',
        prompt: "Tarot card 'Blázen' (The Fool), mystical tarot style. Young traveler stepping off a cliff into starlight, white dog barking. The word 'Blázen' written in elegant gold font at the bottom. 3d render, gold and dark purple color palette, ethereal lighting, cosmic background, high quality, no text, no letters."
    },
    {
        name: 'tarot_mag.png',
        prompt: "Tarot card 'Mág' (The Magician), mystical tarot style. Robed figure with infinity symbol, table with cup, sword, wand, pentacle. The word 'Mág' written in elegant gold font at the bottom. 3d render, gold and dark purple color palette, ethereal lighting, cosmic background, high quality, no text, no letters."
    },
    {
        name: 'tarot_veleknezka.png',
        prompt: "Tarot card 'Velekněžka' (High Priestess), mystical tarot style. Seated between pillars, veil of pomegranates, crescent moon. The word 'Velekněžka' written in elegant gold font at the bottom. 3d render, gold and dark purple color palette, ethereal lighting, cosmic background, high quality, no text, no letters."
    },
    {
        name: 'tarot_cisarovna.png',
        prompt: "Tarot card 'Císařovna' (The Empress), mystical tarot style. Seated in field of grain, star crown, venus shield. The word 'Císařovna' written in elegant gold font at the bottom. 3d render, gold and dark purple color palette, ethereal lighting, cosmic background, high quality, no text, no letters."
    },
    {
        name: 'tarot_luna.png',
        prompt: "Tarot card 'Luna' (The Moon), mystical tarot style. Full moon shining on a path between two towers, wolf and dog howling, crayfish in pool. The word 'Luna' written in elegant gold font at the bottom. 3d render, gold and dark purple color palette, ethereal lighting, cosmic background, high quality, no text, no letters."
    },
    {
        name: 'tarot_slunce.png',
        prompt: "Tarot card 'Slunce' (The Sun), mystical tarot style. Radiant sun with face, child riding a white horse in a walled garden, sunflowers. The word 'Slunce' written in elegant gold font at the bottom. 3d render, gold and dark purple color palette, ethereal lighting, cosmic background, high quality, no text, no letters."
    },
    {
        name: 'tarot_soud.png',
        prompt: "Tarot card 'Soud' (Judgement), mystical tarot style. Angel Gabriel blowing a trumpet, figures rising from graves, arms spread. The word 'Soud' written in elegant gold font at the bottom. 3d render, gold and dark purple color palette, ethereal lighting, cosmic background, high quality, no text, no letters."
    },
    {
        name: 'tarot_svet.png',
        prompt: "Tarot card 'Svět' (The World), mystical tarot style. Figure dancing in a laurel wreath, surrounded by lion, bull, eagle, and angel. The word 'Svět' written in elegant gold font at the bottom. 3d render, gold and dark purple color palette, ethereal lighting, cosmic background, high quality, no text, no letters."
    }
];

async function generateAll() {
    console.log(`🚀 Starting generation of ${CARDS_TO_GENERATE.length} cards...`);

    for (const card of CARDS_TO_GENERATE) {
        await generateImage(card.prompt, card.name);
        // Wait a bit to avoid rate limits even on private key
        await new Promise(r => setTimeout(r, 2000));
    }

    console.log('✨ All cards generated!');
}

generateAll();

