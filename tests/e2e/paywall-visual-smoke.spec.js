import { test, expect } from '@playwright/test';
import { MOBILE_VIEWPORT, waitForPageReady } from './helpers.js';

const DESKTOP_VIEWPORT = { width: 1280, height: 720 };
const REASSURANCE_FRAGMENTS = ['Cena se zobraz', 'Stripe', 'Zru'];
const MISLEADING_COPY = /7\s*dn[ií]\s*zdarma|trial|zku[sš]ebn[ií]\s*obdob[ií]/i;

const VIEWPORTS = [
    { name: 'desktop', viewport: DESKTOP_VIEWPORT },
    { name: 'mobile', viewport: MOBILE_VIEWPORT },
];

async function preparePage(page, viewport) {
    await page.setViewportSize(viewport);
    await page.addInitScript(() => {
        localStorage.setItem('mh_cookie_prefs', JSON.stringify({
            analytics: false,
            marketing: false,
            ts: Date.now()
        }));
        localStorage.removeItem('cookieConsent');
    });
}

async function expectNoHorizontalOverflow(page) {
    const overflow = await page.evaluate(() => (
        document.documentElement.scrollWidth - document.documentElement.clientWidth
    ));
    expect(overflow).toBeLessThanOrEqual(2);
}

async function expectPaywallSurface(page, {
    surface,
    cta,
    reassurance,
    forbiddenCopy = MISLEADING_COPY
}) {
    const paywall = page.locator(surface).first();
    await expect(paywall).toBeVisible({ timeout: 10_000 });
    await paywall.scrollIntoViewIfNeeded();

    const ctaLocator = paywall.locator(cta).first();
    await expect(ctaLocator).toBeVisible();

    const text = await paywall.innerText();
    for (const fragment of REASSURANCE_FRAGMENTS) {
        expect(text).toContain(fragment);
    }
    const reassuranceLocator = reassurance === surface ? paywall : paywall.locator(reassurance).first();
    await expect(reassuranceLocator).toBeVisible();
    expect(text).not.toMatch(forbiddenCopy);

    const box = await paywall.boundingBox();
    const viewport = page.viewportSize();
    expect(box, `${surface} should have layout box`).toBeTruthy();
    expect(box.x).toBeGreaterThanOrEqual(-2);
    expect(box.x + box.width).toBeLessThanOrEqual((viewport?.width || 0) + 2);
    expect(box.width).toBeGreaterThan(120);
    expect(box.height).toBeGreaterThan(40);
    await expectNoHorizontalOverflow(page);
}

async function showTarotPaywall(page) {
    await page.goto('/tarot.html?card=Hvezda&source=paywall_smoke&utm_source=e2e');
    await waitForPageReady(page);
    await page.evaluate(() => {
        localStorage.removeItem('tarot_free_usage');
        window.Auth = {
            isLoggedIn: () => true,
            isPremium: () => false,
            showToast: () => {},
            saveReading: async () => ({ id: 'smoke-tarot-reading' })
        };
        window.getCSRFToken = async () => 'smoke-csrf-token';
        window.MH_ANALYTICS = {
            trackAction: () => {},
            trackCTA: () => {}
        };
    });
    await page.route('**/api/payment/funnel-event', route => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
    }));
    await page.locator('[data-spread-type]').nth(1).click();
}

async function showRunesPaywall(page) {
    await page.goto('/runy.html?source=paywall_smoke&utm_source=e2e');
    await waitForPageReady(page);
    await page.evaluate(() => {
        localStorage.removeItem('runeDaily');
        window.Auth = {
            isLoggedIn: () => false,
            isPremium: () => false,
            showToast: () => {},
            startPlanCheckout: () => {}
        };
        window.MH_ANALYTICS = {
            trackAction: () => {},
            trackCTA: () => {}
        };
    });
    await page.route('**/api/runes', route => route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ success: false })
    }));
    await page.locator('#btn-draw').click();
    await expect(page.locator('#rune-result')).toHaveClass(/visible/, { timeout: 4_000 });
    await page.locator('#rune-intention').fill('chci jasnejsi dalsi krok');
    await page.locator('#btn-deep-reading').click();
}

async function showNatalPaywall(page) {
    await page.goto('/natalni-karta.html?source=paywall_smoke&utm_source=e2e');
    await waitForPageReady(page);
    await page.evaluate(() => {
        window.Auth = {
            isLoggedIn: () => true,
            isPremium: () => true,
            saveReading: async () => ({ id: 'smoke-natal-reading' })
        };
        window.callAPI = async () => ({
            success: true,
            isTeaser: true,
            response: 'DATA: Slunce=Kozoroh, Mesic=Rak, Ascendent=Lev\n\nUkazkovy vyklad.'
        });
    });
    await page.locator('#name').fill('Test');
    await page.locator('#birth-date').fill('1990-01-01');
    await page.locator('#birth-time').fill('12:00');
    await page.locator('#birth-place').fill('Praha');
    await page.locator('#natal-form button[type="submit"]').click();
}

async function showMentorPaywall(page) {
    await page.goto('/mentor.html?source=paywall_smoke&utm_source=e2e');
    await waitForPageReady(page);
    await page.evaluate(() => {
        const todayKey = `mh_daily_mentor_${new Date().toDateString()}`;
        localStorage.setItem(todayKey, '3');
        window.Auth = {
            isLoggedIn: () => true,
            isPremium: () => false,
            showToast: () => {},
            startPlanCheckout: () => {},
            getProfile: async () => ({ subscription_status: 'free' })
        };
        window.isPremium = false;
        window.getCSRFToken = async () => 'smoke-csrf-token';
        window.MH_ANALYTICS = {
            trackAction: () => {},
            trackCTA: () => {}
        };
    });
    await page.locator('#chat-input').fill('Co mam dnes udelat jako dalsi krok?');
    await page.locator('#send-btn').click();
}

test.describe('Custom paywall visual smoke', () => {
    for (const { name, viewport } of VIEWPORTS) {
        test(`tarot paywall keeps CTA and reassurance stable on ${name}`, async ({ page }) => {
            await preparePage(page, viewport);
            await showTarotPaywall(page);
            await expectPaywallSurface(page, {
                surface: '.tarot-soft-gate',
                cta: '.tarot-upgrade-btn',
                reassurance: '.tarot-soft-gate'
            });
        });

        test(`runes paywall keeps CTA and reassurance stable on ${name}`, async ({ page }) => {
            await preparePage(page, viewport);
            await showRunesPaywall(page);
            await expectPaywallSurface(page, {
                surface: '.runes-upgrade-preview',
                cta: '.runes-upgrade-preview__cta',
                reassurance: '.runes-upgrade-preview__reassurance'
            });
        });

        test(`natal paywall keeps CTA and reassurance stable on ${name}`, async ({ page }) => {
            await preparePage(page, viewport);
            await showNatalPaywall(page);
            await expectPaywallSurface(page, {
                surface: '.teaser-overlay',
                cta: '.natal-teaser-upgrade-btn',
                reassurance: '.natal-teaser-reassurance'
            });
        });

        test(`mentor paywall keeps CTA and reassurance stable on ${name}`, async ({ page }) => {
            await preparePage(page, viewport);
            await showMentorPaywall(page);
            await expectPaywallSurface(page, {
                surface: '.premium-lock-overlay',
                cta: '.mentor-upgrade-btn',
                reassurance: '.mentor-paywall__reassurance'
            });
        });
    }
});
