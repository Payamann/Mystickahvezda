import express from 'express';
import { callClaude } from '../services/claude.js';
import { generalAICache } from '../services/cache.js';
import { SYSTEM_PROMPTS } from '../config/prompts.js';

const router = express.Router();

function buildFallbackBriefing({ zodiacSign, name, tarotCard }) {
    const greeting = name ? `${name}, dnešní energie` : 'Dnešní energie';

    return [
        `${greeting} propojuje znamení ${zodiacSign} s kartou ${tarotCard}. Ber to jako krátký orientační kompas: kde se věci komplikují, vrať se k jednoduchému kroku, který můžeš udělat ještě dnes.`,
        `Znamení ${zodiacSign} ukazuje přirozený způsob reakce, zatímco karta ${tarotCard} pojmenovává téma dne. Nehledej dokonalou odpověď; sleduj, co se opakuje v rozhovorech, rozhodnutích a náladě těla.`,
        'Afirmace dne: Volím klidný krok, který je pravdivý pro mě i pro situaci přede mnou.'
    ].join('\n\n');
}

/**
 * POST /api/briefing
 * Synthesizes Zodiac, Numerology, and Tarot data into a personal daily guidance.
 */
router.post('/briefing', async (req, res) => {
    try {
        const { zodiacSign, name, tarotCard, birthDate } = req.body;

        if (!zodiacSign || !tarotCard) {
            return res.status(400).json({ error: 'Chybí vstupní data (znamení nebo karta).' });
        }

        const safeZodiacSign = String(zodiacSign).substring(0, 60);
        const safeName = name ? String(name).substring(0, 80) : '';
        const safeTarotCard = String(tarotCard).substring(0, 120);
        const safeBirthDate = birthDate ? String(birthDate).substring(0, 30) : '';

        const cacheKey = generalAICache.generateKey('briefing', {
            zodiacSign: safeZodiacSign,
            name: safeName,
            tarotCard: safeTarotCard,
            birthDate: safeBirthDate,
            date: new Date().toISOString().slice(0, 10)
        });
        const cachedResponse = generalAICache.get(cacheKey);

        if (cachedResponse) {
            return res.json({ text: cachedResponse, cached: true });
        }

        const systemPrompt = SYSTEM_PROMPTS.briefing;
        const userMessage = `Vstupní data:
- Znamení zvěrokruhu: ${safeZodiacSign}
- Jméno: ${safeName || 'Poutníku'}
- Dnešní karta dne: ${safeTarotCard}
${safeBirthDate ? `- Datum narození: ${safeBirthDate}` : ''}

Pokyny pro text:
1. Formátuj text jako "Hvězdný denní briefing".
2. Propoj symboliku znamení ${safeZodiacSign} s významem karty ${safeTarotCard}.
3. Pokud je známo jméno, oslovuj uživatele.
4. Text musí být v češtině, poetický, ale srozumitelný (cca 3-4 odstavce).
5. Zakonči vzkaz jednou "Afirmací dne".
6. Nepoužívej markdown formátování (hvězdičky atd.), jen čistý text s odstavci.`;

        let text;
        let fallback = false;

        try {
            text = await callClaude(systemPrompt, userMessage, null, {
                feature: 'briefing',
                cacheTtlSeconds: 26 * 60 * 60
            });
        } catch (aiError) {
            console.warn('[BRIEFING] AI fallback:', aiError.message);
            fallback = true;
            text = buildFallbackBriefing({
                zodiacSign: safeZodiacSign,
                name: safeName,
                tarotCard: safeTarotCard
            });
        }

        if (!fallback) {
            generalAICache.set(cacheKey, text);
        }

        res.json({ text, fallback });
    } catch (error) {
        console.error('[BRIEFING] Error:', error.message || error);
        res.status(500).json({ error: 'Vesmírné kanály jsou momentálně přetížené.' });
    }
});

export default router;
