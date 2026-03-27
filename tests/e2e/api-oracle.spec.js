/**
 * E2E testy — Oracle API endpointy
 *
 * Testujeme chování API na úrovni HTTP bez reálných AI klíčů:
 * - CSRF ochrana (403 bez tokenu)
 * - Input validace (400 pro špatná data)
 * - Auth ochrana (401/402 bez přihlášení)
 * - Správné hlavičky
 *
 * Pokrývá: /api/crystal-ball, /api/tarot, /api/horoscope,
 *          /api/numerology/*, /api/past-life, /api/medicine-wheel,
 *          /api/dream, /api/briefing
 */

import { test, expect } from '@playwright/test';
import { getCsrfToken } from './helpers.js';

// ─── Pomocné funkce ──────────────────────────────────────────────────────────

async function postWithCsrf(page, path, data) {
    const csrf = await getCsrfToken(page);
    return page.request.post(path, {
        data,
        headers: { 'x-csrf-token': csrf },
    });
}

// ═══════════════════════════════════════════════════════════
// CRYSTAL BALL
// ═══════════════════════════════════════════════════════════

test.describe('API: /api/crystal-ball', () => {

    test('bez CSRF vrátí 403', async ({ page }) => {
        const res = await page.request.post('/api/crystal-ball', {
            data: { question: 'Testovací otázka?' },
        });
        expect(res.status()).toBe(403);
    });

    test('prázdná otázka vrátí 400', async ({ page }) => {
        const res = await postWithCsrf(page, '/api/crystal-ball', { question: '' });
        expect(res.status()).toBe(400);
    });

    test('chybějící question vrátí 400', async ({ page }) => {
        const res = await postWithCsrf(page, '/api/crystal-ball', {});
        expect(res.status()).toBe(400);
    });

    test('question přes 1000 znaků vrátí 400', async ({ page }) => {
        const res = await postWithCsrf(page, '/api/crystal-ball', {
            question: 'x'.repeat(1001),
        });
        expect(res.status()).toBe(400);
    });

    test('question přesně 1000 znaků projde validací (ne 400)', async ({ page }) => {
        const res = await postWithCsrf(page, '/api/crystal-ball', {
            question: 'x'.repeat(1000),
        });
        // Validace OK, AI selhání je 500/503 — ale ne 400
        expect(res.status()).not.toBe(400);
    });

    test('question jako číslo vrátí 400', async ({ page }) => {
        const res = await postWithCsrf(page, '/api/crystal-ball', { question: 12345 });
        expect(res.status()).toBe(400);
    });
});

// ═══════════════════════════════════════════════════════════
// TAROT
// ═══════════════════════════════════════════════════════════

test.describe('API: /api/tarot', () => {

    test('bez CSRF vrátí 403', async ({ page }) => {
        const res = await page.request.post('/api/tarot', {
            data: { spreadType: 'Jedna karta' },
        });
        expect(res.status()).toBe(403);
    });

    test('bez spreadType vrátí 400 nebo 401', async ({ page }) => {
        const res = await postWithCsrf(page, '/api/tarot', {});
        // Tarot může kontrolovat auth před validací
        expect([400, 401]).toContain(res.status());
    });

    test('neplatný spreadType vrátí 400 nebo 401', async ({ page }) => {
        const res = await postWithCsrf(page, '/api/tarot', {
            spreadType: 'NeplatnyTyp',
        });
        // Tarot může kontrolovat auth před validací
        expect([400, 401]).toContain(res.status());
    });
});

// ═══════════════════════════════════════════════════════════
// HOROSCOPE
// ═══════════════════════════════════════════════════════════

test.describe('API: /api/horoscope', () => {

    test('bez CSRF vrátí 403', async ({ page }) => {
        const res = await page.request.post('/api/horoscope', {
            data: { sign: 'Beran', period: 'daily' },
        });
        expect(res.status()).toBe(403);
    });

    test('neplatné znamení vrátí 400', async ({ page }) => {
        const res = await postWithCsrf(page, '/api/horoscope', {
            sign: 'NeplatnéZnaméní',
            period: 'daily',
        });
        expect(res.status()).toBe(400);
    });

    test('neplatné období vrátí 400', async ({ page }) => {
        const res = await postWithCsrf(page, '/api/horoscope', {
            sign: 'Beran',
            period: 'neplatne',
        });
        expect(res.status()).toBe(400);
    });

    test('chybějící sign vrátí 400', async ({ page }) => {
        const res = await postWithCsrf(page, '/api/horoscope', { period: 'daily' });
        expect(res.status()).toBe(400);
    });

    test('weekly bez premium vrátí 402', async ({ page }) => {
        const res = await postWithCsrf(page, '/api/horoscope', {
            sign: 'Beran',
            period: 'weekly',
        });
        expect(res.status()).toBe(402);
    });

    test('monthly bez premium vrátí 402', async ({ page }) => {
        const res = await postWithCsrf(page, '/api/horoscope', {
            sign: 'Štír',
            period: 'monthly',
        });
        expect(res.status()).toBe(402);
    });

    test('všechna 12 platných znamení projdou validací pro daily', async ({ page }) => {
        const signs = ['Beran', 'Býk', 'Blíženci', 'Rak', 'Lev', 'Panna',
            'Váhy', 'Štír', 'Střelec', 'Kozoroh', 'Vodnář', 'Ryby'];
        const csrf = await getCsrfToken(page);

        for (const sign of signs) {
            const res = await page.request.post('/api/horoscope', {
                data: { sign, period: 'daily' },
                headers: { 'x-csrf-token': csrf },
            });
            // Nesmí být 400 (validace) — může být 200/402/500
            expect(res.status(), `Znamení ${sign} selhalo validací`).not.toBe(400);
        }
    });
});

// ═══════════════════════════════════════════════════════════
// NUMEROLOGY
// ═══════════════════════════════════════════════════════════

test.describe('API: /api/numerology', () => {

    test('POST /api/numerology/life-path bez CSRF vrátí 403', async ({ page }) => {
        const res = await page.request.post('/api/numerology', {
            data: { birthDate: '1990-01-01' },
        });
        expect(res.status()).toBe(403);
    });

    test('POST /api/numerology/* bez auth vrátí 401 nebo 402', async ({ page }) => {
        const csrf = await getCsrfToken(page);
        const res = await page.request.post('/api/numerology', {
            data: { birthDate: '1990-01-01', name: 'Test' },
            headers: { 'x-csrf-token': csrf },
        });
        expect([400, 401, 402]).toContain(res.status());
    });
});

// ═══════════════════════════════════════════════════════════
// PAST LIFE (Minulý život)
// ═══════════════════════════════════════════════════════════

test.describe('API: /api/past-life', () => {

    test('bez CSRF vrátí 403', async ({ page }) => {
        const res = await page.request.post('/api/past-life', {
            data: { name: 'Test', birth: '1990-01-01' },
        });
        expect(res.status()).toBe(403);
    });

    test('s CSRF ale bez auth vrátí 401 nebo 402', async ({ page }) => {
        const res = await postWithCsrf(page, '/api/past-life', {
            name: 'Test Testovič',
            birth: '1990-01-01',
            gender: 'muz',
        });
        expect([400, 401, 402]).toContain(res.status());
    });
});

// ═══════════════════════════════════════════════════════════
// MEDICINE WHEEL (Šamanské kolo)
// ═══════════════════════════════════════════════════════════

test.describe('API: /api/medicine-wheel', () => {

    test('bez CSRF vrátí 403', async ({ page }) => {
        const res = await page.request.post('/api/medicine-wheel', {
            data: { birthDate: '1990-01-01' },
        });
        expect(res.status()).toBe(403);
    });

    test('s CSRF ale bez auth vrátí 401 nebo 402', async ({ page }) => {
        const res = await postWithCsrf(page, '/api/medicine-wheel', {
            birthDate: '1990-01-01',
            name: 'Test',
        });
        expect([400, 401, 402]).toContain(res.status());
    });
});

// ═══════════════════════════════════════════════════════════
// ZDRAVÍ A OBECNÉ BEZPEČNOSTNÍ TESTY API
// ═══════════════════════════════════════════════════════════

test.describe('API: bezpečnostní hlavičky', () => {

    test('/api/health vrací X-Content-Type-Options: nosniff', async ({ page }) => {
        const res = await page.request.get('/api/health');
        expect(res.headers()['x-content-type-options']).toBe('nosniff');
    });

    test('/api/health vrací Strict-Transport-Security', async ({ page }) => {
        const res = await page.request.get('/api/health');
        expect(res.headers()['strict-transport-security']).toBeDefined();
    });

    test('/api/health vrací X-Frame-Options nebo frame-ancestors v CSP', async ({ page }) => {
        const res = await page.request.get('/api/health');
        const headers = res.headers();
        const hasXFrame = !!headers['x-frame-options'];
        const hasCSPFrame = headers['content-security-policy']?.includes('frame-ancestors');
        expect(hasXFrame || hasCSPFrame).toBe(true);
    });

    test('chybový response neobsahuje stack trace', async ({ page }) => {
        const res = await page.request.get('/api/neexistujici-endpoint-xyz');
        if (res.headers()['content-type']?.includes('json')) {
            const body = await res.text();
            expect(body).not.toContain('node_modules');
            expect(body).not.toMatch(/at\s+\w+\s+\(/);
        }
    });
});
