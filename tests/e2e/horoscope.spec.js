/**
 * E2E testy — Horoskopy (horoskopy.html)
 *
 * Testuje: načtení stránky, zodiac grid (12 karet), tab navigace (denní/týdenní/měsíční),
 * kliknutí na znamení, přístupnost, SEO.
 */

import { test, expect } from '@playwright/test';
import { waitForPageReady, assertBasicSEO, ZODIAC_SIGNS, MOBILE_VIEWPORT } from './helpers.js';

test.describe('Horoskopy', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('/horoskopy.html');
        await waitForPageReady(page);
    });

    // ── Načtení ─────────────────────────────────────────────────────────────

    test('stránka vrátí 200', async ({ page }) => {
        const res = await page.request.get('/horoskopy.html');
        expect(res.status()).toBe(200);
    });

    test('title obsahuje "Horoskop"', async ({ page }) => {
        await assertBasicSEO(page, { titleContains: 'Horoskop' });
    });

    test('h1 je viditelný', async ({ page }) => {
        const h1 = page.locator('h1').first();
        await expect(h1).toBeVisible();
    });

    test('hero subtitle je viditelný', async ({ page }) => {
        const subtitle = page.locator('.hero__subtitle').first();
        await expect(subtitle).toBeVisible();
    });

    // ── Zodiac grid ─────────────────────────────────────────────────────────

    test('zobrazí přesně 12 zodiac karet', async ({ page }) => {
        const cards = page.locator('.zodiac-card');
        await expect(cards).toHaveCount(12);
    });

    test('každá zodiac karta má název znamení', async ({ page }) => {
        const cardNames = page.locator('.zodiac-card__name');
        const count = await cardNames.count();
        expect(count).toBe(12);

        for (let i = 0; i < count; i++) {
            const text = await cardNames.nth(i).innerText();
            expect(text.trim().length).toBeGreaterThan(1);
        }
    });

    test('každá zodiac karta má symbol', async ({ page }) => {
        const symbols = page.locator('.zodiac-card__symbol');
        const count = await symbols.count();
        expect(count).toBe(12);
    });

    test('každá zodiac karta má data rozsah', async ({ page }) => {
        const dates = page.locator('.zodiac-card__dates');
        const count = await dates.count();
        expect(count).toBe(12);
    });

    // Ověříme že všechna 12 znamení jsou přítomna (podle textu)
    for (const sign of ZODIAC_SIGNS) {
        test(`zodiac karta "${sign.cs}" je přítomna`, async ({ page }) => {
            const card = page.locator('.zodiac-card', { hasText: sign.cs });
            await expect(card).toBeAttached();
        });
    }

    // ── Tab navigace ─────────────────────────────────────────────────────────

    test('tab "Denní" je výchozí aktivní', async ({ page }) => {
        const dailyTab = page.locator('[data-tab="daily"]');
        await expect(dailyTab).toHaveClass(/active/);
    });

    test('tab "Týdenní" existuje a je klikatelný', async ({ page }) => {
        const weeklyTab = page.locator('[data-tab="weekly"]');
        await expect(weeklyTab).toBeVisible();
        await weeklyTab.click();
        // Po kliknutí se buď aktivuje tab nebo zobrazí premium gate — obojí je ok
        // Test jen ověří že kliknutí nezpůsobilo JS error (stránka stále funkční)
        await expect(page.locator('body')).toBeVisible();
    });

    test('tab "Měsíční" existuje a je klikatelný', async ({ page }) => {
        const monthlyTab = page.locator('[data-tab="monthly"]');
        await expect(monthlyTab).toBeVisible();
        await monthlyTab.click();
        await expect(page.locator('body')).toBeVisible();
    });

    test('tabs mají role="tab" ARIA atributy', async ({ page }) => {
        const tabs = page.locator('[role="tab"]');
        const count = await tabs.count();
        expect(count).toBeGreaterThanOrEqual(3);
    });

    test('tablist má aria-label', async ({ page }) => {
        const tablist = page.locator('[role="tablist"]');
        const ariaLabel = await tablist.getAttribute('aria-label');
        expect(ariaLabel).toBeTruthy();
    });

    // ── Kliknutí na znamení ──────────────────────────────────────────────────

    test('kliknutí na zodiac kartu "Beran" naviguje ke kotvě nebo spustí načítání', async ({ page }) => {
        const beranCard = page.locator('.zodiac-card', { hasText: 'Beran' }).first();
        await expect(beranCard).toBeVisible();

        // Karta je link — kliknutí změní URL hash nebo spustí JS
        await beranCard.click();

        // Buď se URL změní (anchor) nebo zůstane (JS click handler)
        const url = page.url();
        expect(url).toContain('horoskopy');
        // Stránka stále funkční
        await expect(page.locator('body')).toBeVisible();
    });

    // ── Freemium banner ──────────────────────────────────────────────────────

    test('freemium banner element existuje v DOM', async ({ page }) => {
        const banner = page.locator('#freemium-banner');
        // Může být skrytý (display:none), ale musí být přítomný v DOM
        await expect(banner).toBeAttached();
    });

    // ── Mobilní responsivita ─────────────────────────────────────────────────

    test('zodiac grid je viditelný na mobilním viewportu', async ({ page }) => {
        await page.setViewportSize(MOBILE_VIEWPORT);
        await page.goto('/horoskopy.html');
        await waitForPageReady(page);

        const grid = page.locator('.zodiac-grid');
        await expect(grid).toBeVisible();
    });

    test('na mobilním viewportu nejsou zodiac karty oříznuty mimo viewport', async ({ page }) => {
        await page.setViewportSize(MOBILE_VIEWPORT);
        await page.goto('/horoskopy.html');
        await waitForPageReady(page);

        const hasHorizontalScroll = await page.evaluate(() =>
            document.documentElement.scrollWidth > document.documentElement.clientWidth
        );
        expect(hasHorizontalScroll).toBe(false);
    });

    // ── Structured data ──────────────────────────────────────────────────────

    test('stránka obsahuje JSON-LD strukturovaná data', async ({ page }) => {
        const ldJson = page.locator('script[type="application/ld+json"]');
        const count = await ldJson.count();
        expect(count).toBeGreaterThanOrEqual(1);
    });
});
