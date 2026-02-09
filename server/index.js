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
import paymentRoutes, { handleStripeWebhook } from './payment.js';
import mentorRoutes from './mentor.js';
import adminRoutes from './admin.js';
import { authenticateToken, requirePremium, requirePremiumSoft } from './middleware.js';
import { SYSTEM_PROMPTS } from './config/prompts.js';
import { calculateMoonPhase, getHoroscopeCacheKey, getCachedHoroscope, saveCachedHoroscope } from './services/astrology.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware - Restrict CORS to same-origin by default
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:3001', 'http://localhost:3000'];
app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (server-to-server, mobile apps)
        if (!origin) return callback(null, true);
        if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
        callback(new Error('CORS not allowed'));
    },
    credentials: true
}));

// Stripe Webhook MUST be before express.json() to get raw body
app.post('/webhook/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
    try {
        await handleStripeWebhook(req.body, req.headers['stripe-signature']);
        res.sendStatus(200);
    } catch (err) {
        console.error('[STRIPE] Webhook error:', err.message);
        res.status(400).send('Webhook Error');
    }
});

// Increase payload limit for complex requests (e.g. detailed tarot spreads if needed)
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Security Headers with Content Security Policy
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://js.stripe.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "blob:", "https:"],
            connectSrc: ["'self'", "https://generativelanguage.googleapis.com", "https://api.stripe.com"],
            frameSrc: ["'self'", "https://js.stripe.com"],
        },
    },
    crossOriginEmbedderPolicy: false
}));

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
app.use('/api/', limiter);

// AI-generation endpoints - expensive, limit more aggressively
const aiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    message: { error: 'Příliš mnoho požadavků. Zkuste to za chvíli.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Sensitive account operations - strict limit
const sensitiveOpLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5,
    message: { error: 'Příliš mnoho pokusů. Zkuste to za hodinu.' },
    standardHeaders: true,
    legacyHeaders: false,
});


// Gzip Compression
app.use(compression());

// XSS Protection
app.use(xss());

// ============================================
// HOROSCOPE CACHE SYSTEM (Database-backed)
// ============================================

console.log(`🔮 Horoscope cache: Using database storage (persistent)`);
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
console.log(`📂 Serving static files from: ${rootDir}`);

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
app.use('/api/mentor', mentorRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/admin', adminRoutes);

// Helper function to call Gemini API
import { callGemini } from './services/gemini.js';
import { isPremiumUser } from './payment.js';
import { supabase } from './db-supabase.js';
import crypto from 'crypto';

// ============================================
// API ENDPOINTS
// ============================================

// Crystal Ball Oracle
app.post('/api/crystal-ball', async (req, res) => {
    try {
        const { question, history = [] } = req.body;

        if (!question || typeof question !== 'string' || question.length > 1000) {
            return res.status(400).json({ success: false, error: 'Otázka je povinná (max 1000 znaků).' });
        }

        // Limit history to prevent abuse
        const safeHistory = Array.isArray(history) ? history.slice(0, 10) : [];

        let contextMessage = question;
        if (safeHistory.length > 0) {
            contextMessage = `Předchozí otázky v této seanci: ${safeHistory.join(', ')}\n\nNová otázka: ${question}`;
        }

        const moonPhase = calculateMoonPhase();
        const systemPrompt = SYSTEM_PROMPTS.crystalBall.replace('{MOON_PHASE}', moonPhase);

        const response = await callGemini(systemPrompt, contextMessage);
        res.json({ success: true, response });
    } catch (error) {
        console.error('Crystal Ball Error:', error);
        res.status(500).json({ success: false, error: 'Křišťálová koule je zahalena mlhou...' });
    }
});

// Tarot Reading (FREEMIUM LIMITS)
app.post('/api/tarot', authenticateToken, async (req, res) => {
    try {
        const { question, cards, spreadType = 'tříkartový' } = req.body;
        const userId = req.user.id;

        // Check limits
        const userIsPremium = await isPremiumUser(userId);

        // Free users can only do 1-card spreads
        if (!userIsPremium && cards.length > 1) {
            return res.status(403).json({
                success: false,
                error: 'Komplexní výklady jsou dostupné pouze pro Hvězdné Průvodce (Premium).',
                code: 'PREMIUM_REQUIRED'
            });
        }

        const message = `Typ výkladu: ${spreadType}\nOtázka: "${question}"\nVytažené karty: ${cards.join(', ')}`;

        const response = await callGemini(SYSTEM_PROMPTS.tarot, message);
        res.json({ success: true, response });
    } catch (error) {
        console.error('Tarot Error:', error);
        res.status(500).json({ success: false, error: 'Karty odmítají promluvit...' });
    }
});

// Tarot Summary (requires auth to prevent API cost abuse)
app.post('/api/tarot-summary', authenticateToken, async (req, res) => {
    try {
        const { cards, spreadType } = req.body;

        if (!Array.isArray(cards) || cards.length === 0 || cards.length > 20) {
            return res.status(400).json({ success: false, error: 'Neplatná data karet.' });
        }

        const safeSpreadType = String(spreadType || 'obecný').substring(0, 100);
        let cardContext = cards.map(c => {
            const pos = String(c?.position || '').substring(0, 100);
            const name = String(c?.name || '').substring(0, 100);
            const meaning = String(c?.meaning || '').substring(0, 200);
            return `${pos}: ${name} (${meaning})`;
        }).join(', ');
        const message = `Typ výkladu: ${safeSpreadType}\n\nKarty v kontextu pozic:\n${cardContext}\n\nVytvoř krásný, hluboký souhrn tohoto výkladu.`;

        const response = await callGemini(SYSTEM_PROMPTS.tarotSummary, message);
        res.json({ success: true, response });
    } catch (error) {
        console.error('Tarot Summary Error:', error);
        res.status(500).json({ success: false, error: 'Hlas vesmíru je nyní tichý...' });
    }
});

// Natal Chart Analysis
app.post('/api/natal-chart', aiLimiter, async (req, res) => {
    try {
        const { birthDate, birthTime, birthPlace, name } = req.body;

        if (!birthDate || typeof birthDate !== 'string') {
            return res.status(400).json({ success: false, error: 'Datum narození je povinné.' });
        }

        const safeName = String(name || 'Tazatel').substring(0, 100);
        const safeBirthDate = String(birthDate).substring(0, 30);
        const safeBirthTime = String(birthTime || '').substring(0, 20);
        const safeBirthPlace = String(birthPlace || '').substring(0, 200);
        const message = `Jméno: ${safeName}\\nDatum narození: ${safeBirthDate}\\nČas narození: ${safeBirthTime}\\nMísto narození: ${safeBirthPlace}`;

        const response = await callGemini(SYSTEM_PROMPTS.natalChart, message);
        res.json({ success: true, response });
    } catch (error) {
        console.error('Natal Chart Error:', error);
        res.status(500).json({ success: false, error: 'Hvězdy nejsou v tuto chvíli čitelné...' });
    }
});

// Synastry / Compatibility (FREEMIUM TEASER)
app.post('/api/synastry', authenticateToken, async (req, res) => {
    try {
        const { person1, person2 } = req.body;
        const userId = req.user.id;

        // Check premium status
        const userIsPremium = await isPremiumUser(userId);

        // If NOT premium, return simplified response (Teaser Mode)
        if (!userIsPremium) {
            console.log('[Synastry] Free user - returning teaser');
            // We return success, but with a flag. The frontend calculates scores locally anyway.
            // We do NOT call Gemini to save costs.
            return res.json({
                success: true,
                isTeaser: true,
                response: null // No text analysis
            });
        }

        // Premium Logic (Full Analysis)
        const message = `Osoba A: ${person1.name}, narozena ${person1.birthDate}\nOsoba B: ${person2.name}, narozena ${person2.birthDate}`;
        const response = await callGemini(SYSTEM_PROMPTS.synastry, message);

        res.json({ success: true, response, isTeaser: false });
    } catch (error) {
        console.error('Synastry Error:', error);
        res.status(500).json({ success: false, error: 'Hvězdná spojení jsou dočasně zahalena...' });
    }
});

// Valid zodiac signs whitelist
const VALID_ZODIAC_SIGNS = ['Beran', 'Býk', 'Blíženci', 'Rak', 'Lev', 'Panna', 'Váhy', 'Štír', 'Střelec', 'Kozoroh', 'Vodnář', 'Ryby'];

// Horoscope (Daily, Weekly, Monthly) - WITH DATABASE CACHING
app.post('/api/horoscope', async (req, res) => {
    try {
        const { sign, period = 'daily', context = [] } = req.body;

        if (!sign || !VALID_ZODIAC_SIGNS.includes(sign)) {
            return res.status(400).json({ success: false, error: 'Neplatné znamení zvěrokruhu.' });
        }

        if (!['daily', 'weekly', 'monthly'].includes(period)) {
            return res.status(400).json({ success: false, error: 'Neplatné období.' });
        }

        // Generate cache key (include context hash to avoid stale cache if context changes)
        const contextHash = Array.isArray(context) && context.length > 0 ? Buffer.from(context.join('')).toString('base64').substring(0, 10) : 'nocontext';
        const cacheKey = getHoroscopeCacheKey(sign, period) + `-${contextHash}`;

        // Check database cache first
        const cachedData = await getCachedHoroscope(cacheKey);
        if (cachedData) {
            console.log(`📦 Horoscope Cache HIT: ${cacheKey}`);
            return res.json({
                success: true,
                response: cachedData.response,
                period: cachedData.period_label,
                cached: true
            });
        }

        console.log(`🔄 Horoscope Cache MISS: ${cacheKey} - Generating new...`);

        // Dynamic prompt based on period
        let periodPrompt;
        let periodLabel;
        let contextInstruction = "";

        if (context && Array.isArray(context) && context.length > 0) {
            // Sanitize context: strip control chars, limit length, cap items
            const sanitized = context
                .slice(0, 5)
                .map(c => String(c).replace(/[\r\n\t]/g, ' ').substring(0, 300))
                .filter(c => c.trim().length > 0);

            if (sanitized.length > 0) {
                contextInstruction = `
CONTEXT (Z uživatelova deníku):
"${sanitized.join('", "')}"
INSTRUKCE PRO SYNERGII: Pokud je to relevantní, jemně a nepřímo nawazuj na témata z deníku. Neříkej "V deníku vidím...", ale spíše "Hvězdy naznačují posun v tématech, která tě trápí...". Buď empatický.`;
            }
        }

        if (period === 'weekly') {
            periodLabel = 'Týdenní horoskop';
            periodPrompt = `Jsi inspirativní astrologický průvodce.
Napiš týdenní horoskop pro dané znamení (PŘESNĚ 5-6 vět).
Zaměř se na:
1. Hlavní energii týdne
2. Oblasti lásky/vztahů
3. Kariéry a financí
4. Jednu výzvu a jednu příležitost
5. Povzbudivou mantru týdne
Odpověď česky, poeticky a povzbudivě.${contextInstruction}`;
        } else if (period === 'monthly') {
            periodLabel = 'Měsíční horoskop';
            periodPrompt = `Jsi moudrý astrologický průvodce.
Napiš měsíční horoskop pro dané znamení (PŘESNĚ 7-8 vět).
Zahrnuj:
1. Úvodní téma měsíce a celkovou energii
2. Oblast lásky, vztahů a emocí
3. Kariéru, finance a materiální záležitosti
4. Zdraví a vitalitu
5. Duchovní růst a osobní rozvoj
6. Klíčová data nebo období (konkrétní dny)
7. Inspirativní zakončení s afirmací
Odpověď česky, inspirativně, hluboce a prakticky.${contextInstruction}`;
        } else {
            periodLabel = 'Denní inspirace';
            periodPrompt = `Jsi laskavý astrologický průvodce.
Napiš denní horoskop pro dané znamení (PŘESNĚ 3-4 věty).
Zahrnuj:
1. Hlavní energii dne
2. Jednu konkrétní radu nebo tip
3. Krátkou afirmaci nebo povzbuzení
Odpověď česky, poeticky a povzbudivě.${contextInstruction}`;
        }

        const today = new Date();
        const message = `Znamení: ${sign}\nDatum: ${today.toLocaleDateString('cs-CZ')}`;

        const response = await callGemini(periodPrompt, message);

        // Save to database cache
        await saveCachedHoroscope(cacheKey, sign, period, response, periodLabel);
        console.log(`💾 Horoscope cached in DB: ${cacheKey}`);

        res.json({ success: true, response, period: periodLabel });
    } catch (error) {
        console.error('Horoscope Error:', error);
        res.status(500).json({ success: false, error: 'Předpověď není dostupná...' });
    }
});

// Numerology (PREMIUM ONLY) - WITH DATABASE CACHING
console.log(`🔢 Numerology cache: Using database storage (persistent)`);

// Get cached numerology from database
async function getCachedNumerology(cacheKey) {
    try {
        const { data, error } = await supabase
            .from('cache_numerology')
            .select('*')
            .eq('cache_key', cacheKey)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null; // Not found
            throw error;
        }

        return data;
    } catch (e) {
        console.warn('Numerology cache get error:', e.message);
        return null;
    }
}

// Save numerology to database cache
async function saveCachedNumerology(cacheKey, inputs, response) {
    try {
        const { error } = await supabase
            .from('cache_numerology')
            .upsert({
                cache_key: cacheKey,
                name: inputs.name,
                birth_date: inputs.birthDate,
                birth_time: inputs.birthTime,
                life_path: inputs.lifePath,
                destiny: inputs.destiny,
                soul: inputs.soul,
                personality: inputs.personality,
                response,
                generated_at: new Date().toISOString()
            }, {
                onConflict: 'cache_key'
            });

        if (error) throw error;
    } catch (e) {
        console.warn('Numerology cache save error:', e.message);
    }
}

app.post('/api/numerology', authenticateToken, requirePremium, async (req, res) => {
    try {
        const { name, birthDate, birthTime, lifePath, destiny, soul, personality } = req.body;

        // Create cache key from inputs (deterministic)
        const cacheKey = crypto.createHash('md5')
            .update(`${name}_${birthDate}_${birthTime || 'notime'}_${lifePath}_${destiny}_${soul}_${personality}`)
            .digest('hex');

        // Check database cache first
        const cachedData = await getCachedNumerology(cacheKey);
        if (cachedData) {
            console.log(`📦 Numerology Cache HIT (DB): ${cacheKey}`);
            return res.json({
                success: true,
                response: cachedData.response,
                cached: true
            });
        }

        console.log(`🔄 Numerology Cache MISS: ${cacheKey} - Generating new interpretation...`);

        const message = `Jméno: ${name}
Datum narození: ${birthDate}${birthTime ? `\nČas narození: ${birthTime}` : ''}

Vypočítaná čísla:
- Číslo životní cesty: ${lifePath}
- Číslo osudu: ${destiny}
- Číslo duše: ${soul}
- Číslo osobnosti: ${personality}

Vytvoř komplexní interpretaci tohoto numerologického profilu.${birthTime ? ' Vezmi v potaz i čas narození pro hlubší výklad.' : ''}`;

        const response = await callGemini(SYSTEM_PROMPTS.numerology, message);

        // Save to database cache
        const inputs = { name, birthDate, birthTime, lifePath, destiny, soul, personality };
        await saveCachedNumerology(cacheKey, inputs, response);
        console.log(`💾 Numerology cached in DB: ${cacheKey}`);

        res.json({ success: true, response });
    } catch (error) {
        console.error('Numerology Error:', error);
        res.status(500).json({ success: false, error: 'Čísla momentálně nemohou promluvit...' });
    }
});

// Astrocartography (requires auth)
app.post('/api/astrocartography', authenticateToken, async (req, res) => {
    try {
        const { birthDate, birthTime, birthPlace, name, intention = 'obecný' } = req.body;

        if (!birthDate || typeof birthDate !== 'string') {
            return res.status(400).json({ success: false, error: 'Datum narození je povinné.' });
        }

        const safeName = String(name || 'Tazatel').substring(0, 100);
        const safeBirthDate = String(birthDate).substring(0, 30);
        const safeBirthTime = String(birthTime || '').substring(0, 20);
        const safeBirthPlace = String(birthPlace || '').substring(0, 200);
        const safeIntention = String(intention).substring(0, 200);

        const message = `Jméno: ${safeName}
Datum narození: ${safeBirthDate}
Čas narození: ${safeBirthTime}
Místo narození: ${safeBirthPlace}
Záměr analýzy: ${safeIntention}

Vytvoř personalizovanou astrokartografickou mapu s doporučenými lokalitami.`;

        const response = await callGemini(SYSTEM_PROMPTS.astrocartography, message);
        res.json({ success: true, response });
    } catch (error) {
        console.error('Astrocartography Error:', error.message);
        res.status(500).json({ success: false, error: 'Planetární linie jsou momentálně zahaleny mlhou...' });
    }
});

// ============================================
// ROUTES
// ============================================

// Duplicate route registrations removed - all routes use /api/ prefix with rate limiting

// Admin routes handled by adminRoutes module (mounted at /api/admin above)

// ============================================
// USER READINGS API
// ============================================

// Get user's reading history (with pagination)
app.get('/api/user/readings', authenticateToken, async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
        const offset = (page - 1) * limit;

        // Get total count for pagination metadata
        const { count, error: countError } = await supabase
            .from('readings')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', req.user.id);

        if (countError) throw countError;

        const { data, error } = await supabase
            .from('readings')
            .select('*')
            .eq('user_id', req.user.id)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) throw error;

        res.json({
            success: true,
            readings: data || [],
            pagination: {
                page,
                limit,
                total: count || 0,
                totalPages: Math.ceil((count || 0) / limit)
            }
        });
    } catch (error) {
        console.error('Get Readings Error:', error);
        res.status(500).json({ success: false, error: 'Nepodařilo se načíst historii.' });
    }
});

// Save a new reading
app.post('/api/user/readings', authenticateToken, async (req, res) => {
    try {
        const { type, data: readingData } = req.body;

        if (!type || !readingData) {
            return res.status(400).json({ error: 'Type and data are required.' });
        }

        const { data, error } = await supabase
            .from('readings')
            .insert({
                user_id: req.user.id,
                type,
                data: readingData
            })
            .select()
            .single();

        if (error) throw error;

        res.json({ success: true, reading: data });
    } catch (error) {
        console.error('Save Reading Error:', error);
        res.status(500).json({ success: false, error: 'Nepodařilo se uložit výklad.' });
    }
});

// Get single reading by ID
app.get('/api/user/readings/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabase
            .from('readings')
            .select('*')
            .eq('id', id)
            .eq('user_id', req.user.id)
            .single();

        if (error) throw error;

        if (!data) {
            return res.status(404).json({ success: false, error: 'Výklad nenalezen.' });
        }

        res.json({ success: true, reading: data });
    } catch (error) {
        console.error('Get Reading Error:', error);
        res.status(500).json({ success: false, error: 'Nepodařilo se načíst výklad.' });
    }
});

// Toggle reading favorite status
app.patch('/api/user/readings/:id/favorite', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        // First get current state
        const { data: current, error: fetchError } = await supabase
            .from('readings')
            .select('is_favorite')
            .eq('id', id)
            .eq('user_id', req.user.id)
            .single();

        if (fetchError) throw fetchError;

        if (!current) {
            return res.status(404).json({ success: false, error: 'Výklad nenalezen.' });
        }

        // Toggle the favorite status
        const newStatus = !current.is_favorite;

        const { data, error } = await supabase
            .from('readings')
            .update({ is_favorite: newStatus })
            .eq('id', id)
            .eq('user_id', req.user.id)
            .select()
            .single();

        if (error) throw error;

        res.json({ success: true, is_favorite: data.is_favorite });
    } catch (error) {
        console.error('Toggle Favorite Error:', error);
        res.status(500).json({ success: false, error: 'Nepodařilo se změnit oblíbené.' });
    }
});

// Delete a reading
app.delete('/api/user/readings/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('readings')
            .delete()
            .eq('id', id)
            .eq('user_id', req.user.id); // Ensure user owns the reading

        if (error) throw error;

        res.json({ success: true });
    } catch (error) {
        console.error('Delete Reading Error:', error);
        res.status(500).json({ success: false, error: 'Nepodařilo se smazat výklad.' });
    }
});

// Change user password (requires current password verification)
app.put('/api/user/password', sensitiveOpLimiter, authenticateToken, async (req, res) => {
    try {
        const { currentPassword, password } = req.body;

        if (!currentPassword) {
            return res.status(400).json({ success: false, error: 'Zadejte prosím aktuální heslo.' });
        }

        if (!password || password.length < 8) {
            return res.status(400).json({ success: false, error: 'Nové heslo musí mít alespoň 8 znaků.' });
        }

        // Verify current password first
        const { error: authError } = await supabase.auth.signInWithPassword({
            email: req.user.email,
            password: currentPassword
        });

        if (authError) {
            return res.status(403).json({ success: false, error: 'Aktuální heslo je nesprávné.' });
        }

        // Use Supabase Admin to update password
        const { error } = await supabase.auth.admin.updateUserById(
            req.user.id,
            { password: password }
        );

        if (error) throw error;

        res.json({ success: true, message: 'Heslo bylo úspěšně změněno.' });
    } catch (error) {
        console.error('Password Change Error:', error);
        res.status(500).json({ success: false, error: 'Nepodařilo se změnit heslo.' });
    }
});

// Health Check Endpoint (for monitoring/load balancers)
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString()
    });
});

// Start server ONLY if run directly (not imported for tests)
// Start server ONLY if run directly (not imported for tests)
// We compare the resolved paths to be safe on Windows
if (process.argv[1] === __filename) {
    app.listen(PORT, () => {
        console.log(`✨ Mystická Hvězda API running on http://localhost:${PORT}`);
        console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`🔮 Endpoints available:`);
        console.log(`   POST /api/crystal-ball`);
        console.log(`   POST /api/tarot`);
        console.log(`   POST /api/natal-chart`);
        console.log(`   POST /api/synastry`);
        console.log(`   POST /api/horoscope`);
        console.log(`   POST /api/astrocartography`);
        console.log(`   GET  /api/health`);
    });
}

export default app;
