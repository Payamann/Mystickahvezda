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
import { BASE_URL, waitForPageReady } from './helpers.js';

async function waitForPath(page, pathname, options = {}) {
    await page.waitForURL(
        url => url.pathname === pathname,
        { timeout: 10000, waitUntil: 'domcontentloaded', ...options }
    );
}

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

    test('placene CTA maji prihlasovaci fallback i bez cenik.js', async ({ page }) => {
        await page.route('**/js/dist/cenik.js*', route => route.abort());
        await page.goto('/cenik.html', { waitUntil: 'domcontentloaded' });

        const guideCta = page.locator('.plan-checkout-btn[data-plan="pruvodce"]');
        await expect(guideCta).toHaveAttribute('href', /prihlaseni\.html\?mode=register/);
        await expect(guideCta).toHaveAttribute('href', /plan=pruvodce/);

        await Promise.all([
            waitForPath(page, '/prihlaseni.html'),
            guideCta.click(),
        ]);

        const url = new URL(page.url());
        expect(url.searchParams.get('mode')).toBe('register');
        expect(url.searchParams.get('redirect')).toBe('/cenik.html');
        expect(url.searchParams.get('plan')).toBe('pruvodce');
        expect(url.searchParams.get('source')).toBe('pricing_page');
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

    test('rychla volba v ceniku nabizi 4 jasne dalsi kroky', async ({ page }) => {
        const guide = page.locator('.pricing-decision');
        await expect(guide).toBeVisible();
        await expect(guide.locator('[data-pricing-choice]')).toHaveCount(4);
    });

    test('cenik ukazuje duverove odkazy pred platbou', async ({ page }) => {
        const trustLinks = page.locator('.pricing-trust-links');
        await expect(trustLinks).toBeVisible();
        await expect(trustLinks.locator('a[href="podminky.html"]')).toBeVisible();
        await expect(trustLinks.locator('a[href="soukromi.html"]')).toBeVisible();
        await expect(trustLinks.locator('a[href="#cookie-banner"]')).toBeVisible();
        await expect(trustLinks.locator('a[href="kontakt.html"]')).toBeVisible();
    });

    test('cenik konkretizuje prvni tyden hodnoty po upgradu', async ({ page }) => {
        const firstWeek = page.locator('.pricing-first-week');
        await expect(firstWeek).toBeVisible();
        await expect(firstWeek.locator('.pricing-first-week__step')).toHaveCount(4);
        await expect(firstWeek.locator('[data-analytics-cta="pricing_first_week_natal"]')).toHaveAttribute('href', /natalni-karta\.html/);
        await expect(firstWeek.locator('[data-analytics-cta="pricing_first_week_profile"]')).toHaveAttribute('href', /profil\.html/);
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

    test('rychla volba jednorazoveho PDF zvyrazni rocni horoskop', async ({ page }) => {
        await page.locator('[data-pricing-choice="one_time"]').click();

        await expect(page.locator('[data-pricing-choice="one_time"]')).toHaveAttribute('aria-pressed', 'true');
        await expect(page.locator('.pricing-addon')).toHaveClass(/pricing-addon--recommended/);
        await expect(page.locator('[data-product="rocni_horoskop_2026"]')).toHaveClass(/pricing-addon__product--recommended/);
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

        const metrics = await page.evaluate(() => {
            const cta = document.querySelector('.plan-checkout-btn[data-plan="pruvodce"]')?.getBoundingClientRect();
            const cookieEl = document.getElementById('cookie-banner');
            const cookie = cookieEl?.getBoundingClientRect();
            const overlapsCookie = !!(cta && cookie && !(
                cookie.right < cta.left
                || cookie.left > cta.right
                || cookie.bottom < cta.top
                || cookie.top > cta.bottom
            ));
            const visibleControlOverlaps = [...document.querySelectorAll('a,button,input[type="submit"],.cta,.btn')]
                .filter((el) => {
                    if (cookieEl?.contains(el)) return false;
                    const rect = el.getBoundingClientRect();
                    const label = (el.innerText || el.value || el.getAttribute('aria-label') || '').trim();
                    return label && rect.width > 20 && rect.height > 12 && rect.bottom > 0 && rect.top < window.innerHeight;
                })
                .map((el) => {
                    const rect = el.getBoundingClientRect();
                    const overlap = !!(cookie && !(
                        rect.right <= cookie.left
                        || rect.left >= cookie.right
                        || rect.bottom <= cookie.top
                        || rect.top >= cookie.bottom
                    ));
                    return {
                        text: (el.innerText || el.value || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 80),
                        top: Math.round(rect.top),
                        bottom: Math.round(rect.bottom),
                        overlap
                    };
                })
                .filter((item) => item.overlap);

            return {
                ctaBottom: Math.round(cta?.bottom || 9999),
                cookieTop: Math.round(cookie?.top || window.innerHeight),
                overlapsCookie,
                visibleControlOverlaps,
                overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
            };
        });

        expect(metrics.overflow).toBe(false);
        expect(metrics.overlapsCookie).toBe(false);
        expect(metrics.visibleControlOverlaps).toEqual([]);

        await page.goto('/cenik.html?source=e2e_pricing_cookie&feature=mentor');
        await waitForPageReady(page);

        await expect.poll(() => page.evaluate(() => {
            const cta = document.querySelector('.plan-checkout-btn[data-plan="pruvodce"]')?.getBoundingClientRect();
            const cookie = document.getElementById('cookie-banner')?.getBoundingClientRect();
            return Math.round(cta?.bottom || 9999) <= Math.round(cookie?.top || window.innerHeight);
        }), { timeout: 6000 }).toBe(true);
    });

    test('desktopni cookie lista neprekryva cenove CTA', async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 720 });
        await page.evaluate(() => {
            localStorage.removeItem('mh_cookie_prefs');
            localStorage.removeItem('cookieConsent');
        });
        await page.goto('/cenik.html');
        await waitForPageReady(page);

        const banner = page.locator('#cookie-banner');
        await expect(banner).toBeVisible({ timeout: 4000 });
        await page.locator('.pricing-grid').scrollIntoViewIfNeeded();

        const metrics = await page.evaluate(() => {
            const cookie = document.getElementById('cookie-banner')?.getBoundingClientRect();
            const buttons = Array.from(document.querySelectorAll('.plan-checkout-btn'))
                .map((button) => {
                    const rect = button.getBoundingClientRect();
                    const overlapsCookie = !!(cookie && !(
                        cookie.right < rect.left
                        || cookie.left > rect.right
                        || cookie.bottom < rect.top
                        || cookie.top > rect.bottom
                    ));
                    return {
                        visible: rect.bottom > 0 && rect.top < window.innerHeight,
                        overlapsCookie
                    };
                });

            return {
                cookieHeight: cookie?.height || 0,
                buttons
            };
        });

        expect(metrics.cookieHeight).toBeLessThanOrEqual(72);
        for (const button of metrics.buttons) {
            expect(button.visible).toBe(true);
            expect(button.overlapsCookie).toBe(false);
        }
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

    test('daily angel pricing preview nemate Kartu dne s andelskym vykladem', async ({ page }) => {
        await page.goto('/cenik.html?source=homepage_daily_card_full_reading&feature=daily_angel_card&plan=pruvodce');
        await waitForPageReady(page);

        const previewLink = page.locator('[data-preview-destination]');
        await expect(previewLink).toBeVisible();
        await expect(previewLink).toContainText('andělskou kartu zdarma');
        await expect(previewLink).not.toContainText('Kartu dne');

        const href = await previewLink.getAttribute('href');
        expect(href).toContain('/andelske-karty.html');
        expect(href).toContain('source=pricing_recommendation_preview');
        expect(href).toContain('entry_source=homepage_daily_card_full_reading');
        expect(href).toContain('entry_feature=daily_angel_card');
    });

    test('profilova pamet ma v ceniku vlastni navazujici upgrade kontext', async ({ page }) => {
        await page.goto('/cenik.html?source=profile_memory&feature=ritual_memory');
        await waitForPageReady(page);

        const banner = page.locator('#pricing-plan-recommendation');
        await expect(banner).toBeVisible();
        await expect(banner).toContainText('Navazuje na Paměť rituálu');
        await expect(banner).toContainText('Odemknout hlubší paměť');
        await expect(banner.locator('[data-recommended-plan="pruvodce"]')).toBeVisible();

        const previewLink = banner.locator('[data-preview-destination]');
        await expect(previewLink).toBeVisible();
        const href = await previewLink.getAttribute('href');
        expect(href).toContain('/profil.html');
        expect(href).toContain('#ritual-memory-card');
        expect(href).toContain('source=pricing_recommendation_preview');
        expect(href).toContain('entry_source=profile_memory');
        expect(href).toContain('entry_feature=ritual_memory');
    });

    test('tarot tri karty pricing kontext navazuje na vybrany rozklad', async ({ page }) => {
        await page.goto('/cenik.html?plan=pruvodce&source=tarot_three_card_landing&feature=tarot_multi_card');
        await waitForPageReady(page);

        const banner = page.locator('#pricing-plan-recommendation');
        await expect(banner).toBeVisible();
        await expect(banner).toContainText('Navazuje na výklad 3 karet');
        await expect(banner).toContainText('Odemknout výklad 3 karet');
        await expect(banner.locator('[data-recommended-plan="pruvodce"]')).toBeVisible();

        const previewLink = banner.locator('[data-preview-destination]');
        await expect(previewLink).toBeVisible();
        const href = await previewLink.getAttribute('href');
        expect(href).toContain('/tarot.html');
        expect(href).toContain('feature=tarot_multi_card');
        expect(href).toContain('intent=three_cards');
        expect(href).toContain('spread=three_cards');
        expect(href).toContain('source=pricing_recommendation_preview');
        expect(href).toContain('entry_source=tarot_three_card_landing');
        expect(href).toContain('entry_feature=tarot_multi_card');
    });

    test('tarot keltsky kriz pricing kontext smeruje na vip a preview se vraci na rozklad', async ({ page }) => {
        await page.goto('/cenik.html?plan=vip-majestrat&source=tarot_celtic_cross_landing&feature=tarot_celtic_cross');
        await waitForPageReady(page);

        const banner = page.locator('#pricing-plan-recommendation');
        await expect(banner).toBeVisible();
        await expect(banner).toContainText('Navazuje na Keltský kříž');
        await expect(banner).toContainText('Odemknout Keltský kříž');
        await expect(banner.locator('[data-recommended-plan="vip-majestrat"]')).toBeVisible();

        const previewLink = banner.locator('[data-preview-destination]');
        await expect(previewLink).toBeVisible();
        const href = await previewLink.getAttribute('href');
        expect(href).toContain('/tarot.html');
        expect(href).toContain('feature=tarot_celtic_cross');
        expect(href).toContain('intent=celtic_cross');
        expect(href).toContain('spread=celtic_cross');
        expect(href).toContain('source=pricing_recommendation_preview');
        expect(href).toContain('entry_source=tarot_celtic_cross_landing');
        expect(href).toContain('entry_feature=tarot_celtic_cross');
    });

    test('tarot laska pricing kontext mluvi vztahove a vraci na trikartovy rozklad', async ({ page }) => {
        await page.goto('/cenik.html?plan=pruvodce&source=tarot_love_landing&feature=tarot_multi_card');
        await waitForPageReady(page);

        const banner = page.locator('#pricing-plan-recommendation');
        await expect(banner).toBeVisible();
        await expect(banner).toContainText('Navazuje na tarot na lásku');
        await expect(banner).toContainText('Odemknout vztahový výklad');
        await expect(banner.locator('[data-recommended-plan="pruvodce"]')).toBeVisible();

        const previewLink = banner.locator('[data-preview-destination]');
        await expect(previewLink).toBeVisible();
        const href = await previewLink.getAttribute('href');
        expect(href).toContain('/tarot.html');
        expect(href).toContain('feature=tarot_multi_card');
        expect(href).toContain('intent=three_cards');
        expect(href).toContain('spread=three_cards');
        expect(href).toContain('entry_source=tarot_love_landing');
        expect(href).toContain('entry_feature=tarot_multi_card');
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

    test('annual horoscope email return zobrazi konkretni navazujici krok', async ({ page }) => {
        await page.goto('/cenik.html?source=annual_horoscope_email_day3&feature=premium_membership&plan=pruvodce&utm_source=email&utm_campaign=annual_horoscope_day3');
        await waitForPageReady(page);

        const banner = page.locator('#pricing-plan-recommendation');
        await expect(banner).toBeVisible();
        await expect(banner).toContainText('Navazuje na Roční horoskop');
        await expect(banner).toContainText('Roční výhled dal směr');
        await expect(banner.locator('[data-recommended-plan="pruvodce"]')).toBeVisible();

        const previewLink = banner.locator('[data-preview-destination]');
        await expect(previewLink).toBeVisible();
        const href = await previewLink.getAttribute('href');
        expect(href).toContain('/mentor.html');
        expect(href).toContain('source=pricing_recommendation_preview');
        expect(href).toContain('entry_source=annual_horoscope_email_day3');
        expect(href).toContain('entry_feature=premium_membership');
    });

    test('annual horoscope success return zobrazi pruvodce jako dalsi krok', async ({ page }) => {
        await page.goto('/cenik.html?source=annual_horoscope_success&feature=premium_membership&plan=pruvodce');
        await waitForPageReady(page);

        const banner = page.locator('#pricing-plan-recommendation');
        await expect(banner).toBeVisible();
        await expect(banner).toContainText('Další krok po Ročním horoskopu');
        await expect(banner).toContainText('PDF dá velký směr');
        await expect(banner.locator('[data-recommended-plan="pruvodce"]')).toBeVisible();
    });

    test('bezny cenik bez feature kontextu neduplikuje preview CTA', async ({ page }) => {
        await page.goto('/cenik.html');
        await waitForPageReady(page);

        await expect(page.locator('[data-preview-destination]')).toHaveCount(0);
    });

    test('homepage header ma jen jeden cenik vstup bez checkout gate', async ({ page }) => {
        await page.goto('/');
        await waitForPageReady(page);

        await expect(page.locator('#upgrade-cta')).toHaveCount(0);
        await expect(page.locator('#mobile-upgrade-cta')).toHaveCount(0);

        const pricingLinks = page.locator('.nav__dropdown-link', { hasText: /Ceník/i });
        await expect(pricingLinks).toHaveCount(1);

        const href = await pricingLinks.first().getAttribute('href');
        expect(href).toBe('cenik.html');
    });

    test('trial paywall bez manifestu neslibuje neovereny trial', async ({ page }) => {
        await page.goto('/tests/premium-test.html');
        await waitForPageReady(page);
        await page.waitForFunction(() => !!window.Premium?.showTrialPaywall);

        await page.evaluate(() => {
            window.Premium._plansById = new Map();
            window.Premium._featurePlanMap = {};
            window.Premium.showTrialPaywall('numerologie_vyklad');
        });

        const footer = page.locator('.paywall-footer');
        await expect(footer).toBeVisible();
        await expect(footer).toContainText('Cena se zobrazí ve Stripe před potvrzením');
        await expect(footer).toContainText('Zrušení v profilu');
        await expect(footer).not.toContainText('7 dní zdarma');
        await expect(footer).not.toContainText('Karta požadována');
        await expect(page.locator('.paywall-trial-badge')).toHaveCount(0);
        await expect(page.locator('.paywall-upgrade')).not.toContainText('7 dní zdarma');
    });

    test('trial paywall s manifestem ukaze overeny trial a Stripe reassurance', async ({ page }) => {
        await page.goto('/tests/premium-test.html');
        await waitForPageReady(page);
        await page.waitForFunction(() => !!window.Premium?.showTrialPaywall);

        await page.evaluate(() => {
            window.Premium._plansById = new Map([
                ['pruvodce', {
                    id: 'pruvodce',
                    name: 'Hvězdný Průvodce (Měsíční)',
                    priceLabel: '199 Kč',
                    interval: 'month',
                    trialDays: 7
                }]
            ]);
            window.Premium._featurePlanMap = { numerologie_vyklad: 'pruvodce' };
            window.Premium.showTrialPaywall('numerologie_vyklad');
        });

        const footer = page.locator('.paywall-footer');
        await expect(page.locator('.paywall-trial-badge')).toContainText('7 DNÍ ZDARMA');
        await expect(page.locator('.paywall-upgrade')).toContainText('Vyzkoušet 7 dní zdarma');
        await expect(footer).toContainText('7 dní zdarma');
        await expect(footer).toContainText('Cena se zobrazí ve Stripe před potvrzením');
        await expect(footer).toContainText('Zrušení v profilu');
    });

    test('login gate copy jasne oddeluje ucet zdarma od placeneho checkoutu', async ({ page }) => {
        await page.goto('/tests/premium-test.html');
        await waitForPageReady(page);
        await page.waitForFunction(() => !!window.Premium?.showLoginGate);

        await page.evaluate(() => {
            const host = document.createElement('div');
            host.id = 'login-gate-test-host';
            document.body.appendChild(host);
            window.Premium._featurePlanMap = { natalni_interpretace: 'pruvodce' };
            window.Premium.showLoginGate(host, null, 'natalni_interpretace', 'natal_teaser_gate');
        });

        const gate = page.locator('#login-gate-test-host .login-gate');
        await expect(gate).toBeVisible();
        await expect(gate).toContainText('Placený plán potvrdíte');
        await expect(gate.locator('.login-gate-btn')).toContainText('Pokračovat k odemčení');
        await expect(gate).not.toContainText('Přihlásit se zdarma');

        await Promise.all([
            waitForPath(page, '/prihlaseni.html'),
            gate.locator('.login-gate-btn').click(),
        ]);

        const url = new URL(page.url());
        expect(url.searchParams.get('plan')).toBe('pruvodce');
        expect(url.searchParams.get('source')).toBe('natal_teaser_gate');
        expect(url.searchParams.get('feature')).toBe('natalni_interpretace');
    });

    test('klik na placeny plan zapise serverovy funnel intent pred registraci', async ({ page }) => {
        let resolvePricingIntent;
        const pricingIntent = new Promise((resolve) => {
            resolvePricingIntent = resolve;
        });

        await page.route('**/api/csrf-token', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ csrfToken: 'e2e-pricing-intent-token' })
            });
        });

        await page.route('**/api/payment/funnel-event', async (route) => {
            const payload = route.request().postDataJSON();
            if (payload?.eventName === 'pricing_plan_cta_clicked') {
                resolvePricingIntent(payload);
            }

            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ success: true })
            });
        });

        await page.goto('/cenik.html?source=inline_paywall&feature=tarot_multi_card&plan=pruvodce');
        await waitForPageReady(page);

        await Promise.all([
            pricingIntent,
            waitForPath(page, '/prihlaseni.html'),
            page.locator('.plan-checkout-btn[data-plan="pruvodce"]').click()
        ]);

        await expect.poll(async () => {
            const payload = await pricingIntent;
            return payload;
        }).toEqual(expect.objectContaining({
            eventName: 'pricing_plan_cta_clicked',
            source: 'inline_paywall',
            feature: 'tarot_multi_card',
            planId: 'pruvodce',
            metadata: expect.objectContaining({
                path: '/cenik.html',
                requires_auth: true,
                destination: '/prihlaseni.html',
                billing_interval: 'monthly'
            })
        }));
    });

    test('free CTA zapise serverovy funnel intent pred registraci', async ({ page }) => {
        let resolveFreeIntent;
        const freeIntent = new Promise((resolve) => {
            resolveFreeIntent = resolve;
        });

        await page.route('**/api/csrf-token', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ csrfToken: 'e2e-pricing-free-token' })
            });
        });

        await page.route('**/api/payment/funnel-event', async (route) => {
            const payload = route.request().postDataJSON();
            if (payload?.eventName === 'pricing_free_cta_clicked') {
                resolveFreeIntent(payload);
            }

            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ success: true })
            });
        });

        await page.goto('/cenik.html?source=homepage_cta&feature=daily_guidance');
        await waitForPageReady(page);

        await Promise.all([
            freeIntent,
            waitForPath(page, '/prihlaseni.html'),
            page.locator('[data-pricing-free-cta]').click()
        ]);

        await expect.poll(async () => {
            const payload = await freeIntent;
            return payload;
        }).toEqual(expect.objectContaining({
            eventName: 'pricing_free_cta_clicked',
            source: 'pricing_free_cta',
            feature: 'daily_guidance',
            metadata: expect.objectContaining({
                path: '/cenik.html',
                entry_source: 'homepage_cta',
                entry_feature: 'daily_guidance',
                auth_mode: 'register'
            })
        }));
    });

    test('produktovy doplnek zapise serverovy funnel intent pred navigaci', async ({ page }) => {
        let resolveProductIntent;
        const productIntent = new Promise((resolve) => {
            resolveProductIntent = resolve;
        });

        await page.route('**/api/csrf-token', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ csrfToken: 'e2e-pricing-product-token' })
            });
        });

        await page.route('**/api/payment/funnel-event', async (route) => {
            const payload = route.request().postDataJSON();
            if (payload?.eventName === 'pricing_product_cta_clicked') {
                resolveProductIntent(payload);
            }

            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ success: true })
            });
        });

        await page.goto('/cenik.html?source=pricing_page&feature=premium_membership');
        await waitForPageReady(page);

        await Promise.all([
            productIntent,
            page.waitForURL(/rocni-horoskop\.html/),
            page.locator('[data-product="rocni_horoskop_2026"]').click()
        ]);

        await expect.poll(async () => {
            const payload = await productIntent;
            return payload;
        }).toEqual(expect.objectContaining({
            eventName: 'pricing_product_cta_clicked',
            source: 'pricing_addon',
            feature: 'rocni_horoskop_2026',
            metadata: expect.objectContaining({
                path: '/cenik.html',
                product_id: 'rocni_horoskop_2026',
                label: 'Roční horoskop na míru 2026',
                entry_source: 'pricing_page',
                entry_feature: 'premium_membership',
                destination: 'rocni-horoskop.html?source=pricing_addon'
            })
        }));
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
        await expect(recovery.locator('[data-cancel-downsell]')).toContainText('Jednorázová Osobní mapa');
        expect(downsellHref).toContain('/osobni-mapa.html');
        expect(downsellHref).toContain('source=checkout_cancel_recovery');
        expect(downsellHref).toContain('entry_plan=pruvodce');
        expect(page.url()).not.toContain('payment=cancel');
    });

    test('zruseny checkout z horoskopu nabizi rocni horoskop jako nizsi zavazek', async ({ page }) => {
        await page.goto('/cenik.html?payment=cancel&plan=pruvodce&source=inline_paywall&feature=daily_guidance');
        await waitForPageReady(page);

        const recovery = page.locator('#pricing-cancel-recovery');
        await expect(recovery).toBeVisible();
        await expect(recovery.locator('[data-cancel-downsell]')).toContainText('Jednorázový roční horoskop');

        const downsellHref = await recovery.locator('[data-cancel-downsell]').getAttribute('href');
        expect(downsellHref).toContain('/rocni-horoskop.html');
        expect(downsellHref).toContain('entry_feature=daily_guidance');
    });

    test('selhani checkout session zachova kontext a zaloguje recovery navrat', async ({ page }) => {
        let recoveryReturnPayload = null;

        await page.route('**/api/payment/funnel-event', async (route) => {
            const payload = route.request().postDataJSON();
            if (payload?.eventName === 'checkout_returned_failure') {
                recoveryReturnPayload = payload;
            }
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ success: true })
            });
        });

        await page.goto('/cenik.html?payment=failure&reason=session_failed&plan=pruvodce&source=inline_paywall&feature=tarot_multi_card&utm_source=email&utm_campaign=tarot_return', { waitUntil: 'domcontentloaded' });
        await waitForPageReady(page);

        const recovery = page.locator('#pricing-cancel-recovery');
        await expect(recovery).toBeVisible();
        await expect(recovery).toContainText('Platbu se nepoda');
        await expect(recovery).toContainText('Stripe Checkoutu');
        await expect(recovery.locator('[data-cancel-retry]')).toContainText('Zkusit platbu znovu');
        await expect(recovery.locator('[data-cancel-preview]')).not.toContainText('zdarma');

        await expect.poll(() => recoveryReturnPayload).toEqual(expect.objectContaining({
            eventName: 'checkout_returned_failure',
            source: 'inline_paywall',
            feature: 'tarot_multi_card',
            planId: 'pruvodce',
            metadata: expect.objectContaining({
                payment_state: 'failure',
                reason: 'session_failed',
                recovery: true,
                utm_source: 'email',
                utm_campaign: 'tarot_return'
            })
        }));
        expect(page.url()).not.toContain('payment=failure');
    });

    test('recovery kontext po sanitize URL prezije reload bez navratu na default', async ({ page }) => {
        await page.route('**/api/payment/funnel-event', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ success: true })
            });
        });

        await page.goto('/cenik.html?payment=failure&reason=session_failed&plan=pruvodce&source=inline_paywall&feature=tarot_multi_card&entry_source=inline_paywall&entry_feature=tarot_multi_card', { waitUntil: 'domcontentloaded' });
        await waitForPageReady(page);

        const recovery = page.locator('#pricing-cancel-recovery');
        await expect(recovery).toBeVisible();
        await expect(page.locator('#pricing-plan-recommendation [data-recommended-plan="pruvodce"]')).toBeVisible();

        const previewHrefBeforeReload = await recovery.locator('[data-cancel-preview]').getAttribute('href');
        expect(previewHrefBeforeReload).toContain('entry_source=inline_paywall');
        expect(previewHrefBeforeReload).toContain('entry_feature=tarot_multi_card');

        await expect.poll(() => page.url()).not.toContain('payment=failure');

        await page.reload({ waitUntil: 'domcontentloaded' });
        await waitForPageReady(page);

        await expect.poll(async () => {
            return await page.evaluate(() => {
                const recommendation = document.querySelector('#pricing-plan-recommendation');
                const recommendationPlan = recommendation?.querySelector('[data-recommended-plan]')?.getAttribute('data-recommended-plan') || null;
                const recommendationPreview = recommendation?.querySelector('[data-preview-destination]')?.getAttribute('href') || null;

                const recoveryPanel = document.querySelector('#pricing-cancel-recovery');
                const recoveryPreview = recoveryPanel?.querySelector('[data-cancel-preview]')?.getAttribute('href') || null;

                return {
                    recommendationPlan,
                    recommendationPreview,
                    recoveryPreview
                };
            });
        }, { timeout: 8000 }).toEqual(expect.objectContaining({
            recommendationPlan: 'pruvodce'
        }));

        const recoveryContextAfterReload = await page.evaluate(() => {
            const recommendation = document.querySelector('#pricing-plan-recommendation');
            const recommendationPreview = recommendation?.querySelector('[data-preview-destination]')?.getAttribute('href') || null;
            const recoveryPanel = document.querySelector('#pricing-cancel-recovery');
            const recoveryPreview = recoveryPanel?.querySelector('[data-cancel-preview]')?.getAttribute('href') || null;
            return { recommendationPreview, recoveryPreview };
        });

        const previewHrefAfterReload = recoveryContextAfterReload.recoveryPreview || recoveryContextAfterReload.recommendationPreview;
        expect(previewHrefAfterReload).toBeTruthy();
        expect(previewHrefAfterReload).toContain('entry_source=inline_paywall');
        expect(previewHrefAfterReload).toContain('entry_feature=tarot_multi_card');
    });

    test('retry po selhani checkoutu spusti novou checkout session se stejnym kontextem', async ({ page }) => {
        let checkoutPayload = null;

        await page.route('**/api/payment/create-checkout-session', async (route) => {
            checkoutPayload = route.request().postDataJSON();
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    url: '/profil.html?payment=success&plan=pruvodce&session_id=cs_test_recovery_retry'
                })
            });
        });

        await page.context().addCookies([{
            name: 'logged_in',
            value: '1',
            url: BASE_URL
        }]);

        await page.addInitScript(() => {
            localStorage.setItem('auth_user', JSON.stringify({
                id: 'retry-user',
                email: 'retry@example.com',
                role: 'user'
            }));
        });

        await page.goto('/cenik.html?payment=failure&reason=session_failed&plan=pruvodce&source=inline_paywall&feature=tarot_multi_card&utm_source=email&utm_campaign=tarot_return', { waitUntil: 'domcontentloaded' });
        await waitForPageReady(page);

        const recovery = page.locator('#pricing-cancel-recovery');
        await expect(recovery).toBeVisible();
        await expect(recovery.locator('[data-cancel-retry]')).toContainText('Zkusit platbu znovu');

        await Promise.all([
            page.waitForURL(url => (
                url.pathname === '/profil.html'
                && url.searchParams.get('session_id') === 'cs_test_recovery_retry'
            ), { timeout: 10000 }),
            recovery.locator('[data-cancel-retry]').click()
        ]);

        expect(checkoutPayload).toEqual(expect.objectContaining({
            planId: 'pruvodce',
            source: 'inline_paywall',
            feature: 'tarot_multi_card',
            metadata: expect.objectContaining({
                entry_source: 'inline_paywall',
                entry_feature: 'tarot_multi_card',
                utm_source: 'email',
                utm_campaign: 'tarot_return'
            })
        }));
    });

    test('retry po selhani rocniho planu drzi yearly kontext i billing interval', async ({ page }) => {
        let checkoutPayload = null;

        await page.route('**/api/payment/create-checkout-session', async (route) => {
            checkoutPayload = route.request().postDataJSON();
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    url: '/profil.html?payment=success&plan=pruvodce-rocne&session_id=cs_test_recovery_retry_yearly'
                })
            });
        });

        await page.context().addCookies([{
            name: 'logged_in',
            value: '1',
            url: BASE_URL
        }]);

        await page.addInitScript(() => {
            localStorage.setItem('auth_user', JSON.stringify({
                id: 'retry-yearly-user',
                email: 'retry-yearly@example.com',
                role: 'user'
            }));
        });

        await page.goto('/cenik.html?payment=failure&reason=session_failed&plan=pruvodce-rocne&source=annual_horoscope_success&feature=premium_membership&utm_source=email&utm_campaign=annual_return', { waitUntil: 'domcontentloaded' });
        await waitForPageReady(page);

        await expect(page.locator('#toggle-yearly')).toHaveAttribute('aria-pressed', 'true');

        const recovery = page.locator('#pricing-cancel-recovery');
        await expect(recovery).toBeVisible();

        await Promise.all([
            page.waitForURL(url => (
                url.pathname === '/profil.html'
                && url.searchParams.get('session_id') === 'cs_test_recovery_retry_yearly'
            ), { timeout: 10000 }),
            recovery.locator('[data-cancel-retry]').click()
        ]);

        expect(checkoutPayload).toEqual(expect.objectContaining({
            planId: 'pruvodce-rocne',
            source: 'annual_horoscope_success',
            feature: 'premium_membership',
            billingInterval: 'yearly',
            metadata: expect.objectContaining({
                entry_source: 'annual_horoscope_success',
                entry_feature: 'premium_membership',
                utm_source: 'email',
                utm_campaign: 'annual_return'
            })
        }));
    });

    test('prihlaseny checkout pri chybe API vrati uzivatele na recovery panel', async ({ page }) => {
        await page.route('**/api/payment/create-checkout-session', async (route) => {
            await route.fulfill({
                status: 500,
                contentType: 'application/json',
                body: JSON.stringify({ error: 'Stripe unavailable' })
            });
        });

        await page.context().addCookies([{
            name: 'logged_in',
            value: '1',
            url: BASE_URL
        }]);

        await page.addInitScript(() => {
            localStorage.setItem('auth_user', JSON.stringify({
                id: 'e2e-user',
                email: 'e2e@example.com',
                role: 'user'
            }));
        });

        await page.goto('/cenik.html?source=inline_paywall&feature=tarot_multi_card&plan=pruvodce&utm_source=email', { waitUntil: 'domcontentloaded' });
        await waitForPageReady(page);

        await page.locator('[data-plan="pruvodce"]').click();

        const recovery = page.locator('#pricing-cancel-recovery');
        await expect(recovery).toBeVisible();
        await expect(recovery.locator('[data-cancel-retry]')).toContainText('Zkusit platbu znovu');
        const previewHref = await recovery.locator('[data-cancel-preview]').getAttribute('href');
        expect(previewHref).toContain('entry_source=inline_paywall');
        expect(previewHref).toContain('entry_feature=tarot_multi_card');
        expect(page.url()).not.toContain('payment=failure');
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
            url: BASE_URL
        }]);

        await page.addInitScript(() => {
            localStorage.setItem('auth_user', JSON.stringify({
                id: 'e2e-user',
                email: 'e2e@example.com',
                role: 'user'
            }));
        });

        await page.goto('/cenik.html?source=inline_paywall&feature=numerologie_vyklad&plan=pruvodce', { waitUntil: 'domcontentloaded' });
        await waitForPageReady(page);
        await page.locator('#toggle-yearly').click();

        await Promise.all([
            waitForPath(page, '/profil.html'),
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
            url: BASE_URL
        }]);

        await page.addInitScript(() => {
            localStorage.setItem('auth_user', JSON.stringify({
                id: 'e2e-user',
                email: 'e2e@example.com',
                role: 'user'
            }));
        });

        await page.goto('/cenik.html?source=personal_map_email_day3&feature=premium_membership&plan=pruvodce&utm_source=email&utm_campaign=personal_map_day3&utm_content=day3_cta', { waitUntil: 'domcontentloaded' });
        await waitForPageReady(page);

        await Promise.all([
            waitForPath(page, '/profil.html'),
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

    test('prihlaseny checkout z annual horoscope emailu posila UTM metadata', async ({ page }) => {
        let checkoutPayload = null;

        await page.route('**/api/payment/create-checkout-session', async (route) => {
            checkoutPayload = route.request().postDataJSON();
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    id: 'cs_test_annual_horoscope_email',
                    url: '/profil.html?payment=success&plan=pruvodce&session_id=cs_test_annual_horoscope_email'
                })
            });
        });

        await page.context().addCookies([{
            name: 'logged_in',
            value: '1',
            url: BASE_URL
        }]);

        await page.addInitScript(() => {
            localStorage.setItem('auth_user', JSON.stringify({
                id: 'e2e-user',
                email: 'e2e@example.com',
                role: 'user'
            }));
        });

        await page.goto('/cenik.html?source=annual_horoscope_email_day3&feature=premium_membership&plan=pruvodce&utm_source=email&utm_campaign=annual_horoscope_day3&utm_content=day3_cta', { waitUntil: 'domcontentloaded' });
        await waitForPageReady(page);

        await Promise.all([
            waitForPath(page, '/profil.html'),
            page.locator('[data-plan="pruvodce"]').click(),
        ]);

        expect(checkoutPayload).toEqual(expect.objectContaining({
            planId: 'pruvodce',
            source: 'annual_horoscope_email_day3',
            feature: 'premium_membership',
            billingInterval: 'monthly',
            metadata: expect.objectContaining({
                entry_source: 'annual_horoscope_email_day3',
                entry_feature: 'premium_membership',
                utm_source: 'email',
                utm_campaign: 'annual_horoscope_day3',
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

        await page.goto('/cenik.html?source=inline_paywall&feature=numerologie_vyklad&utm_source=email&utm_campaign=numerology_postauth', { waitUntil: 'domcontentloaded' });
        await waitForPageReady(page);

        await Promise.all([
            waitForPath(page, '/prihlaseni.html'),
            page.locator('[data-plan="pruvodce"]').click(),
        ]);

        const authUrl = new URL(page.url());
        expect(authUrl.searchParams.get('billing_interval')).toBe('monthly');
        expect(authUrl.searchParams.get('utm_source')).toBe('email');
        expect(authUrl.searchParams.get('utm_campaign')).toBe('numerology_postauth');

        await expect(page.locator('#checkout-context-banner')).toBeVisible();
        await page.locator('#email').fill('postauth@example.com');
        await page.locator('#password').fill('TestPassword123!');
        await page.locator('#confirm-password-reg').fill('TestPassword123!');
        await page.locator('#gdpr-consent').check();

        await Promise.all([
            waitForPath(page, '/profil.html'),
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
            feature: 'numerologie_vyklad',
            billingInterval: 'monthly',
            metadata: expect.objectContaining({
                entry_source: 'inline_paywall',
                entry_feature: 'numerologie_vyklad',
                utm_source: 'email',
                utm_campaign: 'numerology_postauth'
            })
        }));

        const pending = await page.evaluate(() => sessionStorage.getItem('pending_plan'));
        expect(pending).toBeNull();
    });
});
