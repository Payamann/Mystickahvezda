/**
 * Medicine Wheel Route
 * POST /api/medicine-wheel
 * Premium only — generates a medicine wheel spiritual reading via Gemini AI
 */
import express from 'express';
import crypto from 'crypto';
import { authenticateToken, requirePremium } from '../middleware.js';
import { callGemini } from '../services/gemini.js';
import { supabase } from '../db-supabase.js';

export const router = express.Router();

const SYSTEM_PROMPT = `Jsi moudrý šaman indiánských národů Severní Ameriky, který čte Medicínské Kolečko.
Na základě jména, data narození a totemového zvířete odhal duchovní cestu dané osoby.

Odpověz POUZE ve formátu JSON (bez markdown, bez backticks), přesně takto:
{
  "strengths": "Duchovní silné stránky tohoto totemu — co přináší osobě v životě, jaké má přirozené dary a schopnosti (2-3 věty)",
  "challenges": "Výzvy a lekcí na životní cestě, které tento totem přináší — co musí osoba překonat nebo přijmout (2-3 věty)",
  "message": "Osobní poselství od totemu — inspirativní, hluboké duchovní sdělení přímo pro tuto osobu (2 věty)"
}

Buď konkrétní, mystický a povznášející. Odpovídej vždy česky.
Zmiňuj totemové zvíře přirozeně v textu. Zachovej vážný, duchovní tón.`;

async function getCached(cacheKey) {
    try {
        const { data, error } = await supabase
            .from('cache_medicine_wheel')
            .select('response')
            .eq('cache_key', cacheKey)
            .single();
        if (error?.code === 'PGRST116') return null;
        if (error) throw error;
        return data?.response || null;
    } catch (e) {
        console.warn('[MedicineWheel] Cache get error:', e.message);
        return null;
    }
}

async function saveCache(cacheKey, name, birthDate, totem, response) {
    try {
        await supabase.from('cache_medicine_wheel').upsert({
            cache_key: cacheKey,
            name,
            birth_date: birthDate,
            totem,
            response,
            generated_at: new Date().toISOString()
        }, { onConflict: 'cache_key' });
    } catch (e) {
        console.warn('[MedicineWheel] Cache save error:', e.message);
    }
}

router.post('/', authenticateToken, requirePremium, async (req, res) => {
    try {
        const { name, birthDate, totem } = req.body;

        if (!name || typeof name !== 'string' || name.trim().length < 2) {
            return res.status(400).json({ success: false, error: 'Zadejte své jméno.' });
        }
        if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
            return res.status(400).json({ success: false, error: 'Zadejte datum narození.' });
        }
        if (!totem || typeof totem !== 'string') {
            return res.status(400).json({ success: false, error: 'Nepodařilo se určit váš totem.' });
        }

        const cleanName = name.trim().substring(0, 80);
        const cleanTotem = totem.trim().substring(0, 30);
        const cacheKey = crypto.createHash('sha256')
            .update(`mw|${cleanName}|${birthDate}|${cleanTotem}`)
            .digest('hex')
            .substring(0, 32);

        const cached = await getCached(cacheKey);
        if (cached) {
            return res.json({ success: true, result: cached, cached: true });
        }

        const userMsg = `Jméno: ${cleanName}
Datum narození: ${birthDate}
Totemové zvíře: ${cleanTotem}

Přečti duchovní cestu tohoto člověka na Medicínském Kolečku.`;

        const raw = await callGemini(SYSTEM_PROMPT, userMsg);

        let result;
        try {
            const jsonMatch = raw.match(/\{[\s\S]*\}/);
            result = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
        } catch (e) {
            console.error('[MedicineWheel] JSON parse error:', e.message, 'Raw:', raw?.substring(0, 200));
            return res.status(500).json({ success: false, error: 'Medicínské Kolečko je dočasně nedostupné. Zkuste to prosím znovu.' });
        }

        const required = ['strengths', 'challenges', 'message'];
        for (const field of required) {
            if (!result[field]) {
                return res.status(500).json({ success: false, error: 'Neúplná odpověď z Medicínského Kolečka.' });
            }
        }

        await saveCache(cacheKey, cleanName, birthDate, cleanTotem, result);

        res.json({ success: true, result, cached: false });

    } catch (err) {
        console.error('[MedicineWheel] Error:', err.message);
        res.status(500).json({ success: false, error: 'Chyba serveru. Zkuste to prosím znovu.' });
    }
});

export default router;
