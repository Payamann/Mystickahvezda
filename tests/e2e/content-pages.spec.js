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

test.describe('Runtime config', () => {
    test('homepage načte veřejnou konfiguraci jen jednou', async ({ page }) => {
        let configRequests = 0;

        await page.route('**/api/config', route => {
            configRequests += 1;
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    stripePublishableKey: null,
                    vapidPublicKey: null,
                    sentryDsn: null
                })
            });
        });

        await page.goto('/', { waitUntil: 'domcontentloaded' });
        await waitForPageReady(page);

        await expect.poll(() => configRequests).toBe(1);
    });
});

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
        const ctaLink = page.locator('main a[href*="tarot.html?source=tarot_free_landing"]').first();
        await expect(ctaLink).toBeAttached();
        await expect(ctaLink).toHaveAttribute('href', /source=tarot_free_landing/);
    });

    test('intent rozcestnik odkazuje na rychle tarot vstupy', async ({ page }) => {
        await page.goto('/tarot-zdarma.html');
        await waitForPageReady(page);

        await expect(page.locator('.tarot-intent-card')).toHaveCount(6);
        await expect(page.locator('a[href*="tarot-ano-ne.html?source=tarot_free_intent"]')).toBeVisible();
        await expect(page.locator('a[href*="tarot-karta-dne.html?source=tarot_free_intent"]')).toBeVisible();
        await expect(page.locator('a[href*="tarot-laska.html?source=tarot_free_intent"]')).toBeVisible();
        await expect(page.locator('a[href*="tarot-vyznam-karet.html?source=tarot_free_intent"]')).toBeVisible();
        await expect(page.locator('a[href*="tarot.html?source=tarot_free_intent"][href*="intent=three_cards"]')).toBeVisible();
    });
});

// ═══════════════════════════════════════════════════════════
// TAROT KARTA DNE (SEO landing)
// ═══════════════════════════════════════════════════════════

test.describe('Tarot karta dne', () => {

    test('stránka se načte a má h1', async ({ page }) => {
        await smokeTest(page, '/tarot-karta-dne.html', 'karta');
    });

    test('primární CTA vede do tarot nástroje s atribucí', async ({ page }) => {
        await page.goto('/tarot-karta-dne.html');
        await waitForPageReady(page);

        const cta = page.locator('main a[href*="tarot.html?source=tarot_daily_card_landing"][href*="intent=daily_card"]').first();
        await expect(cta).toBeVisible();
        await expect(cta).toHaveAttribute('href', /feature=tarot/);

        await page.evaluate(() => {
            window.MH_ANALYTICS_QUEUE = [];
            const link = document.querySelector('main a[data-analytics-cta="tarot_daily_card_landing_primary"]');
            link?.addEventListener('click', event => event.preventDefault(), { once: true, capture: true });
            link?.click();
        });

        const event = await page.evaluate(() => window.MH_ANALYTICS_QUEUE.find(
            item => item.name === 'cta_clicked' && item.location === 'tarot_daily_card_landing_primary'
        ));
        expect(event).toEqual(expect.objectContaining({
            destination: expect.stringContaining('tarot.html?source=tarot_daily_card_landing'),
            feature: 'tarot',
            intent: 'daily_card'
        }));
    });

    test('interaktivní karta dne ukáže kartu a předá ji do výkladu', async ({ page }) => {
        await page.goto('/tarot-karta-dne.html');
        await waitForPageReady(page);

        const revealButton = page.locator('#tarot-daily-reveal');
        await expect(revealButton).toBeEnabled();
        await revealButton.click();

        await expect(page.locator('#tarot-daily-card-result')).toHaveAttribute('data-state', 'revealed');
        await expect(page.locator('#tarot-daily-card-image')).toHaveAttribute('alt', /Tarot karta dne:/);
        await expect(page.locator('#tarot-daily-card-name')).not.toHaveText('Tvoje dnešní karta');
        await expect(page.locator('#tarot-daily-card-advice')).toContainText('Konkrétní krok');

        const fullReadingHref = await page.locator('#tarot-daily-full-reading').getAttribute('href');
        expect(fullReadingHref).toContain('source=tarot_daily_card_widget');
        expect(fullReadingHref).toContain('intent=daily_card');
        expect(fullReadingHref).toContain('card=');

        await expect(page.locator('#tarot-daily-card-detail')).toHaveAttribute('href', /\/tarot-vyznam\/.+\.html/);
        await expect(page.locator('#tarot-daily-save-profile')).toBeVisible();
        await expect(page.locator('#tarot-daily-save-image')).toBeVisible();
        await expect(page.locator('#tarot-daily-share')).toBeVisible();

        await expect.poll(() => page.evaluate(() => Boolean(window.__lastTarotDailyShareResult))).toBe(true);
        const downloadPromise = page.waitForEvent('download');
        await page.locator('#tarot-daily-save-image').click();
        const download = await downloadPromise;
        expect(download.suggestedFilename()).toMatch(/^tarot-karta-dne-.+\.png$/);
    });

    test('uložení karty do profilu pošle hosta na registraci s kontextem', async ({ page }) => {
        await page.goto('/tarot-karta-dne.html');
        await waitForPageReady(page);

        await page.locator('#tarot-daily-reveal').click();
        const saveProfileButton = page.locator('#tarot-daily-save-profile');
        await expect(saveProfileButton).toBeVisible();

        await Promise.all([
            page.waitForURL(/\/prihlaseni\.html/),
            saveProfileButton.click()
        ]);

        const target = new URL(page.url());
        expect(target.pathname).toBe('/prihlaseni.html');
        expect(target.searchParams.get('mode')).toBe('register');
        expect(target.searchParams.get('redirect')).toBe('/tarot-karta-dne.html?source=tarot_daily_card_profile_save_return&intent=save_daily_card#denni-karta');
        expect(target.searchParams.get('source')).toBe('tarot_daily_card_profile_save');
        expect(target.searchParams.get('feature')).toBe('tarot_daily_card_profile_save');
        expect(target.searchParams.get('intent')).toBe('save_daily_card');
        expect(target.searchParams.get('card')).toBeTruthy();

        await waitForPageReady(page);
        await expect(page.locator('#checkout-context-title')).toContainText('Uložte kartu dne do profilu');
    });

    test('návrat po registraci automaticky otevře denní kartu', async ({ page }) => {
        await page.goto('/tarot-karta-dne.html?source=tarot_daily_card_profile_save_return&intent=save_daily_card#denni-karta');
        await waitForPageReady(page);

        await expect(page.locator('#tarot-daily-card-result')).toHaveAttribute('data-state', 'revealed');
        await expect(page.locator('#tarot-daily-card-name')).not.toHaveText('Tvoje dnešní karta');
        await expect(page.locator('#tarot-daily-save-profile')).toBeVisible();
        await expect(page.locator('#tarot-daily-save-profile')).toContainText('Uložit do profilu');
    });

    test('návrat po registraci přihlášenému automaticky uloží denní kartu do profilu', async ({ page }) => {
        const savedPayloads = [];

        await page.context().addCookies([{
            name: 'logged_in',
            value: '1',
            url: 'http://localhost:3001'
        }]);

        await page.addInitScript(() => {
            localStorage.setItem('auth_user', JSON.stringify({
                id: 'user-daily-tarot',
                email: 'tarot@example.test'
            }));
            sessionStorage.setItem('mh_pending_tarot_daily_profile_save', JSON.stringify({
                dateKey: new Date().toISOString().slice(0, 10)
            }));
        });

        await page.route('**/api/auth/profile', route => route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                success: true,
                user: {
                    id: 'user-daily-tarot',
                    email: 'tarot@example.test'
                }
            })
        }));

        await page.route('**/api/user/readings', async route => {
            const request = route.request();
            savedPayloads.push(request.postDataJSON());
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    reading: {
                        id: 'daily-return-reading',
                        type: 'tarot'
                    }
                })
            });
        });

        await page.goto('/tarot-karta-dne.html?source=tarot_daily_card_profile_save_return&intent=save_daily_card#denni-karta');
        await waitForPageReady(page);

        const saveProfileButton = page.locator('#tarot-daily-save-profile');
        await expect(saveProfileButton).toHaveText('Uloženo v profilu');
        await expect(saveProfileButton).toBeDisabled();

        expect(savedPayloads).toHaveLength(1);
        expect(savedPayloads[0]).toEqual(expect.objectContaining({
            type: 'tarot',
            data: expect.objectContaining({
                spreadType: 'Tarot karta dne',
                source: 'tarot_daily_card_widget'
            })
        }));

        await expect.poll(() => page.evaluate(() => sessionStorage.getItem('mh_pending_tarot_daily_profile_save'))).toBeNull();
    });

    test('přihlášenému uživateli uloží denní kartu přes existující profil API', async ({ page }) => {
        await page.goto('/tarot-karta-dne.html');
        await waitForPageReady(page);

        await page.evaluate(() => {
            window.__dailyTarotSaveCalls = [];
            window.__dailyTarotEvents = [];
            window.Auth = {
                isLoggedIn: () => true,
                saveReading: async (type, data) => {
                    window.__dailyTarotSaveCalls.push({ type, data });
                    return { id: 'reading-test-1', type, data };
                }
            };
            window.MH_ANALYTICS = {
                trackAction: (eventName, props) => {
                    window.__dailyTarotEvents.push({ eventName, props });
                }
            };
        });

        await page.locator('#tarot-daily-reveal').click();
        const saveProfileButton = page.locator('#tarot-daily-save-profile');
        await expect(saveProfileButton).toBeVisible();
        await saveProfileButton.click();

        await expect(saveProfileButton).toHaveText('Uloženo v profilu');
        await expect(saveProfileButton).toBeDisabled();

        const saveCall = await page.evaluate(() => window.__dailyTarotSaveCalls[0]);
        expect(saveCall).toEqual(expect.objectContaining({
            type: 'tarot',
            data: expect.objectContaining({
                spreadType: 'Tarot karta dne',
                source: 'tarot_daily_card_widget',
                dateKey: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
                cards: expect.arrayContaining([
                    expect.objectContaining({
                        position: 'Karta dne',
                        name: expect.any(String)
                    })
                ])
            })
        }));

        const saveEvent = await page.evaluate(() => window.__dailyTarotEvents.find(
            event => event.eventName === 'tarot_daily_card_profile_saved'
        ));
        expect(saveEvent).toEqual(expect.objectContaining({
            props: expect.objectContaining({
                reading_id: 'reading-test-1'
            })
        }));
    });

    test('obsahuje další kroky a FAQ schema', async ({ page }) => {
        await page.goto('/tarot-karta-dne.html');
        await waitForPageReady(page);

        await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
        await expect(page.locator('.tarot-daily-visual img').first()).toHaveAttribute('width', '600');
        await expect(page.locator('.tarot-daily-primer__card')).toHaveCount(3);
        await expect(page.locator('a[href*="tarot-vyznam-karet.html?source=tarot_daily_card_primer"]')).toBeVisible();
        await expect(page.locator('.tarot-daily-intent-card')).toHaveCount(4);
        await expect(page.locator('a[href*="cenik.html?plan=pruvodce"][href*="source=tarot_daily_card_landing"]')).toBeVisible();

        const ldTypes = await page.locator('script[type="application/ld+json"]').evaluateAll((scripts) => scripts.map((script) => {
            try {
                return JSON.parse(script.textContent || '{}')['@type'];
            } catch {
                return null;
            }
        }));
        expect(ldTypes).toContain('FAQPage');
    });

    test('mobilní layout nemá horizontální scroll', async ({ page }) => {
        await page.setViewportSize(MOBILE_VIEWPORT);
        await page.goto('/tarot-karta-dne.html');
        await waitForPageReady(page);

        const hasHorizontalScroll = await page.evaluate(() =>
            document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
        );
        expect(hasHorizontalScroll).toBe(false);
    });
});

// ═══════════════════════════════════════════════════════════
// TAROT NA LÁSKU (SEO landing)
// ═══════════════════════════════════════════════════════════

test.describe('Tarot na lásku', () => {

    test('stránka se načte a má h1', async ({ page }) => {
        await smokeTest(page, '/tarot-laska.html', 'lásku');
    });

    test('primární CTA a partnerská shoda drží atribuci', async ({ page }) => {
        await page.goto('/tarot-laska.html');
        await waitForPageReady(page);

        await expect(page.locator('main a[href*="tarot.html?source=tarot_love_landing"][href*="intent=love_tarot"]').first()).toBeVisible();
        await expect(page.locator('main a[href*="partnerska-shoda.html?source=tarot_love_landing"][href*="feature=partnerska_detail"]').first()).toBeVisible();
    });

    test('obsahuje vztahové další kroky a FAQ schema', async ({ page }) => {
        await page.goto('/tarot-laska.html');
        await waitForPageReady(page);

        await expect(page.locator('.love-tarot-intent-card')).toHaveCount(5);
        await expect(page.locator('a[href*="cenik.html?plan=pruvodce"][href*="source=tarot_love_landing"]')).toBeVisible();

        const ldTypes = await page.locator('script[type="application/ld+json"]').evaluateAll((scripts) => scripts.map((script) => {
            try {
                return JSON.parse(script.textContent || '{}')['@type'];
            } catch {
                return null;
            }
        }));
        expect(ldTypes).toContain('FAQPage');
    });

    test('mobilní layout nemá horizontální scroll', async ({ page }) => {
        await page.setViewportSize(MOBILE_VIEWPORT);
        await page.goto('/tarot-laska.html');
        await waitForPageReady(page);

        const hasHorizontalScroll = await page.evaluate(() =>
            document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
        );
        expect(hasHorizontalScroll).toBe(false);
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
// OSOBNÍ MAPA
// ═══════════════════════════════════════════════════════════════════

test.describe('Osobní mapa', () => {

    test('landing ukazuje nákupní shrnutí a CTA odscrolluje k formuláři', async ({ page }) => {
        await page.goto('/osobni-mapa.html?source=e2e_personal_map');
        await waitForPageReady(page);

        const offer = page.locator('.pm-offer-bar');
        await expect(offer).toBeVisible();
        await expect(offer).toContainText('16 stran PDF');
        await expect(offer).toContainText('299 Kč');

        await offer.locator('[data-scroll-target="order"]').click();
        await expect.poll(() => page.evaluate(() =>
            Math.round(document.getElementById('order')?.getBoundingClientRect().top || 9999)
        )).toBeLessThanOrEqual(140);
    });

    test('úspěšná platba ukáže upsell na Průvodce a schová objednávku', async ({ page }) => {
        await page.goto('/osobni-mapa.html?status=success&source=e2e_success&session_id=cs_test_123');
        await waitForPageReady(page);

        await expect(page.locator('#bannerSuccess')).toBeVisible();
        await expect(page.locator('#order')).toBeHidden();
        await expect(page.locator('[data-success-upsell]')).toHaveAttribute(
            'href',
            /cenik\.html\?source=personal_map_success&feature=premium_membership&plan=pruvodce/
        );
    });

    test('nedokončená platba má recovery CTA a bez mobilního overflow', async ({ page }) => {
        await page.setViewportSize(MOBILE_VIEWPORT);
        await page.goto('/osobni-mapa.html?status=cancel&source=e2e_cancel');
        await waitForPageReady(page);

        await expect(page.locator('#bannerCancel')).toBeVisible();
        await expect(page.locator('[data-cancel-recovery][data-scroll-target="order"]')).toBeVisible();
        await expect(page.locator('a[data-cancel-recovery]')).toHaveAttribute(
            'href',
            /tarot\.html\?source=personal_map_cancel&feature=tarot/
        );

        const overflow = await page.evaluate(() =>
            document.documentElement.scrollWidth > document.documentElement.clientWidth
        );
        expect(overflow, 'Osobní mapa má na mobilu horizontální scroll').toBe(false);
    });
});

// ═══════════════════════════════════════════════════════════════════
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

    test('navazujici intent rozcestnik vede na placenejsi dalsi kroky', async ({ page }) => {
        await page.goto('/kalkulacka-cisla-osudu.html');
        await waitForPageReady(page);

        await expect(page.locator('.life-number-intent-card')).toHaveCount(4);
        await expect(page.locator('a[href*="numerologie.html?source=life_number_intent"]')).toBeVisible();
        await expect(page.locator('a[href*="rocni-horoskop.html?source=life_number_intent"]')).toBeVisible();
        await expect(page.locator('a[href*="osobni-mapa.html?source=life_number_intent"]')).toBeVisible();
    });

    test('vysledek kalkulacky zachova tracking do plne numerologie', async ({ page }) => {
        await page.goto('/kalkulacka-cisla-osudu.html');
        await waitForPageReady(page);

        await page.fill('#inp-day', '15');
        await page.fill('#inp-month', '3');
        await page.fill('#inp-year', '1990');
        await page.click('#calc-btn');

        const resultCta = page.locator('#calc-result a[href*="numerologie.html?source=life_number_result"]');
        await expect(resultCta).toBeVisible();
        await expect(resultCta).toHaveAttribute('href', /feature=numerologie_vyklad/);
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

    test('zobrazi prazdny stav bez demo vzkazu', async ({ page }) => {
        await page.route('**/api/angel-post?limit=20', route => route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: '[]'
        }));

        await page.goto('/andelska-posta.html');
        await waitForPageReady(page);

        const emptyState = page.locator('#messages-container .message-empty-state');
        await expect(emptyState).toContainText('Zatím žádné schválené vzkazy');
        await expect(page.locator('#messages-container .message-card')).toHaveCount(0);
    });

    test('zobrazi chybovy stav pri nedostupnem API', async ({ page }) => {
        await page.route('**/api/angel-post?limit=20', route => route.fulfill({
            status: 503,
            contentType: 'application/json',
            body: '{"error":"down"}'
        }));

        await page.goto('/andelska-posta.html');
        await waitForPageReady(page);

        const errorState = page.locator('#messages-container .message-empty-state--error');
        await expect(errorState).toContainText('nepodařilo načíst');
        await expect(page.locator('#messages-container .message-card')).toHaveCount(0);
    });
});
