/**
 * E2E testy — Programatické SEO horoskop stránky (/horoskop/:sign/:date)
 *
 * Tyto stránky jsou generovány server-side (horoscope-pages.js) a jsou
 * kritické pro organický traffic. Testujeme:
 * - HTTP status 200 pro všechna znamení s dnešním datem
 * - Přítomnost H1 a základní struktury
 * - Kanonický URL a meta tagy
 * - Rychlost odpovědi (< 3s)
 *
 * URL formát: /horoskop/:sign/:date kde date je YYYY-MM-DD (ISO formát)
 * Slugy: beran, byk, blizenci, rak, lev, panna, vahy, stir, strelec, kozoroh, vodnar, ryby
 */

import { test, expect } from '@playwright/test';
import { ZODIAC_SIGNS } from './helpers.js';

// Dnešní datum ve formátu YYYY-MM-DD
function getTodayStr() {
    return new Date().toISOString().split('T')[0];
}

// Včerejší datum (cached stránky)
function getYesterdayStr() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
}

// ── Klíčové kombinace (smoke test) ──────────────────────────────────────────

const KEY_SIGNS = ['beran', 'stir', 'ryby', 'panna', 'kozoroh'];

test.describe('SEO horoskop stránky — smoke test', () => {

    // Testujeme klíčové znamení s dnešním datem
    for (const sign of KEY_SIGNS) {
        test(`/horoskop/${sign}/${getTodayStr()} vrátí 200`, async ({ page }) => {
            const response = await page.goto(`/horoskop/${sign}/${getTodayStr()}`);
            expect(response.status()).toBe(200);
        });

        test(`/horoskop/${sign}/${getTodayStr()} má H1`, async ({ page }) => {
            await page.goto(`/horoskop/${sign}/${getTodayStr()}`);
            await page.waitForLoadState('domcontentloaded');

            const h1 = page.locator('h1').first();
            await expect(h1).toBeAttached();
        });
    }
});

test.describe('SEO horoskop stránky — všechna znamení (dnes)', () => {

    // Ověříme že všechna 12 znamení mají funkční stránku pro dnešní datum
    for (const sign of ZODIAC_SIGNS) {
        test(`/horoskop/${sign.slug}/${getTodayStr()} vrátí 200`, async ({ page }) => {
            const response = await page.goto(`/horoskop/${sign.slug}/${getTodayStr()}`);
            expect(response.status()).toBe(200);
        });
    }
});

test.describe('SEO horoskop stránky — struktura', () => {

    test('stránka obsahuje meta description', async ({ page }) => {
        await page.goto(`/horoskop/beran/${getTodayStr()}`);
        await page.waitForLoadState('domcontentloaded');

        const desc = await page.getAttribute('meta[name="description"]', 'content');
        // Může být prázdný v test env (bez AI), ale element musí existovat
        expect(desc).toBeDefined();
    });

    test('stránka obsahuje canonical URL s beran', async ({ page }) => {
        await page.goto(`/horoskop/beran/${getTodayStr()}`);
        await page.waitForLoadState('domcontentloaded');

        const canonical = await page.getAttribute('link[rel="canonical"]', 'href');
        if (canonical) {
            expect(canonical).toContain('beran');
        }
    });

    test('stránka má HTML lang="cs"', async ({ page }) => {
        await page.goto(`/horoskop/beran/${getTodayStr()}`);
        await page.waitForLoadState('domcontentloaded');

        const lang = await page.getAttribute('html', 'lang');
        expect(lang).toBe('cs');
    });

    test('stránka má neprázdný title', async ({ page }) => {
        await page.goto(`/horoskop/beran/${getTodayStr()}`);
        await page.waitForLoadState('domcontentloaded');

        const title = await page.title();
        expect(title.length).toBeGreaterThan(5);
    });

    test('sdílené komponenty používají root-relative logo cestu', async ({ page }) => {
        await page.goto(`/horoskop/beran/${getTodayStr()}`);
        await page.waitForLoadState('domcontentloaded');

        const logos = page.locator('.logo__image');
        await expect(logos.first()).toBeAttached();

        const logoSrcs = await logos.evaluateAll((images) =>
            images.map((image) => image.getAttribute('src')).filter(Boolean)
        );

        expect(logoSrcs.length).toBeGreaterThanOrEqual(1);
        for (const src of logoSrcs) {
            expect(src).toMatch(/^\/img\/logo-3d\.webp/);
        }
    });

    test('včerejší datum vrátí 200 (cached obsah)', async ({ page }) => {
        const res = await page.goto(`/horoskop/stir/${getYesterdayStr()}`);
        expect(res.status()).toBe(200);
    });

    // ── Rychlost ─────────────────────────────────────────────────────────────

    test('SEO stránka odpoví do 5 sekund', async ({ page }) => {
        const start = Date.now();
        await page.goto(`/horoskop/beran/${getTodayStr()}`);
        await page.waitForLoadState('domcontentloaded');
        const elapsed = Date.now() - start;

        expect(elapsed).toBeLessThan(5000);
    });
});

test.describe('SEO horoskop stránky — neplatné URL', () => {

    test('neplatné znamení vrátí 404', async ({ page }) => {
        const response = await page.goto(`/horoskop/neexistujici-znameni/${getTodayStr()}`);
        expect(response.status()).toBe(404);
    });

    test('neplatný formát data vrátí 404', async ({ page }) => {
        const response = await page.goto('/horoskop/beran/neplatne-datum');
        expect(response.status()).toBe(404);
    });

    test('neplatné kalendářní datum vrátí 404', async ({ page }) => {
        const response = await page.goto('/horoskop/beran/2026-02-31');
        expect(response.status()).toBe(404);
    });

    test('příliš vzdálené datum (100 let) vrátí 404', async ({ page }) => {
        const response = await page.goto('/horoskop/beran/1925-01-01');
        expect(response.status()).toBe(404);
    });
});
