/**
 * E2E testy — Mentor (Hvězdný průvodce) + Šamanské kolo
 *
 * Mentor: AI chat UI — testujeme strukturu chatu, vstup, odeslání.
 * Šamanské kolo: formulář pro medicina wheel.
 */

import { test, expect } from '@playwright/test';
import { waitForPageReady, getCsrfToken, MOBILE_VIEWPORT } from './helpers.js';

// ═══════════════════════════════════════════════════════════
// MENTOR — Hvězdný průvodce (AI Chat)
// ═══════════════════════════════════════════════════════════

test.describe('Mentor — Hvězdný průvodce', () => {

    test.beforeEach(async ({ page }) => {
        await page.context().addCookies([{
            name: 'logged_in',
            value: '1',
            url: 'http://localhost:3001'
        }]);

        await page.addInitScript(() => {
            localStorage.setItem('auth_user', JSON.stringify({
                id: 'e2e-mentor-user',
                email: 'mentor-e2e@example.com',
                subscription_status: 'free'
            }));
        });
        await page.goto('/mentor.html');
        await waitForPageReady(page);
    });

    test('stránka vrátí 200', async ({ page }) => {
        const res = await page.request.get('/mentor.html');
        expect(res.status()).toBe(200);
    });

    test('title obsahuje "Průvodce" nebo "Mentor"', async ({ page }) => {
        const title = await page.title().then(t => t.toLowerCase());
        expect(title.includes('průvodce') || title.includes('mentor')).toBe(true);
    });

    test('h1 je viditelný', async ({ page }) => {
        await expect(page.locator('h1').first()).toBeVisible();
    });

    test('chat-container nebo chat UI existuje', async ({ page }) => {
        const chat = page.locator('.chat-container, #chat-container, .chat').first();
        await expect(chat).toBeAttached();
    });

    test('#chat-input nebo textarea pro zprávu existuje', async ({ page }) => {
        const input = page.locator('#chat-input, textarea[id*="chat"], textarea').first();
        await expect(input).toBeAttached();
    });

    test('send-btn nebo tlačítko pro odeslání existuje', async ({ page }) => {
        const btn = page.locator('.send-btn, button[class*="send"], button[id*="send"]').first();
        await expect(btn).toBeAttached();
    });

    test('chat-messages kontejner existuje', async ({ page }) => {
        const msgs = page.locator('.chat-messages, #chat-messages').first();
        await expect(msgs).toBeAttached();
    });

    test('chat input přijímá text', async ({ page }) => {
        const input = page.locator('#chat-input, textarea').first();
        if (await input.isVisible()) {
            await input.fill('Jaký je můj horoskop dnes?');
            const val = await input.inputValue();
            expect(val).toContain('horoskop');
        }
    });

    test('starter otazky vyplni chat a povoli odeslani', async ({ page }) => {
        const starters = page.locator('.mentor-starter-card');
        await expect(starters).toHaveCount(4);

        await starters.filter({ hasText: 'Rozhodnutí' }).click();

        const input = page.locator('#chat-input');
        await expect(input).toHaveValue(/strach a co intuice/);
        await expect(page.locator('#send-btn')).toBeEnabled();
    });

    test('premium gate copy v bundle komunikuje konkrétní hodnotu bez vágní moudrosti hvězd', async ({ page }) => {
        const response = await page.request.get('/js/dist/mentor.js');
        expect(response.status()).toBe(200);
        const source = await response.text();

        expect(source).toContain('del\\u0161\\xED rozhovor');
        expect(source).toContain('historii souvislost');
        expect(source).toContain('konkr\\xE9tn\\u011Bj\\u0161\\xED dal\\u0161\\xED kroky');
        expect(source).toContain('Pokra\\u010Dovat s Premium');
        expect(source).not.toContain('moudrosti hv');
        expect(source).not.toContain('neomezen\\xFD p');
    });

    // API test
    test('POST /api/mentor/chat bez CSRF vrátí 403', async ({ page }) => {
        const res = await page.request.post('/api/mentor/chat', {
            data: { message: 'Ahoj, poraď mi' },
        });
        expect(res.status()).toBe(403);
    });

    test('POST /api/mentor/chat bez auth vrátí 401 nebo 402', async ({ page }) => {
        const csrf = await getCsrfToken(page);
        const res = await page.request.post('/api/mentor/chat', {
            data: { message: 'Testovací zpráva' },
            headers: { 'x-csrf-token': csrf },
        });
        // Bez přihlášení
        expect([400, 401, 402]).toContain(res.status());
    });

    test('žádný horizontální scroll na mobilu', async ({ page }) => {
        await page.setViewportSize(MOBILE_VIEWPORT);
        await page.goto('/mentor.html');
        await waitForPageReady(page);
        const overflow = await page.evaluate(() =>
            document.documentElement.scrollWidth > document.documentElement.clientWidth
        );
        expect(overflow).toBe(false);
    });
});

// ═══════════════════════════════════════════════════════════
// ŠAMANSKÉ KOLO (Medicine Wheel)
// ═══════════════════════════════════════════════════════════

test.describe('Šamanské kolo', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('/shamansko-kolo.html');
        await waitForPageReady(page);
    });

    test('stránka vrátí 200', async ({ page }) => {
        const res = await page.request.get('/shamansko-kolo.html');
        expect(res.status()).toBe(200);
    });

    test('title obsahuje "Šamanské" nebo "kolo"', async ({ page }) => {
        const title = await page.title().then(t => t.toLowerCase());
        expect(title.includes('šamanské') || title.includes('kolo') || title.includes('shaman')).toBe(true);
    });

    test('h1 je viditelný', async ({ page }) => {
        await expect(page.locator('h1').first()).toBeVisible();
    });

    test('#mw-form nebo formulář existuje', async ({ page }) => {
        const form = page.locator('#mw-form, form[id*="mw"], .mw-form').first();
        await expect(form).toBeAttached();
    });

    test('stranka rozlisuje kdy pouzit samanske kolo', async ({ page }) => {
        const cluster = page.locator('.mw-intent-section');
        await expect(cluster).toBeVisible();
        await expect(cluster.locator('.mw-intent-card')).toHaveCount(6);
        await expect(cluster.locator('[data-analytics-cta="shaman_wheel_intent_birth"]')).toHaveAttribute('href', '#mw-form-section');
        await expect(cluster.locator('[data-analytics-cta="shaman_wheel_intent_runes"]')).toHaveAttribute('href', /runy\.html/);
        await expect(cluster.locator('[data-analytics-cta="shaman_wheel_intent_mentor"]')).toHaveAttribute('href', /mentor\.html/);
    });

    test('.mw-submit-btn nebo submit tlačítko existuje', async ({ page }) => {
        const btn = page.locator('.mw-submit-btn, button[class*="mw-submit"], button[type="submit"]').first();
        await expect(btn).toBeAttached();
    });

    test('#mw-result-content nebo result container existuje', async ({ page }) => {
        const result = page.locator('#mw-result-content, .mw-result-section, .mw-result').first();
        await expect(result).toBeAttached();
    });

    test('premium gate nebo result container existuje v DOM', async ({ page }) => {
        // Premium wall nebo výsledkový kontejner — jeden z nich musí být přítomen
        const el = page.locator('#mw-premium-wall, .mw-premium-wall, #mw-result, .mw-result').first();
        await expect(el).toBeAttached();
    });

    test('datum pole existuje', async ({ page }) => {
        const dateInput = page.locator('input[type="date"]').first();
        await expect(dateInput).toBeAttached();
    });

    test('datum pole přijímá hodnotu', async ({ page }) => {
        const dateInput = page.locator('input[type="date"]').first();
        if (await dateInput.isVisible()) {
            await dateInput.fill('1988-09-21');
            await expect(dateInput).toHaveValue('1988-09-21');
        }
    });

    // API
    test('POST /api/medicine-wheel bez CSRF vrátí 403', async ({ page }) => {
        const res = await page.request.post('/api/medicine-wheel', {
            data: { birthDate: '1990-01-01' },
        });
        expect(res.status()).toBe(403);
    });

    test('POST /api/medicine-wheel bez auth vrátí 401 nebo 402', async ({ page }) => {
        const csrf = await getCsrfToken(page);
        const res = await page.request.post('/api/medicine-wheel', {
            data: { birthDate: '1990-01-01', name: 'Test' },
            headers: { 'x-csrf-token': csrf },
        });
        expect([400, 401, 402]).toContain(res.status());
    });

    test('žádný horizontální scroll na mobilu', async ({ page }) => {
        await page.setViewportSize(MOBILE_VIEWPORT);
        await page.goto('/shamansko-kolo.html');
        await waitForPageReady(page);
        const overflow = await page.evaluate(() =>
            document.documentElement.scrollWidth > document.documentElement.clientWidth
        );
        expect(overflow).toBe(false);
    });
});
