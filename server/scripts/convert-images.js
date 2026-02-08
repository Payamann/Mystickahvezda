import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '../../');
const imgDir = path.join(projectRoot, 'img');

// Recursive function to get all files
function getAllFiles(dirPath, arrayOfFiles) {
    const files = fs.readdirSync(dirPath);

    arrayOfFiles = arrayOfFiles || [];

    files.forEach(function (file) {
        if (fs.statSync(dirPath + "/" + file).isDirectory()) {
            arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
        } else {
            arrayOfFiles.push(path.join(dirPath, "/", file));
        }
    });

    return arrayOfFiles;
}

async function convertImages() {
    console.log(`🔍 Scanning for images in: ${imgDir}`);

    try {
        const allFiles = getAllFiles(imgDir);
        const imageFiles = allFiles.filter(file => {
            const ext = path.extname(file).toLowerCase();
            return (ext === '.png' || ext === '.jpg' || ext === '.jpeg') && !file.includes('node_modules');
        });

        console.log(`found ${imageFiles.length} images to optimize.`);

        let convertedCount = 0;
        let savedBytes = 0;

        for (const file of imageFiles) {
            const ext = path.extname(file);
            const fileName = path.basename(file, ext);
            const dir = path.dirname(file);
            const outputFile = path.join(dir, `${fileName}.webp`);

            // Skip if WebP already exists and is newer
            if (fs.existsSync(outputFile)) {
                const originalStat = fs.statSync(file);
                const webpStat = fs.statSync(outputFile);
                if (webpStat.mtime > originalStat.mtime) {
                    console.log(`⏩ Skipping ${fileName} (WebP already up to date)`);
                    continue;
                }
            }

            try {
                const info = await sharp(file)
                    .webp({ quality: 80, effort: 4 }) // Effort 4 is a good balance (defaults to 4)
                    .toFile(outputFile);

                const originalSize = fs.statSync(file).size;
                const newSize = info.size;
                const savings = originalSize - newSize;

                if (savings > 0) {
                    savedBytes += savings;
                    console.log(`✅ Converted: ${fileName}${ext} -> .webp (-${(savings / 1024).toFixed(1)} KB)`);
                    convertedCount++;
                } else {
                    console.log(`⚠️  Kept original: ${fileName}${ext} (WebP was larger, but keeping WebP for compatibility)`);
                    // We keep it for simplified code references (user wants to use .webp everywhere)
                    convertedCount++;
                }

            } catch (err) {
                console.error(`❌ Failed to convert ${fileName}:`, err.message);
            }
        }

        console.log('---');
        console.log(`🎉 Optimization complete!`);
        console.log(`📦 Converted ${convertedCount} images.`);
        console.log(`💾 Total space saved: ${(savedBytes / 1024 / 1024).toFixed(2)} MB`);

    } catch (error) {
        console.error('Fatal error scanning directory:', error);
    }
}

// Run
convertImages();
