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
import crypto from 'crypto';
import { initializeEmailQueueJob } from './jobs/email-queue.js';
import { globalLimiter, staticLimiter, aiLimiter, sensitiveLimiter } from './middleware.js';

// Route modules
import oracleRoutes from './routes/oracle.js';
import horoscopeRoutes from './routes/horoscope.js';
import horoscopePagesRoutes from './routes/horoscope-pages.js';
import numerologyRoutes from './routes/numerology.js';
import userRoutes from './routes/user.js';
import angelPostRoutes from './routes/angel-post.js';
import briefingRoutes from './routes/briefing.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

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

// Security Headers with proper Content Security Policy (applied early so all responses get headers)
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'", "https://cdnjs.cloudflare.com"],
            scriptSrc: [
                "'self'",
                "'unsafe-inline'",          // Needed for inline event handlers in current HTML
                'https://js.stripe.com',     // Stripe.js
                'https://cdn.jsdelivr.net',  // CDN scripts
                'https://cdnjs.cloudflare.com', // Added for Three.js
            ],
            styleSrc: [
                "'self'",
                "'unsafe-inline'",   // Needed for inline styles
                'https://fonts.googleapis.com',
                'https://cdnjs.cloudflare.com',
            ],
            fontSrc: [
                "'self'",
                'https://fonts.gstatic.com',
                'https://cdnjs.cloudflare.com',
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
                'https://cdnjs.cloudflare.com', // Added for Three.js fetches
                'https://fonts.googleapis.com',
                'https://fonts.gstatic.com',
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

// Force HTTPS in production (early, before any routes)
if (process.env.NODE_ENV === 'production') {
    app.use((req, res, next) => {
        if (req.headers['x-forwarded-proto'] !== 'https') {
            return res.redirect(301, `https://${req.hostname}${req.url}`);
        }
        next();
    });
}

// CSRF Protection Middleware (Simple implementation)
if (process.env.NODE_ENV === 'production' && !process.env.CSRF_SECRET) {
    console.warn('[SECURITY WARNING] CSRF_SECRET environment variable is missing in production!');
    console.warn('[SECURITY WARNING] Using a temporary fallback secret. Please set CSRF_SECRET in your environment for better security.');
}
const csrfSecret = process.env.CSRF_SECRET || 'dev-csrf-secret-fallback-2026';

// Generate CSRF token using HMAC
function generateCSRFToken() {
    const randomString = crypto.randomBytes(32).toString('hex');
    const hmac = crypto.createHmac('sha256', csrfSecret);
    hmac.update(randomString);
    return `${randomString}.${hmac.digest('hex')}`;
}

// Verify CSRF token
function verifyCSRFToken(token) {
    if (!token || typeof token !== 'string') {
        return false;
    }

    const [randomString, signature] = token.split('.');

    if (!randomString || !signature) {
        return false;
    }

    const hmac = crypto.createHmac('sha256', csrfSecret);
    hmac.update(randomString);
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

// Apply CSRF protection to state-changing API endpoints
app.post('/api/*', csrfProtection);
app.put('/api/*', csrfProtection);
app.patch('/api/*', csrfProtection);
app.delete('/api/*', csrfProtection);

// Endpoint to get CSRF token (call this on page load)
app.get('/api/csrf-token', (req, res) => {
    try {
        const token = generateCSRFToken();
        res.json({ csrfToken: token });
    } catch (err) {
        console.error('[CSRF] Token creation error:', err.message);
        res.status(500).json({ error: 'Failed to create CSRF token' });
    }
});

// XSS Protection - only for API routes (not static files)
app.use('/api', xss());

// Health Check Endpoint (Moved UP to bypass Rate Limiting)
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString()
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
// Handles /horoskop/:sign/:date and /sitemap-horoscopes.xml
app.use('/horoskop', horoscopePagesRoutes);

// Support for /jmena/:name (redirects to /jmena/?jmeno=Name)
app.get('/jmena/:name', (req, res) => {
    const name = req.params.name;
    // Capitalize first letter to match database
    const capitalized = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
    res.redirect(301, `/jmena/index.html?jmeno=${encodeURIComponent(capitalized)}`);
});

// Serve static files from the parent directory (MystickaHvezda root)
const rootDir = path.resolve(__dirname, '../');
console.log(`đź“‚ Serving static files from: ${rootDir}`);

const staticOptions = process.env.NODE_ENV === 'production'
    ? {
        maxAge: '1y',
        immutable: true,
        setHeaders: (res, filePath) => {
            // HTML pages and service worker must not be cached immutably
            // so deployments are reflected immediately
            if (filePath.endsWith('.html') || filePath.endsWith('service-worker.js')) {
                res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            } else if (filePath.endsWith('manifest.json')) {
                res.setHeader('Cache-Control', 'public, max-age=86400');
            }
            // Tell caches that responses vary by encoding (gzip/br)
            res.setHeader('Vary', 'Accept-Encoding');
        }
    }
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


// Apply sensitive operation limiter to password reset (stricter than authLimiter)
app.use('/api/auth/reset-password', sensitiveLimiter);
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
app.use('/api', aiLimiter, briefingRoutes);

// Numerology with DB caching (Premium only)
app.use('/api/numerology', aiLimiter, numerologyRoutes);

// User readings CRUD + password change
app.use('/api/user', userRoutes);

// Andělská pošta — komunita
app.use('/api/angel-post', angelPostRoutes);

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
        console.log(`✨ Mystická Hvězda API running on port ${PORT}`);
        console.log(`🚀 Environment: ${process.env.NODE_ENV || 'development'}`);

        // Initialize email queue job processor
        try {
            initializeEmailQueueJob();
        } catch (jobErr) {
            console.error('[JOBS] Failed to init email queue:', jobErr.message);
        }
    });
}

export default app;

