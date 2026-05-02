import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { JWT_SECRET } from './config/jwt.js';
import { isDevelopmentRuntime, isProductionRuntime, isTestRuntime } from './config/runtime.js';
import {
    getRequiredPlanForFeature,
    planTypeMeetsRequirement,
} from './config/constants.js';
import { isTokenBlacklisted } from './utils/token-blacklist.js';

// Common rate limiter options
const createLimiter = (max, windowMin = 15, message = 'Příliš mnoho požadavků. Zkuste to prosím později.') => {
    return rateLimit({
        windowMs: windowMin * 60 * 1000,
        max: max,
        standardHeaders: true,
        legacyHeaders: false,
        validate: { xForwardedForHeader: false },
        handler: (req, res) => {
            res.status(429).json({
                error: message,
                retryAfter: req.rateLimit.resetTime
            });
        }
    });
};

// ============================================
// AUTHENTICATION MIDDLEWARE
// ============================================
// Promise wrapper for jwt.verify to avoid async-in-callback pitfall
function verifyToken(token) {
    return new Promise((resolve, reject) => {
        jwt.verify(token, JWT_SECRET, (err, decoded) => {
            if (err) reject(err);
            else resolve(decoded);
        });
    });
}

export const authenticateToken = async (req, res, next) => {
    // Read token from HttpOnly cookie (preferred) or Authorization header (fallback)
    const token = req.cookies?.auth_token || (req.headers['authorization'] && req.headers['authorization'].split(' ')[1]);

    if (!token) {
        return res.status(401).json({ error: 'Chybí přístupový token.' });
    }

    try {
        // Check if token is blacklisted (logout, password change, etc.)
        const blacklisted = await isTokenBlacklisted(token);
        if (blacklisted) {
            return res.status(401).json({ error: 'Token byl zneplatněn. Prosím přihlaste se znovu.' });
        }

        const user = await verifyToken(token);
        req.user = user;
        req.isPremium = !!user.isPremium;
        next();
    } catch (err) {
        return res.status(403).json({ error: 'Neplatný nebo vypršený token.' });
    }
};

// ============================================
// AUTHORIZATION MIDDLEWARE
// ============================================
export const requirePremium = (req, res, next) => {
    if (isDevelopmentRuntime()) {
        return next();
    }

    if (!req.user || !req.user.isPremium) {
        return res.status(403).json({ 
            error: 'Tato funkce vyžaduje Premium předplatné.',
            requireUpgrade: true 
        });
    }
    next();
};

export const requirePremiumSoft = (req, res, next) => {
    // Allows access but tags the request
    req.isPremium = !!(req.user && req.user.isPremium);
    next();
};

export const requireExclusive = (req, res, next) => {
    if (isDevelopmentRuntime()) {
        return next();
    }

    const isExclusive = planTypeMeetsRequirement(req.user?.subscription_status, 'osviceni');

    if (!req.user || !req.user.isPremium || !isExclusive) {
        return res.status(403).json({
            error: 'Tato funkce vyžaduje plán Osvícení nebo vyšší.',
            requireUpgrade: true,
            requiredPlan: 'osviceni'
        });
    }
    next();
};

export const requireFeature = (featureName) => (req, res, next) => {
    if (isDevelopmentRuntime()) {
        return next();
    }

    const requiredPlan = getRequiredPlanForFeature(featureName);
    const hasAccess = req.user?.isPremium && planTypeMeetsRequirement(req.user?.subscription_status, requiredPlan);

    if (!hasAccess) {
        const isExclusive = requiredPlan === 'osviceni' || requiredPlan === 'osviceni-rocne' || requiredPlan === 'vip-majestrat';
        return res.status(403).json({
            error: isExclusive
                ? 'Tato funkce vyžaduje plán Osvícení nebo vyšší.'
                : 'Tato funkce vyžaduje Premium předplatné.',
            requireUpgrade: true,
            requiredPlan,
            feature: featureName
        });
    }

    next();
};

export const optionalPremiumCheck = async (req, res, next) => {
    // Just ensures req.user is populated if token exists, but doesn't block
    const token = req.cookies?.auth_token || (req.headers['authorization'] && req.headers['authorization'].split(' ')[1]);

    if (token) {
        try {
            const blacklisted = await isTokenBlacklisted(token);
            if (!blacklisted) {
                const user = await verifyToken(token);
                req.user = user;
                req.isPremium = !!user.isPremium;
            }
        } catch (err) {
            // Token invalid — silently continue without user context
        }
    }
    next();
};

export const requireAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        const adminEmails = (process.env.ADMIN_EMAILS || '')
            .split(',')
            .map(e => e.trim())
            .filter(Boolean);
        if (req.user && adminEmails.includes(req.user.email)) {
            return next();
        }
        return res.status(403).json({ error: 'Přístup odepřen. Vyžadováno oprávnění administrátora.' });
    }
    next();
};

// ============================================
// UTILITIES
// ============================================
export async function trackPaywallHit(userId, toolName) {
    if (!userId) return;
    try {
        const { supabase } = await import('./db-supabase.js');
        await supabase.from('paywall_hits').insert({
            user_id: userId,
            tool_name: toolName
        });
    } catch (err) {
        console.error('[MIDDLEWARE] Paywall track error:', err.message);
    }
}

// ============================================
// RATE LIMITERS
// ============================================
export const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    skip: (req) => isTestRuntime() || req.path.match(/\.(js|css|jpg|jpeg|png|gif|ico|svg|ttf|webp|woff|woff2)$/),
    standardHeaders: true,
    legacyHeaders: false,
    validate: { xForwardedForHeader: false },
    handler: (req, res) => {
        res.status(429).json({
            error: 'Příliš mnoho požadavků. Zkuste to prosím později.',
            retryAfter: req.rateLimit.resetTime
        });
    }
});

const STATIC_ASSET_PATTERN = /\.(?:js|css|jpg|jpeg|png|gif|ico|svg|ttf|webp|woff|woff2|map|json|xml|txt)$/i;

export const staticLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: isProductionRuntime() ? 2400 : 10000,
    skip: (req) => (
        isTestRuntime() ||
        req.path.startsWith('/api/') ||
        STATIC_ASSET_PATTERN.test(req.path)
    ),
    standardHeaders: true,
    legacyHeaders: false,
    validate: { xForwardedForHeader: false }
});

export const aiLimiter = rateLimit({
    windowMs: 24 * 60 * 60 * 1000,
    max: (req) => {
        if (isDevelopmentRuntime() || isTestRuntime()) return 10000;
        return req.user?.isPremium ? 100 : 10;
    },
    message: { error: 'Překročen denní limit pro generování výkladů. Upgradujte na premium pro neomezený přístup.' },
    standardHeaders: true,
    legacyHeaders: false,
    validate: { xForwardedForHeader: false },
    skip: (req) => req.path === '/api/health'
});

export const sensitiveLimiter = createLimiter(10, 60, 'Příliš mnoho pokusů. Zkuste to prosím později.');
