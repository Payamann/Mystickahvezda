/**
 * Push notification routes
 * POST /api/push/subscribe - save subscription
 */
import express from 'express';
import { supabase } from '../db-supabase.js';
import { authenticateToken, requireAdmin } from '../middleware.js';
import { JWT_SECRET } from '../config/jwt.js';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';

const router = express.Router();

const pushLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { success: false, error: 'Příliš mnoho pokusů.' }
});

function getPushUserId(req) {
    const auth = req.headers.authorization;
    const bearerToken = auth && auth.startsWith('Bearer ') ? auth.split(' ')[1] : null;
    const token = bearerToken || req.cookies?.auth_token;

    if (!token) return null;

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        return decoded.id || decoded.userId || null;
    } catch {
        return null;
    }
}

// POST /subscribe — save Web Push subscription
router.post('/subscribe', pushLimiter, async (req, res) => {
    const { subscription } = req.body;
    if (!subscription || !subscription.endpoint) {
        return res.status(400).json({ success: false, error: 'Neplatná subscription.' });
    }

    const userId = getPushUserId(req);

    try {
        await supabase.from('push_subscriptions').upsert({
            endpoint: subscription.endpoint,
            subscription_json: JSON.stringify(subscription),
            user_id: userId,
            created_at: new Date().toISOString()
        }, { onConflict: 'endpoint' });

        res.json({ success: true, message: 'Přihlášeno k Push notifikacím.' });
    } catch (err) {
        console.error('[Push] Subscribe error:', err);
        res.status(500).json({ success: false, error: 'Chyba serveru.' });
    }
});

// POST /unsubscribe — remove Web Push subscription
router.post('/unsubscribe', pushLimiter, async (req, res) => {
    const endpoint = String(req.body?.endpoint || req.body?.subscription?.endpoint || '').trim();

    if (!endpoint || endpoint.length > 2048) {
        return res.status(400).json({ success: false, error: 'Neplatný endpoint.' });
    }

    try {
        await supabase
            .from('push_subscriptions')
            .delete()
            .eq('endpoint', endpoint);

        res.json({ success: true, message: 'Odběr push notifikací byl zrušen.' });
    } catch (err) {
        console.error('[Push] Unsubscribe error:', err);
        res.status(500).json({ success: false, error: 'Chyba serveru.' });
    }
});

// POST /send-test — send test notification to all subscribers (admin only)
router.post('/send-test', authenticateToken, requireAdmin, async (req, res) => {
    const { title = '🌙 Mystická Hvězda', body, url = '/' } = req.body;

    try {
        // Check if web-push is available
        let webpush;
        try {
            webpush = (await import('web-push')).default;
        } catch {
            return res.json({
                success: false,
                error: 'Balíček web-push není nainstalován. Spusťte: npm install web-push'
            });
        }

        if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
            return res.json({
                success: false,
                error: 'VAPID klíče nejsou nastaveny. Vygenerujte je pomocí: npx web-push generate-vapid-keys'
            });
        }

        webpush.setVapidDetails(
            'mailto:admin@mystickahvezda.cz',
            process.env.VAPID_PUBLIC_KEY,
            process.env.VAPID_PRIVATE_KEY
        );

        const { data: subs } = await supabase.from('push_subscriptions').select('subscription_json').limit(500);

        let sent = 0, failed = 0;
        for (const row of (subs || [])) {
            try {
                const sub = JSON.parse(row.subscription_json);
                await webpush.sendNotification(sub, JSON.stringify({ title, body, url }));
                sent++;
            } catch { failed++; }
        }

        res.json({ success: true, sent, failed });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

export default router;
