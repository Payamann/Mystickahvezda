/**
 * E2E testy — Ceník & platební tlačítka (cenik.html)
 *
 * Kritické flows:
 * 1. Stránka se načte
 * 2. Všechna 3 checkout tlačítka existují se správnými data-plan
 * 3. Nepřihlášený uživatel → klik → přesměrování na prihlaseni.html (ne 404, ne registrace.html)
 * 4. Billing toggle (měsíčně/ročně) správně mění zobrazené ceny
 * 5. Žádný duplicitní handler — platby.js se nenačítá inline
 */

import { test, expect } from '@playwright/test';
import { waitForPageReady } from './helpers.js';

test.describe('Ceník — platební tlačítka', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('/cenik.html');
        await waitForPageReady(page);
    });

    // ── Načtení stránky ──────────────────────────────────────────────────────

    test('stránka vrátí 200', async ({ page }) => {
        const res = await page.request.get('/cenik.html');
        expect(res.status()).toBe(200);
    });

    test('title obsahuje "Ceník"', async ({ page }) => {
        const title = await page.title();
        expect(title.toLowerCase()).toContain('cen');
    });

    // ── Checkout tlačítka — struktura ────────────────────────────────────────

    test('existují 3 checkout tlačítka s třídou plan-checkout-btn', async ({ page }) => {
        const btns = page.locator('.plan-checkout-btn');
        await expect(btns).toHaveCount(3);
    });

    test('tlačítko Průvodce má data-plan="pruvodce"', async ({ page }) => {
        const btn = page.locator('[data-plan="pruvodce"]');
        await expect(btn).toBeVisible();
    });

    test('tlačítko Osvícení má data-plan="osviceni"', async ({ page }) => {
        const btn = page.locator('[data-plan="osviceni"]');
        await expect(btn).toBeVisible();
    });

    test('tlačítko VIP má data-plan="vip-majestrat"', async ({ page }) => {
        const btn = page.locator('[data-plan="vip-majestrat"]');
        await expect(btn).toBeVisible();
    });

    // ── Kritický test: nepřihlášený uživatel → správné přesměrování ──────────

    test('klik na checkout bez přihlášení přesměruje na prihlaseni.html', async ({ page }) => {
        // Ujistíme se, že není přihlášen (čistý stav)
        await page.evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();
        });
        await page.reload();
        await waitForPageReady(page);

        // Počkáme na navigaci po kliknutí
        const [response] = await Promise.all([
            page.waitForNavigation({ timeout: 5000 }).catch(() => null),
            page.locator('[data-plan="pruvodce"]').click(),
        ]);

        const url = page.url();

        // Nesmí jít na /registrace.html (neexistující stránka)
        expect(url).not.toContain('registrace.html');
        // Musí jít na prihlaseni.html
        expect(url).toContain('prihlaseni.html');
    });

    test('/registrace.html vrátí 404 (stránka neexistuje — nesmíme tam přesměrovávat)', async ({ page }) => {
        const res = await page.request.get('/registrace.html');
        expect(res.status()).toBe(404);
    });

    test('/prihlaseni.html vrátí 200 (cíl přesměrování existuje)', async ({ page }) => {
        const res = await page.request.get('/prihlaseni.html');
        expect(res.status()).toBe(200);
    });

    // ── Žádný duplicitní handler ─────────────────────────────────────────────

    test('cenik.html nenačítá platby.js jako inline module import', async ({ page }) => {
        const hasPlattbyImport = await page.evaluate(() => {
            const moduleScripts = Array.from(document.querySelectorAll('script[type="module"]:not([src])'));
            return moduleScripts.some(s => s.textContent.includes('platby.js'));
        });
        expect(hasPlattbyImport).toBe(false);
    });

    test('cenik.js je načten (defer script)', async ({ page }) => {
        const hasCenikScript = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('script[src]'))
                .some(s => s.src.includes('cenik.js'));
        });
        expect(hasCenikScript).toBe(true);
    });

    // ── Billing toggle ───────────────────────────────────────────────────────

    test('výchozí zobrazení je měsíční ceny', async ({ page }) => {
        const pruvodcePrice = await page.locator('[data-price-plan="pruvodce"] .price-amount').textContent();
        expect(pruvodcePrice).toContain('199');
    });

    test('přepnutí na roční změní ceny na nižší', async ({ page }) => {
        await page.locator('#toggle-yearly').click();
        const pruvodcePrice = await page.locator('[data-price-plan="pruvodce"] .price-amount').textContent();
        expect(pruvodcePrice).toContain('159');
    });

    test('přepnutí zpět na měsíční obnoví původní ceny', async ({ page }) => {
        await page.locator('#toggle-yearly').click();
        await page.locator('#toggle-monthly').click();
        const pruvodcePrice = await page.locator('[data-price-plan="pruvodce"] .price-amount').textContent();
        expect(pruvodcePrice).toContain('199');
    });

    // ── pending_plan se uloží do sessionStorage ───────────────────────────────

    test('klik bez přihlášení uloží planId do sessionStorage', async ({ page }) => {
        await page.evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();
        });
        await page.reload();
        await waitForPageReady(page);

        await Promise.all([
            page.waitForNavigation({ timeout: 5000 }).catch(() => null),
            page.locator('[data-plan="pruvodce"]').click(),
        ]);

        // Po přesměrování zpět zkontrolujeme sessionStorage (na prihlaseni.html)
        const pending = await page.evaluate(() => sessionStorage.getItem('pending_plan'));
        expect(pending).toBe('pruvodce');
    });
});
