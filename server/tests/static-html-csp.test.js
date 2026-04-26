/**
 * Static HTML CSP hygiene tests
 */

import fs from 'fs';
import path from 'path';

const ROOT_DIR = path.resolve(process.cwd());
const DIST_JS_DIR = path.join(ROOT_DIR, 'js', 'dist');
const JS_INLINE_STYLE_VENDOR_EXCEPTIONS = new Set([
    'js/three.min.js',
    'js/dist/three.min.js'
]);
const NON_PRODUCT_DIRS = new Set([
    '.git',
    '.claude',
    '.pytest_cache',
    'coverage',
    'docs',
    'node_modules',
    'playwright-report',
    'social-media-agent',
    'templates',
    'tests',
    'tmp_email_previews'
]);

function readProductHtmlFiles(dir = ROOT_DIR) {
    const htmlFiles = [];

    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            if (!NON_PRODUCT_DIRS.has(entry.name)) {
                htmlFiles.push(...readProductHtmlFiles(fullPath));
            }
            continue;
        }

        if (!entry.isFile() || !entry.name.endsWith('.html')) continue;

        const file = path.relative(ROOT_DIR, fullPath).replace(/\\/g, '/');
        htmlFiles.push({
            file,
            fullPath,
            html: fs.readFileSync(fullPath, 'utf8')
        });
    }

    return htmlFiles;
}

function readJsSourceFiles(dir = path.join(ROOT_DIR, 'js')) {
    const jsFiles = [];
    const skippedDirs = new Set(['dist', 'vendor']);

    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            if (!skippedDirs.has(entry.name)) {
                jsFiles.push(...readJsSourceFiles(fullPath));
            }
            continue;
        }

        if (!entry.isFile() || !entry.name.endsWith('.js')) continue;

        jsFiles.push({
            file: path.relative(ROOT_DIR, fullPath).replace(/\\/g, '/'),
            js: fs.readFileSync(fullPath, 'utf8')
        });
    }

    return jsFiles;
}

function readBuiltJsFiles(dir = DIST_JS_DIR) {
    const jsFiles = [];

    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            jsFiles.push(...readBuiltJsFiles(fullPath));
            continue;
        }

        if (!entry.isFile() || !entry.name.endsWith('.js')) continue;

        jsFiles.push({
            file: path.relative(ROOT_DIR, fullPath).replace(/\\/g, '/'),
            js: fs.readFileSync(fullPath, 'utf8')
        });
    }

    return jsFiles;
}

function readServerRouteFiles(dir = path.join(ROOT_DIR, 'server', 'routes')) {
    const routeFiles = dir.endsWith(path.join('server', 'routes'))
        ? [{
            file: 'server/index.js',
            js: fs.readFileSync(path.join(ROOT_DIR, 'server', 'index.js'), 'utf8')
        }]
        : [];

    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            routeFiles.push(...readServerRouteFiles(fullPath));
            continue;
        }

        if (!entry.isFile() || !entry.name.endsWith('.js')) continue;

        routeFiles.push({
            file: path.relative(ROOT_DIR, fullPath).replace(/\\/g, '/'),
            js: fs.readFileSync(fullPath, 'utf8')
        });
    }

    return routeFiles;
}

function expectNoInlineStyleWrites(files) {
    for (const { file, js } of files) {
        if (JS_INLINE_STYLE_VENDOR_EXCEPTIONS.has(file)) continue;

        expect(`${file}\n${js}`).not.toMatch(/style\.cssText/);
        expect(`${file}\n${js}`).not.toMatch(/setAttribute\(\s*['"]style['"]/);
        expect(`${file}\n${js}`).not.toMatch(/\.style\./);
        expect(`${file}\n${js}`).not.toMatch(/createElement\(\s*['"]style['"]/);
        expect(`${file}\n${js}`).not.toMatch(/<[^>]+\sstyle\s*=/i);
    }
}

function getAttribute(attrs, name) {
    const match = attrs.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']+)["']`, 'i'));
    return match ? match[1] : null;
}

function jsDistHasExports(fileName) {
    const distPath = path.join(DIST_JS_DIR, fileName);
    if (!fs.existsSync(distPath)) return false;

    return /\b(?:import|export)\b/.test(fs.readFileSync(distPath, 'utf8'));
}

function getTopLevelJsFile(src) {
    if (!src) return null;
    if (/^(?:https?:)?\/\//i.test(src)) return null;
    if (/^(?:data|mailto|tel):/i.test(src)) return null;

    const cleanSrc = src.split('#')[0].split('?')[0];
    const match = cleanSrc.match(/(?:^|\/)js\/(?!dist\/)(.+\.js)$/i);
    return match ? match[1] : null;
}

function toLocalAssetPath(assetUrl, sourcePath) {
    if (!assetUrl) return null;
    if (/^(?:https?:)?\/\//i.test(assetUrl)) return null;
    if (/^(?:data|mailto|tel):/i.test(assetUrl)) return null;

    const cleanUrl = assetUrl.split('#')[0].split('?')[0];
    if (!cleanUrl || cleanUrl.startsWith('<')) return null;

    if (cleanUrl.startsWith('/')) {
        return path.join(ROOT_DIR, cleanUrl.replace(/^\/+/, ''));
    }

    return path.resolve(path.dirname(sourcePath), cleanUrl);
}

describe('Static HTML CSP hygiene', () => {
    test('product HTML files do not use inline event handlers', () => {
        for (const { file, html } of readProductHtmlFiles()) {
            expect(html).not.toMatch(/\son[a-z]+\s*=/i);
        }
    });

    test('product HTML files do not contain duplicate class attributes', () => {
        for (const { file, html } of readProductHtmlFiles()) {
            expect(html).not.toMatch(/<[^>]*\sclass=["'][^"']*["'][^>]*\sclass=/i);
        }
    });

    test('product HTML label for attributes reference existing ids', () => {
        const brokenLabels = [];
        const labelPattern = /<label\b[^>]*\bfor=["']([^"']+)["'][^>]*>/gi;
        const idPattern = /\bid=["']([^"']+)["']/gi;

        for (const { file, html } of readProductHtmlFiles()) {
            const ids = new Set([...html.matchAll(idPattern)].map(match => match[1]));
            let match;

            while ((match = labelPattern.exec(html)) !== null) {
                if (!ids.has(match[1])) {
                    brokenLabels.push(`${file}: label for="${match[1]}"`);
                }
            }
        }

        expect(brokenLabels).toEqual([]);
    });

    test('product HTML files do not contain duplicate ids', () => {
        const duplicateIds = [];
        const idPattern = /\bid=["']([^"']+)["']/gi;

        for (const { file, html } of readProductHtmlFiles()) {
            const counts = new Map();

            for (const match of html.matchAll(idPattern)) {
                counts.set(match[1], (counts.get(match[1]) || 0) + 1);
            }

            for (const [id, count] of counts) {
                if (count > 1) {
                    duplicateIds.push(`${file}: id="${id}" appears ${count} times`);
                }
            }
        }

        expect(duplicateIds).toEqual([]);
    });

    test('product HTML files do not contain inline style blocks or attributes', () => {
        for (const { file, html } of readProductHtmlFiles()) {
            expect(html).not.toMatch(/<style\b/i);
            expect(html).not.toMatch(/\sstyle\s*=/i);
        }
    });

    test('product HTML files only keep JSON-LD as inline script blocks', () => {
        const inlineScriptPattern = /<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/gi;

        for (const { file, html } of readProductHtmlFiles()) {
            let match;
            while ((match = inlineScriptPattern.exec(html)) !== null) {
                const attrs = match[1];
                const body = match[2];
                if (!body.trim()) continue;

                expect(`${file}: ${attrs}`).toMatch(/type=["']application\/ld\+json["']/i);
            }
        }
    });

    test('product HTML local script and stylesheet assets exist', () => {
        const missingAssets = [];
        const scriptPattern = /<script\b([^>]*)>/gi;
        const linkPattern = /<link\b([^>]*)>/gi;

        for (const { file, fullPath, html } of readProductHtmlFiles()) {
            let match;
            while ((match = scriptPattern.exec(html)) !== null) {
                const src = getAttribute(match[1], 'src');
                const assetPath = toLocalAssetPath(src, fullPath);
                if (assetPath && !fs.existsSync(assetPath)) {
                    missingAssets.push(`${file}: ${src}`);
                }
            }

            while ((match = linkPattern.exec(html)) !== null) {
                const attrs = match[1];
                const rel = getAttribute(attrs, 'rel');
                if (!rel || !/\bstylesheet\b/i.test(rel)) continue;

                const href = getAttribute(attrs, 'href');
                const assetPath = toLocalAssetPath(href, fullPath);
                if (assetPath && !fs.existsSync(assetPath)) {
                    missingAssets.push(`${file}: ${href}`);
                }
            }
        }

        expect(missingAssets).toEqual([]);
    });

    test('product HTML uses built JavaScript assets when dist output exists', () => {
        const sourceScriptRefs = [];
        const scriptPattern = /<script\b([^>]*)>/gi;

        for (const { file, html } of readProductHtmlFiles()) {
            let match;
            while ((match = scriptPattern.exec(html)) !== null) {
                const attrs = match[1];
                const src = getAttribute(attrs, 'src');
                const fileName = getTopLevelJsFile(src);
                if (!fileName) continue;
                if (/\/js\/vendor\//i.test(src)) continue;

                const distPath = path.join(DIST_JS_DIR, fileName);
                const isModule = getAttribute(attrs, 'type') === 'module';
                if (fs.existsSync(distPath) && (isModule || !jsDistHasExports(fileName))) {
                    sourceScriptRefs.push(`${file}: ${src}`);
                }
            }
        }

        expect(sourceScriptRefs).toEqual([]);
    });

    test('server-rendered HTML routes use built JavaScript assets when dist output exists', () => {
        const sourceScriptRefs = [];
        const scriptPattern = /<script\b([^>]*)>/gi;

        for (const { file, js } of readServerRouteFiles()) {
            let match;
            while ((match = scriptPattern.exec(js)) !== null) {
                const attrs = match[1];
                const src = getAttribute(attrs, 'src');
                const fileName = getTopLevelJsFile(src);
                if (!fileName) continue;
                if (/\/js\/vendor\//i.test(src)) continue;

                const distPath = path.join(DIST_JS_DIR, fileName);
                const isModule = getAttribute(attrs, 'type') === 'module';
                if (fs.existsSync(distPath) && (isModule || !jsDistHasExports(fileName))) {
                    sourceScriptRefs.push(`${file}: ${src}`);
                }
            }
        }

        expect(sourceScriptRefs).toEqual([]);
    });

    test('server-rendered HTML routes reference existing local script and stylesheet assets', () => {
        const missingAssets = [];
        const scriptPattern = /<script\b([^>]*)>/gi;
        const linkPattern = /<link\b([^>]*)>/gi;

        for (const { file, js } of readServerRouteFiles()) {
            const sourcePath = path.join(ROOT_DIR, file);
            let match;
            while ((match = scriptPattern.exec(js)) !== null) {
                const src = getAttribute(match[1], 'src');
                const assetPath = toLocalAssetPath(src, sourcePath);
                if (assetPath && !fs.existsSync(assetPath)) {
                    missingAssets.push(`${file}: ${src}`);
                }
            }

            while ((match = linkPattern.exec(js)) !== null) {
                const attrs = match[1];
                const rel = getAttribute(attrs, 'rel');
                if (!rel || !/\bstylesheet\b/i.test(rel)) continue;

                const href = getAttribute(attrs, 'href');
                const assetPath = toLocalAssetPath(href, sourcePath);
                if (assetPath && !fs.existsSync(assetPath)) {
                    missingAssets.push(`${file}: ${href}`);
                }
            }
        }

        expect(missingAssets).toEqual([]);
    });

    test('built JavaScript assets with module syntax are loaded as modules', () => {
        const classicModuleScripts = [];
        const scriptPattern = /<script\b([^>]*)>/gi;

        for (const { file, html } of readProductHtmlFiles()) {
            let match;
            while ((match = scriptPattern.exec(html)) !== null) {
                const attrs = match[1];
                const src = getAttribute(attrs, 'src');
                const distFile = src?.split('#')[0].split('?')[0].match(/\/js\/dist\/([^/]+\.js)$/i)?.[1];
                if (!distFile || !jsDistHasExports(distFile)) continue;

                if (getAttribute(attrs, 'type') !== 'module') {
                    classicModuleScripts.push(`${file}: ${src}`);
                }
            }
        }

        expect(classicModuleScripts).toEqual([]);
    });

    test('source JavaScript does not generate inline event handler attributes', () => {
        for (const { file, js } of readJsSourceFiles()) {
            expect(`${file}\n${js}`).not.toMatch(/\son[a-z]+\s*=\s*["'`]/i);
        }
    });

    test('source and built JavaScript do not write inline styles', () => {
        expectNoInlineStyleWrites(readJsSourceFiles());
        expectNoInlineStyleWrites(readBuiltJsFiles());
    });

    test('server-rendered HTML routes do not emit inline styles', () => {
        for (const { file, js } of readServerRouteFiles()) {
            expect(`${file}\n${js}`).not.toMatch(/<style\b/i);
            expect(`${file}\n${js}`).not.toMatch(/\bstyle\s*=/i);
        }
    });

    test('source JavaScript uses root-relative data fetch paths', () => {
        for (const { file, js } of readJsSourceFiles()) {
            expect(`${file}\n${js}`).not.toMatch(/fetch\(\s*["'`](?:\.\.\/)?data\//i);
        }
    });

    test('public JavaScript avoids production console.log noise', () => {
        const offenders = [...readJsSourceFiles(), ...readBuiltJsFiles()]
            .filter(({ file }) => !JS_INLINE_STYLE_VENDOR_EXCEPTIONS.has(file))
            .filter(({ js }) => /\bconsole\.log\b/.test(js))
            .map(({ file }) => file);

        expect(offenders).toEqual([]);
    });

    test('public JavaScript does not reference obsolete API aliases', () => {
        const offenders = [...readJsSourceFiles(), ...readBuiltJsFiles()]
            .filter(({ js }) => js.includes('/api/contact/contact'))
            .map(({ file }) => file);

        expect(offenders).toEqual([]);
    });

    test('admin page data-action buttons have JavaScript handlers', () => {
        const adminHtml = fs.readFileSync(path.join(ROOT_DIR, 'admin.html'), 'utf8');
        const adminJs = fs.readFileSync(path.join(ROOT_DIR, 'js', 'admin.js'), 'utf8');
        const actions = [...adminHtml.matchAll(/\bdata-action=["']([^"']+)["']/g)]
            .map(match => match[1]);

        expect(actions.length).toBeGreaterThan(0);

        for (const action of actions) {
            expect(adminJs).toContain(`action === '${action}'`);
        }
    });

    test('CI E2E workflow preserves stable core worker defaults', () => {
        const workflow = fs.readFileSync(path.join(ROOT_DIR, '.github', 'workflows', 'ci.yml'), 'utf8');

        expect(workflow).toContain('if [ "${{ matrix.section }}" = "core" ]; then');
        expect(workflow).toMatch(/--section=\$\{\{\s*matrix\.section\s*\}\}\s*\n\s*else\s*\n\s*npm run test:e2e:sections -- --project=\$\{\{\s*matrix\.project\s*\}\} --section=\$\{\{\s*matrix\.section\s*\}\} --workers=2/);
    });

    test('bootstrap scripts avoid production console.log noise', () => {
        for (const file of ['js/register-sw.js', 'js/analytics-page-init.js']) {
            const source = fs.readFileSync(path.join(ROOT_DIR, file), 'utf8');
            expect(`${file}\n${source}`).not.toMatch(/\bconsole\.log\b/);
            expect(`${file}\n${source}`).toContain('window.MH_DEBUG');
        }
    });
});
