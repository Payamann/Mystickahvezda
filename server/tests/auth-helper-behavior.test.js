import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';
import { supabase } from '../db-supabase.js';
import {
    checkAccountLockout,
    recordFailedAttempt,
    recordSuccessfulLogin
} from '../utils/account-lockout.js';
import {
    blacklistAllUserTokens,
    blacklistToken,
    isTokenBlacklisted
} from '../utils/token-blacklist.js';

const BASE_TIME = new Date('2026-05-13T10:00:00.000Z');

function makeToken(payload, options = {}) {
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h', ...options });
}

afterEach(() => {
    jest.useRealTimers();
});

describe('Auth helper behavior', () => {
    test('fifth recent failed login locks the normalized email account', async () => {
        jest.useFakeTimers();
        jest.setSystemTime(BASE_TIME);

        const email = `Lockout-${Date.now()}@Example.com`;
        const normalizedEmail = email.toLowerCase();

        await supabase.from('login_attempts').insert([
            { user_email: normalizedEmail, attempt_type: 'failed', created_at: '2026-05-13T09:58:00.000Z' },
            { user_email: normalizedEmail, attempt_type: 'failed', created_at: '2026-05-13T09:58:30.000Z' },
            { user_email: normalizedEmail, attempt_type: 'failed', created_at: '2026-05-13T09:59:00.000Z' },
            { user_email: normalizedEmail, attempt_type: 'failed', created_at: '2026-05-13T09:59:30.000Z' }
        ]);

        const result = await recordFailedAttempt(email, '203.0.113.20', 'jest', 'invalid_password');

        expect(result).toEqual({
            isLocked: true,
            remainingAttempts: 0
        });

        const lockout = await checkAccountLockout(normalizedEmail);
        expect(lockout.isLocked).toBe(true);
        expect(lockout.minutesRemaining).toBe(15);
        expect(lockout.lockedUntil.toISOString()).toBe('2026-05-13T10:15:00.000Z');
    });

    test('successful login clears recent failed attempts for that email', async () => {
        jest.useFakeTimers();
        jest.setSystemTime(BASE_TIME);

        const email = `success-clears-${Date.now()}@example.com`;

        await supabase.from('login_attempts').insert([
            { user_email: email, attempt_type: 'failed', created_at: '2026-05-13T09:57:00.000Z' },
            { user_email: email, attempt_type: 'failed', created_at: '2026-05-13T09:58:00.000Z' }
        ]);

        await recordSuccessfulLogin(email.toUpperCase(), '203.0.113.21', 'jest');

        const { data: failedAttempts } = await supabase
            .from('login_attempts')
            .select('*')
            .eq('user_email', email)
            .eq('attempt_type', 'failed');

        const { data: successAttempts } = await supabase
            .from('login_attempts')
            .select('*')
            .eq('user_email', email)
            .eq('attempt_type', 'success');

        expect(failedAttempts).toHaveLength(0);
        expect(successAttempts).toHaveLength(1);
    });

    test('individual token blacklist invalidates only the exact token', async () => {
        const userId = `token-exact-${Date.now()}`;
        const token = makeToken({ id: userId, session: 'one' });
        const otherToken = makeToken({ id: userId, session: 'two' });

        await blacklistToken(token);

        await expect(isTokenBlacklisted(token)).resolves.toBe(true);
        await expect(isTokenBlacklisted(otherToken)).resolves.toBe(false);
    });

    test('user-wide token blacklist invalidates older tokens but not newer sessions', async () => {
        jest.useFakeTimers();
        jest.setSystemTime(BASE_TIME);

        const userId = `token-wide-${Date.now()}`;
        const oldToken = makeToken({ id: userId, session: 'before-password-change' });

        await blacklistAllUserTokens(userId);

        jest.setSystemTime(new Date('2026-05-13T10:00:02.000Z'));
        const newToken = makeToken({ id: userId, session: 'after-password-change' });

        await expect(isTokenBlacklisted(oldToken)).resolves.toBe(true);
        await expect(isTokenBlacklisted(newToken)).resolves.toBe(false);
    });
});
