import jwt from 'jsonwebtoken';
import { supabase } from './db-supabase.js';
import { JWT_SECRET } from './config/jwt.js';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Centralized premium plan type list - used by both hard and soft gates
import { PREMIUM_PLAN_TYPES } from './config/constants.js';

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
 * Uses JWT-cached premium status (NO database query)
 */
export const requirePremium = (req, res, next) => {
    const userId = req.user?.id;

    if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    // Check cached isPremium field from JWT token
    const isPremium = req.user?.isPremium || false;
    const premiumExpires = req.user?.premiumExpires;

    // Verify premium status and expiration
    if (!isPremium || (premiumExpires && new Date(premiumExpires) <= new Date())) {
        return res.status(402).json({
            error: 'Active premium subscription required',
            code: 'PREMIUM_REQUIRED',
            currentPlan: req.user?.subscription_status || null
        });
    }

    next();
};

/**
 * SOFT Premium Gate - Returns partial data for free users
 * Allows request to proceed but marks as limited
 * Uses JWT-cached premium status (NO database query)
 */
export const requirePremiumSoft = (req, res, next) => {
    const userId = req.user?.id;

    if (!userId) {
        req.isPremium = false;
        req.isLimited = true;
        return next();
    }

    // Check cached isPremium field from JWT token
    const isPremium = req.user?.isPremium || false;
    const premiumExpires = req.user?.premiumExpires;

    // Verify premium status and expiration
    const isStillActive = !premiumExpires || new Date(premiumExpires) > new Date();
    req.isPremium = isPremium && isStillActive;
    req.isLimited = !req.isPremium;
    req.credits = 0; // Deprecated

    next();
};

/**
 * OPTIONAL Premium Check - Allows anonymous access but checks premium if logged in
 * Use for endpoints that should work without login but have premium features
 * Uses JWT-cached premium status (NO database query)
 */
export const optionalPremiumCheck = (req, res, next) => {
    // Try to extract token, but don't fail if missing
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

    if (!token) {
        // No token = treat as free tier
        req.isPremium = false;
        req.isLimited = true;
        req.user = null;
        return next();
    }

    // Token exists - verify and check premium status
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = {
            id: decoded.id,
            email: decoded.email,
            isPremium: decoded.isPremium,
            premiumExpires: decoded.premiumExpires,
            subscription_status: decoded.subscription_status
        };

        // Check cached isPremium field from JWT token (NO database query!)
        const isPremium = decoded.isPremium || false;
        const premiumExpires = decoded.premiumExpires;

        // Verify premium status and expiration
        const isStillActive = !premiumExpires || new Date(premiumExpires) > new Date();
        req.isPremium = isPremium && isStillActive;
        req.isLimited = !req.isPremium;

        next();
    } catch (error) {
        // Invalid token = treat as free tier (don't block request)
        console.warn('Optional premium check - invalid token:', error.message);
        req.isPremium = false;
        req.isLimited = true;
        req.user = null;
        next();
    }
};

/**
 * Track paywall hits for analytics
 */
export const trackPaywallHit = async (userId, feature) => {
    try {
        await supabase.from('analytics_events').insert({
            user_id: userId || null,
            event_type: 'paywall_hit',
            feature: feature,
        });
    } catch (error) {
        // Non-critical — don't let analytics errors block user requests
        console.error('Track paywall error:', error);
    }
};

/**
 * Admin Gate - Allows only specific users
 */
export const requireAdmin = (req, res, next) => {
    const userId = req.user?.id;
    const email = req.user?.email;

    // Admin emails from environment variable, with fallback for development
    const ADMIN_EMAILS = process.env.ADMIN_EMAILS
        ? process.env.ADMIN_EMAILS.split(',').map(e => e.trim())
        : (IS_PRODUCTION ? [] : ['pavel.hajek1989@gmail.com']);

    if (!userId || !email || !ADMIN_EMAILS.includes(email)) {
        console.warn(`Unauthorized Admin Access Attempt: ${email} (${userId})`);
        return res.status(403).json({ error: 'Access Denied: Admin privileges required.' });
    }

    next();
};

