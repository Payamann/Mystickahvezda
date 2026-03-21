/**
 * Past Life Route
 * POST /api/past-life
 * Premium only — generates a past life reading via Gemini AI
 */
import express from 'express';
import crypto from 'crypto';
import { authenticateToken, requirePremium } from '../middleware.js';
import { callGemini } from '../services/gemini.js';
import { supabase } from '../db-supabase.js';

export const router = express.Router();

const SYSTEM_PROMPT = `Jsi starověký akashický průvodce, který čte záznamy minulých životů duší.
Tvým úkolem je na základě jména, data narození, místa narození a pohlaví odhalit minulý život dané osoby.
Místo narození použij jako energetický ukazatel — energie místa ovlivňuje karmické vzorce duše.

Odpověz POUZE ve formátu JSON (bez markdown, bez backticks), přesně takto:
{
  "era": "Konkrétní historická epocha a místo (např. Japonsko 12. století, Egypt 1340 př.n.l.)",
  "identity": "Kdo jsi byl/a — povolání, role, postavení ve společnosti (2-3 věty)",
  "karmic_lesson": "Jaká karmická lekce ti zůstala do tohoto života (2-3 věty)",
  "gifts": "Jaké dary a schopnosti sis přinesl/a z minulého života (2-3 věty)",
  "patterns": "Jaké vzorce nebo strachy z minulého života opakuješ i dnes (2-3 věty)",
  "mission": "Co máš v tomto životě vyřešit nebo dokončit (2-3 věty)",
  "message": "Poselství tvé minulé duše tobě dnešnímu — inspirativní závěr (1-2 věty)"
}

Buď konkrétní, mystický a povznášející. Odpovídej vždy česky.
Nikdy nezmiňuj, že jde o fikci nebo zábavu — zachovej vážný, duchovní tón.`;

async function getCached(cacheKey) {
    try {
        const { data, error } = await supabase
            .from('cache_past_life')
            .select('response')
            .eq('cache_key', cacheKey)
            .single();
        if (error?.code === 'PGRST116') return null;
        if (error) throw error;
        return data?.response || null;
    } catch (e) {
        console.warn('[PastLife] Cache get error:', e.message);
        return null;
    }
}

async function saveCache(cacheKey, name, birthDate, gender, response, place = '') {
    try {
        await supabase.from('cache_past_life').upsert({
            cache_key: cacheKey,
            name,
            birth_date: birthDate,
            gender,
            birth_place: place || null,
            response,
            generated_at: new Date().toISOString()
        }, { onConflict: 'cache_key' });
    } catch (e) {
        console.warn('[PastLife] Cache save error:', e.message);
    }
}

router.post('/', authenticateToken, requirePremium, async (req, res) => {
    try {
        const { name, birthDate, gender, place } = req.body;

        if (!name || typeof name !== 'string' || name.trim().length < 2) {
            return res.status(400).json({ success: false, error: 'Zadejte své jméno.' });
        }
        if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
            return res.status(400).json({ success: false, error: 'Zadejte datum narození.' });
        }
        if (!gender || !['muz', 'zena'].includes(gender)) {
            return res.status(400).json({ success: false, error: 'Vyberte pohlaví.' });
        }

        const cleanName = name.trim().substring(0, 80);
        const cleanPlace = (place && typeof place === 'string') ? place.trim().substring(0, 100) : '';
        const cacheKey = crypto.createHash('sha256')
            .update(`${cleanName}|${birthDate}|${gender}|${cleanPlace}`)
            .digest('hex')
            .substring(0, 32);

        // Try cache first
        const cached = await getCached(cacheKey);
        if (cached) {
            return res.json({ success: true, result: cached, cached: true });
        }

        const genderLabel = gender === 'muz' ? 'muž' : 'žena';
        const userMsg = `Jméno: ${cleanName}
Datum narození: ${birthDate}
Místo narození: ${cleanPlace || 'neuvedeno'}
Pohlaví: ${genderLabel}

Odhal minulý život této duše.`;

        const raw = await callGemini(SYSTEM_PROMPT, userMsg);

        // Parse JSON from Gemini response
        let result;
        try {
            const jsonMatch = raw.match(/\{[\s\S]*\}/);
            result = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
        } catch (e) {
            console.error('[PastLife] JSON parse error:', e.message, 'Raw:', raw?.substring(0, 200));
            return res.status(500).json({ success: false, error: 'Akashické záznamy jsou dočasně nedostupné. Zkuste to prosím znovu.' });
        }

        // Validate required fields
        const required = ['era', 'identity', 'karmic_lesson', 'gifts', 'patterns', 'mission', 'message'];
        for (const field of required) {
            if (!result[field]) {
                return res.status(500).json({ success: false, error: 'Neúplná odpověď z akashických záznamů.' });
            }
        }

        await saveCache(cacheKey, cleanName, birthDate, gender, result, cleanPlace);

        res.json({ success: true, result, cached: false });

    } catch (err) {
        console.error('[PastLife] Error:', err.message);
        res.status(500).json({ success: false, error: 'Chyba serveru. Zkuste to prosím znovu.' });
    }
});

export default router;
