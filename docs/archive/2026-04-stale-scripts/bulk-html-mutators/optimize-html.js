import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

const files = fs.readdirSync(rootDir).filter(f => f.endsWith('.html'));

let modifiedCount = 0;

for (const file of files) {
    const filePath = path.join(rootDir, file);
    let html = fs.readFileSync(filePath, 'utf8');
    let originalHtml = html;

    // 1. Add defer to external scripts (skip if already deferred, async, or module wrapper)
    html = html.replace(/<script\s+([^>]*?)>/gi, (match, p1) => {
        if (p1.includes('defer') || p1.includes('async') || p1.includes('type="module"')) {
            return match;
        }
        if (!p1.includes('src=')) {
            return match; // Inline script
        }
        console.log(`Adding defer to script in ${file}: <script ${p1}>`);
        return `<script ${p1} defer>`;
    });

    // 2. Modify Stripe to use defer if it uses async, strictly to ensure ordering if needed,
    // though async is generally fine. We'll just leave it if it has async.
    // Let's explicitly look for js.stripe.com/v3/ and ensure it doesn't block.
    html = html.replace(/<script src="https:\/\/js\.stripe\.com\/v3\/"(?!.*(defer|async))[^>]*>/, '<script src="https://js.stripe.com/v3/" defer>');

    // 3. Add lazy loading to images
    html = html.replace(/<img\s+([^>]*?)>/gi, (match, p1) => {
        if (p1.includes('loading=')) {
            return match;
        }
        // Exclude hero images or those with priority
        if (p1.includes('hero') || p1.includes('fetchpriority="high"')) {
            return match;
        }
        return `<img loading="lazy" ${p1}>`;
    });

    // 4. Change world map png to webp
    html = html.replace(/world-map-flat\.png/g, 'world-map-flat.webp');

    if (html !== originalHtml) {
        fs.writeFileSync(filePath, html, 'utf8');
        console.log(`Updated ${file}`);
        modifiedCount++;
    }
}

console.log(`\nSuccessfully updated ${modifiedCount} HTML files!`);
