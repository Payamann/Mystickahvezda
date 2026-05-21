import { expect, test } from '@playwright/test';
import { waitForPageReady } from './helpers.js';

async function waitForPath(page, pathname, options = {}) {
    await page.waitForURL(
        url => url.pathname === pathname,
        { timeout: 10000, waitUntil: 'domcontentloaded', ...options }
    );
}

async function setupCheckoutRoutes(page, {
    userId,
    email,
    checkoutSessionId
}) {
    const state = {
        authPayload: null,
        checkoutPayload: null,
        funnelEvents: []
    };

    await page.route('**/api/csrf-token', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ csrfToken: 'e2e-horoscope-inline-token' })
        });
    });

    await page.route('**/api/payment/funnel-event', async (route) => {
        state.funnelEvents.push(route.request().postDataJSON());
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true })
        });
    });

    await page.route('**/api/auth/register', async (route) => {
        state.authPayload = route.request().postDataJSON();
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                success: true,
                user: {
                    id: userId,
                    email,
                    role: 'user',
                    subscription_status: 'free'
                }
            })
        });
    });

    await page.route('**/api/payment/create-checkout-session', async (route) => {
        state.checkoutPayload = route.request().postDataJSON();
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                id: checkoutSessionId,
                url: `/profil.html?payment=success&plan=pruvodce&session_id=${checkoutSessionId}`
            })
        });
    });

    return state;
}

async function submitRegistration(page, email) {
    await page.locator('#email').fill(email);
    await page.locator('#password').fill('TestPassword123!');
    await page.locator('#confirm-password-reg').fill('TestPassword123!');
    await page.locator('#gdpr-consent').check();

    await Promise.all([
        waitForPath(page, '/profil.html'),
        page.locator('#auth-submit').click(),
    ]);
}

function expectFunnelEvent(state, eventName, {
    source,
    feature,
    step
}) {
    const metadata = {
        redirect: '/cenik.html',
        auth_mode: 'register',
        entry_source: source,
        entry_feature: feature
    };
    if (step) metadata.step = step;

    expect(state.funnelEvents.find((event) => (
        event.eventName === eventName
        && event.source === source
        && event.feature === feature
    )) || null).toEqual(expect.objectContaining({
        planId: 'pruvodce',
        metadata: expect.objectContaining(metadata)
    }));
}

test.describe('Horoscope inline checkout handoff', () => {
    for (const period of ['weekly', 'monthly']) {
        const feature = `${period}_horoscope`;

        test(`${period} horoscope upsell records auth page view and resumes checkout`, async ({ page }) => {
            const email = `horoscope-inline-${period}@example.com`;
            const state = await setupCheckoutRoutes(page, {
                userId: `horoscope-inline-${period}-user`,
                email,
                checkoutSessionId: `cs_test_horoscope_inline_${period}`
            });

            await page.goto(`/horoskopy.html?source=e2e_horoscope_inline_${period}`);
            await waitForPageReady(page);
            await page.evaluate(() => {
                localStorage.clear();
                sessionStorage.clear();
            });

            await page.locator(`[data-tab="${period}"]`).click();
            const upsell = page.locator('.horoscope-upsell');
            await expect(upsell).toBeVisible();

            await Promise.all([
                waitForPath(page, '/prihlaseni.html'),
                upsell.locator('.horoscope-upsell-btn').click(),
            ]);

            const authUrl = new URL(page.url());
            expect(authUrl.searchParams.get('mode')).toBe('register');
            expect(authUrl.searchParams.get('redirect')).toBe('/cenik.html');
            expect(authUrl.searchParams.get('plan')).toBe('pruvodce');
            expect(authUrl.searchParams.get('source')).toBe('horoscope_inline_upsell');
            expect(authUrl.searchParams.get('feature')).toBe(feature);
            expect(authUrl.searchParams.get('entry_source')).toBe('horoscope_inline_upsell');
            expect(authUrl.searchParams.get('entry_feature')).toBe(feature);

            await expect(page.locator('#checkout-context-banner')).toBeVisible();
            await expect.poll(() => state.funnelEvents.find((event) => (
                event.eventName === 'checkout_auth_page_viewed'
                && event.source === 'horoscope_inline_upsell'
                && event.feature === feature
            )) || null).toEqual(expect.objectContaining({
                planId: 'pruvodce',
                metadata: expect.objectContaining({
                    redirect: '/cenik.html',
                    auth_mode: 'register',
                    entry_source: 'horoscope_inline_upsell',
                    entry_feature: feature,
                    step: 'auth_page_viewed'
                })
            }));

            await submitRegistration(page, email);

            expect(state.authPayload).toEqual(expect.objectContaining({
                email,
                password: 'TestPassword123!',
                password_confirm: 'TestPassword123!'
            }));
            expect(state.checkoutPayload).toEqual(expect.objectContaining({
                planId: 'pruvodce',
                source: 'horoscope_inline_upsell',
                feature,
                billingInterval: null,
                metadata: expect.objectContaining({
                    entry_source: 'horoscope_inline_upsell',
                    entry_feature: feature
                })
            }));
            expectFunnelEvent(state, 'checkout_auth_required', {
                source: 'horoscope_inline_upsell',
                feature,
                step: undefined
            });
            expectFunnelEvent(state, 'checkout_auth_form_submitted', {
                source: 'horoscope_inline_upsell',
                feature,
                step: 'register_form_submitted'
            });
            expect(await page.evaluate(() => sessionStorage.getItem('pending_plan'))).toBeNull();
        });
    }
});
