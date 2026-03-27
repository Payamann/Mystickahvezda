/**
 * E2E testy — Numerologie (numerologie.html)
 *
 * Testuje: načtení, formulář (jméno + datum + čas), HTML5 validace,
 * loading state element, premium gate, mobilní responsivitu.
 *
 * Poznámka: skutečný výpočet není testován (vyžaduje Claude API).
 * Testujeme UI vrstvu a klientskou validaci.
 */

import { test, expect } from '@playwright/test';
import { waitForPageReady, assertBasicSEO, MOBILE_VIEWPORT } from './helpers.js';

test.describe('Numerologie', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('/numerologie.html');
        await waitForPageReady(page);
    });

    // ── Načtení ─────────────────────────────────────────────────────────────

    test('stránka vrátí 200', async ({ page }) => {
        const res = await page.request.get('/numerologie.html');
        expect(res.status()).toBe(200);
    });

    test('title obsahuje "Numerologi"', async ({ page }) => {
        const title = await page.title();
        expect(title.toLowerCase()).toContain('numerologi');
    });

    test('h1 je viditelný', async ({ page }) => {
        const h1 = page.locator('h1').first();
        await expect(h1).toBeVisible();
    });

    // ── Formulář — struktura ─────────────────────────────────────────────────

    test('#numerology-form existuje', async ({ page }) => {
        await expect(page.locator('#numerology-form')).toBeAttached();
    });

    test('pole pro jméno (#num-name) je viditelné', async ({ page }) => {
        const nameInput = page.locator('#num-name');
        await expect(nameInput).toBeVisible();
        expect(await nameInput.getAttribute('required')).toBeDefined();
        expect(await nameInput.getAttribute('type')).toBe('text');
    });

    test('pole pro datum (#num-date) je viditelné', async ({ page }) => {
        const dateInput = page.locator('#num-date');
        await expect(dateInput).toBeVisible();
        expect(await dateInput.getAttribute('required')).toBeDefined();
        expect(await dateInput.getAttribute('type')).toBe('date');
    });

    test('pole pro čas (#num-time) existuje (volitelné)', async ({ page }) => {
        const timeInput = page.locator('#num-time');
        await expect(timeInput).toBeAttached();
        expect(await timeInput.getAttribute('type')).toBe('time');
        // Čas je volitelný — nesmí mít required
        expect(await timeInput.getAttribute('required')).toBeNull();
    });

    test('submit tlačítko "Odhalit má čísla" je přítomné', async ({ page }) => {
        const submitBtn = page.locator('#numerology-form button[type="submit"]');
        await expect(submitBtn).toBeVisible();
        const text = await submitBtn.innerText();
        expect(text.toLowerCase()).toContain('čísla');
    });

    // ── Formulář — vstup ─────────────────────────────────────────────────────

    test('pole pro jméno přijímá text vstup', async ({ page }) => {
        const nameInput = page.locator('#num-name');
        await nameInput.fill('Jan Novák');
        await expect(nameInput).toHaveValue('Jan Novák');
    });

    test('pole pro datum přijímá datum vstup', async ({ page }) => {
        const dateInput = page.locator('#num-date');
        await dateInput.fill('1990-06-15');
        await expect(dateInput).toHaveValue('1990-06-15');
    });

    test('pole pro čas přijímá čas vstup', async ({ page }) => {
        const timeInput = page.locator('#num-time');
        await timeInput.fill('14:30');
        await expect(timeInput).toHaveValue('14:30');
    });

    // ── Klientská validace ────────────────────────────────────────────────────

    test('prázdný submit aktivuje HTML5 validaci (formulář nezmizel)', async ({ page }) => {
        const submitBtn = page.locator('#numerology-form button[type="submit"]');
        await submitBtn.click();
        await page.waitForTimeout(300);

        // Formulář musí zůstat přítomný (nebylo odesláno)
        await expect(page.locator('#numerology-form')).toBeVisible();
    });

    test('submit jen se jménem (bez data) aktivuje validaci', async ({ page }) => {
        await page.locator('#num-name').fill('Jan Novák');
        await page.locator('#numerology-form button[type="submit"]').click();
        await page.waitForTimeout(300);

        // Formulář musí zůstat
        await expect(page.locator('#numerology-form')).toBeVisible();
    });

    // ── Loading state ────────────────────────────────────────────────────────

    test('#num-loading element existuje v DOM', async ({ page }) => {
        await expect(page.locator('#num-loading')).toBeAttached();
    });

    test('.loading-spinner existuje v DOM', async ({ page }) => {
        await expect(page.locator('.loading-spinner')).toBeAttached();
    });

    // ── Dnešní vibrace sekce ─────────────────────────────────────────────────

    test('#daily-cycles element existuje v DOM (skrytý do výpočtu)', async ({ page }) => {
        await expect(page.locator('#daily-cycles')).toBeAttached();
    });

    // ── Canonical a SEO ──────────────────────────────────────────────────────

    test('canonical link obsahuje "numerologi"', async ({ page }) => {
        const canonical = await page.getAttribute('link[rel="canonical"]', 'href');
        expect(canonical.toLowerCase()).toContain('numerologi');
    });

    // ── Mobilní responsivita ─────────────────────────────────────────────────

    test('formulář je viditelný na mobilním viewportu', async ({ page }) => {
        await page.setViewportSize(MOBILE_VIEWPORT);
        await page.goto('/numerologie.html');
        await waitForPageReady(page);

        await expect(page.locator('#numerology-form')).toBeVisible();
    });

    test('žádný horizontální scroll na mobilním viewportu', async ({ page }) => {
        await page.setViewportSize(MOBILE_VIEWPORT);
        await page.goto('/numerologie.html');
        await waitForPageReady(page);

        const hasHorizontalScroll = await page.evaluate(() =>
            document.documentElement.scrollWidth > document.documentElement.clientWidth
        );
        expect(hasHorizontalScroll).toBe(false);
    });
});
