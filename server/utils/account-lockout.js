/**
 * Account Lockout Management
 * Prevents brute-force attacks by locking accounts after N failed attempts
 * Configuration: 5 attempts → 15 minute lockout
 */

import { supabase } from '../db-supabase.js';

const FAILED_ATTEMPT_LIMIT = 5;
const LOCKOUT_DURATION_MINUTES = 15;

/**
 * Record a failed login attempt
 * @param {string} email - User email
 * @param {string} ip - Client IP address
 * @param {string} userAgent - User agent string
 * @param {string} reason - Reason for failure (invalid_password, etc.)
 */
export async function recordFailedAttempt(email, ip, userAgent, reason = 'invalid_password') {
    try {
        if (!email) return;

        const { data: existingAttempts } = await supabase
            .from('login_attempts')
            .select('*')
            .eq('user_email', email.toLowerCase())
            .eq('attempt_type', 'failed')
            .gte('created_at', new Date(Date.now() - LOCKOUT_DURATION_MINUTES * 60 * 1000).toISOString())
            .order('created_at', { ascending: false })
            .limit(FAILED_ATTEMPT_LIMIT);

        const failedCount = existingAttempts?.length || 0;

        // Check if account should be locked
        let isLocked = false;
        let lockedUntil = null;

        if (failedCount >= FAILED_ATTEMPT_LIMIT - 1) {
            isLocked = true;
            lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000);
        }

        // Record this attempt
        const { error } = await supabase
            .from('login_attempts')
            .insert({
                user_email: email.toLowerCase(),
                attempt_type: 'failed',
                ip_address: ip,
                user_agent: userAgent,
                reason: reason,
                is_locked: isLocked,
                locked_until: lockedUntil?.toISOString() || null,
                attempt_count: failedCount + 1
            });

        if (error) {
            console.error('[LOCKOUT] Error recording attempt:', error);
        }

        return {
            isLocked,
            remainingAttempts: Math.max(0, FAILED_ATTEMPT_LIMIT - failedCount - 1)
        };
    } catch (e) {
        console.error('[LOCKOUT] Error in recordFailedAttempt:', e);
        return { isLocked: false, remainingAttempts: FAILED_ATTEMPT_LIMIT };
    }
}

/**
 * Check if account is currently locked
 * @param {string} email - User email
 * @returns {object} - { isLocked: boolean, lockedUntil: Date|null }
 */
export async function checkAccountLockout(email) {
    try {
        if (!email) return { isLocked: false, lockedUntil: null };

        const now = new Date();

        const { data: attempts, error } = await supabase
            .from('login_attempts')
            .select('*')
            .eq('user_email', email.toLowerCase())
            .eq('is_locked', true)
            .gt('locked_until', now.toISOString())
            .order('locked_until', { ascending: false })
            .limit(1);

        if (error) {
            console.error('[LOCKOUT] Query error:', error);
            return { isLocked: false, lockedUntil: null };
        }

        if (attempts && attempts.length > 0) {
            return {
                isLocked: true,
                lockedUntil: new Date(attempts[0].locked_until),
                minutesRemaining: Math.ceil((new Date(attempts[0].locked_until) - now) / (60 * 1000))
            };
        }

        return { isLocked: false, lockedUntil: null };
    } catch (e) {
        console.error('[LOCKOUT] Error checking lockout:', e);
        return { isLocked: false, lockedUntil: null };
    }
}

/**
 * Record a successful login (clear failed attempts)
 * @param {string} email - User email
 * @param {string} ip - Client IP
 * @param {string} userAgent - User agent
 */
export async function recordSuccessfulLogin(email, ip, userAgent) {
    try {
        if (!email) return;

        // Record success
        const { error } = await supabase
            .from('login_attempts')
            .insert({
                user_email: email.toLowerCase(),
                attempt_type: 'success',
                ip_address: ip,
                user_agent: userAgent
            });

        if (error) {
            console.error('[LOCKOUT] Error recording success:', error);
        }

        // A successful login resets the failed-attempt window for this email.
        await supabase
            .from('login_attempts')
            .delete()
            .eq('user_email', email.toLowerCase())
            .eq('attempt_type', 'failed');
    } catch (e) {
        console.error('[LOCKOUT] Error in recordSuccessfulLogin:', e);
    }
}
