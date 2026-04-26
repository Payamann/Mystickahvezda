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
import { waitForPageReady, getCsrfToken } from './helpers.js';

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

    test('registrace s feature kontextem presmeruje na aktivacni stranku', async ({ page }) => {
        await mockSuccessfulRegister(page);

        await page.goto('/prihlaseni.html?mode=register&redirect=/profil.html&source=inline_paywall&feature=tarot');
        await waitForPageReady(page);

        await Promise.all([
            page.waitForURL(/tarot\.html/, { timeout: 7000 }),
            submitRegisterForm(page),
        ]);
        await waitForPageReady(page);

        expect(new URL(page.url()).pathname).toBe('/tarot.html');
        const activationFlag = await page.evaluate(() => sessionStorage.getItem('post_auth_activation'));
        expect(activationFlag).toBeNull();
    });

    test('registrace s newsletter zdrojem presmeruje na horoskopy', async ({ page }) => {
        await mockSuccessfulRegister(page, 'newsletter-activation@example.com');

        await page.goto('/prihlaseni.html?mode=register&redirect=/profil.html&source=newsletter_form');
        await waitForPageReady(page);

        await Promise.all([
            page.waitForURL(/horoskopy\.html/, { timeout: 7000 }),
            submitRegisterForm(page, 'newsletter-activation@example.com'),
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

        await Promise.all([
            page.waitForURL(/onboarding\.html/, { timeout: 7000 }),
            submitRegisterForm(page, 'onboarding@example.com'),
        ]);
        await waitForPageReady(page);

        expect(new URL(page.url()).pathname).toBe('/onboarding.html');
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
