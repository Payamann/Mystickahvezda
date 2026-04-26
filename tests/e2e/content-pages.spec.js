/**
 * E2E testy — Obsahové a statické stránky
 *
 * Pokrývá: Blog, Ceník, FAQ, Kontakt, Tarot zdarma, Slovník,
 * Jak to funguje, Podmínky, Ochrana soukromí, Aura, Snář,
 * Afirmace, Andělská pošta, Lunace, Astro mapa, Kalkulačka čísla osudu.
 */

import { test, expect } from '@playwright/test';
import { waitForPageReady, getCsrfToken, MOBILE_VIEWPORT } from './helpers.js';

// ─── Pomocná funkce pro opakující se page smoke test ─────────────────────────

async function smokeTest(page, path, titleContains) {
    const res = await page.request.get(path);
    expect(res.status(), `${path} by měla vrátit 200`).toBe(200);

    await page.goto(path, { waitUntil: 'domcontentloaded' });
    await waitForPageReady(page);

    const title = await page.title().then(t => t.toLowerCase());
    if (titleContains) {
        expect(title.includes(titleContains.toLowerCase()), `Title neobsahuje "${titleContains}"`).toBe(true);
    }

    await expect(page.locator('h1').first()).toBeAttached();
}

// ═══════════════════════════════════════════════════════════
// BLOG
// ═══════════════════════════════════════════════════════════

test.describe('Blog', () => {

    test('stránka se načte s 200 a má h1', async ({ page }) => {
        await smokeTest(page, '/blog.html', 'blog');
    });

    test('featured-post nebo blog-grid existuje', async ({ page }) => {
        await page.goto('/blog.html');
        await waitForPageReady(page);
        const content = page.locator('.featured-post, .blog-grid, .blog-card').first();
        await expect(content).toBeAttached();
    });

    test('blog karty jsou přítomné', async ({ page }) => {
        await page.goto('/blog.html');
        await waitForPageReady(page);
        const cards = page.locator('.blog-card, .featured-post, .card[class*="blog"]');
        await expect(cards.first()).toBeAttached();
        const count = await cards.count();
        expect(count).toBeGreaterThanOrEqual(1);
    });

    test('canonical link je nastaven', async ({ page }) => {
        await page.goto('/blog.html');
        const canonical = await page.getAttribute('link[rel="canonical"]', 'href');
        expect(canonical).toBeTruthy();
    });

    test('žádný horizontální scroll na mobilu', async ({ page }) => {
        await page.setViewportSize(MOBILE_VIEWPORT);
        await page.goto('/blog.html');
        await waitForPageReady(page);
        expect(await page.evaluate(() =>
            document.documentElement.scrollWidth > document.documentElement.clientWidth
        )).toBe(false);
    });
});

// ═══════════════════════════════════════════════════════════
// CENÍK
// ═══════════════════════════════════════════════════════════

test.describe('Ceník', () => {

    test('stránka se načte s 200 a má h1', async ({ page }) => {
        await smokeTest(page, '/cenik.html', 'cen');
    });

    test('pricing karty jsou přítomné', async ({ page }) => {
        await page.goto('/cenik.html');
        await waitForPageReady(page);
        const cards = page.locator('.card--pricing, [data-price-plan], .plan-checkout-btn');
        const count = await cards.count();
        expect(count).toBeGreaterThanOrEqual(1);
    });

    test('checkout tlačítka mají data-plan atribut', async ({ page }) => {
        await page.goto('/cenik.html');
        await waitForPageReady(page);
        const btns = page.locator('.plan-checkout-btn, [data-plan]');
        const count = await btns.count();
        if (count > 0) {
            const plan = await btns.first().getAttribute('data-plan');
            expect(plan).toBeTruthy();
        }
    });

    test('billing toggle existuje (měsíční/roční)', async ({ page }) => {
        await page.goto('/cenik.html');
        await waitForPageReady(page);
        const toggle = page.locator('#toggle-monthly, #toggle-yearly, [id*="toggle"]').first();
        await expect(toggle).toBeAttached();
    });

    test('canonical link existuje', async ({ page }) => {
        await page.goto('/cenik.html');
        const canonical = await page.getAttribute('link[rel="canonical"]', 'href');
        expect(canonical).toBeTruthy();
    });

    // Payment API
    test('POST /api/payment/create-checkout-session bez auth vrátí 401', async ({ page }) => {
        await page.goto('/cenik.html');
        const csrf = await getCsrfToken(page);
        const res = await page.request.post('/api/payment/create-checkout-session', {
            data: { planId: 'pruvodce' },
            headers: { 'x-csrf-token': csrf },
        });
        expect(res.status()).toBe(401);
    });

    test('GET /api/payment/subscription/status bez auth vrátí 401', async ({ page }) => {
        const res = await page.request.get('/api/payment/subscription/status');
        expect(res.status()).toBe(401);
    });
});

// ═══════════════════════════════════════════════════════════
// FAQ
// ═══════════════════════════════════════════════════════════

test.describe('FAQ', () => {

    test('stránka se načte a má h1', async ({ page }) => {
        await smokeTest(page, '/faq.html', null);
    });

    test('FAQ otázky jsou přítomné', async ({ page }) => {
        await page.goto('/faq.html');
        await waitForPageReady(page);
        // FAQ typicky používá details/summary nebo vlastní accordion
        const questions = page.locator('details, .faq-item, .accordion-item, .faq__item');
        const count = await questions.count();
        expect(count).toBeGreaterThanOrEqual(1);
    });
});

// ═══════════════════════════════════════════════════════════
// KONTAKT
// ═══════════════════════════════════════════════════════════

test.describe('Kontakt', () => {

    test('stránka se načte a má h1', async ({ page }) => {
        await smokeTest(page, '/kontakt.html', 'kontakt');
    });

    test('#contact-form existuje', async ({ page }) => {
        await page.goto('/kontakt.html', { waitUntil: 'domcontentloaded' });
        await waitForPageReady(page);
        await expect(page.locator('#contact-form')).toBeAttached();
    });

    test('kontaktní pole existují', async ({ page }) => {
        await page.goto('/kontakt.html', { waitUntil: 'domcontentloaded' });
        await waitForPageReady(page);
        await expect(page.locator('#contact-name, input[name="name"]').first()).toBeAttached();
        await expect(page.locator('#contact-email, input[type="email"]').first()).toBeAttached();
        await expect(page.locator('#contact-message, textarea').first()).toBeAttached();
    });

    test('kontaktní formulář přijímá vstup', async ({ page }) => {
        await page.goto('/kontakt.html', { waitUntil: 'domcontentloaded' });
        await waitForPageReady(page);

        const nameInput = page.locator('#contact-name, input[name="name"]').first();
        if (await nameInput.isVisible()) {
            await nameInput.fill('Testovací uživatel');
            await expect(nameInput).toHaveValue('Testovací uživatel');
        }

        const emailInput = page.locator('#contact-email, input[type="email"]').first();
        if (await emailInput.isVisible()) {
            await emailInput.fill('test@example.com');
            await expect(emailInput).toHaveValue('test@example.com');
        }
    });

    test('kontaktni formular odesila na /api/contact s CSRF', async ({ page }) => {
        await page.route('**/api/contact', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ success: true, message: 'OK' }),
            });
        });

        page.on('dialog', dialog => dialog.accept());

        await page.goto('/kontakt.html', { waitUntil: 'domcontentloaded' });
        await waitForPageReady(page);

        await page.fill('#contact-name', 'Test User');
        await page.fill('#contact-email', 'test@example.com');
        await page.fill('#contact-subject', 'Test subject');
        await page.fill('#contact-message', 'This is a test message');

        const contactRequestPromise = page.waitForRequest(request =>
            request.url().endsWith('/api/contact') && request.method() === 'POST'
        );

        await page.click('#contact-form button[type="submit"]');
        const request = await contactRequestPromise;

        expect(request.url()).toContain('/api/contact');
        expect(request.url()).not.toContain('/api/contact/contact');
        expect(request.headers()['x-csrf-token']).toBeTruthy();
        expect(request.postDataJSON()).toEqual({
            name: 'Test User',
            email: 'test@example.com',
            subject: 'Test subject',
            message: 'This is a test message',
        });
    });

    // API
    test('POST /api/contact bez CSRF vrátí 403', async ({ page }) => {
        const res = await page.request.post('/api/contact', {
            data: { name: 'Test', email: 'test@example.com', message: 'Test zpráva' },
        });
        expect(res.status()).toBe(403);
    });

    test('POST /api/contact s prázdnými daty vrátí 400', async ({ page }) => {
        const csrf = await getCsrfToken(page);
        const res = await page.request.post('/api/contact', {
            data: {},
            headers: { 'x-csrf-token': csrf },
        });
        expect([400, 429]).toContain(res.status());
    });
});

// ═══════════════════════════════════════════════════════════
// TAROT ZDARMA (landing)
// ═══════════════════════════════════════════════════════════

test.describe('Tarot zdarma', () => {

    test('stránka se načte a má h1', async ({ page }) => {
        await smokeTest(page, '/tarot-zdarma.html', 'tarot');
    });

    test('demo karty nebo feature karty existují', async ({ page }) => {
        await page.goto('/tarot-zdarma.html');
        await waitForPageReady(page);
        const demos = page.locator('.demo-card, .feature-card, .card-row');
        const count = await demos.count();
        expect(count).toBeGreaterThanOrEqual(1);
    });

    test('CTA odkaz na hlavní tarot stránku existuje', async ({ page }) => {
        await page.goto('/tarot-zdarma.html');
        await waitForPageReady(page);
        const ctaLink = page.locator('a[href*="tarot.html"], a[href*="tarot-ano"]').first();
        await expect(ctaLink).toBeAttached();
    });
});

// ═══════════════════════════════════════════════════════════
// SKUPINOVÝ SMOKE TEST — ostatní stránky
// ═══════════════════════════════════════════════════════════

test.describe('Ostatní stránky — smoke testy (200 + h1)', () => {

    const PAGES = [
        { path: '/o-nas.html',               titleHint: null },
        { path: '/jak-to-funguje.html',       titleHint: null },
        { path: '/podminky.html',             titleHint: null },
        { path: '/ochrana-soukromi.html',     titleHint: null },
        { path: '/soukromi.html',             titleHint: null },
        { path: '/slovnik.html',              titleHint: null },
        { path: '/aura.html',                 titleHint: 'aura' },
        { path: '/snar.html',                 titleHint: null },
        { path: '/afirmace.html',             titleHint: null },
        { path: '/andelska-posta.html',       titleHint: null },
        { path: '/lunace.html',               titleHint: null },
        { path: '/astro-mapa.html',           titleHint: null },
        { path: '/kalkulacka-cisla-osudu.html', titleHint: null },
        { path: '/cinsky-horoskop.html',      titleHint: null },
    ];

    for (const { path, titleHint } of PAGES) {
        test(`${path} vrátí 200`, async ({ page }) => {
            const res = await page.request.get(path);
            expect(res.status(), `${path} by měla vrátit 200`).toBe(200);
        });

        test(`${path} má h1 v DOM`, async ({ page }) => {
            await page.goto(path, { waitUntil: 'domcontentloaded' });
            await waitForPageReady(page);
            await expect(page.locator('h1').first()).toBeAttached();
        });

        test(`${path} nemá horizontální scroll na mobilu`, async ({ page }) => {
            await page.setViewportSize(MOBILE_VIEWPORT);
            await page.goto(path, { waitUntil: 'domcontentloaded' });
            await waitForPageReady(page);
            const overflow = await page.evaluate(() =>
                document.documentElement.scrollWidth > document.documentElement.clientWidth
            );
            expect(overflow, `${path} má horizontální scroll na mobilu`).toBe(false);
        });
    }
});

// ═══════════════════════════════════════════════════════════
// AURA — detailní testy
// ═══════════════════════════════════════════════════════════

test.describe('Aura', () => {

    test('stránka se načte a má h1', async ({ page }) => {
        await smokeTest(page, '/aura.html', 'aura');
    });

    test('canonical link existuje', async ({ page }) => {
        await page.goto('/aura.html');
        const canonical = await page.getAttribute('link[rel="canonical"]', 'href');
        expect(canonical).toBeTruthy();
    });
});

// ═══════════════════════════════════════════════════════════
// KALKULAČKA ČÍSLA OSUDU
// ═══════════════════════════════════════════════════════════

test.describe('Kalkulačka čísla osudu', () => {

    test('stránka se načte a má h1', async ({ page }) => {
        await smokeTest(page, '/kalkulacka-cisla-osudu.html', null);
    });

    test('datum vstup nebo form existuje', async ({ page }) => {
        await page.goto('/kalkulacka-cisla-osudu.html');
        await waitForPageReady(page);
        const input = page.locator('input[type="date"], input[type="number"], form').first();
        await expect(input).toBeAttached();
    });
});

// ═══════════════════════════════════════════════════════════
// ANDĚLSKÁ POŠTA (komunita)
// ═══════════════════════════════════════════════════════════

test.describe('Andělská pošta', () => {

    test('stránka se načte a má h1', async ({ page }) => {
        await smokeTest(page, '/andelska-posta.html', null);
    });

    test('komunita sekce nebo zprávy existují', async ({ page }) => {
        await page.goto('/andelska-posta.html');
        await waitForPageReady(page);
        const content = page.locator('.message, .post, .angel-post, form').first();
        await expect(content).toBeAttached();
    });
});
