import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import xss from 'xss-clean';
import compression from 'compression';
import { fileURLToPath } from 'url';
import path from 'path';

// Auth, DB & Services
import authRoutes from './auth.js';
import newsletterRoutes from './newsletter.js';
import paymentRoutes, { handleStripeWebhook, isPremiumUser } from './payment.js';
import mentorRoutes from './mentor.js';
import adminRoutes from './admin.js';
import { authenticateToken, requirePremium, requirePremiumSoft, requireAdmin } from './middleware.js';
import { SYSTEM_PROMPTS } from './config/prompts.js';
import { calculateMoonPhase, getHoroscopeCacheKey, getCachedHoroscope, saveCachedHoroscope } from './services/astrology.js';
import { callGemini } from './services/gemini.js';
import { supabase } from './db-supabase.js';

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

// Increase payload limit for complex requests
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

// ============================================
// RATE LIMITING (Granular)
// ============================================

// Global safety net
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', globalLimiter);

// Auth endpoints (login/register) - tighter limit to prevent brute-force
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { error: 'Příliš mnoho pokusů o přihlášení. Zkuste to později.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// AI-generation endpoints - expensive, limit more aggressively
const aiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    message: { error: 'Příliš mnoho požadavků. Zkuste to za chvíli.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Gzip Compression
app.use(compression());

// XSS Protection
app.use(xss());

console.log(`🔮 Horoscope cache: Using database storage (persistent)`);
console.log(`🔢 Numerology cache: Using database storage (persistent)`);

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

// ============================================
// ROUTE MODULES
// ============================================

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/mentor', mentorRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/admin', adminRoutes);

// ============================================
// API ENDPOINTS
// ============================================

// Crystal Ball Oracle
app.post('/api/crystal-ball', aiLimiter, async (req, res) => {
    try {
        const { question, history = [] } = req.body;

        if (!question || typeof question !== 'string') {
            return res.status(400).json({ success: false, error: 'Otázka je povinná.' });
        }

        let contextMessage = question.substring(0, 500);
        if (Array.isArray(history) && history.length > 0) {
            const safeHistory = history.slice(0, 20).map(h => String(h).substring(0, 200));
            contextMessage = `Předchozí otázky v této seanci: ${safeHistory.join(', ')}\n\nNová otázka: ${contextMessage}`;
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
app.post('/api/tarot', aiLimiter, authenticateToken, async (req, res) => {
    try {
        const { question, cards, spreadType = 'tříkartový' } = req.body;
        const userId = req.user.id;

        if (!question || typeof question !== 'string') {
            return res.status(400).json({ success: false, error: 'Otázka je povinná.' });
        }
        if (!Array.isArray(cards) || cards.length === 0 || cards.length > 10) {
            return res.status(400).json({ success: false, error: 'Karty musí být pole 1-10 prvků.' });
        }

        // Check limits
        const premium = await isPremiumUser(userId);

        // Free users can only do 1-card spreads
        if (!premium && cards.length > 1) {
            return res.status(403).json({
                success: false,
                error: 'Komplexní výklady jsou dostupné pouze pro Hvězdné Průvodce (Premium).',
                code: 'PREMIUM_REQUIRED'
            });
        }

        const safeQuestion = String(question).substring(0, 500);
        const safeCards = cards.map(c => String(c).substring(0, 100));
        const safeSpread = String(spreadType).substring(0, 50);
        const message = `Typ výkladu: ${safeSpread}\nOtázka: "${safeQuestion}"\nVytažené karty: ${safeCards.join(', ')}`;

        const response = await callGemini(SYSTEM_PROMPTS.tarot, message);
        res.json({ success: true, response });
    } catch (error) {
        console.error('Tarot Error:', error);
        res.status(500).json({ success: false, error: 'Karty odmítají promluvit...' });
    }
});

// Tarot Summary
app.post('/api/tarot-summary', aiLimiter, async (req, res) => {
    try {
        const { cards, spreadType } = req.body;

        if (!Array.isArray(cards) || cards.length === 0 || cards.length > 10) {
            return res.status(400).json({ success: false, error: 'Karty musí být pole 1-10 prvků.' });
        }

        let cardContext = cards.map(c => {
            const pos = String(c.position || '').substring(0, 100);
            const name = String(c.name || '').substring(0, 100);
            const meaning = String(c.meaning || '').substring(0, 200);
            return `${pos}: ${name} (${meaning})`;
        }).join(', ');
        const safeSpread = String(spreadType || '').substring(0, 50);
        const message = `Typ výkladu: ${safeSpread}\n\nKarty v kontextu pozic:\n${cardContext}\n\nVytvoř krásný, hluboký souhrn tohoto výkladu.`;

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
        const message = `Jméno: ${safeName}\nDatum narození: ${safeBirthDate}\nČas narození: ${safeBirthTime}\nMísto narození: ${safeBirthPlace}`;

        const response = await callGemini(SYSTEM_PROMPTS.natalChart, message);
        res.json({ success: true, response });
    } catch (error) {
        console.error('Natal Chart Error:', error);
        res.status(500).json({ success: false, error: 'Hvězdy nejsou v tuto chvíli čitelné...' });
    }
});

// Synastry / Compatibility (FREEMIUM TEASER)
app.post('/api/synastry', aiLimiter, authenticateToken, async (req, res) => {
    try {
        const { person1, person2 } = req.body;
        const userId = req.user.id;

        if (!person1 || !person2 || !person1.name || !person2.name) {
            return res.status(400).json({ success: false, error: 'Data obou osob jsou povinná.' });
        }

        // Check premium status
        const premium = await isPremiumUser(userId);

        // If NOT premium, return simplified response (Teaser Mode)
        if (!premium) {
            return res.json({
                success: true,
                isTeaser: true,
                response: null
            });
        }

        // Premium Logic (Full Analysis)
        const safeName1 = String(person1.name).substring(0, 100);
        const safeName2 = String(person2.name).substring(0, 100);
        const safeBD1 = String(person1.birthDate || '').substring(0, 30);
        const safeBD2 = String(person2.birthDate || '').substring(0, 30);
        const message = `Osoba A: ${safeName1}, narozena ${safeBD1}\nOsoba B: ${safeName2}, narozena ${safeBD2}`;
        const response = await callGemini(SYSTEM_PROMPTS.synastry, message);

        res.json({ success: true, response, isTeaser: false });
    } catch (error) {
        console.error('Synastry Error:', error);
        res.status(500).json({ success: false, error: 'Hvězdná spojení jsou dočasně zahalena...' });
    }
});

// Horoscope (Daily, Weekly, Monthly) - WITH DATABASE CACHING
const VALID_ZODIAC_SIGNS = ['beran', 'býk', 'blíženci', 'rak', 'lev', 'panna', 'váhy', 'štír', 'střelec', 'kozoroh', 'vodnář', 'ryby'];
const VALID_PERIODS = ['daily', 'weekly', 'monthly'];

app.post('/api/horoscope', aiLimiter, async (req, res) => {
    try {
        const { sign, period = 'daily', context = [] } = req.body;

        if (!sign || typeof sign !== 'string') {
            return res.status(400).json({ success: false, error: 'Znamení je povinné.' });
        }
        if (!VALID_PERIODS.includes(period)) {
            return res.status(400).json({ success: false, error: 'Neplatné období.' });
        }

        // Generate cache key (include context hash to avoid stale cache if context changes)
        const safeContext = Array.isArray(context) ? context.slice(0, 10).map(c => String(c).substring(0, 200)) : [];
        const contextHash = safeContext.length > 0 ? Buffer.from(safeContext.join('')).toString('base64').substring(0, 10) : 'nocontext';
        const cacheKey = getHoroscopeCacheKey(sign, period) + `-${contextHash}`;

        // Check database cache first
        const cachedData = await getCachedHoroscope(cacheKey);
        if (cachedData) {
            return res.json({
                success: true,
                response: cachedData.response,
                period: cachedData.period_label,
                cached: true
            });
        }

        // Dynamic prompt based on period
        let periodPrompt;
        let periodLabel;
        let contextInstruction = "";

        if (safeContext.length > 0) {
            contextInstruction = `
CONTEXT (Z uživatelova deníku):
"${safeContext.join('", "')}"
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

        res.json({ success: true, response, period: periodLabel });
    } catch (error) {
        console.error('Horoscope Error:', error);
        res.status(500).json({ success: false, error: 'Předpověď není dostupná...' });
    }
});

// ============================================
// NUMEROLOGY (PREMIUM ONLY) - WITH DATABASE CACHING
// ============================================

async function getCachedNumerology(cacheKey) {
    try {
        const { data, error } = await supabase
            .from('cache_numerology')
            .select('*')
            .eq('cache_key', cacheKey)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null;
            throw error;
        }

        return data;
    } catch (e) {
        console.warn('Numerology cache get error:', e.message);
        return null;
    }
}

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

app.post('/api/numerology', aiLimiter, authenticateToken, requirePremium, async (req, res) => {
    try {
        const { name, birthDate, birthTime, lifePath, destiny, soul, personality } = req.body;

        if (!name || typeof name !== 'string' || !birthDate || typeof birthDate !== 'string') {
            return res.status(400).json({ success: false, error: 'Jméno a datum narození jsou povinné.' });
        }

        const safeName = String(name).substring(0, 100);
        const safeBirthDate = String(birthDate).substring(0, 30);
        const safeBirthTime = birthTime ? String(birthTime).substring(0, 20) : null;

        // Create cache key from inputs (deterministic)
        const crypto = await import('crypto');
        const cacheKey = crypto.createHash('md5')
            .update(`${safeName}_${safeBirthDate}_${safeBirthTime || 'notime'}_${lifePath}_${destiny}_${soul}_${personality}`)
            .digest('hex');

        // Check database cache first
        const cachedData = await getCachedNumerology(cacheKey);
        if (cachedData) {
            return res.json({
                success: true,
                response: cachedData.response,
                cached: true
            });
        }

        const message = `Jméno: ${safeName}
Datum narození: ${safeBirthDate}${safeBirthTime ? `\nČas narození: ${safeBirthTime}` : ''}

Vypočítaná čísla:
- Číslo životní cesty: ${lifePath}
- Číslo osudu: ${destiny}
- Číslo duše: ${soul}
- Číslo osobnosti: ${personality}

Vytvoř komplexní interpretaci tohoto numerologického profilu.${safeBirthTime ? ' Vezmi v potaz i čas narození pro hlubší výklad.' : ''}`;

        const response = await callGemini(SYSTEM_PROMPTS.numerology, message);

        // Save to database cache
        const inputs = { name: safeName, birthDate: safeBirthDate, birthTime: safeBirthTime, lifePath, destiny, soul, personality };
        await saveCachedNumerology(cacheKey, inputs, response);

        res.json({ success: true, response });
    } catch (error) {
        console.error('Numerology Error:', error);
        res.status(500).json({ success: false, error: 'Čísla momentálně nemohou promluvit...' });
    }
});

// Astrocartography
app.post('/api/astrocartography', aiLimiter, async (req, res) => {
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
        console.error('Astrocartography Error:', error);
        res.status(500).json({ success: false, error: 'Planetární linie jsou momentálně zahaleny mlhou...' });
    }
});

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
            .eq('user_id', req.user.id);

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

// Health Check Endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Start server ONLY if run directly (not imported for tests)
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
