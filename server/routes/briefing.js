import express from 'express';
import { callGemini } from '../services/gemini.js';
import { generalAICache } from '../services/cache.js';

const router = express.Router();

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

        // Cache key based on input combination
        const cacheKey = generalAICache.generateKey('briefing', { zodiacSign, name, tarotCard });
        const cachedResponse = generalAICache.get(cacheKey);

        if (cachedResponse) {
            return res.json({ text: cachedResponse, cached: true });
        }

        const systemPrompt = `Jsi Mystický Rádce projektu Mystická Hvězda. Tvým úkolem je vytvořit krátký, inspirativní a sjednocený ranní vzkaz pro uživatele.`;

        const userMessage = `Vstupní data:
- Znamení zvěrokruhu: ${zodiacSign}
- Jméno: ${name || 'Poutníku'}
- Dnešní karta dne: ${tarotCard}
${birthDate ? `- Datum narození: ${birthDate}` : ''}

Pokyny pro text:
1. Formátuj text jako "Hvězdný denní briefing".
2. Propoj symboliku znamení ${zodiacSign} s významem karty ${tarotCard}.
3. Pokud je známo jméno, oslovuj uživatele.
4. Text musí být v češtině, poetický, ale srozumitelný (cca 3-4 odstavce).
5. Zakonč vzkaz jednou "Afirmací dne".
6. Nepoužívej markdown formátování (hvězdičky atd.), jen čistý text s odstavci.`;

        const text = await callGemini(systemPrompt, userMessage);

        generalAICache.set(cacheKey, text);

        res.json({ text });
    } catch (error) {
        console.error('[BRIEFING] Error:', error.message || error);
        res.status(500).json({ error: 'Vesmírné kanály jsou momentálně přetížené.' });
    }
});

export default router;
