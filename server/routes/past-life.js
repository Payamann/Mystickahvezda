/**
 * Past Life Route
 * POST /api/past-life
 * Premium only — generates a symbolic past-life reflection via Claude
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

const SYSTEM_PROMPT = `Jsi symbolický akashický průvodce pro sebereflexi.
Tvým úkolem je na základě jména, data narození, místa narození a zvolené formy výkladu vytvořit archetypální příběh minulého života, který pomáhá čtenáři přemýšlet o současných vzorcích.
Místo narození použij pouze jako symbolický kontext — nevydávej ho za důkaz faktické minulosti.

Odpověz POUZE ve formátu JSON (bez markdown, bez backticks), přesně takto:
{
  "era": "Konkrétní historická epocha a místo (např. Japonsko 12. století, Egypt 1340 př.n.l.)",
  "identity": "Kým tato duše symbolicky mohla být — povolání, role, postavení ve společnosti (2-3 věty)",
  "karmic_lesson": "Jaká lekce se v příběhu zrcadlí pro tento život (2-3 věty)",
  "gifts": "Jaké dary a schopnosti může čtenář v tomto archetypu rozpoznat (2-3 věty)",
  "patterns": "Jaké opakující se vzorce nebo strachy může příběh symbolicky pojmenovat (2-3 věty)",
  "mission": "Jaké téma může být užitečné vědomě dokončit nebo zpracovat (2-3 věty)",
  "message": "Poselství archetypální minulé duše dnešnímu čtenáři — inspirativní závěr (1-2 věty)"
}

Buď konkrétní, mystický a povznášející. Odpovídej vždy česky.
Výstup má působit jako duchovní sebereflexe, ne jako ověřitelné historické tvrzení. Neslibuj jistotu ani faktickou pravdu.`;

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

function buildFallbackPastLifeReading({ name, birthDate, gender, place }) {
    const month = Number(String(birthDate).split('-')[1]) || 1;
    const archetypes = [
        {
            era: 'Střední Evropa 14. století',
            identity: 'Symbolický příběh ukazuje duši zapisovatele, léčitele nebo tichého rádce, který stál na okraji velkých událostí. Jeho síla neležela v moci, ale ve schopnosti držet paměť rodu a pojmenovat to, co ostatní cítili jen nejasně.'
        },
        {
            era: 'Středomoří v době starých chrámů',
            identity: 'V tomto archetypu se objevuje duše strážce chrámového prostoru, poutníka nebo služebníka rituálu. Nesla úkol chránit posvátný řád a učit se, že oddanost nesmí znamenat ztrátu vlastního hlasu.'
        },
        {
            era: 'Severní krajina raného středověku',
            identity: 'Příběh naznačuje duši člověka spojeného s cestami, obchodem nebo předáváním zpráv mezi komunitami. Uměla přežít změny počasí i nálad lidí, ale často musela volit mezi svobodou a závazkem.'
        },
        {
            era: 'Renesanční město 16. století',
            identity: 'Symbolický obraz ukazuje duši učedníka, umělce nebo řemeslníka, který se učil proměňovat detail v krásu. Její dar spočíval ve vnímání proporcí, rytmu a skrytého řádu pod povrchem věcí.'
        }
    ];
    const archetype = archetypes[(month - 1) % archetypes.length];
    const energyLabel = gender === 'muz'
        ? 'aktivní, ochranná energie'
        : (gender === 'zena' ? 'citlivá, tvořivá energie' : 'vyvážená, pozorující energie');
    const placeContext = place ? ` Motiv místa ${place} dodává výkladu téma kořenů a směru.` : '';

    return {
        era: archetype.era,
        identity: archetype.identity,
        karmic_lesson: `Hlavní lekce tohoto symbolického příběhu je rozpoznat, kdy služba druhým přestává být zdravá. ${energyLabel} potřebuje hranice, aby se z daru nestalo vyčerpání.${placeContext}`,
        gifts: 'Z tohoto archetypu si duše nese cit pro skryté souvislosti, schopnost vnímat atmosféru lidí a talent spojovat praktické kroky s intuicí. Dar se probouzí hlavně ve chvílích, kdy je potřeba uklidnit chaos a najít jednoduchý další krok.',
        patterns: 'Opakující se vzorec může být strach z odmítnutí, pokud zazní vlastní pravda. Příběh ukazuje tendenci nést víc odpovědnosti, než je skutečně nutné, a čekat na svolení tam, kde už je možné jednat.',
        mission: `Současné téma pro ${name} je proměnit starou loajalitu ve vědomou volbu. Nejde o dokazování minulosti, ale o sebereflexi: kde dnes zbytečně mlčíte a kde už může zaznít jasnější ano nebo ne.`,
        message: 'Minulý obraz šeptá: nemusíte nést celý příběh sami. To, co bylo kdysi břemenem, se dnes může stát moudrostí, pokud tomu dáte tvar a hranici.'
    };
}

router.post('/', authenticateToken, requireFeature('past_life'), async (req, res) => {
    try {
        const { name, birthDate, gender, place } = req.body;

        if (!name || typeof name !== 'string' || name.trim().length < 2) {
            return res.status(400).json({ success: false, error: 'Zadejte své jméno.' });
        }
        if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate) || !isValidIsoDate(birthDate)) {
            return res.status(400).json({ success: false, error: 'Zadejte datum narození.' });
        }
        if (!gender || !['muz', 'zena', 'neutral'].includes(gender)) {
            return res.status(400).json({ success: false, error: 'Vyberte formu výkladu.' });
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

        const genderLabel = gender === 'muz' ? 'mužská energie' : (gender === 'zena' ? 'ženská energie' : 'neutrální výklad');
        const userMsg = `Jméno: ${cleanName}
Datum narození: ${birthDate}
Místo narození: ${cleanPlace || 'neuvedeno'}
Forma výkladu: ${genderLabel}

Vytvoř symbolický výklad minulého života této duše.`;

        let result;
        let fallback = false;

        try {
            const raw = await callClaude(SYSTEM_PROMPT, userMsg, null, {
                feature: 'past_life'
            });
            const jsonMatch = raw.match(/\{[\s\S]*\}/);
            result = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
        } catch (e) {
            console.error('[PastLife] AI/JSON fallback:', e.message);
            result = buildFallbackPastLifeReading({
                name: cleanName,
                birthDate,
                gender,
                place: cleanPlace
            });
            fallback = true;
        }

        // Validate required fields
        const required = ['era', 'identity', 'karmic_lesson', 'gifts', 'patterns', 'mission', 'message'];
        for (const field of required) {
            if (!result[field]) {
                result = buildFallbackPastLifeReading({
                    name: cleanName,
                    birthDate,
                    gender,
                    place: cleanPlace
                });
                fallback = true;
                break;
            }
        }

        if (!fallback) {
            await saveCache(cacheKey, cleanName, birthDate, gender, result, cleanPlace);
        }

        res.json({ success: true, result, cached: false, fallback });

    } catch (err) {
        console.error('[PastLife] Error:', err.message);
        res.status(500).json({ success: false, error: 'Chyba serveru. Zkuste to prosím znovu.' });
    }
});

export default router;
