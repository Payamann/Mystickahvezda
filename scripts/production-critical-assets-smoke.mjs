const PRODUCTION_BASE_URL = 'https://www.mystickahvezda.cz';
const DEFAULT_LOCAL_BASE_URL = `http://localhost:${process.env.PLAYWRIGHT_PORT || '3001'}`;
const REQUIRED_AUTH_CLIENT_VERSION = '11';
const REQUIRED_AUTH_CLIENT_MARKERS = [
    'getStandaloneAuthContext',
    'billingInterval',
    'entry_feature'
];
const DEFAULT_PATHS = [
    '/',
    '/cenik.html',
    '/prihlaseni.html',
    '/tarot.html',
    '/numerologie.html',
    '/partnerska-shoda.html',
    '/blog/vyklad-tarotu-pro-zacatecniky.html',
    '/tarot-vyznam/blazen.html',
    '/partnerska-shoda/index.html',
    '/slovnik/ascendent.html',
    '/horoskop/beran.html'
];

function usage() {
    return [
        'Usage: node scripts/production-critical-assets-smoke.mjs [--production] [--base-url <url>] [--path <path>] [--timeout-ms <ms>]',
        '',
        'Checks representative HTML pages for the current critical auth-client cache version,',
        'then fetches the referenced asset and verifies checkout handoff markers are present.'
    ].join('\n');
}

function parseArgs(argv) {
    const args = {
        baseUrl: process.env.CRITICAL_ASSETS_BASE_URL || DEFAULT_LOCAL_BASE_URL,
        paths: [],
        timeoutMs: 30_000
    };

    for (let index = 0; index < argv.length; index += 1) {
        const arg = argv[index];
        const next = () => argv[++index];

        if (arg === '--help' || arg === '-h') {
            console.log(usage());
            process.exit(0);
        } else if (arg === '--production') {
            args.baseUrl = PRODUCTION_BASE_URL;
        } else if (arg === '--base-url') {
            args.baseUrl = next();
        } else if (arg.startsWith('--base-url=')) {
            args.baseUrl = arg.slice('--base-url='.length);
        } else if (arg === '--path') {
            args.paths.push(next());
        } else if (arg.startsWith('--path=')) {
            args.paths.push(arg.slice('--path='.length));
        } else if (arg === '--timeout-ms') {
            args.timeoutMs = Number.parseInt(next(), 10);
        } else if (arg.startsWith('--timeout-ms=')) {
            args.timeoutMs = Number.parseInt(arg.slice('--timeout-ms='.length), 10);
        } else {
            throw new Error(`Unknown argument: ${arg}\n${usage()}`);
        }
    }

    if (!args.baseUrl) throw new Error('Missing base URL');
    if (!Number.isFinite(args.timeoutMs) || args.timeoutMs <= 0) {
        throw new Error(`Invalid timeout: ${args.timeoutMs}`);
    }

    args.baseUrl = args.baseUrl.replace(/\/+$/, '');
    if (args.paths.length === 0) args.paths = DEFAULT_PATHS;
    args.paths = args.paths.map((path) => path.startsWith('/') ? path : `/${path}`);
    return args;
}

async function fetchText(url, timeoutMs) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'mysticka-critical-assets-smoke/1.0'
            }
        });
        const text = await response.text();
        return {
            url,
            status: response.status,
            headers: response.headers,
            text
        };
    } finally {
        clearTimeout(timeout);
    }
}

function extractAuthClientScripts(html) {
    const scriptPattern = /<script\b[^>]*\bsrc\s*=\s*["']([^"']*auth-client\.js[^"']*)["'][^>]*>/gi;
    return [...html.matchAll(scriptPattern)].map((match) => match[1]);
}

function validatePage(pagePath, pageUrl, html, errors) {
    const scripts = extractAuthClientScripts(html);
    if (scripts.length === 0) {
        errors.push(`${pagePath}: missing auth-client script`);
        return [];
    }

    const assetUrls = [];
    for (const src of scripts) {
        const assetUrl = new URL(src, pageUrl);
        const assetPath = assetUrl.pathname;
        const version = assetUrl.searchParams.get('v');

        if (assetPath !== '/js/dist/auth-client.js') {
            errors.push(`${pagePath}: auth-client must use /js/dist/auth-client.js, got ${src}`);
        }
        if (version !== REQUIRED_AUTH_CLIENT_VERSION) {
            errors.push(
                `${pagePath}: auth-client version expected v=${REQUIRED_AUTH_CLIENT_VERSION}, got ${version || '<missing>'}`
            );
        }

        assetUrls.push(assetUrl.toString());
    }

    return assetUrls;
}

function validateAsset(assetUrl, response, errors) {
    if (response.status !== 200) {
        errors.push(`${assetUrl}: expected HTTP 200, got ${response.status}`);
        return;
    }

    for (const marker of REQUIRED_AUTH_CLIENT_MARKERS) {
        if (!response.text.includes(marker)) {
            errors.push(`${assetUrl}: missing required marker "${marker}"`);
        }
    }
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    const errors = [];
    const assetUrls = new Set();

    for (const pagePath of args.paths) {
        const pageUrl = new URL(pagePath, `${args.baseUrl}/`).toString();
        const response = await fetchText(pageUrl, args.timeoutMs);

        if (response.status !== 200) {
            errors.push(`${pagePath}: expected HTTP 200, got ${response.status}`);
            continue;
        }

        for (const assetUrl of validatePage(pagePath, pageUrl, response.text, errors)) {
            assetUrls.add(assetUrl);
        }
        console.log(`[critical-assets-smoke] checked page ${pagePath}`);
    }

    for (const assetUrl of assetUrls) {
        const response = await fetchText(assetUrl, args.timeoutMs);
        validateAsset(assetUrl, response, errors);
        console.log(
            `[critical-assets-smoke] checked asset ${assetUrl} cache=${response.headers.get('cf-cache-status') || 'n/a'}`
        );
    }

    if (errors.length > 0) {
        console.error(`[critical-assets-smoke] Found ${errors.length} issue(s):`);
        for (const error of errors) {
            console.error(`- ${error}`);
        }
        process.exit(1);
    }

    console.log(`[critical-assets-smoke] OK pages=${args.paths.length} assets=${assetUrls.size}`);
}

main().catch((error) => {
    console.error(`[critical-assets-smoke] ${error.message}`);
    process.exit(1);
});
