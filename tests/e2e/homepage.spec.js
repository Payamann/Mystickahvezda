/**
 * E2E testy — Homepage (index.html)
 *
 * Testuje: načtení, SEO meta tagy, hero sekce, klíčové CTA, PWA manifest,
 * bezpečnostní hlavičky, mobilní responsivitu.
 */

import { test, expect } from '@playwright/test';
import { waitForPageReady, assertBasicSEO, assertSecurityHeaders, MOBILE_VIEWPORT } from './helpers.js';

test.describe('Homepage', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await waitForPageReady(page);
    });

    // ── Základní načtení ────────────────────────────────────────────────────

    test('stránka se načte a vrátí 200', async ({ page }) => {
        const response = await page.request.get('/');
        expect(response.status()).toBe(200);
    });

    test('title obsahuje "Mystická Hvězda"', async ({ page }) => {
        await assertBasicSEO(page, { titleContains: 'Mystická Hvězda' });
    });

    test('meta description je neprázdný', async ({ page }) => {
        const desc = await page.getAttribute('meta[name="description"]', 'content');
        expect(desc).toBeTruthy();
        expect(desc.length).toBeGreaterThan(20);
    });

    test('lang atribut je nastaven na "cs"', async ({ page }) => {
        const lang = await page.getAttribute('html', 'lang');
        expect(lang).toBe('cs');
    });

    // ── Struktura stránky ────────────────────────────────────────────────────

    test('main#main-content nebo main existuje', async ({ page }) => {
        // Může být id="main-content" nebo prostý <main>
        const mainCount = await page.locator('main').count();
        expect(mainCount).toBeGreaterThanOrEqual(1);
    });

    test('hero sekce je viditelná', async ({ page }) => {
        // Hero section nebo první výrazná headline
        const hero = page.locator('.section--hero, .hero, [class*="hero"]').first();
        await expect(hero).toBeVisible();
    });

    test('h1 tag existuje a obsahuje text', async ({ page }) => {
        const h1 = page.locator('h1').first();
        await expect(h1).toBeVisible();
        const text = await h1.innerText();
        expect(text.trim().length).toBeGreaterThan(2);
    });

    // ── SEO & strukturovaná data ─────────────────────────────────────────────

    test('canonical link je nastaven', async ({ page }) => {
        const canonical = await page.getAttribute('link[rel="canonical"]', 'href');
        expect(canonical).toBeTruthy();
        expect(canonical).toContain('mystickahvezda.cz');
    });

    test('Open Graph title je nastaven', async ({ page }) => {
        const ogTitle = await page.getAttribute('meta[property="og:title"]', 'content');
        expect(ogTitle).toBeTruthy();
    });

    test('Open Graph image je nastaven', async ({ page }) => {
        const ogImage = await page.getAttribute('meta[property="og:image"]', 'content');
        expect(ogImage).toBeTruthy();
    });

    // ── PWA ─────────────────────────────────────────────────────────────────

    test('manifest.json je dostupný', async ({ page }) => {
        const response = await page.request.get('/manifest.json');
        expect(response.status()).toBe(200);
        const json = await response.json();
        expect(json.name).toBeTruthy();
    });

    test('theme-color meta tag existuje', async ({ page }) => {
        const themeColor = await page.getAttribute('meta[name="theme-color"]', 'content');
        expect(themeColor).toBeTruthy();
    });

    // ── Bezpečnostní hlavičky ────────────────────────────────────────────────

    test('bezpečnostní hlavičky jsou přítomny', async ({ page }) => {
        await assertSecurityHeaders(page, '/');
    });

    // ── Navigace ────────────────────────────────────────────────────────────

    test('stránka obsahuje odkaz na horoskopy', async ({ page }) => {
        const link = page.locator('a[href*="horoskop"]').first();
        await expect(link).toBeAttached();
    });

    test('stránka obsahuje odkaz na tarot', async ({ page }) => {
        const link = page.locator('a[href*="tarot"]').first();
        await expect(link).toBeAttached();
    });

    test('skip-link pro přístupnost existuje', async ({ page }) => {
        const skipLink = page.locator('.skip-link, a[href="#main-content"]').first();
        await expect(skipLink).toBeAttached();
    });

    // ── Mobilní responsivita ────────────────────────────────────────────────

    test('homepage nemá horizontální scroll na mobilním viewportu', async ({ page }) => {
        await page.setViewportSize(MOBILE_VIEWPORT);
        await page.goto('/');
        await waitForPageReady(page);

        const hasHorizontalScroll = await page.evaluate(() =>
            document.documentElement.scrollWidth > document.documentElement.clientWidth
        );
        expect(hasHorizontalScroll).toBe(false);
    });

    test('h1 je viditelný na mobilním viewportu', async ({ page }) => {
        await page.setViewportSize(MOBILE_VIEWPORT);
        await page.goto('/');
        await waitForPageReady(page);

        const h1 = page.locator('h1').first();
        await expect(h1).toBeVisible();
    });
});
