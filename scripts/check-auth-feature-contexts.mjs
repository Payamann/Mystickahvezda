import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ignoredDirs = new Set(['.git', '.claude', 'node_modules', 'dist']);
const scannedExtensions = new Set(['.html', '.js']);
const scanRoots = [
    rootDir,
    path.join(rootDir, 'components'),
    path.join(rootDir, 'js')
];

function collectFiles(dir, files = []) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory()) {
            if (ignoredDirs.has(entry.name)) continue;
            collectFiles(path.join(dir, entry.name), files);
            continue;
        }

        if (scannedExtensions.has(path.extname(entry.name))) {
            files.push(path.join(dir, entry.name));
        }
    }

    return files;
}

function extractBlock(source, declarationName) {
    const declarationStart = source.indexOf(`const ${declarationName} = {`);
    if (declarationStart === -1) return '';

    const objectStart = source.indexOf('{', declarationStart);
    if (objectStart === -1) return '';

    let depth = 0;
    for (let index = objectStart; index < source.length; index += 1) {
        const char = source[index];
        if (char === '{') depth += 1;
        if (char === '}') depth -= 1;
        if (depth === 0) {
            return source.slice(objectStart + 1, index);
        }
    }

    return '';
}

function extractObjectKeys(block) {
    const keys = new Set();
    let depth = 0;
    let quote = null;
    let escaped = false;

    for (const line of block.split(/\r?\n/)) {
        const match = depth === 0
            ? line.trim().match(/^'?([a-z0-9_-]+)'?\s*:/)
            : null;

        if (match) keys.add(match[1]);

        for (const char of line) {
            if (escaped) {
                escaped = false;
                continue;
            }

            if (quote) {
                if (char === '\\') {
                    escaped = true;
                } else if (char === quote) {
                    quote = null;
                }
                continue;
            }

            if (char === '"' || char === "'" || char === '`') {
                quote = char;
            } else if (char === '{') {
                depth += 1;
            } else if (char === '}') {
                depth = Math.max(0, depth - 1);
            }
        }
    }

    return keys;
}

function extractObjectPaths(block, groupName) {
    const paths = [];
    let depth = 0;
    let quote = null;
    let escaped = false;
    let currentKey = null;

    for (const line of block.split(/\r?\n/)) {
        const keyMatch = depth === 0
            ? line.trim().match(/^'?([a-z0-9_-]+)'?\s*:/)
            : null;
        if (keyMatch) currentKey = keyMatch[1];

        const pathMatch = currentKey
            ? line.match(/path\s*:\s*['"]([^'"]+)['"]/)
            : null;
        if (pathMatch) {
            paths.push({ group: groupName, key: currentKey, routePath: pathMatch[1] });
        }

        for (const char of line) {
            if (escaped) {
                escaped = false;
                continue;
            }

            if (quote) {
                if (char === '\\') {
                    escaped = true;
                } else if (char === quote) {
                    quote = null;
                }
                continue;
            }

            if (char === '"' || char === "'" || char === '`') {
                quote = char;
            } else if (char === '{') {
                depth += 1;
            } else if (char === '}') {
                depth = Math.max(0, depth - 1);
            }
        }

        if (depth === 0) currentKey = null;
    }

    return paths;
}

function extractAssignedObjectKeys(source, objectName) {
    const keys = new Set();
    const assignPattern = new RegExp(`Object\\.assign\\(${objectName},\\s*\\{([\\s\\S]*?)\\}\\);`, 'g');

    for (const match of source.matchAll(assignPattern)) {
        for (const key of extractObjectKeys(match[1])) {
            keys.add(key);
        }
    }

    return keys;
}

function extractAssignedObjectPaths(source, objectName, groupName) {
    const paths = [];
    const assignPattern = new RegExp(`Object\\.assign\\(${objectName},\\s*\\{([\\s\\S]*?)\\}\\);`, 'g');

    for (const match of source.matchAll(assignPattern)) {
        paths.push(...extractObjectPaths(match[1], groupName));
    }

    return paths;
}

function unionSets(...sets) {
    return new Set(sets.flatMap((set) => [...set]));
}

const scannedFiles = [
    ...fs.readdirSync(rootDir, { withFileTypes: true })
        .filter((entry) => entry.isFile() && entry.name.endsWith('.html'))
        .map((entry) => path.join(rootDir, entry.name)),
    ...scanRoots
        .filter((dir) => dir !== rootDir && fs.existsSync(dir))
        .flatMap((dir) => collectFiles(dir))
];

const usedFeatures = new Set();
for (const file of scannedFiles) {
    if (file.includes(`${path.sep}js${path.sep}dist${path.sep}`)) continue;
    const source = fs.readFileSync(file, 'utf8');

    for (const match of source.matchAll(/[?&]feature=([a-z0-9_-]+)/g)) {
        usedFeatures.add(match[1]);
    }

    for (const match of source.matchAll(/(?:^|[^a-zA-Z0-9_])feature\s*[:=]\s*['"]([a-z0-9_-]+)['"]/g)) {
        usedFeatures.add(match[1]);
    }

    for (const match of source.matchAll(/searchParams\.set\(['"]feature['"],\s*['"]([a-z0-9_-]+)['"]\)/g)) {
        usedFeatures.add(match[1]);
    }

    if (source.includes('const FEATURE_MAP')) {
        for (const match of source.matchAll(/['"][a-z0-9_-]+['"]\s*:\s*['"]([a-z0-9_-]+)['"]/g)) {
            usedFeatures.add(match[1]);
        }
    }
}

const loginSource = fs.readFileSync(path.join(rootDir, 'js', 'prihlaseni.js'), 'utf8');
const authClientSource = fs.readFileSync(path.join(rootDir, 'js', 'auth-client.js'), 'utf8');
const onboardingSource = fs.readFileSync(path.join(rootDir, 'js', 'onboarding.js'), 'utf8');
const pricingSource = fs.readFileSync(path.join(rootDir, 'js', 'cenik.js'), 'utf8');
const premiumGatesSource = fs.readFileSync(path.join(rootDir, 'js', 'premium-gates.js'), 'utf8');
for (const feature of extractObjectKeys(extractBlock(pricingSource, 'FALLBACK_FEATURE_PLAN_MAP'))) {
    usedFeatures.add(feature);
}
for (const feature of extractObjectKeys(extractBlock(premiumGatesSource, 'featurePaywalls'))) {
    usedFeatures.add(feature);
}
const featureLabels = unionSets(
    extractObjectKeys(extractBlock(loginSource, 'FEATURE_LABELS')),
    extractAssignedObjectKeys(loginSource, 'FEATURE_LABELS')
);
const signupContexts = unionSets(
    extractObjectKeys(extractBlock(loginSource, 'SIGNUP_CONTEXT_BY_FEATURE')),
    extractAssignedObjectKeys(loginSource, 'SIGNUP_CONTEXT_BY_FEATURE')
);
const signupSources = extractObjectKeys(extractBlock(loginSource, 'SIGNUP_CONTEXT_BY_SOURCE'));
const activationFeatureBlock = extractBlock(authClientSource, 'featureMap');
const activationSourceBlock = extractBlock(authClientSource, 'sourceMap');
const activationFeatures = unionSets(
    extractObjectKeys(activationFeatureBlock),
    extractAssignedObjectKeys(authClientSource, 'featureMap')
);
const activationSources = extractObjectKeys(activationSourceBlock);
const activationOptionalFeatures = new Set(['account']);

const missingLabels = [...usedFeatures].filter((feature) => !featureLabels.has(feature)).sort();
const missingContexts = [...usedFeatures].filter((feature) => !signupContexts.has(feature)).sort();
const missingActivationFeatures = [...signupContexts]
    .filter((feature) => !activationOptionalFeatures.has(feature))
    .filter((feature) => !activationFeatures.has(feature))
    .sort();
const missingActivationSources = [...signupSources]
    .filter((source) => !activationSources.has(source))
    .sort();
const missingActivationPaths = [
    ...extractObjectPaths(activationFeatureBlock, 'featureMap'),
    ...extractAssignedObjectPaths(authClientSource, 'featureMap', 'featureMap'),
    ...extractObjectPaths(activationSourceBlock, 'sourceMap')
]
    .filter(({ routePath }) => routePath.startsWith('/'))
    .filter(({ routePath }) => !fs.existsSync(path.join(rootDir, routePath.slice(1))))
    .map(({ group, key, routePath }) => `${group}.${key}: ${routePath}`)
    .sort();
const missingOnboardingPaths = [
    ...onboardingSource.matchAll(/(?:withSource|new URL)\(\s*['"]([^'"]+\.html)['"]/g)
]
    .map((match) => match[1])
    .filter((routePath) => routePath.startsWith('/'))
    .filter((routePath, index, all) => all.indexOf(routePath) === index)
    .filter((routePath) => !fs.existsSync(path.join(rootDir, routePath.slice(1))))
    .sort();

if (
    missingLabels.length ||
    missingContexts.length ||
    missingActivationFeatures.length ||
    missingActivationSources.length ||
    missingActivationPaths.length ||
    missingOnboardingPaths.length
) {
    console.error('[auth-feature-contexts] Missing auth feature coverage.');
    if (missingLabels.length) console.error(`Missing FEATURE_LABELS: ${missingLabels.join(', ')}`);
    if (missingContexts.length) console.error(`Missing SIGNUP_CONTEXT_BY_FEATURE: ${missingContexts.join(', ')}`);
    if (missingActivationFeatures.length) console.error(`Missing post-auth activation features: ${missingActivationFeatures.join(', ')}`);
    if (missingActivationSources.length) console.error(`Missing post-auth activation sources: ${missingActivationSources.join(', ')}`);
    if (missingActivationPaths.length) console.error(`Missing post-auth activation target pages: ${missingActivationPaths.join(', ')}`);
    if (missingOnboardingPaths.length) console.error(`Missing onboarding target pages: ${missingOnboardingPaths.join(', ')}`);
    process.exitCode = 1;
} else {
    console.log(`[auth-feature-contexts] OK: ${usedFeatures.size} feature context(s) covered and activation/onboarding targets exist.`);
}
