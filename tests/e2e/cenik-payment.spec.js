/**
 * E2E testy — Ceník & platební tlačítka (cenik.html)
 *
 * Kritické flows:
 * 1. Stránka se načte
 * 2. Všechna 3 checkout tlačítka existují se správnými data-plan
 * 3. Nepřihlášený uživatel → klik → přesměrování na prihlaseni.html (ne 404, ne registrace.html)
 * 4. Billing toggle (měsíčně/ročně) správně mění zobrazené ceny
 * 5. Žádný duplicitní handler — platby.js se nenačítá inline
 */

import { test, expect } from '@playwright/test';
import { waitForPageReady } from './helpers.js';

test.describe('Ceník — platební tlačítka', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('/cenik.html');
        await waitForPageReady(page);
    });

    // ── Načtení stránky ──────────────────────────────────────────────────────

    test('stránka vrátí 200', async ({ page }) => {
        const res = await page.request.get('/cenik.html');
        expect(res.status()).toBe(200);
    });

    test('title obsahuje "Ceník"', async ({ page }) => {
        const title = await page.title();
        expect(title.toLowerCase()).toContain('cen');
    });

    // ── Checkout tlačítka — struktura ────────────────────────────────────────

    test('existuji 2 hlavni checkout tlacitka s tridou plan-checkout-btn', async ({ page }) => {
        const btns = page.locator('.plan-checkout-btn');
        await expect(btns).toHaveCount(2);
    });

    test('tlačítko Průvodce má data-plan="pruvodce"', async ({ page }) => {
        const btn = page.locator('[data-plan="pruvodce"]');
        await expect(btn).toBeVisible();
    });

    test('tlačítko Osvícení má data-plan="osviceni"', async ({ page }) => {
        const btn = page.locator('[data-plan="osviceni"]');
        await expect(btn).toBeVisible();
    });

    test('bezny cenik nezobrazuje VIP jako hlavni checkout CTA', async ({ page }) => {
        const btn = page.locator('[data-plan="vip-majestrat"]');
        await expect(btn).toHaveCount(0);
    });

    test('runtime copy update zachova check ikony ve vsech cenikovych benefitech', async ({ page }) => {
        await expect(page.locator('.card--pricing .card__features li .feature-icon')).toHaveCount(10);
    });

    test('free CTA nese aktivacni kontext pro rychlou prvni hodnotu', async ({ page }) => {
        const href = await page.locator('[data-pricing-free-cta]').getAttribute('href');
        expect(href).toContain('mode=register');
        expect(href).toContain('redirect=/horoskopy.html');
        expect(href).toContain('source=pricing_free_cta');
        expect(href).toContain('feature=daily_guidance');
    });

    test('rychla volba v ceniku nabizi 3 jasne dalsi kroky', async ({ page }) => {
        const guide = page.locator('.pricing-decision');
        await expect(guide).toBeVisible();
        await expect(guide.locator('[data-pricing-choice]')).toHaveCount(3);
    });

    test('rychla volba zdarma zvyrazni bezplatny tarif', async ({ page }) => {
        await page.locator('[data-pricing-choice="free"]').click();

        const freeCard = page.locator('.card--pricing', { has: page.locator('[data-pricing-free-cta]') });
        await expect(freeCard).toHaveClass(/pricing-card--recommended/);
        await expect(page.locator('[data-pricing-choice="free"]')).toHaveAttribute('aria-pressed', 'true');
    });

    test('rychla volba pruvodce respektuje aktualni rocni billing', async ({ page }) => {
        await page.locator('#toggle-yearly').click();
        await page.locator('[data-pricing-choice="pruvodce"]').click();

        const yearlyGuideCard = page.locator('.card--pricing', { has: page.locator('[data-plan="pruvodce-rocne"]') });
        await expect(yearlyGuideCard).toHaveClass(/pricing-card--recommended/);
    });

    test('mobilni cookie lista v ceniku zustava kompaktni', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.evaluate(() => {
            localStorage.removeItem('mh_cookie_prefs');
            localStorage.removeItem('cookieConsent');
        });
        await page.goto('/cenik.html');
        await waitForPageReady(page);

        const banner = page.locator('#cookie-banner');
        await expect(banner).toBeVisible({ timeout: 4000 });

        const box = await banner.boundingBox();
        expect(box?.height || 0).toBeLessThan(190);
        expect(box?.width || 0).toBeLessThanOrEqual(366);
    });

    test('feature kontext zobrazi doporuceny plan a umi ho zvyraznit', async ({ page }) => {
        await page.goto('/cenik.html?source=inline_paywall&feature=astrocartography');
        await waitForPageReady(page);

        const banner = page.locator('#pricing-plan-recommendation');
        await expect(banner).toBeVisible();
        await expect(banner).toContainText('Osvícení');

        await banner.locator('[data-recommended-plan="osviceni"]').click();
        await expect(page.locator('.card--pricing', { has: page.locator('[data-plan="osviceni"]') })).toHaveClass(/pricing-card--recommended/);
    });

    test('feature kontext nabizi navrat na relevantni bezplatny nahled', async ({ page }) => {
        await page.goto('/cenik.html?source=inline_paywall&feature=numerologie_vyklad&plan=pruvodce');
        await waitForPageReady(page);

        const previewLink = page.locator('[data-preview-destination]');
        await expect(previewLink).toBeVisible();

        const href = await previewLink.getAttribute('href');
        expect(href).toContain('/numerologie.html');
        expect(href).toContain('source=pricing_recommendation_preview');
        expect(href).toContain('entry_source=inline_paywall');
        expect(href).toContain('entry_feature=numerologie_vyklad');
    });

    test('personal map email return zobrazi konkretni navazujici krok', async ({ page }) => {
        await page.goto('/cenik.html?source=personal_map_email_day3&feature=premium_membership&plan=pruvodce&utm_source=email&utm_campaign=personal_map_day3');
        await waitForPageReady(page);

        const banner = page.locator('#pricing-plan-recommendation');
        await expect(banner).toBeVisible();
        await expect(banner).toContainText('Navazuje na Osobní mapu');
        await expect(banner).toContainText('Mapa ti dala směr');
        await expect(banner.locator('[data-recommended-plan="pruvodce"]')).toBeVisible();

        const previewLink = banner.locator('[data-preview-destination]');
        await expect(previewLink).toBeVisible();
        const href = await previewLink.getAttribute('href');
        expect(href).toContain('/mentor.html');
        expect(href).toContain('source=pricing_recommendation_preview');
        expect(href).toContain('entry_source=personal_map_email_day3');
        expect(href).toContain('entry_feature=premium_membership');
    });

    test('bezny cenik bez feature kontextu neduplikuje preview CTA', async ({ page }) => {
        await page.goto('/cenik.html');
        await waitForPageReady(page);

        await expect(page.locator('[data-preview-destination]')).toHaveCount(0);
    });

    test('zruseny checkout zobrazi recovery panel s kontextovym navratem', async ({ page }) => {
        await page.goto('/cenik.html?payment=cancel&plan=pruvodce&source=inline_paywall&feature=tarot_multi_card');
        await waitForPageReady(page);

        const recovery = page.locator('#pricing-cancel-recovery');
        await expect(recovery).toBeVisible();
        await expect(recovery).toContainText('Platba nebyla');

        const previewHref = await recovery.locator('[data-cancel-preview]').getAttribute('href');
        expect(previewHref).toContain('/tarot.html');
        expect(previewHref).toContain('source=pricing_recommendation_preview');
        expect(previewHref).toContain('entry_source=inline_paywall');
        expect(previewHref).toContain('entry_feature=tarot_multi_card');

        const downsellHref = await recovery.locator('[data-cancel-downsell]').getAttribute('href');
        expect(downsellHref).toContain('/rocni-horoskop.html');
        expect(downsellHref).toContain('source=checkout_cancel_recovery');
        expect(downsellHref).toContain('entry_plan=pruvodce');
        expect(page.url()).not.toContain('payment=cancel');
    });

    // ── Kritický test: nepřihlášený uživatel → správné přesměrování ──────────

    test('klik na checkout bez přihlášení přesměruje na prihlaseni.html', async ({ page }) => {
        // Ujistíme se, že není přihlášen (čistý stav)
        await page.evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();
        });
        await page.reload();
        await waitForPageReady(page);

        // Počkáme na navigaci po kliknutí
        const [response] = await Promise.all([
            page.waitForNavigation({ timeout: 5000 }).catch(() => null),
            page.locator('[data-plan="pruvodce"]').click(),
        ]);

        const url = page.url();

        // Nesmí jít na /registrace.html (neexistující stránka)
        expect(url).not.toContain('registrace.html');
        // Musí jít na prihlaseni.html
        expect(url).toContain('prihlaseni.html');

        const parsedUrl = new URL(url);
        expect(parsedUrl.searchParams.get('mode')).toBe('register');
        expect(parsedUrl.searchParams.get('redirect')).toBe('/cenik.html');
        expect(parsedUrl.searchParams.get('plan')).toBe('pruvodce');
        expect(parsedUrl.searchParams.get('source')).toBe('pricing_page');
    });

    test('/registrace.html vrátí 404 (stránka neexistuje — nesmíme tam přesměrovávat)', async ({ page }) => {
        const res = await page.request.get('/registrace.html');
        expect(res.status()).toBe(404);
    });

    test('/prihlaseni.html vrátí 200 (cíl přesměrování existuje)', async ({ page }) => {
        const res = await page.request.get('/prihlaseni.html');
        expect(res.status()).toBe(200);
    });

    // ── Žádný duplicitní handler ─────────────────────────────────────────────

    test('cenik.html nenačítá platby.js jako inline module import', async ({ page }) => {
        const hasPlattbyImport = await page.evaluate(() => {
            const moduleScripts = Array.from(document.querySelectorAll('script[type="module"]:not([src])'));
            return moduleScripts.some(s => s.textContent.includes('platby.js'));
        });
        expect(hasPlattbyImport).toBe(false);
    });

    test('cenik.js je načten (defer script)', async ({ page }) => {
        const hasCenikScript = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('script[src]'))
                .some(s => s.src.includes('cenik.js'));
        });
        expect(hasCenikScript).toBe(true);
    });

    // ── Billing toggle ───────────────────────────────────────────────────────

    test('výchozí zobrazení je měsíční ceny', async ({ page }) => {
        const pruvodcePrice = await page.locator('[data-price-plan="pruvodce"] .price-amount').textContent();
        expect(pruvodcePrice).toContain('199');
    });

    test('prepnuti na rocni zobrazi rocni cenu', async ({ page }) => {
        await page.locator('#toggle-yearly').click();
        const pruvodcePrice = await page.locator('[data-price-plan="pruvodce"] .price-amount').textContent();
        expect(pruvodcePrice).toContain('1 990');
    });

    test('přepnutí zpět na měsíční obnoví původní ceny', async ({ page }) => {
        await page.locator('#toggle-yearly').click();
        await page.locator('#toggle-monthly').click();
        const pruvodcePrice = await page.locator('[data-price-plan="pruvodce"] .price-amount').textContent();
        expect(pruvodcePrice).toContain('199');
    });

    // ── pending_plan se uloží do sessionStorage ───────────────────────────────

    test('klik bez přihlášení uloží planId do sessionStorage', async ({ page }) => {
        await page.evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();
        });
        await page.reload();
        await waitForPageReady(page);

        await Promise.all([
            page.waitForNavigation({ timeout: 5000 }).catch(() => null),
            page.locator('[data-plan="pruvodce"]').click(),
        ]);

        // Po přesměrování zpět zkontrolujeme sessionStorage (na prihlaseni.html)
        const pending = await page.evaluate(() => sessionStorage.getItem('pending_plan'));
        expect(pending).toBe('pruvodce');
    });

    test('prihlaseny checkout posila serveru funnel kontext a billing interval', async ({ page }) => {
        let checkoutPayload = null;

        await page.route('**/api/payment/create-checkout-session', async (route) => {
            checkoutPayload = route.request().postDataJSON();
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    id: 'cs_test_funnel_context',
                    url: '/profil.html?payment=success&plan=pruvodce-rocne&session_id=cs_test_funnel_context'
                })
            });
        });

        await page.context().addCookies([{
            name: 'logged_in',
            value: '1',
            url: 'http://localhost:3001'
        }]);

        await page.addInitScript(() => {
            localStorage.setItem('auth_user', JSON.stringify({
                id: 'e2e-user',
                email: 'e2e@example.com',
                role: 'user'
            }));
        });

        await page.goto('/cenik.html?source=inline_paywall&feature=numerologie_vyklad&plan=pruvodce');
        await waitForPageReady(page);
        await page.locator('#toggle-yearly').click();

        await Promise.all([
            page.waitForURL(/profil\.html\?payment=success/),
            page.locator('[data-plan="pruvodce-rocne"]').click(),
        ]);

        expect(checkoutPayload).toEqual(expect.objectContaining({
            planId: 'pruvodce-rocne',
            source: 'inline_paywall',
            feature: 'numerologie_vyklad',
            billingInterval: 'yearly'
        }));
    });

    test('prihlaseny checkout z personal map emailu posila UTM metadata', async ({ page }) => {
        let checkoutPayload = null;

        await page.route('**/api/payment/create-checkout-session', async (route) => {
            checkoutPayload = route.request().postDataJSON();
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    id: 'cs_test_personal_map_email',
                    url: '/profil.html?payment=success&plan=pruvodce&session_id=cs_test_personal_map_email'
                })
            });
        });

        await page.context().addCookies([{
            name: 'logged_in',
            value: '1',
            url: 'http://localhost:3001'
        }]);

        await page.addInitScript(() => {
            localStorage.setItem('auth_user', JSON.stringify({
                id: 'e2e-user',
                email: 'e2e@example.com',
                role: 'user'
            }));
        });

        await page.goto('/cenik.html?source=personal_map_email_day3&feature=premium_membership&plan=pruvodce&utm_source=email&utm_campaign=personal_map_day3&utm_content=day3_cta');
        await waitForPageReady(page);

        await Promise.all([
            page.waitForURL(/profil\.html\?payment=success/),
            page.locator('[data-plan="pruvodce"]').click(),
        ]);

        expect(checkoutPayload).toEqual(expect.objectContaining({
            planId: 'pruvodce',
            source: 'personal_map_email_day3',
            feature: 'premium_membership',
            billingInterval: 'monthly',
            metadata: expect.objectContaining({
                entry_source: 'personal_map_email_day3',
                entry_feature: 'premium_membership',
                utm_source: 'email',
                utm_campaign: 'personal_map_day3',
                utm_content: 'day3_cta'
            })
        }));
    });

    test('pending checkout se po registraci dokonci se stejnym kontextem', async ({ page }) => {
        let authPayload = null;
        let checkoutPayload = null;

        await page.route('**/api/auth/register', async (route) => {
            authPayload = route.request().postDataJSON();
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    success: true,
                    user: {
                        id: 'post-auth-user',
                        email: 'postauth@example.com',
                        role: 'user',
                        subscription_status: 'free'
                    }
                })
            });
        });

        await page.route('**/api/payment/create-checkout-session', async (route) => {
            checkoutPayload = route.request().postDataJSON();
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    id: 'cs_test_post_auth',
                    url: '/profil.html?payment=success&plan=pruvodce&session_id=cs_test_post_auth'
                })
            });
        });

        await page.evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();
        });

        await page.goto('/cenik.html?source=inline_paywall&feature=numerologie_vyklad');
        await waitForPageReady(page);

        await Promise.all([
            page.waitForURL(/prihlaseni\.html/),
            page.locator('[data-plan="pruvodce"]').click(),
        ]);

        await expect(page.locator('#checkout-context-banner')).toBeVisible();
        await page.locator('#email').fill('postauth@example.com');
        await page.locator('#password').fill('TestPassword123!');
        await page.locator('#confirm-password-reg').fill('TestPassword123!');
        await page.locator('#gdpr-consent').check();

        await Promise.all([
            page.waitForURL(/profil\.html\?payment=success/),
            page.locator('#auth-submit').click(),
        ]);

        expect(authPayload).toEqual(expect.objectContaining({
            email: 'postauth@example.com',
            password: 'TestPassword123!',
            password_confirm: 'TestPassword123!'
        }));
        expect(checkoutPayload).toEqual(expect.objectContaining({
            planId: 'pruvodce',
            source: 'inline_paywall',
            feature: 'numerologie_vyklad'
        }));

        const pending = await page.evaluate(() => sessionStorage.getItem('pending_plan'));
        expect(pending).toBeNull();
    });
});
