import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser'; // Security: HttpOnly cookie support
import rateLimit from 'express-rate-limit'; // Security: Rate Limiting
import helmet from 'helmet'; // Security: HTTP Headers
import xss from 'xss-clean'; // Security: Input Sanitization
import compression from 'compression'; // Performance: Gzip compression
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import Stripe from 'stripe';

// Global error handlers — catch unhandled errors before they crash the server
process.on('uncaughtException', (err) => {
    console.error('[FATAL] Uncaught Exception:', err);
    process.exit(1);
});
process.on('unhandledRejection', (reason) => {
    console.error('[FATAL] Unhandled Rejection:', reason);
});

// Auth & DB
import authRoutes from './auth.js';
import newsletterRoutes from './newsletter.js';
import contactRoutes from './contact.js';
import paymentRoutes, { handleStripeWebhook } from './payment.js';
import mentorRoutes from './mentor.js';
import adminRoutes from './admin.js';
import crypto from 'crypto';
import { initializeEmailQueueJob } from './jobs/email-queue.js';
import schedule from 'node-schedule';
import { globalLimiter, staticLimiter, aiLimiter, sensitiveLimiter } from './middleware.js';
import {
    setBaseContentSecurityPolicy,
    setHtmlContentSecurityPolicy,
    setHtmlFileContentSecurityPolicy,
} from './utils/csp.js';

// Route modules
import oracleRoutes from './routes/oracle.js';
import horoscopeRoutes from './routes/horoscope.js';
import horoscopePagesRoutes from './routes/horoscope-pages.js';
import numerologyRoutes from './routes/numerology.js';
import userRoutes from './routes/user.js';
import angelPostRoutes from './routes/angel-post.js';
import docsRoutes from './routes/docs.js';
import briefingRoutes from './routes/briefing.js';
import horoscopeSubscribeRoutes from './routes/horoscope-subscribe.js';
import pastLifeRoutes from './routes/past-life.js';
import medicineWheelRoutes from './routes/medicine-wheel.js';
import rocniHoroskopRoutes from './routes/rocni-horoskop.js';
import { spawn } from 'child_process';
import { getPublicPlanManifest } from './config/constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../');
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
// Enable trust proxy for Railway/Heroku/Vercel to correctly identify user IPs
app.set('trust proxy', 1);

const PORT = process.env.PORT || 3001;
const SHOULD_RUN_SCHEDULED_JOBS = process.env.DISABLE_SCHEDULED_JOBS !== 'true' && process.env.NODE_ENV !== 'test';

// Middleware - Restrict CORS to same-origin by default
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()).filter(Boolean)
    : ['http://localhost:3001', 'http://localhost:3000'];

// Security: Strip localhost origins in production
if (process.env.NODE_ENV === 'production') {
    const localhostPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
    for (let i = ALLOWED_ORIGINS.length - 1; i >= 0; i--) {
        if (localhostPattern.test(ALLOWED_ORIGINS[i])) {
            ALLOWED_ORIGINS.splice(i, 1);
        }
    }
}

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
        // Allow any localhost port in development (Claude Preview, dev tools, etc.)
        const localhostPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
        if (process.env.NODE_ENV !== 'production' && localhostPattern.test(origin)) return callback(null, true);
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
        // console.warn(`[PERF] ${req.method} ${req.originalUrl} took ${duration}ms [${res.statusCode}]`);
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

// Request Body Size Limits - Prevent large payload attacks
// 10KB for JSON (enough for typical API requests)
// 5KB for URL-encoded (form submissions)
app.use(express.json({
    limit: '10kb',
    strict: true, // Only accept arrays and objects
}));
app.use(express.urlencoded({
    extended: true,
    limit: '5kb',
    parameterLimit: 100 // Limit number of form parameters
}));

// Parse cookies (HttpOnly auth_token + CSRF token)
app.use(cookieParser());

// Middleware: Validate request size and content-type
app.use((req, res, next) => {
    // Check content-length header
    const contentLength = parseInt(req.headers['content-length'] || '0');
    if (contentLength > 10240) { // 10KB in bytes
        return res.status(413).json({
            error: 'Payload too large',
            maxSize: '10KB'
        });
    }
    next();
});

// Security Headers with Content Security Policy


app.use('/api/', globalLimiter);
app.use(staticLimiter);

// Rate limiters are now handled in middleware.js and imported

// Gzip Compression
app.use(compression());

// Security headers. CSP is assembled separately so HTML pages can get page-specific
// hashes for inline JSON-LD without bloating API and asset responses.
app.use(helmet({
    contentSecurityPolicy: false,
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
app.use(setBaseContentSecurityPolicy);

// Force HTTPS in production (early, before any routes)
if (process.env.NODE_ENV === 'production') {
    app.use((req, res, next) => {
        if (req.headers['x-forwarded-proto'] !== 'https') {
            return res.redirect(301, `https://www.${req.hostname.replace(/^www\./, '')}${req.url}`);
        }
        // Redirect non-www to www
        if (!req.hostname.startsWith('www.')) {
            return res.redirect(301, `https://www.${req.hostname}${req.url}`);
        }
        next();
    });
}

// CSRF Protection Middleware (Simple implementation)
if (process.env.NODE_ENV === 'production' && !process.env.CSRF_SECRET) {
    console.error('[SECURITY ERROR] CSRF_SECRET environment variable is required in production!');
    process.exit(1);
}
const csrfSecret = process.env.CSRF_SECRET || crypto.randomBytes(32).toString('hex');
const csrfTokenLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: process.env.NODE_ENV === 'test' ? 1000 : 60,
    standardHeaders: true,
    legacyHeaders: false,
    validate: { xForwardedForHeader: false },
    handler: (req, res) => {
        res.status(429).json({
            error: 'Too many CSRF token requests. Please try again later.',
            retryAfter: req.rateLimit.resetTime
        });
    }
});

// Generate CSRF token using HMAC: randomString.timestamp.signature
function generateCSRFToken() {
    const randomString = crypto.randomBytes(32).toString('hex');
    const timestamp = Date.now().toString(36);
    const payload = `${randomString}.${timestamp}`;
    const hmac = crypto.createHmac('sha256', csrfSecret);
    hmac.update(payload);
    return `${payload}.${hmac.digest('hex')}`;
}

// Verify CSRF token
function verifyCSRFToken(token) {
    if (!token || typeof token !== 'string') {
        return false;
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
        return false;
    }

    const [randomString, timestamp, signature] = parts;

    if (!randomString || !timestamp || !signature) {
        return false;
    }

    // Check token expiry (15 minutes)
    const tokenTime = parseInt(timestamp, 36);
    if (Date.now() - tokenTime > 15 * 60 * 1000) {
        return false;
    }

    const payload = `${randomString}.${timestamp}`;
    const hmac = crypto.createHmac('sha256', csrfSecret);
    hmac.update(payload);
    const expectedSignature = hmac.digest('hex');

    // Buffers must be same length for timingSafeEqual
    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);
    if (sigBuffer.length !== expectedBuffer.length) {
        return false;
    }

    // Use constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
}

const csrfProtection = (req, res, next) => {
    // Skip CSRF for GET, HEAD, OPTIONS requests
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
    }

    // Skip CSRF for webhook endpoints
    if (req.path.includes('/webhook/')) {
        return next();
    }

    // Get token from headers or body
    const token = req.headers['x-csrf-token'] || req.body?.csrfToken;

    if (!token) {
        return res.status(403).json({ error: 'CSRF token missing' });
    }

    try {
        // Verify the CSRF token
        const isValidToken = verifyCSRFToken(token);

        if (!isValidToken) {
            return res.status(403).json({ error: 'CSRF token invalid' });
        }

        next();
    } catch (err) {
        console.error('[CSRF] Token verification error:', err.message);
        return res.status(403).json({ error: 'CSRF token verification failed' });
    }
};

// XSS Protection - API routes only, after body parsing and before route handlers
app.use('/api', xss());

// Endpoint to get CSRF token (call this on page load)
app.get('/api/csrf-token', csrfTokenLimiter, (req, res) => {
    try {
        const token = generateCSRFToken();
        res.json({ csrfToken: token });
    } catch (err) {
        console.error('[CSRF] Token creation error:', err.message);
        res.status(500).json({ error: 'Failed to create CSRF token' });
    }
});

// Apply CSRF protection to state-changing API endpoints after token endpoint is available
app.post('/api/*', csrfProtection);
app.put('/api/*', csrfProtection);
app.patch('/api/*', csrfProtection);
app.delete('/api/*', csrfProtection);

// Health Check Endpoint (Moved UP to bypass Rate Limiting)
app.get('/api/health', (req, res) => {
    const dbOk = !!process.env.DATABASE_URL;
    const aiOk = !!process.env.GEMINI_API_KEY;
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        checks: {
            db: dbOk ? 'ok' : 'unavailable',
            ai: aiOk ? 'ok' : 'unavailable'
        }
    });
});

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

// Programmatic SEO pages — must be before static middleware
// Handles /horoskop/:sign/:date and /horoskop/sitemap-horoscopes.xml
app.use('/horoskop', horoscopePagesRoutes);

// OG injection pro horoskopy.html — ?znak=beran → správný og:image pro Facebook scraper
const HOROSCOPE_SIGNS = {
    beran:    { name: 'Beran',    symbol: '♈' },
    byk:      { name: 'Býk',      symbol: '♉' },
    blizenci: { name: 'Blíženci', symbol: '♊' },
    rak:      { name: 'Rak',      symbol: '♋' },
    lev:      { name: 'Lev',      symbol: '♌' },
    panna:    { name: 'Panna',    symbol: '♍' },
    vahy:     { name: 'Váhy',     symbol: '♎' },
    stir:     { name: 'Štír',     symbol: '♏' },
    strelec:  { name: 'Střelec',  symbol: '♐' },
    kozoroh:  { name: 'Kozoroh',  symbol: '♑' },
    vodnar:   { name: 'Vodnář',   symbol: '♒' },
    ryby:     { name: 'Ryby',     symbol: '♓' },
};

app.get('/horoskopy.html', (req, res, next) => {
    const znak = req.query.znak?.toLowerCase();
    if (!znak || !HOROSCOPE_SIGNS[znak]) return next();

    const sign = HOROSCOPE_SIGNS[znak];
    const appUrl = process.env.APP_URL || 'https://www.mystickahvezda.cz';
    const ogImage = `${appUrl}/img/og/horoskop-${znak}.jpg`;
    const ogTitle = `Horoskop ${sign.symbol} ${sign.name} — Mystická Hvězda`;
    const ogDesc  = `Přečti si dnešní horoskop pro ${sign.name}. Co ti hvězdy přináší dnes?`;
    const ogUrl   = `${appUrl}/horoskopy.html?znak=${znak}#${znak}`;

    const htmlPath = path.join(rootDir, 'horoskopy.html');
    let html;
    try {
        html = fs.readFileSync(htmlPath, 'utf-8');
    } catch {
        return next();
    }

    // Nahraď / přidej OG tagy specifické pro znamení
    const ogInject = `
    <meta property="og:title" content="${ogTitle}">
    <meta property="og:description" content="${ogDesc}">
    <meta property="og:image" content="${ogImage}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:image:alt" content="${ogTitle}">
    <meta property="og:url" content="${ogUrl}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:image" content="${ogImage}">`;

    // Přidej před </head> (nahradí případné existující OG tagy pro image/title/desc)
    const replaced = html
        .replace(/<meta property="og:image"[^>]*>/gi, '')
        .replace(/<meta property="og:image:width"[^>]*>/gi, '')
        .replace(/<meta property="og:image:height"[^>]*>/gi, '')
        .replace(/<meta property="og:image:alt"[^>]*>/gi, '')
        .replace(/<meta property="og:title"[^>]*>/gi, '')
        .replace(/<meta property="og:description"[^>]*>/gi, '')
        .replace(/<meta property="og:url"[^>]*>/gi, '')
        .replace(/<meta name="twitter:card"[^>]*>/gi, '')
        .replace(/<meta name="twitter:image"[^>]*>/gi, '')
        .replace('</head>', ogInject + '\n</head>');

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    setHtmlContentSecurityPolicy(res, replaced);
    res.send(replaced);
});

// Support for /jmena/:name (redirects to /jmena/?jmeno=Name)
app.get('/jmena/:name', (req, res, next) => {
    const name = req.params.name;
    if (name === 'index' || name.includes('.')) {
        return next();
    }

    // Capitalize first letter to match database
    const capitalized = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
    res.redirect(301, `/jmena/index.html?jmeno=${encodeURIComponent(capitalized)}`);
});

// Serve static files from the parent directory (MystickaHvezda root)
console.warn(`📂 Serving static files from: ${rootDir}`);

function setStaticHeaders(res, filePath) {
    // HTML pages and service worker must not be cached immutably
    // so deployments are reflected immediately
    if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        setHtmlFileContentSecurityPolicy(res, filePath);
    } else if (filePath.endsWith('service-worker.js')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    } else if (filePath.endsWith('manifest.json')) {
        res.setHeader('Cache-Control', 'public, max-age=86400');
    }
    // Tell caches that responses vary by encoding (gzip/br)
    res.setHeader('Vary', 'Accept-Encoding');
}

const staticOptions = {
    ...(process.env.NODE_ENV === 'production'
        ? {
            maxAge: '1y',
            immutable: true,
        }
        : {}),
    setHeaders: setStaticHeaders,
};

app.use(express.static(rootDir, staticOptions));

// Explicitly serve JS files with correct MIME type and caching
app.use('/js', express.static(path.join(rootDir, 'js'), {
    ...staticOptions,
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
        }
        if (staticOptions.setHeaders) {
            staticOptions.setHeaders(res, filePath);
        }
    }
}));

// Serve local fonts with immutable caching and proper MIME types
app.use('/fonts', express.static(path.join(rootDir, 'fonts'), {
    maxAge: '1y',
    immutable: true,
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.ttf')) {
            res.setHeader('Content-Type', 'font/ttf');
        } else if (filePath.endsWith('.woff2')) {
            res.setHeader('Content-Type', 'font/woff2');
        } else if (filePath.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css');
        }
        res.setHeader('Vary', 'Accept-Encoding');
    }
}));


// Apply sensitive operation limiter to password reset (stricter than authLimiter)
app.use('/api/auth/reset-password', sensitiveLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/mentor', mentorRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/docs', docsRoutes);

// Public config endpoint — safely exposes only client-safe env vars
app.get('/api/config', (req, res) => {
    res.json({
        stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY || null,
    });
});

// Public subscription plan manifest for pricing UI.
app.get('/api/plans', (req, res) => {
    res.json({
        success: true,
        ...getPublicPlanManifest()
    });
});

// AI Oracle routes (crystal-ball, tarot, natal-chart, synastry, astrocartography)
app.use('/api', aiLimiter, oracleRoutes);

// Horoscope with DB caching (AI rate limit applied only on cache miss inside the route)
app.use('/api/horoscope', horoscopeRoutes);
app.use('/api', aiLimiter, briefingRoutes);

// Numerology with DB caching (Premium only)
app.use('/api/numerology', aiLimiter, numerologyRoutes);

// User readings CRUD + password change
app.use('/api/user', userRoutes);

// Andělská pošta — komunita
app.use('/api/angel-post', angelPostRoutes);

// Horoscope email subscriptions
app.use('/api/subscribe/horoscope', horoscopeSubscribeRoutes);

// Past Life — premium feature
app.use('/api/past-life', aiLimiter, pastLifeRoutes);

// Medicine Wheel — premium feature
app.use('/api/medicine-wheel', aiLimiter, medicineWheelRoutes);

// Roční Horoskop na míru — one-time paid PDF product
app.use('/api/rocni-horoskop', rocniHoroskopRoutes);

// Health Check - registered above rate limiter (see top of file)
// Admin comment: duplicate route registrations removed


// Global Error Handler - Never expose internal details to clients
app.use((err, req, res, next) => {
    // Log detailed error server-side
    console.error('[Error Handler]', {
        method: req.method,
        path: req.path,
        statusCode: err.status || 500,
        errorMessage: err.message,
        errorStack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        userAgent: req.headers['user-agent'],
        ip: req.ip,
        timestamp: new Date().toISOString(),
    });


    // Return generic error to client (no internal details)
    const statusCode = err.status || 500;
    res.status(statusCode).json({
        error: 'An error occurred. Please try again later.',
        // Only include details in development mode
        ...(process.env.NODE_ENV === 'development' && {
            debug: {
                message: err.message,
                status: statusCode,
            }
        }),
    });
});

// 404 Handler - for routes not found
app.use((req, res) => {
    console.warn(`[404] ${req.method} ${req.path}`);
    res.status(404).json({
        error: 'Not found',
    });
});

// Start server if this is the main module
const isMain = process.argv[1] && (
    path.resolve(process.argv[1]) === __filename ||
    path.resolve(process.argv[1]) === path.resolve(process.cwd(), 'server', 'index.js') ||
    (import.meta.url && import.meta.url === `file://${path.resolve(process.argv[1])}`)
);

if (isMain || process.env.NODE_ENV === 'production') {
    app.listen(PORT, () => {
        console.warn(`✨ Mystická Hvězda API running on port ${PORT}`);
        console.warn(`🚀 Environment: ${process.env.NODE_ENV || 'development'}`);

        if (!SHOULD_RUN_SCHEDULED_JOBS) {
            console.warn('[JOBS] Scheduled jobs skipped in test mode.');
            return;
        }

        // Initialize email queue job processor
        try {
            initializeEmailQueueJob();
        } catch (jobErr) {
            console.error('[JOBS] Failed to init email queue:', jobErr.message);
        }

        // ============================================
        // SOCIAL MEDIA AGENT SCHEDULER (Railway)
        // ============================================

        const runSocialAgent = (action) => {
            const agentPath = path.resolve(rootDir, 'social-media-agent', 'railway_runner.py');
            console.log(`[SOCIAL] Triggering agent: ${action}`);
            
            const pythonPath = process.env.PYTHON_PATH || 'python';
            const child = spawn(pythonPath, [agentPath, action]);

            child.stdout.on('data', (data) => console.log(`[SOCIAL-OUT] ${data}`));
            child.stderr.on('data', (data) => console.error(`[SOCIAL-ERR] ${data}`));
            
            child.on('close', (code) => {
                console.log(`[SOCIAL] Agent process finished with code ${code}`);
            });
        };

        // 1. Generate new content daily (08:00 UTC)
        if (process.env.ANTHROPIC_API_KEY) {
            schedule.scheduleJob('0 8 * * *', () => {
                runSocialAgent('auto');
            });

            // 2. Sync comments and auto-reply every 6 hours
            schedule.scheduleJob('0 */6 * * *', () => {
                runSocialAgent('sync');
            });

            console.warn('📅 Social Media Agent schedules initialized.');
        } else {
            console.warn('⚠️ Social Media Agent skipped (missing ANTHROPIC_API_KEY).');
        }

        // Prefill horoscope cache — every day at 05:00 UTC (6:00 CET)
        // Hits all 12 sign URLs → Gemini generates & saves to _v2 cache
        schedule.scheduleJob('0 5 * * *', async () => {
            const signs = ['beran','byk','blizenci','rak','lev','panna','vahy','stir','strelec','kozoroh','vodnar','ryby'];
            const dates = [0, 1, 2].map(offset => {
                const d = new Date();
                d.setUTCDate(d.getUTCDate() + offset);
                return d.toISOString().split('T')[0];
            });
            console.log(`[CRON] Prefilling horoscope cache for: ${dates.join(', ')}...`);
            for (const date of dates) {
                for (const sign of signs) {
                    try {
                        await fetch(`https://www.mystickahvezda.cz/horoskop/${sign}/${date}`);
                    } catch (e) {
                        console.error(`[CRON] Prefill failed for ${sign}/${date}: ${e.message}`);
                    }
                    await new Promise(r => setTimeout(r, 1000));
                }
                console.log(`[CRON] Prefill done for ${date}.`);
            }
        });
        console.warn('📅 Horoscope prefill cron scheduled (05:00 UTC).');

        // Daily horoscope emails — every day at 07:00 UTC
        schedule.scheduleJob('0 7 * * *', async () => {
            try {
                const { run } = await import('./scripts/send-daily-horoscope.js');
                await run();
            } catch (e) {
                console.error('[CRON] Daily horoscope failed:', e.message);
            }
        });
        console.warn('📅 Daily horoscope cron scheduled (07:00 UTC).');
    });
}

export default app;
