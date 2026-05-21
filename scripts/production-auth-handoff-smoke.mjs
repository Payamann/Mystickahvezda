import { chromium } from '@playwright/test';
import { createSmokeTelemetryBlocker } from './smoke-telemetry-blocker.mjs';

const PRODUCTION_BASE_URL = 'https://www.mystickahvezda.cz';
const DEFAULT_LOCAL_BASE_URL = `http://localhost:${process.env.PLAYWRIGHT_PORT || '3001'}`;

const SCENARIOS = [
    {
        name: 'register-paid-tarot',
        path: '/prihlaseni.html',
        params: {
            mode: 'register',
            redirect: '/cenik.html',
            plan: 'pruvodce',
            source: 'inline_paywall',
            feature: 'tarot_multi_card',
            entry_source: 'inline_paywall',
            entry_feature: 'tarot_multi_card'
        },
        expectedMode: 'register'
    },
    {
        name: 'login-paid-numerology',
        path: '/prihlaseni.html',
        params: {
            mode: 'login',
            redirect: '/cenik.html',
            plan: 'pruvodce',
            source: 'trial_paywall',
            feature: 'numerologie_vyklad',
            entry_source: 'trial_paywall',
            entry_feature: 'numerologie_vyklad'
        },
        expectedMode: 'login'
    }
];

const VIEWPORTS = [
    { name: 'desktop', width: 1280, height: 720 },
    { name: 'mobile', width: 393, height: 851 }
];

function parseArgs(argv) {
    const args = {
        baseUrl: process.env.AUTH_HANDOFF_BASE_URL || DEFAULT_LOCAL_BASE_URL,
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

function scenarioUrl(baseUrl, scenario) {
    const url = new URL(scenario.path, `${baseUrl}/`);
    Object.entries(scenario.params).forEach(([key, value]) => {
        url.searchParams.set(key, value);
    });
    url.searchParams.set('cache', String(Date.now()));
    return url.toString();
}

async function inspectScenario(page, scenario, viewportName, baseUrl) {
    const targetUrl = scenarioUrl(baseUrl, scenario);
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForSelector('#auth-submit', { state: 'visible', timeout: 10_000 });
    await page.waitForTimeout(1_000);

    const metrics = await page.evaluate(() => {
        function rectOverlaps(a, b) {
            return !!(a && b && !(
                a.right < b.left
                || a.left > b.right
                || a.bottom < b.top
                || a.top > b.bottom
            ));
        }

        const banner = document.getElementById('checkout-context-banner');
        const submit = document.getElementById('auth-submit');
        const form = document.getElementById('login-form');
        const cookie = document.getElementById('cookie-banner');
        const bannerRect = banner?.getBoundingClientRect();
        const submitRect = submit?.getBoundingClientRect();
        const formRect = form?.getBoundingClientRect();
        const cookieRect = cookie?.getBoundingClientRect();

        return {
            title: document.title,
            path: window.location.pathname,
            params: Object.fromEntries(new URLSearchParams(window.location.search).entries()),
            bodyClasses: Array.from(document.body.classList),
            bannerVisible: !!(bannerRect && bannerRect.width > 0 && bannerRect.height > 0),
            submitVisible: !!(submitRect && submitRect.width > 0 && submitRect.height > 0),
            submitText: submit?.textContent?.trim() || '',
            h1Text: document.getElementById('login-page-title')?.textContent?.trim() || '',
            subtitleText: document.getElementById('login-page-subtitle')?.textContent?.trim() || '',
            horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
            cookieOverlapsSubmit: rectOverlaps(cookieRect, submitRect),
            cookieOverlapsForm: rectOverlaps(cookieRect, formRect),
            bannerOverlapsSubmit: rectOverlaps(bannerRect, submitRect)
        };
    });

    const errors = [];
    if (metrics.path !== scenario.path) errors.push(`path expected ${scenario.path}, got ${metrics.path}`);
    Object.entries(scenario.params).forEach(([key, value]) => {
        if (metrics.params[key] !== value) {
            errors.push(`query ${key} expected ${value}, got ${metrics.params[key] || '<missing>'}`);
        }
    });
    if (!metrics.bodyClasses.includes('auth-checkout-plan-mode')) {
        errors.push('body missing auth-checkout-plan-mode');
    }
    if (scenario.expectedMode === 'register' && !metrics.bodyClasses.includes('auth-register-mode')) {
        errors.push('register scenario missing auth-register-mode');
    }
    if (!metrics.bannerVisible) errors.push('checkout context banner is not visible');
    if (!metrics.submitVisible) errors.push('auth submit is not visible');
    if (!metrics.subtitleText.toLowerCase().includes('stripe')) {
        errors.push(`subtitle should mention Stripe handoff, got "${metrics.subtitleText}"`);
    }
    if (/\bfree\b|trial|7\s*d.n|zdarma/i.test(`${metrics.submitText} ${metrics.h1Text} ${metrics.subtitleText}`)) {
        errors.push('paid auth context contains free/trial wording');
    }
    if (metrics.horizontalOverflow) errors.push('horizontal overflow detected');
    if (metrics.bannerOverlapsSubmit) errors.push('checkout banner overlaps submit button');
    if (viewportName === 'mobile' && metrics.cookieOverlapsSubmit) {
        errors.push('mobile cookie banner overlaps submit button');
    }

    return {
        name: scenario.name,
        viewport: viewportName,
        submitText: metrics.submitText,
        errors
    };
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    const browser = await chromium.launch({ headless: true });
    const telemetry = createSmokeTelemetryBlocker();
    const results = [];

    try {
        for (const viewport of VIEWPORTS) {
            const context = await browser.newContext({
                viewport,
                locale: 'cs-CZ',
                timezoneId: 'Europe/Prague',
                serviceWorkers: 'block'
            });
            await telemetry.install(context);
            await context.addInitScript(() => {
                localStorage.clear();
                sessionStorage.clear();
            });
            const page = await context.newPage();
            page.setDefaultTimeout(args.timeoutMs);

            for (const scenario of SCENARIOS) {
                results.push(await inspectScenario(page, scenario, viewport.name, args.baseUrl));
            }

            await context.close();
        }
    } finally {
        await browser.close();
    }

    const failures = results.filter((result) => result.errors.length > 0);
    telemetry.print('auth-handoff-smoke');
    for (const result of results) {
        const status = result.errors.length ? 'FAIL' : 'OK';
        console.log(`[auth-handoff-smoke] ${status} ${result.viewport} ${result.name} submit="${result.submitText}"`);
        for (const error of result.errors) {
            console.log(`  - ${error}`);
        }
    }

    if (failures.length > 0) {
        throw new Error(`${failures.length} auth handoff smoke check(s) failed`);
    }
}

main().catch((error) => {
    console.error(`[auth-handoff-smoke] ${error.message}`);
    process.exit(1);
});
