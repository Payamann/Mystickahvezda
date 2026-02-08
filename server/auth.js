import express from 'express';
import jwt from 'jsonwebtoken';
import { supabase } from './db-supabase.js';
import { JWT_SECRET } from './config/secrets.js';

const router = express.Router();
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const APP_URL = process.env.APP_URL || 'http://localhost:3001';

const logDebug = (msg) => {
    if (IS_PRODUCTION) return;
    console.log(`[DEBUG] ${msg}`);
};

// Register (Supabase Auth)
router.post('/register', async (req, res) => {
    const { email, password, first_name, birth_date, birth_time, birth_place } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
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
            if (error.message.includes('already registered') || error.message.includes('User already registered')) {
                return res.status(400).json({ error: 'Uživatel s tímto emailem již existuje.' });
            }
            if (error.status === 400 || error.code === 400) {
                return res.status(400).json({ error: 'Chyba registrace: ' + error.message });
            }
            if (error.code === 'weak_password') {
                return res.status(400).json({ error: 'Heslo musí mít alespoň 6 znaků.' });
            }
            throw error;
        }

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
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
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

        // Fetch our internal user data
        const { data: users, error: dbError } = await supabase
            .from('users')
            .select('*')
            .eq('id', authUser.id);

        let user = null;
        if (users && users.length > 0) {
            user = users[0];
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
                return res.status(400).json({ error: 'Uživatel nenalezen v databázi. Kontaktujte podporu.' });
            }

            const { data: retryUser, error: retryError } = await supabase
                .from('users')
                .select('*')
                .eq('id', authUser.id)
                .single();

            if (retryUser) {
                logDebug(`JIT Repair successful.`);
                user = retryUser;
                await supabase
                    .from('subscriptions')
                    .insert({ user_id: user.id, plan_type: 'free' });
            } else {
                return res.status(500).json({ error: 'User sync failed after repair.' });
            }
        }

        // Issue our JWT
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

export default router;
