import { test, expect } from '@playwright/test';
import { waitForPageReady } from './helpers.js';

async function waitForPath(page, pathname, options = {}) {
    await page.waitForURL(
        url => url.pathname === pathname,
        { timeout: 10000, waitUntil: 'domcontentloaded', ...options }
    );
}

async function triggerExitIntent(page) {
    const exitIntentReady = page.evaluate(() => new Promise((resolve) => {
        const findScript = () => Array.from(document.scripts)
            .find((script) => script.src.includes('/js/dist/exit-intent.js'));
        const bindScript = (script) => {
            script.addEventListener('load', () => resolve(true), { once: true });
            script.addEventListener('error', () => resolve(false), { once: true });
        };
        const existingScript = findScript();
        if (existingScript) {
            if (existingScript.dataset.loaded === 'true' || existingScript.readyState === 'complete') {
                resolve(true);
                return;
            }
            existingScript.addEventListener('load', () => {
                existingScript.dataset.loaded = 'true';
                resolve(true);
            }, { once: true });
            window.setTimeout(() => resolve(true), 50);
            return;
        }

        const observer = new MutationObserver(() => {
            const script = findScript();
            if (!script) return;
            observer.disconnect();
            script.addEventListener('load', () => {
                script.dataset.loaded = 'true';
            }, { once: true });
            bindScript(script);
        });
        observer.observe(document.documentElement, { childList: true, subtree: true });
    }));

    await page.dispatchEvent('body', 'pointerdown');
    await expect.poll(() => exitIntentReady, { timeout: 5000 }).toBe(true);

    const afterScriptTimestamp = await page.evaluate(() => Date.now());
    await page.evaluate((timestamp) => {
        const originalDateNow = Date.now.bind(Date);
        Date.now = () => timestamp + 16000;
        document.dispatchEvent(new MouseEvent('mouseleave', {
            clientY: 0,
            bubbles: true
        }));
        Date.now = originalDateNow;
    }, afterScriptTimestamp);
}

test.describe('Exit intent checkout handoff', () => {
    test('horoskopy exit intent preserves paid checkout context through registration', async ({ page }) => {
        let authPayload = null;
        let checkoutPayload = null;
        const funnelEvents = [];

        await page.route('**/api/csrf-token', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ csrfToken: 'e2e-exit-intent-token' })
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
                        id: 'exit-intent-horoscope-user',
                        email: 'exit-intent-horoscope@example.com',
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
                    id: 'cs_test_exit_intent_horoskopy',
                    url: '/profil.html?payment=success&plan=pruvodce&session_id=cs_test_exit_intent_horoskopy'
                })
            });
        });

        await page.goto('/horoskopy.html?source=e2e_exit_intent');
        await waitForPageReady(page);
        await page.evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();
        });

        await triggerExitIntent(page);

        const modal = page.locator('#exit-intent-modal');
        await expect(modal).toBeVisible();
        await expect(modal).toContainText('plnému přístupu');

        await Promise.all([
            waitForPath(page, '/prihlaseni.html'),
            page.locator('#exit-cta').click(),
        ]);

        const authUrl = new URL(page.url());
        expect(authUrl.searchParams.get('mode')).toBe('register');
        expect(authUrl.searchParams.get('redirect')).toBe('/cenik.html');
        expect(authUrl.searchParams.get('plan')).toBe('pruvodce');
        expect(authUrl.searchParams.get('source')).toBe('exit_intent_horoskopy');
        expect(authUrl.searchParams.get('feature')).toBe('horoskopy');
        expect(authUrl.searchParams.get('entry_source')).toBe('exit_intent_horoskopy');
        expect(authUrl.searchParams.get('entry_feature')).toBe('horoskopy');

        await expect(page.locator('#checkout-context-banner')).toBeVisible();
        await expect(page.locator('#checkout-context-banner')).toContainText('Horoskopy');
        await expect(page.locator('#checkout-context-banner')).toContainText('bezpečný checkout');

        await page.locator('#email').fill('exit-intent-horoscope@example.com');
        await page.locator('#password').fill('TestPassword123!');
        await page.locator('#confirm-password-reg').fill('TestPassword123!');
        await page.locator('#gdpr-consent').check();

        await Promise.all([
            waitForPath(page, '/profil.html'),
            page.locator('#auth-submit').click(),
        ]);

        expect(authPayload).toEqual(expect.objectContaining({
            email: 'exit-intent-horoscope@example.com',
            password: 'TestPassword123!',
            password_confirm: 'TestPassword123!'
        }));
        expect(checkoutPayload).toEqual(expect.objectContaining({
            planId: 'pruvodce',
            source: 'exit_intent_horoskopy',
            feature: 'horoskopy',
            billingInterval: null,
            metadata: expect.objectContaining({
                entry_source: 'exit_intent_horoskopy',
                entry_feature: 'horoskopy'
            })
        }));
        await expect.poll(() => funnelEvents.find((event) => (
            event.eventName === 'checkout_auth_required'
            && event.source === 'exit_intent_horoskopy'
            && event.feature === 'horoskopy'
        )) || null).toEqual(expect.objectContaining({
            planId: 'pruvodce',
            metadata: expect.objectContaining({
                redirect: '/cenik.html',
                auth_mode: 'register',
                entry_source: 'exit_intent_horoskopy',
                entry_feature: 'horoskopy'
            })
        }));
        expect(await page.evaluate(() => sessionStorage.getItem('pending_plan'))).toBeNull();
    });
});
