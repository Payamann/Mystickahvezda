
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const SOURCE_IMAGE = 'img/logo-3d.webp';
const OUTPUT_DIR = 'img';
const SIZES = [192, 512];

async function generateIcons() {
    console.log(`🎨 Generating PWA Icons from ${SOURCE_IMAGE}...`);

    if (!fs.existsSync(SOURCE_IMAGE)) {
        console.error(`❌ Source image not found: ${SOURCE_IMAGE}`);
        process.exit(1);
    }

    for (const size of SIZES) {
        const outputPath = path.join(OUTPUT_DIR, `icon-${size}.png`);

        try {
            await sharp(SOURCE_IMAGE)
                .resize(size, size, {
                    fit: 'contain',
                    background: { r: 10, g: 10, b: 26, alpha: 1 } // #0a0a1a background
                })
                .toFormat('png')
                .toFile(outputPath);

            console.log(`✅ Created ${outputPath}`);
        } catch (error) {
            console.error(`❌ Error creating ${size}x${size} icon:`, error);
        }
    }
}

generateIcons();
