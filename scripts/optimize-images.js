#!/usr/bin/env node
/**
 * Image optimization script for Mysticka Hvezda.
 * Converts PNG to WebP and resizes selected blog/background images.
 */
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';

const imgDir = './img';
const backupDir = './img/originals';

async function ensureDir(dir) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
  }
}

async function optimizeAuthors() {
  console.log('[images] Optimizing author images (PNG -> WebP)...');

  const authors = ['elena.png', 'jan.png'];

  for (const file of authors) {
    const inputPath = path.join(imgDir, 'authors', file);
    const outputPath = path.join(imgDir, 'authors', file.replace('.png', '.webp'));
    const backupPath = path.join(backupDir, 'authors', file);

    try {
      await ensureDir(path.dirname(backupPath));
      await fs.copyFile(inputPath, backupPath);

      const stats = await fs.stat(inputPath);
      await sharp(inputPath)
        .webp({ quality: 80 })
        .toFile(outputPath);

      const newStats = await fs.stat(outputPath);
      const savedKB = ((stats.size - newStats.size) / 1024).toFixed(1);
      console.log(`  OK ${file}: ${(stats.size / 1024).toFixed(0)}KB -> ${(newStats.size / 1024).toFixed(0)}KB (-${savedKB}KB)`);
    } catch (err) {
      console.error(`  ERROR processing ${file}:`, err.message);
    }
  }
}

async function optimizeBlogImages() {
  console.log('\n[images] Resizing blog images...');

  const blogFiles = [
    'blog-astrology.webp',
    'blog-divination.webp',
    'blog-dreams.webp',
    'blog-numerology.webp',
    'blog-relationships.webp',
    'blog-spirituality.webp',
    'blog-tarot.webp'
  ];

  for (const file of blogFiles) {
    const inputPath = path.join(imgDir, file);
    const backupPath = path.join(backupDir, file);
    const tempPath = path.join(imgDir, `.${file}.tmp`);

    try {
      await ensureDir(backupDir);
      await fs.copyFile(inputPath, backupPath);

      const stats = await fs.stat(inputPath);
      const img = sharp(inputPath);
      const metadata = await img.metadata();

      const newWidth = Math.min(metadata.width, 800);
      const resized = img.resize(newWidth, Math.round((metadata.height * newWidth) / metadata.width), {
        withoutEnlargement: true,
        fit: 'cover'
      });

      await resized.webp({ quality: 75 }).toFile(tempPath);
      await fs.rename(tempPath, inputPath);

      const newStats = await fs.stat(inputPath);
      const savedKB = ((stats.size - newStats.size) / 1024).toFixed(1);
      console.log(`  OK ${file}: ${(stats.size / 1024).toFixed(0)}KB -> ${(newStats.size / 1024).toFixed(0)}KB (-${savedKB}KB)`);
    } catch (err) {
      console.error(`  ERROR processing ${file}:`, err.message);
    }
  }
}

async function createMobileBackgrounds() {
  console.log('\n[images] Creating mobile background variants...');

  const backgrounds = [
    { src: 'natal-bg.webp', name: 'Natal Chart' },
    { src: 'synastry-bg.webp', name: 'Synastry' },
    { src: 'crystal-ball-bg.webp', name: 'Crystal Ball' },
    { src: 'tarot-bg.webp', name: 'Tarot' }
  ];

  for (const bg of backgrounds) {
    const inputPath = path.join(imgDir, bg.src);
    const outputPath = path.join(imgDir, bg.src.replace('.webp', '-mobile.webp'));
    const backupPath = path.join(backupDir, bg.src);

    try {
      await ensureDir(backupDir);
      await fs.copyFile(inputPath, backupPath);

      const img = sharp(inputPath);
      const metadata = await img.metadata();

      const newWidth = 600;
      const newHeight = Math.round((metadata.height * newWidth) / metadata.width);

      await img
        .resize(newWidth, newHeight, { fit: 'cover' })
        .webp({ quality: 75 })
        .toFile(outputPath);

      const newStats = await fs.stat(outputPath);
      console.log(`  OK ${bg.name}: ${(newStats.size / 1024).toFixed(0)}KB (600px)`);
    } catch (err) {
      console.error(`  ERROR processing ${bg.src}:`, err.message);
    }
  }
}

async function main() {
  console.log('[images] Starting image optimization...\n');

  try {
    await optimizeAuthors();
    await optimizeBlogImages();
    await createMobileBackgrounds();

    console.log('\n[images] Image optimization complete.');
    console.log('   Originals backed up to ./img/originals/');
  } catch (err) {
    console.error('\n[images] Error:', err.message);
    process.exit(1);
  }
}

main();
