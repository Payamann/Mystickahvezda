import { test, expect } from '@playwright/test';
import { MOBILE_VIEWPORT, waitForPageReady } from './helpers.js';

const DESKTOP_VIEWPORT = { width: 1280, height: 720 };

const VIEWPORTS = [
    { name: 'desktop', viewport: DESKTOP_VIEWPORT, mobile: false },
    { name: 'mobile', viewport: MOBILE_VIEWPORT, mobile: true },
];

async function prepareHomepage(page, viewport) {
    await page.setViewportSize(viewport);
    await page.addInitScript(() => {
        localStorage.setItem('mh_cookie_prefs', JSON.stringify({
            analytics: false,
            marketing: false,
            ts: Date.now()
        }));
        localStorage.removeItem('cookieConsent');
    });
    await page.goto('/');
    await waitForPageReady(page);
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

test.describe('Homepage CTA smoke', () => {
    for (const { name, viewport, mobile } of VIEWPORTS) {
        test(`entry CTAs keep measurable signup context on ${name}`, async ({ page }) => {
            await prepareHomepage(page, viewport);

            const heroCta = page.locator('#hero-cta-btn');
            await expectWithinViewport(page, heroCta);
            expectQuery(await heroCta.getAttribute('href'), {
                mode: 'register',
                source: 'homepage_hero',
                feature: 'daily_guidance'
            });

            if (mobile) {
                const navToggle = page.locator('.nav__toggle');
                await expectWithinViewport(page, navToggle);
                await expect.poll(() => navToggle.getAttribute('data-nav-initialized')).toBe('true');
                await navToggle.click();

                const mobileRegister = page.locator('#mobile-auth-register-btn');
                await expectWithinViewport(page, mobileRegister);
                expectQuery(await mobileRegister.getAttribute('href'), {
                    mode: 'register',
                    source: 'mobile_menu',
                    feature: 'account'
                });

                const mobileLogin = page.locator('#mobile-auth-btn');
                await expectWithinViewport(page, mobileLogin);
                expectQuery(await mobileLogin.getAttribute('href'), {
                    source: 'mobile_menu_login'
                });
            } else {
                const headerRegister = page.locator('#auth-register-btn');
                await expectWithinViewport(page, headerRegister);
                expectQuery(await headerRegister.getAttribute('href'), {
                    mode: 'register',
                    source: 'header_register',
                    feature: 'account'
                });

                const headerLogin = page.locator('#auth-btn');
                await expectWithinViewport(page, headerLogin);
                expectQuery(await headerLogin.getAttribute('href'), {
                    source: 'header_login'
                });
            }

            await expectNoHorizontalOverflow(page);
        });

        test(`daily card and pricing CTAs keep funnel destinations on ${name}`, async ({ page }) => {
            await prepareHomepage(page, viewport);

            const dailyCardJump = page.locator('#hero-daily-card-link');
            await expectWithinViewport(page, dailyCardJump);
            await expect(dailyCardJump).toHaveAttribute('href', '#sluzby');

            await page.locator('#karta-dne-widget').scrollIntoViewIfNeeded();
            const dailyDetail = page.locator('#kdd-lexicon-link');
            const dailyDeep = page.locator('#kdd-full-reading-link');
            expectQuery(await dailyDetail.getAttribute('href'), {
                source: 'homepage_daily_card_detail',
                feature: 'daily_angel_card'
            });
            expectQuery(await dailyDeep.getAttribute('href'), {
                source: 'homepage_daily_card_full_reading',
                feature: 'andelske_karty_hluboky_vhled'
            });

            const freePlan = page.locator('[data-plan="poutnik"]');
            const paidPlan = page.locator('[data-plan="pruvodce"]');
            const fullPricing = page.locator('a[href*="homepage_pricing_full_compare"]').first();
            const bottomCta = page.locator('#cta-banner-btn');

            await expect(freePlan).toBeAttached();
            expectQuery(await freePlan.getAttribute('href'), {
                mode: 'register',
                redirect: '/horoskopy.html',
                source: 'homepage_pricing_free_cta',
                feature: 'daily_guidance'
            });

            await expect(paidPlan).toBeAttached();
            expectQuery(await paidPlan.getAttribute('href'), {
                mode: 'register',
                redirect: '/cenik.html',
                plan: 'pruvodce',
                source: 'homepage_pricing_preview',
                feature: 'premium_membership'
            });

            await expect(fullPricing).toHaveAttribute('href', /cenik\.html\?source=homepage_pricing_full_compare/);
            expectQuery(await bottomCta.getAttribute('href'), {
                mode: 'register',
                source: 'homepage_bottom_cta',
                feature: 'daily_guidance'
            });

            await expectNoHorizontalOverflow(page);
        });
    }
});
