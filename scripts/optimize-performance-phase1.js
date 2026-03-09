#!/usr/bin/env node

/**
 * Mystická Hvězda - Performance Optimization Script
 *
 * Phase 1: Replace PNG/JPG with WebP + optimize inline images
 *
 * Changes:
 * - Convert background-image declarations to WebP
 * - Add loading="lazy" to all img tags
 * - Add width/height to images (prevent CLS)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = __dirname;

// Config
const IMAGES_TO_CONVERT = {
    'img/angel-card-back.png': 'img/angel-card-back.webp',
    'img/hero-bg-2.png': 'img/hero-bg-2.webp',
    'img/crystal-ball-bg.jpg': 'img/crystal-ball-bg.webp',
    'img/tarot-bg.jpg': 'img/tarot-bg.webp',
};

const LOG_PREFIX = '[PERF]';

function log(message, level = 'INFO') {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    console.log(`${LOG_PREFIX} [${timestamp}] ${level}: ${message}`);
}

function logSuccess(message) { log(message, '✅'); }
function logWarn(message) { log(message, '⚠️ '); }
function logError(message) { log(message, '❌'); }

async function findFiles(pattern) {
    return new Promise((resolve, reject) => {
        const results = [];
        const glob = require('glob');
        glob.glob(pattern, { cwd: projectRoot }, (err, files) => {
            if (err) reject(err);
            else resolve(files);
        });
    });
}

function updateImagePaths(content) {
    let updated = content;
    let changes = 0;

    // Replace background-image declarations
    for (const [oldPath, newPath] of Object.entries(IMAGES_TO_CONVERT)) {
        const regex = new RegExp(`url\\(['"]?${oldPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]?\\)`, 'g');
        if (regex.test(updated)) {
            updated = updated.replace(regex, `url('${newPath}')`);
            changes++;
            logSuccess(`Replaced ${oldPath} → ${newPath}`);
        }
    }

    return { updated, changes };
}

function addLazyLoading(content) {
    // Add loading="lazy" to <img> tags that don't have it
    const imgRegex = /<img([^>]*)>/g;
    let updated = content;
    let changes = 0;

    updated = updated.replace(imgRegex, (match) => {
        if (match.includes('loading=')) {
            return match;
        }
        changes++;
        return match.replace('>', ' loading="lazy">');
    });

    if (changes > 0) {
        logSuccess(`Added loading="lazy" to ${changes} images`);
    }

    return { updated, changes };
}

function addImageDimensions(content, filePath) {
    // For known images, add width/height to prevent CLS
    const dimensions = {
        'hero-bg': { width: 1920, height: 600 },
        'icon-192': { width: 192, height: 192 },
        'icon-512': { width: 512, height: 512 },
        'crystal-ball-bg': { width: 1200, height: 800 },
    };

    let updated = content;
    let changes = 0;

    for (const [imgName, dims] of Object.entries(dimensions)) {
        const regex = new RegExp(`<img([^>]*src=[^>]*${imgName}[^>]*)>`, 'g');

        updated = updated.replace(regex, (match) => {
            if (match.includes('width=') || match.includes('height=')) {
                return match;
            }
            changes++;
            return match.replace('>', ` width="${dims.width}" height="${dims.height}">`);
        });
    }

    if (changes > 0) {
        logSuccess(`Added dimensions to ${changes} images in ${path.basename(filePath)}`);
    }

    return { updated, changes };
}

async function processHtmlFiles() {
    log('🔍 Scanning HTML files...');

    const htmlFiles = fs.readdirSync(projectRoot)
        .filter(f => f.endsWith('.html'))
        .map(f => path.join(projectRoot, f));

    log(`Found ${htmlFiles.length} HTML files`);

    let totalChanges = 0;
    const filesModified = [];

    for (const filePath of htmlFiles) {
        try {
            let content = fs.readFileSync(filePath, 'utf-8');
            const originalContent = content;

            // Step 1: Replace image paths
            let result = updateImagePaths(content);
            content = result.updated;
            totalChanges += result.changes;

            // Step 2: Add lazy loading
            result = addLazyLoading(content);
            content = result.updated;
            totalChanges += result.changes;

            // Step 3: Add dimensions
            result = addImageDimensions(content, filePath);
            content = result.updated;
            totalChanges += result.changes;

            // Write back if changed
            if (content !== originalContent) {
                fs.writeFileSync(filePath, content, 'utf-8');
                filesModified.push(path.basename(filePath));
            }
        } catch (error) {
            logError(`Failed to process ${filePath}: ${error.message}`);
        }
    }

    return { filesModified, totalChanges };
}

async function checkRedundantImages() {
    log('🖼️  Checking for redundant PNG/JPG files...');

    const redundantImages = [];
    let potentialSavings = 0;

    for (const [oldPath, newPath] of Object.entries(IMAGES_TO_CONVERT)) {
        const oldFile = path.join(projectRoot, oldPath);
        const newFile = path.join(projectRoot, newPath);

        if (fs.existsSync(oldFile) && fs.existsSync(newFile)) {
            const oldSize = fs.statSync(oldFile).size;
            const newSize = fs.statSync(newFile).size;
            const savings = oldSize - newSize;
            const percent = Math.round((savings / oldSize) * 100);

            redundantImages.push({
                old: oldPath,
                new: newPath,
                oldSize,
                newSize,
                savings,
                percent
            });

            potentialSavings += savings;

            logSuccess(
                `${oldPath}: ${Math.round(oldSize/1024)}KB → ${Math.round(newSize/1024)}KB (-${percent}%)`
            );
        }
    }

    log(`\n📊 Total potential savings: ${Math.round(potentialSavings/1024/1024)}MB`);

    return redundantImages;
}

async function removeRedundantImages(redundantImages) {
    log('🗑️  Removing redundant PNG/JPG files...');

    for (const img of redundantImages) {
        const oldPath = path.join(projectRoot, img.old);
        try {
            fs.unlinkSync(oldPath);
            logSuccess(`Deleted ${img.old} (saved ${Math.round(img.savings/1024)}KB)`);
        } catch (error) {
            logError(`Failed to delete ${img.old}: ${error.message}`);
        }
    }
}

async function main() {
    console.log(`
    ╔════════════════════════════════════════════════════╗
    ║  🚀 MYSTICKÁ HVĚZDA - Performance Optimization    ║
    ║     Phase 1: Image Optimization & WebP Migration  ║
    ╚════════════════════════════════════════════════════╝
    `);

    try {
        // Step 1: Check redundancies
        const redundantImages = await checkRedundantImages();

        // Step 2: Process HTML files
        log('\n📝 Processing HTML files...');
        const { filesModified, totalChanges } = await processHtmlFiles();

        log(`\n✅ Modified ${filesModified.length} files with ${totalChanges} total changes:`);
        filesModified.forEach(f => log(`   - ${f}`));

        // Step 3: Ask before deleting
        if (redundantImages.length > 0) {
            log(`\n⚠️  Ready to remove ${redundantImages.length} redundant files?`);
            log(`   This will save ~${Math.round(redundantImages.reduce((sum, img) => sum + img.savings, 0)/1024/1024)}MB`);

            // Auto-remove for CI/non-interactive
            if (process.env.CI === 'true' || process.argv.includes('--auto')) {
                await removeRedundantImages(redundantImages);
            } else {
                log('   Run with --auto flag to remove automatically');
            }
        }

        console.log(`
        ╔════════════════════════════════════════════════════╗
        ║  ✅ OPTIMIZATION COMPLETE!                        ║
        ║                                                    ║
        ║  Summary:                                          ║
        ║  - HTML files: ${filesModified.length} modified                             ║
        ║  - Changes: ${totalChanges} total updates                    ║
        ║  - Potential savings: ${Math.round(redundantImages.reduce((sum, img) => sum + img.savings, 0)/1024/1024)}MB                         ║
        ║                                                    ║
        ║  Next steps:                                       ║
        ║  1. Commit changes                                ║
        ║  2. Test in browser (Lighthouse)                  ║
        ║  3. Deploy & monitor metrics                      ║
        ╚════════════════════════════════════════════════════╝
        `);

    } catch (error) {
        logError(`Fatal error: ${error.message}`);
        process.exit(1);
    }
}

main();
