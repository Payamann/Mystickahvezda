/**
 * E2E testy — Homepage (index.html)
 *
 * Testuje: načtení, SEO meta tagy, hero sekce, klíčové CTA, PWA manifest,
 * bezpečnostní hlavičky, mobilní responsivitu.
 */

import { test, expect } from '@playwright/test';
import { waitForPageReady, assertBasicSEO, assertSecurityHeaders, MOBILE_VIEWPORT } from './helpers.js';

test.describe('Homepage', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await waitForPageReady(page);
    });

    // ── Základní načtení ────────────────────────────────────────────────────

    test('stránka se načte a vrátí 200', async ({ page }) => {
        const response = await page.request.get('/');
        expect(response.status()).toBe(200);
    });

    test('title obsahuje "Mystická Hvězda"', async ({ page }) => {
        await assertBasicSEO(page, { titleContains: 'Mystická Hvězda' });
    });

    test('meta description je neprázdný', async ({ page }) => {
        const desc = await page.getAttribute('meta[name="description"]', 'content');
        expect(desc).toBeTruthy();
        expect(desc.length).toBeGreaterThan(20);
    });

    test('lang atribut je nastaven na "cs"', async ({ page }) => {
        const lang = await page.getAttribute('html', 'lang');
        expect(lang).toBe('cs');
    });

    // ── Struktura stránky ────────────────────────────────────────────────────

    test('main#main-content nebo main existuje', async ({ page }) => {
        // Může být id="main-content" nebo prostý <main>
        const mainCount = await page.locator('main').count();
        expect(mainCount).toBeGreaterThanOrEqual(1);
    });

    test('hero sekce je viditelná', async ({ page }) => {
        // Hero section nebo první výrazná headline
        const hero = page.locator('.section--hero, .hero, [class*="hero"]').first();
        await expect(hero).toBeVisible();
    });

    test('hero registrace zachovává zdroj a aktivační feature', async ({ page }) => {
        const heroCta = page.locator('#hero-cta-btn');
        await expect(heroCta).toBeVisible();
        await expect(heroCta).toHaveClass(/btn--primary/);
        const href = await heroCta.getAttribute('href');
        expect(href).toContain('mode=register');
        expect(href).toContain('source=homepage_hero');
        expect(href).toContain('feature=daily_guidance');
    });

    test('hero karta dne ma vlastni analyticky signal', async ({ page }) => {
        await page.evaluate(() => {
            window.MH_ANALYTICS_QUEUE = [];
        });

        await page.locator('#hero-daily-card-link').click();

        const event = await page.evaluate(() => window.MH_ANALYTICS_QUEUE.find(
            (item) => item.name === 'cta_clicked' && item.location === 'homepage_daily_card_hero'
        ));

        expect(event).toEqual(expect.objectContaining({
            destination: '#sluzby'
        }));
    });

    test('odmitnute analyticke cookies neposilaji first-party analytics eventy', async ({ page }) => {
        await page.addInitScript(() => {
            localStorage.setItem('mh_cookie_prefs', JSON.stringify({
                analytics: false,
                marketing: false,
                ts: Date.now()
            }));
        });

        let analyticsPosts = 0;
        await page.route('**/api/analytics/event', async (route) => {
            analyticsPosts += 1;
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ success: true, accepted: 1 })
            });
        });

        await page.goto('/');
        await waitForPageReady(page);
        await page.evaluate(() => {
            window.MH_ANALYTICS?.trackEvent('cta_clicked', { location: 'privacy_regression' });
        });
        await page.waitForTimeout(800);

        expect(analyticsPosts).toBe(0);
    });

    test('bez souhlasu neposila pasivni first-party analytics eventy', async ({ page }) => {
        await page.addInitScript(() => {
            localStorage.removeItem('mh_cookie_prefs');
            localStorage.removeItem('cookieConsent');
        });

        let analyticsPosts = 0;
        await page.route('**/api/analytics/event', async (route) => {
            analyticsPosts += 1;
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ success: true, accepted: 1 })
            });
        });

        await page.goto('/');
        await waitForPageReady(page);
        await page.evaluate(() => {
            window.MH_ANALYTICS?.trackEvent('cta_clicked', { location: 'no_consent_regression' });
        });
        await page.waitForTimeout(800);

        expect(analyticsPosts).toBe(0);
    });

    test('first-party page view neprenasi citlive query parametry', async ({ page }) => {
        const analyticsPayloads = [];
        await page.addInitScript(() => {
            localStorage.setItem('mh_cookie_prefs', JSON.stringify({
                analytics: true,
                marketing: false,
                ts: Date.now()
            }));
        });

        await page.route('**/api/analytics/event', async (route) => {
            analyticsPayloads.push(JSON.parse(route.request().postData() || '{}'));
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ success: true, accepted: 1 })
            });
        });

        await page.goto('/?email=jana@example.com&token=secret123&audit=page-view');
        await waitForPageReady(page);

        await expect.poll(() => analyticsPayloads.some((payload) => payload.eventName === 'page_view')).toBe(true);
        const pageView = analyticsPayloads.find((payload) => payload.eventName === 'page_view');

        expect(pageView.path).toBe('/');
        expect(pageView.metadata.url).not.toContain('email=');
        expect(pageView.metadata.url).not.toContain('token=');
    });

    test('first-party analytics pripoji kampanovou atribuci ke vsem eventum', async ({ page }) => {
        await page.addInitScript(() => {
            localStorage.removeItem('mh_attribution_first_touch');
            sessionStorage.removeItem('mh_attribution_last_touch');
            localStorage.removeItem('mh_cookie_prefs');
            localStorage.removeItem('cookieConsent');
        });

        await page.goto('/?utm_source=pinterest&utm_medium=organic&utm_campaign=tarot_meanings&utm_content=pin_v1&entry_feature=tarot');
        await waitForPageReady(page);
        await page.evaluate(() => {
            window.MH_ANALYTICS?.trackCTA('attribution_regression', { label: 'Test CTA' });
        });

        const events = await page.evaluate(() => ({
            pageView: window.MH_ANALYTICS_QUEUE.find((item) => item.name === 'page_view'),
            cta: window.MH_ANALYTICS_QUEUE.find((item) => item.name === 'cta_clicked' && item.location === 'attribution_regression'),
            context: window.MH_ANALYTICS?.getAttributionContext?.().metadata
        }));

        for (const event of [events.pageView, events.cta, events.context]) {
            expect(event).toEqual(expect.objectContaining({
                first_source: 'pinterest',
                first_medium: 'organic',
                first_campaign: 'tarot_meanings',
                last_source: 'pinterest',
                last_medium: 'organic',
                last_campaign: 'tarot_meanings',
                utm_content: 'pin_v1',
                entry_feature: 'tarot',
                landing_path: '/'
            }));
        }
    });

    test('mobilni cookie lista na homepage nezakryva prvni dojem', async ({ page }) => {
        await page.setViewportSize({ width: 393, height: 851 });
        await page.evaluate(() => {
            localStorage.removeItem('mh_cookie_prefs');
            localStorage.removeItem('cookieConsent');
        });
        await page.goto('/');
        await waitForPageReady(page);

        const banner = page.locator('#cookie-banner');
        await expect(banner).toBeVisible({ timeout: 4000 });
        await expect(banner).toHaveClass(/visible/, { timeout: 5000 });
        await page.waitForTimeout(650);

        const metrics = await page.evaluate(() => {
            const bannerRect = document.getElementById('cookie-banner').getBoundingClientRect();
            const acceptRect = document.getElementById('cookie-accept').getBoundingClientRect();
            return {
                bannerHeight: bannerRect.height,
                acceptBottom: acceptRect.bottom,
                viewportHeight: window.innerHeight
            };
        });
        expect(metrics.bannerHeight).toBeLessThan(260);
        expect(metrics.acceptBottom).toBeLessThanOrEqual(metrics.viewportHeight);
    });

    test('header a pricing CTA maji funkcni fallback odkazy bez JavaScriptu', async ({ page }) => {
        await expect(page.locator('#auth-register-btn')).toHaveAttribute('href', /source=header_register/);
        await expect(page.locator('#auth-btn')).toHaveAttribute('href', /prihlaseni\.html\?source=header_login/);
        await expect(page.locator('#mobile-auth-register-btn')).toHaveAttribute('href', /source=mobile_menu/);
        await expect(page.locator('#mobile-auth-btn')).toHaveAttribute('href', /source=mobile_menu_login/);

        await expect(page.locator('[data-plan="poutnik"]')).toHaveAttribute('href', /homepage_pricing_free_cta/);
        await expect(page.locator('[data-plan="pruvodce"]')).toHaveAttribute('href', /plan=pruvodce/);
        await expect(page.locator('[data-plan="pruvodce"]')).toHaveText(/Odemknout Průvodce/);
        await expect(page.locator('a[href*="homepage_pricing_full_compare"]')).toHaveAttribute('href', /cenik\.html\?source=homepage_pricing_full_compare/);
        await expect(page.locator('a[href*="homepage_pricing_full_compare"]')).toContainText('Otevřít celý ceník');
    });

    test('homepage viditelne propaguje Osobni mapu zbytku roku', async ({ page }) => {
        const spotlight = page.locator('.personal-map-spotlight');
        await expect(spotlight).toBeVisible();
        await expect(spotlight).toContainText('Osobní mapa zbytku roku 2026');
        await expect(spotlight).toContainText('299 Kč');
        await expect(spotlight.locator('img[alt*="Osobní mapa"]')).toBeVisible();
        await expect(spotlight.locator('a.btn--primary')).toHaveAttribute('href', /osobni-mapa\.html\?source=homepage_spotlight/);
        await expect(page.locator('.nav__dropdown-link[href*="osobni-mapa.html"]').first()).toContainText('Osobní mapa');
    });

    test('header registrace neotevira stary modal a vede na dedikovanou registraci', async ({ page, isMobile }) => {
        test.skip(isMobile, 'Desktop header CTA is hidden on mobile; mobile menu registration is covered separately.');

        await Promise.all([
            page.waitForURL(url => url.pathname === '/prihlaseni.html', { timeout: 10000, waitUntil: 'domcontentloaded' }),
            page.locator('#auth-register-btn').click(),
        ]);

        const url = new URL(page.url());
        expect(url.pathname).toBe('/prihlaseni.html');
        expect(url.searchParams.get('mode')).toBe('register');
        expect(url.searchParams.get('source')).toBe('header_register');
        await expect(page.locator('#login-page-title')).toContainText('účet zdarma');
    });

    test('mobilni registrace z menu vede na dedikovanou registraci', async ({ page }) => {
        await page.setViewportSize(MOBILE_VIEWPORT);
        await page.goto('/');
        await waitForPageReady(page);

        await page.locator('.nav__toggle').click();
        await expect(page.locator('.nav__toggle')).toHaveAttribute('aria-expanded', 'true');

        await Promise.all([
            page.waitForURL(url => url.pathname === '/prihlaseni.html', { timeout: 10000, waitUntil: 'domcontentloaded' }),
            page.locator('#mobile-auth-register-btn').click(),
        ]);

        const url = new URL(page.url());
        expect(url.searchParams.get('mode')).toBe('register');
        expect(url.searchParams.get('source')).toBe('mobile_menu');
        expect(url.searchParams.get('feature')).toBe('account');
        await expect(page.locator('#checkout-context-title')).toContainText('Účet zdarma');
    });

    test('homepage vstupy na kartu dne vedou na andelskou kartu na strance, ne na tarot', async ({ page }) => {
        const heroDailyCard = page.locator('#hero-daily-card-link');
        await expect(heroDailyCard).toBeVisible();
        const heroHref = await heroDailyCard.getAttribute('href');
        expect(heroHref).toBe('#sluzby');
        expect(heroHref).not.toContain('tarot');

        const previewDailyCard = page.locator('.hero__daily-preview a').filter({ hasText: 'Andělská karta dne' });
        await expect(previewDailyCard).toBeVisible();
        const previewHref = await previewDailyCard.getAttribute('href');
        expect(previewHref).toBe('#sluzby');
        expect(previewHref).not.toContain('tarot');
    });

    test('h1 tag existuje a obsahuje text', async ({ page }) => {
        const h1 = page.locator('h1').first();
        await expect(h1).toBeVisible();
        const text = await h1.innerText();
        expect(text.trim().length).toBeGreaterThan(2);
    });

    // ── SEO & strukturovaná data ─────────────────────────────────────────────

    test('canonical link je nastaven', async ({ page }) => {
        const canonical = await page.getAttribute('link[rel="canonical"]', 'href');
        expect(canonical).toBeTruthy();
        expect(canonical).toContain('mystickahvezda.cz');
    });

    test('Open Graph title je nastaven', async ({ page }) => {
        const ogTitle = await page.getAttribute('meta[property="og:title"]', 'content');
        expect(ogTitle).toBeTruthy();
    });

    test('Open Graph image je nastaven', async ({ page }) => {
        const ogImage = await page.getAttribute('meta[property="og:image"]', 'content');
        expect(ogImage).toBeTruthy();
    });

    // ── PWA ─────────────────────────────────────────────────────────────────

    test('manifest.json je dostupný', async ({ page }) => {
        const response = await page.request.get('/manifest.json');
        expect(response.status()).toBe(200);
        const json = await response.json();
        expect(json.name).toBeTruthy();
    });

    test('theme-color meta tag existuje', async ({ page }) => {
        const themeColor = await page.getAttribute('meta[name="theme-color"]', 'content');
        expect(themeColor).toBeTruthy();
    });

    // ── Bezpečnostní hlavičky ────────────────────────────────────────────────

    test('bezpečnostní hlavičky jsou přítomny', async ({ page }) => {
        await assertSecurityHeaders(page, '/');
    });

    // ── Navigace ────────────────────────────────────────────────────────────

    test('stránka obsahuje odkaz na horoskopy', async ({ page }) => {
        const link = page.locator('a[href*="horoskop"]').first();
        await expect(link).toBeAttached();
    });

    test('stránka obsahuje odkaz na tarot', async ({ page }) => {
        const link = page.locator('a[href*="tarot"]').first();
        await expect(link).toBeAttached();
    });

    test('stránka obsahuje navigační odkaz na tarot kartu dne', async ({ page }) => {
        const link = page.locator('.nav__dropdown-link[href*="tarot-karta-dne.html"]').first();
        await expect(link).toContainText('Tarot karta dne');
    });

    test('spodní CTA vede na registraci zdarma s denním tracking kontextem', async ({ page }) => {
        const href = await page.locator('#cta-banner-btn').getAttribute('href');
        expect(href).toContain('mode=register');
        expect(href).toContain('source=homepage_bottom_cta');
        expect(href).toContain('feature=daily_guidance');
    });

    test('spodni newsletter vede na registraci s dennim kontextem a e-mailem', async ({ page }) => {
        await expect(page.locator('.newsletter-trust-note')).toContainText('Bez spamu');

        await page.locator('#email-subscribe').fill('newsletter@example.com');
        await Promise.all([
            page.waitForURL(url => url.pathname === '/prihlaseni.html', { timeout: 10000, waitUntil: 'domcontentloaded' }),
            page.locator('#newsletter-form button[type="submit"]').click(),
        ]);

        const url = new URL(page.url());
        expect(url.searchParams.get('mode')).toBe('register');
        expect(url.searchParams.get('source')).toBe('newsletter_form');
        expect(url.searchParams.get('feature')).toBe('daily_guidance');
        expect(url.searchParams.get('email')).toBe('newsletter@example.com');
    });

    test('homepage copy nepouziva nedolozene NASA tvrzeni a nema duplicitni pricing nadpis', async ({ page }) => {
        const bodyText = await page.locator('body').innerText();
        const normalizedBodyText = bodyText.toLowerCase();
        expect(bodyText).not.toContain('efemeridami NASA');
        expect(bodyText).not.toContain('Začněte zdarma. Přechod na Premium udělejte až ve chvíli, kdy chcete víc.');
        expect(bodyText).toContain('Výpočty pod povrchem');
        expect(normalizedBodyText).toContain('ceník bez překvapení');
        expect(bodyText).toContain('Začni zdarma. Plať až ve chvíli, kdy chceš víc.');
        expect(bodyText).toContain('Chceš porovnat všechny tarify');
        expect(bodyText).toContain('Otevřít celý ceník');
    });

    test('reference zachovavaji pribehy bez nedolozeneho ratingu', async ({ page }) => {
        await expect(page.locator('.reviews-trust-panel')).toHaveCount(0);
        await expect(page.locator('.testimonial')).toHaveCount(9);
        await expect(page.locator('.testimonial__source')).toHaveCount(9);
        await expect(page.locator('.testimonial-summary')).toHaveCount(0);
        await expect(page.locator('.review-verification')).toHaveCount(0);
        await expect(page.locator('[data-review-rating]')).toHaveCount(0);
        await expect(page.locator('[data-review-summary]')).toHaveCount(0);
    });

    test('homepage odpovida na hlavni otazky duvery pred registraci a platbou', async ({ page }) => {
        const bodyText = await page.locator('body').innerText();

        expect(bodyText).toContain('Tvůj první výklad během pár minut');
        expect(bodyText).toContain('Nenahrazují lékařskou, psychologickou, právní ani finanční pomoc');
        expect(bodyText).toContain('Než se zaregistruješ, podívej se na ukázku');
        expect(bodyText).toContain('Jak lidé používají Mystickou Hvězdu');
        expect(bodyText).toContain('Co dostaneš bez placení');
        expect(bodyText).toContain('Kdy dává smysl platit');
        expect(bodyText).toContain('Jak zrušit předplatné');
        expect(bodyText).toContain('Správa předplatného');
        expect(bodyText).toContain('Platby, soukromí a pravidla služby:');
        expect(bodyText).toContain('Než si vytvoříš účet');
        expect(bodyText).toContain('Provozovatel služby Mystická Hvězda');

        await expect(page.locator('.sample-output-card')).toHaveCount(3);
        await expect(page.locator('.cancel-flow-card')).toBeVisible();

        const trustLinks = page.locator('.pricing-trust-links');
        await expect(trustLinks.locator('a[href="podminky.html"]')).toBeVisible();
        await expect(trustLinks.locator('a[href="soukromi.html"]')).toBeVisible();
        await expect(trustLinks.locator('a[href="#cookie-banner"]')).toBeVisible();
        await expect(trustLinks.locator('a[href="kontakt.html"]')).toBeVisible();
    });

    test('footer feedback na homepage odesle signal bez registrace', async ({ page }) => {
        const widget = page.locator('[data-feedback-widget]');
        await widget.scrollIntoViewIfNeeded();
        await expect(widget).toBeVisible();
        await expect(widget.locator('[data-feedback-value="yes"]')).toBeVisible();
        await expect(widget.locator('[data-feedback-value="no"]')).toBeVisible();

        await widget.locator('[data-feedback-value="yes"]').click();

        await expect(widget.locator('[data-feedback-status]')).toContainText('Díky');
        await expect(widget.locator('[data-feedback-value="yes"]')).toBeDisabled();
    });

    test('odkaz sprava cookies z ceniku znovu otevre cookie banner', async ({ page }) => {
        await page.evaluate(() => {
            localStorage.setItem('mh_cookie_prefs', JSON.stringify({
                analytics: false,
                marketing: true,
                ts: Date.now()
            }));
        });

        await page.reload();
        await waitForPageReady(page);

        const banner = page.locator('#cookie-banner');
        await expect(banner).toBeHidden();

        const manageCookies = page.locator('.pricing-trust-links a[href="#cookie-banner"]');
        await manageCookies.scrollIntoViewIfNeeded();
        await manageCookies.click();

        await expect(banner).toBeVisible();
        await expect(page.locator('#cookie-analytics')).not.toBeChecked();
        await expect(page.locator('#cookie-marketing')).toBeChecked();
    });

    test('tecky carouselu referenci jsou funkcni a posouvaji obsah', async ({ page }) => {
        const carousel = page.locator('.carousel-container');
        await carousel.scrollIntoViewIfNeeded();

        const dots = page.locator('.carousel-dot');
        await expect(dots).toHaveCount(9);

        const viewport = page.locator('.carousel-track-container');
        const initialScroll = await viewport.evaluate((node) => node.scrollLeft);

        await dots.nth(3).click();

        await expect(dots.nth(3)).toHaveAttribute('aria-current', 'true');
        await expect.poll(() => viewport.evaluate((node) => node.scrollLeft)).toBeGreaterThan(initialScroll);
    });

    test('pricing preview free plan vede neprihlaseneho na aktivacni registraci', async ({ page }) => {
        await page.evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();
        });
        await page.locator('[data-plan="poutnik"]').click();

        await page.waitForURL(url => url.pathname === '/prihlaseni.html', { timeout: 10000, waitUntil: 'domcontentloaded' });
        const url = new URL(page.url());
        expect(url.searchParams.get('mode')).toBe('register');
        expect(url.searchParams.get('redirect')).toBe('/horoskopy.html');
        expect(url.searchParams.get('source')).toBe('homepage_pricing_free_cta');
        expect(url.searchParams.get('feature')).toBe('daily_guidance');
    });

    test('pricing preview placeny plan ulozi checkout kontext pred registraci', async ({ page }) => {
        await page.evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();
        });
        await page.locator('[data-plan="pruvodce"]').click();

        await page.waitForURL(url => url.pathname === '/prihlaseni.html', { timeout: 10000, waitUntil: 'domcontentloaded' });
        const url = new URL(page.url());
        expect(url.searchParams.get('mode')).toBe('register');
        expect(url.searchParams.get('redirect')).toBe('/cenik.html');
        expect(url.searchParams.get('plan')).toBe('pruvodce');
        expect(url.searchParams.get('source')).toBe('homepage_pricing_preview');
        expect(url.searchParams.get('feature')).toBe('premium_membership');

        const pendingContext = await page.evaluate(() => JSON.parse(sessionStorage.getItem('pending_checkout_context') || '{}'));
        expect(pendingContext).toEqual(expect.objectContaining({
            planId: 'pruvodce',
            source: 'homepage_pricing_preview',
            feature: 'premium_membership',
            redirect: '/cenik.html',
            authMode: 'register'
        }));
    });

    test('pricing preview posila vyssi plany do celeho ceniku', async ({ page }) => {
        const fullPricingLink = page.locator('a[href*="homepage_pricing_full_compare"]');
        await expect(fullPricingLink).toBeVisible();
        await expect(fullPricingLink).toHaveAttribute('href', /cenik\.html\?source=homepage_pricing_full_compare/);
        await expect(page.locator('[data-plan="osviceni"]')).toHaveCount(0);
        await expect(page.locator('[data-plan="vip-majestrat"]')).toHaveCount(0);
    });

    test('karta dne vede do andelskych karet a sdileni funguje i bez Web Share API', async ({ page }) => {
        await page.evaluate(() => {
            const now = new Date();
            const today = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
            localStorage.setItem('mh_kdd_date', today);
            localStorage.setItem('mh_kdd_index', '27');
            localStorage.removeItem('mh_kdd_last_flip_date');
        });

        await page.reload();
        await waitForPageReady(page);

        const card = page.locator('#kdd-card');
        await card.scrollIntoViewIfNeeded();
        await card.click();

        await expect(page.locator('#kdd-message')).toBeVisible();
        await expect(page.locator('#kdd-name')).toHaveText('Hravost');

        const detailHref = await page.locator('#kdd-lexicon-link').getAttribute('href');
        expect(detailHref).toContain('andelske-karty.html');
        expect(detailHref).toContain('source=homepage_daily_card_detail');
        expect(detailHref).toContain('feature=daily_angel_card');
        expect(detailHref).toContain('daily_card=hravost');
        expect(detailHref).not.toContain('tarot');

        const fullReadingHref = await page.locator('#kdd-full-reading-link').getAttribute('href');
        expect(fullReadingHref).toContain('andelske-karty.html');
        expect(fullReadingHref).toContain('source=homepage_daily_card_full_reading');
        expect(fullReadingHref).toContain('feature=andelske_karty_hluboky_vhled');
        expect(fullReadingHref).toContain('daily_card=hravost');
        expect(fullReadingHref).not.toContain('tarot');

        await page.evaluate(() => {
            Object.defineProperty(navigator, 'share', {
                configurable: true,
                value: undefined
            });
            Object.defineProperty(navigator, 'clipboard', {
                configurable: true,
                value: {
                    writeText: async (text) => {
                        window.__dailyCardShareText = text;
                    }
                }
            });
        });

        await page.locator('#kdd-share-btn').click();

        await expect.poll(() => page.evaluate(() => window.__dailyCardShareText || '')).toContain('Hravost');
        await expect.poll(() => page.evaluate(() => window.__dailyCardShareText || '')).toContain('andelske-karty.html');
    });

    test('sdileni karty dne ma textarea fallback pri nedostupne clipboard API', async ({ page }) => {
        await page.evaluate(() => {
            const now = new Date();
            const today = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
            localStorage.setItem('mh_kdd_date', today);
            localStorage.setItem('mh_kdd_index', '27');
            localStorage.removeItem('mh_kdd_last_flip_date');
        });

        await page.reload();
        await waitForPageReady(page);

        const card = page.locator('#kdd-card');
        await card.scrollIntoViewIfNeeded();
        await card.click();
        await expect(page.locator('#kdd-message')).toBeVisible();

        await page.evaluate(() => {
            Object.defineProperty(navigator, 'share', {
                configurable: true,
                value: undefined
            });
            Object.defineProperty(navigator, 'clipboard', {
                configurable: true,
                value: {
                    writeText: async () => {
                        throw new Error('clipboard denied');
                    }
                }
            });
            document.execCommand = (command) => {
                if (command !== 'copy') return false;
                window.__dailyCardFallbackText = document.activeElement?.value || '';
                return true;
            };
        });

        await page.locator('#kdd-share-btn').click();

        await expect(page.locator('#kdd-share-btn')).toContainText('Zkopírováno');
        await expect.poll(() => page.evaluate(() => window.__dailyCardFallbackText || '')).toContain('Hravost');
        await expect.poll(() => page.evaluate(() => window.__dailyCardFallbackText || '')).toContain('andelske-karty.html');
    });

    test('sdileni karty dne ukaze rucni odkaz kdyz automaticke kopirovani selze', async ({ page }) => {
        await page.evaluate(() => {
            const now = new Date();
            const today = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
            localStorage.setItem('mh_kdd_date', today);
            localStorage.setItem('mh_kdd_index', '27');
            localStorage.removeItem('mh_kdd_last_flip_date');
        });

        await page.reload();
        await waitForPageReady(page);

        const card = page.locator('#kdd-card');
        await card.scrollIntoViewIfNeeded();
        await card.click();
        await expect(page.locator('#kdd-message')).toBeVisible();

        await page.evaluate(() => {
            Object.defineProperty(navigator, 'share', {
                configurable: true,
                value: undefined
            });
            Object.defineProperty(navigator, 'clipboard', {
                configurable: true,
                value: {
                    writeText: async () => {
                        throw new Error('clipboard denied');
                    }
                }
            });
            document.execCommand = () => false;
        });

        await page.locator('#kdd-share-btn').click();

        await expect(page.locator('#kdd-share-btn')).toContainText('Odkaz připraven');
        await expect(page.locator('.kdd-share-fallback')).toBeVisible();
        await expect(page.locator('.kdd-share-fallback input')).toHaveValue(/andelske-karty\.html/);
    });

    test('skip-link pro přístupnost existuje', async ({ page }) => {
        const skipLink = page.locator('.skip-link, a[href="#main-content"]').first();
        await expect(skipLink).toBeAttached();
    });

    // ── Mobilní responsivita ────────────────────────────────────────────────

    test('homepage nemá horizontální scroll na mobilním viewportu', async ({ page }) => {
        await page.setViewportSize(MOBILE_VIEWPORT);
        await page.goto('/');
        await waitForPageReady(page);

        const hasHorizontalScroll = await page.evaluate(() =>
            document.documentElement.scrollWidth > document.documentElement.clientWidth
        );
        expect(hasHorizontalScroll).toBe(false);
    });

    test('h1 je viditelný na mobilním viewportu', async ({ page }) => {
        await page.setViewportSize(MOBILE_VIEWPORT);
        await page.goto('/');
        await waitForPageReady(page);

        const h1 = page.locator('h1').first();
        await expect(h1).toBeVisible();
    });
});
