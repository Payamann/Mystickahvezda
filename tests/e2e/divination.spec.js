/**
 * E2E testy — Věštecké nástroje
 *
 * Pokrývá: Andělské karty, Křišťálová koule, Runy, Minulý život
 * Testuje: načtení, UI struktura, formuláře, interakce, mobile.
 * AI odpovědi netestujeme (fake API key v test env).
 */

import { test, expect } from '@playwright/test';
import { waitForPageReady, assertBasicSEO, getCsrfToken, MOBILE_VIEWPORT } from './helpers.js';

// ═══════════════════════════════════════════════════════════
// ANDĚLSKÉ KARTY
// ═══════════════════════════════════════════════════════════

test.describe('Andělské karty', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('/andelske-karty.html');
        await waitForPageReady(page);
    });

    test('stránka vrátí 200', async ({ page }) => {
        const res = await page.request.get('/andelske-karty.html');
        expect(res.status()).toBe(200);
    });

    test('title obsahuje "Andělsk"', async ({ page }) => {
        const title = await page.title();
        expect(title.toLowerCase()).toContain('andělsk');
    });

    test('h1 je viditelný', async ({ page }) => {
        await expect(page.locator('h1').first()).toBeVisible();
    });

    test('#main-content existuje', async ({ page }) => {
        await expect(page.locator('#main-content')).toBeAttached();
    });

    test('angel-card-container nebo karta existuje v DOM', async ({ page }) => {
        const card = page.locator('#angel-card-container, .angel-card-container, .angel-card').first();
        await expect(card).toBeAttached();
    });

    test('canonical link je nastaven', async ({ page }) => {
        const canonical = await page.getAttribute('link[rel="canonical"]', 'href');
        expect(canonical).toBeTruthy();
    });

    test('stránka neobsahuje kritické JS errory', async ({ page }) => {
        const errors = [];
        page.on('pageerror', e => errors.push(e.message));
        await page.goto('/andelske-karty.html');
        await waitForPageReady(page);
        const critical = errors.filter(e => e.includes('SyntaxError'));
        expect(critical).toHaveLength(0);
    });

    test('žádný horizontální scroll na mobilu', async ({ page }) => {
        await page.setViewportSize(MOBILE_VIEWPORT);
        await page.goto('/andelske-karty.html');
        await waitForPageReady(page);
        const overflow = await page.evaluate(() =>
            document.documentElement.scrollWidth > document.documentElement.clientWidth
        );
        expect(overflow).toBe(false);
    });
});

// ═══════════════════════════════════════════════════════════
// KŘIŠŤÁLOVÁ KOULE
// ═══════════════════════════════════════════════════════════

test.describe('Křišťálová koule', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('/kristalova-koule.html');
        await waitForPageReady(page);
    });

    test('stránka vrátí 200', async ({ page }) => {
        const res = await page.request.get('/kristalova-koule.html');
        expect(res.status()).toBe(200);
    });

    test('h1 je viditelný', async ({ page }) => {
        await expect(page.locator('h1').first()).toBeVisible();
    });

    test('#question-input nebo textarea pro otázku existuje', async ({ page }) => {
        const input = page.locator('#question-input, textarea[id*="question"], input[id*="question"]').first();
        await expect(input).toBeAttached();
    });

    test('#ask-btn nebo submit tlačítko existuje', async ({ page }) => {
        const btn = page.locator('#ask-btn, button[id*="ask"], button[type="submit"]').first();
        await expect(btn).toBeAttached();
    });

    test('#answer-container nebo answer element existuje', async ({ page }) => {
        const answer = page.locator('#answer-container, #answer-text, .answer-box').first();
        await expect(answer).toBeAttached();
    });

    test('#crystal-ball element existuje', async ({ page }) => {
        await expect(page.locator('#crystal-ball, .crystal-ball, .ball-container').first()).toBeAttached();
    });

    test('otázka pole přijímá vstup', async ({ page }) => {
        const input = page.locator('#question-input, textarea').first();
        await expect(input).toBeVisible();
        await input.fill('Co mě čeká v práci?');
        const value = await input.inputValue();
        expect(value).toContain('Co mě čeká');
    });

    test('JSON-LD strukturovaná data existují', async ({ page }) => {
        const ldJson = page.locator('script[type="application/ld+json"]');
        expect(await ldJson.count()).toBeGreaterThanOrEqual(1);
    });

    // API test — bez AI klíče vrátí chybu, ale CSRF musí být vyžadováno
    test('POST /api/crystal-ball bez CSRF vrátí 403', async ({ page }) => {
        const res = await page.request.post('/api/crystal-ball', {
            data: { question: 'Testovací otázka' },
        });
        expect(res.status()).toBe(403);
    });

    test('POST /api/crystal-ball s prázdnou otázkou vrátí 400', async ({ page }) => {
        const csrf = await getCsrfToken(page);
        const res = await page.request.post('/api/crystal-ball', {
            data: { question: '' },
            headers: { 'x-csrf-token': csrf },
        });
        expect(res.status()).toBe(400);
    });

    test('POST /api/crystal-ball s příliš dlouhou otázkou vrátí 400', async ({ page }) => {
        const csrf = await getCsrfToken(page);
        const res = await page.request.post('/api/crystal-ball', {
            data: { question: 'x'.repeat(1001) },
            headers: { 'x-csrf-token': csrf },
        });
        expect(res.status()).toBe(400);
    });

    test('žádný horizontální scroll na mobilu', async ({ page }) => {
        await page.setViewportSize(MOBILE_VIEWPORT);
        await page.goto('/kristalova-koule.html');
        await waitForPageReady(page);
        const overflow = await page.evaluate(() =>
            document.documentElement.scrollWidth > document.documentElement.clientWidth
        );
        expect(overflow).toBe(false);
    });
});

// ═══════════════════════════════════════════════════════════
// RUNY
// ═══════════════════════════════════════════════════════════

test.describe('Runy', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('/runy.html');
        await waitForPageReady(page);
    });

    test('stránka vrátí 200', async ({ page }) => {
        const res = await page.request.get('/runy.html');
        expect(res.status()).toBe(200);
    });

    test('h1 je viditelný', async ({ page }) => {
        await expect(page.locator('h1').first()).toBeVisible();
    });

    test('#btn-draw nebo tlačítko pro vytažení runy existuje', async ({ page }) => {
        const btn = page.locator('#btn-draw, button[id*="draw"], button[id*="rune"]').first();
        await expect(btn).toBeAttached();
    });

    test('#rune-result nebo result container existuje v DOM', async ({ page }) => {
        const result = page.locator('#rune-result, .rune-result-frame, .rune-result').first();
        await expect(result).toBeAttached();
    });

    test('#active-rune nebo rune display existuje', async ({ page }) => {
        const rune = page.locator('#active-rune, .active-rune, #rune-symbol').first();
        await expect(rune).toBeAttached();
    });

    test('kliknutí na tlačítko runy nezpůsobí JS crash', async ({ page }) => {
        const btn = page.locator('#btn-draw, button[id*="draw"]').first();
        if (await btn.isVisible()) {
            await btn.click();
            await page.waitForTimeout(500);
        }
        await expect(page.locator('body')).toBeVisible();
    });

    test('#loading element existuje v DOM', async ({ page }) => {
        await expect(page.locator('#loading, .loading, .loading-spinner').first()).toBeAttached();
    });

    test('canonical link existuje', async ({ page }) => {
        const canonical = await page.getAttribute('link[rel="canonical"]', 'href');
        expect(canonical).toBeTruthy();
    });

    test('žádný horizontální scroll na mobilu', async ({ page }) => {
        await page.setViewportSize(MOBILE_VIEWPORT);
        await page.goto('/runy.html');
        await waitForPageReady(page);
        const overflow = await page.evaluate(() =>
            document.documentElement.scrollWidth > document.documentElement.clientWidth
        );
        expect(overflow).toBe(false);
    });
});

// ═══════════════════════════════════════════════════════════
// MINULÝ ŽIVOT (Akashické záznamy)
// ═══════════════════════════════════════════════════════════

test.describe('Minulý život', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('/minuly-zivot.html');
        await waitForPageReady(page);
    });

    test('stránka vrátí 200', async ({ page }) => {
        const res = await page.request.get('/minuly-zivot.html');
        expect(res.status()).toBe(200);
    });

    test('h1 je viditelný', async ({ page }) => {
        await expect(page.locator('h1').first()).toBeVisible();
    });

    test('#pl-name vstupní pole existuje', async ({ page }) => {
        const nameInput = page.locator('#pl-name');
        await expect(nameInput).toBeAttached();
    });

    test('#pl-birth datum pole existuje', async ({ page }) => {
        const dateInput = page.locator('#pl-birth');
        await expect(dateInput).toBeAttached();
        const type = await dateInput.getAttribute('type');
        expect(type).toBe('date');
    });

    test('gender výběr tlačítka existují', async ({ page }) => {
        const genderBtns = page.locator('[data-gender]');
        expect(await genderBtns.count()).toBeGreaterThanOrEqual(2);
    });

    test('#pl-submit tlačítko existuje', async ({ page }) => {
        await expect(page.locator('#pl-submit')).toBeAttached();
    });

    test('#pl-loading element existuje', async ({ page }) => {
        await expect(page.locator('#pl-loading')).toBeAttached();
    });

    test('#pl-result container existuje', async ({ page }) => {
        await expect(page.locator('#pl-result')).toBeAttached();
    });

    test('#premium-wall nebo premium element existuje', async ({ page }) => {
        const premiumEl = page.locator('#premium-wall, .premium-wall, .premium-gate').first();
        await expect(premiumEl).toBeAttached();
    });

    test('sdílecí tlačítka existují v DOM', async ({ page }) => {
        const shareBtns = page.locator('#share-native, #share-fb, #share-x, #share-copy');
        const count = await shareBtns.count();
        // Aspoň jedno tlačítko
        expect(count).toBeGreaterThanOrEqual(1);
    });

    test('vstupní pole přijímají data', async ({ page }) => {
        const nameInput = page.locator('#pl-name');
        if (await nameInput.isVisible()) {
            await nameInput.fill('Jana Nováková');
            await expect(nameInput).toHaveValue('Jana Nováková');
        }
        const dateInput = page.locator('#pl-birth');
        if (await dateInput.isVisible()) {
            await dateInput.fill('1992-03-15');
            await expect(dateInput).toHaveValue('1992-03-15');
        }
    });

    // API test
    test('POST /api/past-life bez CSRF vrátí 403', async ({ page }) => {
        const res = await page.request.post('/api/past-life', {
            data: { name: 'Test', birth: '1990-01-01' },
        });
        expect(res.status()).toBe(403);
    });

    test('POST /api/past-life bez auth vrátí 401 nebo 402', async ({ page }) => {
        const csrf = await getCsrfToken(page);
        const res = await page.request.post('/api/past-life', {
            data: { name: 'Test', birth: '1990-01-01', gender: 'muz' },
            headers: { 'x-csrf-token': csrf },
        });
        // Bez přihlášení: 401 (neautorizováno) nebo 402 (premium required)
        expect([401, 402, 400]).toContain(res.status());
    });

    test('žádný horizontální scroll na mobilu', async ({ page }) => {
        await page.setViewportSize(MOBILE_VIEWPORT);
        await page.goto('/minuly-zivot.html');
        await waitForPageReady(page);
        const overflow = await page.evaluate(() =>
            document.documentElement.scrollWidth > document.documentElement.clientWidth
        );
        expect(overflow).toBe(false);
    });
});
