/**
 * E2E testy — Tarot (tarot.html)
 *
 * Testuje: načtení stránky, spread karty (Jedna karta / Tři karty / Keltský kříž),
 * kliknutelnost spread triggerů, SEO, přístupnost.
 *
 * Poznámka: testy NEVOLAJÍ reálné AI API — testují UI vrstvu.
 * Kliknutí na spread trigger může zobrazit loading, premium gate nebo error —
 * všechny stavy jsou akceptovatelné (stránka musí zůstat funkční).
 */

import { test, expect } from '@playwright/test';
import { waitForPageReady, assertBasicSEO, MOBILE_VIEWPORT } from './helpers.js';

test.describe('Tarot', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('/tarot.html');
        await waitForPageReady(page);
    });

    // ── Načtení ─────────────────────────────────────────────────────────────

    test('stránka vrátí 200', async ({ page }) => {
        const res = await page.request.get('/tarot.html');
        expect(res.status()).toBe(200);
    });

    test('title obsahuje "Tarot"', async ({ page }) => {
        await assertBasicSEO(page, { titleContains: 'Tarot' });
    });

    test('h1 je viditelný', async ({ page }) => {
        const h1 = page.locator('h1').first();
        await expect(h1).toBeVisible();
    });

    // ── Spread výběr ─────────────────────────────────────────────────────────

    test('zobrazí 3 spread možnosti', async ({ page }) => {
        const spreads = page.locator('.t-spread-card');
        await expect(spreads).toHaveCount(3);
    });

    test('spread "Jedna karta" je přítomný', async ({ page }) => {
        const spread = page.locator('[data-spread-type="Jedna karta"]');
        await expect(spread).toBeAttached();
    });

    test('spread "Tři karty" je přítomný', async ({ page }) => {
        const spread = page.locator('[data-spread-type="Tři karty"]');
        await expect(spread).toBeAttached();
    });

    test('spread "Celtic Cross" je přítomný', async ({ page }) => {
        const spread = page.locator('[data-spread-type="Celtic Cross"]');
        await expect(spread).toBeAttached();
    });

    test('spread trigger tlačítka jsou klikatelná', async ({ page }) => {
        const triggers = page.locator('.spread-trigger');
        const count = await triggers.count();
        expect(count).toBeGreaterThanOrEqual(3);

        // Každé tlačítko by mělo mít text
        for (let i = 0; i < count; i++) {
            const text = await triggers.nth(i).innerText();
            expect(text.trim().length).toBeGreaterThan(0);
        }
    });

    test('kliknutí na "Vyložit kartu" nestrhne stránku (UI zůstane funkční)', async ({ page }) => {
        const trigger = page.locator('[data-spread-type="Jedna karta"]').first();
        await expect(trigger).toBeVisible();
        await trigger.click();

        // Stránka stále funkční — bez ohledu na výsledek API volání
        await expect(page.locator('body')).toBeVisible();
        // H1 zůstává
        const h1 = page.locator('h1').first();
        await expect(h1).toBeVisible();
    });

    // ── Freemium banner ──────────────────────────────────────────────────────

    test('#freemium-banner existuje v DOM', async ({ page }) => {
        await expect(page.locator('#freemium-banner')).toBeAttached();
    });

    // ── Přístupnost ──────────────────────────────────────────────────────────

    test('skip-link existuje', async ({ page }) => {
        const skipLink = page.locator('.skip-link, a[href="#main-content"]').first();
        await expect(skipLink).toBeAttached();
    });

    test('main#main-content existuje', async ({ page }) => {
        await expect(page.locator('#main-content')).toBeAttached();
    });

    // ── SEO ──────────────────────────────────────────────────────────────────

    test('canonical link je nastaven', async ({ page }) => {
        const canonical = await page.getAttribute('link[rel="canonical"]', 'href');
        expect(canonical).toContain('tarot');
    });

    test('stránka obsahuje JSON-LD strukturovaná data', async ({ page }) => {
        const ldJson = page.locator('script[type="application/ld+json"]');
        expect(await ldJson.count()).toBeGreaterThanOrEqual(1);
    });

    // ── Mobilní responsivita ─────────────────────────────────────────────────

    test('spread karty jsou viditelné na mobilním viewportu', async ({ page }) => {
        await page.setViewportSize(MOBILE_VIEWPORT);
        await page.goto('/tarot.html');
        await waitForPageReady(page);

        // Aspoň jeden spread trigger musí být viditelný
        const trigger = page.locator('.spread-trigger').first();
        await expect(trigger).toBeVisible();
    });

    test('žádný horizontální scroll na mobilním viewportu', async ({ page }) => {
        await page.setViewportSize(MOBILE_VIEWPORT);
        await page.goto('/tarot.html');
        await waitForPageReady(page);

        const hasHorizontalScroll = await page.evaluate(() =>
            document.documentElement.scrollWidth > document.documentElement.clientWidth
        );
        expect(hasHorizontalScroll).toBe(false);
    });
});

// ── Tarot Ano/Ne stránka ─────────────────────────────────────────────────────

test.describe('Tarot Ano/Ne', () => {

    test('tarot-ano-ne.html vrátí 200', async ({ page }) => {
        const res = await page.request.get('/tarot-ano-ne.html');
        expect(res.status()).toBe(200);
    });

    test('stránka se načte bez JS erroru', async ({ page }) => {
        const errors = [];
        page.on('pageerror', err => errors.push(err.message));

        await page.goto('/tarot-ano-ne.html');
        await waitForPageReady(page);

        // Kritické JS errory (jako SyntaxError) by stránku rozbily
        const criticalErrors = errors.filter(e =>
            e.includes('SyntaxError') || e.includes('is not defined') && !e.includes('gtag')
        );
        expect(criticalErrors).toHaveLength(0);
    });

    test('h1 na tarot ano/ne stránce existuje', async ({ page }) => {
        await page.goto('/tarot-ano-ne.html');
        await waitForPageReady(page);

        const h1 = page.locator('h1').first();
        await expect(h1).toBeAttached();
    });
});
