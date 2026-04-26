/**
 * Playwright E2E Test Configuration — Mystická Hvězda
 *
 * Pokrytí: homepage, horoskopy, tarot, auth, numerologie, SEO stránky, navigace
 * Prohlížeče: Chromium desktop + Pixel 5 mobile
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './tests/e2e',
    fullyParallel: true,

    // Zakazuje .only() v CI aby nikdo omylem nepushl half-test
    forbidOnly: !!process.env.CI,

    // Retry jen v CI — lokálně chceme okamžitou zpětnou vazbu
    retries: process.env.CI ? 2 : 0,

    // V CI sekvenčně (stabilita), lokálně paralelně (rychlost)
    workers: process.env.CI ? 1 : undefined,

    reporter: [
        ['html', { open: 'never', outputFolder: 'playwright-report' }],
        ['list'],
    ],

    timeout: 30_000,
    expect: { timeout: 8_000 },

    use: {
        baseURL: 'http://localhost:3001',
        headless: true,
        locale: 'cs-CZ',
        timezoneId: 'Europe/Prague',
        viewport: { width: 1280, height: 720 },
        ignoreHTTPSErrors: true,
        // Zachytit screenshot při selhání
        screenshot: 'only-on-failure',
        // Trace pro debugování v CI
        trace: 'on-first-retry',
        // Záznamy videí jen v CI
        video: process.env.CI ? 'on-first-retry' : 'off',
    },

    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
        {
            name: 'mobile-chrome',
            use: { ...devices['Pixel 5'] },
        },
    ],

    // Spustí dev server pokud ještě neběží
    webServer: {
        command: 'node server/index.js',
        port: 3001,
        // Lokálně reuse (rychlejší), v CI vždy čerstvý start
        reuseExistingServer: !process.env.CI,
        timeout: 30_000,
        env: {
            NODE_ENV: 'test',
            PORT: '3001',
            DISABLE_SCHEDULED_JOBS: 'true',
            MOCK_AI: 'true',
            MOCK_SUPABASE: 'true',
            // Testovací secrets — žádné reálné klíče
            JWT_SECRET: 'e2e-test-jwt-secret-do-not-use-in-prod',
            CSRF_SECRET: 'e2e-test-csrf-secret-do-not-use-in-prod',
            SUPABASE_URL: 'https://test.supabase.co',
            SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
            SUPABASE_ANON_KEY: 'test-anon-key',
            STRIPE_SECRET_KEY: 'sk_test_placeholder',
            STRIPE_WEBHOOK_SECRET: 'whsec_placeholder',
            ANTHROPIC_API_KEY: 'test-anthropic-key',
            RESEND_API_KEY: 'test-resend-key',
            SENTRY_DSN: '',
        },
    },
});
