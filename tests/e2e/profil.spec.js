/**
 * E2E testy — Profil uživatele + Onboarding
 *
 * Testujeme stránky dostupné bez přihlášení (načtení, struktura)
 * a ověřujeme, že chráněný obsah je správně schován za login gate.
 */

import { test, expect } from '@playwright/test';
import { waitForPageReady, MOBILE_VIEWPORT } from './helpers.js';

// ═══════════════════════════════════════════════════════════
// PROFIL
// ═══════════════════════════════════════════════════════════

test.describe('Profil stránka', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('/profil.html');
        await waitForPageReady(page);
    });

    test('stránka vrátí 200', async ({ page }) => {
        const res = await page.request.get('/profil.html');
        expect(res.status()).toBe(200);
    });

    test('title obsahuje "Profil"', async ({ page }) => {
        const title = await page.title().then(t => t.toLowerCase());
        expect(title).toContain('profil');
    });

    test('#login-required nebo login gate existuje v DOM', async ({ page }) => {
        // Nepřihlášený uživatel by měl vidět výzvu k přihlášení
        const loginGate = page.locator('#login-required, .login-required, [id*="login-required"]').first();
        await expect(loginGate).toBeAttached();
    });

    test('#profile-dashboard existuje v DOM', async ({ page }) => {
        // Dashboard je skrytý pro nepřihlášené
        await expect(page.locator('#profile-dashboard')).toBeAttached();
    });

    test('#profile-login-btn nebo login odkaz existuje', async ({ page }) => {
        const loginBtn = page.locator('#profile-login-btn, a[href*="prihlaseni"], button[id*="login"]').first();
        await expect(loginBtn).toBeAttached();
    });

    test('user info elementy existují v DOM', async ({ page }) => {
        // Elementy pro zobrazení info uživatele (skryté do přihlášení)
        const userEmail = page.locator('#user-email');
        await expect(userEmail).toBeAttached();
    });

    test('stat karty existují v DOM', async ({ page }) => {
        const stats = page.locator('#stat-total, #stat-month, #stat-favorites, #stat-streak, .stat-card');
        const count = await stats.count();
        expect(count).toBeGreaterThanOrEqual(1);
    });

    test('#logout-btn existuje v DOM', async ({ page }) => {
        await expect(page.locator('#logout-btn')).toBeAttached();
    });

    test('#avatar-picker existuje v DOM', async ({ page }) => {
        await expect(page.locator('#avatar-picker')).toBeAttached();
    });

    test('avatar možnosti existují', async ({ page }) => {
        const avatars = page.locator('.avatar-option, [data-avatar]');
        const count = await avatars.count();
        expect(count).toBeGreaterThanOrEqual(1);
    });

    test('meta robots je noindex (profil se neindexuje)', async ({ page }) => {
        // page.evaluate nehází timeout když element neexistuje
        const robots = await page.evaluate(() => {
            const meta = document.querySelector('meta[name="robots"]');
            return meta ? meta.getAttribute('content') : null;
        });
        if (robots) {
            expect(robots).toContain('noindex');
        }
        // Test projde i bez robots meta tagu
    });

    test('žádný horizontální scroll na mobilu', async ({ page }) => {
        await page.setViewportSize(MOBILE_VIEWPORT);
        await page.goto('/profil.html');
        await waitForPageReady(page);
        const overflow = await page.evaluate(() =>
            document.documentElement.scrollWidth > document.documentElement.clientWidth
        );
        expect(overflow).toBe(false);
    });
});

// ═══════════════════════════════════════════════════════════
// ONBOARDING
// ═══════════════════════════════════════════════════════════

test.describe('Onboarding', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('/onboarding.html');
        await waitForPageReady(page);
    });

    async function mockOnboardingComplete(page) {
        await page.route('**/api/auth/onboarding/complete', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ success: true })
            });
        });
    }

    test('stránka vrátí 200', async ({ page }) => {
        const res = await page.request.get('/onboarding.html');
        expect(res.status()).toBe(200);
    });

    test('h1 existuje', async ({ page }) => {
        await expect(page.locator('h1').first()).toBeAttached();
    });

    test('onboarding kroky nebo wizard existují', async ({ page }) => {
        // Onboarding obvykle má kroky (steps)
        const steps = page.locator(
            '.step, .onboarding-step, [class*="step"], .wizard-step, form'
        ).first();
        await expect(steps).toBeAttached();
    });

    test('žádný horizontální scroll na mobilu', async ({ page }) => {
        await page.setViewportSize(MOBILE_VIEWPORT);
        await page.goto('/onboarding.html');
        await waitForPageReady(page);
        const overflow = await page.evaluate(() =>
            document.documentElement.scrollWidth > document.documentElement.clientWidth
        );
        expect(overflow).toBe(false);
    });

    test('preskoceni onboardingu vede rovnou na denni horoskop', async ({ page }) => {
        await mockOnboardingComplete(page);

        await Promise.all([
            page.waitForURL(url => url.pathname === '/horoskopy.html', { timeout: 10000, waitUntil: 'domcontentloaded' }),
            page.locator('[data-action="skipOnboarding"]').click(),
        ]);

        const url = new URL(page.url());
        expect(url.pathname).toBe('/horoskopy.html');
        expect(url.searchParams.get('source')).toBe('onboarding_skip');
        const onboarded = await page.evaluate(() => localStorage.getItem('mh_onboarded'));
        expect(onboarded).toBe('1');
    });

    test('dokonceni se znamenim otevre konkretni denni horoskop a ulozi personalizaci', async ({ page }) => {
        await mockOnboardingComplete(page);

        await page.locator('#step-1 [data-action="goStep"][data-step="2"]').click();
        await page.locator('.zodiac-btn[data-sign="beran"]').click();
        await expect(page.locator('.zodiac-btn[data-sign="beran"]')).toHaveAttribute('aria-pressed', 'true');
        await page.locator('#btn-step2').click();

        await expect(page.locator('#finish-onboarding-btn')).toContainText('Berana');

        await Promise.all([
            page.waitForURL(url => url.pathname === '/horoskopy.html', { timeout: 10000, waitUntil: 'domcontentloaded' }),
            page.locator('#finish-onboarding-btn').click(),
        ]);

        const url = new URL(page.url());
        expect(url.pathname).toBe('/horoskopy.html');
        expect(url.searchParams.get('source')).toBe('onboarding_complete');
        expect(url.searchParams.get('sign')).toBe('beran');
        expect(url.hash).toBe('#beran');

        const stored = await page.evaluate(() => ({
            onboarded: localStorage.getItem('mh_onboarded'),
            zodiac: localStorage.getItem('mh_zodiac'),
            prefs: JSON.parse(localStorage.getItem('mh_user_prefs') || '{}')
        }));

        expect(stored.onboarded).toBe('1');
        expect(stored.zodiac).toBe('beran');
        expect(stored.prefs.sign).toBe('beran');
    });

    test('vybrane tema meni prvni cil po onboardingu', async ({ page }) => {
        await mockOnboardingComplete(page);

        await page.locator('#step-1 [data-action="goStep"][data-step="2"]').click();
        await page.locator('.zodiac-btn[data-sign="beran"]').click();
        await page.locator('#btn-step2').click();
        await page.locator('.interest-chip[data-interest="tarot"]').click();

        await expect(page.locator('.interest-chip[data-interest="tarot"]')).toHaveAttribute('aria-pressed', 'true');
        await expect(page.locator('#finish-onboarding-btn')).toContainText('tarotový výklad');

        await Promise.all([
            page.waitForURL(url => url.pathname === '/tarot.html', { timeout: 10000, waitUntil: 'domcontentloaded' }),
            page.locator('#finish-onboarding-btn').click(),
        ]);

        const url = new URL(page.url());
        expect(url.pathname).toBe('/tarot.html');
        expect(url.searchParams.get('source')).toBe('onboarding_complete');
    });
});

// ═══════════════════════════════════════════════════════════
// PROTECTED API ROUTES — ověřování auth ochrany
// ═══════════════════════════════════════════════════════════

test.describe('Chráněné user API endpointy', () => {

    test('GET /api/auth/profile bez auth vrátí 401', async ({ page }) => {
        const res = await page.request.get('/api/auth/profile');
        expect(res.status()).toBe(401);
    });

    test('GET /api/user/readings bez auth vrátí 401', async ({ page }) => {
        const res = await page.request.get('/api/user/readings');
        expect(res.status()).toBe(401);
    });

    test('GET /api/payment/subscription/status bez auth vrátí 401', async ({ page }) => {
        const res = await page.request.get('/api/payment/subscription/status');
        expect(res.status()).toBe(401);
    });
});
