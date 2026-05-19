import { test, expect } from '@playwright/test';
import { BASE_URL, MOBILE_VIEWPORT, waitForPageReady } from './helpers.js';

const DESKTOP_VIEWPORT = { width: 1280, height: 720 };
const EXTERNAL_SCRIPT_RE = /.*(googletagmanager|google-analytics|clarity|facebook|hotjar|sentry).*/i;

async function createSmokePage(browser, { mobile = false, auth = false } = {}) {
    const context = await browser.newContext({
        viewport: mobile ? MOBILE_VIEWPORT : DESKTOP_VIEWPORT,
        locale: 'cs-CZ',
        timezoneId: 'Europe/Prague',
        serviceWorkers: 'block'
    });

    await context.addInitScript(() => {
        localStorage.setItem('mh_cookie_prefs', JSON.stringify({
            analytics: false,
            marketing: false,
            ts: Date.now()
        }));
        localStorage.removeItem('cookieConsent');
    });

    if (auth) {
        const user = {
            id: 'conversion-smoke-user',
            email: 'conversion-smoke@example.com',
            role: 'user',
            subscription_status: 'free'
        };

        await context.addCookies([{
            name: 'logged_in',
            value: '1',
            url: BASE_URL
        }]);

        await context.addInitScript((authUser) => {
            localStorage.setItem('auth_user', JSON.stringify(authUser));
        }, user);
    }

    const page = await context.newPage();
    await page.route(EXTERNAL_SCRIPT_RE, route => route.abort());

    return { context, page };
}

async function gotoReady(page, url, readySelector = 'main') {
    const response = await page.goto(url, { waitUntil: 'domcontentloaded' });
    expect(response?.ok(), `${url} should return a successful response`).toBe(true);
    await waitForPageReady(page);
    await expect(page.locator(readySelector).first()).toBeVisible();
}

async function expectNoHorizontalOverflow(page) {
    const overflow = await page.evaluate(() => (
        document.documentElement.scrollWidth - document.documentElement.clientWidth
    ));
    expect(overflow).toBeLessThanOrEqual(2);
}

test.describe('Conversion smoke', () => {
    test('critical conversion paths keep context, errors, and mobile layout stable', async ({ browser }) => {
        test.setTimeout(300_000);

        const mobile = await createSmokePage(browser, { mobile: true });
        try {
            await test.step('mobile homepage nav exposes menu and dropdown state without overflow', async () => {
                const { page } = mobile;
                await gotoReady(page, '/', '.nav__toggle');
                await expect.poll(() => page.locator('.nav__toggle').getAttribute('data-nav-initialized')).toBe('true');

                await page.locator('.nav__toggle').click();

                await expect(page.locator('.nav__toggle')).toHaveAttribute('aria-expanded', 'true');
                await expect(page.locator('.nav__list')).toHaveAttribute('aria-hidden', 'false');
                await expect.poll(() => page.evaluate(() => document.body.classList.contains('nav-open'))).toBe(true);

                const dropdownToggle = page.locator('.nav__link--dropdown-toggle').first();
                await dropdownToggle.click();

                await expect(dropdownToggle).toHaveAttribute('aria-expanded', 'true');
                await expectNoHorizontalOverflow(page);
            });

            await test.step('register form blocks password mismatch with inline accessible errors', async () => {
                const { page } = mobile;
                const registerRequests = [];
                await page.route('**/api/auth/register', async (route) => {
                    registerRequests.push(route.request().postData());
                    await route.fulfill({
                        status: 500,
                        contentType: 'application/json',
                        body: JSON.stringify({ error: 'Registration should not be called for invalid form' })
                    });
                });

                await gotoReady(
                    page,
                    '/prihlaseni.html?mode=register&redirect=/cenik.html&plan=pruvodce&source=pricing_page&feature=premium_membership',
                    '#auth-submit'
                );
                await expect.poll(() => page.evaluate(() => Boolean(window.Auth))).toBe(true);

                await page.locator('#email').fill('smoke@example.com');
                await page.locator('#password').fill('TestPassword123!');
                await page.locator('#confirm-password-reg').fill('OtherPassword123!');
                await page.locator('#gdpr-consent').check();
                await page.locator('#auth-submit').click({ noWaitAfter: true });

                await expect(page.locator('#confirm-password-reg')).toHaveAttribute('aria-invalid', 'true');
                await expect(page.locator('#confirm-password-field-wrapper .form-field-error')).toContainText('Hesla se neshod');
                await expect(page.locator('#login-form .form-error-summary')).toContainText('Hesla se neshod');
                expect(registerRequests).toEqual([]);
                await expectNoHorizontalOverflow(page);
            });

            await test.step('mobile natal chart form shows inline required errors without horizontal overflow', async () => {
                const { page } = mobile;
                await page.route('**/js/dist/natal-3d.js*', route => route.abort());
                await gotoReady(page, '/natalni-karta.html', '#natal-form');

                await expectNoHorizontalOverflow(page);
                await page.locator('#natal-form button[type="submit"]').click({ noWaitAfter: true });

                await expect(page.locator('#natal-form .form-error-summary')).toContainText('Zkontrolujte');
                await expect(page.locator('#natal-form [aria-invalid="true"]').first()).toBeVisible();
                await expect(page.locator('#natal-form .form-field-error').first()).toContainText('Vypl');
                await expectNoHorizontalOverflow(page);
            });
        } finally {
            await mobile.context.close();
        }

        const pricing = await createSmokePage(browser);
        try {
            await test.step('pricing checkout buttons preserve logged-out context and expose status text', async () => {
                const { page } = pricing;
                await gotoReady(
                    page,
                    '/cenik.html?source=inline_paywall&feature=tarot_multi_card&plan=pruvodce&utm_source=e2e_smoke',
                    '.plan-checkout-btn'
                );

                await expect(page.locator('#pricing-checkout-status')).toBeAttached();
                await expect(page.locator('.plan-checkout-btn[data-plan="pruvodce"]')).toHaveAttribute(
                    'aria-describedby',
                    /pricing-checkout-status/
                );

                await Promise.all([
                    page.waitForURL((url) => url.pathname === '/prihlaseni.html'),
                    page.locator('.plan-checkout-btn[data-plan="pruvodce"]').click()
                ]);

                const url = new URL(page.url());
                expect(url.searchParams.get('mode')).toBe('register');
                expect(url.searchParams.get('redirect')).toBe('/cenik.html');
                expect(url.searchParams.get('plan')).toBe('pruvodce');
                expect(url.searchParams.get('source')).toBe('inline_paywall');
                expect(url.searchParams.get('feature')).toBe('tarot_multi_card');
            });
        } finally {
            await pricing.context.close();
        }

        const checkout = await createSmokePage(browser, { auth: true });
        try {
            await test.step('logged-in checkout API failure returns to contextual recovery panel', async () => {
                const { page } = checkout;
                let checkoutPayload = null;

                await page.route('**/api/auth/profile', async (route) => {
                    await route.fulfill({
                        status: 200,
                        contentType: 'application/json',
                        body: JSON.stringify({
                            success: true,
                            user: {
                                id: 'conversion-smoke-user',
                                email: 'conversion-smoke@example.com',
                                role: 'user',
                                subscription_status: 'free'
                            }
                        })
                    });
                });

                await page.route('**/api/payment/funnel-event', async (route) => {
                    await route.fulfill({
                        status: 200,
                        contentType: 'application/json',
                        body: JSON.stringify({ success: true })
                    });
                });

                await page.route('**/api/payment/create-checkout-session', async (route) => {
                    checkoutPayload = route.request().postDataJSON();
                    await route.fulfill({
                        status: 500,
                        contentType: 'application/json',
                        body: JSON.stringify({ error: 'Stripe unavailable' })
                    });
                });

                await gotoReady(
                    page,
                    '/cenik.html?source=inline_paywall&feature=tarot_multi_card&plan=pruvodce&utm_source=e2e_smoke',
                    '.plan-checkout-btn'
                );

                await page.locator('.plan-checkout-btn[data-plan="pruvodce"]').click({ noWaitAfter: true });

                const recovery = page.locator('#pricing-cancel-recovery');
                await expect(recovery).toBeVisible();
                await expect(recovery.locator('[data-cancel-retry]')).toContainText('Zkusit platbu znovu');
                await expect(recovery).toContainText('Stripe Checkoutu');
                await expect.poll(() => page.url()).not.toContain('payment=failure');

                expect(checkoutPayload).toEqual(expect.objectContaining({
                    planId: 'pruvodce',
                    source: 'inline_paywall',
                    feature: 'tarot_multi_card',
                    metadata: expect.objectContaining({
                        entry_source: 'inline_paywall',
                        entry_feature: 'tarot_multi_card',
                        utm_source: 'e2e_smoke'
                    })
                }));
            });
        } finally {
            await checkout.context.close();
        }
    });
});
