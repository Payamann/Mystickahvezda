import { chromium } from '@playwright/test';

const PRODUCTION_BASE_URL = 'https://www.mystickahvezda.cz';
const DEFAULT_LOCAL_BASE_URL = `http://localhost:${process.env.PLAYWRIGHT_PORT || '3001'}`;
const TOOL_COPY_FIX_VERSION = 'v=3';

const TOOL_PAGES = [
    {
        path: '/tarot.html',
        expectedTitle: 'Tarot online: výklad z 78 karet | Mystická Hvězda',
        expectedH1: 'Tarotové výklady',
        mobileCookieSafeSelector: '[data-spread-type="Jedna karta"]'
    },
    {
        path: '/numerologie.html',
        expectedTitle: 'Numerologie online: životní číslo a osud | Mystická Hvězda',
        expectedH1: 'Numerologie'
    },
    {
        path: '/partnerska-shoda.html',
        expectedTitle: 'Partnerská shoda znamení online | Mystická Hvězda',
        expectedH1: 'Partnerská shoda'
    },
    {
        path: '/mentor.html',
        expectedTitle: 'Hvězdný Průvodce | Mystická Hvězda',
        expectedH1: 'Hvězdný Průvodce'
    }
];

const VIEWPORTS = [
    { name: 'desktop', width: 1280, height: 720 },
    { name: 'mobile', width: 393, height: 851 }
];

const READ_ONLY_ENDPOINTS = [
    '**/api/payment/funnel-event',
    '**/api/analytics/event',
    '**/api/analytics/batch'
];

function parseArgs(argv) {
    const args = {
        baseUrl: process.env.TOOL_RUNTIME_BASE_URL || DEFAULT_LOCAL_BASE_URL,
        timeoutMs: 30_000
    };

    for (let index = 0; index < argv.length; index += 1) {
        const arg = argv[index];
        if (arg === '--production') {
            args.baseUrl = PRODUCTION_BASE_URL;
        } else if (arg === '--base-url') {
            args.baseUrl = argv[index + 1];
            index += 1;
        } else if (arg === '--timeout-ms') {
            args.timeoutMs = Number.parseInt(argv[index + 1], 10);
            index += 1;
        } else {
            throw new Error(`Unknown argument: ${arg}`);
        }
    }

    if (!args.baseUrl) throw new Error('Missing base URL');
    args.baseUrl = args.baseUrl.replace(/\/+$/, '');
    return args;
}

function normalizeText(value) {
    return String(value || '').trim().replace(/\s+/g, ' ');
}

function pageUrl(baseUrl, pathname) {
    const url = new URL(pathname, `${baseUrl}/`);
    url.searchParams.set('source', 'tool_runtime_smoke');
    url.searchParams.set('cache', String(Date.now()));
    return url.toString();
}

async function blockSmokeTelemetry(context) {
    const response = {
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, smoke: true, readOnly: true })
    };

    for (const pattern of READ_ONLY_ENDPOINTS) {
        await context.route(pattern, route => route.fulfill(response));
    }
}

async function inspectPage(page, config, viewportName, baseUrl) {
    await page.goto(pageUrl(baseUrl, config.path), {
        waitUntil: 'domcontentloaded',
        timeout: 30_000
    });
    await page.waitForSelector('body', { state: 'visible', timeout: 10_000 });
    await page.waitForTimeout(1_500);

    const metrics = await page.evaluate((selector) => {
        const script = document.querySelector('script[src*="tool-pages-copy-fixes.js"]');
        const h1 = document.querySelector('h1');
        const cookie = document.getElementById('cookie-banner')?.getBoundingClientRect();
        const safeElement = selector ? document.querySelector(selector)?.getBoundingClientRect() : null;
        const overlapsSafeElement = !!(cookie && safeElement && !(
            cookie.right < safeElement.left
            || cookie.left > safeElement.right
            || cookie.bottom < safeElement.top
            || cookie.top > safeElement.bottom
        ));

        return {
            title: document.title,
            h1: h1?.textContent || '',
            scriptSrc: script?.getAttribute('src') || '',
            horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
            overlapsSafeElement,
            cookieVisible: !!cookie
        };
    }, viewportName === 'mobile' ? config.mobileCookieSafeSelector : null);

    const errors = [];
    if (metrics.title !== config.expectedTitle) {
        errors.push(`title expected "${config.expectedTitle}", got "${metrics.title}"`);
    }
    if (!normalizeText(metrics.h1).includes(config.expectedH1)) {
        errors.push(`h1 expected to include "${config.expectedH1}", got "${normalizeText(metrics.h1)}"`);
    }
    if (!metrics.scriptSrc.includes(TOOL_COPY_FIX_VERSION)) {
        errors.push(`script src expected ${TOOL_COPY_FIX_VERSION}, got "${metrics.scriptSrc}"`);
    }
    if (metrics.horizontalOverflow) {
        errors.push('horizontal overflow detected');
    }
    if (metrics.overlapsSafeElement) {
        errors.push(`${config.mobileCookieSafeSelector} overlaps cookie banner`);
    }

    return {
        path: config.path,
        viewport: viewportName,
        title: metrics.title,
        scriptSrc: metrics.scriptSrc,
        cookieVisible: metrics.cookieVisible,
        errors
    };
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    const browser = await chromium.launch({ headless: true });
    const results = [];

    try {
        for (const viewport of VIEWPORTS) {
            const context = await browser.newContext({
                viewport,
                locale: 'cs-CZ',
                timezoneId: 'Europe/Prague',
                serviceWorkers: 'block'
            });
            await blockSmokeTelemetry(context);
            await context.addInitScript(() => {
                localStorage.removeItem('mh_cookie_prefs');
                localStorage.removeItem('cookieConsent');
            });
            const page = await context.newPage();
            page.setDefaultTimeout(args.timeoutMs);

            for (const config of TOOL_PAGES) {
                results.push(await inspectPage(page, config, viewport.name, args.baseUrl));
            }

            await context.close();
        }
    } finally {
        await browser.close();
    }

    const failures = results.filter((result) => result.errors.length > 0);
    for (const result of results) {
        const status = result.errors.length ? 'FAIL' : 'OK';
        console.log(`[tool-runtime-smoke] ${status} ${result.viewport} ${result.path} ${result.scriptSrc}`);
        for (const error of result.errors) {
            console.log(`  - ${error}`);
        }
    }

    if (failures.length > 0) {
        throw new Error(`${failures.length} tool runtime smoke check(s) failed`);
    }
}

main().catch((error) => {
    console.error(`[tool-runtime-smoke] ${error.message}`);
    process.exit(1);
});
