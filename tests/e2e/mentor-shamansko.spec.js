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
