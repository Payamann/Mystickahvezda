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

// Middleware
app.use(cors());

// Stripe Webhook MUST be before express.json() to get raw body
app.post('/webhook/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
    try {
        await handleStripeWebhook(req.body, req.headers['stripe-signature']);
        res.sendStatus(200);
    } catch (err) {
        console.error('[STRIPE] Webhook error:', err.message);
        res.status(400).send(`Webhook Error: ${err.message}`);
    }
});

// Increase payload limit for complex requests (e.g. detailed tarot spreads if needed)
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

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
const staticOptions = process.env.NODE_ENV === 'production'
    ? { maxAge: '1y', immutable: true }
    : {};
app.use(express.static(path.join(__dirname, '../'), staticOptions));

app.use('/api/auth', authRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/mentor', mentorRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/admin', adminRoutes);

// Helper function to call Gemini API
import { callGemini } from './services/gemini.js';

// ============================================
// API ENDPOINTS
// ============================================

// Crystal Ball Oracle
app.post('/api/crystal-ball', async (req, res) => {
    try {
        const { question, history = [] } = req.body;

        let contextMessage = question;
        if (history.length > 0) {
            contextMessage = `Předchozí otázky v této seanci: ${history.join(', ')}\n\nNová otázka: ${question}`;
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
        const isPremium = await import('./payment.js').then(m => m.isPremiumUser(userId));

        // Free users can only do 1-card spreads
        if (!isPremium && cards.length > 1) {
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

// Tarot Summary (NEW)
app.post('/api/tarot-summary', async (req, res) => {
    try {
        const { cards, spreadType } = req.body; // cards expects array of objects { name, position, meaning }

        let cardContext = cards.map(c => `${c.position}: ${c.name} (${c.meaning})`).join(', ');
        const message = `Typ výkladu: ${spreadType}\n\nKarty v kontextu pozic:\n${cardContext}\n\nVytvoř krásný, hluboký souhrn tohoto výkladu.`;

        const response = await callGemini(SYSTEM_PROMPTS.tarotSummary, message);
        res.json({ success: true, response });
    } catch (error) {
        console.error('Tarot Summary Error:', error);
        res.status(500).json({ success: false, error: 'Hlas vesmíru je nyní tichý...' });
    }
});

// Natal Chart Analysis (PREMIUM ONLY)
app.post('/api/natal-chart', async (req, res) => {
    try {
        const { birthDate, birthTime, birthPlace, name } = req.body;
        console.log(`[NatalChart] Request received for ${name}`);

        const message = `Jméno: ${name || 'Tazatel'}\nDatum narození: ${birthDate}\nČas narození: ${birthTime}\nMísto narození: ${birthPlace}`;

        console.log(`[NatalChart] Calling Gemini...`);
        const response = await callGemini(SYSTEM_PROMPTS.natalChart, message);
        console.log(`[NatalChart] Gemini response received (length: ${response.length})`);

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
        const isPremium = await import('./payment.js').then(m => m.isPremiumUser(userId));

        // If NOT premium, return simplified response (Teaser Mode)
        if (!isPremium) {
            console.log(`[Synastry] Free user ${userId} - returning teaser`);
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

// Horoscope (Daily, Weekly, Monthly) - WITH DATABASE CACHING
app.post('/api/horoscope', async (req, res) => {
    try {
        const { sign, period = 'daily', context = [] } = req.body;

        // Generate cache key (include context hash to avoid stale cache if context changes)
        const contextHash = context.length > 0 ? Buffer.from(context.join('')).toString('base64').substring(0, 10) : 'nocontext';
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

        if (context && context.length > 0) {
            contextInstruction = `
CONTEXT (Z uživatelova deníku):
"${context.join('", "')}"
INSTRUKCE PRO SYNERGII: Pokud je to relevantní, jemně a nepřímo nawazuj na témata z deníku. Neříkej "V deníku vidím...", ale spíše "Hvězdy naznačují posun v tématech, která tě trápí...". Buď empatický.`;
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
        const crypto = await import('crypto');
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

// Astrocartography
app.post('/api/astrocartography', async (req, res) => {
    console.log('📍 Astrocartography request received:', req.body);
    try {
        const { birthDate, birthTime, birthPlace, name, intention = 'obecný' } = req.body;

        const message = `Jméno: ${name || 'Tazatel'}
Datum narození: ${birthDate}
Čas narození: ${birthTime}
Místo narození: ${birthPlace}
Záměr analýzy: ${intention}

Vytvoř personalizovanou astrokartografickou mapu s doporučenými lokalitami.`;

        console.log('📍 Calling Gemini with message:', message.substring(0, 100) + '...');
        const response = await callGemini(SYSTEM_PROMPTS.astrocartography, message);
        console.log('📍 Gemini response received, length:', response.length);
        res.json({ success: true, response });
    } catch (error) {
        console.error('📍 Astrocartography Error Details:', error.message);
        console.error('📍 Full error:', error);
        res.status(500).json({ success: false, error: 'Planetární linie jsou momentálně zahaleny mlhou...' });
    }
});

// ============================================
// ROUTES
// ============================================

app.use('/auth', authRoutes);
app.use('/newsletter', newsletterRoutes);
app.use('/api/payment', paymentRoutes);

// ============================================
// ADMIN ROUTES
// ============================================
import { requireAdmin } from './middleware.js';

// Get All Users (Admin)
app.get('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { data: users, error } = await supabase
            .from('users')
            .select(`
                *,
                subscriptions (
                    plan_type,
                    status,
                    current_period_end,
                    credits
                )
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json({ success: true, users });
    } catch (error) {
        console.error('Admin Users Error:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Update User Subscription (Admin)
app.post('/api/admin/user/:id/subscription', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { plan_type, credits } = req.body; // e.g., 'premium_monthly', 'free'

        // Update subscription
        const updateData = {
            plan_type,
            status: 'active',
            credits: credits || (plan_type === 'free' ? 3 : 100),
            current_period_end: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString()
        };

        const { error } = await supabase
            .from('subscriptions')
            .update(updateData)
            .eq('user_id', id);

        if (error) throw error;

        res.json({ success: true, message: `Subscription updated to ${plan_type}` });
    } catch (error) {
        console.error('Admin Update Error:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
});

// Supabase Initialization
import { supabase } from './db-supabase.js';

// ============================================
// USER READINGS API
// ============================================

// Get user's reading history
app.get('/api/user/readings', authenticateToken, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('readings')
            .select('*')
            .eq('user_id', req.user.id)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) throw error;

        res.json({ success: true, readings: data || [] });
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
        res.status(500).json({ success: false, error: 'Nepodařilo se uložit výklad: ' + error.message });
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

// Change user password
app.put('/api/user/password', authenticateToken, async (req, res) => {
    try {
        const { password } = req.body;

        if (!password || password.length < 6) {
            return res.status(400).json({ success: false, error: 'Heslo musí mít alespoň 6 znaků.' });
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
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
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
