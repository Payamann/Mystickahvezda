import express from 'express';
import { calculateMoonPhase } from './services/astrology.js';
import { supabase } from './db-supabase.js';
import { authenticateToken, requirePremiumSoft } from './middleware.js';
import { callGemini } from './services/gemini.js';
import { SYSTEM_PROMPTS } from './config/prompts.js';

const router = express.Router();

// ... (imports remain)

// POST /chat - Chat with Mentor (PREMIUM ONLY)
router.post('/chat', authenticateToken, requirePremiumSoft, async (req, res) => {
    try {
        const { message } = req.body;
        const userId = req.user.id;

        if (!message) {
            return res.status(400).json({ error: 'Zpráva chybí.' });
        }

        console.log(`[Mentor] Request received from user ${userId}`);

        // 1. Fetch User Profile
        let userContext = {};
        try {
            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (profile) {
                userContext = {
                    name: profile.name,
                    birthDate: profile.birth_date,
                    zodiacSign: profile.zodiac_sign
                };
            }
        } catch (e) {
            console.warn('[Mentor] Could not fetch profile for context', e);
        }

        // 2. Fetch Chat History (Last 10 messages)
        let history = [];
        try {
            // ... (history fetching logic remains same)
            const { data: msgs } = await supabase
                .from('mentor_messages')
                .select('role, content')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(10);

            if (msgs) {
                history = msgs.reverse();
            }
        } catch (e) {
            console.warn('[Mentor] Could not fetch chat history', e);
        }

        // 3. Fetch Recent App Context (Last 5 readings)
        // ENHANCED: Get more detail and more items
        let appContext = "";
        try {
            const { data: readings } = await supabase
                .from('readings')
                .select('type, created_at, data')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(5);

            if (readings && readings.length > 0) {
                const contextItems = readings.map(r => {
                    const date = new Date(r.created_at).toLocaleDateString('cs-CZ');
                    let summary = r.type;

                    // Detailed extraction
                    if (r.type === 'tarot') {
                        // Extract cards with positions if available
                        const cards = r.data.cards || [];
                        const cardDetails = cards.map(c => {
                            if (typeof c === 'object') return `${c.position || ''}: ${c.name} (${c.meaning || ''})`;
                            return c; // legacy string array
                        }).join(', ');
                        summary = `Tarot výklad (${r.data.spreadType || 'Neznámý typ'}): ${cardDetails}`;
                        if (r.data.response) summary += `\n   -> AI Shrnutí: "${r.data.response.substring(0, 100)}..."`;

                    } else if (r.type === 'crystal-ball') {
                        summary = `Křišťálová koule: Otázka "${r.data.question}" -> Odpověď: "${r.data.response ? r.data.response.substring(0, 50) + '...' : ''}"`;

                    } else if (r.type === 'numerology') {
                        summary = `Numerologie: Životní číslo ${r.data.lifePath}, Osudové číslo ${r.data.destiny}`;

                    } else if (r.type === 'horoscope') {
                        summary = `Horoskop (${r.data.period}): Znamení ${r.data.sign}`;
                    }

                    return `[${date}] ${summary}`;
                });

                // Add Moon Phase
                const moonPhase = calculateMoonPhase();

                appContext = `
AKTUÁLNÍ ASTRONOMICKÁ SITUACE:
- Fáze měsíce: ${moonPhase}

HISTORIE UŽIVATELOVÝCH VÝKLADŮ (DŮLEŽITÉ - ODKAZUJ NA TO):
${contextItems.join('\n')}

(Pokud se uživatel ptá na radu, podívej se, zda nedávný výklad (např. Tarot) nenabízí odpověď. SPOJUJ SOUVISLOSTI.)`;
            }
        } catch (e) {
            console.warn('[Mentor] Could not fetch reading context', e);
        }

        // 4. Save User Message to DB
        // ... (saving logic remains same)
        try {
            await supabase.from('mentor_messages').insert({
                user_id: userId,
                role: 'user',
                content: message
            });
        } catch (dbError) { }

        // 5. Generate Response
        console.log('[Mentor] Calling Gemini API with Enhanced Context...');
        const systemPrompt = SYSTEM_PROMPTS.mentor;
        const responseText = await callGemini(
            systemPrompt,
            [...history, { role: 'user', content: message }],
            { userContext, appContext }
        );

        // 6. Save AI Response to DB
        // ... (saving logic remains same)
        try {
            await supabase.from('mentor_messages').insert({
                user_id: userId,
                role: 'mentor',
                content: responseText
            });
        } catch (dbError) { }

        res.json({ success: true, reply: responseText });

    } catch (error) {
        console.error('Mentor Chat API Critical Error:', error);
        res.status(500).json({ error: error.message || 'Spojení s mentorem se nezdařilo.' });
    }
});

// GET /history - Fetch chat history for frontend (PREMIUM ONLY)
router.get('/history', authenticateToken, requirePremiumSoft, async (req, res) => {
    try {
        const userId = req.user.id;

        const { data: msgs, error } = await supabase
            .from('mentor_messages')
            .select('role, content, created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false }) // Get newest first
            .limit(50);

        if (error) throw error;

        // Return oldest first for chat UI
        res.json({ success: true, history: (msgs || []).reverse() });
    } catch (error) {
        console.error('Mentor History Error:', error);
        res.status(500).json({ error: 'Historie se nepodařilo načíst.' });
    }
});

export default router;
