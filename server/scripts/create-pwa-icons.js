import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../');

const sourceLogo = path.join(projectRoot, 'img/logo-3d.webp');
const bgColor = { r: 5, g: 5, b: 16, alpha: 1 }; // --color-deep-space

async function createIcons() {
    console.log('🎨 Creating PWA icons from logo...');

    // 512x512
    await sharp(sourceLogo)
        .resize(512, 512, { fit: 'contain', background: bgColor })
        .toFile(path.join(projectRoot, 'img/icon-512.webp'));
    console.log('✅ Created icon-512.webp');

    // 192x192
    await sharp(sourceLogo)
        .resize(192, 192, { fit: 'contain', background: bgColor })
        .toFile(path.join(projectRoot, 'img/icon-192.webp'));
    console.log('✅ Created icon-192.webp');

    console.log('🎉 PWA icons ready!');
}

createIcons();
