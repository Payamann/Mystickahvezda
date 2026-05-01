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

    test('jedna karta zobrazí konkrétní interpretaci', async ({ page }) => {
        const trigger = page.locator('[data-spread-type="Jedna karta"]').first();
        await expect(trigger).toBeVisible();
        await trigger.click();

        await expect(page.locator('#tarot-results')).toBeVisible({ timeout: 9000 });
        await expect(page.locator('#tarot-results .tarot-flip-card')).toHaveCount(1);
        await expect(page.locator('#interpretations-container')).toContainText('INTERPRETACE', { timeout: 9000 });
        await expect(page.locator('.tarot-practical-advice')).toBeVisible();
    });

    test('free teaser pro tři karty ukáže zamčené karty a pošle funnel event', async ({ page }) => {
        await page.evaluate(() => {
            localStorage.removeItem('tarot_free_usage');
            window.Auth = {
                isLoggedIn: () => true,
                isPremium: () => false,
                showToast: () => {},
                saveReading: async () => ({ id: 'test-reading' })
            };
            window.getCSRFToken = async () => 'test-csrf-token';
            window.__tarotFunnelEvents = [];

            const originalFetch = window.fetch.bind(window);
            window.fetch = async (input, init = {}) => {
                const url = typeof input === 'string' ? input : input?.url;
                if (url && url.includes('/api/payment/funnel-event')) {
                    window.__tarotFunnelEvents.push(JSON.parse(init.body || '{}'));
                    return new Response(JSON.stringify({ success: true }), {
                        status: 200,
                        headers: { 'Content-Type': 'application/json' }
                    });
                }
                return originalFetch(input, init);
            };
        });

        await page.locator('[data-spread-type="Tři karty"]').first().click();

        await expect(page.locator('#tarot-results')).toBeVisible({ timeout: 9000 });
        await expect(page.locator('#tarot-results .tarot-flip-card')).toHaveCount(3);
        await expect(page.locator('#tarot-results .locked-card')).toHaveCount(2);
        await expect(page.locator('.tarot-soft-gate')).toContainText('Odemkněte celý tříkartový výklad');

        await expect.poll(() => page.evaluate(() => window.__tarotFunnelEvents.length)).toBeGreaterThan(0);
        const events = await page.evaluate(() => window.__tarotFunnelEvents);
        expect(events).toContainEqual(expect.objectContaining({
            eventName: 'paywall_viewed',
            source: 'tarot_teaser_banner',
            feature: 'tarot_multi_card',
            planId: 'pruvodce'
        }));
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

// ── Význam tarotových karet ─────────────────────────────────────────────────

test.describe('Tarot význam karet', () => {
    test('hub načte 78 karet a umí filtrovat katalog', async ({ page }) => {
        await page.goto('/tarot-vyznam-karet.html');
        await waitForPageReady(page);

        await expect(page.locator('h1')).toContainText('Význam tarotových karet');

        const canonical = await page.getAttribute('link[rel="canonical"]', 'href');
        expect(canonical).toContain('tarot-vyznam-karet.html');

        await expect(page.locator('.tarot-meaning-card')).toHaveCount(78, { timeout: 9000 });

        await page.locator('#tarot-card-search').fill('Hvězda');
        await expect(page.locator('.tarot-meaning-card h3')).toContainText('Hvězda');
        const searchCount = await page.locator('.tarot-meaning-card').count();
        expect(searchCount).toBeGreaterThanOrEqual(1);
        expect(searchCount).toBeLessThan(78);

        await page.locator('#tarot-card-search').fill('');
        await page.locator('[data-tarot-filter="cups"]').click();
        await expect(page.locator('.tarot-meaning-card')).toHaveCount(14);

        const hasHorizontalScroll = await page.evaluate(() =>
            document.documentElement.scrollWidth > document.documentElement.clientWidth
        );
        expect(hasHorizontalScroll).toBe(false);

        await page.setViewportSize(MOBILE_VIEWPORT);
        await page.goto('/tarot-vyznam-karet.html');
        await waitForPageReady(page);

        await expect(page.locator('.tarot-meaning-card')).toHaveCount(78, { timeout: 9000 });
        const hasMobileHorizontalScroll = await page.evaluate(() =>
            document.documentElement.scrollWidth > document.documentElement.clientWidth
        );
        expect(hasMobileHorizontalScroll).toBe(false);
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

    test('po výběru karty ukáže další kroky a prémiový bridge', async ({ page }) => {
        await page.goto('/tarot-ano-ne.html');
        await waitForPageReady(page);

        await page.fill('#question-input', 'Mám dnes udělat první krok?');
        await page.locator('.tarot-card').first().click();

        await expect(page.locator('#result-panel')).toHaveClass(/show/, { timeout: 2500 });
        await expect(page.locator('#tarot-yes-no-next-step')).toBeVisible();
        await expect(page.locator('.tarot-yes-no-next-card')).toHaveCount(4);

        const upgradeLink = page.locator('[data-tarot-yes-no-upgrade]').first();
        await expect(upgradeLink).toBeVisible();
        const href = await upgradeLink.getAttribute('href');
        expect(href).toContain('plan=pruvodce');
        expect(href).toContain('source=tarot_yes_no_result');
        expect(href).toContain('feature=tarot_multi_card');
    });

    test('výsledek tarot ano/ne lze uložit jako sdílitelný obrázek', async ({ page }) => {
        await page.goto('/tarot-ano-ne.html');
        await waitForPageReady(page);

        await page.fill('#question-input', 'Mám dnes udělat první krok?');
        await page.locator('.tarot-card').first().click();

        await expect(page.locator('#result-panel')).toHaveClass(/show/, { timeout: 2500 });
        await expect(page.locator('#btn-save-result-image')).toBeVisible();
        await expect.poll(() => page.evaluate(() => Boolean(window.__lastTarotYesNoShareResult))).toBe(true);

        const downloadPromise = page.waitForEvent('download');
        await page.locator('#btn-save-result-image').click();
        const download = await downloadPromise;
        expect(download.suggestedFilename()).toMatch(/^tarot-ano-ne-.+\.png$/);
    });

    test('obsahuje trust strip, FAQ blok a FAQ schema markup', async ({ page }) => {
        await page.goto('/tarot-ano-ne.html');
        await waitForPageReady(page);

        await expect(page.locator('.tarot-yes-no-trust-item')).toHaveCount(3);
        await expect(page.locator('.tarot-yes-no-faq-item')).toHaveCount(4);

        const ldTypes = await page.locator('script[type="application/ld+json"]').evaluateAll((scripts) => scripts.map((script) => {
            try {
                return JSON.parse(script.textContent || '{}')['@type'];
            } catch {
                return null;
            }
        }));

        expect(ldTypes).toContain('FAQPage');
    });

    test('výsledek a další kroky nerozbíjí mobilní layout', async ({ page }) => {
        await page.setViewportSize(MOBILE_VIEWPORT);
        await page.goto('/tarot-ano-ne.html');
        await waitForPageReady(page);

        await page.fill('#question-input', 'Mám tomu dát ještě šanci?');
        await page.locator('.tarot-card').first().click();

        await expect(page.locator('#tarot-yes-no-next-step')).toBeVisible({ timeout: 2500 });

        const hasHorizontalScroll = await page.evaluate(() =>
            document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
        );
        expect(hasHorizontalScroll).toBe(false);
    });

    test('mobilní cookie lišta nepřekrývá akce výsledku', async ({ page }) => {
        await page.setViewportSize({ width: 393, height: 851 });
        await page.addInitScript(() => {
            localStorage.removeItem('mh_cookie_prefs');
            localStorage.removeItem('cookieConsent');
        });
        await page.goto('/tarot-ano-ne.html');
        await waitForPageReady(page);

        await page.fill('#question-input', 'Mám tomu dát ještě šanci?');
        await page.locator('.tarot-card').first().click();

        await expect(page.locator('#result-panel')).toHaveClass(/show/, { timeout: 2500 });
        await expect(page.locator('#cookie-banner')).toBeVisible({ timeout: 4500 });
        await expect(page.locator('#cookie-banner')).toHaveClass(/visible/, { timeout: 5000 });
        await page.waitForTimeout(700);

        const metrics = await page.evaluate(() => {
            const bannerRect = document.getElementById('cookie-banner').getBoundingClientRect();
            const resetRect = document.getElementById('btn-reset').getBoundingClientRect();
            return {
                bannerHeight: bannerRect.height,
                bannerTop: bannerRect.top,
                resetBottom: resetRect.bottom,
                viewportHeight: window.innerHeight
            };
        });

        expect(metrics.bannerHeight).toBeLessThan(180);
        expect(metrics.resetBottom).toBeLessThanOrEqual(metrics.bannerTop - 8);
        expect(metrics.bannerTop).toBeLessThan(metrics.viewportHeight);
    });
});
