import { test, expect } from '@playwright/test';
import { BASE_URL, MOBILE_VIEWPORT, waitForPageReady } from './helpers.js';

const DESKTOP_VIEWPORT = { width: 1280, height: 720 };

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

async function expectWithinViewport(page, locator) {
    await expect(locator).toBeVisible();
    const box = await locator.boundingBox();
    const viewport = page.viewportSize();
    expect(box).toBeTruthy();
    expect(viewport).toBeTruthy();
    expect(box.x).toBeGreaterThanOrEqual(-2);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 2);
}

async function mockSuccessfulRegister(page, email = 'activation-smoke@example.com') {
    await page.route('**/api/auth/register', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                success: true,
                user: {
                    id: `activation-smoke-${email}`,
                    email,
                    role: 'user',
                    subscription_status: 'free'
                }
            })
        });
    });
}

async function submitRegisterForm(page, email = 'activation-smoke@example.com') {
    await page.locator('#email').fill(email);
    await page.locator('#password').fill('TestPassword123!');
    await page.locator('#confirm-password-reg').fill('TestPassword123!');
    await page.locator('#gdpr-consent').check();
    await page.locator('#auth-submit').click();
}

async function mockOnboardingComplete(page) {
    await page.route('**/api/auth/onboarding/complete', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true })
        });
    });
}

async function mockLoggedInProfile(page) {
    const user = {
        id: 'activation-smoke-profile-user',
        email: 'activation-smoke-profile@example.com',
        first_name: 'Pavel',
        birth_date: '1990-08-10',
        subscription_status: 'free'
    };

    await page.context().addCookies([{
        name: 'logged_in',
        value: '1',
        url: BASE_URL
    }]);

    await page.addInitScript((authUser) => {
        localStorage.setItem('auth_user', JSON.stringify(authUser));
        localStorage.setItem('mh_zodiac', 'lev');
        localStorage.setItem('mh_signup_intent', JSON.stringify({
            source: 'life_number_result',
            feature: 'numerologie_vyklad',
            destination: '/numerologie.html?source=signup_activation&feature=numerologie_vyklad',
            createdAt: Date.now()
        }));
    }, user);

    await page.route('**/api/auth/profile', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, user })
        });
    });
    await page.route('**/api/plans', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, plans: [], featurePlanMap: {} })
        });
    });
    await page.route('**/api/user/readings', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, readings: [] })
        });
    });
    await page.route('**/api/payment/subscription/status', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ planType: 'free', status: 'active', canCancel: false })
        });
    });
}

test.describe('Activation visual smoke', () => {
    for (const { name, viewport } of VIEWPORTS) {
        test(`register intent surface stays contextual on ${name}`, async ({ page }) => {
            await preparePage(page, viewport);
            await mockSuccessfulRegister(page, `activation-${name}@example.com`);

            await page.goto('/prihlaseni.html?mode=register&redirect=/cenik.html&plan=pruvodce&source=inline_paywall&feature=tarot_multi_card');
            await waitForPageReady(page);

            const submit = page.locator('#auth-submit');
            const banner = page.locator('#checkout-context-banner');
            await expectWithinViewport(page, submit);
            await expect(banner).toBeVisible();
            await expect(submit).toContainText(/Vytvo/i);
            await expect(submit).toContainText(/pokra/i);
            await expect(banner).toContainText(/Tarot|tarot/i);
            await expect(banner).not.toContainText('tarot_multi_card');
            await expectNoHorizontalOverflow(page);

            await Promise.all([
                page.waitForURL(url => url.pathname === '/cenik.html', { timeout: 10_000, waitUntil: 'domcontentloaded' }),
                submitRegisterForm(page, `activation-${name}@example.com`),
            ]);

            const url = new URL(page.url());
            expect(url.pathname).toBe('/cenik.html');
            expect(url.searchParams.get('plan')).toBe('pruvodce');
            expect(url.searchParams.get('source')).toBe('inline_paywall');
            expect(url.searchParams.get('entry_source')).toBe('inline_paywall');
            expect(url.searchParams.get('entry_feature')).toBe('tarot_multi_card');
        });

        test(`onboarding keeps paid activation context on ${name}`, async ({ page }) => {
            await preparePage(page, viewport);
            await mockOnboardingComplete(page);

            await page.goto('/onboarding.html?source=tarot_inline_upsell&feature=tarot_multi_card&plan=pruvodce&redirect=%2Fcenik.html%3Fsource%3Donboarding_return');
            await waitForPageReady(page);

            const skipHref = await page.locator('[data-action="skipOnboarding"]').getAttribute('href');
            const skipUrl = new URL(skipHref, page.url());
            expect(skipUrl.pathname).toBe('/tarot.html');
            expect(skipUrl.searchParams.get('source')).toBe('onboarding_skip');
            expect(skipUrl.searchParams.get('entry_source')).toBe('tarot_inline_upsell');
            expect(skipUrl.searchParams.get('entry_feature')).toBe('tarot_multi_card');
            expect(skipUrl.searchParams.get('plan')).toBe('pruvodce');

            await page.locator('#step-1 [data-action="goStep"][data-step="2"]').click();
            await page.locator('.zodiac-btn[data-sign="beran"]').click();
            await page.locator('#btn-step2').click();

            const finish = page.locator('#finish-onboarding-btn');
            await expectWithinViewport(page, finish);
            await expect(finish).toContainText(/tarot/i);
            await expect(page.locator('.interest-chip[data-interest="tarot"]')).toHaveAttribute('aria-pressed', 'true');
            await expectNoHorizontalOverflow(page);

            await Promise.all([
                page.waitForURL(url => url.pathname === '/tarot.html', { timeout: 10_000, waitUntil: 'domcontentloaded' }),
                finish.click(),
            ]);

            const url = new URL(page.url());
            expect(url.pathname).toBe('/tarot.html');
            expect(url.searchParams.get('source')).toBe('onboarding_complete');
            expect(url.searchParams.get('entry_source')).toBe('tarot_inline_upsell');
            expect(url.searchParams.get('entry_feature')).toBe('tarot_multi_card');
            expect(url.searchParams.get('plan')).toBe('pruvodce');
            expect(url.searchParams.get('redirect')).toBeNull();
        });

        test(`empty profile continues original signup intent on ${name}`, async ({ page }) => {
            await preparePage(page, viewport);
            await mockLoggedInProfile(page);

            await page.goto('/profil.html');
            await waitForPageReady(page);

            await expect(page.locator('#profile-dashboard')).toBeVisible();
            await expect(page.locator('#daily-guidance-card')).toBeVisible();
            await expect(page.locator('#activation-checklist-card')).toBeVisible();

            const firstReading = page.locator('[data-activation-step="first_reading"]');
            await expectWithinViewport(page, firstReading);
            const firstReadingHref = await firstReading.getAttribute('href');
            expect(firstReadingHref).toContain('numerologie.html');
            expect(firstReadingHref).toContain('source=profile_signup_intent');
            expect(firstReadingHref).toContain('feature=numerologie_vyklad');
            expect(firstReadingHref).toContain('entry_source=life_number_result');
            expect(firstReadingHref).toContain('entry_feature=numerologie_vyklad');
            await expectNoHorizontalOverflow(page);
        });
    }
});
