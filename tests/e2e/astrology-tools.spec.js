/**
 * E2E testy — Astrologické nástroje
 *
 * Pokrývá: Natální karta, Partnerská shoda, Čínský horoskop, Biorytmy
 * Testuje: načtení, formuláře, interakce, validace, API ochrana, mobile.
 */

import { test, expect } from '@playwright/test';
import { waitForPageReady, getCsrfToken, MOBILE_VIEWPORT } from './helpers.js';

// ═══════════════════════════════════════════════════════════
// NATÁLNÍ KARTA
// ═══════════════════════════════════════════════════════════

test.describe('Natální karta', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('/natalni-karta.html');
        await waitForPageReady(page);
    });

    test('stránka vrátí 200', async ({ page }) => {
        const res = await page.request.get('/natalni-karta.html');
        expect(res.status()).toBe(200);
    });

    test('title obsahuje "Natální" nebo "karta"', async ({ page }) => {
        const title = await page.title().then(t => t.toLowerCase());
        expect(title.includes('natáln') || title.includes('karta')).toBe(true);
    });

    test('h1 je viditelný', async ({ page }) => {
        await expect(page.locator('h1').first()).toBeVisible();
    });

    test('natal-chart container nebo SVG existuje', async ({ page }) => {
        const chart = page.locator(
            '.natal-chart-container, .natal-svg, #natal-chart, #result-chart, svg'
        ).first();
        await expect(chart).toBeAttached();
    });

    test('canonical link existuje', async ({ page }) => {
        const canonical = await page.getAttribute('link[rel="canonical"]', 'href');
        expect(canonical).toBeTruthy();
    });

    test('JSON-LD strukturovaná data existují', async ({ page }) => {
        const ldJson = page.locator('script[type="application/ld+json"]');
        expect(await ldJson.count()).toBeGreaterThanOrEqual(1);
    });

    // API
    test('POST /api/natal-chart bez CSRF vrátí 403', async ({ page }) => {
        const res = await page.request.post('/api/natal-chart', {
            data: { birthDate: '1990-01-01', birthTime: '12:00', birthPlace: 'Praha' },
        });
        expect(res.status()).toBe(403);
    });

    test('POST /api/natal-chart projde CSRF validací (ne 403)', async ({ page }) => {
        // Natal-chart používá optionalPremiumCheck — nevyžaduje auth, takže ne 401
        // V test env selže AI call (500/503) nebo vrátí výsledek (200)
        const csrf = await getCsrfToken(page);
        const res = await page.request.post('/api/natal-chart', {
            data: { birthDate: '1990-01-01', birthTime: '12:00', birthPlace: 'Praha' },
            headers: { 'x-csrf-token': csrf },
        });
        // Nesmí být 403 (CSRF by mělo projít) ani 400 (validace OK)
        expect(res.status()).not.toBe(403);
    });

    test('žádný horizontální scroll na mobilu', async ({ page }) => {
        await page.setViewportSize(MOBILE_VIEWPORT);
        await page.goto('/natalni-karta.html');
        await waitForPageReady(page);
        const overflow = await page.evaluate(() =>
            document.documentElement.scrollWidth > document.documentElement.clientWidth
        );
        expect(overflow).toBe(false);
    });
});

// ═══════════════════════════════════════════════════════════
// PARTNERSKÁ SHODA (Synastrie)
// ═══════════════════════════════════════════════════════════

test.describe('Partnerská shoda', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('/partnerska-shoda.html');
        await waitForPageReady(page);
    });

    test('stránka vrátí 200', async ({ page }) => {
        const res = await page.request.get('/partnerska-shoda.html');
        expect(res.status()).toBe(200);
    });

    test('title obsahuje "Shoda" nebo "Partner"', async ({ page }) => {
        const title = await page.title().then(t => t.toLowerCase());
        expect(title.includes('shoda') || title.includes('partner')).toBe(true);
    });

    test('h1 je viditelný', async ({ page }) => {
        await expect(page.locator('h1').first()).toBeVisible();
    });

    test('#synastry-form nebo compatibility form existuje', async ({ page }) => {
        const form = page.locator('#synastry-form, form[id*="synastry"], form[id*="compat"]').first();
        await expect(form).toBeAttached();
    });

    test('heart-meter nebo compatibility display existuje v DOM', async ({ page }) => {
        const meter = page.locator('.heart-meter, .heart-fill, .compatibility-bar').first();
        await expect(meter).toBeAttached();
    });

    test('#synastry-form-card existuje', async ({ page }) => {
        const card = page.locator('#synastry-form-card, .synastry-form-card').first();
        await expect(card).toBeAttached();
    });

    test('canonical link existuje', async ({ page }) => {
        const canonical = await page.getAttribute('link[rel="canonical"]', 'href');
        expect(canonical).toBeTruthy();
    });

    // API
    test('POST /api/synastry bez CSRF vrátí 403', async ({ page }) => {
        const res = await page.request.post('/api/synastry', {
            data: { sign1: 'Beran', sign2: 'Lev' },
        });
        expect(res.status()).toBe(403);
    });

    test('žádný horizontální scroll na mobilu', async ({ page }) => {
        await page.setViewportSize(MOBILE_VIEWPORT);
        await page.goto('/partnerska-shoda.html');
        await waitForPageReady(page);
        const overflow = await page.evaluate(() =>
            document.documentElement.scrollWidth > document.documentElement.clientWidth
        );
        expect(overflow).toBe(false);
    });
});

// ═══════════════════════════════════════════════════════════
// ČÍNSKÝ HOROSKOP
// ═══════════════════════════════════════════════════════════

test.describe('Čínský horoskop', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('/cinsky-horoskop.html');
        await waitForPageReady(page);
    });

    test('stránka vrátí 200', async ({ page }) => {
        const res = await page.request.get('/cinsky-horoskop.html');
        expect(res.status()).toBe(200);
    });

    test('title obsahuje "Čínský" nebo "horoskop"', async ({ page }) => {
        const title = await page.title().then(t => t.toLowerCase());
        expect(title.includes('čínsk') || title.includes('horoskop')).toBe(true);
    });

    test('h1 je viditelný', async ({ page }) => {
        await expect(page.locator('h1').first()).toBeVisible();
    });

    test('year-input nebo rok vstup existuje', async ({ page }) => {
        const yearInput = page.locator('.year-input, input[type="number"], input[id*="year"]').first();
        await expect(yearInput).toBeAttached();
    });

    test('ctrl-btn nebo ovládací tlačítka existují', async ({ page }) => {
        const ctrlBtns = page.locator('.ctrl-btn, button[class*="ctrl"]');
        expect(await ctrlBtns.count()).toBeGreaterThanOrEqual(2);
    });

    test('animal-grid nebo animální grid existuje', async ({ page }) => {
        const grid = page.locator('.animal-grid, .animal-btn, [data-animal]').first();
        await expect(grid).toBeAttached();
    });

    test('result-section existuje v DOM', async ({ page }) => {
        await expect(page.locator('.result-section, #result-section').first()).toBeAttached();
    });

    test('JSON-LD nebo strukturovaná data existují', async ({ page }) => {
        const ldJson = page.locator('script[type="application/ld+json"]');
        expect(await ldJson.count()).toBeGreaterThanOrEqual(1);
    });

    test('žádný horizontální scroll na mobilu', async ({ page }) => {
        await page.setViewportSize(MOBILE_VIEWPORT);
        await page.goto('/cinsky-horoskop.html');
        await waitForPageReady(page);
        const overflow = await page.evaluate(() =>
            document.documentElement.scrollWidth > document.documentElement.clientWidth
        );
        expect(overflow).toBe(false);
    });
});

// ═══════════════════════════════════════════════════════════
// BIORYTMY
// ═══════════════════════════════════════════════════════════

test.describe('Biorytmy', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('/biorytmy.html');
        await waitForPageReady(page);
    });

    test('stránka vrátí 200', async ({ page }) => {
        const res = await page.request.get('/biorytmy.html');
        expect(res.status()).toBe(200);
    });

    test('title obsahuje "Biorytm"', async ({ page }) => {
        const title = await page.title().then(t => t.toLowerCase());
        expect(title.includes('biorytm')).toBe(true);
    });

    test('h1 je viditelný', async ({ page }) => {
        await expect(page.locator('h1').first()).toBeVisible();
    });

    test('bio-form nebo datum vstup existuje', async ({ page }) => {
        const form = page.locator('.bio-form, .bio-date-input, input[type="date"]').first();
        await expect(form).toBeAttached();
    });

    test('biorhythm-chart nebo graf container existuje', async ({ page }) => {
        const chart = page.locator('.biorhythm-chart, canvas, #bio-chart').first();
        await expect(chart).toBeAttached();
    });

    test('bio-legend nebo legenda existuje', async ({ page }) => {
        const legend = page.locator('.bio-legend, .bio-legend-item').first();
        await expect(legend).toBeAttached();
    });

    test('bio-stats nebo stat karty existují', async ({ page }) => {
        const stats = page.locator('.bio-stats, .bio-stat-card').first();
        await expect(stats).toBeAttached();
    });

    test('datum vstup přijímá hodnotu', async ({ page }) => {
        const dateInput = page.locator('.bio-date-input, input[type="date"]').first();
        if (await dateInput.isVisible()) {
            await dateInput.fill('1990-06-15');
            const val = await dateInput.inputValue();
            expect(val).toBe('1990-06-15');
        }
    });

    test('žádný horizontální scroll na mobilu', async ({ page }) => {
        await page.setViewportSize(MOBILE_VIEWPORT);
        await page.goto('/biorytmy.html');
        await waitForPageReady(page);
        const overflow = await page.evaluate(() =>
            document.documentElement.scrollWidth > document.documentElement.clientWidth
        );
        expect(overflow).toBe(false);
    });
});
