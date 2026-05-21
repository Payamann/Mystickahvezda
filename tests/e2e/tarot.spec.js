/**
 * E2E testy — Tarot (tarot.html)
 *
 * Testuje: načtení stránky, spread karty (Jedna karta / Tři karty / Keltský kříž),
 * kliknutelnost spread triggerů, SEO, přístupnost.
 *
 * Poznámka: testy NEVOLAJÍ reálné AI API — testují UI vrstvu.
 * Kliknutí na spread trigger může zobrazit loading, premium gate nebo error —
 * všechny stavy jsou akceptovatelné (stránka musí zůstat funkční).
 */

import { test, expect } from '@playwright/test';
import { waitForPageReady, assertBasicSEO, MOBILE_VIEWPORT } from './helpers.js';

test.describe('Tarot', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('/tarot.html');
        await waitForPageReady(page);
    });

    // ── Načtení ─────────────────────────────────────────────────────────────

    test('stránka vrátí 200', async ({ page }) => {
        const res = await page.request.get('/tarot.html');
        expect(res.status()).toBe(200);
    });

    test('title obsahuje "Tarot"', async ({ page }) => {
        await assertBasicSEO(page, { titleContains: 'Tarot' });
    });

    test('SEO snippet cílí na tarot online a 78 karet', async ({ page }) => {
        await expect(page).toHaveTitle('Tarot online: výklad z 78 karet | Mystická Hvězda');
        await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /jedna karta zdarma/);
        await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /78 karet/);
        await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', 'Tarot online: výklad z 78 karet | Mystická Hvězda');
    });

    test('h1 je viditelný', async ({ page }) => {
        const h1 = page.locator('h1').first();
        await expect(h1).toBeVisible();
    });

    test('crosslink vede na tarot kartu dne s kampanovým kontextem', async ({ page }) => {
        const link = page.locator('a[href*="tarot-karta-dne.html?source=tarot_crosslink"]').first();
        await expect(link).toBeVisible();
        await expect(link).toHaveAttribute('href', /intent=daily_card/);
        await expect(link).toContainText('Tarot karta dne');
    });

    // ── Spread výběr ─────────────────────────────────────────────────────────

    test('zobrazí 3 spread možnosti', async ({ page }) => {
        const spreads = page.locator('.t-spread-card');
        await expect(spreads).toHaveCount(3);
    });

    test('spread "Jedna karta" je přítomný', async ({ page }) => {
        const spread = page.locator('[data-spread-type="Jedna karta"]');
        await expect(spread).toBeAttached();
    });

    test('spread "Tři karty" je přítomný', async ({ page }) => {
        const spread = page.locator('[data-spread-type="Tři karty"]');
        await expect(spread).toBeAttached();
    });

    test('spread "Celtic Cross" je přítomný', async ({ page }) => {
        const spread = page.locator('[data-spread-type="Celtic Cross"]');
        await expect(spread).toBeAttached();
    });

    test('landing intent predvybere odpovidajici tarotovy rozklad', async ({ page }) => {
        await page.goto('/tarot.html?source=e2e_three_card_landing&feature=tarot_multi_card&intent=three_cards&spread=three_cards');
        await waitForPageReady(page);

        const threeCard = page.locator('.t-spread-card', { has: page.locator('[data-spread-type="Tři karty"]') });
        await expect(threeCard).toHaveClass(/featured/);

        await page.goto('/tarot.html?source=e2e_celtic_landing&feature=tarot_celtic_cross&intent=celtic_cross&spread=celtic_cross');
        await waitForPageReady(page);

        const celtic = page.locator('.t-spread-card', { has: page.locator('[data-spread-type="Celtic Cross"]') });
        await expect(celtic).toHaveClass(/featured/);
    });

    test('spread trigger tlačítka jsou klikatelná', async ({ page }) => {
        const triggers = page.locator('.spread-trigger');
        const count = await triggers.count();
        expect(count).toBeGreaterThanOrEqual(3);

        // Každé tlačítko by mělo mít text
        for (let i = 0; i < count; i++) {
            const text = await triggers.nth(i).innerText();
            expect(text.trim().length).toBeGreaterThan(0);
        }
    });

    test('kliknutí na "Vyložit kartu" nestrhne stránku (UI zůstane funkční)', async ({ page }) => {
        const trigger = page.locator('[data-spread-type="Jedna karta"]').first();
        await expect(trigger).toBeVisible();
        await trigger.click();

        // Stránka stále funkční — bez ohledu na výsledek API volání
        await expect(page.locator('body')).toBeVisible();
        // H1 zůstává
        const h1 = page.locator('h1').first();
        await expect(h1).toBeVisible();
    });

    test('jedna karta zobrazí konkrétní interpretaci', async ({ page }) => {
        const trigger = page.locator('[data-spread-type="Jedna karta"]').first();
        await expect(trigger).toBeVisible();
        await trigger.click();

        await expect(page.locator('#tarot-results')).toBeVisible({ timeout: 9000 });
        await expect(page.locator('#tarot-results .tarot-flip-card')).toHaveCount(1);
        await expect(page.locator('#interpretations-container')).toContainText('INTERPRETACE', { timeout: 9000 });
        await expect(page.locator('.tarot-practical-advice')).toBeVisible();
    });

    test('card parametr použije konkrétní kartu pro výklad jedné karty', async ({ page }) => {
        await page.goto('/tarot.html?card=Hvězda&source=e2e');
        await waitForPageReady(page);

        await expect(page.locator('#tarot-card-context')).toContainText('Hvězda');
        await page.locator('[data-spread-type="Jedna karta"]').first().click();

        await expect(page.locator('#tarot-results')).toBeVisible({ timeout: 9000 });
        await expect(page.locator('#tarot-results .tarot-card-image')).toHaveAttribute('alt', /Hvězda/, { timeout: 9000 });
        await expect(page.locator('#interpretations-container')).toContainText('Hvězda', { timeout: 9000 });
    });

    test('free teaser pro tři karty ukáže zamčené karty a pošle funnel event', async ({ page }) => {
        await page.goto('/tarot.html?card=Hvězda&source=tarot_card_detail&utm_source=pinterest&utm_campaign=tarot_card_hvezda&utm_content=pin_01');
        await waitForPageReady(page);

        await page.evaluate(() => {
            localStorage.removeItem('tarot_free_usage');
            window.Auth = {
                isLoggedIn: () => true,
                isPremium: () => false,
                showToast: () => {},
                saveReading: async () => ({ id: 'test-reading' })
            };
            window.getCSRFToken = async () => 'test-csrf-token';
            window.__tarotFunnelEvents = [];

            const originalFetch = window.fetch.bind(window);
            window.fetch = async (input, init = {}) => {
                const url = typeof input === 'string' ? input : input?.url;
                if (url && url.includes('/api/payment/funnel-event')) {
                    window.__tarotFunnelEvents.push(JSON.parse(init.body || '{}'));
                    return new Response(JSON.stringify({ success: true }), {
                        status: 200,
                        headers: { 'Content-Type': 'application/json' }
                    });
                }
                return originalFetch(input, init);
            };
        });

        await page.locator('[data-spread-type="Tři karty"]').first().click();

        await expect(page.locator('#tarot-results')).toBeVisible({ timeout: 9000 });
        await expect(page.locator('#tarot-results .tarot-flip-card')).toHaveCount(3);
        await expect(page.locator('#tarot-results .locked-card')).toHaveCount(2);
        await expect(page.locator('.tarot-soft-gate')).toContainText('Odemkněte celý tříkartový výklad');
        await expect(page.locator('.tarot-soft-gate .tarot-upgrade-btn')).toContainText('Odemknout celý tarotový výklad');
        await expect(page.locator('.tarot-soft-gate')).toContainText('Cena se zobraz\u00ed ve Stripe p\u0159ed potvrzen\u00edm. Zru\u0161en\u00ed najdete v profilu.');
        await expect(page.locator('.tarot-soft-gate')).not.toContainText('Získat Premium');
        await expect(page.locator('.tarot-soft-gate')).not.toContainText('7 dní zdarma');
        const upgradeHref = await page.locator('.tarot-soft-gate .tarot-upgrade-btn').getAttribute('href');
        const upgradeUrl = new URL(upgradeHref, page.url());
        expect(upgradeUrl.searchParams.get('source')).toBe('tarot_teaser_banner');
        expect(upgradeUrl.searchParams.get('entry_source')).toBe('tarot_card_detail');
        expect(upgradeUrl.searchParams.get('utm_source')).toBe('pinterest');
        expect(upgradeUrl.searchParams.get('utm_campaign')).toBe('tarot_card_hvezda');
        expect(upgradeUrl.searchParams.get('card')).toBe('Hvězda');

        await expect.poll(() => page.evaluate(() => window.__tarotFunnelEvents.length)).toBeGreaterThan(0);
        const events = await page.evaluate(() => window.__tarotFunnelEvents);
        expect(events).toContainEqual(expect.objectContaining({
            eventName: 'paywall_viewed',
            source: 'tarot_teaser_banner',
            feature: 'tarot_multi_card',
            planId: 'pruvodce'
        }));
        const paywallEvent = events.find((event) => event.eventName === 'paywall_viewed' && event.source === 'tarot_teaser_banner');
        expect(paywallEvent).toBeTruthy();
        expect(paywallEvent.metadata).toMatchObject({
            entry_source: 'tarot_card_detail',
            utm_source: 'pinterest',
            utm_campaign: 'tarot_card_hvezda',
            utm_content: 'pin_01',
            requested_card: 'Hvězda'
        });
    });

    test('klik na balicek respektuje vybrany placeny rozklad a neobejde gate', async ({ page }) => {
        await page.goto('/tarot.html?source=e2e_deck_click_gate&feature=tarot_multi_card');
        await waitForPageReady(page);

        await page.evaluate(() => {
            localStorage.removeItem('tarot_free_usage');
            window.Auth = {
                isLoggedIn: () => true,
                isPremium: () => false,
                showToast: () => {},
                saveReading: async () => ({ id: 'test-reading' })
            };
            window.getCSRFToken = async () => 'test-csrf-token';
            window.__tarotFunnelEvents = [];

            const originalFetch = window.fetch.bind(window);
            window.fetch = async (input, init = {}) => {
                const url = typeof input === 'string' ? input : input?.url;
                if (url && url.includes('/api/payment/funnel-event')) {
                    window.__tarotFunnelEvents.push(JSON.parse(init.body || '{}'));
                    return new Response(JSON.stringify({ success: true }), {
                        status: 200,
                        headers: { 'Content-Type': 'application/json' }
                    });
                }
                return originalFetch(input, init);
            };
        });

        await page.locator('.t-spread-card').nth(1).click();
        await expect(page.locator('.t-spread-card').nth(1)).toHaveClass(/featured/);
        await page.locator('.tarot-deck .tarot-card').first().click();

        await expect(page.locator('#tarot-results')).toBeVisible({ timeout: 9000 });
        await expect(page.locator('#tarot-results .tarot-flip-card')).toHaveCount(3);
        await expect(page.locator('#tarot-results .locked-card')).toHaveCount(2);
        await expect(page.locator('.tarot-soft-gate')).toBeVisible();

        const events = await page.evaluate(() => window.__tarotFunnelEvents);
        expect(events).toContainEqual(expect.objectContaining({
            eventName: 'paywall_viewed',
            source: 'tarot_teaser_banner',
            feature: 'tarot_multi_card',
            planId: 'pruvodce'
        }));
    });

    // ── Freemium banner ──────────────────────────────────────────────────────

    test('#freemium-banner existuje v DOM', async ({ page }) => {
        await expect(page.locator('#freemium-banner')).toBeAttached();
    });

    // ── Přístupnost ──────────────────────────────────────────────────────────

    test('skip-link existuje', async ({ page }) => {
        const skipLink = page.locator('.skip-link, a[href="#main-content"]').first();
        await expect(skipLink).toBeAttached();
    });

    test('main#main-content existuje', async ({ page }) => {
        await expect(page.locator('#main-content')).toBeAttached();
    });

    // ── SEO ──────────────────────────────────────────────────────────────────

    test('canonical link je nastaven', async ({ page }) => {
        const canonical = await page.getAttribute('link[rel="canonical"]', 'href');
        expect(canonical).toContain('tarot');
    });

    test('stránka obsahuje JSON-LD strukturovaná data', async ({ page }) => {
        const ldJson = page.locator('script[type="application/ld+json"]');
        expect(await ldJson.count()).toBeGreaterThanOrEqual(1);
    });

    // ── Mobilní responsivita ─────────────────────────────────────────────────

    test('spread karty jsou viditelné na mobilním viewportu', async ({ page }) => {
        await page.setViewportSize(MOBILE_VIEWPORT);
        await page.goto('/tarot.html');
        await waitForPageReady(page);

        // Aspoň jeden spread trigger musí být viditelný
        const trigger = page.locator('.spread-trigger').first();
        await expect(trigger).toBeVisible();
    });

    test('žádný horizontální scroll na mobilním viewportu', async ({ page }) => {
        await page.setViewportSize(MOBILE_VIEWPORT);
        await page.goto('/tarot.html');
        await waitForPageReady(page);

        const hasHorizontalScroll = await page.evaluate(() =>
            document.documentElement.scrollWidth > document.documentElement.clientWidth
        );
        expect(hasHorizontalScroll).toBe(false);
    });

    test('mobilni cookie lista neprekryva prvni tarot CTA', async ({ page }) => {
        await page.setViewportSize(MOBILE_VIEWPORT);
        await page.addInitScript(() => {
            localStorage.removeItem('mh_cookie_prefs');
            localStorage.removeItem('cookieConsent');
        });
        await page.goto('/tarot.html?source=e2e_tarot_cookie');
        await waitForPageReady(page);

        const trigger = page.locator('[data-spread-type="Jedna karta"]').first();
        await expect(page.locator('#cookie-banner')).toBeVisible();
        await expect(page.locator('#cookie-banner')).toHaveClass(/visible/, { timeout: 5000 });
        await page.waitForFunction(() => document.body.classList.contains('cookie-banner-active'));
        await expect(trigger).toBeVisible();

        const metrics = await page.evaluate(() => {
            const cta = document.querySelector('[data-spread-type="Jedna karta"]')?.getBoundingClientRect();
            const cookie = document.getElementById('cookie-banner')?.getBoundingClientRect();
            const overlapsCookie = !!(cta && cookie && !(
                cookie.right < cta.left
                || cookie.left > cta.right
                || cookie.bottom < cta.top
                || cookie.top > cta.bottom
            ));
            const overlappedVisibleCtas = [...document.querySelectorAll('a.btn, button.btn, button[type="submit"], [data-cta-location]')]
                .filter((element) => !element.closest('#cookie-banner'))
                .map((element) => {
                    const rect = element.getBoundingClientRect();
                    const style = getComputedStyle(element);
                    const visible = rect.width > 0
                        && rect.height > 0
                        && rect.bottom >= 0
                        && rect.top <= window.innerHeight
                        && style.visibility !== 'hidden'
                        && style.display !== 'none';
                    const overlaps = !!(cookie && visible && !(
                        cookie.right < rect.left
                        || cookie.left > rect.right
                        || cookie.bottom < rect.top
                        || cookie.top > rect.bottom
                    ));
                    return overlaps ? (element.textContent || '').trim().replace(/\s+/g, ' ') : null;
                })
                .filter(Boolean);

            return {
                ctaBottom: Math.round(cta?.bottom || 9999),
                cookieTop: Math.round(cookie?.top || window.innerHeight),
                overlappedVisibleCtas,
                overlapsCookie,
                overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
            };
        });

        expect(metrics.overflow).toBe(false);
        expect(metrics.overlapsCookie).toBe(false);
        expect(metrics.overlappedVisibleCtas).toEqual([]);
        expect(metrics.ctaBottom).toBeLessThanOrEqual(metrics.cookieTop);
    });
});

// ── Význam tarotových karet ─────────────────────────────────────────────────

test.describe('Tarot 3 karty landing', () => {
    test('tarot-tri-karty.html je indexovatelny vstup do vicekartoveho tarotu', async ({ page }) => {
        const res = await page.request.get('/tarot-tri-karty.html');
        expect(res.status()).toBe(200);

        await page.goto('/tarot-tri-karty.html');
        await waitForPageReady(page);

        await expect(page.locator('h1')).toContainText('Tarot 3 karty');
        const canonical = await page.getAttribute('link[rel="canonical"]', 'href');
        expect(canonical).toBe('https://www.mystickahvezda.cz/tarot-tri-karty.html');

        const primary = page.locator('[data-analytics-cta="tarot_three_card_landing_primary"]');
        await expect(primary).toBeVisible();
        const href = await primary.getAttribute('href');
        expect(href).toContain('tarot.html');
        expect(href).toContain('source=tarot_three_card_landing');
        expect(href).toContain('feature=tarot_multi_card');
        expect(href).toContain('intent=three_cards');
        expect(href).toContain('spread=three_cards');

        const faqTypes = await page.locator('script[type="application/ld+json"]').evaluateAll((scripts) => scripts.map((script) => {
            try {
                return JSON.parse(script.textContent || '{}')['@type'];
            } catch {
                return null;
            }
        }));
        expect(faqTypes).toContain('FAQPage');
    });

    test('tarot 3 karty landing nema na mobilu horizontalni scroll', async ({ page }) => {
        await page.setViewportSize(MOBILE_VIEWPORT);
        await page.goto('/tarot-tri-karty.html');
        await waitForPageReady(page);

        await expect(page.locator('.tarot-three-intent-card')).toHaveCount(4);
        await expect(page.locator('a[href*="tarot-zdarma.html?source=tarot_three_card_faq"]')).toBeVisible();
        const hasHorizontalScroll = await page.evaluate(() =>
            document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
        );
        expect(hasHorizontalScroll).toBe(false);
    });
});

test.describe('Keltsky kriz tarot landing', () => {
    test('tarot-keltsky-kriz.html vede do VIP tarot kontextu', async ({ page }) => {
        const res = await page.request.get('/tarot-keltsky-kriz.html');
        expect(res.status()).toBe(200);

        await page.goto('/tarot-keltsky-kriz.html');
        await waitForPageReady(page);

        await expect(page.locator('h1')).toContainText('Keltský kříž');
        const canonical = await page.getAttribute('link[rel="canonical"]', 'href');
        expect(canonical).toBe('https://www.mystickahvezda.cz/tarot-keltsky-kriz.html');

        const primary = page.locator('[data-analytics-cta="tarot_celtic_landing_primary"]');
        await expect(primary).toBeVisible();
        const href = await primary.getAttribute('href');
        expect(href).toContain('tarot.html');
        expect(href).toContain('source=tarot_celtic_cross_landing');
        expect(href).toContain('feature=tarot_celtic_cross');
        expect(href).toContain('intent=celtic_cross');
        expect(href).toContain('spread=celtic_cross');

        const pricing = page.locator('[data-analytics-cta="tarot_celtic_intent_pricing"]');
        await expect(pricing).toHaveAttribute('href', /plan=vip-majestrat/);
        await expect(pricing).toHaveAttribute('href', /feature=tarot_celtic_cross/);

        const faqTypes = await page.locator('script[type="application/ld+json"]').evaluateAll((scripts) => scripts.map((script) => {
            try {
                return JSON.parse(script.textContent || '{}')['@type'];
            } catch {
                return null;
            }
        }));
        expect(faqTypes).toContain('FAQPage');
    });

    test('keltsky kriz landing nema na mobilu horizontalni scroll', async ({ page }) => {
        await page.setViewportSize(MOBILE_VIEWPORT);
        await page.goto('/tarot-keltsky-kriz.html');
        await waitForPageReady(page);

        await expect(page.locator('.tarot-celtic-intent-card')).toHaveCount(4);
        const hasHorizontalScroll = await page.evaluate(() =>
            document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
        );
        expect(hasHorizontalScroll).toBe(false);
    });
});

test.describe('Tarot význam karet', () => {
    test('hub načte 78 karet a umí filtrovat katalog', async ({ page }) => {
        await page.goto('/tarot-vyznam-karet.html');
        await waitForPageReady(page);

        await expect(page.locator('h1')).toContainText('Význam tarotových karet');

        const canonical = await page.getAttribute('link[rel="canonical"]', 'href');
        expect(canonical).toContain('tarot-vyznam-karet.html');

        await expect(page.locator('.tarot-meaning-card')).toHaveCount(78, { timeout: 9000 });

        await page.locator('#tarot-card-search').fill('Hvězda');
        await expect(page.locator('.tarot-meaning-card h3')).toContainText('Hvězda');
        const searchCount = await page.locator('.tarot-meaning-card').count();
        expect(searchCount).toBeGreaterThanOrEqual(1);
        expect(searchCount).toBeLessThan(78);

        await page.locator('#tarot-card-search').fill('');
        await page.locator('[data-tarot-filter="cups"]').click();
        await expect(page.locator('.tarot-meaning-card')).toHaveCount(14);

        const hasHorizontalScroll = await page.evaluate(() =>
            document.documentElement.scrollWidth > document.documentElement.clientWidth
        );
        expect(hasHorizontalScroll).toBe(false);

        await page.setViewportSize(MOBILE_VIEWPORT);
        await page.goto('/tarot-vyznam-karet.html');
        await waitForPageReady(page);

        await expect(page.locator('.tarot-meaning-card')).toHaveCount(78, { timeout: 9000 });
        await expect(page.locator('a[href="tarot-vyznam/hvezda.html"]').first()).toBeVisible();
        const hasMobileHorizontalScroll = await page.evaluate(() =>
            document.documentElement.scrollWidth > document.documentElement.clientWidth
        );
        expect(hasMobileHorizontalScroll).toBe(false);
    });

    test('detail konkretni tarotove karty je indexovatelny a vede do vykladu', async ({ page }) => {
        const res = await page.request.get('/tarot-vyznam/hvezda.html');
        expect(res.status()).toBe(200);

        await page.goto('/tarot-vyznam/hvezda.html');
        await waitForPageReady(page);

        await expect(page.locator('h1')).toContainText('Hv');
        await expect(page.locator('h1')).toContainText('tarot');
        const canonical = await page.getAttribute('link[rel="canonical"]', 'href');
        expect(canonical).toBe('https://www.mystickahvezda.cz/tarot-vyznam/hvezda.html');

        await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(1);
        await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute('content', /tarot_hvezda\.webp/);
        await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute('content', /Hvězda tarot karta/);
        await expect(page.locator('.tarot-card-detail-panel')).toContainText('Nad');
        await expect(page.locator('.tarot-card-detail-next-step')).toContainText('Co udělat');
        await expect(page.locator('a[href*="tarot-karta-dne.html?source=tarot_card_detail_next_step"]')).toHaveAttribute('href', /card=Hv%C4%9Bzda/);
        await expect(page.locator('a[data-analytics-cta="tarot_card_detail_next_profile"]')).toHaveAttribute('href', /feature=tarot_daily_card_profile_save/);
        await expect(page.locator('.tarot-related-card')).toHaveCount(3);
        await expect(page.locator('.tarot-related-card').first()).toHaveAttribute('href', /\/tarot-vyznam\/.+\.html/);
        await expect(page.locator('a[href*="/tarot.html?source=tarot_card_detail"]').first()).toHaveAttribute('href', /card=Hv%C4%9Bzda/);

        const hasHorizontalScroll = await page.evaluate(() =>
            document.documentElement.scrollWidth > document.documentElement.clientWidth
        );
        expect(hasHorizontalScroll).toBe(false);
    });

});

// ── Tarot Ano/Ne stránka ─────────────────────────────────────────────────────

test.describe('Tarot Ano/Ne', () => {

    test('tarot-ano-ne.html vrátí 200', async ({ page }) => {
        const res = await page.request.get('/tarot-ano-ne.html');
        expect(res.status()).toBe(200);
    });

    test('stránka se načte bez JS erroru', async ({ page }) => {
        const errors = [];
        page.on('pageerror', err => errors.push(err.message));

        await page.goto('/tarot-ano-ne.html');
        await waitForPageReady(page);

        // Kritické JS errory (jako SyntaxError) by stránku rozbily
        const criticalErrors = errors.filter(e =>
            e.includes('SyntaxError') || e.includes('is not defined') && !e.includes('gtag')
        );
        expect(criticalErrors).toHaveLength(0);
    });

    test('h1 na tarot ano/ne stránce existuje', async ({ page }) => {
        await page.goto('/tarot-ano-ne.html');
        await waitForPageReady(page);

        const h1 = page.locator('h1').first();
        await expect(h1).toBeAttached();
    });

    test('po výběru karty ukáže další kroky a prémiový bridge', async ({ page }) => {
        await page.goto('/tarot-ano-ne.html');
        await waitForPageReady(page);

        await page.fill('#question-input', 'Mám dnes udělat první krok?');
        await page.locator('.tarot-card').first().click();

        await expect(page.locator('#result-panel')).toHaveClass(/show/, { timeout: 2500 });
        await expect(page.locator('#tarot-yes-no-next-step')).toBeVisible();
        await expect(page.locator('.tarot-yes-no-next-card')).toHaveCount(4);

        const upgradeLink = page.locator('[data-tarot-yes-no-upgrade]').first();
        await expect(upgradeLink).toBeVisible();
        const href = await upgradeLink.getAttribute('href');
        expect(href).toContain('plan=pruvodce');
        expect(href).toContain('source=tarot_yes_no_result');
        expect(href).toContain('feature=tarot_multi_card');
    });

    test('výsledek tarot ano/ne lze uložit jako sdílitelný obrázek', async ({ page }) => {
        await page.goto('/tarot-ano-ne.html');
        await waitForPageReady(page);

        await page.fill('#question-input', 'Mám dnes udělat první krok?');
        await page.locator('.tarot-card').first().click();

        await expect(page.locator('#result-panel')).toHaveClass(/show/, { timeout: 2500 });
        await expect(page.locator('#btn-save-result-image')).toBeVisible();
        await expect.poll(() => page.evaluate(() => Boolean(window.__lastTarotYesNoShareResult))).toBe(true);

        const downloadPromise = page.waitForEvent('download');
        await page.locator('#btn-save-result-image').click();
        const download = await downloadPromise;
        expect(download.suggestedFilename()).toMatch(/^tarot-ano-ne-.+\.png$/);
    });

    test('obsahuje trust strip, FAQ blok a FAQ schema markup', async ({ page }) => {
        await page.goto('/tarot-ano-ne.html');
        await waitForPageReady(page);

        await expect(page.locator('.tarot-yes-no-trust-item')).toHaveCount(3);
        await expect(page.locator('.tarot-yes-no-faq-item')).toHaveCount(4);
        await expect(page.locator('a[href*="tarot-zdarma.html?source=tarot_yes_no_faq"]')).toBeVisible();

        const ldTypes = await page.locator('script[type="application/ld+json"]').evaluateAll((scripts) => scripts.map((script) => {
            try {
                return JSON.parse(script.textContent || '{}')['@type'];
            } catch {
                return null;
            }
        }));

        expect(ldTypes).toContain('FAQPage');
    });

    test('výsledek a další kroky nerozbíjí mobilní layout', async ({ page }) => {
        await page.setViewportSize(MOBILE_VIEWPORT);
        await page.goto('/tarot-ano-ne.html');
        await waitForPageReady(page);

        await page.fill('#question-input', 'Mám tomu dát ještě šanci?');
        await page.locator('.tarot-card').first().click();

        await expect(page.locator('#tarot-yes-no-next-step')).toBeVisible({ timeout: 2500 });

        const hasHorizontalScroll = await page.evaluate(() =>
            document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
        );
        expect(hasHorizontalScroll).toBe(false);
    });

    test('mobilní cookie lišta nepřekrývá akce výsledku', async ({ page }) => {
        await page.setViewportSize({ width: 393, height: 851 });
        await page.addInitScript(() => {
            localStorage.removeItem('mh_cookie_prefs');
            localStorage.removeItem('cookieConsent');
        });
        await page.goto('/tarot-ano-ne.html');
        await waitForPageReady(page);

        await page.fill('#question-input', 'Mám tomu dát ještě šanci?');
        await page.locator('.tarot-card').first().click();

        await expect(page.locator('#result-panel')).toHaveClass(/show/, { timeout: 2500 });
        await expect(page.locator('#cookie-banner')).toBeVisible({ timeout: 4500 });
        await expect(page.locator('#cookie-banner')).toHaveClass(/visible/, { timeout: 5000 });
        await page.waitForTimeout(700);

        const metrics = await page.evaluate(() => {
            const bannerRect = document.getElementById('cookie-banner').getBoundingClientRect();
            const resetRect = document.getElementById('btn-reset').getBoundingClientRect();
            return {
                bannerHeight: bannerRect.height,
                bannerTop: bannerRect.top,
                resetBottom: resetRect.bottom,
                viewportHeight: window.innerHeight
            };
        });

        expect(metrics.bannerHeight).toBeLessThan(180);
        expect(metrics.resetBottom).toBeLessThanOrEqual(metrics.bannerTop - 8);
        expect(metrics.bannerTop).toBeLessThan(metrics.viewportHeight);
    });
});
