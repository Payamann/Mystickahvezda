import fs from 'fs';
import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../');

const sourceLogo = path.join(projectRoot, 'img/logo-3d.webp');
const bgColor = { r: 5, g: 5, b: 16, alpha: 1 }; // --color-deep-space
const iconOutputs = [
    { size: 512, format: 'webp', filename: 'icon-512.webp' },
    { size: 192, format: 'webp', filename: 'icon-192.webp' },
    { size: 192, format: 'png', filename: 'icon-192.png' }
];

async function createIcons() {
    console.log('Creating PWA icons from logo...');

    if (!fs.existsSync(sourceLogo)) {
        throw new Error(`Source logo not found: ${sourceLogo}`);
    }

    for (const icon of iconOutputs) {
        await sharp(sourceLogo)
            .resize(icon.size, icon.size, { fit: 'contain', background: bgColor })
            .toFormat(icon.format)
            .toFile(path.join(projectRoot, 'img', icon.filename));

        console.log(`Created ${icon.filename}`);
    }

    console.log('PWA icons ready.');
}

createIcons();
