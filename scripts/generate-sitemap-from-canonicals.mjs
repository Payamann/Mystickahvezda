import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const siteOrigin = process.env.SITE_ORIGIN || 'https://www.mystickahvezda.cz';
const sitemapPath = path.join(rootDir, 'sitemap.xml');
const defaultOutputPath = path.join(rootDir, 'tmp', 'sitemap.generated.xml');

const skippedDirs = new Set([
    '.git',
    '.agents',
    '.claude',
    '.claire',
    '.pytest_cache',
    'components',
    'coverage',
    'docs',
    'node_modules',
    'playwright-report',
    'social-media-agent',
    'templates',
    'test-results',
    'tests',
    'tmp',
    'tmp_email_previews'
]);

const args = process.argv.slice(2);
const shouldCheck = args.includes('--check');
const shouldWrite = args.includes('--write');

function getArgValue(name) {
    const index = args.indexOf(name);
    if (index === -1) return null;
    return args[index + 1] || null;
}

if (shouldWrite && getArgValue('--output')) {
    console.error('[sitemap] Use either --write or --output, not both.');
    process.exit(1);
}

function read(file) {
    return fs.readFileSync(file, 'utf8');
}

function relative(file) {
    return path.relative(rootDir, file).replace(/\\/g, '/');
}

function walkHtml(dir = rootDir, out = []) {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
        .sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            if (!skippedDirs.has(entry.name)) {
                walkHtml(fullPath, out);
            }
            continue;
        }

        if (entry.isFile() && entry.name.endsWith('.html')) {
            out.push(fullPath);
        }
    }

    return out;
}

function getAttribute(tag, name) {
    const match = tag.match(new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`, 'i'));
    return match ? match[1] : null;
}

function getCanonical(html) {
    const match = html.match(/<link\b[^>]*rel\s*=\s*["']canonical["'][^>]*>/i)
        || html.match(/<link\b[^>]*href\s*=\s*["'][^"']+["'][^>]*rel\s*=\s*["']canonical["'][^>]*>/i);

    return match ? getAttribute(match[0], 'href') : null;
}

function getRobots(html) {
    const match = html.match(/<meta\b[^>]*name\s*=\s*["']robots["'][^>]*>/i)
        || html.match(/<meta\b[^>]*content\s*=\s*["'][^"']+["'][^>]*name\s*=\s*["']robots["'][^>]*>/i);

    return match ? getAttribute(match[0], 'content') : null;
}

function isNoindex(html) {
    return /\bnoindex\b/i.test(getRobots(html) || '');
}

function getTagValue(xml, tagName) {
    const match = xml.match(new RegExp(`<${tagName}>([^<]+)<\\/${tagName}>`, 'i'));
    return match ? match[1].trim() : null;
}

function parseExistingSitemap() {
    const xml = read(sitemapPath);
    const entries = [];
    const metadataByLoc = new Map();
    const orderByLoc = new Map();
    const blocks = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)];

    for (const [index, blockMatch] of blocks.entries()) {
        const block = blockMatch[1];
        const loc = getTagValue(block, 'loc');
        if (!loc) continue;

        const entry = {
            loc,
            lastmod: getTagValue(block, 'lastmod'),
            changefreq: getTagValue(block, 'changefreq'),
            priority: getTagValue(block, 'priority')
        };

        entries.push(entry);
        metadataByLoc.set(loc, entry);
        orderByLoc.set(loc, index);
    }

    return {
        entries,
        locs: new Set(entries.map((entry) => entry.loc)),
        metadataByLoc,
        orderByLoc
    };
}

function collectCanonicalPages() {
    const pages = [];
    const owners = new Map();

    for (const file of walkHtml()) {
        const html = read(file);
        if (isNoindex(html)) continue;

        const canonical = getCanonical(html);
        if (!canonical) continue;

        let parsed;
        try {
            parsed = new URL(canonical);
        } catch {
            continue;
        }

        if (parsed.origin !== siteOrigin) continue;

        const rel = relative(file);
        const canonicalOwners = owners.get(canonical) || [];
        canonicalOwners.push(rel);
        owners.set(canonical, canonicalOwners);

        pages.push({
            loc: canonical,
            file,
            rel
        });
    }

    const duplicates = [...owners.entries()].filter(([, locOwners]) => locOwners.length > 1);
    if (duplicates.length > 0) {
        console.error('[sitemap] Duplicate canonical URL(s) found:');
        for (const [loc, locOwners] of duplicates) {
            console.error(`- ${loc}: ${locOwners.join(', ')}`);
        }
        process.exit(1);
    }

    return pages;
}

function dateFromMtime(file) {
    return fs.statSync(file).mtime.toISOString().slice(0, 10);
}

function inferMetadata(loc, file, existingMetadata) {
    if (
        existingMetadata
        && existingMetadata.lastmod
        && existingMetadata.changefreq
        && existingMetadata.priority
    ) {
        return {
            lastmod: existingMetadata.lastmod,
            changefreq: existingMetadata.changefreq,
            priority: existingMetadata.priority
        };
    }

    const { pathname } = new URL(loc);
    const isHome = pathname === '/';
    const isDailyHub = [
        '/blog.html',
        '/horoskopy.html',
        '/lunace.html',
        '/tarot.html'
    ].includes(pathname);
    const isWeeklyHub = [
        '/horoskop/',
        '/slovnik.html',
        '/natalni-karta.html',
        '/numerologie.html',
        '/partnerska-shoda.html'
    ].includes(pathname);

    if (isHome) {
        return { lastmod: dateFromMtime(file), changefreq: 'daily', priority: '1.0' };
    }

    if (isDailyHub) {
        return { lastmod: dateFromMtime(file), changefreq: 'daily', priority: '0.9' };
    }

    if (isWeeklyHub || pathname.startsWith('/horoskop/') || pathname.startsWith('/pl/') || pathname.startsWith('/sk/')) {
        return { lastmod: dateFromMtime(file), changefreq: 'weekly', priority: '0.8' };
    }

    if (pathname.startsWith('/blog/')) {
        return { lastmod: dateFromMtime(file), changefreq: 'monthly', priority: '0.8' };
    }

    if (pathname.startsWith('/kompatibilita/')) {
        return { lastmod: dateFromMtime(file), changefreq: 'monthly', priority: '0.7' };
    }

    if (pathname.startsWith('/slovnik/') || pathname.startsWith('/testy/')) {
        return { lastmod: dateFromMtime(file), changefreq: 'monthly', priority: '0.6' };
    }

    return { lastmod: dateFromMtime(file), changefreq: 'monthly', priority: '0.5' };
}

function comparePages(existingOrder) {
    return (a, b) => {
        const aOrder = existingOrder.get(a.loc);
        const bOrder = existingOrder.get(b.loc);

        if (aOrder !== undefined && bOrder !== undefined) return aOrder - bOrder;
        if (aOrder !== undefined) return -1;
        if (bOrder !== undefined) return 1;

        return a.loc.localeCompare(b.loc);
    };
}

function escapeXml(value) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function buildSitemapXml(pages, existingSitemap) {
    const entries = pages
        .slice()
        .sort(comparePages(existingSitemap.orderByLoc))
        .map((page) => {
            const metadata = inferMetadata(page.loc, page.file, existingSitemap.metadataByLoc.get(page.loc));

            return `  <url>
    <loc>${escapeXml(page.loc)}</loc>
    <lastmod>${escapeXml(metadata.lastmod)}</lastmod>
    <changefreq>${escapeXml(metadata.changefreq)}</changefreq>
    <priority>${escapeXml(metadata.priority)}</priority>
  </url>`;
        });

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>
`;
}

function checkCurrentSitemap(currentLocs, generatedLocs) {
    const missing = [...generatedLocs].filter((loc) => !currentLocs.has(loc)).sort();
    const stale = [...currentLocs].filter((loc) => !generatedLocs.has(loc)).sort();

    if (missing.length === 0 && stale.length === 0) {
        console.log(`[sitemap] OK: sitemap.xml matches ${generatedLocs.size} indexable canonical URL(s).`);
        return;
    }

    if (missing.length > 0) {
        console.error('[sitemap] Missing from sitemap.xml:');
        for (const loc of missing) console.error(`- ${loc}`);
    }

    if (stale.length > 0) {
        console.error('[sitemap] Present in sitemap.xml but not an indexable canonical URL:');
        for (const loc of stale) console.error(`- ${loc}`);
    }

    process.exit(1);
}

const existingSitemap = parseExistingSitemap();
const pages = collectCanonicalPages();
const generatedLocs = new Set(pages.map((page) => page.loc));

if (shouldCheck) {
    checkCurrentSitemap(existingSitemap.locs, generatedLocs);
}

if (!shouldCheck) {
    const outputPath = shouldWrite
        ? sitemapPath
        : path.resolve(rootDir, getArgValue('--output') || defaultOutputPath);

    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, buildSitemapXml(pages, existingSitemap), 'utf8');
    console.log(`[sitemap] Generated ${pages.length} URL(s) from canonical HTML pages: ${relative(outputPath)}`);

    if (!shouldWrite) {
        console.log('[sitemap] Review the generated file first; pass --write to replace sitemap.xml.');
    }
}
