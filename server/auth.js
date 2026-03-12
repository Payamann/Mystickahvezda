import express from 'express';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { supabase } from './db-supabase.js';
import { JWT_SECRET } from './config/jwt.js';
import { authenticateToken } from './middleware.js';
import { validateEmail, validatePassword, validateName, validateBirthDate } from './utils/validation.js';
import { PREMIUM_PLAN_TYPES } from './config/constants.js';

const router = express.Router();

// ============================================
// Helper: Generate JWT Token
// ============================================
async function generateToken(userId) {
    try {
        // Fetch latest subscription info
        const { data: sub } = await supabase
            .from('subscriptions')
            .select('plan_type, status, current_period_end')
            .eq('user_id', userId)
            .single();

        const status = sub?.plan_type;
        const isPremium = status && PREMIUM_PLAN_TYPES.includes(status) &&
                         sub.status === 'active' &&
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
        }, JWT_SECRET, { expiresIn: '30d' });

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
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const APP_URL = process.env.APP_URL || 'http://localhost:3001';

const logDebug = (msg) => {
    if (IS_PRODUCTION) return; // Skip debug logging in production
    // fs.appendFileSync('debug.log', `[${time}] ${msg}\n`); // Removed to prevent lock issues
    console.log(`[DEBUG] ${msg}`);
};


// Premium activation removed - use Stripe payment flow instead
router.post('/activate-premium', (req, res) => {
    res.status(410).json({ error: 'Tento endpoint byl odstraněn. Použijte platební systém.' });
});

// Register (Supabase Auth)
router.post('/register', authLimiter, async (req, res) => {
    const { email, password, first_name, birth_date, birth_time, birth_place } = req.body;

    try {
        // Validate input using centralized validators
        const validatedEmail = validateEmail(email);
        const validatedPassword = validatePassword(password);
        const validatedFirstName = first_name ? validateName(first_name) : 'User';

        // Birth date is optional, but validate if provided
        let validatedBirthDate = null;
        if (birth_date) {
            validatedBirthDate = validateBirthDate(birth_date);
        }

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

        // 2. Success - Tell user to check email
        // We DO NOT return a token here anymore. Login is blocked until verification.
        res.json({
            success: true,
            message: 'Registrace úspěšná. Zkontrolujte prosím svůj email pro potvrzení účtu.',
            requireEmailVerification: true
        });

    } catch (e) {
        // Return validation errors as 400, everything else as 500
        if (e.message && (e.message.includes('must') || e.message.includes('Invalid') || e.message.includes('required') || e.message.includes('too'))) {
            return res.status(400).json({ error: e.message });
        }
        console.error('Register Error:', e);
        res.status(500).json({ error: 'Chyba při registraci. Zkuste to prosím později.' });
    }
});

// Login (Supabase Auth)
router.post('/login', authLimiter, async (req, res) => {
    const { email, password } = req.body;

    try {
        // Validate input
        const validatedEmail = validateEmail(email);
        const validatedPassword = validatePassword(password);

        // 1. Sign In via Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: validatedEmail,
            password: validatedPassword,
        });

        if (authError) {
            console.error('Auth Error:', authError);
            return res.status(400).json({ error: 'Nesprávné přihlášení nebo neověřený email.' });
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
                         sub.status === 'active' &&
                         new Date(sub.current_period_end) > new Date();

        const token = jwt.sign({
            id: user.id,
            email: user.email,
            subscription_status: status,
            isPremium: isPremium,
            premiumExpires: sub.current_period_end || null
        }, JWT_SECRET, { expiresIn: '30d' });

        res.json({
            token,
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
        console.error('Login Error:', e);
        res.status(500).json({ error: 'Server error during login' });
    }
});

// Refresh Token - Get new JWT token before expiration
router.post('/refresh-token', authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        // Generate new token with updated subscription info
        const newToken = await generateToken(userId);

        // Decode fresh token to get updated claims
        const decoded = jwt.decode(newToken);

        // Fetch fresh user data
        const { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        res.json({
            token: newToken,
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

// User readings endpoints consolidated in index.js (using authenticateToken middleware)

export default router;
