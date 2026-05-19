import { test, expect } from '@playwright/test';
import { MOBILE_VIEWPORT, waitForPageReady } from './helpers.js';

const DESKTOP_VIEWPORT = { width: 1280, height: 720 };
const MISLEADING_TRIAL_COPY = /7\s*dn[i\u00ed]\s*zdarma|trial|zku[s\u0161]ebn[i\u00ed]\s*obdob[i\u00ed]/i;

const VIEWPORTS = [
    { name: 'desktop', viewport: DESKTOP_VIEWPORT },
    { name: 'mobile', viewport: MOBILE_VIEWPORT },
];

async function preparePricingPage(page, viewport, query = '') {
    await page.setViewportSize(viewport);
    await page.addInitScript(() => {
        localStorage.setItem('mh_cookie_prefs', JSON.stringify({
            analytics: false,
            marketing: false,
            ts: Date.now()
        }));
        localStorage.removeItem('cookieConsent');
    });
    await page.goto(`/cenik.html${query}`);
    await waitForPageReady(page);
}

async function preparePricingPageWithCookieBanner(page, viewport) {
    await page.setViewportSize(viewport);
    await page.addInitScript(() => {
        localStorage.removeItem('mh_cookie_prefs');
        localStorage.removeItem('cookieConsent');
    });
    await page.goto('/cenik.html');
    await waitForPageReady(page);
}

async function mockFunnelTracking(page) {
    await page.route('**/api/csrf-token', route => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ csrfToken: 'pricing-smoke-token' })
    }));
    await page.route('**/api/payment/funnel-event', route => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
    }));
}

async function expectNoHorizontalOverflow(page) {
    const overflow = await page.evaluate(() => (
        document.documentElement.scrollWidth - document.documentElement.clientWidth
    ));
    expect(overflow).toBeLessThanOrEqual(2);
}

async function expectWithinViewport(page, locator) {
    await expect(locator).toBeVisible();
    const box = await locator.boundingBox();
    const viewport = page.viewportSize();
    expect(box).toBeTruthy();
    expect(viewport).toBeTruthy();
    expect(box.x).toBeGreaterThanOrEqual(-2);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 2);
}

function expectQuery(href, expected) {
    expect(href).toBeTruthy();
    const url = new URL(href, 'https://www.mystickahvezda.cz/');
    for (const [key, value] of Object.entries(expected)) {
        expect(url.searchParams.get(key)).toBe(value);
    }
    return url;
}

async function expectNoMisleadingTrialCopy(page) {
    const text = await page.locator('body').innerText();
    expect(text).not.toMatch(MISLEADING_TRIAL_COPY);
}

async function getCookieOverlapMetrics(page, selectors) {
    return page.evaluate((targetSelectors) => {
        const cookie = document.getElementById('cookie-banner')?.getBoundingClientRect();
        const viewportWidth = document.documentElement.clientWidth;
        const overlaps = targetSelectors
            .map((selector) => {
                const element = document.querySelector(selector);
                const rect = element?.getBoundingClientRect();
                const visible = !!rect && rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < window.innerHeight;
                const overlap = !!(cookie && rect && visible && !(
                    rect.right <= cookie.left
                    || rect.left >= cookie.right
                    || rect.bottom <= cookie.top
                    || rect.top >= cookie.bottom
                ));
                return {
                    selector,
                    visible,
                    overlap,
                    top: Math.round(rect?.top || 0),
                    bottom: Math.round(rect?.bottom || 0)
                };
            });

        return {
            cookieHeight: cookie?.height || 0,
            cookieWidth: cookie?.width || 0,
            overflow: document.documentElement.scrollWidth - viewportWidth,
            overlaps
        };
    }, selectors);
}

test.describe('Pricing visual smoke', () => {
    for (const { name, viewport } of VIEWPORTS) {
        test(`pricing CTAs keep billing and signup context on ${name}`, async ({ page }) => {
            await mockFunnelTracking(page);
            await preparePricingPage(page, viewport);

            const monthlyToggle = page.locator('#toggle-monthly');
            const yearlyToggle = page.locator('#toggle-yearly');
            await expectWithinViewport(page, monthlyToggle);
            await expectWithinViewport(page, yearlyToggle);
            await expect(monthlyToggle).toHaveAttribute('aria-pressed', 'true');
            await expect(yearlyToggle).toHaveAttribute('aria-pressed', 'false');

            expectQuery(await page.locator('[data-pricing-free-cta]').getAttribute('href'), {
                mode: 'register',
                redirect: '/horoskopy.html',
                source: 'pricing_free_cta',
                feature: 'daily_guidance'
            });

            const guideCta = page.locator('.plan-checkout-btn[data-plan="pruvodce"]');
            await guideCta.scrollIntoViewIfNeeded();
            await expectWithinViewport(page, guideCta);
            expectQuery(await guideCta.getAttribute('href'), {
                mode: 'register',
                redirect: '/cenik.html',
                plan: 'pruvodce',
                source: 'pricing_page',
                feature: 'premium_membership'
            });

            await yearlyToggle.click();
            await expect(yearlyToggle).toHaveAttribute('aria-pressed', 'true');
            await expect(page.locator('.plan-checkout-btn[data-plan="pruvodce-rocne"]')).toBeVisible();

            await monthlyToggle.click();
            await expect(monthlyToggle).toHaveAttribute('aria-pressed', 'true');
            await expect(page.locator('.plan-checkout-btn[data-plan="pruvodce"]')).toBeVisible();

            await Promise.all([
                page.waitForURL(url => url.pathname === '/prihlaseni.html', { timeout: 10_000, waitUntil: 'domcontentloaded' }),
                page.locator('.plan-checkout-btn[data-plan="pruvodce"]').click(),
            ]);

            const authUrl = new URL(page.url());
            expect(authUrl.searchParams.get('mode')).toBe('register');
            expect(authUrl.searchParams.get('redirect')).toBe('/cenik.html');
            expect(authUrl.searchParams.get('plan')).toBe('pruvodce');
            expect(authUrl.searchParams.get('source')).toBe('pricing_page');

            await preparePricingPage(page, viewport, '?source=inline_paywall&feature=numerologie_vyklad&plan=pruvodce');
            const recommendation = page.locator('#pricing-plan-recommendation');
            await expect(recommendation).toBeVisible();
            await expect(recommendation.locator('[data-recommended-plan="pruvodce"]')).toBeVisible();

            const previewHref = await recommendation.locator('[data-preview-destination]').getAttribute('href');
            expect(previewHref).toContain('/numerologie.html');
            expect(previewHref).toContain('source=pricing_recommendation_preview');
            expect(previewHref).toContain('entry_source=inline_paywall');
            expect(previewHref).toContain('entry_feature=numerologie_vyklad');

            await expectNoMisleadingTrialCopy(page);
            await expectNoHorizontalOverflow(page);
        });
    }

    test('desktop cookie banner stays compact and does not cover plan CTAs', async ({ page }) => {
        await preparePricingPageWithCookieBanner(page, DESKTOP_VIEWPORT);

        const banner = page.locator('#cookie-banner');
        await expect(banner).toBeVisible({ timeout: 4_000 });
        await page.locator('.pricing-grid').scrollIntoViewIfNeeded();

        const metrics = await getCookieOverlapMetrics(page, [
            '.plan-checkout-btn[data-plan="pruvodce"]',
            '.plan-checkout-btn[data-plan="osviceni"]'
        ]);

        expect(metrics.cookieHeight).toBeLessThanOrEqual(72);
        expect(metrics.overflow).toBeLessThanOrEqual(2);
        for (const item of metrics.overlaps) {
            expect(item.visible, `${item.selector} should be visible`).toBe(true);
            expect(item.overlap, `${item.selector} should not overlap cookie banner`).toBe(false);
        }
    });

    test('mobile cookie banner stays compact around billing and visible CTAs', async ({ page }) => {
        await preparePricingPageWithCookieBanner(page, MOBILE_VIEWPORT);

        const banner = page.locator('#cookie-banner');
        await expect(banner).toBeVisible({ timeout: 4_000 });

        const toggleMetrics = await getCookieOverlapMetrics(page, [
            '#toggle-monthly',
            '#toggle-yearly'
        ]);

        expect(toggleMetrics.cookieHeight).toBeLessThan(190);
        expect(toggleMetrics.cookieWidth).toBeLessThanOrEqual(MOBILE_VIEWPORT.width);
        expect(toggleMetrics.overflow).toBeLessThanOrEqual(2);
        for (const item of toggleMetrics.overlaps) {
            expect(item.visible, `${item.selector} should be visible`).toBe(true);
            expect(item.overlap, `${item.selector} should not overlap cookie banner`).toBe(false);
        }

        await page.locator('.plan-checkout-btn[data-plan="pruvodce"]').scrollIntoViewIfNeeded();
        const ctaMetrics = await getCookieOverlapMetrics(page, [
            '.plan-checkout-btn[data-plan="pruvodce"]'
        ]);
        expect(ctaMetrics.cookieHeight).toBeLessThan(190);
        expect(ctaMetrics.overflow).toBeLessThanOrEqual(2);
        expect(ctaMetrics.overlaps[0].visible).toBe(true);
        expect(ctaMetrics.overlaps[0].overlap).toBe(false);
    });
});
