import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const serviceWorkerPath = path.join(rootDir, 'service-worker.js');
const BINARY_ASSET_EXTENSIONS = new Set([
    '.avif',
    '.gif',
    '.ico',
    '.jpeg',
    '.jpg',
    '.png',
    '.svgz',
    '.webp',
    '.woff',
    '.woff2'
]);

function extractStaticAssets(source) {
    const match = source.match(/const STATIC_ASSETS = \[([\s\S]*?)\];/);
    if (!match) {
        throw new Error('STATIC_ASSETS manifest not found in service-worker.js');
    }

    return [...match[1].matchAll(/'([^']+)'/g)].map((asset) => asset[1]);
}

function validateStaticAssets(assets) {
    const duplicates = assets.filter((asset, index) => assets.indexOf(asset) !== index);
    if (duplicates.length > 0) {
        throw new Error(`STATIC_ASSETS contains duplicate entries: ${[...new Set(duplicates)].join(', ')}`);
    }

    const invalidAssets = assets.filter((asset) => asset !== '/' && !asset.startsWith('/'));
    if (invalidAssets.length > 0) {
        throw new Error(`STATIC_ASSETS entries must be root-relative paths: ${invalidAssets.join(', ')}`);
    }

    const emptyAssets = assets.filter((asset) => asset.trim() === '');
    if (emptyAssets.length > 0) {
        throw new Error('STATIC_ASSETS contains empty entries');
    }
}

async function buildCacheName(assets) {
    const hash = createHash('sha256');

    for (const asset of assets) {
        if (asset === '/') continue;

        const assetPath = path.join(rootDir, asset.replace(/^\//, ''));
        const content = await readFile(assetPath);
        hash.update(asset);
        hash.update('\0');
        hash.update(normalizeAssetContent(asset, content));
        hash.update('\0');
    }

    return `mysticka-hvezda-${hash.digest('hex').slice(0, 12)}`;
}

function normalizeAssetContent(asset, content) {
    const extension = path.extname(asset).toLowerCase();
    if (BINARY_ASSET_EXTENSIONS.has(extension)) {
        return content;
    }

    return Buffer.from(content.toString('utf8').replace(/\r\n?/g, '\n'));
}

const source = await readFile(serviceWorkerPath, 'utf8');
const assets = extractStaticAssets(source);
validateStaticAssets(assets);
const cacheName = await buildCacheName(assets);
const nextSource = source.replace(
    /const CACHE_NAME = 'mysticka-hvezda-[^']+';/,
    `const CACHE_NAME = '${cacheName}';`
);

if (nextSource === source) {
    console.log(`[SW] Cache name already current: ${cacheName}`);
} else {
    await writeFile(serviceWorkerPath, nextSource);
    console.log(`[SW] Updated cache name: ${cacheName}`);
}
