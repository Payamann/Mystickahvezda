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
    checkoutSessionId,
    csrfToken
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
            body: JSON.stringify({ csrfToken })
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

async function expectAuthUrl(page, { source, feature }) {
    const authUrl = new URL(page.url());
    expect(authUrl.searchParams.get('mode')).toBe('register');
    expect(authUrl.searchParams.get('redirect')).toBe('/cenik.html');
    expect(authUrl.searchParams.get('plan')).toBe('pruvodce');
    expect(authUrl.searchParams.get('source')).toBe(source);
    expect(authUrl.searchParams.get('feature')).toBe(feature);
    expect(authUrl.searchParams.get('entry_source')).toBe(source);
    expect(authUrl.searchParams.get('entry_feature')).toBe(feature);
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

function expectCheckoutState(state, {
    email,
    source,
    feature
}) {
    expect(state.authPayload).toEqual(expect.objectContaining({
        email,
        password: 'TestPassword123!',
        password_confirm: 'TestPassword123!'
    }));
    expect(state.checkoutPayload).toEqual(expect.objectContaining({
        planId: 'pruvodce',
        source,
        feature,
        billingInterval: null,
        metadata: expect.objectContaining({
            entry_source: source,
            entry_feature: feature
        })
    }));
    expect(state.funnelEvents.find((event) => (
        event.eventName === 'checkout_auth_required'
        && event.source === source
        && event.feature === feature
    )) || null).toEqual(expect.objectContaining({
        planId: 'pruvodce',
        metadata: expect.objectContaining({
            redirect: '/cenik.html',
            auth_mode: 'register',
            entry_source: source,
            entry_feature: feature
        })
    }));
}

function expectDirectCheckoutState(state, {
    source,
    feature
}) {
    expect(state.authPayload).toBeNull();
    expect(state.checkoutPayload).toEqual(expect.objectContaining({
        planId: 'pruvodce',
        source,
        feature,
        billingInterval: null,
        metadata: expect.objectContaining({
            entry_source: source,
            entry_feature: feature
        })
    }));
}

test.describe('Inline paywall checkout handoff', () => {
    test('tarot multi-card inline paywall preserves checkout context through registration', async ({ page }) => {
        const state = await setupCheckoutRoutes(page, {
            userId: 'inline-paywall-tarot-user',
            email: 'inline-paywall-tarot@example.com',
            checkoutSessionId: 'cs_test_inline_paywall_tarot',
            csrfToken: 'e2e-inline-paywall-token'
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

        await expectAuthUrl(page, {
            source: 'inline_paywall',
            feature: 'tarot_multi_card'
        });

        await expect(page.locator('#checkout-context-banner')).toBeVisible();
        await expect(page.locator('#checkout-context-banner')).toContainText(/tarot/i);
        await expect(page.locator('#checkout-context-banner')).toContainText(/checkout/i);

        await submitRegistration(page, 'inline-paywall-tarot@example.com');

        expectCheckoutState(state, {
            email: 'inline-paywall-tarot@example.com',
            source: 'inline_paywall',
            feature: 'tarot_multi_card'
        });
        expect(await page.evaluate(() => sessionStorage.getItem('pending_plan'))).toBeNull();
    });

    test('numerology trial paywall preserves checkout context through registration', async ({ page }) => {
        const state = await setupCheckoutRoutes(page, {
            userId: 'trial-paywall-numerology-user',
            email: 'trial-paywall-numerology@example.com',
            checkoutSessionId: 'cs_test_trial_paywall_numerology',
            csrfToken: 'e2e-trial-paywall-token'
        });

        await page.goto('/numerologie.html?source=e2e_trial_paywall');
        await waitForPageReady(page);
        await page.evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();
        });

        await page.evaluate(() => window.Premium.showTrialPaywall('numerologie_vyklad'));
        await expect(page.locator('.paywall-overlay')).toBeVisible();
        await expect(page.locator('.paywall-overlay')).toContainText(/numerolog/i);

        await Promise.all([
            waitForPath(page, '/prihlaseni.html'),
            page.locator('.paywall-overlay .paywall-upgrade').click(),
        ]);

        await expectAuthUrl(page, {
            source: 'trial_paywall',
            feature: 'numerologie_vyklad'
        });

        await expect(page.locator('#checkout-context-banner')).toBeVisible();
        await expect(page.locator('#checkout-context-banner')).toContainText(/numerolog/i);
        await expect(page.locator('#checkout-context-banner')).toContainText(/checkout/i);

        await submitRegistration(page, 'trial-paywall-numerology@example.com');

        expectCheckoutState(state, {
            email: 'trial-paywall-numerology@example.com',
            source: 'trial_paywall',
            feature: 'numerologie_vyklad'
        });
        expect(await page.evaluate(() => sessionStorage.getItem('pending_plan'))).toBeNull();
    });

    test('natal teaser gate preserves checkout context through registration', async ({ page }) => {
        const state = await setupCheckoutRoutes(page, {
            userId: 'natal-teaser-user',
            email: 'natal-teaser@example.com',
            checkoutSessionId: 'cs_test_natal_teaser',
            csrfToken: 'e2e-natal-teaser-token'
        });

        await page.goto('/natalni-karta.html?source=e2e_natal_teaser');
        await waitForPageReady(page);
        await expect.poll(() => page.evaluate(() => typeof window.Auth?.startPlanCheckout)).toBe('function');
        await page.evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();
            Object.assign(window.Auth, {
                isLoggedIn: () => true,
                isPremium: () => true,
                saveReading: async () => ({ id: 'natal-teaser-reading' }),
                showToast: () => {}
            });
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

        const teaser = page.locator('.teaser-overlay');
        await expect(teaser).toBeVisible();
        await expect(teaser).toContainText(/nat/i);

        await page.evaluate(() => {
            window.Auth.isLoggedIn = () => false;
            window.Auth.isPremium = () => false;
        });

        await Promise.all([
            waitForPath(page, '/prihlaseni.html'),
            teaser.locator('.natal-teaser-upgrade-btn').click(),
        ]);

        await expectAuthUrl(page, {
            source: 'natal_teaser_gate',
            feature: 'natalni_interpretace'
        });

        await expect(page.locator('#checkout-context-banner')).toBeVisible();
        await expect(page.locator('#checkout-context-banner')).toContainText(/nat/i);
        await expect(page.locator('#checkout-context-banner')).toContainText(/checkout/i);

        await submitRegistration(page, 'natal-teaser@example.com');

        expectCheckoutState(state, {
            email: 'natal-teaser@example.com',
            source: 'natal_teaser_gate',
            feature: 'natalni_interpretace'
        });
        expect(await page.evaluate(() => sessionStorage.getItem('pending_plan'))).toBeNull();
    });

    test('partner match result bridge preserves checkout context through registration', async ({ page }) => {
        const state = await setupCheckoutRoutes(page, {
            userId: 'partner-match-user',
            email: 'partner-match@example.com',
            checkoutSessionId: 'cs_test_partner_match',
            csrfToken: 'e2e-partner-match-token'
        });

        await page.goto('/partnerska-shoda.html?source=e2e_partner_match');
        await waitForPageReady(page);
        await expect.poll(() => page.evaluate(() => typeof window.Auth?.startPlanCheckout)).toBe('function');
        await page.evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();
            Object.assign(window.Auth, {
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
                        version: 'e2e'
                    }
                }
            });
        });

        await page.locator('#p1-name').fill('Anna');
        await page.locator('#p1-date').fill('1990-01-01');
        await page.locator('#p2-name').fill('Pavel');
        await page.locator('#p2-date').fill('1992-07-15');
        await page.locator('#synastry-form button[type="submit"]').click();

        await expect(page.locator('#synastry-next-step')).toBeVisible();
        const premiumBridge = page.locator('[data-synastry-upgrade]').first();
        await expect(premiumBridge).toBeVisible();
        await expect(premiumBridge).toHaveAttribute('href', /source=partner_match_result/);

        await Promise.all([
            waitForPath(page, '/prihlaseni.html'),
            premiumBridge.click(),
        ]);

        await expectAuthUrl(page, {
            source: 'partner_match_result',
            feature: 'partnerska_detail'
        });

        await expect(page.locator('#checkout-context-banner')).toBeVisible();
        await expect(page.locator('#checkout-context-banner')).toContainText(/vztah|partner/i);
        await expect(page.locator('#checkout-context-banner')).toContainText(/checkout/i);

        await submitRegistration(page, 'partner-match@example.com');

        expectCheckoutState(state, {
            email: 'partner-match@example.com',
            source: 'partner_match_result',
            feature: 'partnerska_detail'
        });
        expect(await page.evaluate(() => sessionStorage.getItem('pending_plan'))).toBeNull();
    });

    test('runes deep-reading gate preserves checkout context through registration', async ({ page }) => {
        const state = await setupCheckoutRoutes(page, {
            userId: 'runes-deep-user',
            email: 'runes-deep@example.com',
            checkoutSessionId: 'cs_test_runes_deep',
            csrfToken: 'e2e-runes-deep-token'
        });

        await page.goto('/runy.html?source=e2e_runes_deep');
        await waitForPageReady(page);
        await expect.poll(() => page.evaluate(() => typeof window.Auth?.startPlanCheckout)).toBe('function');
        await page.evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();
            Object.assign(window.Auth, {
                isLoggedIn: () => false,
                isPremium: () => false,
                showToast: () => {}
            });
            window.MH_ANALYTICS = {
                trackAction: () => {},
                trackCTA: () => {}
            };
        });

        await page.locator('#btn-draw').click();
        await expect(page.locator('#rune-result')).toHaveClass(/visible/, { timeout: 4000 });
        await page.locator('#rune-intention').fill('potrebuji jasny dalsi krok');
        await page.locator('#btn-deep-reading').click();

        await expect(page.locator('.runes-upgrade-preview')).toBeVisible();
        await expect(page.locator('.runes-upgrade-preview')).toContainText(/v[yý]klad|runa/i);

        await Promise.all([
            waitForPath(page, '/prihlaseni.html'),
            page.locator('.runes-upgrade-preview__cta').click(),
        ]);

        await expectAuthUrl(page, {
            source: 'runes_auth_gate',
            feature: 'runy_hluboky_vyklad'
        });

        await expect(page.locator('#checkout-context-banner')).toBeVisible();
        await expect(page.locator('#checkout-context-banner')).toContainText(/run|šamansk|samansk/i);
        await expect(page.locator('#checkout-context-banner')).toContainText(/checkout/i);

        await submitRegistration(page, 'runes-deep@example.com');

        expectCheckoutState(state, {
            email: 'runes-deep@example.com',
            source: 'runes_auth_gate',
            feature: 'runy_hluboky_vyklad'
        });
        expect(await page.evaluate(() => sessionStorage.getItem('pending_plan'))).toBeNull();
    });

    test('mentor teaser gate starts checkout with entry context for logged-in free user', async ({ page }) => {
        const state = await setupCheckoutRoutes(page, {
            userId: 'mentor-teaser-user',
            email: 'mentor-teaser@example.com',
            checkoutSessionId: 'cs_test_mentor_teaser',
            csrfToken: 'e2e-mentor-teaser-token'
        });

        await page.goto('/mentor.html?source=e2e_mentor_teaser');
        await waitForPageReady(page);
        await expect.poll(() => page.evaluate(() => typeof window.Auth?.startPlanCheckout)).toBe('function');
        await page.evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();
            const todayKey = `mh_daily_mentor_${new Date().toDateString()}`;
            localStorage.setItem(todayKey, '3');
            Object.assign(window.Auth, {
                isLoggedIn: () => true,
                isPremium: () => false,
                getProfile: async () => ({ subscription_status: 'free' }),
                showToast: () => {}
            });
            window.isPremium = false;
            window.MH_ANALYTICS = {
                trackAction: () => {},
                trackCTA: () => {},
                trackCheckoutStarted: () => {}
            };
        });

        await page.locator('#chat-input').fill('Co mam dnes udelat jako dalsi krok?');
        await page.locator('#send-btn').click();

        const mentorGate = page.locator('.premium-lock-overlay');
        await expect(mentorGate).toBeVisible({ timeout: 5000 });
        await expect(mentorGate).toContainText(/krok|odpov/i);

        await Promise.all([
            waitForPath(page, '/profil.html'),
            mentorGate.locator('.mentor-upgrade-btn').click(),
        ]);

        expectDirectCheckoutState(state, {
            source: 'mentor_teaser_gate',
            feature: 'mentor'
        });
    });

    test('angel cards premium gate starts checkout with entry context for logged-in free user', async ({ page }) => {
        const state = await setupCheckoutRoutes(page, {
            userId: 'angel-card-user',
            email: 'angel-card@example.com',
            checkoutSessionId: 'cs_test_angel_card',
            csrfToken: 'e2e-angel-card-token'
        });

        await page.goto('/andelske-karty.html?source=e2e_angel_card');
        await waitForPageReady(page);
        await expect.poll(() => page.evaluate(() => typeof window.Auth?.startPlanCheckout)).toBe('function');
        await page.evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();
            Object.assign(window.Auth, {
                isLoggedIn: () => true,
                isPremium: () => false,
                showToast: () => {}
            });
            window.MH_ANALYTICS = {
                trackAction: () => {},
                trackCTA: () => {},
                trackCheckoutStarted: () => {}
            };
        });

        await page.locator('#draw-btn').click();
        await expect(page.locator('#btn-deep-angel')).toBeVisible({ timeout: 3000 });

        await Promise.all([
            waitForPath(page, '/profil.html'),
            page.locator('#btn-deep-angel').click(),
        ]);

        expectDirectCheckoutState(state, {
            source: 'angel_card_premium_gate',
            feature: 'andelske_karty_hluboky_vhled'
        });
    });
});
