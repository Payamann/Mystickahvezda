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
        expectedMode: 'register',
        mockCheckoutSubmit: true
    },
    {
        name: 'register-tarot-inline-paywall-bridge',
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
        expectedMode: 'register',
        entryFlow: {
            type: 'tarot-inline-paywall-bridge',
            path: '/tarot.html',
            triggerSelector: '.paywall-overlay .paywall-upgrade'
        },
        expectedPaymentEvents: ['paywall_viewed', 'paywall_cta_clicked'],
        mockCheckoutSubmit: true
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
            entry_feature: 'numerologie_vyklad',
            billing_interval: 'monthly'
        },
        expectedMode: 'login',
        mockCheckoutSubmit: true
    },
    {
        name: 'register-numerology-trial-paywall-bridge',
        path: '/prihlaseni.html',
        params: {
            mode: 'register',
            redirect: '/cenik.html',
            plan: 'pruvodce',
            source: 'trial_paywall',
            feature: 'numerologie_vyklad',
            entry_source: 'trial_paywall',
            entry_feature: 'numerologie_vyklad'
        },
        expectedMode: 'register',
        entryFlow: {
            type: 'numerology-trial-paywall-bridge',
            path: '/numerologie.html',
            triggerSelector: '.paywall-overlay .paywall-upgrade'
        },
        expectedPaymentEvents: ['paywall_viewed', 'paywall_cta_clicked'],
        mockCheckoutSubmit: true
    },
    {
        name: 'register-numerology-result-premium-bridge',
        path: '/prihlaseni.html',
        params: {
            mode: 'register',
            redirect: '/cenik.html',
            plan: 'pruvodce',
            source: 'trial_paywall',
            feature: 'numerologie_vyklad',
            entry_source: 'trial_paywall',
            entry_feature: 'numerologie_vyklad'
        },
        expectedMode: 'register',
        entryFlow: {
            type: 'numerology-result-premium-bridge',
            path: '/numerologie.html',
            triggerSelector: '.paywall-overlay .paywall-upgrade'
        },
        expectedPaymentEvents: ['paywall_viewed', 'paywall_cta_clicked'],
        mockCheckoutSubmit: true
    },
    {
        name: 'register-numerology-inline-paywall-bridge',
        path: '/prihlaseni.html',
        params: {
            mode: 'register',
            redirect: '/cenik.html',
            plan: 'pruvodce',
            source: 'inline_paywall',
            feature: 'numerologie_vyklad',
            entry_source: 'inline_paywall',
            entry_feature: 'numerologie_vyklad'
        },
        expectedMode: 'register',
        entryFlow: {
            type: 'numerology-inline-paywall-bridge',
            path: '/numerologie.html',
            triggerSelector: '.paywall-overlay .paywall-upgrade'
        },
        expectedPaymentEvents: ['paywall_viewed', 'paywall_cta_clicked'],
        mockCheckoutSubmit: true
    },
    {
        name: 'register-paid-natal',
        path: '/prihlaseni.html',
        params: {
            mode: 'register',
            redirect: '/cenik.html',
            plan: 'pruvodce',
            source: 'natal_teaser_gate',
            feature: 'natalni_interpretace',
            entry_source: 'natal_teaser_gate',
            entry_feature: 'natalni_interpretace'
        },
        expectedMode: 'register',
        mockCheckoutSubmit: true
    },
    {
        name: 'register-natal-login-gate-bridge',
        path: '/prihlaseni.html',
        params: {
            mode: 'register',
            redirect: '/cenik.html',
            plan: 'pruvodce',
            source: 'natal_teaser_gate',
            feature: 'natalni_interpretace',
            entry_source: 'natal_teaser_gate',
            entry_feature: 'natalni_interpretace'
        },
        expectedMode: 'register',
        entryFlow: {
            type: 'natal-login-gate-bridge',
            path: '/natalni-karta.html',
            triggerSelector: '.login-gate-btn'
        },
        expectedPaymentEvents: ['login_gate_viewed', 'paywall_cta_clicked'],
        mockCheckoutSubmit: true
    },
    {
        name: 'register-paid-partner-match',
        path: '/prihlaseni.html',
        params: {
            mode: 'register',
            redirect: '/cenik.html',
            plan: 'pruvodce',
            source: 'partner_match_result',
            feature: 'partnerska_detail',
            entry_source: 'partner_match_result',
            entry_feature: 'partnerska_detail'
        },
        expectedMode: 'register',
        mockCheckoutSubmit: true
    },
    {
        name: 'register-partner-match-result-bridge',
        path: '/prihlaseni.html',
        params: {
            mode: 'register',
            redirect: '/cenik.html',
            plan: 'pruvodce',
            source: 'partner_match_result',
            feature: 'partnerska_detail',
            entry_source: 'partner_match_result',
            entry_feature: 'partnerska_detail'
        },
        expectedMode: 'register',
        entryFlow: {
            type: 'synastry-result-bridge',
            path: '/partnerska-shoda.html',
            triggerSelector: '[data-synastry-upgrade]'
        },
        expectedPaymentEvents: ['paywall_viewed', 'paywall_cta_clicked'],
        mockCheckoutSubmit: true
    },
    {
        name: 'register-paid-runes',
        path: '/prihlaseni.html',
        params: {
            mode: 'register',
            redirect: '/cenik.html',
            plan: 'pruvodce',
            source: 'runes_auth_gate',
            feature: 'runy_hluboky_vyklad',
            entry_source: 'runes_auth_gate',
            entry_feature: 'runy_hluboky_vyklad'
        },
        expectedMode: 'register',
        mockCheckoutSubmit: true
    },
    {
        name: 'register-paid-angel-cards',
        path: '/prihlaseni.html',
        params: {
            mode: 'register',
            redirect: '/cenik.html',
            plan: 'pruvodce',
            source: 'angel_card_auth_gate',
            feature: 'andelske_karty_hluboky_vhled',
            entry_source: 'angel_card_auth_gate',
            entry_feature: 'andelske_karty_hluboky_vhled'
        },
        expectedMode: 'register',
        mockCheckoutSubmit: true
    },
    {
        name: 'register-paid-mentor',
        path: '/prihlaseni.html',
        params: {
            mode: 'register',
            redirect: '/cenik.html',
            plan: 'pruvodce',
            source: 'mentor_teaser_gate',
            feature: 'mentor',
            entry_source: 'mentor_teaser_gate',
            entry_feature: 'mentor'
        },
        expectedMode: 'register',
        mockCheckoutSubmit: true
    },
    {
        name: 'register-pricing-premium-membership',
        path: '/prihlaseni.html',
        params: {
            mode: 'register',
            redirect: '/cenik.html',
            plan: 'pruvodce',
            source: 'pricing_page',
            feature: 'premium_membership',
            entry_source: 'pricing_page',
            entry_feature: 'premium_membership'
        },
        expectedMode: 'register',
        mockCheckoutSubmit: true
    },
    {
        name: 'register-weekly-horoscope-inline-flow',
        path: '/prihlaseni.html',
        params: {
            mode: 'register',
            redirect: '/cenik.html',
            plan: 'pruvodce',
            source: 'horoscope_inline_upsell',
            feature: 'weekly_horoscope',
            entry_source: 'horoscope_inline_upsell',
            entry_feature: 'weekly_horoscope'
        },
        expectedMode: 'register',
        entryFlow: {
            path: '/horoskopy.html',
            tab: 'weekly',
            triggerSelector: '.horoscope-upsell-btn'
        },
        mockCheckoutSubmit: true
    },
    {
        name: 'register-monthly-horoscope-inline-flow',
        path: '/prihlaseni.html',
        params: {
            mode: 'register',
            redirect: '/cenik.html',
            plan: 'pruvodce',
            source: 'horoscope_inline_upsell',
            feature: 'monthly_horoscope',
            entry_source: 'horoscope_inline_upsell',
            entry_feature: 'monthly_horoscope'
        },
        expectedMode: 'register',
        entryFlow: {
            path: '/horoskopy.html',
            tab: 'monthly',
            triggerSelector: '.horoscope-upsell-btn'
        },
        mockCheckoutSubmit: true
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

async function installMockCheckoutSubmitRoutes(page, scenario) {
    const state = {
        authPayload: null,
        checkoutPayload: null,
        checkoutRequests: 0,
        csrfRequests: 0
    };
    const authEndpoint = scenario.expectedMode === 'register'
        ? '**/api/auth/register'
        : '**/api/auth/login';

    await page.route('**/api/csrf-token', async (route) => {
        state.csrfRequests += 1;
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ csrfToken: 'production-auth-handoff-smoke-token' })
        });
    });

    await page.route(authEndpoint, async (route) => {
        state.authPayload = route.request().postDataJSON();
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                success: true,
                user: {
                    id: 'production-auth-handoff-smoke-user',
                    email: state.authPayload?.email || 'smoke-login@example.com',
                    role: 'user',
                    subscription_status: 'free'
                }
            })
        });
    });

    await page.route('**/api/payment/create-checkout-session', async (route) => {
        state.checkoutRequests += 1;
        state.checkoutPayload = route.request().postDataJSON();
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                id: `cs_smoke_${scenario.name}`,
                url: `/profil.html?payment=success&plan=${scenario.params.plan}&session_id=cs_smoke_${scenario.name}`
            })
        });
    });

    return state;
}

function validateCheckoutSubmit(metrics, scenario, errors) {
    if (!scenario.mockCheckoutSubmit) return;

    if (!metrics.authPayload) {
        errors.push('mocked login request was not sent');
    }
    if (!metrics.checkoutPayload) {
        errors.push('mocked checkout request was not sent');
        return;
    }
    if (metrics.checkoutRequests !== 1) {
        errors.push(`expected one checkout request, got ${metrics.checkoutRequests}`);
    }

    const expected = {
        planId: scenario.params.plan,
        source: scenario.params.source,
        feature: scenario.params.feature,
        billingInterval: scenario.params.billing_interval || null
    };
    const expectedAuthPayload = scenario.expectedMode === 'register'
        ? {
            email: 'smoke-register@example.com',
            password_confirm: 'SmokePassword123!'
        }
        : {
            email: 'smoke-login@example.com'
        };
    Object.entries(expectedAuthPayload).forEach(([key, value]) => {
        if (metrics.authPayload?.[key] !== value) {
            errors.push(`auth payload ${key} expected ${value}, got ${metrics.authPayload?.[key] || '<missing>'}`);
        }
    });
    Object.entries(expected).forEach(([key, value]) => {
        if (metrics.checkoutPayload[key] !== value) {
            errors.push(`checkout payload ${key} expected ${value}, got ${metrics.checkoutPayload[key] || '<missing>'}`);
        }
    });

    const metadata = metrics.checkoutPayload.metadata || {};
    ['entry_source', 'entry_feature'].forEach((key) => {
        if (metadata[key] !== scenario.params[key]) {
            errors.push(`checkout metadata ${key} expected ${scenario.params[key]}, got ${metadata[key] || '<missing>'}`);
        }
    });

    if (metrics.finalPath !== '/profil.html') {
        errors.push(`post-checkout path expected /profil.html, got ${metrics.finalPath || '<missing>'}`);
    }
    if (metrics.finalSessionId !== `cs_smoke_${scenario.name}`) {
        errors.push(`post-checkout session_id expected cs_smoke_${scenario.name}, got ${metrics.finalSessionId || '<missing>'}`);
    }
    if (metrics.pendingPlanAfterSubmit) {
        errors.push('pending checkout plan remained after mocked checkout success');
    }
}

async function clearScenarioStorage(page, baseUrl) {
    const healthUrl = new URL('/api/health', `${baseUrl}/`);
    healthUrl.searchParams.set('cache', String(Date.now()));
    await page.goto(healthUrl.toString(), { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
    });
}

function findPaymentFunnelEvent(events, eventName, scenario) {
    return events.find((event) => (
        event.eventName === eventName
        && event.source === scenario.params.source
        && event.feature === scenario.params.feature
        && event.planId === scenario.params.plan
    )) || null;
}

async function waitForPaymentFunnelEvent(telemetry, startIndex, eventName, scenario, timeoutMs = 5_000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        const event = findPaymentFunnelEvent(
            telemetry.events('payment_funnel').slice(startIndex),
            eventName,
            scenario
        );
        if (event) return event;
        await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return null;
}

async function enterNatalLoginGateBridge(page, baseUrl, scenario) {
    await page.route('**/api/natal-chart/calculate?*', async (route) => {
        await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ success: false, error: 'production auth handoff smoke fallback' })
        });
    });

    const entryUrl = new URL(scenario.entryFlow.path, `${baseUrl}/`);
    entryUrl.searchParams.set('cache', String(Date.now()));
    await page.goto(entryUrl.toString(), { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForSelector('#natal-form', { state: 'visible', timeout: 10_000 });
    await page.waitForFunction(() => typeof window.Auth?.startPlanCheckout === 'function', null, { timeout: 10_000 });
    await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
        Object.assign(window.Auth || {}, {
            isLoggedIn: () => false,
            isPremium: () => false,
            getProfile: async () => null,
            showToast: () => {}
        });
    });
    await page.locator('#name').fill('Test');
    await page.locator('#birth-date').fill('1990-01-01');
    await page.locator('#birth-time').fill('12:00');
    await page.locator('#birth-place').fill('Praha');
    await page.locator('#natal-form button[type="submit"]').click();
    await page.waitForSelector(scenario.entryFlow.triggerSelector, { state: 'visible', timeout: 10_000 });
    await Promise.all([
        page.waitForURL(url => url.pathname === scenario.path, {
            timeout: 10_000,
            waitUntil: 'domcontentloaded'
        }),
        page.locator(scenario.entryFlow.triggerSelector).first().click()
    ]);
}

async function enterSynastryResultBridge(page, baseUrl, scenario) {
    const entryUrl = new URL(scenario.entryFlow.path, `${baseUrl}/`);
    entryUrl.searchParams.set('cache', String(Date.now()));
    await page.goto(entryUrl.toString(), { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForSelector('#synastry-form', { state: 'visible', timeout: 10_000 });
    await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
        Object.assign(window.Auth || {}, {
            isLoggedIn: () => false,
            isPremium: () => false,
            getProfile: async () => null,
            showToast: () => {}
        });
        window.callAPI = async () => ({
            synastry: {
                scores: {
                    total: 82,
                    emotion: 84,
                    communication: 76,
                    passion: 88,
                    stability: 79
                },
                engine: {
                    precision: 'birth_date',
                    version: 'production-auth-handoff-smoke'
                }
            }
        });
    });
    await page.locator('#p1-name').fill('Anna');
    await page.locator('#p1-date').fill('1990-01-01');
    await page.locator('#p2-name').fill('Pavel');
    await page.locator('#p2-date').fill('1992-07-15');
    await page.locator('#synastry-form button[type="submit"]').click();
    await page.waitForSelector('#synastry-next-step', { state: 'visible', timeout: 10_000 });
    await page.waitForSelector(scenario.entryFlow.triggerSelector, { state: 'visible', timeout: 10_000 });
    await Promise.all([
        page.waitForURL(url => url.pathname === scenario.path, {
            timeout: 10_000,
            waitUntil: 'domcontentloaded'
        }),
        page.locator(scenario.entryFlow.triggerSelector).first().click()
    ]);
}

async function enterNumerologyTrialPaywallBridge(page, baseUrl, scenario) {
    const entryUrl = new URL(scenario.entryFlow.path, `${baseUrl}/`);
    entryUrl.searchParams.set('cache', String(Date.now()));
    await page.goto(entryUrl.toString(), { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForSelector('#numerology-form', { state: 'visible', timeout: 10_000 });
    await page.waitForFunction(
        () => typeof window.Premium?.showTrialPaywall === 'function'
            && typeof window.Auth?.startPlanCheckout === 'function',
        null,
        { timeout: 10_000 }
    );
    await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
        Object.assign(window.Auth || {}, {
            isLoggedIn: () => false,
            isPremium: () => false,
            getProfile: async () => null,
            showToast: () => {}
        });
        window.Premium.showTrialPaywall('numerologie_vyklad');
    });
    await page.waitForSelector(scenario.entryFlow.triggerSelector, { state: 'visible', timeout: 10_000 });
    await Promise.all([
        page.waitForURL(url => url.pathname === scenario.path, {
            timeout: 10_000,
            waitUntil: 'domcontentloaded'
        }),
        page.locator(scenario.entryFlow.triggerSelector).first().click()
    ]);
}

async function enterNumerologyResultPremiumBridge(page, baseUrl, scenario) {
    const entryUrl = new URL(scenario.entryFlow.path, `${baseUrl}/`);
    entryUrl.searchParams.set('cache', String(Date.now()));
    await page.goto(entryUrl.toString(), { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForSelector('#numerology-form', { state: 'visible', timeout: 10_000 });
    await page.waitForFunction(
        () => typeof window.Premium?.showTrialPaywall === 'function'
            && typeof window.Auth?.startPlanCheckout === 'function',
        null,
        { timeout: 10_000 }
    );
    await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
        Object.assign(window.Auth || {}, {
            isLoggedIn: () => false,
            isPremium: () => false,
            getProfile: async () => null,
            showToast: () => {}
        });
    });
    await page.locator('#num-name').fill('Jana Novakova');
    await page.locator('#num-date').fill('1990-06-15');
    await page.locator('#num-time').fill('14:30');
    await page.locator('#numerology-form button[type="submit"]').click();
    await page.waitForSelector('.numerology-premium-shell', { state: 'visible', timeout: 10_000 });
    await page.locator('.numerology-upgrade-btn').click();
    await page.waitForSelector(scenario.entryFlow.triggerSelector, { state: 'visible', timeout: 10_000 });
    await Promise.all([
        page.waitForURL(url => url.pathname === scenario.path, {
            timeout: 10_000,
            waitUntil: 'domcontentloaded'
        }),
        page.locator(scenario.entryFlow.triggerSelector).first().click()
    ]);
}

async function enterNumerologyInlinePaywallBridge(page, baseUrl, scenario) {
    const entryUrl = new URL(scenario.entryFlow.path, `${baseUrl}/`);
    entryUrl.searchParams.set('cache', String(Date.now()));
    await page.goto(entryUrl.toString(), { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForSelector('#numerology-form', { state: 'visible', timeout: 10_000 });
    await page.waitForFunction(
        () => typeof window.Premium?.showPaywall === 'function'
            && typeof window.Auth?.startPlanCheckout === 'function',
        null,
        { timeout: 10_000 }
    );
    await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
        Object.assign(window.Auth || {}, {
            isLoggedIn: () => false,
            isPremium: () => false,
            getProfile: async () => null,
            showToast: () => {}
        });
        window.Premium.showPaywall('numerologie_vyklad');
    });
    await page.waitForSelector(scenario.entryFlow.triggerSelector, { state: 'visible', timeout: 10_000 });
    await Promise.all([
        page.waitForURL(url => url.pathname === scenario.path, {
            timeout: 10_000,
            waitUntil: 'domcontentloaded'
        }),
        page.locator(scenario.entryFlow.triggerSelector).first().click()
    ]);
}

async function enterTarotInlinePaywallBridge(page, baseUrl, scenario) {
    const entryUrl = new URL(scenario.entryFlow.path, `${baseUrl}/`);
    entryUrl.searchParams.set('cache', String(Date.now()));
    await page.goto(entryUrl.toString(), { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForSelector('.tarot-deck', { state: 'visible', timeout: 10_000 });
    await page.waitForFunction(
        () => typeof window.Premium?.showPaywall === 'function'
            && typeof window.Auth?.startPlanCheckout === 'function',
        null,
        { timeout: 10_000 }
    );
    await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
        Object.assign(window.Auth || {}, {
            isLoggedIn: () => false,
            isPremium: () => false,
            getProfile: async () => null,
            showToast: () => {}
        });
        window.Premium.showPaywall('tarot_multi_card');
    });
    await page.waitForSelector(scenario.entryFlow.triggerSelector, { state: 'visible', timeout: 10_000 });
    await Promise.all([
        page.waitForURL(url => url.pathname === scenario.path, {
            timeout: 10_000,
            waitUntil: 'domcontentloaded'
        }),
        page.locator(scenario.entryFlow.triggerSelector).first().click()
    ]);
}

function validatePaymentFunnelEvent(events, eventName, scenario, errors, expectedMetadata = {}) {
    const event = findPaymentFunnelEvent(events, eventName, scenario);
    if (!event) {
        errors.push(`missing payment funnel event ${eventName}`);
        return null;
    }

    const metadata = event.metadata || {};
    Object.entries(expectedMetadata).forEach(([key, value]) => {
        if (metadata[key] !== value) {
            errors.push(`payment funnel ${eventName} metadata ${key} expected ${value}, got ${metadata[key] || '<missing>'}`);
        }
    });
    return event;
}

function expectedPaymentEventNames(scenario) {
    const names = new Set(['checkout_auth_page_viewed']);
    if (scenario.entryFlow) names.add('checkout_auth_required');
    if (scenario.mockCheckoutSubmit) names.add('checkout_auth_form_submitted');
    (scenario.expectedPaymentEvents || []).forEach((eventName) => names.add(eventName));
    return Array.from(names);
}

function validateExpectedPaymentEvents(events, scenario, errors) {
    expectedPaymentEventNames(scenario).forEach((eventName) => {
        if (!findPaymentFunnelEvent(events, eventName, scenario)) {
            errors.push(`missing expected payment funnel event ${eventName}`);
        }
    });
}

async function inspectScenario(page, scenario, viewportName, baseUrl, telemetry) {
    await clearScenarioStorage(page, baseUrl);

    const submitState = scenario.mockCheckoutSubmit
        ? await installMockCheckoutSubmitRoutes(page, scenario)
        : null;
    const paymentFunnelStartIndex = telemetry.events('payment_funnel').length;
    if (scenario.entryFlow) {
        if (scenario.entryFlow.type === 'natal-login-gate-bridge') {
            await enterNatalLoginGateBridge(page, baseUrl, scenario);
        } else if (scenario.entryFlow.type === 'synastry-result-bridge') {
            await enterSynastryResultBridge(page, baseUrl, scenario);
        } else if (scenario.entryFlow.type === 'numerology-trial-paywall-bridge') {
            await enterNumerologyTrialPaywallBridge(page, baseUrl, scenario);
        } else if (scenario.entryFlow.type === 'numerology-result-premium-bridge') {
            await enterNumerologyResultPremiumBridge(page, baseUrl, scenario);
        } else if (scenario.entryFlow.type === 'numerology-inline-paywall-bridge') {
            await enterNumerologyInlinePaywallBridge(page, baseUrl, scenario);
        } else if (scenario.entryFlow.type === 'tarot-inline-paywall-bridge') {
            await enterTarotInlinePaywallBridge(page, baseUrl, scenario);
        } else {
            const entryUrl = new URL(scenario.entryFlow.path, `${baseUrl}/`);
            entryUrl.searchParams.set('cache', String(Date.now()));
            await page.goto(entryUrl.toString(), { waitUntil: 'domcontentloaded', timeout: 30_000 });
            await page.waitForSelector(`[data-tab="${scenario.entryFlow.tab}"]`, { state: 'visible', timeout: 10_000 });
            await page.locator(`[data-tab="${scenario.entryFlow.tab}"]`).click();
            await page.waitForSelector(scenario.entryFlow.triggerSelector, { state: 'visible', timeout: 10_000 });
            await Promise.all([
                page.waitForURL(url => url.pathname === scenario.path, {
                    timeout: 10_000,
                    waitUntil: 'domcontentloaded'
                }),
                page.locator(scenario.entryFlow.triggerSelector).click()
            ]);
        }
    } else {
        const targetUrl = scenarioUrl(baseUrl, scenario);
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    }
    await page.waitForSelector('#auth-submit', { state: 'visible', timeout: 10_000 });
    await waitForPaymentFunnelEvent(telemetry, paymentFunnelStartIndex, 'checkout_auth_page_viewed', scenario);
    if (scenario.entryFlow) {
        await waitForPaymentFunnelEvent(telemetry, paymentFunnelStartIndex, 'checkout_auth_required', scenario);
    }

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

    const preSubmitPaymentFunnelEvents = telemetry.events('payment_funnel').slice(paymentFunnelStartIndex);
    validatePaymentFunnelEvent(preSubmitPaymentFunnelEvents, 'checkout_auth_page_viewed', scenario, errors, {
        redirect: '/cenik.html',
        auth_mode: scenario.expectedMode,
        entry_source: scenario.params.entry_source,
        entry_feature: scenario.params.entry_feature,
        step: 'auth_page_viewed'
    });
    if (scenario.entryFlow) {
        validatePaymentFunnelEvent(preSubmitPaymentFunnelEvents, 'checkout_auth_required', scenario, errors, {
            path: scenario.entryFlow.path,
            redirect: '/cenik.html',
            auth_mode: scenario.expectedMode,
            entry_source: scenario.params.entry_source,
            entry_feature: scenario.params.entry_feature
        });
    }

    const submitMetrics = {};
    if (scenario.mockCheckoutSubmit) {
        const email = scenario.expectedMode === 'register'
            ? 'smoke-register@example.com'
            : 'smoke-login@example.com';
        await page.locator('#email').fill(email);
        await page.locator('#password').fill('SmokePassword123!');
        if (scenario.expectedMode === 'register') {
            await page.locator('#confirm-password-reg').fill('SmokePassword123!');
            await page.locator('#gdpr-consent').check();
        }
        await Promise.all([
            page.waitForURL(url => (
                url.pathname === '/profil.html'
                && url.searchParams.get('session_id') === `cs_smoke_${scenario.name}`
            ), {
                timeout: 10_000,
                waitUntil: 'domcontentloaded'
            }),
            page.locator('#auth-submit').click()
        ]);

        const postSubmit = await page.evaluate(() => ({
            finalPath: window.location.pathname,
            finalSessionId: new URLSearchParams(window.location.search).get('session_id'),
            pendingPlanAfterSubmit: sessionStorage.getItem('pending_plan')
        }));
        Object.assign(submitMetrics, {
            ...postSubmit,
            authPayload: submitState.authPayload,
            checkoutPayload: submitState.checkoutPayload,
            checkoutRequests: submitState.checkoutRequests,
            csrfRequests: submitState.csrfRequests
        });
        validateCheckoutSubmit(submitMetrics, scenario, errors);
        await waitForPaymentFunnelEvent(telemetry, paymentFunnelStartIndex, 'checkout_auth_form_submitted', scenario);
        const postSubmitPaymentFunnelEvents = telemetry.events('payment_funnel').slice(paymentFunnelStartIndex);
        validatePaymentFunnelEvent(postSubmitPaymentFunnelEvents, 'checkout_auth_form_submitted', scenario, errors, {
            redirect: '/cenik.html',
            auth_mode: scenario.expectedMode,
            entry_source: scenario.params.entry_source,
            entry_feature: scenario.params.entry_feature,
            step: `${scenario.expectedMode}_form_submitted`
        });
    }
    const paymentEventNames = telemetry
        .events('payment_funnel')
        .slice(paymentFunnelStartIndex)
        .map((event) => event.eventName || '<unnamed>');
    validateExpectedPaymentEvents(
        telemetry.events('payment_funnel').slice(paymentFunnelStartIndex),
        scenario,
        errors
    );

    return {
        name: scenario.name,
        viewport: viewportName,
        submitText: metrics.submitText,
        checkoutRequests: submitMetrics.checkoutRequests || 0,
        paymentEventNames,
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
            const page = await context.newPage();
            page.setDefaultTimeout(args.timeoutMs);

            for (const scenario of SCENARIOS) {
                results.push(await inspectScenario(page, scenario, viewport.name, args.baseUrl, telemetry));
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
        console.log(`[auth-handoff-smoke] ${status} ${result.viewport} ${result.name} submit="${result.submitText}" checkout_requests=${result.checkoutRequests} payment_events=${result.paymentEventNames.join(',') || '<none>'}`);
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
