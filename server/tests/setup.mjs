/**
 * Jest Test Setup
 * Configures test environment and utilities
 */
import { jest } from '@jest/globals';

// Suppress console output during tests
global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
};

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DISABLE_SCHEDULED_JOBS = 'true';
process.env.MOCK_AI = 'true';
process.env.MOCK_SUPABASE = 'true';
process.env.JWT_SECRET = 'test-secret-key-12345';
process.env.CSRF_SECRET = 'test-csrf-secret-key-12345';
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
process.env.GEMINI_API_KEY = 'test-gemini-key';
process.env.STRIPE_SECRET_KEY = 'test-stripe-key';
process.env.STRIPE_WEBHOOK_SECRET = 'test-webhook-secret';
process.env.RESEND_API_KEY = 'test-resend-key';

// Timeout for tests
jest.setTimeout(30000);

// Global test utilities
global.testUtils = {
    /**
     * Sleep for specified milliseconds
     */
    sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

    /**
     * Generate a valid test email
     */
    generateTestEmail: () => `test-${Date.now()}@example.com`,

    /**
     * Generate a valid test password
     */
    generateTestPassword: () => 'TestPassword123!',

    /**
     * Assert that response contains security headers
     */
    assertSecurityHeaders: (res) => {
        expect(res.headers['content-security-policy']).toBeDefined();
        expect(res.headers['strict-transport-security']).toBeDefined();
        expect(res.headers['x-content-type-options']).toBe('nosniff');
    }
};
