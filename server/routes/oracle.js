/**
 * Oracle Routes — Crystal Ball, Tarot, Natal Chart, Synastry, Astrocartography
 * Groups smaller AI-powered features that don't warrant individual files
 */
import express from 'express';
import { authenticateToken, requirePremium, requirePremiumSoft, optionalPremiumCheck } from '../middleware.js';
import { callGemini } from '../services/gemini.js';
import { SYSTEM_PROMPTS } from '../config/prompts.js';
import { calculateMoonPhase } from '../services/astrology.js';
import { supabase } from '../db-supabase.js';
import { trackPaywallHit } from '../middleware.js';

export const router = express.Router();

// ─── Crystal Ball ──────────────────────────────────────────────────────────────

router.post('/crystal-ball', optionalPremiumCheck, async (req, res) => {
    try {
        const { question, history = [], lang = 'cs' } = req.body;

        const langMap = { 'cs': 'češtině (CZ)', 'sk': 'slovenčine (SK)', 'pl': 'poľštine (PL)' };
        const targetLangName = langMap[lang] || langMap['cs'];

        const errorMsgs = {
            'cs': 'Otázka je povinná (max 1000 znaků).',
            'sk': 'Otázka je povinná (max 1000 znakov).',
            'pl': 'Pytanie jest wymagane (maks. 1000 znaków).'
        };

        if (!question || typeof question !== 'string' || question.length > 1000) {
            return res.status(400).json({ success: false, error: errorMsgs[lang] || errorMsgs['cs'] });
        }

        // PREMIUM GATE: Free logged-in users limited to 3 questions per day
        if (!req.isPremium && req.user?.id) {
            try {
                const today = new Date().toISOString().split('T')[0];
                const { data } = await supabase
                    .from('readings')
                    .select('id', { count: 'exact', head: true })
                    .eq('user_id', req.user.id)
                    .eq('type', 'crystal-ball')
                    .gte('created_at', `${today}T00:00:00`);

                const count = data?.length || 0;
                if (count >= 3) {
                    // SOFT WALL: Show upgrade offer instead of hard block
                    return res.status(402).json({
                        success: false,
                        error: 'Denní limit 3 otázek byl vyčerpán.',
                        code: 'LIMIT_REACHED',
                        feature: 'crystal_ball_unlimited',
                        upsell: {
                            title: 'Chcete neomezený přístup k Křišťálové kouli?',
                            message: 'Zažijte bez omezení. Hvězdný Průvodce vám otevře nekonečný přístup.',
                            feature: 'crystal_ball_unlimited',
                            plan: 'pruvodce',
                            price: 179,
                            priceLabel: 'Kč/měsíc',
                            upgradeUrl: '/cenik?selected=pruvodce&utm_source=crystal_ball_upsell',
                            features: [
                                '✓ Neomezené otázky',
                                '✓ Hlubší AI výklady',
                                '✓ Uložit historii'
                            ]
                        }
                    });
                }
            } catch (limitError) {
                console.warn('Crystal Ball limit check failed:', limitError);
            }
        }

        const safeHistory = Array.isArray(history) ? history.slice(0, 10) : [];
        let contextMessage = question;
        if (safeHistory.length > 0) {
            contextMessage = `Předchozí otázky v této seanci: ${safeHistory.join(', ')}\n\nNová otázka: ${question}`;
        }

        const moonPhase = calculateMoonPhase();
        const systemPrompt = SYSTEM_PROMPTS.crystalBall.replace('{MOON_PHASE}', moonPhase) + `\n\nRespond in ${targetLangName}.`;

        const response = await callGemini(systemPrompt, contextMessage);
        res.json({ success: true, response });
    } catch (error) {
        console.error('Crystal Ball Error:', error);
        res.status(500).json({ success: false, error: 'Křišťálová koule je zahalena mlhou...' });
    }
});

// ─── Lexikon Snů ──────────────────────────────────────────────────────────────

router.post('/dream', authenticateToken, requirePremiumSoft, async (req, res) => {
    try {
        const { dream } = req.body;

        if (!dream || typeof dream !== 'string' || dream.length > 3000) {
            return res.status(400).json({ success: false, error: 'Popis snu je vyžadován (max 3000 znaků).' });
        }

        if (!req.isPremium) {
            trackPaywallHit(req.user?.id, 'dream_analysis').catch(() => {});
            return res.status(403).json({
                success: false,
                error: 'Komplexní noční vhledy jsou dostupné pouze pro Hvězdné Průvodce (Premium).',
                code: 'PREMIUM_REQUIRED'
            });
        }

        const lang = req.body.lang || 'cs';
        const langMap = { 'cs': 'češtině (CZ)', 'sk': 'slovenčine (SK)', 'pl': 'poľštine (PL)' };
        const targetLangName = langMap[lang] || langMap['cs'];

        const message = `Sen: "${dream}"\nProsím o hlubokou analýzu tohoto snu.`;
        const systemPrompt = SYSTEM_PROMPTS.dreamAnalysis + `\n\nRespond in ${targetLangName}.`;
        const response = await callGemini(systemPrompt, message);
        res.json({ success: true, response });

    } catch (error) {
        console.error('Dream Analysis Error:', error);
        res.status(500).json({ success: false, error: 'Nepodařilo se navázat spojení se snovou sférou...' });
    }
});

// ─── Tarot ────────────────────────────────────────────────────────────────────

router.post('/tarot', authenticateToken, requirePremiumSoft, async (req, res) => {
    try {
        const { question, cards, spreadType = 'tříkartový' } = req.body;

        // Free users can only do 1-card spreads
        if (!req.isPremium && cards.length > 1) {
            trackPaywallHit(req.user?.id, 'tarot_advanced').catch(() => {});
            // SOFT WALL: Show upgrade offer
            return res.status(402).json({
                success: false,
                error: 'Komplexní výklady jsou dostupné pouze pro Hvězdné Průvodce.',
                code: 'PREMIUM_REQUIRED',
                upsell: {
                    title: 'Odemknutí Tarotických Vhledi',
                    message: 'Používejte vícekaretové výklady s hlubší interpretací. Jen pro Premium.',
                    feature: 'tarot_advanced',
                    plan: 'pruvodce',
                    price: 179,
                    priceLabel: 'Kč/měsíc',
                    upgradeUrl: '/cenik?selected=pruvodce&utm_source=tarot_upsell',
                    features: [
                        '✓ Všechny tarotové výklady',
                        '✓ Synastry & Natalní karty',
                        '✓ AI interpretace'
                    ]
                }
            });
        }

        const lang = req.body.lang || 'cs';
        const langMap = { 'cs': 'češtině (CZ)', 'sk': 'slovenčine (SK)', 'pl': 'poľštine (PL)' };
        const targetLangName = langMap[lang] || langMap['cs'];

        const message = `Typ výkladu: ${spreadType}\nOtázka: "${question}"\nVytažené karty: ${cards.join(', ')}`;
        const systemPrompt = SYSTEM_PROMPTS.tarot + `\n\nRespond in ${targetLangName}.`;
        const response = await callGemini(systemPrompt, message);
        res.json({ success: true, response });
    } catch (error) {
        console.error('Tarot Error:', error);
        res.status(500).json({ success: false, error: 'Karty odmítají promluvit...' });
    }
});

router.post('/tarot-summary', authenticateToken, async (req, res) => {
    try {
        const { cards, spreadType } = req.body;

        if (!Array.isArray(cards) || cards.length === 0 || cards.length > 20) {
            return res.status(400).json({ success: false, error: 'Neplatná data karet.' });
        }

        const safeSpreadType = String(spreadType || 'obecný').substring(0, 100);
        const cardContext = cards.map(c => {
            const pos = String(c?.position || '').substring(0, 100);
            const name = String(c?.name || '').substring(0, 100);
            const meaning = String(c?.meaning || '').substring(0, 200);
            return `${pos}: ${name} (${meaning})`;
        }).join(', ');
        const lang = req.body.lang || 'cs';
        const langMap = { 'cs': 'češtině (CZ)', 'sk': 'slovenčine (SK)', 'pl': 'poľštine (PL)' };
        const targetLangName = langMap[lang] || langMap['cs'];

        const message = `Typ výkladu: ${safeSpreadType}\n\nKarty v kontextu pozic:\n${cardContext}\n\nVytvoř krásný, hluboký souhrn tohoto výkladu.`;

        const systemPrompt = SYSTEM_PROMPTS.tarotSummary + `\n\nRespond in ${targetLangName}.`;
        const response = await callGemini(systemPrompt, message);
        res.json({ success: true, response });
    } catch (error) {
        console.error('Tarot Summary Error:', error);
        res.status(500).json({ success: false, error: 'Hlas vesmíru je nyní tichý...' });
    }
});

// ─── Natal Chart ──────────────────────────────────────────────────────────────

router.post('/natal-chart', optionalPremiumCheck, async (req, res) => {
    try {
        const { birthDate, birthTime, birthPlace, name } = req.body;

        if (!birthDate || typeof birthDate !== 'string') {
            return res.status(400).json({ success: false, error: 'Datum narození je povinné.' });
        }

        if (!req.isPremium && process.env.NODE_ENV !== 'development') {
            return res.json({
                success: true,
                isTeaser: true,
                response: null,
                message: 'Detailní interpretace natální karty je dostupná pouze pro Premium uživatele.'
            });
        }

        const lang = req.body.lang || 'cs';
        const langMap = { 'cs': 'češtině (CZ)', 'sk': 'slovenčine (SK)', 'pl': 'poľštine (PL)' };
        const targetLangName = langMap[lang] || langMap['cs'];

        const safeName = String(name || 'Tazatel').substring(0, 100);
        const sunSignInfo = req.body.sunSign ? `\\nSluneční znamení (vypočteno): ${req.body.sunSign}` : '';
        const message = `Jméno: ${safeName}\\nDatum narození: ${String(birthDate).substring(0, 30)}\\nČas narození: ${String(birthTime || '').substring(0, 20)}\\nMísto narození: ${String(birthPlace || '').substring(0, 200)}${sunSignInfo}`;

        const systemPrompt = SYSTEM_PROMPTS.natalChart + `\n\nRespond in ${targetLangName}.`;
        const response = await callGemini(systemPrompt, message);
        res.json({ success: true, response, isTeaser: false });
    } catch (error) {
        console.error('Natal Chart Error:', error);
        res.status(500).json({ success: false, error: 'Hvězdy nejsou v tuto chvíli čitelné...' });
    }
});

// ─── Synastry ─────────────────────────────────────────────────────────────────

router.post('/synastry', authenticateToken, requirePremiumSoft, async (req, res) => {
    try {
        const { person1, person2 } = req.body;

        const safeName1 = String(person1?.name || '').substring(0, 100);
        const safeDate1 = String(person1?.birthDate || '').substring(0, 30);
        const safeName2 = String(person2?.name || '').substring(0, 100);
        const safeDate2 = String(person2?.birthDate || '').substring(0, 30);

        if (!req.isPremium) {
            trackPaywallHit(req.user?.id, 'synastry').catch(() => {});
            return res.json({ success: true, isTeaser: true, response: null });
        }

        const lang = req.body.lang || 'cs';
        const langMap = { 'cs': 'češtině (CZ)', 'sk': 'slovenčine (SK)', 'pl': 'poľštine (PL)' };
        const targetLangName = langMap[lang] || langMap['cs'];

        const message = `Osoba A: ${safeName1}, narozena ${safeDate1}\nOsoba B: ${safeName2}, narozena ${safeDate2}`;
        const systemPrompt = SYSTEM_PROMPTS.synastry + `\n\nRespond in ${targetLangName}.`;
        const response = await callGemini(systemPrompt, message);
        res.json({ success: true, response, isTeaser: false });
    } catch (error) {
        console.error('Synastry Error:', error);
        res.status(500).json({ success: false, error: 'Hvězdná spojení jsou dočasně zahalena...' });
    }
});

// ─── Astrocartography ─────────────────────────────────────────────────────────

router.post('/astrocartography', authenticateToken, requirePremium, async (req, res) => {
    try {
        const { birthDate, birthTime, birthPlace, name, intention = 'obecný' } = req.body;

        if (!birthDate || typeof birthDate !== 'string') {
            return res.status(400).json({ success: false, error: 'Datum narození je povinné.' });
        }

        const lang = req.body.lang || 'cs';
        const langMap = { 'cs': 'češtině (CZ)', 'sk': 'slovenčine (SK)', 'pl': 'poľštine (PL)' };
        const targetLangName = langMap[lang] || langMap['cs'];

        const message = `Jméno: ${String(name || 'Tazatel').substring(0, 100)}\nDatum narození: ${String(birthDate).substring(0, 30)}\nČas narození: ${String(birthTime || '').substring(0, 20)}\nMísto narození: ${String(birthPlace || '').substring(0, 200)}\nZáměr analýzy: ${String(intention).substring(0, 200)}\n\nVytvoř personalizovanou astrokartografickou mapu s doporučenými lokalitami.`;

        const systemPrompt = SYSTEM_PROMPTS.astrocartography + `\n\nRespond in ${targetLangName}.`;
        const response = await callGemini(systemPrompt, message);
        res.json({ success: true, response });
    } catch (error) {
        console.error('Astrocartography Error:', error.message);
        res.status(500).json({ success: false, error: 'Planetární linie jsou momentálně zahaleny mlhou...' });
    }
});

// ─── Angel Cards ──────────────────────────────────────────────────────────────

router.post('/angel-card', optionalPremiumCheck, async (req, res) => {
    try {
        const { card, intention = 'obecný vhled do dnešního dne' } = req.body;

        if (!card || !card.name || !card.theme) {
            return res.status(400).json({ success: false, error: 'Karta je povinná.' });
        }

        // If the user is unauthenticated or Free tier and just wants the static card, we could theoretically
        // just return the static message, but the frontend will probably handle that.
        // This endpoint will be called when the user actually clicks "Získat hluboký AI výklad"

        // PREMIUM GATE: We decided Angel Card deep interpretation is for Premium only, 
        // to drive subscriptions, while the static pull is Free.
        if (!req.isPremium) {
            return res.json({
                success: true,
                isTeaser: true,
                response: null,
                message: 'Hluboká AI interpretace Andělské karty je dostupná pouze pro Premium uživatele.'
            });
        }

        const safeCardName = String(card.name).substring(0, 100);
        const safeCardTheme = String(card.theme).substring(0, 100);
        const safeIntention = String(intention).substring(0, 200);

        const lang = req.body.lang || 'cs';
        const langMap = { 'cs': 'češtině (CZ)', 'sk': 'slovenčine (SK)', 'pl': 'poľštine (PL)' };
        const targetLangName = langMap[lang] || langMap['cs'];

        const message = `Vytažená karta: ${safeCardName}\nTéma karty: ${safeCardTheme}\nZáměr / Otázka uživatele: ${safeIntention}\n\nVytvoř laskavé spojení, vysvětli poselství této karty pro tuto situaci a poraď praktický laskavý krok.`;

        const systemPrompt = SYSTEM_PROMPTS.angelCard + `\n\nRespond in ${targetLangName}.`;
        const response = await callGemini(systemPrompt, message);
        res.json({ success: true, response, isTeaser: false });
    } catch (error) {
        console.error('Angel Card Error:', error.message);
        res.status(500).json({ success: false, error: 'Andělská křídla jsou momentálně zavinutá...' });
    }
});

// ─── Runes (Elder Futhark) ────────────────────────────────────────────────────
router.post('/runes', optionalPremiumCheck, async (req, res) => {
    try {
        const { rune, intention = 'obecný duchovní vhled', history = [] } = req.body;

        if (!rune || !rune.name) {
            return res.status(400).json({ success: false, error: 'Kámen (runa) je povinný.' });
        }

        const safeRuneName = String(rune.name).substring(0, 50);
        const safeRuneMeaning = String(rune.meaning || '').substring(0, 200);
        const safeIntention = String(intention).substring(0, 500);

        const lang = req.body.lang || 'cs';
        const langMap = { 'cs': 'češtině (CZ)', 'sk': 'slovenčine (SK)', 'pl': 'poľštine (PL)' };
        const targetLangName = langMap[lang] || langMap['cs'];

        let contextMessage = `Vytažená runa: ${safeRuneName}\nTradiční význam: ${safeRuneMeaning}\nZáměr / Otázka uživatele: ${safeIntention}\n\nVytvoř šamanský výklad a propojení energie této runy s životem tazatele.`;

        const systemPrompt = SYSTEM_PROMPTS.runes + `\n\nRespond in ${targetLangName}.`;
        const response = await callGemini(systemPrompt, contextMessage);
        res.json({ success: true, response, isTeaser: false });

    } catch (error) {
        console.error('Runes Error:', error.message);
        res.status(500).json({ success: false, error: 'Kameny mlčí. Zkuste to znovu později...' });
    }
});

export default router;
