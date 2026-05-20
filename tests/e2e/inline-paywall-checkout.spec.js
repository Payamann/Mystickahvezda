import { expect, test } from '@playwright/test';
import { waitForPageReady } from './helpers.js';

async function waitForPath(page, pathname, options = {}) {
    await page.waitForURL(
        url => url.pathname === pathname,
        { timeout: 10000, waitUntil: 'domcontentloaded', ...options }
    );
}

test.describe('Inline paywall checkout handoff', () => {
    test('tarot multi-card inline paywall preserves checkout context through registration', async ({ page }) => {
        let authPayload = null;
        let checkoutPayload = null;
        const funnelEvents = [];

        await page.route('**/api/csrf-token', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ csrfToken: 'e2e-inline-paywall-token' })
            });
        });

        await page.route('**/api/payment/funnel-event', async (route) => {
            funnelEvents.push(route.request().postDataJSON());
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ success: true })
            });
        });

        await page.route('**/api/auth/register', async (route) => {
            authPayload = route.request().postDataJSON();
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    success: true,
                    user: {
                        id: 'inline-paywall-tarot-user',
                        email: 'inline-paywall-tarot@example.com',
                        role: 'user',
                        subscription_status: 'free'
                    }
                })
            });
        });

        await page.route('**/api/payment/create-checkout-session', async (route) => {
            checkoutPayload = route.request().postDataJSON();
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    id: 'cs_test_inline_paywall_tarot',
                    url: '/profil.html?payment=success&plan=pruvodce&session_id=cs_test_inline_paywall_tarot'
                })
            });
        });

        await page.goto('/tarot.html?source=e2e_inline_paywall');
        await waitForPageReady(page);
        await page.evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();
        });

        await page.evaluate(() => window.Premium.showPaywall('tarot_multi_card'));
        await expect(page.locator('.paywall-overlay')).toBeVisible();
        await expect(page.locator('.paywall-overlay')).toContainText('Cel');

        await Promise.all([
            waitForPath(page, '/prihlaseni.html'),
            page.locator('.paywall-overlay .paywall-upgrade').click(),
        ]);

        const authUrl = new URL(page.url());
        expect(authUrl.searchParams.get('mode')).toBe('register');
        expect(authUrl.searchParams.get('redirect')).toBe('/cenik.html');
        expect(authUrl.searchParams.get('plan')).toBe('pruvodce');
        expect(authUrl.searchParams.get('source')).toBe('inline_paywall');
        expect(authUrl.searchParams.get('feature')).toBe('tarot_multi_card');
        expect(authUrl.searchParams.get('entry_source')).toBe('inline_paywall');
        expect(authUrl.searchParams.get('entry_feature')).toBe('tarot_multi_card');

        await expect(page.locator('#checkout-context-banner')).toBeVisible();
        await expect(page.locator('#checkout-context-banner')).toContainText(/tarot/i);
        await expect(page.locator('#checkout-context-banner')).toContainText(/checkout/i);

        await page.locator('#email').fill('inline-paywall-tarot@example.com');
        await page.locator('#password').fill('TestPassword123!');
        await page.locator('#confirm-password-reg').fill('TestPassword123!');
        await page.locator('#gdpr-consent').check();

        await Promise.all([
            waitForPath(page, '/profil.html'),
            page.locator('#auth-submit').click(),
        ]);

        expect(authPayload).toEqual(expect.objectContaining({
            email: 'inline-paywall-tarot@example.com',
            password: 'TestPassword123!',
            password_confirm: 'TestPassword123!'
        }));
        expect(checkoutPayload).toEqual(expect.objectContaining({
            planId: 'pruvodce',
            source: 'inline_paywall',
            feature: 'tarot_multi_card',
            billingInterval: null,
            metadata: expect.objectContaining({
                entry_source: 'inline_paywall',
                entry_feature: 'tarot_multi_card'
            })
        }));
        await expect.poll(() => funnelEvents.find((event) => (
            event.eventName === 'checkout_auth_required'
            && event.source === 'inline_paywall'
            && event.feature === 'tarot_multi_card'
        )) || null).toEqual(expect.objectContaining({
            planId: 'pruvodce',
            metadata: expect.objectContaining({
                redirect: '/cenik.html',
                auth_mode: 'register',
                entry_source: 'inline_paywall',
                entry_feature: 'tarot_multi_card'
            })
        }));
        expect(await page.evaluate(() => sessionStorage.getItem('pending_plan'))).toBeNull();
    });
});
