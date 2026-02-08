import jwt from 'jsonwebtoken';
import { supabase } from './db-supabase.js';
import { JWT_SECRET } from './config/jwt.js';

/**
 * Standard JWT authentication middleware
 * Verifies token and attaches user to req.user
 */
export const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.sendStatus(401);
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

/**
 * HARD Premium Gate - Blocks access completely
 * Returns 402 Payment Required if not premium
 */
export const requirePremium = async (req, res, next) => {
    const userId = req.user?.id;

    if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        const { data: subscription } = await supabase
            .from('subscriptions')
            .select('plan_type, status, current_period_end')
            .eq('user_id', userId)
            .single();

        if (!subscription) {
            return res.status(402).json({
                error: 'Premium subscription required',
                code: 'PREMIUM_REQUIRED'
            });
        }

        const isActive = subscription.status === 'active';
        const notExpired = new Date(subscription.current_period_end) > new Date();
        const isPremium = ['premium_monthly', 'exclusive_monthly', 'vip'].includes(subscription.plan_type);

        if (!isActive || !notExpired || !isPremium) {
            return res.status(402).json({
                error: 'Active premium subscription required',
                code: 'PREMIUM_REQUIRED',
                currentPlan: subscription.plan_type
            });
        }

        req.subscription = subscription;
        next();
    } catch (error) {
        console.error('Premium check error:', error);
        res.status(500).json({ error: 'Failed to verify subscription' });
    }
};

/**
 * SOFT Premium Gate - Returns partial data for free users
 * Allows request to proceed but marks as limited
 */
export const requirePremiumSoft = async (req, res, next) => {
    const userId = req.user?.id;

    if (!userId) {
        req.isPremium = false;
        req.isLimited = true;
        return next();
    }

    try {
        const { data: subscription } = await supabase
            .from('subscriptions')
            .select('plan_type, status, current_period_end, credits')
            .eq('user_id', userId)
            .single();

        if (!subscription) {
            req.isPremium = false;
            req.isLimited = true;
            return next();
        }

        const isActive = subscription.status === 'active';
        const notExpired = new Date(subscription.current_period_end) > new Date();
        const isPremium = ['premium_monthly', 'exclusive_monthly', 'vip'].includes(subscription.plan_type);

        req.isPremium = isActive && notExpired && isPremium;
        req.isLimited = !req.isPremium;
        req.subscription = subscription;

        next();
    } catch (error) {
        console.error('Premium soft check error:', error);
        req.isPremium = false;
        req.isLimited = true;
        next();
    }
};

/**
 * Admin Gate - Allows only users whose email is in ADMIN_EMAILS env var
 */
const ADMIN_EMAILS_RAW = process.env.ADMIN_EMAILS || '';
const ADMIN_EMAILS = ADMIN_EMAILS_RAW.split(',').map(e => e.trim()).filter(Boolean);

if (ADMIN_EMAILS.length === 0) {
    console.warn('⚠️ No admin emails configured (set ADMIN_EMAILS env var)');
}

export const requireAdmin = (req, res, next) => {
    const userId = req.user?.id;
    const email = req.user?.email;

    if (!userId || !email || !ADMIN_EMAILS.includes(email)) {
        console.warn(`Unauthorized Admin Access Attempt: ${email} (${userId})`);
        return res.status(403).json({ error: 'Access Denied: Admin privileges required.' });
    }

    next();
};
