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

    test('hero registrace zachovává zdroj a aktivační feature', async ({ page }) => {
        const heroCta = page.locator('#hero-cta-btn');
        await expect(heroCta).toBeVisible();
        const href = await heroCta.getAttribute('href');
        expect(href).toContain('mode=register');
        expect(href).toContain('source=homepage_hero');
        expect(href).toContain('feature=daily_guidance');
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

    test('spodní Premium CTA vede na doporučený plán s tracking kontextem', async ({ page }) => {
        const href = await page.locator('#cta-banner-btn').getAttribute('href');
        expect(href).toContain('plan=pruvodce');
        expect(href).toContain('source=homepage_bottom_cta');
        expect(href).toContain('feature=premium_membership');
    });

    test('pricing preview free plan vede neprihlaseneho na aktivacni registraci', async ({ page }) => {
        await page.evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();
        });
        await page.locator('[data-plan="poutnik"]').click();

        await page.waitForURL(url => url.pathname === '/prihlaseni.html', { timeout: 10000, waitUntil: 'domcontentloaded' });
        const url = new URL(page.url());
        expect(url.searchParams.get('mode')).toBe('register');
        expect(url.searchParams.get('redirect')).toBe('/horoskopy.html');
        expect(url.searchParams.get('source')).toBe('homepage_pricing_free_cta');
        expect(url.searchParams.get('feature')).toBe('daily_guidance');
    });

    test('pricing preview placeny plan ulozi checkout kontext pred registraci', async ({ page }) => {
        await page.evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();
        });
        await page.locator('[data-plan="pruvodce"]').click();

        await page.waitForURL(url => url.pathname === '/prihlaseni.html', { timeout: 10000, waitUntil: 'domcontentloaded' });
        const url = new URL(page.url());
        expect(url.searchParams.get('mode')).toBe('register');
        expect(url.searchParams.get('redirect')).toBe('/cenik.html');
        expect(url.searchParams.get('plan')).toBe('pruvodce');
        expect(url.searchParams.get('source')).toBe('homepage_pricing_preview');
        expect(url.searchParams.get('feature')).toBe('premium_membership');

        const pendingContext = await page.evaluate(() => JSON.parse(sessionStorage.getItem('pending_checkout_context') || '{}'));
        expect(pendingContext).toEqual(expect.objectContaining({
            planId: 'pruvodce',
            source: 'homepage_pricing_preview',
            feature: 'premium_membership',
            redirect: '/cenik.html',
            authMode: 'register'
        }));
    });

    test('pricing preview VIP plan uklada VIP checkout kontext', async ({ page }) => {
        await page.evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();
        });
        await page.locator('[data-plan="vip-majestrat"]').click();

        await page.waitForURL(url => url.pathname === '/prihlaseni.html', { timeout: 10000, waitUntil: 'domcontentloaded' });
        const url = new URL(page.url());
        expect(url.searchParams.get('plan')).toBe('vip-majestrat');
        expect(url.searchParams.get('source')).toBe('homepage_pricing_preview');
        expect(url.searchParams.get('feature')).toBe('vip_membership');

        const pendingContext = await page.evaluate(() => JSON.parse(sessionStorage.getItem('pending_checkout_context') || '{}'));
        expect(pendingContext).toEqual(expect.objectContaining({
            planId: 'vip-majestrat',
            source: 'homepage_pricing_preview',
            feature: 'vip_membership',
            redirect: '/cenik.html',
            authMode: 'register'
        }));
    });

    test('karta dne vede do andelskych karet a sdileni funguje i bez Web Share API', async ({ page }) => {
        await page.evaluate(() => {
            const now = new Date();
            const today = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
            localStorage.setItem('mh_kdd_date', today);
            localStorage.setItem('mh_kdd_index', '27');
            localStorage.removeItem('mh_kdd_last_flip_date');
        });

        await page.reload();
        await waitForPageReady(page);

        const card = page.locator('#kdd-card');
        await card.scrollIntoViewIfNeeded();
        await card.click();

        await expect(page.locator('#kdd-message')).toBeVisible();
        await expect(page.locator('#kdd-name')).toHaveText('Hravost');

        const detailHref = await page.locator('#kdd-lexicon-link').getAttribute('href');
        expect(detailHref).toContain('andelske-karty.html');
        expect(detailHref).toContain('source=homepage_daily_card_detail');
        expect(detailHref).toContain('feature=daily_angel_card');
        expect(detailHref).toContain('daily_card=hravost');
        expect(detailHref).not.toContain('tarot');

        const fullReadingHref = await page.locator('#kdd-full-reading-link').getAttribute('href');
        expect(fullReadingHref).toContain('andelske-karty.html');
        expect(fullReadingHref).toContain('source=homepage_daily_card_full_reading');
        expect(fullReadingHref).toContain('feature=andelske_karty_hluboky_vhled');
        expect(fullReadingHref).toContain('daily_card=hravost');
        expect(fullReadingHref).not.toContain('tarot');

        await page.evaluate(() => {
            Object.defineProperty(navigator, 'share', {
                configurable: true,
                value: undefined
            });
            Object.defineProperty(navigator, 'clipboard', {
                configurable: true,
                value: {
                    writeText: async (text) => {
                        window.__dailyCardShareText = text;
                    }
                }
            });
        });

        await page.locator('#kdd-share-btn').click();

        await expect.poll(() => page.evaluate(() => window.__dailyCardShareText || '')).toContain('Hravost');
        await expect.poll(() => page.evaluate(() => window.__dailyCardShareText || '')).toContain('andelske-karty.html');
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
