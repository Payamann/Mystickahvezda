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

    test('desktop header udrzi auth CTA uvnitr viewportu', async ({ page }) => {
        await page.addInitScript(() => {
            localStorage.setItem('cookieConsent', JSON.stringify({ necessary: true }));
        });

        for (const width of [994, 1180, 1280]) {
            await page.setViewportSize({ width, height: 720 });
            await page.goto('/cenik.html');
            await waitForPageReady(page);

            const layoutProblems = await page.evaluate(() => {
                const visibleItems = Array.from(document.querySelectorAll('header a, header button'))
                    .filter((element) => {
                        const styles = window.getComputedStyle(element);
                        const rect = element.getBoundingClientRect();
                        return styles.display !== 'none'
                            && styles.visibility !== 'hidden'
                            && rect.width > 0
                            && rect.height > 0;
                    })
                    .map((element) => {
                        const rect = element.getBoundingClientRect();
                        return {
                            text: (element.textContent || '').replace(/\s+/g, ' ').trim(),
                            left: rect.left,
                            right: rect.right,
                            top: rect.top,
                            bottom: rect.bottom,
                        };
                    });

                const offscreen = visibleItems
                    .filter(item => item.left < -1 || item.right > window.innerWidth + 1)
                    .map(item => item.text);

                const overlaps = [];
                for (let i = 0; i < visibleItems.length; i += 1) {
                    for (let j = i + 1; j < visibleItems.length; j += 1) {
                        const a = visibleItems[i];
                        const b = visibleItems[j];
                        if (a.right > b.left && a.left < b.right && a.bottom > b.top && a.top < b.bottom) {
                            overlaps.push(`${a.text} <> ${b.text}`);
                        }
                    }
                }

                return { offscreen, overlaps };
            });

            expect(layoutProblems.offscreen, `header prvky mimo viewport pri ${width}px`).toEqual([]);
            expect(layoutProblems.overlaps, `header prvky se prekryvaji pri ${width}px`).toEqual([]);
        }
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

    test('soukromí vysvětluje konkrétně bez absolutních slibů', async ({ page }) => {
        await page.goto('/faq.html');
        await waitForPageReady(page);

        const privacyQuestion = page.locator('details', { hasText: 'Jsou mé údaje v bezpečí?' });
        await privacyQuestion.locator('summary').click();
        const privacyAnswer = privacyQuestion.locator('.faq-content');
        await expect(privacyAnswer).toContainText('Platební údaje zpracovává Stripe');
        await expect(privacyAnswer).toContainText('neposkytujeme třetím stranám pro marketing');

        const fullText = await page.locator('body').textContent();
        expect(fullText).not.toContain('Absolutně. Vaše osobní údaje');
        expect(fullText).not.toContain('Nikdy je nesdílíme');

        const privacyLink = privacyAnswer.locator('a[href="soukromi.html"]').first();
        await expect(privacyLink).toBeVisible();
    });
});

test.describe('O nás', () => {

    test('důvěra stojí na konkrétním zacházení s daty', async ({ page }) => {
        await page.goto('/o-nas.html');
        await waitForPageReady(page);

        const trustCard = page.locator('.card--service', { hasText: 'Praktická důvěra' });
        await expect(trustCard).toBeVisible();
        await expect(trustCard).toContainText('Platební údaje zpracovává Stripe');
        await expect(trustCard.locator('a[href="soukromi.html"]')).toBeVisible();
        await expect(page.locator('.hero__title')).toContainText('jasnější další krok');
        await expect(page.locator('.hero__subtitle')).toContainText('ne jako slib pevného osudu');
        await expect(page.locator('script[src*="secondary-pages-copy-fixes.js"]')).toHaveAttribute('src', /secondary-pages-copy-fixes\.js\?v=4/);
        await expect(page.locator('.card--service', { hasText: 'Naše mise' })).toContainText('mapu témat');
        await expect(page.locator('.card--service', { hasText: 'Osobní přístup' })).toContainText('Nepředstíráme osobní guru péči');
        await expect(page.locator('.stat-item')).toHaveCount(4);
        await expect(page.locator('.stat-item')).toContainText([
            /Ceny předem/,
            /Stripe/,
            /Souhlas/,
            /Kontakt/,
        ]);
        await expect(page.locator('#expert-team')).toContainText('Mystika s jasnými hranicemi');
        await expect(page.locator('#expert-team')).toContainText('Bez osudových jistot');

        const bodyText = await page.locator('body').innerText();
        expect(bodyText).not.toContain('Absolutní důvěra');
        expect(bodyText).not.toContain('nejpřísnější ochraně');
        expect(bodyText).not.toContain('klid duše');
        expect(bodyText).not.toContain('víc než vesmírná předpověď');
        expect(bodyText).not.toContain('Nepoužíváme strojové šablony');
        expect(bodyText).not.toContain('odbornou péčí');
        expect(bodyText).not.toContain('5K+');
        expect(bodyText).not.toContain('4.9');
        expect(bodyText).not.toContain('12K+');
        expect(bodyText).not.toContain('24/7');
        expect(bodyText).not.toContain('Elena Hvězdná');
        expect(bodyText).not.toContain('Jan Mystik');
        expect(bodyText).not.toContain('Od roku 2018');
        expect(bodyText).not.toContain('nejmodernější českou platformu');
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
        await expect(page.locator('a[href*="tarot-tri-karty.html?source=tarot_free_intent"][href*="intent=three_cards"]')).toBeVisible();
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

        await expect(page.locator('main a[href*="tarot.html?source=tarot_love_landing"][href*="intent=love_tarot"][href*="spread=three_cards"]').first()).toBeVisible();
        await expect(page.locator('main a[href*="partnerska-shoda.html?source=tarot_love_landing"][href*="feature=partnerska_detail"]').first()).toBeVisible();
    });

    test('obsahuje vztahové další kroky a FAQ schema', async ({ page }) => {
        await page.goto('/tarot-laska.html');
        await waitForPageReady(page);

        await expect(page.locator('.love-tarot-intent-card')).toHaveCount(5);
        await expect(page.locator('a[href*="tarot.html?source=tarot_love_intent"][href*="spread=three_cards"]')).toBeVisible();
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
// ASTRO MAPA — detailní testy
// ═══════════════════════════════════════════════════════════

test.describe('Astro mapa', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/astro-mapa.html', { waitUntil: 'domcontentloaded' });
        await waitForPageReady(page);
    });

    test('rámuje astrokartografii jako podklad k úvaze bez slibů štěstí nebo osudu', async ({ page }) => {
        await expect(page.locator('.hero__subtitle')).toContainText('symbolickou mapu témat');
        await expect(page.locator('.hero__subtitle')).toContainText('podklad k úvaze, ne jako jistotu výsledku');
        await expect(page.locator('#astro-form button[type="submit"]')).toContainText('Sestavit symbolickou mapu');
        await expect(page.locator('.card--service', { hasText: 'Relokace' })).toContainText('podklad k rozhodnutí');
        await expect(page.locator('.card--service', { hasText: 'Cestování' })).toContainText('ne vybrat dovolenou za vás');
        await expect(page.locator('script[src*="secondary-pages-copy-fixes.js"]')).toHaveAttribute('src', /secondary-pages-copy-fixes\.js\?v=4/);

        const bodyText = await page.locator('body').innerText();
        expect(bodyText).not.toContain('Odhalit mou mapu štěstí');
        expect(bodyText).not.toContain('Kde na světě na vás čeká štěstí');
        expect(bodyText).not.toContain('ovlivňují váš osud');
        expect(bodyText).not.toContain('budou aktivovány konkrétní planety');
    });
});

test.describe('Lunace', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/lunace.html', { waitUntil: 'domcontentloaded' });
        await waitForPageReady(page);
    });

    test('praktický blok rámuje lunární fázi bez deterministických slibů', async ({ page }) => {
        await expect(page.locator('.hero__subtitle')).toContainText('ne jako pevný osud');

        const cluster = page.locator('.lunar-practice-section');
        await expect(cluster).toBeVisible();
        await expect(cluster).toContainText('Co s dnešní fází udělat konkrétně');
        await expect(cluster.locator('.lunar-practice-card')).toHaveCount(4);
        await expect(cluster.locator('[data-analytics-cta="lunar_practice_today"]')).toHaveAttribute('href', '#phaseCard');
        await expect(cluster.locator('[data-analytics-cta="lunar_practice_natal"]')).toHaveAttribute('href', /natalni-karta\.html\?source=lunar_practice/);
        await expect(cluster.locator('[data-analytics-cta="lunar_practice_mentor"]')).toHaveAttribute('href', /mentor\.html\?source=lunar_practice/);

        await expect(page.locator('.faq-section')).toContainText('neurčují emoce ani rozhodnutí');
        await expect(page.locator('.faq-section')).toContainText('ne jako pevné pravidlo');
    });
});

// ═══════════════════════════════════════════════════════════
// ŠAMANSKÉ KOLO — detailní testy
// ═══════════════════════════════════════════════════════════

test.describe('Šamanské kolo', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/shamansko-kolo.html', { waitUntil: 'domcontentloaded' });
        await waitForPageReady(page);
    });

    test('rámuje totemový výklad jako sebereflexi bez deterministických a kulturních claimů', async ({ page }) => {
        await expect(page.locator('.mw-hero__badge')).toContainText('Symbolický kruh směrů a živlů');
        await expect(page.locator('.mw-hero__desc')).toContainText('symbolický rámec');
        await expect(page.locator('.mw-hero__desc')).toContainText('ne jako pevné určení identity nebo osudu');
        await expect(page.locator('.mw-form__subtitle')).toContainText('symbolický rámec pro další otázku');
        await expect(page.locator('.mw-premium-wall__title')).toContainText('plné symbolické čtení');
        await expect(page.locator('.mw-premium-wall__desc')).toContainText('bez slibů pevného osudu');
        await expect(page.locator('script[src*="secondary-pages-copy-fixes.js"]')).toHaveAttribute('src', /secondary-pages-copy-fixes\.js\?v=4/);

        const bodyText = await page.locator('body').innerText();
        expect(bodyText).not.toContain('Indiánská moudrost Severní Ameriky');
        expect(bodyText).not.toContain('zakódované ve vašem datu narození');
        expect(bodyText).not.toContain('kolečko odhalí vaši cestu');
        expect(bodyText).not.toContain('osobní duchovní poselství čekají na vás');
    });
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

    test('hero CTA komunikuje cenu a meri prvni placeny zamer', async ({ page }) => {
        let resolveProductIntent;
        const productIntent = new Promise((resolve) => {
            resolveProductIntent = resolve;
        });

        await page.route('**/api/csrf-token', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ csrfToken: 'e2e-personal-map-hero-token' })
            });
        });

        await page.route('**/api/payment/funnel-event', async (route) => {
            const payload = route.request().postDataJSON();
            if (payload?.eventName === 'one_time_product_cta_clicked') {
                resolveProductIntent(payload);
            }

            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ success: true })
            });
        });

        await page.goto('/osobni-mapa.html?source=e2e_personal_map_hero');
        await waitForPageReady(page);

        const heroCta = page.locator('.pm-hero__actions [data-scroll-target="order"]').first();
        await expect(heroCta).toContainText('Chci mapu za 299 Kč');
        await expect(heroCta).toHaveAttribute('data-cta-location', 'hero');

        await Promise.all([
            productIntent,
            heroCta.click()
        ]);
        await expect.poll(async () => {
            const payload = await productIntent;
            return payload;
        }).toEqual(expect.objectContaining({
            eventName: 'one_time_product_cta_clicked',
            source: 'e2e_personal_map_hero',
            feature: 'osobni_mapa_2026',
            planId: 'osobni_mapa_2026',
            planType: 'personal_map',
            metadata: expect.objectContaining({
                cta_location: 'hero',
                product_id: 'osobni_mapa_2026',
                target: 'order'
            })
        }));

        await expect.poll(() => page.evaluate(() =>
            Math.round(document.getElementById('order')?.getBoundingClientRect().top || 9999)
        )).toBeLessThanOrEqual(140);
    });

    test('landing ukazuje nákupní shrnutí a CTA odscrolluje k formuláři', async ({ page }) => {
        let resolveProductIntent;
        const productIntent = new Promise((resolve) => {
            resolveProductIntent = resolve;
        });

        await page.route('**/api/csrf-token', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ csrfToken: 'e2e-personal-map-intent-token' })
            });
        });

        await page.route('**/api/payment/funnel-event', async (route) => {
            const payload = route.request().postDataJSON();
            if (payload?.eventName === 'one_time_product_cta_clicked') {
                resolveProductIntent(payload);
            }

            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ success: true })
            });
        });

        await page.goto('/osobni-mapa.html?source=e2e_personal_map');
        await waitForPageReady(page);

        const offer = page.locator('.pm-offer-bar');
        await expect(offer).toBeVisible();
        await expect(offer).toContainText('16 stran PDF');
        await expect(offer).toContainText('299 Kč');

        await Promise.all([
            productIntent,
            offer.locator('[data-scroll-target="order"]').click()
        ]);
        await expect.poll(async () => {
            const payload = await productIntent;
            return payload;
        }).toEqual(expect.objectContaining({
            eventName: 'one_time_product_cta_clicked',
            source: 'e2e_personal_map',
            feature: 'osobni_mapa_2026',
            planId: 'osobni_mapa_2026',
            planType: 'personal_map',
            metadata: expect.objectContaining({
                cta_location: 'offer_bar',
                product_id: 'osobni_mapa_2026',
                target: 'order'
            })
        }));

        await expect.poll(() => page.evaluate(() =>
            Math.round(document.getElementById('order')?.getBoundingClientRect().top || 9999)
        )).toBeLessThanOrEqual(140);

        await page.waitForTimeout(1200);
        await page.locator('#submitBtn').scrollIntoViewIfNeeded();
        const cookieMetrics = await page.evaluate(() => {
            const submit = document.getElementById('submitBtn')?.getBoundingClientRect();
            const banner = document.getElementById('cookie-banner')?.getBoundingClientRect();
            const overlapsSubmit = !!(submit && banner && !(
                banner.right < submit.left
                || banner.left > submit.right
                || banner.bottom < submit.top
                || banner.top > submit.bottom
            ));
            return {
                overlapsSubmit,
                overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
            };
        });

        expect(cookieMetrics.overlapsSubmit).toBe(false);
        expect(cookieMetrics.overflow).toBe(false);
    });

    test('odeslani formulare posila zdroj do personal map checkoutu', async ({ page }) => {
        let checkoutPayload = null;

        await page.route('**/api/osobni-mapa/checkout', async (route) => {
            checkoutPayload = route.request().postDataJSON();
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    url: '/osobni-mapa.html?status=success&source=pricing_addon&session_id=cs_test_personal_map'
                })
            });
        });

        await page.goto('/osobni-mapa.html?source=pricing_addon');
        await waitForPageReady(page);

        await page.locator('#name').fill('Jana');
        await page.locator('#email').fill('jana@example.cz');
        await page.locator('#birthDate').fill('1990-01-01');
        await page.locator('#birthTime').fill('12:30');
        await page.locator('#birthPlace').fill('Praha');
        await page.locator('#sign').selectOption('beran');
        await page.locator('#grammaticalGender').selectOption('feminine');
        await page.locator('#focus').fill('Chci pochopit hlavni tema zbytku roku.');

        await Promise.all([
            page.waitForURL(/status=success/),
            page.locator('#submitBtn').click(),
        ]);

        expect(checkoutPayload).toEqual(expect.objectContaining({
            name: 'Jana',
            email: 'jana@example.cz',
            birthDate: '1990-01-01',
            birthTime: '12:30',
            birthPlace: 'Praha',
            sign: 'beran',
            grammaticalGender: 'feminine',
            focus: 'Chci pochopit hlavni tema zbytku roku.',
            source: 'pricing_addon'
        }));
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

    test('mobilni cookie lista neprekryva vypocetni CTA', async ({ page }) => {
        await page.setViewportSize(MOBILE_VIEWPORT);
        await page.addInitScript(() => {
            localStorage.removeItem('mh_cookie_prefs');
            localStorage.removeItem('cookieConsent');
        });
        await page.goto('/kalkulacka-cisla-osudu.html?source=e2e_life_number_cookie');
        await waitForPageReady(page);

        await expect(page.locator('#cookie-banner')).toBeVisible();
        await expect(page.locator('#calc-btn')).toBeVisible();

        const metrics = await page.evaluate(() => {
            const cta = document.getElementById('calc-btn')?.getBoundingClientRect();
            const cookie = document.getElementById('cookie-banner')?.getBoundingClientRect();
            const overlapsCookie = !!(cta && cookie && !(
                cookie.right < cta.left
                || cookie.left > cta.right
                || cookie.bottom < cta.top
                || cookie.top > cta.bottom
            ));

            return {
                ctaBottom: Math.round(cta?.bottom || 9999),
                cookieTop: Math.round(cookie?.top || window.innerHeight),
                overlapsCookie,
                overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
            };
        });

        expect(metrics.overflow).toBe(false);
        expect(metrics.overlapsCookie).toBe(false);
        expect(metrics.ctaBottom).toBeLessThanOrEqual(metrics.cookieTop);
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
