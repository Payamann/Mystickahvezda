import jwt from 'jsonwebtoken';
import { supabase } from './db-supabase.js';

// Security: Unified JWT secret handling - no hardcoded fallback
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
let JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    if (IS_PRODUCTION) {
        console.error('FATAL: JWT_SECRET is required in production!');
        process.exit(1);
    }
    console.warn('WARNING: JWT_SECRET missing. Using dev-only placeholder.');
    JWT_SECRET = 'dev-insecure-secret-placeholder';
}

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

    jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }, (err, user) => {
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
            req.credits = 0;
            return next();
        }

        const isActive = subscription.status === 'active';
        const notExpired = new Date(subscription.current_period_end) > new Date();
        const isPremium = ['premium_monthly', 'exclusive_monthly', 'vip'].includes(subscription.plan_type);

        req.isPremium = isActive && notExpired && isPremium;
        req.isLimited = !req.isPremium;
        req.credits = 0; // Deprecated
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
 * Feature-specific rate limiting for free tier
 * Checks credits or daily limits
 */
export const checkFeatureAccess = (featureName, creditsRequired = 1) => {
    return async (req, res, next) => {
        // Premium users bypass all limits
        if (req.isPremium) {
            return next();
        }

        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        try {
            const { data: subscription } = await supabase
                .from('subscriptions')
                .select('credits, plan_type')
                .eq('user_id', userId)
                .single();

            // Credits system removed - checkFeatureAccess is now a pass-through
            // or we could implement simple rate limiting here if needed.
            next();
        } catch (error) {
            console.error('Feature access check error:', error);
            res.status(500).json({ error: 'Failed to verify feature access' });
        }
    };
};

/**
 * Track paywall hits for analytics
 */
export const trackPaywallHit = async (userId, feature) => {
    try {
        // TODO: Send to analytics (Mixpanel, Amplitude, etc.)
        console.log(`[ANALYTICS] Paywall hit: user=${userId}, feature=${feature}`);

        // Optionally store in database for internal analytics
        // await supabase.from('analytics_events').insert({
        //     user_id: userId,
        //     event_type: 'paywall_hit',
        //     feature: feature,
        //     timestamp: new Date()
        // });
    } catch (error) {
        console.error('Track paywall error:', error);
    }
};

/**
 * Deduct credits after successful API call
 * Call this at the end of your endpoint
 */
// ... (existing code)

/**
 * Admin Gate - Allows only specific users
 */
export const requireAdmin = (req, res, next) => {
    const userId = req.user?.id;
    const email = req.user?.email;

    // Admin Emails (consider moving to database for production)
    const ADMIN_EMAILS = [
        'pavel.hajek1989@gmail.com'
    ];

    if (!userId || !email || !ADMIN_EMAILS.includes(email)) {
        console.warn(`Unauthorized Admin Access Attempt: ${email} (${userId})`);
        return res.status(403).json({ error: 'Access Denied: Admin privileges required.' });
    }

    next();
};

export const billCredits = async (req, res, next) => {
    // Credits system removed
    next();
};
