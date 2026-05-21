import { test, expect } from '@playwright/test';
import { waitForPageReady } from './helpers.js';

async function disableAuthClient(page) {
    await page.route('**/js/dist/auth-client.js*', route => route.fulfill({
        status: 200,
        contentType: 'application/javascript',
        body: 'window.__AUTH_CLIENT_DISABLED_FOR_TEST__ = true;'
    }));
}

async function expectUrlParams(page, pathname, params) {
    await page.waitForURL((url) => (
        url.pathname === pathname
        && Object.entries(params).every(([key, value]) => url.searchParams.get(key) === value)
    ));

    const url = new URL(page.url());
    expect(url.pathname).toBe(pathname);
    for (const [key, value] of Object.entries(params)) {
        expect(url.searchParams.get(key)).toBe(value);
    }
}

test.describe('Checkout fallbacks without Auth client', () => {
    test('pricing paid plan redirects to standalone auth with checkout context', async ({ page }) => {
        await disableAuthClient(page);
        await page.goto('/cenik.html');
        await waitForPageReady(page);

        const checkoutButton = page.locator('.plan-checkout-btn[data-plan="pruvodce"]').first();
        await expect(checkoutButton).toBeVisible();
        await checkoutButton.click();

        await expectUrlParams(page, '/prihlaseni.html', {
            mode: 'register',
            redirect: '/cenik.html',
            plan: 'pruvodce',
            source: 'pricing_page',
            feature: 'premium_membership',
            entry_source: 'pricing_page',
            entry_feature: 'premium_membership'
        });
    });

    test('horoscope weekly upsell redirects to tracked pricing link', async ({ page }) => {
        await disableAuthClient(page);
        await page.goto('/horoskopy.html');
        await waitForPageReady(page);

        await page.locator('.tab[data-tab="weekly"]').click();
        const upsellButton = page.locator('.horoscope-upsell-btn');
        await expect(upsellButton).toBeVisible();
        await upsellButton.click();

        await expectUrlParams(page, '/cenik.html', {
            plan: 'pruvodce',
            source: 'horoscope_inline_upsell',
            feature: 'weekly_horoscope',
            entry_source: 'horoscope_inline_upsell',
            entry_feature: 'weekly_horoscope'
        });
    });

    test('astro map auth gate redirects to Osviceni pricing context', async ({ page }) => {
        await disableAuthClient(page);
        await page.goto('/astro-mapa.html');
        await waitForPageReady(page);

        await page.fill('#astro-date', '1990-01-01');
        await page.fill('#astro-time', '12:00');
        await page.fill('#astro-place', 'Praha');
        await page.locator('#astro-form button[type="submit"]').click();

        await expectUrlParams(page, '/cenik.html', {
            plan: 'osviceni',
            source: 'astro_map_auth_gate',
            feature: 'astrocartography',
            entry_source: 'astro_map_auth_gate',
            entry_feature: 'astrocartography'
        });
    });
});
