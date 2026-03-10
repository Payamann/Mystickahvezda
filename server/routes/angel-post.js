/**
 * angel-post.js — Andělská pošta API route
 * GET  /api/angel-post        — načíst schválené vzkazy
 * POST /api/angel-post        — odeslat nový vzkaz
 * POST /api/angel-post/:id/like — přidat srdíčko
 */
import express from 'express';
import { supabase } from '../db-supabase.js';
import rateLimit from 'express-rate-limit';
import xss from 'xss';

const router = express.Router();

// Limit: max 1 vzkaz za den(24h) na IP
const postLimiter = rateLimit({
    windowMs: 24 * 60 * 60 * 1000, // 24 hodin v ms
    max: 1, // Pouze 1 request povoleno
    message: { error: 'Dnes jste již andělům psali. Zkuste to prosím zase zítra.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Jednoduchý spam filtr
function isSpam(text) {
    if (!text || text.length < 10) return true;
    if (text.length > 500) return true;
    const urlCount = (text.match(/https?:\/\//g) || []).length;
    if (urlCount > 1) return true;
    const spamWords = ['viagra', 'casino', 'bitcoin', 'crypto', 'click here', 'buy now'];
    const lower = text.toLowerCase();
    return spamWords.some(w => lower.includes(w));
}

// GET /api/angel-post — načíst vzkazy (schválené)
router.get('/', async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 20, 50);
        const offset = parseInt(req.query.offset) || 0;

        const { data, error } = await supabase
            .from('angel_messages')
            .select('id, nickname, message, category, likes, created_at')
            .eq('approved', true)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        console.error('[angel-post] GET error:', err.message);
        res.json([]); // Graceful fallback — client shows demo data
    }
});

// POST /api/angel-post — odeslat vzkaz
router.post('/', postLimiter, async (req, res) => {
    try {
        const { nickname, message, category } = req.body;

        if (isSpam(message)) {
            return res.status(400).json({ error: 'Zpráva nevyhovuje podmínkám.' });
        }

        // Sanitize using XSS library (removes all HTML/script tags)
        const cleanNickname = xss((nickname || 'Anonym'), {
            whiteList: {}, // No HTML tags allowed
            stripIgnoredTag: true,
        }).substring(0, 30);

        const cleanMessage = xss(message, {
            whiteList: {}, // No HTML tags allowed
            stripIgnoredTag: true,
        }).substring(0, 500);

        const validCategories = ['laska', 'zdravi', 'kariera', 'rodina', 'dek', 'jine'];
        const cleanCategory = validCategories.includes(category) ? category : 'jine';

        const { data, error } = await supabase
            .from('angel_messages')
            .insert({
                nickname: cleanNickname,
                message: cleanMessage,
                category: cleanCategory,
                likes: 0,
                approved: true, // Auto-approve (lze změnit na false pro moderaci)
                created_at: new Date().toISOString()
            })
            .select('id')
            .single();

        if (error) throw error;
        res.json({ success: true, id: data.id });
    } catch (err) {
        console.error('[angel-post] POST error:', err.message);
        res.status(500).json({ error: 'Nelze uložit zprávu.' });
    }
});

// POST /api/angel-post/:id/like — přidat srdíčko
router.post('/:id/like', async (req, res) => {
    try {
        const { id } = req.params;
        if (!id || isNaN(parseInt(id))) return res.status(400).json({ error: 'Invalid ID' });

        const { error } = await supabase.rpc('increment_angel_likes', { msg_id: parseInt(id) });

        if (error) {
            // Fallback: manual increment if RPC not available
            const { data } = await supabase.from('angel_messages').select('likes').eq('id', id).single();
            if (data) {
                await supabase.from('angel_messages').update({ likes: (data.likes || 0) + 1 }).eq('id', id);
            }
        }

        res.json({ success: true });
    } catch (err) {
        console.error('[angel-post] LIKE error:', err.message);
        res.json({ success: true }); // Silent fail — like is non-critical
    }
});

export default router;
