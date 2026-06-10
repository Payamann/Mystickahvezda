/**
 * Medicine Wheel Route
 * POST /api/medicine-wheel
 * Premium only — generates a symbolic medicine wheel reading via Claude
 */
import express from 'express';
import crypto from 'crypto';
import { authenticateToken, requireFeature } from '../middleware.js';
import { callClaude } from '../services/claude.js';
import { supabase } from '../db-supabase.js';

export const router = express.Router();

function isValidIsoDate(value) {
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

const SYSTEM_PROMPT = `Jsi moudrý průvodce archetypálním Šamanským kolem.
Pracuješ s univerzální symbolikou směrů, živlů a totemového zvířete pro sebereflexi. Nepředstírej příslušnost ke konkrétní domorodé tradici a neprezentuj výstup jako etnograficky přesný rituál.
Na základě jména, data narození a totemového zvířete vytvoř duchovní reflexi dané osoby.

Odpověz POUZE ve formátu JSON (bez markdown, bez backticks), přesně takto:
{
  "strengths": "Duchovní silné stránky tohoto totemu — co přináší osobě v životě, jaké má přirozené dary a schopnosti (2-3 věty)",
  "challenges": "Výzvy a lekcí na životní cestě, které tento totem přináší — co musí osoba překonat nebo přijmout (2-3 věty)",
  "message": "Osobní poselství od totemu — inspirativní, hluboké duchovní sdělení přímo pro tuto osobu (2 věty)"
}

Buď konkrétní, mystický a povznášející. Odpovídej vždy česky.
Zmiňuj totemové zvíře přirozeně v textu. Zachovej vážný, duchovní tón, ale drž výklad v rovině symbolické sebereflexe.`;

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

function buildFallbackMedicineWheelReading({ name, birthDate, totem }) {
    const month = Number(String(birthDate).split('-')[1]) || 1;
    const directions = [
        { direction: 'východu', theme: 'nových začátků a odvahy pojmenovat první krok' },
        { direction: 'jihu', theme: 'citlivosti, vztahů a návratu k tělu' },
        { direction: 'západu', theme: 'uzavírání starých vzorců a hlubší intuice' },
        { direction: 'severu', theme: 'moudrosti, hranic a trpělivého zrání' }
    ];
    const current = directions[(month - 1) % directions.length];
    const cleanTotem = totem || 'totemové zvíře';

    return {
        strengths: `V symbolice směru ${current.direction} přináší ${cleanTotem} pro ${name} dar bdělosti a schopnost vycítit, kdy je čas postupovat pomalu a kdy vykročit. Silnou stránkou je vnímání jemných signálů, které ostatní snadno přehlédnou.`,
        challenges: `Výzvou je téma ${current.theme}. ${cleanTotem} připomíná, že vnitřní síla se neztrácí tím, že člověk nastaví hranici, odpočine si nebo odmítne nést odpovědnost za vše kolem sebe.`,
        message: `Poselství kola zní: držte se jednoho konkrétního kroku, ne celé mapy najednou. Když se pozornost ztiší, ${cleanTotem} ukáže, kde se energie vrací zpět do rovnováhy.`
    };
}

router.post('/', authenticateToken, requireFeature('medicine_wheel'), async (req, res) => {
    try {
        const { name, birthDate, totem } = req.body;

        if (!name || typeof name !== 'string' || name.trim().length < 2) {
            return res.status(400).json({ success: false, error: 'Zadejte své jméno.' });
        }
        if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate) || !isValidIsoDate(birthDate)) {
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

        let result;
        let fallback = false;

        try {
            const raw = await callClaude(SYSTEM_PROMPT, userMsg, null, {
                feature: 'medicine_wheel'
            });
            const jsonMatch = raw.match(/\{[\s\S]*\}/);
            result = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
        } catch (e) {
            console.error('[MedicineWheel] AI/JSON fallback:', e.message);
            result = buildFallbackMedicineWheelReading({
                name: cleanName,
                birthDate,
                totem: cleanTotem
            });
            fallback = true;
        }

        const required = ['strengths', 'challenges', 'message'];
        for (const field of required) {
            if (!result[field]) {
                result = buildFallbackMedicineWheelReading({
                    name: cleanName,
                    birthDate,
                    totem: cleanTotem
                });
                fallback = true;
                break;
            }
        }

        if (!fallback) {
            await saveCache(cacheKey, cleanName, birthDate, cleanTotem, result);
        }

        res.json({ success: true, result, cached: false, fallback });

    } catch (err) {
        console.error('[MedicineWheel] Error:', err.message);
        res.status(500).json({ success: false, error: 'Chyba serveru. Zkuste to prosím znovu.' });
    }
});

export default router;
