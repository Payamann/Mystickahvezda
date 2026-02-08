import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const input = path.join(process.cwd(), '../img/logo-3d.png');
const output = path.join(process.cwd(), '../img/logo-3d.webp');

async function convert() {
    try {
        console.log(`Converting ${input} to ${output}...`);
        await sharp(input)
            .webp({ quality: 90, nearLossless: true })
            .toFile(output);
        console.log('✅ Conversion successful!');
    } catch (error) {
        console.error('❌ Error converting logo:', error);
    }
}

convert();
