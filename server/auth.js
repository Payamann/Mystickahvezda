import express from 'express';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { supabase } from './db-supabase.js';
import { JWT_SECRET, JWT_EXPIRY, COOKIE_OPTIONS, INDICATOR_COOKIE_OPTIONS, CLEAR_COOKIE_OPTIONS, CLEAR_INDICATOR_COOKIE_OPTIONS } from './config/jwt.js';
import { authenticateToken } from './middleware.js';
import { validateEmail, validatePassword, validateName, validateBirthDate } from './utils/validation.js';
import { PREMIUM_PLAN_TYPES } from './config/constants.js';
import { blacklistToken } from './utils/token-blacklist.js';
import { recordFailedAttempt, checkAccountLockout, recordSuccessfulLogin } from './utils/account-lockout.js';

const router = express.Router();
const LOCKOUT_DURATION_MINUTES = 15;

// ============================================
// Helper: Generate JWT Token
// ============================================
export async function generateToken(userId) {
    try {
        // Fetch latest subscription info
        const { data: sub, error: subError } = await supabase
            .from('subscriptions')
            .select('plan_type, status, current_period_end')
            .eq('user_id', userId)
            .single();
        // PGRST116 = žádný řádek (nový uživatel bez subscriptions záznamu) — OK
        if (subError && subError.code !== 'PGRST116') {
            throw subError;
        }

        const status = sub?.plan_type;
        const isPremium = status && PREMIUM_PLAN_TYPES.includes(status) &&
                         ['active', 'trialing', 'cancel_pending'].includes(sub.status) &&
                         new Date(sub.current_period_end) > new Date();

        // Fetch user email
        const { data: userData } = await supabase.auth.admin.getUserById(userId);
        const userEmail = userData?.user?.email || '';

        const token = jwt.sign({
            id: userId,
            email: userEmail,
            subscription_status: status,
            isPremium: isPremium,
            premiumExpires: sub?.current_period_end || null
        }, JWT_SECRET, { expiresIn: JWT_EXPIRY });

        return token;
    } catch (err) {
        console.error('Token generation error:', err);
        throw new Error('Failed to generate token');
    }
}

// Strict rate limiting on auth endpoints to prevent brute force / credential stuffing
const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 attempts per hour (strict brute-force protection)
    message: { error: 'Příliš mnoho pokusů. Zkuste to za hodinu.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limiting for token refresh to prevent abuse
const sensitiveLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 refresh attempts per hour per user
    message: { error: 'Příliš mnoho pokusů o obnovení tokenu. Zkuste to za hodinu.' },
    keyGenerator: (req) => req.user?.id || req.ip, // Limit per user ID when authenticated
    standardHeaders: true,
    legacyHeaders: false,
    validate: false,
});

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const APP_URL = process.env.APP_URL || 'http://localhost:3001';
const DEV_AUTO_LOGIN_AFTER_REGISTER = !IS_PRODUCTION && process.env.DEV_AUTO_LOGIN_AFTER_REGISTER !== 'false';

const logDebug = (msg) => {
    if (IS_PRODUCTION) return; // Skip debug logging in production
    console.log(`[DEBUG] ${msg}`);
};

async function ensureUserRecordFromAuth(authUser) {
    const { data: users, error: dbError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id);

    let user = Array.isArray(users) && users.length > 0 ? users[0] : null;

    if (dbError) {
        logDebug(`DB Error fetching user during register repair: ${JSON.stringify(dbError)}`);
    }

    if (!user) {
        const { error: insertError } = await supabase
            .from('users')
            .insert({
                id: authUser.id,
                email: authUser.email,
                role: 'user',
                first_name: authUser.user_metadata?.first_name || null,
                birth_date: authUser.user_metadata?.birth_date || null,
                birth_time: authUser.user_metadata?.birth_time || null,
                birth_place: authUser.user_metadata?.birth_place || null
            });

        if (insertError) {
            throw insertError;
        }

        const { data: retryUser, error: retryError } = await supabase
            .from('users')
            .select('*')
            .eq('id', authUser.id)
            .single();

        if (retryError || !retryUser) {
            throw retryError || new Error('User sync failed after register repair.');
        }

        user = retryUser;
    }

    const { data: existingSubscription, error: subError } = await supabase
        .from('subscriptions')
        .select('plan_type, status, credits, current_period_end')
        .eq('user_id', authUser.id)
        .single();

    let subscription = existingSubscription;

    if (subError && subError.code !== 'PGRST116') {
        throw subError;
    }

    if (!subscription) {
        const { data: createdSubscription, error: createSubError } = await supabase
            .from('subscriptions')
            .insert({ user_id: authUser.id, plan_type: 'free' })
            .select('plan_type, status, credits, current_period_end')
            .single();

        if (createSubError && createSubError.code !== '23505') {
            throw createSubError;
        }

        subscription = createdSubscription || {
            plan_type: 'free',
            status: null,
            credits: null,
            current_period_end: null
        };
    }

    user.subscriptions = subscription;
    return user;
}


// Premium activation removed - use Stripe payment flow instead
router.post('/activate-premium', (req, res) => {
    res.status(410).json({ error: 'Tento endpoint byl odstraněn. Použijte platební systém.' });
});

// Register (Supabase Auth)
router.post('/register', authLimiter, async (req, res) => {
    const { email, password, confirm_password, first_name, birth_date, birth_time, birth_place } = req.body;
    const clientIp = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'] || 'unknown';

    try {
        // Validate input using centralized validators
        const validatedEmail = validateEmail(email);
        const validatedPassword = validatePassword(password);

        // Server-side password confirmation check
        if (confirm_password !== undefined && password !== confirm_password) {
            return res.status(400).json({ error: 'Hesla se neshodují.' });
        }

        const validatedFirstName = first_name ? validateName(first_name) : 'User';

        // Birth date is optional during signup to reduce registration friction.
        const validatedBirthDate = birth_date ? validateBirthDate(birth_date) : null;

        // 1. Sign Up via Supabase Auth
        // This triggers the confirmation email automatically.
        const { data, error } = await supabase.auth.signUp({
            email: validatedEmail,
            password: validatedPassword,
            options: {
                // Use APP_URL from environment for production flexibility
                emailRedirectTo: APP_URL,
                data: {
                    first_name: validatedFirstName,
                    birth_date: validatedBirthDate,
                    birth_time: birth_time ? birth_time.substring(0, 5) : null, // HH:MM format
                    birth_place: birth_place ? birth_place.substring(0, 100) : null
                }
            }
        });

        if (error) {
            console.error('Supabase Auth Error:', error);
            // Return generic error to prevent user enumeration
            if (error.message.includes('already registered') || error.message.includes('User already registered')) {
                return res.status(400).json({ error: 'Registrace se nezdařila. Zkontrolujte email a heslo.' });
            }
            if (error.code === 'weak_password') {
                return res.status(400).json({ error: 'Heslo musí mít alespoň 8 znaků.' });
            }
            if (error.status === 400 || error.code === 400) {
                return res.status(400).json({ error: 'Registrace se nezdařila. Zkontrolujte email a heslo.' });
            }
            throw error;
        }

        if (DEV_AUTO_LOGIN_AFTER_REGISTER && data?.user?.id) {
            const user = await ensureUserRecordFromAuth(data.user);
            const token = await generateToken(user.id);
            const status = user.subscriptions?.plan_type || 'free';

            res.cookie('auth_token', token, COOKIE_OPTIONS);
            res.cookie('logged_in', '1', INDICATOR_COOKIE_OPTIONS);

            await recordSuccessfulLogin(user.email, clientIp, userAgent);

            return res.json({
                success: true,
                devAutoLogin: true,
                message: 'Registrace uspela. V lokalnim vyvoji jste byli rovnou prihlaseni.',
                user: {
                    id: user.id,
                    email: user.email,
                    subscription_status: status,
                    first_name: user.first_name,
                    birth_date: user.birth_date,
                    birth_time: user.birth_time,
                    birth_place: user.birth_place,
                    avatar: user.avatar || null
                }
            });
        }

        // 2. Success - Tell user to check email
        // We DO NOT return a token here anymore. Login is blocked until verification.
        res.json({
            success: true,
            message: 'Registrace \u00fasp\u011b\u0161n\u00e1. Zkontrolujte pros\u00edm sv\u016fj email pro potvrzen\u00ed \u00fa\u010dtu.',
            requireEmailVerification: true
        });

    } catch (e) {
        // Return validation errors as 400, everything else as 500
        if (e.message && (e.message.includes('must') || e.message.includes('Invalid') || e.message.includes('required') || e.message.includes('too') || e.message.includes('cannot') || e.message.includes('after'))) {
            return res.status(400).json({ error: e.message });
        }
        console.error('Register Error:', e);
        res.status(500).json({ error: 'Chyba při registraci. Zkuste to prosím později.' });
    }
});

// Login (Supabase Auth)
router.post('/login', authLimiter, async (req, res) => {
    const { email, password } = req.body;
    const clientIp = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'] || 'unknown';

    try {
        // Validate input
        const validatedEmail = validateEmail(email);
        const validatedPassword = validatePassword(password);

        // Check account lockout before attempting login
        const lockoutStatus = await checkAccountLockout(validatedEmail);
        if (lockoutStatus.isLocked) {
            return res.status(429).json({
                error: `Účet je dočasně uzamčen. Zkuste to prosím za ${lockoutStatus.minutesRemaining} minut.`,
                lockedUntil: lockoutStatus.lockedUntil,
                retryAfter: lockoutStatus.minutesRemaining * 60
            });
        }

        // 1. Sign In via Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: validatedEmail,
            password: validatedPassword,
        });

        if (authError) {
            console.error('Auth Error:', authError);
            // Record failed attempt
            const lockoutRes = await recordFailedAttempt(validatedEmail, clientIp, userAgent, 'invalid_password');
            if (lockoutRes.isLocked) {
                return res.status(429).json({
                    error: `Příliš mnoho neúspěšných pokusů. Účet je uzamčen na ${LOCKOUT_DURATION_MINUTES} minut.`,
                    remainingAttempts: 0,
                    lockedUntil: new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000)
                });
            }
            return res.status(400).json({
                error: 'Nesprávné přihlášení nebo neověřený email.',
                remainingAttempts: lockoutRes.remainingAttempts
            });
        }

        const authUser = authData.user;
        logDebug(`Login attempt for: ${authUser.email} (ID: ${authUser.id})`);

        // 2. Fetch our internal user data
        const { data: users, error: dbError } = await supabase
            .from('users')
            .select('*')
            .eq('id', authUser.id);

        let user = null;
        if (users && users.length > 0) {
            user = users[0];
            // Fetch subs separately to be safe
            const { data: sub } = await supabase
                .from('subscriptions')
                .select('plan_type, status, credits, current_period_end')
                .eq('user_id', user.id)
                .single();
            if (sub) user.subscriptions = sub;
        }

        if (dbError) {
            logDebug(`DB Error fetching user: ${JSON.stringify(dbError)}`);
        }
        if (!user) {
            logDebug(`User not found in public.users (Rows returned: ${users ? users.length : 0})`);
        } else {
            logDebug(`User found: ${user.id}.`);
        }

        if (dbError || !user) {
            logDebug(`User missing/error. Attempting JIT repair...`);

            // JIT REPAIR: Manually insert the user
            const { error: insertError } = await supabase
                .from('users')
                .insert({
                    id: authUser.id,
                    email: authUser.email,
                    role: 'user',
                    first_name: authUser.user_metadata?.first_name || null,
                    birth_date: authUser.user_metadata?.birth_date || null,
                    birth_time: authUser.user_metadata?.birth_time || null,
                    birth_place: authUser.user_metadata?.birth_place || null
                });

            if (insertError) {
                logDebug(`JIT Repair failed: ${JSON.stringify(insertError)}`);
                // NOW we fail
                return res.status(400).json({ error: 'Uživatel nenalezen v databázi. Kontaktujte podporu.' });
            }

            // Retry fetching
            const { data: retryUser, error: retryError } = await supabase
                .from('users')
                .select('*')
                .eq('id', authUser.id)
                .single();

            if (retryUser) {
                logDebug(`JIT Repair successful.`);
                user = retryUser;
                // Create default subscription
                await supabase
                    .from('subscriptions')
                    .insert({ user_id: user.id, plan_type: 'free' });
            } else {
                return res.status(500).json({ error: 'User sync failed after repair.' });
            }
        }

        // 3. Issue our JWT (Bridge) with cached premium status
        const sub = (Array.isArray(user.subscriptions) ? user.subscriptions[0] : user.subscriptions) || {};
        const status = sub.plan_type || 'free';

        // Check if premium (and not expired)
        const isPremium = status && PREMIUM_PLAN_TYPES.includes(status) &&
                         ['active', 'trialing', 'cancel_pending'].includes(sub.status) &&
                         new Date(sub.current_period_end) > new Date();

        const token = jwt.sign({
            id: user.id,
            email: user.email,
            subscription_status: status,
            isPremium: isPremium,
            premiumExpires: sub.current_period_end || null
        }, JWT_SECRET, { expiresIn: JWT_EXPIRY });

        // Set HttpOnly cookies with JWT
        res.cookie('auth_token', token, COOKIE_OPTIONS);
        res.cookie('logged_in', '1', INDICATOR_COOKIE_OPTIONS);

        // Record successful login (clears failed attempts)
        await recordSuccessfulLogin(user.email, clientIp, userAgent);

        res.json({
            user: {
                id: user.id,
                email: user.email,
                subscription_status: status,
                first_name: user.first_name,
                birth_date: user.birth_date,
                birth_time: user.birth_time,
                birth_place: user.birth_place,
                avatar: user.avatar || null
            }
        });

    } catch (e) {
        // Return validation errors as 400, everything else as 500
        if (e.message && (e.message.includes('must') || e.message.includes('Invalid') || e.message.includes('required') || e.message.includes('too') || e.message.includes('cannot') || e.message.includes('after'))) {
            return res.status(400).json({ error: e.message });
        }
        console.error('Login Error:', e);
        res.status(500).json({ error: 'Server error during login' });
    }
});

// Refresh Token - Get new JWT token before expiration
router.post('/refresh-token', authenticateToken, sensitiveLimiter, async (req, res) => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        // Generate new token with updated subscription info
        const newToken = await generateToken(userId);

        // Verify fresh token to get updated claims
        let decoded;
        try {
            decoded = jwt.verify(newToken, JWT_SECRET);
        } catch (verifyErr) {
            console.error('[AUTH] Failed to verify refreshed token:', verifyErr.message);
            return res.status(500).json({ error: 'Token verification failed' });
        }

        // Fetch fresh user data
        const { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        // Set refreshed cookies
        res.cookie('auth_token', newToken, COOKIE_OPTIONS);
        res.cookie('logged_in', '1', INDICATOR_COOKIE_OPTIONS);

        res.json({
            user: {
                id: userId,
                email: decoded?.email || profile?.email,
                subscription_status: decoded?.subscription_status || 'free',
                first_name: profile?.first_name,
                birth_date: profile?.birth_date,
                birth_time: profile?.birth_time,
                birth_place: profile?.birth_place,
                avatar: profile?.avatar || null
            }
        });
    } catch (e) {
        console.error('Token Refresh Error:', e);
        res.status(500).json({ error: 'Failed to refresh token' });
    }
});

// Logout - Blacklist current token and clear cookies
router.post('/logout', authenticateToken, async (req, res) => {
    try {
        // Get token from cookie or header for blacklisting
        const token = req.cookies?.auth_token || (req.headers['authorization'] && req.headers['authorization'].split(' ')[1]);

        // Blacklist the token to prevent reuse
        if (token) {
            await blacklistToken(token);
        }

        // Clear auth cookies (bez maxAge — jinak Node.js varuje "expires immediately")
        res.clearCookie('auth_token', CLEAR_COOKIE_OPTIONS);
        res.clearCookie('logged_in', CLEAR_INDICATOR_COOKIE_OPTIONS);

        res.json({ success: true, message: 'Odhlášení úspěšné.' });
    } catch (e) {
        console.error('Logout Error:', e);
        res.status(500).json({ error: 'Nepodařilo se odhlásit.' });
    }
});

// Forgot Password - sends reset email via Supabase
router.post('/forgot-password', authLimiter, async (req, res) => {
    const { email } = req.body;

    try {
        // Validate email
        const validatedEmail = validateEmail(email);

        const { error } = await supabase.auth.resetPasswordForEmail(validatedEmail, {
            redirectTo: `${APP_URL}/prihlaseni.html?reset=true`
        });

        if (error) {
            console.error('Password reset error:', error);
        }

        // Always return success to prevent email enumeration
        res.json({
            success: true,
            message: 'Pokud účet existuje, odeslali jsme email s odkazem pro obnovení hesla.'
        });
    } catch (e) {
        console.error('Forgot Password Error:', e);
        res.json({
            success: true,
            message: 'Pokud účet existuje, odeslali jsme email s odkazem pro obnovení hesla.'
        });
    }
});

// Reset Password - update password with reset token
router.post('/reset-password', async (req, res) => {
    const { password } = req.body;
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Chybí autorizační token.' });
    }

    try {
        // Validate password
        const validatedPassword = validatePassword(password);

        // Update password using Supabase Auth
        const { data, error } = await supabase.auth.updateUser(
            { password: validatedPassword },
            { accessToken: token }
        );

        if (error) {
            console.error('Reset password error:', error);
            return res.status(400).json({ error: 'Nepodařilo se obnovit heslo. Odkaz může být neplatný nebo vypršel.' });
        }

        res.json({
            success: true,
            message: 'Heslo bylo úspěšně změněno.'
        });
    } catch (e) {
        console.error('Reset Password Error:', e);
        res.status(500).json({ error: 'Chyba při obnově hesla.' });
    }
});

// Get User Profile
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const user = req.user;

        const { data, error } = await supabase
            .from('users')
            .select(`
                *,
                subscriptions (
                    plan_type,
                    status,
                    credits,
                    current_period_end
                )
            `)
            .eq('id', user.id)
            .single();

        if (error) throw error;

        // Flatten subscription status for frontend consistency
        const sub = (data.subscriptions && data.subscriptions.length > 0) ? data.subscriptions[0] : (data.subscriptions || {});
        const userProfile = {
            ...data,
            subscription_status: sub.plan_type || 'free',
            current_period_end: sub.current_period_end
        };

        res.json({ success: true, user: userProfile });

    } catch (e) {
        console.error('Get Profile Error:', e);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

// Update User Profile
router.put('/profile', authenticateToken, async (req, res) => {
    try {
        const user = req.user;

        const { first_name, birth_date, birth_time, birth_place, avatar } = req.body;

        // Validate optional fields if provided
        const updateData = {};

        if (first_name !== undefined && first_name !== null) {
            updateData.first_name = validateName(first_name);
        }

        if (birth_date !== undefined && birth_date !== null) {
            updateData.birth_date = validateBirthDate(birth_date);
        }

        if (birth_time !== undefined && birth_time !== null) {
            // Basic format check for HH:MM
            if (!/^\d{2}:\d{2}$/.test(birth_time)) {
                throw new Error('Birth time must be in HH:MM format');
            }
            updateData.birth_time = birth_time;
        }

        if (birth_place !== undefined && birth_place !== null) {
            // Sanitize HTML characters and limit length
            updateData.birth_place = String(birth_place).replace(/[<>{}[\]]/g, '').substring(0, 100);
        }

        // Only update avatar if explicitly provided (basic length check)
        if (avatar !== undefined && avatar !== null) {
            if (avatar.length > 50000) { // 50KB limit for avatar URL
                throw new Error('Avatar is too large');
            }
            updateData.avatar = avatar;
        }

        const { data, error } = await supabase
            .from('users')
            .update(updateData)
            .eq('id', user.id)
            .select()
            .single();

        if (error) throw error;

        res.json({ success: true, user: data });

    } catch (e) {
        // Check if it's a validation error (thrown by our validators)
        if (e.message && (e.message.includes('must') || e.message.includes('Invalid') || e.message.includes('too') || e.message.includes('required'))) {
            return res.status(400).json({ error: e.message });
        }
        console.error('Update Profile Error:', e);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// Complete onboarding - Mark user as onboarded
router.post('/onboarding/complete', authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const { data, error } = await supabase
            .from('users')
            .update({
                is_onboarded: true,
                onboarded_at: new Date().toISOString()
            })
            .eq('id', userId)
            .select()
            .single();

        if (error) throw error;

        res.json({
            success: true,
            message: 'Onboarding completed',
            user: data
        });
    } catch (e) {
        console.error('Onboarding Complete Error:', e);
        res.status(500).json({ error: 'Nepodařilo se dokončit onboarding.' });
    }
});


// User readings endpoints consolidated in index.js (using authenticateToken middleware)

export default router;
