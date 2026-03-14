import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { generalAICache } from '../services/cache.js';

const router = express.Router();

/**
 * GET /api/briefing
 * Synthesizes Zodiac, Numerology, and Tarot data into a personal daily guidance.
 */
router.post('/briefing', async (req, res) => {
    try {
        const { zodiacSign, name, birthDate, tarotCard, sessionToken } = req.body;

        if (!zodiacSign || !tarotCard) {
            return res.status(400).json({ error: 'Chybí vstupní data (znamení nebo karta).' });
        }

        // Cache key based on input combination
        const cacheKey = `briefing:${zodiacSign}:${name}:${tarotCard}`;
        const cachedResponse = generalAICache.get(cacheKey);
        
        if (cachedResponse) {
            return res.json({ text: cachedResponse, cached: true });
        }

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
            Jsi Mystický Rádce projektu Mystická Hvězda. Tvým úkolem je vytvořit krátký, inspirativní a sjednocený ranní vzkaz pro uživatele.
            
            Vstupní data:
            - Znamení zvěrokruhu: ${zodiacSign}
            - Jméno: ${name || 'Poutníku'}
            - Dnešní karta dne: ${tarotCard}
            ${birthDate ? `- Datum narození: ${birthDate}` : ''}

            Pokyny pro text:
            1. Formátuj text jako "Hvězdný denní briefing".
            2. Propoj symboliku znamení ${zodiacSign} s významem karty ${tarotCard}.
            3. Pokud je známo jméno, oslovuj uživatele.
            4. Text musí být v češtině, poetický, ale srozumitelný (cca 3-4 odstavce).
            5. Zakonč vzkaz jednou "Aformací dne".
            6. Nepoužívej markdown formátování (hvězdičky atd.), jen čistý text s odstavci.
        `;

        const result = await model.generateContent(prompt);
        const text = result.response.text();

        generalAICache.set(cacheKey, text);

        res.json({ text });
    } catch (error) {
        console.error('[BRIEFING] Error:', error);
        res.status(500).json({ error: 'Vesmírné kanály jsou momentálně přetížené.' });
    }
});

export default router;
