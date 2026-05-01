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

    test('místo narození nabízí podporovaná města', async ({ page }) => {
        await expect(page.locator('#birth-place')).toHaveAttribute('list', 'birth-place-suggestions');
        await expect(page.locator('#birth-place-suggestions option[value="Praha"]')).toBeAttached();
        await expect(page.locator('#birth-place-suggestions option[value="Mladá Boleslav"]')).toBeAttached();
        await expect(page.locator('#birth-place-suggestions option[value="Krakov"]')).toBeAttached();
    });

    test('místo narození se hydratuje ze serverového seznamu', async ({ page }) => {
        await page.route('**/api/birth-locations', route => route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                success: true,
                locations: [
                    { name: 'Testovací Město', country: 'CZ' }
                ]
            })
        }));

        await page.reload();
        await waitForPageReady(page);

        await expect(page.locator('#birth-place-suggestions option[value="Testovací Město"]')).toBeAttached();
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

    test('veřejný formulář zobrazí vypočtené astro prvky a tranzity', async ({ page }) => {
        await page.fill('#name', 'Test');
        await page.fill('#birth-date', '1990-01-01');
        await page.fill('#birth-time', '12:00');
        await page.fill('#birth-place', 'Praha');
        await page.locator('#natal-form button[type="submit"]').click();

        await expect(page.locator('#chart-results')).toBeVisible();
        await expect(page.locator('#res-sun')).toContainText('Kozoroh');
        await expect(page.locator('#res-moon')).not.toHaveText('--');
        await expect(page.locator('#res-asc')).not.toHaveText('--');
        await expect(page.locator('#natal-element-value')).not.toHaveText('--');
        await expect(page.locator('#natal-planets-list li')).toHaveCount(10);
        await expect(page.locator('#natal-planets-list')).toContainText('Pluto');
        await expect(page.locator('#natal-aspects-list li').first()).not.toContainText('Výpočet se zobrazí');
        await expect(page.locator('#zodiac-ring .natal-zodiac-tick')).toHaveCount(72);
        await expect(page.locator('#houses-layer .natal-house-line')).toHaveCount(12);
        await expect(page.locator('#aspects-layer .natal-aspect-line').first()).toBeAttached();
        await expect(page.locator('#aspects-layer .natal-aspect-label').first()).toContainText('°');
        await expect(page.locator('#planets-layer animateTransform')).toHaveCount(0);
        await expect(page.locator('#transits-now')).toBeVisible();
        await expect(page.locator('#transit-message')).not.toContainText('Načítám');
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

    test('detailní rozpad obsahuje stabilitu vztahu', async ({ page }) => {
        await expect(page.locator('#score-stability')).toBeAttached();
        await expect(page.locator('#bar-stability')).toBeAttached();
    });

    test('#synastry-form-card existuje', async ({ page }) => {
        const card = page.locator('#synastry-form-card, .synastry-form-card').first();
        await expect(card).toBeAttached();
    });

    test('formulář přijímá volitelný čas a místo narození', async ({ page }) => {
        await expect(page.locator('#p1-time')).toBeVisible();
        await expect(page.locator('#p1-place')).toBeVisible();
        await expect(page.locator('#p2-time')).toBeVisible();
        await expect(page.locator('#p2-place')).toBeVisible();
        await expect(page.locator('#p1-place')).toHaveAttribute('list', 'birth-place-suggestions');
        await expect(page.locator('#p2-place')).toHaveAttribute('list', 'birth-place-suggestions');
        await expect(page.locator('#birth-place-suggestions option[value="Varšava"]')).toBeAttached();

        await page.fill('#p1-name', 'Anna');
        await page.fill('#p1-date', '1990-01-01');
        await page.fill('#p1-time', '12:00');
        await page.fill('#p1-place', 'Praha');
        await page.fill('#p2-name', 'Pavel');
        await page.fill('#p2-date', '1992-07-15');
        await page.fill('#p2-time', '08:30');
        await page.fill('#p2-place', 'Brno');

        await page.locator('#synastry-form button[type="submit"]').click();

        await expect(page.locator('#synastry-results')).toBeVisible();
        await expect(page.locator('#synastry-engine-summary')).toContainText('Astro výpočet vztahu');
        await expect(page.locator('#synastry-engine-summary')).toContainText('ASC');
        await expect(page.locator('#synastry-engine-summary')).toContainText('čas + rozpoznané místo');
        await expect(page.locator('#total-score')).toContainText('%');
    });

    test('po vypoctu zobrazi navazujici vztahovy bridge s premium kontextem', async ({ page }) => {
        await page.fill('#p1-name', 'Anna');
        await page.fill('#p1-date', '1990-01-01');
        await page.fill('#p2-name', 'Pavel');
        await page.fill('#p2-date', '1992-07-15');

        await page.locator('#synastry-form button[type="submit"]').click();

        await expect(page.locator('#synastry-results')).toBeVisible();
        await expect(page.locator('#synastry-next-step')).toBeVisible();
        await expect(page.locator('.synastry-next-card')).toHaveCount(4);
        await expect(page.locator('#synastry-next-score')).toContainText('%');

        const premiumBridge = page.locator('[data-synastry-upgrade]');
        await expect(premiumBridge).toHaveAttribute('href', /source=partner_match_result/);
        await expect(premiumBridge).toHaveAttribute('href', /feature=partnerska_detail/);
    });

    test('trust a FAQ bloky jsou dostupne pro SEO i rozhodovani', async ({ page }) => {
        await expect(page.locator('.synastry-trust-item')).toHaveCount(3);
        await expect(page.locator('.synastry-faq-item')).toHaveCount(4);

        const faqJson = await page.locator('script[type="application/ld+json"]').evaluateAll((nodes) =>
            nodes.map((node) => node.textContent || '').find((text) => text.includes('"@type": "FAQPage"'))
        );
        expect(faqJson).toBeTruthy();
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
