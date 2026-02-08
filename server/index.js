import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
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
import { authenticateToken, requirePremium, requireAdmin } from './middleware.js';
import { supabase } from './db-supabase.js';
import { callGemini } from './services/gemini.js';
import { SYSTEM_PROMPTS } from './config/prompts.js';
import { calculateMoonPhase, getHoroscopeCacheKey, getCachedHoroscope, saveCachedHoroscope } from './services/astrology.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// ============================================
// MIDDLEWARE
// ============================================

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

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// Security Headers
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

// Global rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter);

// Stricter rate limit for AI-powered endpoints
const aiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Příliš mnoho požadavků. Zkuste to za chvíli.' }
});

app.use(compression());
app.use(xss());

// Dev: disable static file caching
if (process.env.NODE_ENV !== 'production') {
    app.use((req, res, next) => {
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
        next();
    });
}

// Serve static files
const staticOptions = process.env.NODE_ENV === 'production'
    ? { maxAge: '1y', immutable: true }
    : {};
app.use(express.static(path.join(__dirname, '../'), staticOptions));

// ============================================
// ROUTE MODULES (mounted once)
// ============================================

app.use('/api/auth', authRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/mentor', mentorRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/admin', adminRoutes);

// ============================================
// NUMEROLOGY CACHE HELPERS
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

// ============================================
// API ENDPOINTS
// ============================================

// Crystal Ball Oracle (free)
app.post('/api/crystal-ball', aiLimiter, async (req, res) => {
    try {
        const { question, history = [] } = req.body;

        if (!question || typeof question !== 'string' || question.length > 500) {
            return res.status(400).json({ success: false, error: 'Neplatná otázka.' });
        }

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

// Tarot Reading (freemium)
app.post('/api/tarot', aiLimiter, authenticateToken, async (req, res) => {
    try {
        const { question, cards, spreadType = 'tříkartový' } = req.body;

        if (!question || typeof question !== 'string') {
            return res.status(400).json({ success: false, error: 'Otázka je povinná.' });
        }
        if (!Array.isArray(cards) || cards.length === 0) {
            return res.status(400).json({ success: false, error: 'Karty jsou povinné.' });
        }

        const userId = req.user.id;
        const premium = await isPremiumUser(userId);

        // Free users can only do 1-card spreads
        if (!premium && cards.length > 1) {
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

// Tarot Summary
app.post('/api/tarot-summary', aiLimiter, async (req, res) => {
    try {
        const { cards, spreadType } = req.body;

        if (!Array.isArray(cards) || cards.length === 0 || !spreadType) {
            return res.status(400).json({ success: false, error: 'Karty a typ výkladu jsou povinné.' });
        }

        let cardContext = cards.map(c => `${c.position}: ${c.name} (${c.meaning})`).join(', ');
        const message = `Typ výkladu: ${spreadType}\n\nKarty v kontextu pozic:\n${cardContext}\n\nVytvoř krásný, hluboký souhrn tohoto výkladu.`;

        const response = await callGemini(SYSTEM_PROMPTS.tarotSummary, message);
        res.json({ success: true, response });
    } catch (error) {
        console.error('Tarot Summary Error:', error);
        res.status(500).json({ success: false, error: 'Hlas vesmíru je nyní tichý...' });
    }
});

// Natal Chart Analysis (free)
app.post('/api/natal-chart', aiLimiter, async (req, res) => {
    try {
        const { birthDate, birthTime, birthPlace, name } = req.body;

        if (!birthDate || !birthPlace) {
            return res.status(400).json({ success: false, error: 'Datum a místo narození jsou povinné.' });
        }

        const message = `Jméno: ${name || 'Tazatel'}\nDatum narození: ${birthDate}\nČas narození: ${birthTime}\nMísto narození: ${birthPlace}`;
        const response = await callGemini(SYSTEM_PROMPTS.natalChart, message);
        res.json({ success: true, response });
    } catch (error) {
        console.error('Natal Chart Error:', error);
        res.status(500).json({ success: false, error: 'Hvězdy nejsou v tuto chvíli čitelné...' });
    }
});

// Synastry / Compatibility (freemium teaser)
app.post('/api/synastry', aiLimiter, authenticateToken, async (req, res) => {
    try {
        const { person1, person2 } = req.body;

        if (!person1?.name || !person1?.birthDate || !person2?.name || !person2?.birthDate) {
            return res.status(400).json({ success: false, error: 'Data obou osob jsou povinná.' });
        }

        const userId = req.user.id;
        const premium = await isPremiumUser(userId);

        if (!premium) {
            return res.json({
                success: true,
                isTeaser: true,
                response: null
            });
        }

        const message = `Osoba A: ${person1.name}, narozena ${person1.birthDate}\nOsoba B: ${person2.name}, narozena ${person2.birthDate}`;
        const response = await callGemini(SYSTEM_PROMPTS.synastry, message);
        res.json({ success: true, response, isTeaser: false });
    } catch (error) {
        console.error('Synastry Error:', error);
        res.status(500).json({ success: false, error: 'Hvězdná spojení jsou dočasně zahalena...' });
    }
});

// Horoscope (free, cached)
app.post('/api/horoscope', aiLimiter, async (req, res) => {
    try {
        const { sign, period = 'daily', context = [] } = req.body;

        if (!sign || typeof sign !== 'string') {
            return res.status(400).json({ success: false, error: 'Znamení je povinné.' });
        }

        const contextHash = context.length > 0 ? Buffer.from(context.join('')).toString('base64').substring(0, 10) : 'nocontext';
        const cacheKey = getHoroscopeCacheKey(sign, period) + `-${contextHash}`;

        const cachedData = await getCachedHoroscope(cacheKey);
        if (cachedData) {
            return res.json({
                success: true,
                response: cachedData.response,
                period: cachedData.period_label,
                cached: true
            });
        }

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

        await saveCachedHoroscope(cacheKey, sign, period, response, periodLabel);

        res.json({ success: true, response, period: periodLabel });
    } catch (error) {
        console.error('Horoscope Error:', error);
        res.status(500).json({ success: false, error: 'Předpověď není dostupná...' });
    }
});

// Numerology (premium only, cached)
app.post('/api/numerology', aiLimiter, authenticateToken, requirePremium, async (req, res) => {
    try {
        const { name, birthDate, birthTime, lifePath, destiny, soul, personality } = req.body;

        if (!name || !birthDate) {
            return res.status(400).json({ success: false, error: 'Jméno a datum narození jsou povinné.' });
        }

        const cacheKey = crypto.createHash('md5')
            .update(`${name}_${birthDate}_${birthTime || 'notime'}_${lifePath}_${destiny}_${soul}_${personality}`)
            .digest('hex');

        const cachedData = await getCachedNumerology(cacheKey);
        if (cachedData) {
            return res.json({
                success: true,
                response: cachedData.response,
                cached: true
            });
        }

        const message = `Jméno: ${name}
Datum narození: ${birthDate}${birthTime ? `\nČas narození: ${birthTime}` : ''}

Vypočítaná čísla:
- Číslo životní cesty: ${lifePath}
- Číslo osudu: ${destiny}
- Číslo duše: ${soul}
- Číslo osobnosti: ${personality}

Vytvoř komplexní interpretaci tohoto numerologického profilu.${birthTime ? ' Vezmi v potaz i čas narození pro hlubší výklad.' : ''}`;

        const response = await callGemini(SYSTEM_PROMPTS.numerology, message);

        const inputs = { name, birthDate, birthTime, lifePath, destiny, soul, personality };
        await saveCachedNumerology(cacheKey, inputs, response);

        res.json({ success: true, response });
    } catch (error) {
        console.error('Numerology Error:', error);
        res.status(500).json({ success: false, error: 'Čísla momentálně nemohou promluvit...' });
    }
});

// Astrocartography (free)
app.post('/api/astrocartography', aiLimiter, async (req, res) => {
    try {
        const { birthDate, birthTime, birthPlace, name, intention = 'obecný' } = req.body;

        if (!birthDate || !birthPlace) {
            return res.status(400).json({ success: false, error: 'Datum a místo narození jsou povinné.' });
        }

        const message = `Jméno: ${name || 'Tazatel'}
Datum narození: ${birthDate}
Čas narození: ${birthTime}
Místo narození: ${birthPlace}
Záměr analýzy: ${intention}

Vytvoř personalizovanou astrokartografickou mapu s doporučenými lokalitami.`;

        const response = await callGemini(SYSTEM_PROMPTS.astrocartography, message);
        res.json({ success: true, response });
    } catch (error) {
        console.error('Astrocartography Error:', error.message);
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
            return res.status(400).json({ success: false, error: 'Typ a data výkladu jsou povinné.' });
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

// Health Check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Start server only if run directly (not imported for tests)
if (process.argv[1] === __filename) {
    app.listen(PORT, () => {
        console.log(`Mystická Hvězda API running on http://localhost:${PORT}`);
        console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
}

export default app;
