
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '../../');
const jsonPath = path.join(projectRoot, 'data/tarot-cards.json');

async function checkFiles() {
    console.log('--- Verifying Tarot Image Paths ---');

    if (!fs.existsSync(jsonPath)) {
        console.error('JSON file not found!');
        return;
    }

    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const cards = Object.keys(data); // keys are card names
    let missingCount = 0;
    let successCount = 0;

    for (const cardName of cards) {
        const card = data[cardName];
        if (card.image) {
            // card.image is relative like "img/tarot/file.webp"
            const fullPath = path.join(projectRoot, card.image);
            if (!fs.existsSync(fullPath)) {
                console.error(`MISSING: [${cardName}] -> ${card.image}`);
                missingCount++;
            } else {
                successCount++;
            }
        } else {
            console.warn(`NO IMAGE DEFINED: [${cardName}]`);
        }
    }

    console.log('\n--- Summary ---');
    console.log(`Total Cards: ${cards.length}`);
    console.log(`Found: ${successCount}`);
    console.log(`Missing: ${missingCount}`);
}

checkFiles();
