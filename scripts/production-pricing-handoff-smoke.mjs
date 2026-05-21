import { chromium } from '@playwright/test';
import { createSmokeTelemetryBlocker } from './smoke-telemetry-blocker.mjs';

const PRODUCTION_BASE_URL = 'https://www.mystickahvezda.cz';
const DEFAULT_LOCAL_BASE_URL = `http://localhost:${process.env.PLAYWRIGHT_PORT || '3001'}`;

const VIEWPORTS = [
    { name: 'desktop', width: 1280, height: 720 },
    { name: 'mobile', width: 393, height: 851 }
];

function parseArgs(argv) {
    const args = {
        baseUrl: process.env.PRICING_HANDOFF_BASE_URL || DEFAULT_LOCAL_BASE_URL,
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

function pricingUrl(baseUrl) {
    const url = new URL('/cenik.html', `${baseUrl}/`);
    url.searchParams.set('cache', String(Date.now()));
    return url.toString();
}

function readQuery(href) {
    return Object.fromEntries(new URL(href, PRODUCTION_BASE_URL).searchParams.entries());
}

function rectOverlaps(a, b) {
    return !!(a && b && !(
        a.right < b.left
        || a.left > b.right
        || a.bottom < b.top
        || a.top > b.bottom
    ));
}

function validateQuery(actual, expected, label, errors) {
    for (const [key, value] of Object.entries(expected)) {
        if (actual[key] !== value) {
            errors.push(`${label} ${key} expected ${value}, got ${actual[key] || '<missing>'}`);
        }
    }
}

async function inspectPricingHandoff(page, viewportName, baseUrl) {
    await page.goto(pricingUrl(baseUrl), { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForSelector('.plan-checkout-btn[data-plan="pruvodce"]', {
        state: 'visible',
        timeout: 10_000
    });
    await page.waitForTimeout(1_000);

    const pricingMetrics = await page.evaluate(() => {
        const monthly = document.getElementById('toggle-monthly');
        const yearly = document.getElementById('toggle-yearly');
        const freeCta = document.querySelector('[data-pricing-free-cta]');
        const guideCta = document.querySelector('.plan-checkout-btn[data-plan="pruvodce"]');
        const bodyText = document.body.textContent || '';

        return {
            path: window.location.pathname,
            monthlyPressed: monthly?.getAttribute('aria-pressed') || '',
            yearlyPressed: yearly?.getAttribute('aria-pressed') || '',
            freeHref: freeCta?.getAttribute('href') || '',
            guideHref: guideCta?.getAttribute('href') || '',
            horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
            misleadingTrialCopy: /7\s*dn[i\u00ed]\s*zdarma|trial|zku[s\u0161]ebn[i\u00ed]\s*obdob[i\u00ed]/i.test(bodyText)
        };
    });

    const errors = [];
    if (pricingMetrics.path !== '/cenik.html') {
        errors.push(`pricing path expected /cenik.html, got ${pricingMetrics.path}`);
    }
    if (pricingMetrics.monthlyPressed !== 'true') {
        errors.push(`monthly toggle should be active, got ${pricingMetrics.monthlyPressed || '<missing>'}`);
    }
    if (pricingMetrics.yearlyPressed !== 'false') {
        errors.push(`yearly toggle should be inactive, got ${pricingMetrics.yearlyPressed || '<missing>'}`);
    }
    if (pricingMetrics.horizontalOverflow) {
        errors.push('pricing page has horizontal overflow');
    }
    if (pricingMetrics.misleadingTrialCopy) {
        errors.push('pricing page contains misleading trial/free-period copy');
    }

    validateQuery(readQuery(pricingMetrics.freeHref), {
        mode: 'register',
        redirect: '/horoskopy.html',
        source: 'pricing_free_cta',
        feature: 'daily_guidance'
    }, 'free CTA', errors);
    validateQuery(readQuery(pricingMetrics.guideHref), {
        mode: 'register',
        redirect: '/cenik.html',
        plan: 'pruvodce',
        source: 'pricing_page',
        feature: 'premium_membership'
    }, 'guide CTA', errors);

    await page.locator('.plan-checkout-btn[data-plan="pruvodce"]').scrollIntoViewIfNeeded();
    await Promise.all([
        page.waitForURL(url => url.pathname === '/prihlaseni.html', {
            timeout: 10_000,
            waitUntil: 'domcontentloaded'
        }),
        page.locator('.plan-checkout-btn[data-plan="pruvodce"]').click()
    ]);
    await page.waitForSelector('#auth-submit', { state: 'visible', timeout: 10_000 });
    await page.waitForTimeout(1_000);

    const authMetrics = await page.evaluate(() => {
        function toRect(rect) {
            return rect ? {
                top: rect.top,
                right: rect.right,
                bottom: rect.bottom,
                left: rect.left,
                width: rect.width,
                height: rect.height
            } : null;
        }

        const banner = document.getElementById('checkout-context-banner');
        const submit = document.getElementById('auth-submit');
        const form = document.getElementById('login-form');
        const cookie = document.getElementById('cookie-banner');
        const bannerRect = toRect(banner?.getBoundingClientRect());
        const submitRect = toRect(submit?.getBoundingClientRect());
        const formRect = toRect(form?.getBoundingClientRect());
        const cookieRect = toRect(cookie?.getBoundingClientRect());

        return {
            path: window.location.pathname,
            params: Object.fromEntries(new URLSearchParams(window.location.search).entries()),
            bodyClasses: Array.from(document.body.classList),
            bannerVisible: !!(bannerRect && bannerRect.width > 0 && bannerRect.height > 0),
            submitVisible: !!(submitRect && submitRect.width > 0 && submitRect.height > 0),
            submitText: submit?.textContent?.trim() || '',
            h1Text: document.getElementById('login-page-title')?.textContent?.trim() || '',
            subtitleText: document.getElementById('login-page-subtitle')?.textContent?.trim() || '',
            horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
            cookieRect,
            formRect,
            submitRect,
            bannerRect
        };
    });

    if (authMetrics.path !== '/prihlaseni.html') {
        errors.push(`auth path expected /prihlaseni.html, got ${authMetrics.path}`);
    }
    validateQuery(authMetrics.params, {
        mode: 'register',
        redirect: '/cenik.html',
        plan: 'pruvodce',
        source: 'pricing_page',
        feature: 'premium_membership'
    }, 'auth query', errors);
    if (!authMetrics.bodyClasses.includes('auth-checkout-plan-mode')) {
        errors.push('auth page missing auth-checkout-plan-mode');
    }
    if (!authMetrics.bodyClasses.includes('auth-register-mode')) {
        errors.push('auth page missing auth-register-mode');
    }
    if (!authMetrics.bannerVisible) {
        errors.push('auth checkout context banner is not visible');
    }
    if (!authMetrics.submitVisible) {
        errors.push('auth submit is not visible');
    }
    if (!authMetrics.subtitleText.toLowerCase().includes('stripe')) {
        errors.push(`auth subtitle should mention Stripe handoff, got "${authMetrics.subtitleText}"`);
    }
    if (/\bfree\b|trial|7\s*d.n|zdarma/i.test(`${authMetrics.submitText} ${authMetrics.h1Text} ${authMetrics.subtitleText}`)) {
        errors.push('auth paid handoff contains free/trial wording');
    }
    if (authMetrics.horizontalOverflow) {
        errors.push('auth page has horizontal overflow');
    }
    if (rectOverlaps(authMetrics.bannerRect, authMetrics.submitRect)) {
        errors.push('auth checkout banner overlaps submit button');
    }
    if (viewportName === 'mobile' && rectOverlaps(authMetrics.cookieRect, authMetrics.submitRect)) {
        errors.push('mobile cookie banner overlaps auth submit button');
    }
    if (viewportName === 'mobile' && rectOverlaps(authMetrics.cookieRect, authMetrics.formRect)) {
        errors.push('mobile cookie banner overlaps auth form');
    }

    return {
        viewport: viewportName,
        submitText: authMetrics.submitText,
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

            results.push(await inspectPricingHandoff(page, viewport.name, args.baseUrl));

            await context.close();
        }
    } finally {
        await browser.close();
    }

    const failures = results.filter((result) => result.errors.length > 0);
    telemetry.print('pricing-handoff-smoke');
    for (const result of results) {
        const status = result.errors.length ? 'FAIL' : 'OK';
        console.log(`[pricing-handoff-smoke] ${status} ${result.viewport} submit="${result.submitText}"`);
        for (const error of result.errors) {
            console.log(`  - ${error}`);
        }
    }

    if (failures.length > 0) {
        throw new Error(`${failures.length} pricing handoff smoke check(s) failed`);
    }
}

main().catch((error) => {
    console.error(`[pricing-handoff-smoke] ${error.message}`);
    process.exit(1);
});
