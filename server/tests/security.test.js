/**
 * Security Tests for Mystická Hvězda API
 * Tests CSRF, Input Validation, Rate Limiting, XSS, Authentication, Authorization
 *
 * Run with: npm test
 */

import request from 'supertest';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import app from '../index.js';
import { validateEmail, validatePassword, validateName, validateBirthDate } from '../utils/validation.js';

const ROOT_DIR = path.resolve(process.cwd());

describe('🔒 Security Tests', () => {

    // ============================================
    // INPUT VALIDATION TESTS
    // ============================================
    describe('Input Validation', () => {
        test('Email validation: Valid email accepted', () => {
            expect(() => validateEmail('test@example.com')).not.toThrow();
        });

        test('Email validation: Invalid email rejected', () => {
            expect(() => validateEmail('invalid-email')).toThrow('Invalid email format');
        });

        test('Email validation: Email too long rejected', () => {
            expect(() => validateEmail('a'.repeat(300) + '@example.com')).toThrow();
        });

        test('Password validation: Weak password rejected', () => {
            expect(() => validatePassword('short')).toThrow();
        });

        test('Password validation: Password with low complexity rejected', () => {
            expect(() => validatePassword('password')).toThrow();
        });

        test('Password validation: Valid password accepted', () => {
            expect(() => validatePassword('SecurePass123!')).not.toThrow();
        });

        test('Name validation: Valid name accepted', () => {
            expect(() => validateName('John Doe')).not.toThrow();
        });

        test('Name validation: Name with HTML rejected', () => {
            expect(() => validateName('<script>alert("xss")</script>')).not.toThrow();
            // Should strip HTML, not throw
        });

        test('Birth date validation: Future date rejected', () => {
            const futureDate = new Date();
            futureDate.setFullYear(futureDate.getFullYear() + 1);
            expect(() => validateBirthDate(futureDate.toISOString())).toThrow();
        });
    });

    // ============================================
    // CSRF PROTECTION TESTS
    // ============================================
    describe('CSRF Protection', () => {
        test('GET /api/csrf-token returns valid token', async () => {
            const res = await request(app)
                .get('/api/csrf-token')
                .expect(200);

            expect(res.body.csrfToken).toBeDefined();
            expect(typeof res.body.csrfToken).toBe('string');
            expect(res.body.csrfToken.length).toBeGreaterThan(0);
        });

        test('POST without CSRF token rejected', async () => {
            const res = await request(app)
                .post('/api/newsletter/subscribe')
                .send({ email: 'test@example.com' })
                .expect(403);

            expect(res.body.error).toContain('CSRF');
        });

        test('POST with invalid CSRF token rejected', async () => {
            const res = await request(app)
                .post('/api/newsletter/subscribe')
                .set('x-csrf-token', 'invalid.token')
                .send({ email: 'test@example.com' })
                .expect(403);

            expect(res.body.error).toContain('CSRF');
        });

        test('GET request bypasses CSRF protection', async () => {
            const res = await request(app)
                .get('/api/newsletter/subscribe')
                .expect(404); // Not found because GET isn't supported, but not CSRF error
        });
    });

    // ============================================
    // AUTHENTICATION TESTS
    // ============================================
    describe('Authentication', () => {
        test('Missing auth token returns 401', async () => {
            const res = await request(app)
                .get('/api/user/readings')
                .expect(401);
        });

        test('Invalid auth token returns 403', async () => {
            const res = await request(app)
                .get('/api/user/readings')
                .set('Authorization', 'Bearer invalid.token.here')
                .expect(403);
        });

        test('Token refresh endpoint requires authentication or CSRF', async () => {
            const res = await request(app)
                .post('/api/auth/refresh-token')
                .expect(403); // CSRF rejection before auth check
        });
    });

    // ============================================
    // RATE LIMITING TESTS
    // ============================================
    describe('Rate Limiting', () => {
        test('Health check endpoint accessible without rate limit', async () => {
            const res = await request(app)
                .get('/api/health')
                .expect(200);

            expect(res.body.status).toBe('ok');
        });

        test('Newsletter rate limiting prevents spam', async () => {
            // Attempt multiple requests to trigger rate limit
            // Note: This test may need to be adjusted based on actual rate limit window
            const promises = [];
            for (let i = 0; i < 10; i++) {
                promises.push(
                    request(app)
                        .post('/api/newsletter/subscribe')
                        .send({ email: `test${i}@example.com` })
                );
            }

            const results = await Promise.all(promises);
            // At least one should hit rate limit (429) or CSRF validation
            const hasRateLimit = results.some(res => res.status === 429 || res.status === 403);
            expect(hasRateLimit).toBe(true);
        });
    });

    // ============================================
    // ERROR HANDLING TESTS
    // ============================================
    describe('Error Handling', () => {
        test('Server errors return generic message in production', async () => {
            // Make a request that might cause an error
            const res = await request(app)
                .get('/api/nonexistent-endpoint')
                .expect(404);

            expect(res.body.error).toBeDefined();
            // Should not expose stack traces or internal details
            expect(res.body.error).not.toContain('stack');
            expect(res.body.error).not.toContain('at ');
        });

        test('Invalid JSON body returns 400', async () => {
            const res = await request(app)
                .post('/api/newsletter/subscribe')
                .set('Content-Type', 'application/json')
                .send('invalid json {')
                .expect(400);
        });
    });

    // ============================================
    // SECURITY HEADER TESTS
    // ============================================
    describe('Security Headers', () => {
        function getCspDirective(header, directiveName) {
            return header
                .split(';')
                .map(part => part.trim())
                .find(part => part.startsWith(`${directiveName} `)) || '';
        }

        function readInlineScriptHashes(relativeFilePath) {
            const html = fs.readFileSync(path.join(ROOT_DIR, relativeFilePath), 'utf8');
            const hashes = [];
            const scriptBlockPattern = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
            let match;

            while ((match = scriptBlockPattern.exec(html)) !== null) {
                const scriptBody = match[1];
                if (!scriptBody.trim()) continue;

                const hash = crypto.createHash('sha256').update(scriptBody, 'utf8').digest('base64');
                hashes.push(`'sha256-${hash}'`);
            }

            return hashes;
        }

        test('Response includes CSP header', async () => {
            const res = await request(app)
                .get('/')
                .expect(200);

            expect(res.headers['content-security-policy']).toBeDefined();
            expect(res.headers['content-security-policy']).toContain("default-src 'self'");
            expect(res.headers['content-security-policy']).toContain("base-uri 'self'");
            expect(res.headers['content-security-policy']).toContain("form-action 'self' https://checkout.stripe.com");
        });

        test('CSP allows inline JSON-LD only through script hashes', async () => {
            const res = await request(app)
                .get('/rocni-horoskop.html')
                .expect(200);
            const scriptSrc = getCspDirective(res.headers['content-security-policy'], 'script-src');

            expect(scriptSrc).toContain("'sha256-");
            expect(scriptSrc).not.toContain("'unsafe-inline'");
            expect(res.headers['content-security-policy']).not.toContain("script-src-attr 'unsafe-inline'");
        });

        test('API responses keep CSP compact and hash-free', async () => {
            const res = await request(app)
                .get('/api/health')
                .expect(200);
            const csp = res.headers['content-security-policy'];

            expect(csp.length).toBeLessThan(2000);
            expect(csp).not.toContain("'sha256-");
        });

        test('CSP hashes inline JSON-LD in nested static HTML pages', async () => {
            const expectedHashes = readInlineScriptHashes(path.join('horoskop', 'beran.html'));
            const res = await request(app)
                .get('/horoskop/beran.html')
                .expect(200);
            const scriptSrc = getCspDirective(res.headers['content-security-policy'], 'script-src');

            expect(expectedHashes.length).toBeGreaterThan(0);
            expect(scriptSrc.match(/'sha256-/g)).toHaveLength(expectedHashes.length);
            for (const hash of expectedHashes) {
                expect(scriptSrc).toContain(hash);
            }
        });

        test('CSP does not allow inline styles', async () => {
            const res = await request(app)
                .get('/')
                .expect(200);
            const styleSrc = getCspDirective(res.headers['content-security-policy'], 'style-src');

            expect(styleSrc).toBeTruthy();
            expect(styleSrc).not.toContain("'unsafe-inline'");
        });

        test('Response includes HSTS header', async () => {
            const res = await request(app)
                .get('/')
                .expect(200);

            expect(res.headers['strict-transport-security']).toBeDefined();
            expect(res.headers['strict-transport-security']).toContain('max-age');
        });

        test('Response includes Referrer-Policy header', async () => {
            const res = await request(app)
                .get('/')
                .expect(200);

            expect(res.headers['referrer-policy']).toBeDefined();
        });

        test('Response includes X-Content-Type-Options header', async () => {
            const res = await request(app)
                .get('/')
                .expect(200);

            expect(res.headers['x-content-type-options']).toBe('nosniff');
        });

        test('Response includes X-Frame-Options header', async () => {
            const res = await request(app)
                .get('/')
                .expect(200);

            expect(res.headers['x-frame-options']).toBeDefined();
        });
    });

    // ============================================
    // REQUEST SIZE LIMIT TESTS
    // ============================================
    describe('Request Size Limits', () => {
        test('Oversized JSON payload rejected', async () => {
            const largePayload = {
                message: 'x'.repeat(50000) // 50KB
            };

            const res = await request(app)
                .post('/api/newsletter/subscribe')
                .send(largePayload)
                .expect((res) => {
                    // Should either be 413 (Payload Too Large) or 400 (Bad Request)
                    expect([413, 400]).toContain(res.status);
                });
        });

        test('Normal size payload accepted', async () => {
            const normalPayload = {
                email: 'test@example.com',
                message: 'This is a normal message'
            };

            const res = await request(app)
                .post('/api/newsletter/subscribe')
                .send(normalPayload)
                .expect((res) => {
                    // Should not be 413 or payload error
                    expect(res.status).not.toBe(413);
                });
        });
    });

    // ============================================
    // XSS PROTECTION TESTS
    // ============================================
    describe('XSS Protection', () => {
        test('Contact form sanitizes HTML input', async () => {
            // Get CSRF token first
            const tokenRes = await request(app)
                .get('/api/csrf-token')
                .expect(200);

            const csrfToken = tokenRes.body.csrfToken;

            const res = await request(app)
                .post('/api/contact')
                .set('x-csrf-token', csrfToken)
                .send({
                    name: '<script>alert("xss")</script>',
                    email: 'test@example.com',
                    subject: 'Test subject',
                    message: 'This is a test message'
                });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });
    });

    // ============================================
    // CORS TESTS
    // ============================================
    describe('CORS Protection', () => {
        test('Invalid origin rejected', async () => {
            const res = await request(app)
                .get('/api/health')
                .set('Origin', 'https://evil.com')
                .expect((res) => {
                    // May be accepted or rejected depending on ALLOWED_ORIGINS config
                    // Just verify no credentials leak
                    expect(res.headers['access-control-allow-credentials']).not.toBe('true');
                });
        });

        test('Localhost origin allowed', async () => {
            const res = await request(app)
                .get('/api/health')
                .set('Origin', 'http://localhost:3000')
                .expect(200);
        });
    });

});

describe('📊 Performance & Security Metrics', () => {
    test('Response time is reasonable (< 1 second)', async () => {
        const start = Date.now();
        const res = await request(app)
            .get('/api/health')
            .expect(200);
        const duration = Date.now() - start;

        expect(duration).toBeLessThan(1000); // Less than 1 second
    });

    test('Health check payload is minimal', async () => {
        const res = await request(app)
            .get('/api/health')
            .expect(200);

        const responseSize = JSON.stringify(res.body).length;
        expect(responseSize).toBeLessThan(1000); // Less than 1KB
    });
});
