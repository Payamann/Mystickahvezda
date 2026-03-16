import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { JWT_SECRET } from './config/jwt.js';

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
// Lazy-loaded blacklist check to avoid circular imports
let _isTokenBlacklisted = null;
async function getBlacklistChecker() {
    if (!_isTokenBlacklisted) {
        const authModule = await import('./auth.js');
        _isTokenBlacklisted = authModule.isTokenBlacklisted;
    }
    return _isTokenBlacklisted;
}

export const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    // Read token from HttpOnly cookie first, fall back to Authorization header
    const token = req.cookies?.auth_token || (authHeader && authHeader.split(' ')[1]);

    if (!token) {
        return res.status(401).json({ error: 'Chybí přístupový token.' });
    }

    // Check token blacklist
    try {
        const checkBlacklist = await getBlacklistChecker();
        if (checkBlacklist && checkBlacklist(token)) {
            return res.status(401).json({ error: 'Token byl zneplatněn. Přihlaste se znovu.' });
        }
    } catch {
        // If blacklist check fails, continue with normal verification
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Neplatný nebo vypršený token.' });
        }
        req.user = user;
        // Ensure isPremium is explicitly available
        req.isPremium = !!user.isPremium;
        next();
    });
};

// ============================================
// AUTHORIZATION MIDDLEWARE
// ============================================
export const requirePremium = (req, res, next) => {
    if (process.env.NODE_ENV === 'development') {
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

export const optionalPremiumCheck = (req, res, next) => {
    // Just ensures req.user is populated if token exists, but doesn't block
    const authHeader = req.headers['authorization'];
    const token = req.cookies?.auth_token || (authHeader && authHeader.split(' ')[1]);

    if (token) {
        jwt.verify(token, JWT_SECRET, (err, user) => {
            if (!err) {
                req.user = user;
                req.isPremium = !!user.isPremium;
            }
            next();
        });
    } else {
        next();
    }
};

export const requireAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        // Fallback for identified developers from environment variable
        const adminEmails = (process.env.ADMIN_EMAILS || 'pavel@mystickahvezda.cz,admin@mystickahvezda.cz').split(',').map(e => e.trim());
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
    skip: (req) => req.path.match(/\.(js|css|jpg|jpeg|png|gif|ico|svg|ttf|webp|woff|woff2)$/),
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

export const staticLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 500,
    skip: (req) => req.path.startsWith('/api/'),
    standardHeaders: true,
    legacyHeaders: false,
    validate: { xForwardedForHeader: false }
});

export const aiLimiter = rateLimit({
    windowMs: 24 * 60 * 60 * 1000,
    max: (req) => {
        if (process.env.NODE_ENV === 'development') return 1000;
        return req.user?.isPremium ? 100 : 10;
    },
    message: { error: 'Překročen denní limit pro generování výkladů. Upgradujte na premium pro neomezený přístup.' },
    standardHeaders: true,
    legacyHeaders: false,
    validate: { xForwardedForHeader: false },
    skip: (req) => req.path === '/api/health'
});

export const sensitiveLimiter = createLimiter(10, 60, 'Příliš mnoho pokusů. Zkuste to prosím později.');
