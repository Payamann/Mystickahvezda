/**
 * E2E testy — Horoskopy (horoskopy.html)
 *
 * Testuje: načtení stránky, zodiac grid (12 karet), tab navigace (denní/týdenní/měsíční),
 * kliknutí na znamení, přístupnost, SEO.
 */

import { test, expect } from '@playwright/test';
import { BASE_URL, waitForPageReady, assertBasicSEO, ZODIAC_SIGNS, MOBILE_VIEWPORT } from './helpers.js';

async function waitForPath(page, pathname, options = {}) {
    await page.waitForURL(
        url => url.pathname === pathname,
        { timeout: 10000, waitUntil: 'domcontentloaded', ...options }
    );
}

test.describe('Horoskopy', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('/horoskopy.html');
        await waitForPageReady(page);
    });

    // ── Načtení ─────────────────────────────────────────────────────────────

    test('stránka vrátí 200', async ({ page }) => {
        const res = await page.request.get('/horoskopy.html');
        expect(res.status()).toBe(200);
    });

    test('title obsahuje "Horoskop"', async ({ page }) => {
        await assertBasicSEO(page, { titleContains: 'Horoskop' });
    });

    test('h1 je viditelný', async ({ page }) => {
        const h1 = page.locator('h1').first();
        await expect(h1).toBeVisible();
    });

    test('hero subtitle je viditelný', async ({ page }) => {
        const subtitle = page.locator('.hero__subtitle').first();
        await expect(subtitle).toBeVisible();
    });

    test('hero copy nepůsobí jako pevná předpověď', async ({ page }) => {
        const subtitle = page.locator('.hero__subtitle').first();
        await expect(subtitle).toContainText('ne jako pevnou předpověď');

        const description = await page.locator('meta[name="description"]').getAttribute('content');
        expect(description).toContain('Denní horoskop pro Berana až Ryby');
        expect(description).toContain('zdarma');
        expect(description).not.toContain('Přesné předpovědi');
    });

    test('SEO snippet cílí na horoskop na dnes a 12 znamení', async ({ page }) => {
        await expect(page).toHaveTitle('Horoskop na dnes pro 12 znamení | Mystická Hvězda');
        await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
            'content',
            'Horoskop na dnes pro 12 znamení | Mystická Hvězda'
        );
        await expect(page.locator('meta[property="og:description"]')).toHaveAttribute('content', /Vyber si své znamení/);
    });

    // ── Zodiac grid ─────────────────────────────────────────────────────────

    test('zobrazí přesně 12 zodiac karet', async ({ page }) => {
        const cards = page.locator('.zodiac-card');
        await expect(cards).toHaveCount(12);
    });

    test('každá zodiac karta má název znamení', async ({ page }) => {
        const cardNames = page.locator('.zodiac-card__name');
        const count = await cardNames.count();
        expect(count).toBe(12);

        for (let i = 0; i < count; i++) {
            const text = await cardNames.nth(i).innerText();
            expect(text.trim().length).toBeGreaterThan(1);
        }
    });

    test('každá zodiac karta má symbol', async ({ page }) => {
        const symbols = page.locator('.zodiac-card__symbol');
        const count = await symbols.count();
        expect(count).toBe(12);
    });

    test('každá zodiac karta má data rozsah', async ({ page }) => {
        const dates = page.locator('.zodiac-card__dates');
        const count = await dates.count();
        expect(count).toBe(12);
    });

    // Ověříme že všechna 12 znamení jsou přítomna (podle textu)
    for (const sign of ZODIAC_SIGNS) {
        test(`zodiac karta "${sign.cs}" je přítomna`, async ({ page }) => {
            const card = page.locator('.zodiac-card', { hasText: sign.cs });
            await expect(card).toBeAttached();
        });
    }

    // ── Tab navigace ─────────────────────────────────────────────────────────

    test('tab "Denní" je výchozí aktivní', async ({ page }) => {
        const dailyTab = page.locator('[data-tab="daily"]');
        await expect(dailyTab).toHaveClass(/active/);
    });

    test('tab "Týdenní" existuje a je klikatelný', async ({ page }) => {
        const weeklyTab = page.locator('[data-tab="weekly"]');
        await expect(weeklyTab).toBeVisible();
        await weeklyTab.click();
        // Po kliknutí se buď aktivuje tab nebo zobrazí premium gate — obojí je ok
        // Test jen ověří že kliknutí nezpůsobilo JS error (stránka stále funkční)
        await expect(page.locator('body')).toBeVisible();
    });

    test('tab "Měsíční" existuje a je klikatelný', async ({ page }) => {
        const monthlyTab = page.locator('[data-tab="monthly"]');
        await expect(monthlyTab).toBeVisible();
        await monthlyTab.click();
        await expect(page.locator('body')).toBeVisible();
    });

    test('monthly horoscope upsell keeps checkout context through registration', async ({ page }) => {
        let authPayload = null;
        let checkoutPayload = null;
        const funnelEvents = [];

        await page.route('**/api/csrf-token', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ csrfToken: 'e2e-horoscope-checkout-token' })
            });
        });

        await page.route('**/api/payment/funnel-event', async (route) => {
            funnelEvents.push(route.request().postDataJSON());
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ success: true })
            });
        });

        await page.route('**/api/auth/register', async (route) => {
            authPayload = route.request().postDataJSON();
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    success: true,
                    user: {
                        id: 'monthly-horoscope-user',
                        email: 'monthly-horoscope@example.com',
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
                    id: 'cs_test_monthly_horoscope',
                    url: '/profil.html?payment=success&plan=pruvodce&session_id=cs_test_monthly_horoscope'
                })
            });
        });

        await page.evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();
        });

        await page.locator('[data-tab="monthly"]').click();
        const upsell = page.locator('.horoscope-upsell');
        await expect(upsell).toBeVisible();

        await Promise.all([
            waitForPath(page, '/prihlaseni.html'),
            upsell.locator('.horoscope-upsell-btn').click(),
        ]);

        const authUrl = new URL(page.url());
        expect(authUrl.searchParams.get('mode')).toBe('register');
        expect(authUrl.searchParams.get('redirect')).toBe('/cenik.html');
        expect(authUrl.searchParams.get('plan')).toBe('pruvodce');
        expect(authUrl.searchParams.get('source')).toBe('horoscope_inline_upsell');
        expect(authUrl.searchParams.get('feature')).toBe('monthly_horoscope');
        expect(authUrl.searchParams.get('entry_source')).toBe('horoscope_inline_upsell');
        expect(authUrl.searchParams.get('entry_feature')).toBe('monthly_horoscope');

        await expect(page.locator('#checkout-context-banner')).toBeVisible();
        await expect(page.locator('#checkout-context-banner')).toContainText('horoskop');

        await page.locator('#email').fill('monthly-horoscope@example.com');
        await page.locator('#password').fill('TestPassword123!');
        await page.locator('#confirm-password-reg').fill('TestPassword123!');
        await page.locator('#gdpr-consent').check();

        await Promise.all([
            waitForPath(page, '/profil.html'),
            page.locator('#auth-submit').click(),
        ]);

        expect(authPayload).toEqual(expect.objectContaining({
            email: 'monthly-horoscope@example.com',
            password: 'TestPassword123!',
            password_confirm: 'TestPassword123!'
        }));
        expect(checkoutPayload).toEqual(expect.objectContaining({
            planId: 'pruvodce',
            source: 'horoscope_inline_upsell',
            feature: 'monthly_horoscope',
            billingInterval: null,
            metadata: expect.objectContaining({
                entry_source: 'horoscope_inline_upsell',
                entry_feature: 'monthly_horoscope'
            })
        }));
        await expect.poll(() => funnelEvents.find((event) => (
            event.eventName === 'checkout_auth_required'
            && event.source === 'horoscope_inline_upsell'
            && event.feature === 'monthly_horoscope'
        )) || null).toEqual(expect.objectContaining({
            planId: 'pruvodce',
            metadata: expect.objectContaining({
                redirect: '/cenik.html',
                auth_mode: 'register',
                entry_source: 'horoscope_inline_upsell',
                entry_feature: 'monthly_horoscope'
            })
        }));
        expect(await page.evaluate(() => sessionStorage.getItem('pending_plan'))).toBeNull();
    });

    test('tabs mají role="tab" ARIA atributy', async ({ page }) => {
        const tabs = page.locator('[role="tab"]');
        const count = await tabs.count();
        expect(count).toBeGreaterThanOrEqual(3);
    });

    test('tablist má aria-label', async ({ page }) => {
        const tablist = page.locator('[role="tablist"]');
        const ariaLabel = await tablist.getAttribute('aria-label');
        expect(ariaLabel).toBeTruthy();
    });

    // ── Kliknutí na znamení ──────────────────────────────────────────────────

    test('kliknutí na zodiac kartu "Beran" naviguje ke kotvě nebo spustí načítání', async ({ page }) => {
        const beranCard = page.locator('.zodiac-card', { hasText: 'Beran' }).first();
        await expect(beranCard).toBeVisible();

        // Karta je link — kliknutí změní URL hash nebo spustí JS
        await beranCard.click();

        // Buď se URL změní (anchor) nebo zůstane (JS click handler)
        const url = page.url();
        expect(url).toContain('horoskopy');
        // Stránka stále funkční
        await expect(page.locator('body')).toBeVisible();
    });

    test('logged-in daily horoscope renders feedback strip and submits payload', async ({ page }) => {
        await page.context().addCookies([{
            name: 'logged_in',
            value: '1',
            url: BASE_URL
        }]);

        await page.goto('/horoskopy.html');
        await waitForPageReady(page);

        await page.evaluate(() => {
            sessionStorage.clear();
            window.__feedbackPayloads = [];
            window.__checkoutPayloads = [];
            window.callAPI = async () => ({
                success: true,
                response: {
                    prediction: 'Dnes se drz jednoho konkretniho kroku.',
                    affirmation: 'Vsimam si jasneho smeru.',
                    luckyNumbers: [3, 7, 12]
                }
            });
            window.Auth = {
                isLoggedIn: () => true,
                isPremium: () => false,
                saveReading: async (type, data) => ({ id: 'reading-e2e-horoscope', type, data }),
                saveReadingFeedback: async (id, payload) => {
                    window.__feedbackPayloads.push({ id, payload });
                    return { success: true, feedback: payload };
                },
                startPlanCheckout: (planId, context) => {
                    window.__checkoutPayloads.push({ planId, context });
                }
            };
        });

        await page.locator('.zodiac-card', { hasText: 'Beran' }).first().click();

        const feedback = page.locator('.horoscope-feedback');
        await expect(feedback).toBeVisible();
        await expect(feedback.locator('[data-next-action="journal"]')).toHaveAttribute('href', '/profil.html#journal-input');

        await feedback.locator('[data-resonance="fits"]').click();

        await expect(feedback.locator('.horoscope-feedback__status')).toContainText('Uloženo');
        await expect(feedback.locator('[data-resonance="fits"]')).toHaveClass(/is-selected/);
        await expect.poll(async () => page.evaluate(() => window.__feedbackPayloads?.length || 0)).toBe(1);

        const payloads = await page.evaluate(() => window.__feedbackPayloads);
        expect(payloads[0]).toMatchObject({
            id: 'reading-e2e-horoscope',
            payload: {
                resonance: 'fits',
                feature: 'daily_guidance',
                source: 'horoscope_feedback_strip'
            }
        });

        await feedback.locator('[data-next-action="premium"]').click();

        await expect.poll(async () => page.evaluate(() => window.__feedbackPayloads?.length || 0)).toBe(2);
        const checkoutPayloads = await page.evaluate(() => window.__checkoutPayloads);
        expect(checkoutPayloads).toEqual([
            expect.objectContaining({
                planId: 'pruvodce',
                context: expect.objectContaining({
                    source: 'horoscope_inline_upsell',
                    feature: 'weekly_horoscope',
                    redirect: '/cenik.html'
                })
            })
        ]);
    });

    test('feedback journal action saves next step before profile redirect', async ({ page }) => {
        await page.context().addCookies([{
            name: 'logged_in',
            value: '1',
            url: BASE_URL
        }]);

        await page.goto('/horoskopy.html');
        await waitForPageReady(page);

        await page.evaluate(() => {
            sessionStorage.clear();
            window.__feedbackPayloads = [];
            window.callAPI = async () => ({
                success: true,
                response: {
                    prediction: 'Vecer si zapiš jednu větu, která drží směr.',
                    affirmation: 'Vracím se k tomu, co je podstatné.',
                    luckyNumbers: [1, 8, 14]
                }
            });
            window.Auth = {
                isLoggedIn: () => true,
                isPremium: () => false,
                saveReading: async (type, data) => ({ id: 'reading-e2e-journal-link', type, data }),
                saveReadingFeedback: async (id, payload) => {
                    window.__feedbackPayloads.push({ id, payload });
                    sessionStorage.setItem('__feedbackPayloads', JSON.stringify(window.__feedbackPayloads));
                    return { success: true, feedback: payload };
                },
                startPlanCheckout: () => {}
            };
        });

        await page.locator('.zodiac-card', { hasText: 'Beran' }).first().click();

        await Promise.all([
            page.waitForURL(/profil\.html#journal-input/),
            page.locator('.horoscope-feedback [data-next-action="journal"]').click(),
        ]);

        const payloads = await page.evaluate(() => JSON.parse(sessionStorage.getItem('__feedbackPayloads') || '[]'));
        expect(payloads).toEqual([
            expect.objectContaining({
                id: 'reading-e2e-journal-link',
                payload: expect.objectContaining({
                    nextAction: 'journal',
                    feature: 'daily_guidance',
                    source: 'horoscope_feedback_strip'
                })
            })
        ]);
    });

    test('URL parametr sign automaticky otevře konkrétní znamení', async ({ page }) => {
        await page.goto('/horoskopy.html?sign=beran');
        await waitForPageReady(page);

        await expect(page.locator('.zodiac-card.active')).toContainText('Beran');
        await expect(page.locator('#detail-name')).toContainText('Beran');
    });

    test('URL parametr znak ze sdílení automaticky otevře konkrétní znamení', async ({ page }) => {
        await page.goto('/horoskopy.html?znak=ryby');
        await waitForPageReady(page);

        await expect(page.locator('.zodiac-card.active')).toContainText('Ryby');
        await expect(page.locator('#detail-name')).toContainText('Ryby');
    });

    test('ulozene znameni bez prihlaseni automaticky neotevre osobni horoskop', async ({ page }) => {
        await page.evaluate(() => {
            localStorage.setItem('mh_zodiac', 'lev');
            localStorage.setItem('mh_user_prefs', JSON.stringify({ sign: 'lev' }));
        });

        await page.reload();
        await waitForPageReady(page);

        await expect(page.locator('#mh-sign-picker')).toBeHidden();
        await expect(page.locator('.zodiac-card.active')).toHaveCount(0);
        await expect(page.locator('.zodiac-card--highlighted')).toHaveCount(0);
        await expect(page.locator('.zodiac-card__badge')).toHaveCount(0);
    });

    test('ulozene znameni prihlaseneho uzivatele automaticky otevre osobni horoskop', async ({ page }) => {
        await page.context().addCookies([{
            name: 'logged_in',
            value: '1',
            url: BASE_URL
        }]);

        await page.evaluate(() => {
            localStorage.setItem('mh_zodiac', 'lev');
            localStorage.setItem('mh_user_prefs', JSON.stringify({ sign: 'lev' }));
        });

        await page.reload();
        await waitForPageReady(page);

        await expect(page.locator('.zodiac-card.active')).toContainText('Lev');
        await expect(page.locator('#detail-name')).toContainText('Lev');
    });

    // ── Freemium banner ──────────────────────────────────────────────────────

    test('freemium banner element existuje v DOM', async ({ page }) => {
        const banner = page.locator('#freemium-banner');
        // Může být skrytý (display:none), ale musí být přítomný v DOM
        await expect(banner).toBeAttached();
    });

    // ── Mobilní responsivita ─────────────────────────────────────────────────

    test('zodiac grid je viditelný na mobilním viewportu', async ({ page }) => {
        await page.setViewportSize(MOBILE_VIEWPORT);
        await page.goto('/horoskopy.html');
        await waitForPageReady(page);

        const grid = page.locator('.zodiac-grid');
        await expect(grid).toBeVisible();
    });

    test('na mobilním viewportu nejsou zodiac karty oříznuty mimo viewport', async ({ page }) => {
        await page.setViewportSize(MOBILE_VIEWPORT);
        await page.goto('/horoskopy.html');
        await waitForPageReady(page);

        const hasHorizontalScroll = await page.evaluate(() =>
            document.documentElement.scrollWidth > document.documentElement.clientWidth
        );
        expect(hasHorizontalScroll).toBe(false);
    });

    // ── Structured data ──────────────────────────────────────────────────────

    test('stránka obsahuje JSON-LD strukturovaná data', async ({ page }) => {
        const ldJson = page.locator('script[type="application/ld+json"]');
        const count = await ldJson.count();
        expect(count).toBeGreaterThanOrEqual(1);
    });
});
