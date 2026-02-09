import express from 'express';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { supabase } from './db-supabase.js';

const router = express.Router();
import fs from 'fs';

// Strict rate limiting on auth endpoints to prevent brute force / credential stuffing
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 attempts per window
    message: { error: 'Příliš mnoho pokusů. Zkuste to za 15 minut.' },
    standardHeaders: true,
    legacyHeaders: false,
});
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Security: Enforce strong secret in production
let JWT_SECRET = process.env.JWT_SECRET;
if (IS_PRODUCTION && !JWT_SECRET) {
    console.error('❌ FATAL ERROR: JWT_SECRET is missing in production environment!');
    process.exit(1); // Fail secure
}
if (!JWT_SECRET) {
    console.warn('⚠️ WARNING: JWT_SECRET is missing in environment variables!');
    if (IS_PRODUCTION) {
        console.error('❌ FATAL ERROR: JWT_SECRET is required in production!');
        process.exit(1);
    } else {
        console.warn('⚠️ Development mode: Using temporary insecure secret. DO NOT USE IN PRODUCTION.');
        JWT_SECRET = 'dev-insecure-secret-placeholder';
    }
}
const APP_URL = process.env.APP_URL || 'http://localhost:3001';

const logDebug = (msg) => {
    if (IS_PRODUCTION) return; // Skip debug logging in production
    // fs.appendFileSync('debug.log', `[${time}] ${msg}\n`); // Removed to prevent lock issues
    console.log(`[DEBUG] ${msg}`);
};

// ... (register and login routes remain similar, just ensuring no changes there unless necessary) ...

// Premium activation removed - use Stripe payment flow instead
router.post('/activate-premium', (req, res) => {
    res.status(410).json({ error: 'Tento endpoint byl odstraněn. Použijte platební systém.' });
});

// Register (Supabase Auth)
router.post('/register', authLimiter, async (req, res) => {
    const { email, password, first_name, birth_date, birth_time, birth_place } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    if (password.length < 8) {
        return res.status(400).json({ error: 'Heslo musí mít alespoň 8 znaků.' });
    }

    try {
        // 1. Sign Up via Supabase Auth
        // This triggers the confirmation email automatically.
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                // Use APP_URL from environment for production flexibility
                emailRedirectTo: APP_URL,
                data: {
                    first_name,
                    birth_date,
                    birth_time,
                    birth_place
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
        console.error('Register Error:', e);
        res.status(500).json({ error: 'Chyba při registraci. Zkuste to prosím později.' });
    }
});

// Login (Supabase Auth)
router.post('/login', authLimiter, async (req, res) => {
    const { email, password } = req.body;

    try {
        // 1. Sign In via Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password,
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
                .select('plan_type, status, credits')
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

        // 3. Issue our JWT (Bridge)
        const sub = (Array.isArray(user.subscriptions) ? user.subscriptions[0] : user.subscriptions) || {};
        const status = sub.plan_type || 'free';

        const token = jwt.sign({
            id: user.id,
            email: user.email,
            subscription_status: status
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
                birth_place: user.birth_place
            }
        });

    } catch (e) {
        console.error('Login Error:', e);
        res.status(500).json({ error: 'Server error during login' });
    }
});

// Forgot Password - sends reset email via Supabase
router.post('/forgot-password', authLimiter, async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'Email je povinný.' });
    }

    try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
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

// Get User Profile
router.get('/profile', async (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    try {
        const user = jwt.verify(token, JWT_SECRET);

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
        if (e.name === 'JsonWebTokenError' || e.name === 'TokenExpiredError') {
            return res.sendStatus(403);
        }
        console.error('Get Profile Error:', e);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

// Update User Profile
router.put('/profile', async (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    try {
        // Verify token synchronously
        const user = jwt.verify(token, JWT_SECRET);

        const { first_name, birth_date, birth_time, birth_place } = req.body;

        const updateData = {
            first_name: first_name || null,
            birth_date: birth_date || null,
            birth_time: birth_time || null,
            birth_place: birth_place || null
        };

        const { data, error } = await supabase
            .from('users')
            .update(updateData)
            .eq('id', user.id)
            .select()
            .single();

        if (error) throw error;

        res.json({ success: true, user: data });

    } catch (e) {
        if (e.name === 'JsonWebTokenError' || e.name === 'TokenExpiredError') {
            return res.sendStatus(403);
        }
        console.error('Update Profile Error:', e);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// User readings endpoints consolidated in index.js (using authenticateToken middleware)

export default router;
