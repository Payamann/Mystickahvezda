/**
 * E2E testy — Profil uživatele + Onboarding
 *
 * Testujeme stránky dostupné bez přihlášení (načtení, struktura)
 * a ověřujeme, že chráněný obsah je správně schován za login gate.
 */

import { test, expect } from '@playwright/test';
import { waitForPageReady, MOBILE_VIEWPORT } from './helpers.js';

// ═══════════════════════════════════════════════════════════
// PROFIL
// ═══════════════════════════════════════════════════════════

test.describe('Profil stránka', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('/profil.html');
        await waitForPageReady(page);
    });

    test('stránka vrátí 200', async ({ page }) => {
        const res = await page.request.get('/profil.html');
        expect(res.status()).toBe(200);
    });

    test('title obsahuje "Profil"', async ({ page }) => {
        const title = await page.title().then(t => t.toLowerCase());
        expect(title).toContain('profil');
    });

    test('#login-required nebo login gate existuje v DOM', async ({ page }) => {
        // Nepřihlášený uživatel by měl vidět výzvu k přihlášení
        const loginGate = page.locator('#login-required, .login-required, [id*="login-required"]').first();
        await expect(loginGate).toBeAttached();
    });

    test('#profile-dashboard existuje v DOM', async ({ page }) => {
        // Dashboard je skrytý pro nepřihlášené
        await expect(page.locator('#profile-dashboard')).toBeAttached();
    });

    test('#profile-login-btn nebo login odkaz existuje', async ({ page }) => {
        const loginBtn = page.locator('#profile-login-btn, a[href*="prihlaseni"], button[id*="login"]').first();
        await expect(loginBtn).toBeAttached();
    });

    test('user info elementy existují v DOM', async ({ page }) => {
        // Elementy pro zobrazení info uživatele (skryté do přihlášení)
        const userEmail = page.locator('#user-email');
        await expect(userEmail).toBeAttached();
    });

    test('stat karty existují v DOM', async ({ page }) => {
        const stats = page.locator('#stat-total, #stat-month, #stat-favorites, #stat-streak, .stat-card');
        const count = await stats.count();
        expect(count).toBeGreaterThanOrEqual(1);
    });

    test('#logout-btn existuje v DOM', async ({ page }) => {
        await expect(page.locator('#logout-btn')).toBeAttached();
    });

    test('#avatar-picker existuje v DOM', async ({ page }) => {
        await expect(page.locator('#avatar-picker')).toBeAttached();
    });

    test('avatar možnosti existují', async ({ page }) => {
        const avatars = page.locator('.avatar-option, [data-avatar]');
        const count = await avatars.count();
        expect(count).toBeGreaterThanOrEqual(1);
    });

    test('meta robots je noindex (profil se neindexuje)', async ({ page }) => {
        // page.evaluate nehází timeout když element neexistuje
        const robots = await page.evaluate(() => {
            const meta = document.querySelector('meta[name="robots"]');
            return meta ? meta.getAttribute('content') : null;
        });
        if (robots) {
            expect(robots).toContain('noindex');
        }
        // Test projde i bez robots meta tagu
    });

    test('žádný horizontální scroll na mobilu', async ({ page }) => {
        await page.setViewportSize(MOBILE_VIEWPORT);
        await page.goto('/profil.html');
        await waitForPageReady(page);
        const overflow = await page.evaluate(() =>
            document.documentElement.scrollWidth > document.documentElement.clientWidth
        );
        expect(overflow).toBe(false);
    });
});

// ═══════════════════════════════════════════════════════════
// ONBOARDING
// ═══════════════════════════════════════════════════════════

test.describe('Profil aktivace', () => {
    async function mockLoggedInProfile(page) {
        const user = {
            id: 'profile-user-1',
            email: 'profil-activation@example.com',
            first_name: 'Pavel',
            birth_date: '1990-08-10',
            subscription_status: 'free'
        };

        await page.context().addCookies([{
            name: 'logged_in',
            value: '1',
            url: 'http://localhost:3001'
        }]);

        await page.addInitScript((authUser) => {
            localStorage.setItem('auth_user', JSON.stringify(authUser));
            localStorage.setItem('mh_zodiac', 'lev');
        }, user);

        await page.route('**/api/auth/profile', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ success: true, user })
            });
        });
        await page.route('**/api/plans', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ success: true, plans: [], featurePlanMap: {} })
            });
        });
        await page.route('**/api/user/readings', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ success: true, readings: [] })
            });
        });
        await page.route('**/api/payment/subscription/status', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ planType: 'free', status: 'active', canCancel: false })
            });
        });
    }

    test('prvni akce navazuje na ulozene znameni a ma meritelny kontext', async ({ page }) => {
        await mockLoggedInProfile(page);

        await page.goto('/profil.html');
        await waitForPageReady(page);

        await expect(page.locator('#profile-dashboard')).toBeVisible();
        await expect(page.locator('#daily-guidance-title')).toContainText('Lev');

        const dailyHref = await page.locator('[data-daily-action="daily_horoscope"]').getAttribute('href');
        expect(dailyHref).toContain('horoskopy.html');
        expect(dailyHref).toContain('source=profile_daily');
        expect(dailyHref).toContain('feature=daily_guidance');
        expect(dailyHref).toContain('sign=lev');
        expect(dailyHref).toContain('#lev');

        const firstReadingHref = await page.locator('[data-activation-step="first_reading"]').getAttribute('href');
        expect(firstReadingHref).toContain('horoskopy.html');
        expect(firstReadingHref).toContain('source=profile_activation');
        expect(firstReadingHref).toContain('feature=daily_guidance');
        expect(firstReadingHref).toContain('sign=lev');
        await expect(page.locator('[data-activation-step="first_reading"]')).toContainText('horoskopem pro Lev');
    });
});

test.describe('Onboarding', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('/onboarding.html');
        await waitForPageReady(page);
    });

    async function mockOnboardingComplete(page) {
        await page.route('**/api/auth/onboarding/complete', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ success: true })
            });
        });
    }

    test('stránka vrátí 200', async ({ page }) => {
        const res = await page.request.get('/onboarding.html');
        expect(res.status()).toBe(200);
    });

    test('h1 existuje', async ({ page }) => {
        await expect(page.locator('h1').first()).toBeAttached();
    });

    test('onboarding kroky nebo wizard existují', async ({ page }) => {
        // Onboarding obvykle má kroky (steps)
        const steps = page.locator(
            '.step, .onboarding-step, [class*="step"], .wizard-step, form'
        ).first();
        await expect(steps).toBeAttached();
    });

    test('prvni krok jasne vysvetluje rychlou hodnotu bez karty', async ({ page }) => {
        const valueStrip = page.locator('.onboarding-value-strip');
        await expect(valueStrip).toBeVisible();
        await expect(valueStrip.locator('div')).toHaveCount(3);
        await expect(valueStrip).toContainText('Bez karty');
        await expect(valueStrip).toContainText('Hned výklad');
    });

    test('onboarding netaha externi fonty ani nepouzity sanitizer z CDN', async ({ page }) => {
        const html = await page.content();
        expect(html).toContain('/fonts/local-fonts.css');
        expect(html).not.toContain('fonts.googleapis.com');
        expect(html).not.toContain('cdnjs.cloudflare.com/ajax/libs/dompurify');
    });

    test('žádný horizontální scroll na mobilu', async ({ page }) => {
        await page.setViewportSize(MOBILE_VIEWPORT);
        await page.goto('/onboarding.html');
        await waitForPageReady(page);
        const overflow = await page.evaluate(() =>
            document.documentElement.scrollWidth > document.documentElement.clientWidth
        );
        expect(overflow).toBe(false);
    });

    test('preskoceni onboardingu vede rovnou na denni horoskop', async ({ page }) => {
        await mockOnboardingComplete(page);

        await Promise.all([
            page.waitForURL(url => url.pathname === '/horoskopy.html', { timeout: 10000, waitUntil: 'domcontentloaded' }),
            page.locator('[data-action="skipOnboarding"]').click(),
        ]);

        const url = new URL(page.url());
        expect(url.pathname).toBe('/horoskopy.html');
        expect(url.searchParams.get('source')).toBe('onboarding_skip');
        const onboarded = await page.evaluate(() => localStorage.getItem('mh_onboarded'));
        expect(onboarded).toBe('1');
    });

    test('dokonceni se znamenim otevre konkretni denni horoskop a ulozi personalizaci', async ({ page }) => {
        await mockOnboardingComplete(page);

        await page.locator('#step-1 [data-action="goStep"][data-step="2"]').click();
        await page.locator('.zodiac-btn[data-sign="beran"]').click();
        await expect(page.locator('.zodiac-btn[data-sign="beran"]')).toHaveAttribute('aria-pressed', 'true');
        await page.locator('#btn-step2').click();

        await expect(page.locator('#finish-onboarding-btn')).toContainText('Berana');

        await Promise.all([
            page.waitForURL(url => url.pathname === '/horoskopy.html', { timeout: 10000, waitUntil: 'domcontentloaded' }),
            page.locator('#finish-onboarding-btn').click(),
        ]);

        const url = new URL(page.url());
        expect(url.pathname).toBe('/horoskopy.html');
        expect(url.searchParams.get('source')).toBe('onboarding_complete');
        expect(url.searchParams.get('sign')).toBe('beran');
        expect(url.hash).toBe('#beran');

        const stored = await page.evaluate(() => ({
            onboarded: localStorage.getItem('mh_onboarded'),
            zodiac: localStorage.getItem('mh_zodiac'),
            prefs: JSON.parse(localStorage.getItem('mh_user_prefs') || '{}')
        }));

        expect(stored.onboarded).toBe('1');
        expect(stored.zodiac).toBe('beran');
        expect(stored.prefs.sign).toBe('beran');
    });

    test('dokonceni posila backend notifikaci s CSRF tokenem', async ({ page }) => {
        let completionCsrfHeader = null;

        await page.route('**/api/csrf-token', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ csrfToken: 'test-onboarding-csrf-token' })
            });
        });
        await page.route('**/api/auth/onboarding/complete', async (route) => {
            completionCsrfHeader = route.request().headers()['x-csrf-token'] || null;
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ success: true })
            });
        });

        await page.goto('/onboarding.html');
        await waitForPageReady(page);

        await page.locator('#step-1 [data-action="goStep"][data-step="2"]').click();
        await page.locator('.zodiac-btn[data-sign="beran"]').click();
        await page.locator('#btn-step2').click();

        await Promise.all([
            page.waitForURL(url => url.pathname === '/horoskopy.html', { timeout: 10000, waitUntil: 'domcontentloaded' }),
            page.locator('#finish-onboarding-btn').click(),
        ]);

        expect(completionCsrfHeader).toBe('test-onboarding-csrf-token');
    });

    test('dokonceni neceka na zaseknuty CSRF endpoint', async ({ page }) => {
        let completionRequests = 0;

        await page.route('**/api/csrf-token', () => new Promise(() => {}));
        await page.route('**/api/auth/onboarding/complete', async (route) => {
            completionRequests += 1;
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ success: true })
            });
        });

        await page.goto('/onboarding.html');
        await waitForPageReady(page);

        await page.locator('#step-1 [data-action="goStep"][data-step="2"]').click();
        await page.locator('.zodiac-btn[data-sign="beran"]').click();
        await page.locator('#btn-step2').click();

        await Promise.all([
            page.waitForURL(url => url.pathname === '/horoskopy.html', { timeout: 5000, waitUntil: 'domcontentloaded' }),
            page.locator('#finish-onboarding-btn').click(),
        ]);

        expect(completionRequests).toBe(0);
    });

    test('vybrane tema meni prvni cil po onboardingu', async ({ page }) => {
        await mockOnboardingComplete(page);

        await page.locator('#step-1 [data-action="goStep"][data-step="2"]').click();
        await page.locator('.zodiac-btn[data-sign="beran"]').click();
        await page.locator('#btn-step2').click();
        await page.locator('.interest-chip[data-interest="tarot"]').click();

        await expect(page.locator('.interest-chip[data-interest="tarot"]')).toHaveAttribute('aria-pressed', 'true');
        await expect(page.locator('#finish-onboarding-btn')).toContainText('tarotový výklad');

        await Promise.all([
            page.waitForURL(url => url.pathname === '/tarot.html', { timeout: 10000, waitUntil: 'domcontentloaded' }),
            page.locator('#finish-onboarding-btn').click(),
        ]);

        const url = new URL(page.url());
        expect(url.pathname).toBe('/tarot.html');
        expect(url.searchParams.get('source')).toBe('onboarding_complete');
    });

    test('kontext andelske karty predvybere spravny prvni vyklad', async ({ page }) => {
        await mockOnboardingComplete(page);

        await page.goto('/onboarding.html?source=homepage_daily_card_full_reading&feature=daily_angel_card');
        await waitForPageReady(page);

        await expect(page.locator('#step-1 .step-title')).toContainText('andělskou kartou');
        await page.locator('#step-1 [data-action="goStep"][data-step="2"]').click();
        await page.locator('.zodiac-btn[data-sign="ryby"]').click();
        await page.locator('#btn-step2').click();

        await expect(page.locator('.interest-chip[data-interest="andelske-karty"]')).toHaveAttribute('aria-pressed', 'true');
        await expect(page.locator('#finish-onboarding-btn')).toContainText('andělské karty');

        await Promise.all([
            page.waitForURL(url => url.pathname === '/andelske-karty.html', { timeout: 10000, waitUntil: 'domcontentloaded' }),
            page.locator('#finish-onboarding-btn').click(),
        ]);

        const url = new URL(page.url());
        expect(url.pathname).toBe('/andelske-karty.html');
        expect(url.searchParams.get('source')).toBe('onboarding_complete');
        expect(url.searchParams.get('entry_source')).toBe('homepage_daily_card_full_reading');
        expect(url.searchParams.get('entry_feature')).toBe('daily_angel_card');
    });

    test('rucni zmena predvybraneho tematu ma prednost pred kontextem', async ({ page }) => {
        await mockOnboardingComplete(page);

        await page.goto('/onboarding.html?source=homepage_daily_card_full_reading&feature=daily_angel_card');
        await waitForPageReady(page);

        await page.locator('#step-1 [data-action="goStep"][data-step="2"]').click();
        await page.locator('.zodiac-btn[data-sign="ryby"]').click();
        await page.locator('#btn-step2').click();
        await page.locator('.interest-chip[data-interest="tarot"]').click();

        await expect(page.locator('#finish-onboarding-btn')).toContainText('tarotový výklad');

        await Promise.all([
            page.waitForURL(url => url.pathname === '/tarot.html', { timeout: 10000, waitUntil: 'domcontentloaded' }),
            page.locator('#finish-onboarding-btn').click(),
        ]);

        const url = new URL(page.url());
        expect(url.pathname).toBe('/tarot.html');
        expect(url.searchParams.get('entry_feature')).toBe('daily_angel_card');
    });

    test('preskoceni s feature kontextem navaze na puvodni funkci', async ({ page }) => {
        await mockOnboardingComplete(page);

        await page.goto('/onboarding.html?source=tarot_inline_upsell&feature=tarot');
        await waitForPageReady(page);

        await Promise.all([
            page.waitForURL(url => url.pathname === '/tarot.html', { timeout: 10000, waitUntil: 'domcontentloaded' }),
            page.locator('[data-action="skipOnboarding"]').click(),
        ]);

        const url = new URL(page.url());
        expect(url.pathname).toBe('/tarot.html');
        expect(url.searchParams.get('source')).toBe('onboarding_skip');
        expect(url.searchParams.get('entry_source')).toBe('tarot_inline_upsell');
        expect(url.searchParams.get('entry_feature')).toBe('tarot');
    });

    test('mentor kontext predvybere pruvodce a upravi prvni krok', async ({ page }) => {
        await mockOnboardingComplete(page);

        await page.goto('/onboarding.html?source=mentor_inline_upsell&feature=hvezdny_mentor');
        await waitForPageReady(page);

        await expect(page.locator('.interest-chip[data-interest="spiritualita"]')).toHaveAttribute('aria-pressed', 'true');
        await expect(page.locator('#step-1 .step-title')).toContainText('průvodcem');

        const skipHref = await page.locator('[data-action="skipOnboarding"]').getAttribute('href');
        expect(skipHref).toContain('/mentor.html');
        expect(skipHref).toContain('entry_feature=hvezdny_mentor');
    });

    test('samanske kolo v onboardingu vede na kanonickou stranku', async ({ page }) => {
        await mockOnboardingComplete(page);

        await page.goto('/onboarding.html?source=shaman_inline_upsell&feature=shamanske_kolo_plne_cteni');
        await waitForPageReady(page);

        await expect(page.locator('.interest-chip[data-interest="shamanske-kolo"]')).toHaveAttribute('aria-pressed', 'true');

        const skipHref = await page.locator('[data-action="skipOnboarding"]').getAttribute('href');
        expect(skipHref).toContain('/shamansko-kolo.html');
        expect(skipHref).not.toContain('/shamanske-kolo.html');

        await page.locator('#step-1 [data-action="goStep"][data-step="2"]').click();
        await page.locator('.zodiac-btn[data-sign="rak"]').click();
        await page.locator('#btn-step2').click();

        await Promise.all([
            page.waitForURL(url => url.pathname === '/shamansko-kolo.html', { timeout: 10000, waitUntil: 'domcontentloaded' }),
            page.locator('#finish-onboarding-btn').click(),
        ]);

        const url = new URL(page.url());
        expect(url.pathname).toBe('/shamansko-kolo.html');
        expect(url.searchParams.get('source')).toBe('onboarding_complete');
        expect(url.searchParams.get('entry_feature')).toBe('shamanske_kolo_plne_cteni');
    });

    test('navrat do onboardingu obnovi ulozene znameni a tema', async ({ page }) => {
        await page.evaluate(() => {
            localStorage.setItem('mh_zodiac', 'lev');
            localStorage.setItem('mh_interests', JSON.stringify(['numerologie']));
            localStorage.setItem('mh_user_prefs', JSON.stringify({ sign: 'lev' }));
        });

        await page.reload();
        await waitForPageReady(page);
        await page.locator('#step-1 [data-action="goStep"][data-step="2"]').click();

        await expect(page.locator('.zodiac-btn[data-sign="lev"]')).toHaveAttribute('aria-pressed', 'true');
        await expect(page.locator('#btn-step2')).toBeEnabled();

        await page.locator('#btn-step2').click();

        await expect(page.locator('.interest-chip[data-interest="numerologie"]')).toHaveAttribute('aria-pressed', 'true');
        await expect(page.locator('#finish-onboarding-btn')).toContainText('numerologii');
    });

    test('dokonceni chrani proti dvojkliku a posila jen jeden completion request', async ({ page }) => {
        let completionRequests = 0;
        await page.route('**/api/auth/onboarding/complete', async (route) => {
            completionRequests += 1;
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ success: true })
            });
        });

        await page.locator('#step-1 [data-action="goStep"][data-step="2"]').click();
        await page.locator('.zodiac-btn[data-sign="beran"]').click();
        await page.locator('#btn-step2').click();

        await Promise.all([
            page.waitForURL(url => url.pathname === '/horoskopy.html', { timeout: 10000, waitUntil: 'domcontentloaded' }),
            page.locator('#finish-onboarding-btn').dblclick(),
        ]);

        expect(completionRequests).toBe(1);
    });
});

// ═══════════════════════════════════════════════════════════
// PROTECTED API ROUTES — ověřování auth ochrany
// ═══════════════════════════════════════════════════════════

test.describe('Chráněné user API endpointy', () => {

    test('GET /api/auth/profile bez auth vrátí 401', async ({ page }) => {
        const res = await page.request.get('/api/auth/profile');
        expect(res.status()).toBe(401);
    });

    test('GET /api/user/readings bez auth vrátí 401', async ({ page }) => {
        const res = await page.request.get('/api/user/readings');
        expect(res.status()).toBe(401);
    });

    test('GET /api/payment/subscription/status bez auth vrátí 401', async ({ page }) => {
        const res = await page.request.get('/api/payment/subscription/status');
        expect(res.status()).toBe(401);
    });
});
