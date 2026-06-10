/**
 * Numerology Routes
 * POST /api/numerology
 * Premium only, with database caching
 */
import express from 'express';
import crypto from 'crypto';
import { authenticateToken, requireFeature } from '../middleware.js';
import { callClaude } from '../services/claude.js';
import { SYSTEM_PROMPTS } from '../config/prompts.js';
import { supabase } from '../db-supabase.js';

export const router = express.Router();

function reduceToSingleDigit(num, preserveMaster = true) {
    let value = Number(num);
    if (!Number.isFinite(value) || value < 0) return 0;

    while (value > 9) {
        if (preserveMaster && (value === 11 || value === 22 || value === 33)) {
            return value;
        }
        value = String(value).split('').reduce((sum, digit) => sum + Number.parseInt(digit, 10), 0);
    }
    return value;
}

function letterToNumber(letter) {
    const letterMap = {
        A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8, I: 9,
        J: 1, K: 2, L: 3, M: 4, N: 5, O: 6, P: 7, Q: 8, R: 9,
        S: 1, T: 2, U: 3, V: 4, W: 5, X: 6, Y: 7, Z: 8
    };
    const normalized = String(letter).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
    return letterMap[normalized] || 0;
}

function calculateLifePath(birthDate) {
    const [year, month, day] = String(birthDate).split('-').map(Number);
    return reduceToSingleDigit(
        reduceToSingleDigit(day) + reduceToSingleDigit(month) + reduceToSingleDigit(year)
    );
}

function calculateDestiny(name) {
    return reduceToSingleDigit(
        String(name)
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z]/g, '')
            .split('')
            .reduce((total, char) => total + letterToNumber(char), 0)
    );
}

function calculateSoul(name) {
    const vowels = 'AEIOUY';
    return reduceToSingleDigit(
        String(name)
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toUpperCase()
            .split('')
            .filter(char => vowels.includes(char))
            .reduce((total, char) => total + letterToNumber(char), 0)
    );
}

function calculatePersonality(name) {
    const vowels = 'AEIOUY';
    return reduceToSingleDigit(
        String(name)
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toUpperCase()
            .split('')
            .filter(char => !vowels.includes(char) && /[A-Z]/.test(char))
            .reduce((total, char) => total + letterToNumber(char), 0)
    );
}

function isValidIsoDate(value) {
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

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
            }, { onConflict: 'cache_key' });

        if (error) throw error;
    } catch (e) {
        console.warn('Numerology cache save error:', e.message);
    }
}

function buildFallbackNumerologyResponse({ cleanName, birthDate, birthTime, lifePath, destiny, soul, personality }) {
    const timeContext = birthTime
        ? `Čas ${birthTime} přidává výkladu důraz na rytmus dne a na to, kdy je dobré jednat vědoměji.`
        : 'Bez času narození je výklad záměrně opřený o datum a jméno, tedy o stabilnější numerologickou osu.';

    return [
        `Numerologický profil pro ${cleanName} (${birthDate}) stojí na čtyřech hlavních číslech: životní cesta ${lifePath}, osud ${destiny}, duše ${soul} a osobnost ${personality}.`,
        `Životní cesta ${lifePath} ukazuje základní směr, ke kterému se v životě opakovaně vracíš. Když se rozhoduješ, hledej volbu, která podporuje dlouhodobý růst, ne jen okamžitou úlevu.`,
        `Číslo osudu ${destiny} popisuje způsob, jak se přirozeně projevuješ navenek. Číslo duše ${soul} připomíná, co potřebuješ cítit uvnitř, aby tvé kroky nebyly jen výkonem. Osobnost ${personality} pak ukazuje první dojem, kterým působíš na okolí.`,
        `${timeContext} Pro dnešek si vyber jednu věc, která spojí vnitřní potřebu s konkrétním činem: krátký rozhovor, uklizení jedné oblasti, dokončení odkládané drobnosti nebo jasné pojmenování hranice.`
    ].join('\n\n');
}

router.post('/', authenticateToken, requireFeature('numerologie_vyklad'), async (req, res) => {
    try {
        const { name, birthDate, birthTime } = req.body;

        if (!name || typeof name !== 'string' || name.trim().length < 2 || name.length > 120) {
            return res.status(400).json({ success: false, error: 'Zadejte platné jméno.' });
        }

        if (!birthDate || typeof birthDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate) || !isValidIsoDate(birthDate)) {
            return res.status(400).json({ success: false, error: 'Zadejte platné datum narození.' });
        }

        if (birthTime && (typeof birthTime !== 'string' || !/^\d{2}:\d{2}$/.test(birthTime))) {
            return res.status(400).json({ success: false, error: 'Zadejte platný čas narození.' });
        }

        const cleanName = name.trim().substring(0, 120);
        const cleanBirthTime = birthTime || '';
        const lifePath = calculateLifePath(birthDate);
        const destiny = calculateDestiny(cleanName);
        const soul = calculateSoul(cleanName);
        const personality = calculatePersonality(cleanName);

        const cacheKey = crypto.createHash('md5')
            .update(`${cleanName}_${birthDate}_${cleanBirthTime || 'notime'}_${lifePath}_${destiny}_${soul}_${personality}`)
            .digest('hex');

        const cachedData = await getCachedNumerology(cacheKey);
        if (cachedData) {
            console.log(`📦 Numerology Cache HIT (DB): ${cacheKey}`);
            return res.json({ success: true, response: cachedData.response, cached: true });
        }

        console.log(`🔄 Numerology Cache MISS: ${cacheKey} - Generating new interpretation...`);

        const message = `Jméno: ${cleanName}\nDatum narození: ${birthDate}${cleanBirthTime ? `\nČas narození: ${cleanBirthTime}` : ''}\n\nVypočítaná čísla:\n- Číslo životní cesty: ${lifePath}\n- Číslo osudu: ${destiny}\n- Číslo duše: ${soul}\n- Číslo osobnosti: ${personality}\n\nVytvoř komplexní interpretaci tohoto numerologického profilu.${cleanBirthTime ? ' Vezmi v potaz i čas narození pro hlubší výklad.' : ''}`;

        let response;
        let fallback = false;

        try {
            response = await callClaude(SYSTEM_PROMPTS.numerology, message, null, {
                feature: 'numerology'
            });

            await saveCachedNumerology(cacheKey, {
                name: cleanName,
                birthDate,
                birthTime: cleanBirthTime,
                lifePath,
                destiny,
                soul,
                personality
            }, response);
            console.log(`💾 Numerology cached in DB: ${cacheKey}`);
        } catch (aiError) {
            console.warn('Numerology AI fallback used:', aiError.message);
            fallback = true;
            response = buildFallbackNumerologyResponse({
                cleanName,
                birthDate,
                birthTime: cleanBirthTime,
                lifePath,
                destiny,
                soul,
                personality
            });
        }

        res.json({
            success: true,
            response,
            fallback,
            numbers: { lifePath, destiny, soul, personality }
        });
    } catch (error) {
        console.error('Numerology Error:', error);
        res.status(500).json({ success: false, error: 'Čísla momentálně nemohou promluvit...' });
    }
});

export default router;
