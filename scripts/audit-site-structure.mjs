import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const siteOrigin = process.env.SITE_ORIGIN || 'https://www.mystickahvezda.cz';
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

const issues = [];
const allowedChangefreq = new Set([
    'always',
    'hourly',
    'daily',
    'weekly',
    'monthly',
    'yearly',
    'never'
]);
const publicSourceExtensions = new Set([
    '.html',
    '.js',
    '.json',
    '.mjs',
    '.txt',
    '.xml',
    '.yaml',
    '.yml'
]);
const nonCanonicalOrigin = siteOrigin.replace('https://www.', 'https://');
const allowedNonCanonicalOriginLines = new Map([
    ['server/index.js', new Set([`'${nonCanonicalOrigin}',`])]
]);

function report(type, file, detail) {
    issues.push({ type, file, detail });
}

function read(file) {
    return fs.readFileSync(file, 'utf8');
}

function walkHtml(dir = rootDir, out = []) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
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

function walkPublicSourceFiles(dir = rootDir, out = []) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            if (!skippedDirs.has(entry.name)) {
                walkPublicSourceFiles(fullPath, out);
            }
            continue;
        }

        if (entry.isFile() && publicSourceExtensions.has(path.extname(entry.name).toLowerCase())) {
            out.push(fullPath);
        }
    }

    return out;
}

function relative(file) {
    return path.relative(rootDir, file).replace(/\\/g, '/');
}

function localPathForSiteUrl(url) {
    const parsed = new URL(url);
    let pathname = decodeURIComponent(parsed.pathname);

    if (pathname === '/') return 'index.html';
    if (pathname.endsWith('/')) return path.join(pathname.slice(1), 'index.html');

    return pathname.replace(/^\/+/, '');
}

function localTargetForAssetUrl(assetUrl, sourceFile) {
    if (!assetUrl || assetUrl.startsWith('#')) return null;
    if (/^(?:https?:)?\/\//i.test(assetUrl)) return null;
    if (/^(?:mailto|tel|data|javascript):/i.test(assetUrl)) return null;

    const cleanUrl = assetUrl.split('#')[0].split('?')[0];
    if (!cleanUrl) return null;

    if (cleanUrl === '/') return path.join(rootDir, 'index.html');
    if (cleanUrl.startsWith('/')) {
        const localPath = cleanUrl.endsWith('/')
            ? path.join(cleanUrl.slice(1), 'index.html')
            : cleanUrl.slice(1);
        return path.join(rootDir, localPath);
    }

    const targetPath = cleanUrl.endsWith('/')
        ? path.join(cleanUrl, 'index.html')
        : cleanUrl;

    return path.resolve(path.dirname(sourceFile), targetPath);
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

function getTagValue(xml, tagName) {
    const match = xml.match(new RegExp(`<${tagName}>([^<]+)<\\/${tagName}>`, 'i'));
    return match ? match[1].trim() : null;
}

function isValidDateOnly(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return false;

    const [, year, month, day] = match.map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year
        && date.getUTCMonth() === month - 1
        && date.getUTCDate() === day;
}

function getRobots(html) {
    const match = html.match(/<meta\b[^>]*name\s*=\s*["']robots["'][^>]*>/i)
        || html.match(/<meta\b[^>]*content\s*=\s*["'][^"']+["'][^>]*name\s*=\s*["']robots["'][^>]*>/i);

    return match ? getAttribute(match[0], 'content') : null;
}

function isNoindex(html) {
    return /\bnoindex\b/i.test(getRobots(html) || '');
}

function parseSitemap() {
    const sitemapPath = path.join(rootDir, 'sitemap.xml');
    const sitemap = read(sitemapPath);
    const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1].trim());
    const seen = new Set();
    const urlBlocks = [...sitemap.matchAll(/<url>([\s\S]*?)<\/url>/g)];

    for (const [index, blockMatch] of urlBlocks.entries()) {
        const block = blockMatch[1];
        const loc = getTagValue(block, 'loc');
        const lastmod = getTagValue(block, 'lastmod');
        const changefreq = getTagValue(block, 'changefreq');
        const priority = getTagValue(block, 'priority');

        if (!loc) report('missing_sitemap_loc', 'sitemap.xml', `url[${index}]`);

        if (!lastmod) {
            report('missing_sitemap_lastmod', 'sitemap.xml', loc || `url[${index}]`);
        } else if (!isValidDateOnly(lastmod)) {
            report('invalid_sitemap_lastmod', 'sitemap.xml', `${loc || `url[${index}]`} -> ${lastmod}`);
        }

        if (!changefreq) {
            report('missing_sitemap_changefreq', 'sitemap.xml', loc || `url[${index}]`);
        } else if (!allowedChangefreq.has(changefreq)) {
            report('invalid_sitemap_changefreq', 'sitemap.xml', `${loc || `url[${index}]`} -> ${changefreq}`);
        }

        if (!priority) {
            report('missing_sitemap_priority', 'sitemap.xml', loc || `url[${index}]`);
        } else {
            const numericPriority = Number(priority);
            if (!Number.isFinite(numericPriority) || numericPriority < 0 || numericPriority > 1) {
                report('invalid_sitemap_priority', 'sitemap.xml', `${loc || `url[${index}]`} -> ${priority}`);
            }
        }
    }

    for (const loc of locs) {
        if (seen.has(loc)) {
            report('duplicate_sitemap_loc', 'sitemap.xml', loc);
        }
        seen.add(loc);

        let parsed;
        try {
            parsed = new URL(loc);
        } catch {
            report('invalid_sitemap_url', 'sitemap.xml', loc);
            continue;
        }

        if (parsed.origin !== siteOrigin) {
            report('unexpected_sitemap_origin', 'sitemap.xml', loc);
            continue;
        }

        const localPath = localPathForSiteUrl(loc);
        const fullPath = path.join(rootDir, localPath);
        if (!fs.existsSync(fullPath)) {
            report('missing_sitemap_target', 'sitemap.xml', `${loc} -> ${localPath}`);
            continue;
        }

        if (localPath.endsWith('.html')) {
            const html = read(fullPath);
            if (isNoindex(html)) {
                report('noindex_sitemap_target', localPath, loc);
                continue;
            }

            const canonical = getCanonical(html);
            if (!canonical) {
                report('missing_canonical_for_sitemap_page', localPath, loc);
            } else if (canonical !== loc) {
                report('sitemap_canonical_mismatch', localPath, `sitemap=${loc} canonical=${canonical}`);
            }
        }
    }

    return new Set(locs);
}

function auditJsonLd(file, html) {
    const scriptPattern = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
    let match;

    while ((match = scriptPattern.exec(html)) !== null) {
        const attrs = match[1] || '';
        if (!/type\s*=\s*["']application\/ld\+json["']/i.test(attrs)) continue;

        const body = (match[2] || '').trim();
        if (!body) continue;

        try {
            JSON.parse(body);
        } catch (error) {
            report('invalid_json_ld', relative(file), error.message);
        }
    }
}

function auditCanonical(file, html) {
    const canonical = getCanonical(html);
    if (!canonical) return;

    let parsed;
    try {
        parsed = new URL(canonical);
    } catch {
        report('invalid_canonical_url', relative(file), canonical);
        return;
    }

    if (parsed.origin !== siteOrigin) {
        report('unexpected_canonical_origin', relative(file), canonical);
        return;
    }

    const localPath = localPathForSiteUrl(canonical);
    const fullPath = path.join(rootDir, localPath);
    if (!fs.existsSync(fullPath)) {
        report('missing_canonical_target', relative(file), `${canonical} -> ${localPath}`);
    }
}

function auditLocalLinks(file, html) {
    const attrPattern = /\s(?:href|src|poster)\s*=\s*["']([^"']+)["']/gi;
    const srcsetPattern = /\ssrcset\s*=\s*["']([^"']+)["']/gi;
    let match;

    while ((match = attrPattern.exec(html)) !== null) {
        const target = localTargetForAssetUrl(match[1], file);
        if (!target) continue;

        if (!fs.existsSync(target)) {
            report('missing_local_link_target', relative(file), `${match[1]} -> ${relative(target)}`);
        }
    }

    while ((match = srcsetPattern.exec(html)) !== null) {
        const candidates = match[1]
            .split(',')
            .map((candidate) => candidate.trim().split(/\s+/)[0])
            .filter(Boolean);

        for (const candidate of candidates) {
            const target = localTargetForAssetUrl(candidate, file);
            if (!target) continue;

            if (!fs.existsSync(target)) {
                report('missing_local_srcset_target', relative(file), `${candidate} -> ${relative(target)}`);
            }
        }
    }
}

function auditMetaImageTargets(file, html) {
    const metaPattern = /<meta\b[^>]*>/gi;
    let match;

    while ((match = metaPattern.exec(html)) !== null) {
        const tag = match[0];
        const property = getAttribute(tag, 'property') || getAttribute(tag, 'name') || '';
        if (!/^(?:og:image|twitter:image)$/i.test(property)) continue;

        const content = getAttribute(tag, 'content');
        if (!content) {
            report('missing_meta_image_content', relative(file), property);
            continue;
        }

        let target = localTargetForAssetUrl(content, file);

        if (!target && /^https?:\/\//i.test(content)) {
            let parsed;
            try {
                parsed = new URL(content);
            } catch {
                report('invalid_meta_image_url', relative(file), content);
                continue;
            }

            if (parsed.origin === siteOrigin) {
                target = path.join(rootDir, localPathForSiteUrl(content));
            }
        }

        if (target && !fs.existsSync(target)) {
            report('missing_meta_image_target', relative(file), `${content} -> ${relative(target)}`);
        }
    }
}

function auditManifest() {
    const manifestPath = path.join(rootDir, 'manifest.json');
    if (!fs.existsSync(manifestPath)) {
        report('missing_manifest', 'manifest.json', 'manifest.json is not present');
        return;
    }

    let manifest;
    try {
        manifest = JSON.parse(read(manifestPath));
    } catch (error) {
        report('invalid_manifest_json', 'manifest.json', error.message);
        return;
    }

    if (!Array.isArray(manifest.icons) || manifest.icons.length === 0) {
        report('missing_manifest_icons', 'manifest.json', 'icons array is empty or missing');
        return;
    }

    for (const [index, icon] of manifest.icons.entries()) {
        if (!icon.src) {
            report('missing_manifest_icon_src', 'manifest.json', `icons[${index}] has no src`);
            continue;
        }

        const target = localTargetForAssetUrl(icon.src, manifestPath);
        if (target && !fs.existsSync(target)) {
            report('missing_manifest_icon_target', 'manifest.json', `${icon.src} -> ${relative(target)}`);
        }
    }
}

function auditRobotsTxt() {
    const robotsPath = path.join(rootDir, 'robots.txt');
    if (!fs.existsSync(robotsPath)) {
        report('missing_robots_txt', 'robots.txt', 'robots.txt is not present');
        return;
    }

    const robots = read(robotsPath);
    const sitemapUrls = [...robots.matchAll(/^Sitemap:\s*(\S+)\s*$/gmi)].map((match) => match[1]);
    const expectedSitemapUrl = `${siteOrigin}/sitemap.xml`;

    if (!sitemapUrls.includes(expectedSitemapUrl)) {
        report('missing_robots_sitemap', 'robots.txt', expectedSitemapUrl);
    }

    for (const sitemapUrl of sitemapUrls) {
        let parsed;
        try {
            parsed = new URL(sitemapUrl);
        } catch {
            report('invalid_robots_sitemap_url', 'robots.txt', sitemapUrl);
            continue;
        }

        if (parsed.origin !== siteOrigin) {
            report('unexpected_robots_sitemap_origin', 'robots.txt', sitemapUrl);
        }
    }
}

function auditSitemapCoverage(file, html, sitemapLocs) {
    if (isNoindex(html)) return;

    const canonical = getCanonical(html);
    if (!canonical) return;

    let parsed;
    try {
        parsed = new URL(canonical);
    } catch {
        return;
    }

    if (parsed.origin !== siteOrigin) return;

    if (!sitemapLocs.has(canonical)) {
        report('indexable_canonical_missing_from_sitemap', relative(file), canonical);
    }
}

function collectIndexableCanonical(file, html, canonicalOwners) {
    if (isNoindex(html)) return;

    const canonical = getCanonical(html);
    if (!canonical) return;

    let parsed;
    try {
        parsed = new URL(canonical);
    } catch {
        return;
    }

    if (parsed.origin !== siteOrigin) return;

    const owners = canonicalOwners.get(canonical) || [];
    owners.push(relative(file));
    canonicalOwners.set(canonical, owners);
}

function auditDuplicateIndexableCanonicals(canonicalOwners) {
    for (const [canonical, owners] of canonicalOwners.entries()) {
        if (owners.length <= 1) continue;

        report(
            'duplicate_indexable_canonical',
            owners[0],
            `${canonical} also used by ${owners.slice(1).join(', ')}`
        );
    }
}

function auditCanonicalOriginReferences() {
    if (nonCanonicalOrigin === siteOrigin) return;

    for (const file of walkPublicSourceFiles()) {
        const rel = relative(file);
        const allowedLines = allowedNonCanonicalOriginLines.get(rel) || new Set();
        const lines = read(file).split(/\r?\n/);

        for (const [index, line] of lines.entries()) {
            if (!line.includes(nonCanonicalOrigin)) continue;
            if (allowedLines.has(line.trim())) continue;

            report('non_canonical_origin_reference', rel, `line ${index + 1}: ${line.trim()}`);
        }
    }
}

const sitemapLocs = parseSitemap();
const canonicalOwners = new Map();
auditManifest();
auditRobotsTxt();
auditCanonicalOriginReferences();

for (const file of walkHtml()) {
    const html = read(file);
    auditJsonLd(file, html);
    auditCanonical(file, html);
    auditSitemapCoverage(file, html, sitemapLocs);
    collectIndexableCanonical(file, html, canonicalOwners);
    auditLocalLinks(file, html);
    auditMetaImageTargets(file, html);
}

auditDuplicateIndexableCanonicals(canonicalOwners);

if (issues.length > 0) {
    console.error(`[site-audit] Found ${issues.length} issue(s):`);
    for (const issue of issues.slice(0, 100)) {
        console.error(`- ${issue.type}: ${issue.file}: ${issue.detail}`);
    }
    if (issues.length > 100) {
        console.error(`...and ${issues.length - 100} more.`);
    }
    process.exit(1);
}

console.log('[site-audit] OK: robots.txt, sitemap targets, sitemap coverage, canonical uniqueness, canonical origins, canonical targets, JSON-LD, manifest icons, local links/srcsets and meta images are valid.');
