import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit'; // Security: Rate Limiting
import helmet from 'helmet'; // Security: HTTP Headers
import xss from 'xss-clean'; // Security: Input Sanitization
import compression from 'compression'; // Performance: Gzip compression
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import Stripe from 'stripe';

// Auth & DB
import authRoutes from './auth.js';
import newsletterRoutes from './newsletter.js';
import contactRoutes from './contact.js';
import paymentRoutes, { handleStripeWebhook } from './payment.js';
import mentorRoutes from './mentor.js';
import adminRoutes from './admin.js';
import { authenticateToken, requirePremium, requirePremiumSoft, optionalPremiumCheck } from './middleware.js';
import { SYSTEM_PROMPTS } from './config/prompts.js';
import { calculateMoonPhase, getHoroscopeCacheKey, getCachedHoroscope, saveCachedHoroscope } from './services/astrology.js';
import { callGemini } from './services/gemini.js';
import { isPremiumUser } from './payment.js';
import { supabase } from './db-supabase.js';
import crypto from 'crypto';
import { initializeEmailQueueJob } from './jobs/email-queue.js';

// Route modules
import oracleRoutes from './routes/oracle.js';
import horoscopeRoutes from './routes/horoscope.js';
import numerologyRoutes from './routes/numerology.js';
import userRoutes from './routes/user.js';
import pushRoutes from './routes/push.js';
import angelPostRoutes from './routes/angel-post.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();

const app = express();
// Enable trust proxy for Railway/Heroku/Vercel to correctly identify user IPs
app.set('trust proxy', 1);

const PORT = process.env.PORT || 3001;

// Middleware - Restrict CORS to same-origin by default
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:3001', 'http://localhost:3000'];

// Always allow APP_URL in production (even if ALLOWED_ORIGINS is misconfigured)
if (process.env.APP_URL && !ALLOWED_ORIGINS.includes(process.env.APP_URL)) {
    ALLOWED_ORIGINS.push(process.env.APP_URL);
}
// Always allow www variant too
if (process.env.APP_URL) {
    const wwwVariant = process.env.APP_URL.replace('https://', 'https://www.').replace('http://', 'http://www.');
    const noWwwVariant = process.env.APP_URL.replace('https://www.', 'https://').replace('http://www.', 'http://');
    if (!ALLOWED_ORIGINS.includes(wwwVariant)) ALLOWED_ORIGINS.push(wwwVariant);
    if (!ALLOWED_ORIGINS.includes(noWwwVariant)) ALLOWED_ORIGINS.push(noWwwVariant);
}
// Hardcoded production fallback — ensures the live domain always works
const PRODUCTION_DOMAINS = [
    'https://mystickahvezda.cz',
    'https://www.mystickahvezda.cz',
];
PRODUCTION_DOMAINS.forEach(domain => {
    if (!ALLOWED_ORIGINS.includes(domain)) ALLOWED_ORIGINS.push(domain);
});


app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (server-to-server, mobile apps, same-origin)
        if (!origin) return callback(null, true);
        if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
        console.warn(`[CORS] Blocked origin: ${origin}. Allowed: ${ALLOWED_ORIGINS.join(', ')}`);
        callback(new Error('CORS not allowed'));
    },
    credentials: true
}));



// Performance Logging Middleware
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`[PERF] ${req.method} ${req.originalUrl} took ${duration}ms [${res.statusCode}]`);
    });
    next();
});

// Stripe Webhook MUST be before express.json() to get raw body
app.post('/webhook/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
    try {
        await handleStripeWebhook(req.body, req.headers['stripe-signature']);
        res.sendStatus(200);
    } catch (err) {
        console.error('[STRIPE] Webhook error:', err.message);
        res.status(400).json({ success: false, error: 'Webhook processing failed' });
    }
});

// Increase payload limit for complex requests (e.g. detailed tarot spreads if needed)
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Security Headers with Content Security Policy

// Rate Limiting (Relaxed to 300 req/15min)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 300, // Increased from 100 to 300 to be safe
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter);

// AI-generation endpoints - expensive, limit abuse
const aiLimiter = rateLimit({
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    max: 50, // 50 AI requests per IP per day (approx 2/hour avg)
    message: { error: 'Překročen denní limit pro AI generování. Zkuste to zítra.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Sensitive account operations - strict limit (Brute force protection)
const sensitiveOpLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 attempts per hour
    message: { error: 'Příliš mnoho pokusů. Zkuste to prosím později.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Gzip Compression
app.use(compression());

// Force HTTPS in production
if (process.env.NODE_ENV === 'production') {
    app.use((req, res, next) => {
        // Railway (and most proxies) use x-forwarded-proto header
        if (req.headers['x-forwarded-proto'] !== 'https') {
            return res.redirect(301, `https://${req.hostname}${req.url}`);
        }
        next();
    });
}

// XSS Protection - only for API routes (not static files)
app.use('/api', xss());

// Health Check Endpoint (Moved UP to bypass Rate Limiting)
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString()
    });
});

// Security Headers with proper Content Security Policy
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: [
                "'self'",
                "'unsafe-inline'",          // Needed for inline event handlers in current HTML
                "'unsafe-eval'",             // Needed for some dynamic JS
                'https://js.stripe.com',     // Stripe.js
                'https://cdn.jsdelivr.net',  // CDN scripts
            ],
            styleSrc: [
                "'self'",
                "'unsafe-inline'",   // Needed for inline styles
                'https://fonts.googleapis.com',
            ],
            fontSrc: [
                "'self'",
                'https://fonts.gstatic.com',
                'data:',
            ],
            imgSrc: [
                "'self'",
                'data:',             // Base64 images (natal chart canvas)
                'blob:',
                'https:',            // Allow HTTPS images
            ],
            connectSrc: [
                "'self'",
                process.env.SUPABASE_URL ? `https://${process.env.SUPABASE_URL.replace(/^https?:\/\//, '')}` : '',
                'https://api.stripe.com',    // Stripe API
                'https://generativelanguage.googleapis.com', // Gemini API
            ].filter(Boolean),
            frameSrc: ["'self'", 'https://js.stripe.com'], // Allow Stripe iframe
            objectSrc: ["'none'"],
            upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
        },
    },
    hsts: {
        maxAge: 31536000, // 1 year in seconds
        includeSubDomains: true,
        preload: true,
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    permissionsPolicy: {
        geolocation: [],
        microphone: [],
        camera: [],
        usb: [],
    },
    crossOriginEmbedderPolicy: false,
    frameguard: { action: 'deny' }, // Prevent Clickjacking
    noSniff: true, // X-Content-Type-Options: nosniff
    xssFilter: true, // X-XSS-Protection
}));

// ============================================
// HOROSCOPE CACHE SYSTEM (Database-backed)
// ============================================

// Helper functions moved to services/astrology.js

// DEVELOPMENT: Disable caching for all static files
if (process.env.NODE_ENV !== 'production') {
    app.use((req, res, next) => {
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
        next();
    });
}

// Serve static files from the parent directory (MystickaHvezda root)
const rootDir = path.resolve(__dirname, '../');
console.log(`đź“‚ Serving static files from: ${rootDir}`);

const staticOptions = process.env.NODE_ENV === 'production'
    ? { maxAge: '1y', immutable: true }
    : {};

app.use(express.static(rootDir, staticOptions));

// Explicitly serve JS files with correct MIME type to avoid strict MIME checking issues
app.use('/js', express.static(path.join(rootDir, 'js'), {
    setHeaders: (res, path) => {
        if (path.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
        }
    }
}));


app.use('/api/auth', authRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/mentor', mentorRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/admin', adminRoutes);

// Public config endpoint â€” safely exposes only client-safe env vars
app.get('/api/config', (req, res) => {
    res.json({
        stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY || null,
    });
});

// AI Oracle routes (crystal-ball, tarot, natal-chart, synastry, astrocartography)
app.use('/api', aiLimiter, oracleRoutes);

// Horoscope with DB caching
app.use('/api/horoscope', aiLimiter, horoscopeRoutes);

// Numerology with DB caching (Premium only)
app.use('/api/numerology', aiLimiter, numerologyRoutes);

// User readings CRUD + password change
app.use('/api/user', userRoutes);

// Andělská pošta — komunita
app.use('/api/angel-post', angelPostRoutes);

// Health Check - registered above rate limiter (see top of file)
// Admin comment: duplicate route registrations removed


// Start server ONLY if run directly (not imported for tests)
if (process.argv[1] === __filename) {
    app.listen(PORT, () => {
        console.log(`âś¨ MystickĂˇ HvÄ›zda API running on http://localhost:${PORT}`);
        console.log(`đźŚŤ Environment: ${process.env.NODE_ENV || 'development'}`);

        // Initialize email queue job processor
        initializeEmailQueueJob();
    });
}

export default app;

