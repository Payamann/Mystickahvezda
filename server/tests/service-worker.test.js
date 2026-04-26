/**
 * Service worker cache manifest tests
 */

import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';

const ROOT_DIR = path.resolve(process.cwd());
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

function readStaticAssets() {
    const swSource = fs.readFileSync(path.join(ROOT_DIR, 'service-worker.js'), 'utf8');
    const match = swSource.match(/const STATIC_ASSETS = \[([\s\S]*?)\];/);
    if (!match) {
        throw new Error('STATIC_ASSETS manifest not found in service-worker.js');
    }

    return [...match[1].matchAll(/'([^']+)'/g)].map((asset) => asset[1]);
}

function readCacheName() {
    const swSource = fs.readFileSync(path.join(ROOT_DIR, 'service-worker.js'), 'utf8');
    const match = swSource.match(/const CACHE_NAME = '([^']+)';/);
    if (!match) {
        throw new Error('CACHE_NAME not found in service-worker.js');
    }

    return match[1];
}

function buildExpectedCacheName(assets) {
    const hash = createHash('sha256');

    for (const asset of assets) {
        if (asset === '/') continue;

        const filePath = path.join(ROOT_DIR, asset.replace(/^\//, ''));
        hash.update(asset);
        hash.update('\0');
        hash.update(normalizeAssetContent(asset, fs.readFileSync(filePath)));
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

describe('Service worker cache manifest', () => {
    test('STATIC_ASSETS only contains unique root-relative paths', () => {
        const assets = readStaticAssets();

        expect(new Set(assets).size).toBe(assets.length);
        expect(assets.every((asset) => asset === '/' || asset.startsWith('/'))).toBe(true);
        expect(assets.every((asset) => asset.trim() !== '')).toBe(true);
    });

    test('STATIC_ASSETS references existing local files', () => {
        const assets = readStaticAssets();

        expect(assets.length).toBeGreaterThan(0);

        for (const asset of assets) {
            if (asset === '/') continue;

            const filePath = path.join(ROOT_DIR, asset.replace(/^\//, ''));
            expect(fs.existsSync(filePath)).toBe(true);
        }
    });

    test('business-critical funnel assets are pre-cached', () => {
        const assets = readStaticAssets();

        expect(assets).toEqual(expect.arrayContaining([
            '/cenik.html',
            '/rocni-horoskop.html',
            '/js/dist/cenik.js',
            '/js/dist/rocni-horoskop.js',
            '/js/dist/analytics.js',
            '/js/dist/retention.js'
        ]));
    });

    test('CACHE_NAME is derived from current pre-cache asset contents', () => {
        const assets = readStaticAssets();

        expect(readCacheName()).toBe(buildExpectedCacheName(assets));
    });
});
