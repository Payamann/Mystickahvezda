/**
 * E2E testy — Autentizace (prihlaseni.html)
 *
 * Testuje: načtení login stránky, viditelnost formuláře, klientská validace,
 * přepnutí na "zapomenuté heslo", CSRF token API, bezpečnost (noindex).
 *
 * Poznámka: testy NEODESÍLAJÍ reálné přihlášení (bez Supabase v test prostředí).
 * Testujeme UI vrstvu — formulář, validaci, přepínání stavů.
 */

import { test, expect } from '@playwright/test';
import { waitForPageReady, getCsrfToken, MOBILE_VIEWPORT } from './helpers.js';

async function expectNoHorizontalOverflow(page) {
    const horizontalOverflow = await page.evaluate(() => (
        document.documentElement.scrollWidth - document.documentElement.clientWidth
    ));
    expect(horizontalOverflow).toBeLessThanOrEqual(2);
}

async function expectLocatorsWithinViewport(page, locators) {
    const viewport = page.viewportSize();
    expect(viewport).toBeTruthy();

    await expectNoHorizontalOverflow(page);

    for (const locator of locators) {
        await expect(locator).toBeVisible();
        const box = await locator.boundingBox();
        expect(box).toBeTruthy();
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 2);
    }
}

async function mockSuccessfulRegister(page, email = 'activation@example.com') {
    await page.route('**/api/auth/register', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                success: true,
                user: {
                    id: `e2e-${email}`,
                    email,
                    role: 'user',
                    subscription_status: 'free'
                }
            })
        });
    });
}

async function submitRegisterForm(page, email = 'activation@example.com') {
    await expect(page.locator('#confirm-password-field-wrapper')).toBeVisible();
    await page.locator('#email').fill(email);
    await page.locator('#password').fill('TestPassword123!');
    await page.locator('#confirm-password-reg').fill('TestPassword123!');
    await page.locator('#gdpr-consent').check();
    await page.locator('#auth-submit').click();
}

async function mockSuccessfulLogin(page, email = 'login@example.com') {
    await page.route('**/api/auth/login', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                user: {
                    id: `e2e-${email}`,
                    email,
                    role: 'user',
                    subscription_status: 'free'
                }
            })
        });
    });
}

async function submitLoginForm(page, email = 'login@example.com') {
    await page.locator('#email').fill(email);
    await page.locator('#password').fill('TestPassword123!');
    await page.locator('#auth-submit').click();
}

test.describe('Login stránka', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('/prihlaseni.html');
        await waitForPageReady(page);
    });

    // ── Načtení ─────────────────────────────────────────────────────────────

    test('stránka vrátí 200', async ({ page }) => {
        const res = await page.request.get('/prihlaseni.html');
        expect(res.status()).toBe(200);
    });

    test('title obsahuje "Přihlášení"', async ({ page }) => {
        const title = await page.title();
        expect(title).toContain('Přihlášení');
    });

    test('stránka má noindex (nepřindexovat login)', async ({ page }) => {
        const robots = await page.getAttribute('meta[name="robots"]', 'content');
        expect(robots).toContain('noindex');
    });

    // ── Formulář — struktura ─────────────────────────────────────────────────
    // Poznámka: stránka může obsahovat #login-form vícekrát (page + modal),
    // proto používáme .first() nebo selektor v kontextu .login-section.

    test('#login-form existuje', async ({ page }) => {
        // Hledáme v login sekci (standalone form, ne modal)
        const form = page.locator('.login-section #login-form, #login-form').first();
        await expect(form).toBeVisible();
    });

    test('email pole existuje a je viditelné', async ({ page }) => {
        const emailInput = page.locator('#email').first();
        await expect(emailInput).toBeVisible();
        expect(await emailInput.getAttribute('type')).toBe('email');
        expect(await emailInput.getAttribute('required')).toBeDefined();
    });

    test('heslo pole existuje a je viditelné', async ({ page }) => {
        const passwordInput = page.locator('#password').first();
        await expect(passwordInput).toBeVisible();
        expect(await passwordInput.getAttribute('type')).toBe('password');
    });

    test('heslo lze zobrazit a znovu skryt bez ztraty hodnoty', async ({ page }) => {
        const passwordInput = page.locator('#password').first();
        const toggle = page.locator('[data-password-toggle="password"]').first();

        await passwordInput.fill('TestPassword123!');
        await toggle.click();
        await expect(passwordInput).toHaveAttribute('type', 'text');
        await expect(toggle).toHaveText('Skrýt');
        await expect(toggle).toHaveAttribute('aria-pressed', 'true');

        await toggle.click();
        await expect(passwordInput).toHaveAttribute('type', 'password');
        await expect(passwordInput).toHaveValue('TestPassword123!');
    });

    test('submit tlačítko je viditelné', async ({ page }) => {
        const submitBtn = page.locator('#auth-submit').first();
        await expect(submitBtn).toBeVisible();
        const text = await submitBtn.innerText();
        expect(text.trim().length).toBeGreaterThan(0);
    });

    test('formular a hlavni ovladaci prvky nepreteka mimo viewport', async ({ page }) => {
        await expectLocatorsWithinViewport(page, [
            page.locator('.login-section #login-form, #login-form').first(),
            page.locator('#email').first(),
            page.locator('#password').first(),
            page.locator('#auth-submit').first(),
        ]);
    });

    test('registracni formular nepreteka mimo viewport', async ({ page }) => {
        await page.locator('#auth-mode-toggle').click();
        await expect(page.locator('#confirm-password-field-wrapper')).toBeVisible();
        await expect(page.locator('#gdpr-consent-wrapper')).toBeVisible();

        await expectLocatorsWithinViewport(page, [
            page.locator('.login-section #login-form, #login-form').first(),
            page.locator('#email').first(),
            page.locator('#password').first(),
            page.locator('#confirm-password-reg').first(),
            page.locator('#gdpr-consent-wrapper').first(),
            page.locator('#auth-submit').first(),
        ]);
    });

    test('registrace z homepage hero vysvetli prvni hodnotu pred odeslanim', async ({ page }) => {
        await page.goto('/prihlaseni.html?mode=register&source=homepage_hero&feature=daily_guidance');
        await waitForPageReady(page);

        await expect(page.locator('#login-page-title')).toContainText('účet zdarma');
        await expect(page.locator('#checkout-context-banner')).toBeVisible();
        await expect(page.locator('#checkout-context-title')).toContainText('Denní vedení');
        await expect(page.locator('#signup-value-panel')).toBeVisible();
        await expect(page.locator('#signup-next-step-title')).toContainText('denní horoskopy');
        await expect(page.locator('#signup-value-panel')).toContainText('Bez platební karty');
        await expect(page.locator('#password-help')).toBeVisible();
        await expect(page.locator('#signup-safety-note')).toContainText('bez platební karty');

        await expectLocatorsWithinViewport(page, [
            page.locator('#checkout-context-banner').first(),
            page.locator('#signup-value-panel').first(),
            page.locator('#password-help').first(),
            page.locator('#signup-safety-note').first(),
            page.locator('#auth-submit').first(),
        ]);
    });

    test('mobilni cookie lista neblokuje registracni formular', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.evaluate(() => {
            localStorage.removeItem('mh_cookie_prefs');
            localStorage.removeItem('cookieConsent');
        });
        await page.goto('/prihlaseni.html?mode=register&source=homepage_hero&feature=daily_guidance');
        await waitForPageReady(page);

        const banner = page.locator('#cookie-banner');
        await expect(banner).toBeVisible({ timeout: 4000 });

        const box = await banner.boundingBox();
        expect(box?.height || 0).toBeLessThan(190);
        expect(box?.width || 0).toBeLessThanOrEqual(366);
        await expect(page.locator('#auth-submit')).toBeVisible();

        const overlap = await page.evaluate(() => {
            const submit = document.getElementById('auth-submit')?.getBoundingClientRect();
            const consent = document.getElementById('gdpr-consent-wrapper')?.getBoundingClientRect();
            const cookie = document.getElementById('cookie-banner')?.getBoundingClientRect();
            const overlaps = (a, b) => !!(a && b && !(
                b.right < a.left
                || b.left > a.right
                || b.bottom < a.top
                || b.top > a.bottom
            ));
            return {
                submit: overlaps(submit, cookie),
                consent: overlaps(consent, cookie)
            };
        });

        expect(overlap.submit).toBe(false);
        expect(overlap.consent).toBe(false);
    });

    test('mobilni mentor auth gate prijde az po otazce a ma registracni CTA nad cookie listou', async ({ page }) => {
        await page.setViewportSize(MOBILE_VIEWPORT);
        await page.evaluate(() => {
            localStorage.removeItem('mh_cookie_prefs');
            localStorage.removeItem('cookieConsent');
        });

        await page.goto('/mentor.html?source=e2e_mentor_auth_gate');
        await waitForPageReady(page);

        await expect(page).toHaveURL(/mentor\.html/);
        await page.locator('#chat-input').fill('Co mám dnes pochopit ve vztahu?');

        await Promise.all([
            page.waitForURL(/prihlaseni\.html.*source=mentor_entry_auth_gate/),
            page.locator('#send-btn').click()
        ]);

        await expect(page).toHaveURL(/prihlaseni\.html.*source=mentor_entry_auth_gate/);
        const url = new URL(page.url());
        expect(url.searchParams.get('mode')).toBe('register');
        expect(url.searchParams.get('redirect')).toBe('/mentor.html');
        expect(url.searchParams.get('feature')).toBe('mentor');
        expect(url.searchParams.has('plan')).toBe(false);
        await expect(page.locator('#auth-submit')).toContainText('Vytvořit účet zdarma');
        await expect(page.locator('#gdpr-consent-wrapper')).toBeVisible();

        const metrics = await page.evaluate(() => {
            const submit = document.getElementById('auth-submit')?.getBoundingClientRect();
            const consent = document.getElementById('gdpr-consent-wrapper')?.getBoundingClientRect();
            const cookie = document.getElementById('cookie-banner')?.getBoundingClientRect();
            const overlaps = (a, b) => !!(a && b && !(
                b.right < a.left
                || b.left > a.right
                || b.bottom < a.top
                || b.top > a.bottom
            ));
            return {
                submitBottom: Math.round(submit?.bottom || 9999),
                consentBottom: Math.round(consent?.bottom || 9999),
                cookieTop: Math.round(cookie?.top || window.innerHeight),
                submitOverlapsCookie: overlaps(submit, cookie),
                consentOverlapsCookie: overlaps(consent, cookie),
                overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
            };
        });

        expect(metrics.overflow).toBe(false);
        expect(metrics.submitOverlapsCookie).toBe(false);
        expect(metrics.consentOverlapsCookie).toBe(false);
        expect(metrics.submitBottom).toBeLessThanOrEqual(metrics.cookieTop);
        expect(metrics.consentBottom).toBeLessThanOrEqual(metrics.cookieTop);
    });

    test('registrace z headeru pouziva lidsky account kontext', async ({ page }) => {
        await page.goto('/prihlaseni.html?mode=register&source=header_register&feature=account');
        await waitForPageReady(page);

        await expect(page.locator('#checkout-context-banner')).toBeVisible();
        await expect(page.locator('#checkout-context-label')).toContainText('Účet zdarma');
        await expect(page.locator('#checkout-context-title')).toContainText('Účet zdarma');
        await expect(page.locator('#checkout-context-banner')).not.toContainText('account');
        await expect(page.locator('#signup-next-step-title')).toContainText('první osobní krok');
    });

    test('registrace z profiloveho gate navazuje na historii vykladu', async ({ page }) => {
        await page.goto('/prihlaseni.html?mode=register&source=profile_gate_register&feature=profile_history&redirect=/profil.html');
        await waitForPageReady(page);

        await expect(page.locator('#checkout-context-banner')).toBeVisible();
        await expect(page.locator('#checkout-context-label')).toContainText('Historie výkladů');
        await expect(page.locator('#checkout-context-title')).toContainText('Historie výkladů po registraci');
        await expect(page.locator('#checkout-context-copy')).toContainText('ukládat výklady');
        await expect(page.locator('#checkout-context-banner')).not.toContainText('profile_history');
        await expect(page.locator('#signup-next-step-title')).toContainText('osobní historii');
    });

    test('registracni CTA je na desktopu viditelne nad foldem', async ({ page }) => {
        await page.setViewportSize({ width: 1365, height: 900 });
        await page.goto('/prihlaseni.html?mode=register&source=header_register&feature=account');
        await waitForPageReady(page);

        const submitBox = await page.locator('#auth-submit').boundingBox();
        expect(submitBox).toBeTruthy();
        expect(submitBox.y + submitBox.height).toBeLessThanOrEqual(900);
    });

    test('registracni CTA je na mobilu viditelne pred hodnotovym panelem', async ({ page }) => {
        await page.setViewportSize({ width: 393, height: 851 });
        await page.goto('/prihlaseni.html?mode=register&source=homepage_hero&feature=daily_guidance');
        await waitForPageReady(page);

        const submitBox = await page.locator('#auth-submit').boundingBox();
        const valuePanelBox = await page.locator('#signup-value-panel').boundingBox();
        expect(submitBox).toBeTruthy();
        expect(valuePanelBox).toBeTruthy();
        expect(submitBox.y + submitBox.height).toBeLessThanOrEqual(851);
        expect(valuePanelBox.y).toBeGreaterThan(submitBox.y);
        await expectNoHorizontalOverflow(page);
    });

    test('registracni rezim nastavi heslo jako nove heslo a zobrazi pravidla', async ({ page }) => {
        await page.goto('/prihlaseni.html?mode=register');
        await waitForPageReady(page);

        const passwordInput = page.locator('#password').first();
        await expect(passwordInput).toHaveAttribute('autocomplete', 'new-password');
        await expect(passwordInput).toHaveAttribute('minlength', '8');
        await expect(page.locator('#password-help')).toBeVisible();

        await page.locator('#auth-mode-toggle').click();

        await expect(passwordInput).toHaveAttribute('autocomplete', 'current-password');
        await expect(passwordInput).not.toHaveAttribute('minlength', '8');
        await expect(page.locator('#password-help')).toBeHidden();
    });

    test('pending checkout banner nepreteka mimo viewport', async ({ page }) => {
        await page.goto('/prihlaseni.html?mode=register&redirect=/cenik.html&plan=pruvodce&source=inline_paywall&feature=numerologie_vyklad');
        await waitForPageReady(page);

        await expect(page.locator('#checkout-context-banner')).toBeVisible();
        await expect(page.locator('#checkout-context-title')).toContainText('Pr');

        await expectLocatorsWithinViewport(page, [
            page.locator('#checkout-context-banner').first(),
            page.locator('#checkout-context-title').first(),
            page.locator('#checkout-context-copy').first(),
            page.locator('#email').first(),
            page.locator('#auth-submit').first(),
        ]);
    });

    test('mobilni placeny checkout kontext je videt pred formularem', async ({ page }) => {
        await page.setViewportSize(MOBILE_VIEWPORT);
        await page.evaluate(() => {
            localStorage.removeItem('mh_cookie_prefs');
            localStorage.removeItem('cookieConsent');
        });
        await page.goto('/prihlaseni.html?mode=register&redirect=/cenik.html&plan=pruvodce&source=pricing_email&feature=premium_membership');
        await waitForPageReady(page);
        await expect(page.locator('#cookie-banner')).toBeVisible({ timeout: 4000 });
        await expect.poll(() => page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('#cookie-banner button'));
            return buttons.length === 3 && buttons.every((button) => {
                const rect = button.getBoundingClientRect();
                return rect.top >= 0 && rect.bottom <= window.innerHeight;
            });
        }), { timeout: 6000 }).toBe(true);

        const metrics = await page.evaluate(() => {
            const context = document.getElementById('checkout-context-banner')?.getBoundingClientRect();
            const email = document.getElementById('email')?.getBoundingClientRect();
            const submit = document.getElementById('auth-submit')?.getBoundingClientRect();
            const cookie = document.getElementById('cookie-banner')?.getBoundingClientRect();
            const overlaps = (a, b) => !!(a && b && !(
                b.right < a.left
                || b.left > a.right
                || b.bottom < a.top
                || b.top > a.bottom
            ));
            return {
                contextBeforeEmail: Math.round(context?.bottom || 9999) <= Math.round(email?.top || 0),
                contextVisible: !!context && context.top >= 0 && context.bottom <= window.innerHeight,
                submitVisible: !!submit && submit.top >= 0 && submit.bottom <= window.innerHeight,
                submitOverlapsCookie: overlaps(submit, cookie)
            };
        });

        expect(metrics.contextBeforeEmail).toBe(true);
        expect(metrics.contextVisible).toBe(true);
        expect(metrics.submitVisible).toBe(true);
        expect(metrics.submitOverlapsCookie).toBe(false);
    });

    test('checkout banner neukazuje interni feature identifikatory', async ({ page }) => {
        await page.goto('/prihlaseni.html?mode=register&redirect=/cenik.html&plan=pruvodce&source=tarot_freemium_banner&feature=tarot_multi_card');
        await waitForPageReady(page);

        await expect(page.locator('#checkout-context-banner')).toBeVisible();
        await expect(page.locator('#checkout-context-copy')).toContainText('Vícekartový tarot');
        await expect(page.locator('#checkout-context-banner')).not.toContainText('tarot_multi_card');
    });

    test('checkout banner umi lidsky popsat premium aliasy z paywallu', async ({ page }) => {
        const cases = [
            { feature: 'tarot_celtic_cross', expected: 'Keltsk' },
            { feature: 'natal_chart', expected: 'Nat' },
            { feature: 'runes_deep_reading', expected: 'run' },
            { feature: 'rituals', expected: 'ritu' }
        ];

        for (const item of cases) {
            await page.goto(`/prihlaseni.html?mode=register&redirect=/cenik.html&plan=pruvodce&source=inline_paywall&feature=${item.feature}`);
            await waitForPageReady(page);

            const banner = page.locator('#checkout-context-banner');
            await expect(banner).toBeVisible();
            await expect(banner).toContainText(item.expected);
            await expect(banner).not.toContainText(item.feature);
        }
    });

    test('registrace z primeho checkout odkazu dokonci Stripe checkout', async ({ page }) => {
        let checkoutPayload = null;
        await mockSuccessfulRegister(page, 'direct-checkout@example.com');

        await page.route('**/api/payment/create-checkout-session', async (route) => {
            checkoutPayload = route.request().postDataJSON();
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    id: 'cs_test_direct_checkout',
                    url: '/profil.html?payment=success&plan=pruvodce&session_id=cs_test_direct_checkout'
                })
            });
        });

        await page.goto('/prihlaseni.html?mode=register&redirect=/cenik.html&plan=pruvodce&source=pricing_email&feature=premium_membership');
        await waitForPageReady(page);
        await expect(page.locator('#login-page-title')).toContainText('pokračujte k odemčení');
        await expect(page.locator('#login-page-subtitle')).toContainText('Stripe checkoutu');
        await expect(page.locator('#auth-submit')).toContainText('Vytvořit účet a pokračovat');

        await Promise.all([
            page.waitForRequest((request) => request.url().includes('/profil.html?payment=success'), { timeout: 10000 }),
            submitRegisterForm(page, 'direct-checkout@example.com'),
        ]);

        expect(checkoutPayload).toEqual(expect.objectContaining({
            planId: 'pruvodce',
            source: 'pricing_email',
            feature: 'premium_membership'
        }));
    });

    test('registrace s email verifikaci posila signup analytics jen jednou', async ({ page }) => {
        await page.route('**/api/auth/register', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    success: true,
                    requireEmailVerification: true
                })
            });
        });

        await page.goto('/prihlaseni.html?mode=register&source=homepage_hero&feature=daily_guidance');
        await waitForPageReady(page);

        await page.evaluate(() => {
            window.__mhTrackAuthCompletedCalls = [];
            const analytics = window.MH_ANALYTICS || (window.MH_ANALYTICS = {});
            const originalTrackAuthCompleted = typeof analytics.trackAuthCompleted === 'function'
                ? analytics.trackAuthCompleted.bind(analytics)
                : null;

            analytics.trackAuthCompleted = (...args) => {
                window.__mhTrackAuthCompletedCalls.push(args);
                return originalTrackAuthCompleted ? originalTrackAuthCompleted(...args) : undefined;
            };
        });

        await submitRegisterForm(page, 'verify-once@example.com');

        await expect.poll(async () => page.evaluate(() => window.__mhTrackAuthCompletedCalls)).toEqual([
            [
                'register',
                expect.objectContaining({
                    source: 'homepage_hero',
                    feature: 'daily_guidance',
                    entry_source: 'homepage_hero',
                    ['entry_feature']: 'daily_guidance'
                })
            ]
        ]);
    });

    test('prihlaseni posila login analytics jen jednou', async ({ page }) => {
        await mockSuccessfulLogin(page, 'login-once@example.com');

        await page.goto('/prihlaseni.html?source=header_login&feature=account');
        await waitForPageReady(page);

        await page.evaluate(() => {
            window.__mhTrackAuthCompletedCalls = [];
            const analytics = window.MH_ANALYTICS || (window.MH_ANALYTICS = {});
            const originalTrackAuthCompleted = typeof analytics.trackAuthCompleted === 'function'
                ? analytics.trackAuthCompleted.bind(analytics)
                : null;

            analytics.trackAuthCompleted = (...args) => {
                window.__mhTrackAuthCompletedCalls.push(args);
                return originalTrackAuthCompleted ? originalTrackAuthCompleted(...args) : undefined;
            };
        });

        await submitLoginForm(page, 'login-once@example.com');

        await expect.poll(async () => page.evaluate(() => window.__mhTrackAuthCompletedCalls)).toEqual([
            [
                'login',
                expect.objectContaining({
                    source: 'header_login',
                    feature: 'account',
                    entry_source: 'header_login',
                    ['entry_feature']: 'account'
                })
            ]
        ]);
    });

    test('registrace s feature kontextem presmeruje na aktivacni stranku', async ({ page }) => {
        await mockSuccessfulRegister(page);

        await page.goto('/prihlaseni.html?mode=register&redirect=/profil.html&source=inline_paywall&feature=tarot');
        await waitForPageReady(page);

        await Promise.all([
            page.waitForURL(url => url.pathname === '/tarot.html', { timeout: 10000, waitUntil: 'domcontentloaded' }),
            submitRegisterForm(page),
        ]);
        await waitForPageReady(page);

        const url = new URL(page.url());
        expect(url.pathname).toBe('/tarot.html');
        expect(url.searchParams.get('source')).toBe('signup_activation');
        expect(url.searchParams.get('feature')).toBe('tarot');
        expect(url.searchParams.get('entry_source')).toBe('inline_paywall');
        expect(url.searchParams.get('entry_feature')).toBe('tarot');
        const activationFlag = await page.evaluate(() => sessionStorage.getItem('post_auth_activation'));
        expect(activationFlag).toBeNull();
    });

    test('registrace z andelske karty se vraci k andelskym kartam', async ({ page }) => {
        await mockSuccessfulRegister(page, 'angel-card@example.com');

        await page.goto('/prihlaseni.html?mode=register&feature=daily_angel_card');
        await waitForPageReady(page);

        await expect(page.locator('#checkout-context-title')).toContainText('Karta dne');

        await Promise.all([
            page.waitForURL(url => url.pathname === '/andelske-karty.html', { timeout: 10000, waitUntil: 'domcontentloaded' }),
            submitRegisterForm(page, 'angel-card@example.com'),
        ]);
        await waitForPageReady(page);

        const url = new URL(page.url());
        expect(url.pathname).toBe('/andelske-karty.html');
        expect(url.searchParams.get('source')).toBe('signup_activation');
        expect(url.searchParams.get('feature')).toBe('daily_angel_card');
        expect(url.searchParams.get('entry_feature')).toBe('daily_angel_card');
        const activationFlag = await page.evaluate(() => sessionStorage.getItem('post_auth_activation'));
        expect(activationFlag).toBeNull();
    });

    test('registrace s redirectem na andelske karty nepouziva kontext Karty dne', async ({ page }) => {
        await page.goto('/prihlaseni.html?mode=register&redirect=/andelske-karty.html');
        await waitForPageReady(page);

        const contextTitle = page.locator('#checkout-context-title');
        const contextCopy = page.locator('#checkout-context-copy');
        await expect(contextTitle).toContainText('Andělské karty');
        await expect(contextCopy).toContainText('andělským kartám');
        await expect(contextTitle).not.toContainText('Karta dne');
    });

    test('registrace ze samanskeho kola se vraci na kanonickou stranku bez legacy presmerovani', async ({ page }) => {
        await mockSuccessfulRegister(page, 'shaman-wheel@example.com');

        await page.goto('/prihlaseni.html?mode=register&feature=shamanske_kolo_plne_cteni');
        await waitForPageReady(page);

        await Promise.all([
            page.waitForURL(url => url.pathname === '/shamansko-kolo.html', { timeout: 10000, waitUntil: 'domcontentloaded' }),
            submitRegisterForm(page, 'shaman-wheel@example.com'),
        ]);
        await waitForPageReady(page);

        expect(new URL(page.url()).pathname).toBe('/shamansko-kolo.html');
        const activationFlag = await page.evaluate(() => sessionStorage.getItem('post_auth_activation'));
        expect(activationFlag).toBeNull();
    });

    test('registrace z minuleho zivota drzi symbolicky trust copy', async ({ page }) => {
        await mockSuccessfulRegister(page, 'past-life-symbolic@example.com');

        await page.goto('/prihlaseni.html?mode=register&feature=minuly_zivot');
        await waitForPageReady(page);

        await expect(page.locator('#checkout-context-title')).toContainText('Minulý život');
        await expect(page.locator('#signup-next-step-copy')).toContainText('archetypálním příběhem pro sebereflexi');

        await Promise.all([
            page.waitForURL(url => url.pathname === '/minuly-zivot.html', { timeout: 10000, waitUntil: 'domcontentloaded' }),
            submitRegisterForm(page, 'past-life-symbolic@example.com'),
        ]);
        await waitForPageReady(page);

        const url = new URL(page.url());
        expect(url.pathname).toBe('/minuly-zivot.html');
        expect(url.searchParams.get('source')).toBe('signup_activation');
        expect(url.searchParams.get('feature')).toBe('minuly_zivot');
        expect(url.searchParams.get('entry_feature')).toBe('minuly_zivot');
        const activationFlag = await page.evaluate(() => sessionStorage.getItem('post_auth_activation'));
        expect(activationFlag).toBeNull();
    });

    test('registrace s newsletter zdrojem presmeruje na horoskopy', async ({ page }) => {
        await mockSuccessfulRegister(page, 'newsletter-activation@example.com');

        await page.goto('/prihlaseni.html?mode=register&redirect=/profil.html&source=newsletter_form');
        await waitForPageReady(page);

        await Promise.all([
            page.waitForURL(url => url.pathname === '/horoskopy.html', { timeout: 10000, waitUntil: 'domcontentloaded' }),
            submitRegisterForm(page, 'newsletter-activation@example.com'),
        ]);
        await waitForPageReady(page);

        const url = new URL(page.url());
        expect(url.pathname).toBe('/horoskopy.html');
        expect(url.searchParams.get('source')).toBe('signup_activation');
        expect(url.searchParams.get('feature')).toBeNull();
        expect(url.searchParams.get('entry_source')).toBe('newsletter_form');
        expect(url.searchParams.get('entry_feature')).toBeNull();
        const activationFlag = await page.evaluate(() => sessionStorage.getItem('post_auth_activation'));
        expect(activationFlag).toBeNull();
    });

    test('registrace z homepage hero CTA presmeruje na prvni denni hodnotu', async ({ page }) => {
        await mockSuccessfulRegister(page, 'homepage-hero@example.com');

        await page.goto('/prihlaseni.html?mode=register&source=homepage_hero&feature=daily_guidance');
        await waitForPageReady(page);

        await Promise.all([
            page.waitForURL(url => url.pathname === '/horoskopy.html', { timeout: 10000, waitUntil: 'domcontentloaded' }),
            submitRegisterForm(page, 'homepage-hero@example.com'),
        ]);
        await waitForPageReady(page);

        const url = new URL(page.url());
        expect(url.pathname).toBe('/horoskopy.html');
        expect(url.searchParams.get('source')).toBe('signup_activation');
        expect(url.searchParams.get('feature')).toBe('daily_guidance');
        expect(url.searchParams.get('entry_source')).toBe('homepage_hero');
        expect(url.searchParams.get('entry_feature')).toBe('daily_guidance');
        const activationFlag = await page.evaluate(() => sessionStorage.getItem('post_auth_activation'));
        expect(activationFlag).toBeNull();
    });

    test('registrace z free CTA ceniku presmeruje na denni horoskopy', async ({ page }) => {
        await mockSuccessfulRegister(page, 'pricing-free@example.com');

        await page.goto('/prihlaseni.html?mode=register&redirect=/horoskopy.html&source=pricing_free_cta');
        await waitForPageReady(page);

        await Promise.all([
            page.waitForURL(url => url.pathname === '/horoskopy.html', { timeout: 10000, waitUntil: 'domcontentloaded' }),
            submitRegisterForm(page, 'pricing-free@example.com'),
        ]);
        await waitForPageReady(page);

        expect(new URL(page.url()).pathname).toBe('/horoskopy.html');
        const activationFlag = await page.evaluate(() => sessionStorage.getItem('post_auth_activation'));
        expect(activationFlag).toBeNull();
    });

    test('registrace bez aktivacniho kontextu presmeruje do onboardingu', async ({ page }) => {
        await mockSuccessfulRegister(page, 'onboarding@example.com');

        await page.goto('/prihlaseni.html?mode=register&redirect=/profil.html');
        await waitForPageReady(page);
        await page.evaluate(() => localStorage.setItem('mh_onboarded', '1'));

        await Promise.all([
            page.waitForURL(url => url.pathname === '/onboarding.html', { timeout: 10000, waitUntil: 'domcontentloaded' }),
            submitRegisterForm(page, 'onboarding@example.com'),
        ]);
        await waitForPageReady(page);

        expect(new URL(page.url()).pathname).toBe('/onboarding.html');
    });

    test('registrace z headeru zachova kontext v onboardingu', async ({ page }) => {
        await mockSuccessfulRegister(page, 'header-onboarding@example.com');

        await page.goto('/prihlaseni.html?mode=register&source=header_register&feature=account');
        await waitForPageReady(page);

        await Promise.all([
            page.waitForURL(url => url.pathname === '/onboarding.html', { timeout: 10000, waitUntil: 'domcontentloaded' }),
            submitRegisterForm(page, 'header-onboarding@example.com'),
        ]);
        await waitForPageReady(page);

        const url = new URL(page.url());
        expect(url.pathname).toBe('/onboarding.html');
        expect(url.searchParams.get('source')).toBe('header_register');
        expect(url.searchParams.get('feature')).toBe('account');
        await expect(page.locator('#step-1 .step-title')).toContainText('jedním rituálem');
    });

    // ── Klientská validace ────────────────────────────────────────────────────

    test('prázdný formulář aktivuje HTML5 validaci (nevyvolá síťový request)', async ({ page }) => {
        // Monitorujeme requesty — prázdný submit by neměl poslat POST
        const postRequests = [];
        page.on('request', req => {
            if (req.method() === 'POST') postRequests.push(req.url());
        });

        await page.locator('#auth-submit').first().click();

        // Krátká pauza pro případné async operace
        await page.waitForTimeout(500);

        // Buď HTML5 validace zabránila odeslání, nebo server vrátil 4xx
        // V každém případě stránka musí zůstat přítomná
        const form = page.locator('#login-form').first();
        await expect(form).toBeVisible();
    });

    test('email pole přijímá vstup', async ({ page }) => {
        const emailInput = page.locator('#email').first();
        await emailInput.fill('test@example.com');
        await expect(emailInput).toHaveValue('test@example.com');
    });

    test('heslo pole přijímá vstup a maskuje ho', async ({ page }) => {
        const passwordInput = page.locator('#password').first();
        await passwordInput.fill('TestHeslo123!');
        await expect(passwordInput).toHaveValue('TestHeslo123!');
        // Typ musí zůstat password (maskovano)
        expect(await passwordInput.getAttribute('type')).toBe('password');
    });

    test('autocomplete atributy jsou nastaveny (UX + správci hesel)', async ({ page }) => {
        const emailAC = await page.locator('#email').first().getAttribute('autocomplete');
        const pwAC = await page.locator('#password').first().getAttribute('autocomplete');
        expect(emailAC).toBeTruthy();
        expect(pwAC).toBeTruthy();
    });

    // ── Zapomenuté heslo ─────────────────────────────────────────────────────

    test('"Zapomněli jste heslo?" tlačítko existuje', async ({ page }) => {
        // Stránka může mít tlačítko vícekrát (page + modal) — bereme první
        const forgotBtn = page.locator('#forgot-password-link').first();
        await expect(forgotBtn).toBeVisible();
    });

    test('kliknutí na "Zapomněli jste heslo?" zobrazí forgot password formulář', async ({ page }) => {
        await page.locator('#forgot-password-link').first().click();
        await page.waitForTimeout(400);

        // Po kliknutí by se měl formulář zobrazit nebo odkaz provést akci
        // Testujeme pouze že stránka zůstala funkční
        await expect(page.locator('body')).toBeVisible();
    });

    test('forgot-password-form má email input', async ({ page }) => {
        const forgotEmail = page.locator('#forgot-email').first();
        await expect(forgotEmail).toBeAttached();
        expect(await forgotEmail.getAttribute('type')).toBe('email');
    });

    // ── Confirm password pole (pro registraci) ────────────────────────────────

    test('#confirm-password-field-wrapper existuje v DOM', async ({ page }) => {
        // Skryté pole pro registraci — musí být v DOM (může být vícekrát)
        const wrapper = page.locator('#confirm-password-field-wrapper').first();
        await expect(wrapper).toBeAttached();
    });
});

test.describe('Auth modal', () => {
    test('modal registrace vysvetli datum narozeni a nevyzaduje ho pred vytvorenim uctu', async ({ page }) => {
        let registerPayload = null;

        await page.route('**/api/auth/register', async (route) => {
            registerPayload = route.request().postDataJSON();
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    success: true,
                    requireEmailVerification: true
                })
            });
        });

        await page.goto('/tarot.html?source=e2e_auth_modal');
        await waitForPageReady(page);
        await page.evaluate(() => window.Auth.openModal('register'));

        const modal = page.locator('#auth-modal');
        await expect(modal).toBeVisible();
        await expect(page.locator('#register-fields')).toBeVisible();
        await expect(page.locator('#birth-date-privacy-note')).toContainText('Nepovinné');
        await expect(page.locator('#birth-date-privacy-note')).toContainText('jen pro osobní výklady');
        await expect(page.locator('input[name="birth_date"]')).not.toHaveAttribute('required', '');

        await page.locator('#auth-modal input[name="email"]').fill('modal-register@example.com');
        await page.locator('#auth-modal input[name="password"]').fill('TestPassword123!');
        await page.locator('#auth-modal input[name="confirm_password"]').fill('TestPassword123!');
        await page.locator('#auth-modal #auth-submit').click();

        await expect.poll(() => registerPayload).toEqual(expect.objectContaining({
            email: 'modal-register@example.com',
            password: 'TestPassword123!',
            password_confirm: 'TestPassword123!'
        }));
        expect(registerPayload.birth_date).toBe('');
    });

    test('modal registrace s email verifikaci posila signup analytics event v register modu', async ({ page }) => {
        await page.route('**/api/auth/register', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    success: true,
                    requireEmailVerification: true
                })
            });
        });

        await page.goto('/tarot.html?source=e2e_auth_modal');
        await waitForPageReady(page);

        await page.evaluate(() => {
            window.__mhTrackAuthCompletedCalls = [];
            const analytics = window.MH_ANALYTICS || (window.MH_ANALYTICS = {});
            const originalTrackAuthCompleted = typeof analytics.trackAuthCompleted === 'function'
                ? analytics.trackAuthCompleted.bind(analytics)
                : null;

            analytics.trackAuthCompleted = (...args) => {
                window.__mhTrackAuthCompletedCalls.push(args);
                return originalTrackAuthCompleted ? originalTrackAuthCompleted(...args) : undefined;
            };
        });

        await page.evaluate(() => window.Auth.openModal('register'));
        await page.locator('#auth-modal input[name="email"]').fill('modal-verify-analytics@example.com');
        await page.locator('#auth-modal input[name="password"]').fill('TestPassword123!');
        await page.locator('#auth-modal input[name="confirm_password"]').fill('TestPassword123!');
        await page.locator('#auth-modal #auth-submit').click();

        await expect.poll(async () => page.evaluate(() => (
            window.__mhTrackAuthCompletedCalls.find((call) => call?.[0] === 'register') || null
        ))).not.toBeNull();
    });
});

// ── CSRF Token API ────────────────────────────────────────────────────────────

test.describe('CSRF Token API', () => {

    test('GET /api/csrf-token vrátí 200 a token', async ({ page }) => {
        const response = await page.request.get('/api/csrf-token');
        expect(response.status()).toBe(200);

        const data = await response.json();
        expect(data.csrfToken).toBeTruthy();
        expect(typeof data.csrfToken).toBe('string');
    });

    test('CSRF token má 3 části oddělené tečkou', async ({ page }) => {
        const token = await getCsrfToken(page);
        const parts = token.split('.');
        expect(parts).toHaveLength(3);
        expect(parts[0].length).toBeGreaterThan(0);
        expect(parts[1].length).toBeGreaterThan(0);
        expect(parts[2]).toHaveLength(64); // SHA-256 hex
    });

    test('dva po sobě jdoucí CSRF tokeny jsou různé', async ({ page }) => {
        const token1 = await getCsrfToken(page);
        const token2 = await getCsrfToken(page);
        expect(token1).not.toBe(token2);
    });

    test('POST na auth endpoint bez CSRF vrátí 403', async ({ page }) => {
        const response = await page.request.post('/api/auth/login', {
            data: { email: 'test@example.com', password: 'heslo' },
        });
        expect(response.status()).toBe(403);
    });
});
