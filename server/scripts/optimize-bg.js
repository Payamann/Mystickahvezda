
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const projectRoot = path.join(__dirname, '../../');
const inputPath = path.join(projectRoot, 'img', 'bg-cosmic-hd.png');
const outputPathDesktop = path.join(projectRoot, 'img', 'bg-cosmic-hd.webp');
const outputPathMobile = path.join(projectRoot, 'img', 'bg-cosmic-mobile.webp');

async function optimizeImages() {
    try {
        console.log('Starting image optimization...');

        if (!fs.existsSync(inputPath)) {
            console.error('Input file not found:', inputPath);
            return;
        }

        // 1. Desktop HD Version (Quality 80, WebP)
        await sharp(inputPath)
            .webp({ quality: 80, effort: 6 })
            .toFile(outputPathDesktop);
        console.log(`Created desktop background: ${outputPathDesktop}`);

        // 2. Mobile Version (Resize to 1080px width, Quality 75, WebP)
        await sharp(inputPath)
            .resize(1080, null) // Auto height
            .webp({ quality: 75, effort: 6 })
            .toFile(outputPathMobile);
        console.log(`Created mobile background: ${outputPathMobile}`);

        console.log('Optimization complete!');
    } catch (error) {
        console.error('Error optimizing images:', error);
    }
}

optimizeImages();
