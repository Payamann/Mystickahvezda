/**
 * Horoscope Routes
 * GET/POST /api/horoscope
 * Includes daily/weekly/monthly horoscope with database caching
 */
import express from 'express';
import { optionalPremiumCheck } from '../middleware.js';
import { callGemini } from '../services/gemini.js';
import { SYSTEM_PROMPTS } from '../config/prompts.js';
import { getHoroscopeCacheKey, getCachedHoroscope, saveCachedHoroscope } from '../services/astrology.js';

export const router = express.Router();

const VALID_ZODIAC_SIGNS = ['Beran', 'Býk', 'Blíženci', 'Rak', 'Lev', 'Panna', 'Váhy', 'Štír', 'Střelec', 'Kozoroh', 'Vodnář', 'Ryby'];

// Normalization map from SK/PL to CZ
const ZODIAC_NORMALIZATION = {
    // Slovak
    'Baran': 'Beran',
    'Škorpión': 'Štír',
    'Strelec': 'Střelec',
    'Kozorožec': 'Kozoroh',
    'Vodnár': 'Vodnář',
    // Polish
    'Byk': 'Býk',
    'Bliźnięta': 'Blíženci',
    'Lew': 'Lev',
    'Waga': 'Váhy',
    'Skorpion': 'Štír',
    'Strzelec': 'Střelec',
    'Koziorożec': 'Kozoroh',
    'Wodnik': 'Vodnář'
};

router.post('/', optionalPremiumCheck, async (req, res) => {
    try {
        let { sign, period = 'daily', context = [], lang = 'cs' } = req.body;

        // Try to normalize sign if it's not in the valid list
        if (sign && !VALID_ZODIAC_SIGNS.includes(sign)) {
            if (ZODIAC_NORMALIZATION[sign]) {
                sign = ZODIAC_NORMALIZATION[sign];
            }
        }

        if (!sign || !VALID_ZODIAC_SIGNS.includes(sign)) {
            return res.status(400).json({ success: false, error: 'Neplatné znamení zvěrokruhu.' });
        }

        if (!['daily', 'weekly', 'monthly'].includes(period)) {
            return res.status(400).json({ success: false, error: 'Neplatné období.' });
        }

        // Supported languages
        const supportedLangs = ['cs', 'sk', 'pl'];
        const targetLang = supportedLangs.includes(lang) ? lang : 'cs';

        // Language names for the prompt
        const langNames = { 'cs': 'česky', 'sk': 'slovensky', 'pl': 'polsky' };
        const langName = langNames[targetLang];

        // PREMIUM GATE: Free users can only access daily horoscope (bypass in dev)
        if (!req.isPremium && period !== 'daily' && process.env.NODE_ENV !== 'development') {
            const errorMsgs = {
                'cs': 'Týdenní a měsíční horoskopy jsou dostupné pouze pro Premium uživatele.',
                'sk': 'Týždenné a mesačné horoskopy sú dostupné iba pre Premium používateľov.',
                'pl': 'Horoskopy tygodniowe i miesięczne są dostępne tylko pro użytkowników Premium.'
            };
            return res.status(402).json({
                success: false,
                error: errorMsgs[targetLang],
                code: 'PREMIUM_REQUIRED',
                feature: 'horoscope_extended'
            });
        }

        // Generate cache key (include lang and context hash)
        const contextHash = Array.isArray(context) && context.length > 0
            ? Buffer.from(context.join('')).toString('base64').substring(0, 10)
            : 'nocontext';
        const cacheKey = `${getHoroscopeCacheKey(sign, period)}-${targetLang}-${contextHash}`;

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

        console.log(`🔄 Horoscope Cache MISS: ${cacheKey} - Generating new for ${targetLang}...`);

        let periodPrompt;
        let periodLabel;
        let contextInstruction = '';

        // Labels mapping
        const labels = {
            'cs': { 'daily': 'Denní inspirace', 'weekly': 'Týdenní horoskop', 'monthly': 'Měsíční horoskop' },
            'sk': { 'daily': 'Denná inšpirácia', 'weekly': 'Týždenný horoskop', 'monthly': 'Mesačný horoskop' },
            'pl': { 'daily': 'Dzienna inspiracja', 'weekly': 'Horoskop tygodniowy', 'monthly': 'Horoskop miesięczny' }
        };

        periodLabel = labels[targetLang][period];

        if (context && Array.isArray(context) && context.length > 0) {
            const sanitized = context
                .slice(0, 5)
                .map(c => String(c).replace(/[\r\n\t]/g, ' ').substring(0, 300))
                .filter(c => c.trim().length > 0);

            if (sanitized.length > 0) {
                if (targetLang === 'sk') {
                    contextInstruction = `\nCONTEXT (Z užívateľovho denníka):\n"${sanitized.join('", "')}"\nINŠTRUKCIA PRE SYNERGIU: Ak je to relevantné, jemne a nepriamo nadväzuj na témy z denníka. Nehovor "V denníku vidím...", ale skôr "Hviezdy naznačujú posun v témach, ktoré ťa trápia...". Buď empatický.`;
                } else if (targetLang === 'pl') {
                    contextInstruction = `\nCONTEXT (Z dziennika użytkownika):\n"${sanitized.join('", "')}"\nINSTRUKCJA DLA SYNERGII: Jeśli to istotne, delikatnie i pośrednio nawiązuj do tematów z dziennika. Nie mów "Widzę w dzienniku...", ale raczej "Gwiazdy sugerują zmianę w tematach, które Cię martwią...". Bądź empatyczny.`;
                } else {
                    contextInstruction = `\nCONTEXT (Z uživatelova deníku):\n"${sanitized.join('", "')}"\nINSTRUKCE PRO SYNERGII: Pokud je to relevantní, jemně a nepřímo nawazuj na témata z deníku. Neříkej "V deníku vidím...", ale spíše "Hvězdy naznačují posun v tématech, která tě trápí...". Buď empatický.`;
                }
            }
        }

        if (period === 'weekly') {
            periodPrompt = `Jsi inspirativní astrologický průvodce.\nGeneruj týdenní horoskop ve formátu JSON.\nOdpověď MUSÍ být validní JSON objekt bez markdown formátování (žádné \`\`\`json).\nStruktura:\n{\n  "prediction": "Text horoskopu (5-6 vět). Zaměř se na hlavní energii, lásku, kariéru a jednu výzvu.",\n  "affirmation": "Osobní týdenní mantra — silná, poetická, specifická pro toto znamení, jeho element a vládnoucí planetu. 15–25 slov, první osoba, přítomný čas. Nesmí být generická ani klišovitá. Příklad tónu: 'Má odvaha tvoří mosty tam, kde ostatní vidí propasti.'",\n  "luckyNumbers": [číslo1, číslo2, číslo3, číslo4]\n}\nText piš ${langName}, poeticky a povzbudivě.${contextInstruction}`;
        } else if (period === 'monthly') {
            periodPrompt = `Jsi moudrý astrologický průvodce.\nGeneruj měsíční horoskop ve formátu JSON.\nOdpověď MUSÍ být validní JSON objekt bez markdown formátování (žádné \`\`\`json).\nStruktura:\n{\n  "prediction": "Text horoskopu (7-8 vět). Zahrň úvod, lásku, kariéru, zdraví a klíčová data.",\n  "affirmation": "Hluboká měsíční mantra — specifická pro toto znamení a jeho transformační energii v tomto měsíci. 20–30 slov, první osoba, přítomný čas. Poetická, osobní, bez klišé. Příklad tónu: 'Jsem průkopníkem ticha — v hloubce svého bytí nacházím sílu, která přetváří svět.'",\n  "luckyNumbers": [číslo1, číslo2, číslo3, číslo4]\n}\nText piš ${langName}, inspirativně a hluboce.${contextInstruction}`;
        } else {
            periodPrompt = `Jsi laskavý astrologický průvodce.\nGeneruj denní horoskop ve formátu JSON.\nOdpověď MUSÍ být validní JSON objekt bez markdown formátování (žádné \`\`\`json).\nStruktura:\n{\n  "prediction": "Text horoskopu (3-4 věty). Hlavní energie dne a jedna konkrétní rada.",\n  "affirmation": "Osobní denní mantra — silná, poetická, specifická pro toto znamení a jeho element. 15–25 slov, první osoba, přítomný čas. Nesmí být generická ani klišovitá. Příklad tónu: 'Má intuice je dnes mým nejostřejším nástrojem — naslouchám jí a jednám.'",\n  "luckyNumbers": [číslo1, číslo2, číslo3, číslo4]\n}\nText piš ${langName}, poeticky a povzbudivě.${contextInstruction}`;
        }

        const dateLocales = { 'cs': 'cs-CZ', 'sk': 'sk-SK', 'pl': 'pl-PL' };
        const today = new Date();
        const message = `Znamení: ${sign}\nDatum: ${today.toLocaleDateString(dateLocales[targetLang])}`;

        const response = await callGemini(periodPrompt, message);

        // Strip markdown code fences if Gemini wraps JSON in ```json ... ```
        const cleanResponse = response.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();

        // Save to DB cache (non-blocking — don't let DB errors kill the response)
        saveCachedHoroscope(cacheKey, sign, period, cleanResponse, periodLabel)
            .then(() => console.log(`💾 Horoscope cached in DB: ${cacheKey}`))
            .catch(err => console.warn(`[HOROSCOPE] Cache save failed (non-fatal):`, err.message));

        res.json({ success: true, response: cleanResponse, period: periodLabel });

    } catch (error) {
        console.error('[HOROSCOPE] Gemini Error:', error.message || error);

        // Fallback: return a static horoscope so users aren't left with empty page
        const { sign: bodySign, lang: bodyLang = 'cs' } = req.body || {};
        const signName = bodySign || 'neznámé znamení';
        const supportedLangs = ['cs', 'sk', 'pl'];
        const fallbackTargetLang = supportedLangs.includes(bodyLang) ? bodyLang : 'cs';
        const fallbackMessages = {
            'cs': {
                prediction: `Hvězdy dnes pro znamení ${signName} naznačují čas pro introspekci a klid. Energie dne vás vede k tomu, abyste se zastavili a naslouchali svému vnitřnímu hlasu. Důvěřujte svým instinktům — budou vás vést správným směrem.`,
                affirmation: 'Jsem v souladu s vesmírem a důvěřuji své cestě.',
            },
            'sk': {
                prediction: `Hviezdy dnes pre znamenie ${signName} naznačujú čas pre introspekciu a pokoj. Energia dňa vás vedie k tomu, aby ste sa zastavili a počúvali svoj vnútorný hlas. Dôverujte svojim inštinktom — budú vás viesť správnym smerom.`,
                affirmation: 'Som v súlade s vesmírom a dôverujem svojej ceste.',
            },
            'pl': {
                prediction: `Gwiazdy dzisiaj dla znaku ${signName} wskazują czas na introspekcję i spokój. Energia dnia prowadzi Cię do zatrzymania się i wsłuchania w swój wewnętrzny głos. Zaufaj swoim instynktom — poprowadzą Cię we właściwym kierunku.`,
                affirmation: 'Jestem w harmonii ze wszechświatem i ufam swojej drodze.',
            }
        };

        const fb = fallbackMessages[fallbackTargetLang] || fallbackMessages['cs'];
        const luckyNumbers = Array.from({ length: 4 }, () => Math.floor(Math.random() * 49) + 1);
        const labels = {
            'cs': { 'daily': 'Denní inspirace', 'weekly': 'Týdenní horoskop', 'monthly': 'Měsíční horoskop' },
            'sk': { 'daily': 'Denná inšpirácia', 'weekly': 'Týždenný horoskop', 'monthly': 'Mesačný horoskop' },
            'pl': { 'daily': 'Dzienna inspiracja', 'weekly': 'Horoskop tygodniowy', 'monthly': 'Horoskop miesięczny' }
        };
        const fallbackPeriodLabel = labels[fallbackTargetLang]?.daily || 'Denní inspirace';

        const fallbackResponse = JSON.stringify({
            prediction: fb.prediction,
            affirmation: fb.affirmation,
            luckyNumbers: luckyNumbers
        });

        res.json({
            success: true,
            response: fallbackResponse,
            period: fallbackPeriodLabel,
            fallback: true
        });
    }
});

export default router;
