/**
 * User Readings Routes
 * CRUD for user reading history and profile operations
 * GET/POST/PATCH/DELETE /api/user/readings
 * PUT /api/user/password
 */
import express from 'express';
import { authenticateToken } from '../middleware.js';
import { generateToken } from '../auth.js';
import { supabase } from '../db-supabase.js';
import rateLimit from 'express-rate-limit';
import { validatePassword } from '../utils/validation.js';
import { blacklistToken, blacklistAllUserTokens } from '../utils/token-blacklist.js';
import { isProductionRuntime } from '../config/runtime.js';

export const router = express.Router();

const sensitiveOpLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10,
    message: { error: 'Příliš mnoho pokusů. Zkuste to prosím později.' },
    standardHeaders: true,
    legacyHeaders: false,
});

const VALID_READING_TYPES = new Set([
    'angel',
    'angel-card',
    'astrocartography',
    'crystal-ball',
    'daily-wisdom',
    'horoscope',
    'journal',
    'medicine-wheel',
    'natal',
    'natal-chart',
    'numerology',
    'oracle',
    'past-life',
    'runes',
    'synastry',
    'tarot'
]);
const MAX_READING_DATA_LENGTH = 50000;

function normalizeReadingData(readingData) {
    if (readingData === undefined || readingData === null) {
        throw new Error('Reading data is required.');
    }

    if (typeof readingData === 'string') {
        const trimmed = readingData.trim();
        if (!trimmed) throw new Error('Reading data is required.');
        if (trimmed.length > MAX_READING_DATA_LENGTH) throw new Error('Reading data is too large.');
        return trimmed;
    }

    if (typeof readingData !== 'object' || Array.isArray(readingData)) {
        throw new Error('Reading data must be an object or string.');
    }

    const serialized = JSON.stringify(readingData);
    if (!serialized || serialized.length > MAX_READING_DATA_LENGTH) {
        throw new Error('Reading data is too large.');
    }

    return readingData;
}

// Get user's reading history (with pagination)
router.get('/readings', authenticateToken, async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
        const offset = (page - 1) * limit;

        const { count, error: countError } = await supabase
            .from('readings')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', req.user.id);

        if (countError) throw countError;

        const { data, error } = await supabase
            .from('readings')
            .select('*')
            .eq('user_id', req.user.id)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) throw error;

        res.json({
            success: true,
            readings: data || [],
            pagination: {
                page,
                limit,
                total: count || 0,
                totalPages: Math.ceil((count || 0) / limit)
            }
        });
    } catch (error) {
        console.error('Get Readings Error:', error);
        res.status(500).json({ success: false, error: 'Nepodařilo se načíst historii.' });
    }
});

// Save a new reading
router.post('/readings', authenticateToken, async (req, res) => {
    try {
        const { type, data: readingData } = req.body;
        const cleanType = typeof type === 'string' ? type.trim() : '';

        if (!cleanType || readingData === undefined || readingData === null) {
            return res.status(400).json({ error: 'Type and data are required.' });
        }

        // Validate type against allowlist
        if (!VALID_READING_TYPES.has(cleanType)) {
            return res.status(400).json({ error: 'Invalid reading type.' });
        }

        let validatedData;
        try {
            validatedData = normalizeReadingData(readingData);
        } catch (validationError) {
            return res.status(400).json({ error: validationError.message });
        }

        const { data, error } = await supabase
            .from('readings')
            .insert({ user_id: req.user.id, type: cleanType, data: validatedData })
            .select()
            .single();

        if (error) throw error;
        res.json({ success: true, reading: data, id: data.id });
    } catch (error) {
        console.error('Save Reading Error:', error);
        res.status(500).json({ success: false, error: 'Nepodařilo se uložit výklad.' });
    }
});

// Get single reading by ID
router.get('/readings/:id', authenticateToken, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('readings')
            .select('*')
            .eq('id', req.params.id)
            .eq('user_id', req.user.id)
            .single();

        if (error) throw error;
        if (!data) return res.status(404).json({ success: false, error: 'Výklad nenalezen.' });

        res.json({ success: true, reading: data });
    } catch (error) {
        console.error('Get Reading Error:', error);
        res.status(500).json({ success: false, error: 'Nepodařilo se načíst výklad.' });
    }
});

// Toggle reading favorite status
router.patch('/readings/:id/favorite', authenticateToken, async (req, res) => {
    try {
        const { data: current, error: fetchError } = await supabase
            .from('readings')
            .select('is_favorite')
            .eq('id', req.params.id)
            .eq('user_id', req.user.id)
            .single();

        if (fetchError) throw fetchError;
        if (!current) return res.status(404).json({ success: false, error: 'Výklad nenalezen.' });

        const { data, error } = await supabase
            .from('readings')
            .update({ is_favorite: !current.is_favorite })
            .eq('id', req.params.id)
            .eq('user_id', req.user.id)
            .select()
            .single();

        if (error) throw error;
        res.json({ success: true, is_favorite: data.is_favorite });
    } catch (error) {
        console.error('Toggle Favorite Error:', error);
        res.status(500).json({ success: false, error: 'Nepodařilo se změnit oblíbené.' });
    }
});

// Delete a reading
router.delete('/readings/:id', authenticateToken, async (req, res) => {
    try {
        const { error } = await supabase
            .from('readings')
            .delete()
            .eq('id', req.params.id)
            .eq('user_id', req.user.id);

        if (error) throw error;
        res.json({ success: true });
    } catch (error) {
        console.error('Delete Reading Error:', error);
        res.status(500).json({ success: false, error: 'Nepodařilo se smazat výklad.' });
    }
});

// Change user password
router.put('/password', sensitiveOpLimiter, authenticateToken, async (req, res) => {
    try {
        const { currentPassword, password, password_confirm } = req.body;

        // Validate currentPassword is provided
        if (!currentPassword || typeof currentPassword !== 'string') {
            return res.status(400).json({ success: false, error: 'Zadejte prosím aktuální heslo.' });
        }

        // Validate password confirmation
        if (!password_confirm || typeof password_confirm !== 'string') {
            return res.status(400).json({ success: false, error: 'Heslo potvrzení je povinné.' });
        }
        if (password !== password_confirm) {
            return res.status(400).json({ success: false, error: 'Hesla se neshodují.' });
        }

        // Validate new password
        let validatedPassword;
        try {
            validatedPassword = validatePassword(password);
        } catch (validationError) {
            return res.status(400).json({ success: false, error: validationError.message });
        }

        const { error: authError } = await supabase.auth.signInWithPassword({
            email: req.user.email,
            password: currentPassword
        });

        if (authError) {
            return res.status(403).json({ success: false, error: 'Aktuální heslo je nesprávné.' });
        }

        const { error } = await supabase.auth.admin.updateUserById(req.user.id, { password: validatedPassword });
        if (error) throw error;

        // Blacklist all existing tokens for this user (force re-authentication on all devices)
        await blacklistAllUserTokens(req.user.id);

        // Clear auth cookie on this device as well
        res.clearCookie('auth_token', {
            httpOnly: true,
            secure: isProductionRuntime(),
            sameSite: 'strict',
            path: '/'
        });

        res.json({
            success: true,
            message: 'Heslo bylo úspěšně změněno. Prosím přihlaste se znovu.',
            requireReLogin: true
        });
    } catch (error) {
        console.error('Password Change Error:', error);
        res.status(500).json({ success: false, error: 'Nepodařilo se změnit heslo.' });
    }
});

export default router;
