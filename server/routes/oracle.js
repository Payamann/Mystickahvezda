/**
 * Oracle Routes — Crystal Ball, Tarot, Natal Chart, Synastry, Astrocartography
 * Groups smaller AI-powered features that don't warrant individual files
 */
import express from 'express';
import rateLimit from 'express-rate-limit';
import { authenticateToken, requireFeature, requirePremiumSoft, optionalPremiumCheck } from '../middleware.js';
import { callClaude } from '../services/claude.js';
import { SYSTEM_PROMPTS } from '../config/prompts.js';
import {
    calculateMoonPhase,
    calculateAstrocartographyInsights,
    calculateNatalChart,
    calculateSynastryChart,
    calculateTransitSnapshot,
    formatAstrocartographyForPrompt,
    formatNatalChartForPrompt,
    formatSynastryForPrompt
} from '../services/astrology.js';
import { supabase } from '../db-supabase.js';
import { trackPaywallHit } from '../middleware.js';
import { getRequiredPlanForFeature } from '../config/constants.js';

export const router = express.Router();

function isValidIsoDate(value) {
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function optionalString(value, maxLength) {
    if (value == null) return undefined;
    return String(value).substring(0, maxLength);
}

function buildBirthCalculationInput(source = {}, overrides = {}) {
    const profile = source && typeof source === 'object' ? source : {};
    return {
        name: overrides.name ?? optionalString(profile.name, 100),
        birthDate: overrides.birthDate ?? optionalString(profile.birthDate, 30),
        birthTime: optionalString(profile.birthTime, 20),
        birthPlace: optionalString(profile.birthPlace, 200),
        latitude: profile.latitude,
        longitude: profile.longitude,
        timeZone: optionalString(profile.timeZone, 100),
        country: optionalString(profile.country, 30)
    };
}

// Rate limiter for AI-powered oracle endpoints
const oracleLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20,
    message: { error: 'Příliš mnoho požadavků. Zkuste to znovu za hodinu.' }
});

// ─── Crystal Ball ──────────────────────────────────────────────────────────────

function buildFallbackCrystalBallResponse({ question, moonPhase }) {
    return [
        `Křišťálová koule dnes čte otázku přes fázi Měsíce: ${moonPhase}.`,
        `Otázka zní: "${question}". Místo definitivní odpovědi hledej první konkrétní krok, který sníží napětí a vrátí ti vliv nad situací.`,
        'Praktický vhled: pokud se rozhodnutí nedá udělat v klidu, odlož finální krok a udělej jen malý test reality. Sleduj, co se uvolní a co zůstane těžké.'
    ].join('\n\n');
}

router.post('/crystal-ball', oracleLimiter, optionalPremiumCheck, async (req, res) => {
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
                const { count, error: countError } = await supabase
                    .from('readings')
                    .select('id', { count: 'exact', head: true })
                    .eq('user_id', req.user.id)
                    .eq('type', 'crystal-ball')
                    .gte('created_at', `${today}T00:00:00`);

                if (countError) throw countError;

                if (count >= 3) {
                    trackPaywallHit(req.user?.id, 'crystal_ball_unlimited').catch(() => {});
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
                                '✓ Hlubší vhledy',
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

        let fallback = false;
        let response;

        try {
            response = await callClaude(systemPrompt, contextMessage);
        } catch (aiError) {
            console.warn('Crystal Ball AI fallback used:', aiError.message);
            fallback = true;
            response = buildFallbackCrystalBallResponse({ question, moonPhase });
        }

        res.json({ success: true, response, fallback });
    } catch (error) {
        console.error('Crystal Ball Error:', error);
        res.status(500).json({ success: false, error: 'Křišťálová koule je zahalena mlhou...' });
    }
});

// ─── Lexikon Snů ──────────────────────────────────────────────────────────────

function buildFallbackDreamResponse({ safeDream }) {
    return [
        `Snový obraz: "${safeDream}".`,
        'Čti ho jako symbolický materiál, ne jako pevnou předpověď. Nejdůležitější není přesný slovníkový význam, ale pocit, který se ve snu opakoval.',
        'Praktický krok: napiš si tři slova, která sen nejlépe vystihují. U každého si polož otázku: kde se přesně tohle objevuje v mém bdělém životě tento týden?'
    ].join('\n\n');
}

router.post('/dream', oracleLimiter, authenticateToken, requirePremiumSoft, async (req, res) => {
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

        const safeDream = String(dream).substring(0, 3000);
        const message = `Sen: "${safeDream}"\nProsím o hlubokou analýzu tohoto snu.`;
        const systemPrompt = SYSTEM_PROMPTS.dreamAnalysis + `\n\nRespond in ${targetLangName}.`;
        let fallback = false;
        let response;

        try {
            response = await callClaude(systemPrompt, message);
        } catch (aiError) {
            console.warn('Dream Analysis AI fallback used:', aiError.message);
            fallback = true;
            response = buildFallbackDreamResponse({ safeDream });
        }

        res.json({ success: true, response, fallback });

    } catch (error) {
        console.error('Dream Analysis Error:', error);
        res.status(500).json({ success: false, error: 'Nepodařilo se navázat spojení se snovou sférou...' });
    }
});

// ─── Tarot ────────────────────────────────────────────────────────────────────

function buildFallbackTarotResponse({ safeSpreadType, safeQuestion, safeCards }) {
    return [
        `Tarotový výklad typu ${safeSpreadType} stojí na kartách: ${safeCards.join(', ')}.`,
        safeQuestion
            ? `K otázce "${safeQuestion}" karty ukazují spíš proces než hotový verdikt. Všímej si první karty jako kořene situace a poslední jako směru, kterým energie odchází.`
            : 'Bez konkrétní otázky čti první kartu jako aktuální stav a poslední jako nejbližší praktický krok.',
        'Praktický krok: vyber kartu, která v tobě vyvolává největší reakci, a napiš jednu větu, co po tobě chce změnit dnes, ne někdy později.'
    ].join('\n\n');
}

router.post('/tarot', oracleLimiter, authenticateToken, requirePremiumSoft, async (req, res) => {
    try {
        const { question, cards, spreadType = 'tříkartový' } = req.body;

        if (!Array.isArray(cards) || cards.length === 0 || cards.length > 10) {
            return res.status(400).json({ success: false, error: 'Neplatná data karet.' });
        }

        if (typeof spreadType !== 'string' || spreadType.length > 100) {
            return res.status(400).json({ success: false, error: 'Neplatný typ výkladu.' });
        }

        if (question != null && (typeof question !== 'string' || question.length > 500)) {
            return res.status(400).json({ success: false, error: 'Otázka je příliš dlouhá.' });
        }

        // Free users can only do 1-card spreads
        if (!req.isPremium && cards.length > 1) {
            trackPaywallHit(req.user?.id, 'tarot_advanced').catch(() => {});
            // SOFT WALL: Show upgrade offer
            return res.status(402).json({
                success: false,
                error: 'Komplexní výklady jsou dostupné pouze pro Hvězdné Průvodce.',
                code: 'PREMIUM_REQUIRED',
                upsell: {
                    title: 'Odemknutí tarotických vhledů',
                    message: 'Používejte vícekaretové výklady s hlubší interpretací. Jen pro Premium.',
                    feature: 'tarot_advanced',
                    plan: 'pruvodce',
                    price: 179,
                    priceLabel: 'Kč/měsíc',
                    upgradeUrl: '/cenik?selected=pruvodce&utm_source=tarot_upsell',
                    features: [
                        '✓ Všechny tarotové výklady',
                        '✓ Synastry & Natalní karty',
                        '✓ Detailní interpretace'
                    ]
                }
            });
        }

        const lang = req.body.lang || 'cs';
        const langMap = { 'cs': 'češtině (CZ)', 'sk': 'slovenčine (SK)', 'pl': 'poľštine (PL)' };
        const targetLangName = langMap[lang] || langMap['cs'];

        const safeSpreadType = String(spreadType).substring(0, 100);
        const safeQuestion = question ? String(question).substring(0, 500) : '';
        const safeCards = cards.map((card) => String(card).substring(0, 100));
        const message = `Typ výkladu: ${safeSpreadType}\nOtázka: "${safeQuestion}"\nVytažené karty: ${safeCards.join(', ')}`;
        const systemPrompt = SYSTEM_PROMPTS.tarot + `\n\nRespond in ${targetLangName}.`;
        let fallback = false;
        let response;

        try {
            response = await callClaude(systemPrompt, message);
        } catch (aiError) {
            console.warn('Tarot AI fallback used:', aiError.message);
            fallback = true;
            response = buildFallbackTarotResponse({ safeSpreadType, safeQuestion, safeCards });
        }

        res.json({ success: true, response, fallback });
    } catch (error) {
        console.error('Tarot Error:', error);
        res.status(500).json({ success: false, error: 'Karty odmítají promluvit...' });
    }
});

function buildFallbackTarotSummaryResponse({ safeSpreadType, safeCards }) {
    const cardNames = safeCards.map((card) => `${card.position}: ${card.name}`).join(', ');

    return [
        `Souhrn výkladu ${safeSpreadType}: ${cardNames}.`,
        'Celek ukazuje cestu od prvního napětí k rozhodnutí, které potřebuje jednoduchost. Nehledej dokonalý význam každé karty zvlášť; sleduj, jak spolu mění tón příběhu.',
        'Praktický krok: vrať se k pozici, která působí nejnepříjemněji. Tam výklad pravděpodobně ukazuje místo, kde máš největší vliv.'
    ].join('\n\n');
}

router.post('/tarot-summary', oracleLimiter, authenticateToken, async (req, res) => {
    try {
        const { cards, spreadType } = req.body;

        if (!Array.isArray(cards) || cards.length === 0 || cards.length > 20) {
            return res.status(400).json({ success: false, error: 'Neplatná data karet.' });
        }

        const safeSpreadType = String(spreadType || 'obecný').substring(0, 100);
        const safeCards = cards.map(c => {
            const pos = String(c?.position || '').substring(0, 100);
            const name = String(c?.name || '').substring(0, 100);
            const meaning = String(c?.meaning || '').substring(0, 200);
            return { position: pos || 'pozice', name: name || 'karta', meaning };
        });
        const cardContext = safeCards.map(c => `${c.position}: ${c.name} (${c.meaning})`).join(', ');
        const lang = req.body.lang || 'cs';
        const langMap = { 'cs': 'češtině (CZ)', 'sk': 'slovenčine (SK)', 'pl': 'poľštine (PL)' };
        const targetLangName = langMap[lang] || langMap['cs'];

        const message = `Typ výkladu: ${safeSpreadType}\n\nKarty v kontextu pozic:\n${cardContext}\n\nVytvoř krásný, hluboký souhrn tohoto výkladu.`;

        const systemPrompt = SYSTEM_PROMPTS.tarotSummary + `\n\nRespond in ${targetLangName}.`;
        let fallback = false;
        let response;

        try {
            response = await callClaude(systemPrompt, message);
        } catch (aiError) {
            console.warn('Tarot Summary AI fallback used:', aiError.message);
            fallback = true;
            response = buildFallbackTarotSummaryResponse({ safeSpreadType, safeCards });
        }

        res.json({ success: true, response, fallback });
    } catch (error) {
        console.error('Tarot Summary Error:', error);
        res.status(500).json({ success: false, error: 'Hlas vesmíru je nyní tichý...' });
    }
});

// ─── Natal Chart ──────────────────────────────────────────────────────────────

router.get('/natal-chart/calculate', (req, res) => {
    try {
        const { birthDate } = req.query;

        if (!birthDate || typeof birthDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate) || !isValidIsoDate(birthDate)) {
            return res.status(400).json({ success: false, error: 'Datum narození je povinné.' });
        }

        const chartInput = buildBirthCalculationInput(req.query);
        const chart = calculateNatalChart(chartInput);
        return res.json({ success: true, chart });
    } catch (error) {
        console.error('Natal Chart Calculation Error:', error.message);
        return res.status(500).json({ success: false, error: 'Hvězdy nejsou v tuto chvíli čitelné...' });
    }
});

router.get('/transits/current', (req, res) => {
    try {
        const { birthDate } = req.query;

        if (!birthDate || typeof birthDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate) || !isValidIsoDate(birthDate)) {
            return res.status(400).json({ success: false, error: 'Datum narození je povinné.' });
        }

        const chartInput = buildBirthCalculationInput(req.query);
        const transit = calculateTransitSnapshot(chartInput);
        return res.json({ success: true, transit });
    } catch (error) {
        console.error('Transit Calculation Error:', error.message);
        return res.status(500).json({ success: false, error: 'Aktuální tranzity nejsou v tuto chvíli čitelné...' });
    }
});

function buildFallbackNatalChartResponse({ safeName, chart }) {
    const summary = chart?.summary || {};
    const strongestAspect = summary.strongestAspects?.[0];
    const strongestAspectText = strongestAspect
        ? `Nejsilnější zachycený aspekt je ${strongestAspect.planetALabel || strongestAspect.planetA} ${strongestAspect.name || strongestAspect.aspect} ${strongestAspect.planetBLabel || strongestAspect.planetB}.`
        : 'Nejsilnější aspekty je vhodné číst z detailu vypočtené mapy.';

    return [
        `Natální karta pro ${safeName} ukazuje Slunce ve znamení ${summary.sunSign || 'neurčeno'}, Měsíc ve znamení ${summary.moonSign || 'neurčeno'} a Ascendent ${summary.ascendantSign || 'bez přesného výpočtu'}.`,
        `Dominantní živel je ${summary.dominantElement || 'neurčený'} a dominantní modalita ${summary.dominantQuality || 'neurčená'}. To popisuje základní rytmus, kterým přirozeně reaguješ na svět.`,
        strongestAspectText,
        'Praktický krok: dnes si všimni jedné situace, ve které jednáš podle Slunce, a jedné, ve které reaguješ podle Měsíce. Právě rozdíl mezi vůlí a emocí je často nejrychlejší cesta k pochopení vlastní mapy.'
    ].join('\n\n');
}

router.post('/natal-chart', oracleLimiter, optionalPremiumCheck, async (req, res) => {
    try {
        const { birthDate, birthTime, birthPlace, name } = req.body;

        if (!birthDate || typeof birthDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate) || !isValidIsoDate(birthDate)) {
            return res.status(400).json({ success: false, error: 'Datum narození je povinné.' });
        }

        const chartInput = buildBirthCalculationInput(req.body);
        const chart = calculateNatalChart(chartInput);

        if (!req.isPremium) {
            trackPaywallHit(req.user?.id, 'natal-chart').catch(() => {});
            return res.json({
                success: true,
                isTeaser: true,
                response: null,
                chart,
                message: 'Detailní interpretace natální karty je dostupná pouze pro Premium uživatele.'
            });
        }

        const lang = req.body.lang || 'cs';
        const langMap = { 'cs': 'češtině (CZ)', 'sk': 'slovenčine (SK)', 'pl': 'poľštine (PL)' };
        const targetLangName = langMap[lang] || langMap['cs'];

        const safeName = String(name || 'Tazatel').substring(0, 100);
        const message = [
            `Jméno: ${safeName}`,
            `Datum narození: ${String(birthDate).substring(0, 30)}`,
            `Čas narození: ${String(birthTime || '').substring(0, 20)}`,
            `Místo narození: ${String(birthPlace || '').substring(0, 200)}`,
            '',
            formatNatalChartForPrompt(chart),
            '',
            'Vytvoř osobní interpretaci natální karty nad vypočtenými planetami, znameními a aspekty.'
        ].join('\n');

        const systemPrompt = SYSTEM_PROMPTS.natalChart + `\n\nRespond in ${targetLangName}.`;
        let fallback = false;
        let response;

        try {
            response = await callClaude(systemPrompt, message);
        } catch (aiError) {
            console.warn('Natal Chart AI fallback used:', aiError.message);
            fallback = true;
            response = buildFallbackNatalChartResponse({ safeName, chart });
        }

        res.json({ success: true, response, isTeaser: false, chart, fallback });
    } catch (error) {
        console.error('Natal Chart Error:', error);
        res.status(500).json({ success: false, error: 'Hvězdy nejsou v tuto chvíli čitelné...' });
    }
});

// ─── Synastry ─────────────────────────────────────────────────────────────────

router.post('/synastry/calculate', (req, res) => {
    try {
        const { person1, person2 } = req.body;

        const safeName1 = String(person1?.name || 'Osoba A').substring(0, 100);
        const safeDate1 = String(person1?.birthDate || '').substring(0, 30);
        const safeName2 = String(person2?.name || 'Osoba B').substring(0, 100);
        const safeDate2 = String(person2?.birthDate || '').substring(0, 30);

        if (!isValidIsoDate(safeDate1) || !isValidIsoDate(safeDate2)) {
            return res.status(400).json({ success: false, error: 'Zadejte platná data obou osob.' });
        }

        const synastry = calculateSynastryChart(
            buildBirthCalculationInput(person1, { name: safeName1, birthDate: safeDate1 }),
            buildBirthCalculationInput(person2, { name: safeName2, birthDate: safeDate2 })
        );

        return res.json({ success: true, synastry });
    } catch (error) {
        console.error('Synastry Calculation Error:', error.message);
        return res.status(500).json({ success: false, error: 'Hvězdná spojení jsou dočasně zahalena...' });
    }
});

function buildFallbackSynastryResponse({ safeName1, safeName2, synastry }) {
    const scores = synastry?.scores || {};
    const topAspect = synastry?.crossAspects?.[0];
    const topAspectText = topAspect
        ? `Nejsilnější zachycený aspekt je ${topAspect.planetALabel || topAspect.planetA} ${topAspect.name || topAspect.aspect} ${topAspect.planetBLabel || topAspect.planetB}, což ukazuje hlavní téma, ke kterému se vztah přirozeně vrací.`
        : 'Nejsilnější téma vztahu je potřeba číst přes celkové skóre a rozložení živlů obou osob.';

    return [
        `Partnerská shoda ${safeName1} a ${safeName2} vychází v aktuálním výpočtu na celkové skóre ${scores.total ?? 0} %.`,
        `Emoční rovina má ${scores.emotion ?? 0} %, komunikace ${scores.communication ?? 0} %, vášeň ${scores.passion ?? 0} % a stabilita ${scores.stability ?? 0} %. Neber to jako rozsudek, ale jako mapu míst, kde vztah proudí lehce a kde potřebuje vědomou péči.`,
        topAspectText,
        'Praktický krok: vyberte jedno téma, které má nejnižší skóre, a domluvte si malý konkrétní rituál na tento týden. U vztahů často nerozhoduje dokonalá kompatibilita, ale ochota zacházet s rozdíly vědomě.'
    ].join('\n\n');
}

router.post('/synastry', oracleLimiter, authenticateToken, requirePremiumSoft, async (req, res) => {
    try {
        const { person1, person2 } = req.body;

        const safeName1 = String(person1?.name || '').substring(0, 100);
        const safeDate1 = String(person1?.birthDate || '').substring(0, 30);
        const safeName2 = String(person2?.name || '').substring(0, 100);
        const safeDate2 = String(person2?.birthDate || '').substring(0, 30);

        if (!safeName1 || !safeName2 || !isValidIsoDate(safeDate1) || !isValidIsoDate(safeDate2)) {
            return res.status(400).json({ success: false, error: 'Zadejte platná data obou osob.' });
        }

        const synastry = calculateSynastryChart(
            buildBirthCalculationInput(person1, { name: safeName1, birthDate: safeDate1 }),
            buildBirthCalculationInput(person2, { name: safeName2, birthDate: safeDate2 })
        );

        if (!req.isPremium) {
            trackPaywallHit(req.user?.id, 'synastry').catch(() => {});
            return res.json({ success: true, isTeaser: true, response: null, synastry });
        }

        const lang = req.body.lang || 'cs';
        const langMap = { 'cs': 'češtině (CZ)', 'sk': 'slovenčine (SK)', 'pl': 'poľštine (PL)' };
        const targetLangName = langMap[lang] || langMap['cs'];

        const message = [
            `Osoba A: ${safeName1}, narozena ${safeDate1}`,
            `Osoba B: ${safeName2}, narozena ${safeDate2}`,
            '',
            formatSynastryForPrompt(synastry),
            '',
            'Vytvoř vztahovou interpretaci nad vypočtenými znameními, skóre a křížovými aspekty.'
        ].join('\n');
        const systemPrompt = SYSTEM_PROMPTS.synastry + `\n\nRespond in ${targetLangName}.`;
        let fallback = false;
        let response;

        try {
            response = await callClaude(systemPrompt, message);
        } catch (aiError) {
            console.warn('Synastry AI fallback used:', aiError.message);
            fallback = true;
            response = buildFallbackSynastryResponse({ safeName1, safeName2, synastry });
        }

        res.json({ success: true, response, isTeaser: false, synastry, fallback });
    } catch (error) {
        console.error('Synastry Error:', error);
        res.status(500).json({ success: false, error: 'Hvězdná spojení jsou dočasně zahalena...' });
    }
});

// ─── Astrocartography ─────────────────────────────────────────────────────────

function buildFallbackAstrocartographyResponse({ safeName, safeIntention, astrocartography }) {
    const recommendations = Array.isArray(astrocartography?.recommendations)
        ? astrocartography.recommendations
        : [];
    const top = recommendations[0];
    const nextPlaces = recommendations
        .slice(1, 3)
        .map((place) => `${place.city}, ${place.country}`)
        .join(' a ');

    if (!top) {
        return [
            `Astrokartografická mapa pro ${safeName} je připravená jako symbolická relokační vrstva.`,
            'V tuto chvíli se nepodařilo vybrat konkrétní top destinaci, proto ber výklad jako jemné směrování, ne jako přesnou planetární linii.',
            `Záměr analýzy: ${safeIntention}. Praktický krok: vrať se k místu, které tě přitahuje opakovaně, a porovnej ho se svým natálním Sluncem, Měsícem a Ascendentem.`
        ].join('\n\n');
    }

    const secondaryText = nextPlaces
        ? `Jako další podpůrná místa se ukazují ${nextPlaces}.`
        : 'Další místa ber jako doplňkovou inspiraci podle svého záměru.';

    return [
        `Astrokartografická mapa pro ${safeName} ukazuje pro záměr "${safeIntention}" nejsilnější rezonanci v místě ${top.city}, ${top.country} se skóre ${top.score}/100.`,
        `Hlavní tón místa je ${top.tone}. Nejvíc se opírá o planetu ${top.primaryPlanet?.name || 'neurčeno'} ve znamení ${top.primaryPlanet?.sign || 'neurčeno'}. ${top.reason || ''}`.trim(),
        `${secondaryText} Praktické použití pro top místo: ${top.practicalUse || 'vědomě sledovat, jak místo mění tvůj rytmus, práci a vztahy'}.`,
        `Pozor: ${top.caution || 'nejde o přesnou astronomickou planetární linii, ale o symbolickou vrstvu nad natální mapou a tématem destinace'}.`
    ].join('\n\n');
}

router.post('/astrocartography', oracleLimiter, authenticateToken, requireFeature('astrocartography'), async (req, res) => {
    try {
        const { birthDate, birthTime, birthPlace, name, intention = 'obecný' } = req.body;

        if (!birthDate || typeof birthDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate) || !isValidIsoDate(birthDate)) {
            return res.status(400).json({ success: false, error: 'Datum narození je povinné.' });
        }

        const chartInput = buildBirthCalculationInput(req.body);
        const chart = calculateNatalChart(chartInput);
        const astrocartography = calculateAstrocartographyInsights(
            chartInput,
            intention,
            chart
        );

        const lang = req.body.lang || 'cs';
        const langMap = { 'cs': 'češtině (CZ)', 'sk': 'slovenčine (SK)', 'pl': 'poľštine (PL)' };
        const targetLangName = langMap[lang] || langMap['cs'];
        const safeName = String(name || 'Tazatel').substring(0, 100);
        const safeIntention = String(intention).substring(0, 200);

        const message = [
            `Jméno: ${safeName}`,
            `Datum narození: ${String(birthDate).substring(0, 30)}`,
            `Čas narození: ${String(birthTime || '').substring(0, 20)}`,
            `Místo narození: ${String(birthPlace || '').substring(0, 200)}`,
            `Záměr analýzy: ${safeIntention}`,
            '',
            formatNatalChartForPrompt(chart),
            '',
            formatAstrocartographyForPrompt(astrocartography),
            '',
            'Vytvoř personalizovanou astrokartografickou interpretaci nad vypočtenou mapou a doporučenými místy. Buď transparentní, že jde o symbolickou relokační vrstvu, ne přesné planetární linie.'
        ].join('\n');

        const systemPrompt = SYSTEM_PROMPTS.astrocartography + `\n\nRespond in ${targetLangName}.`;
        let fallback = false;
        let response;

        try {
            response = await callClaude(systemPrompt, message);
        } catch (aiError) {
            console.warn('Astrocartography AI fallback used:', aiError.message);
            fallback = true;
            response = buildFallbackAstrocartographyResponse({ safeName, safeIntention, astrocartography });
        }

        res.json({ success: true, response, chart, astrocartography, fallback });
    } catch (error) {
        console.error('Astrocartography Error:', error.message);
        res.status(500).json({ success: false, error: 'Planetární linie jsou momentálně zahaleny mlhou...' });
    }
});

// ─── Angel Cards ──────────────────────────────────────────────────────────────

function buildFallbackAngelCardResponse({ safeCardName, safeCardTheme, safeIntention }) {
    return [
        `Andělská karta ${safeCardName} přináší téma: ${safeCardTheme}.`,
        `Pro záměr "${safeIntention}" ji čti jako jemné připomenutí, že nemusíš tlačit na výsledek hned. Nejdřív si všimni, kde v těle cítíš klid a kde odpor.`,
        'Praktický krok: vyber jednu drobnou laskavou akci, kterou můžeš udělat dnes. Nemusí být velká; důležité je, aby změnila tón celého dne.'
    ].join('\n\n');
}

router.post('/angel-card', oracleLimiter, authenticateToken, requirePremiumSoft, async (req, res) => {
    try {
        const { card, intention = 'obecný vhled do dnešního dne' } = req.body;

        if (!card || !card.name || !card.theme) {
            return res.status(400).json({ success: false, error: 'Karta je povinná.' });
        }

        // If the user is unauthenticated or Free tier and just wants the static card, we could theoretically
        // just return the static message, but the frontend will probably handle that.
        // This endpoint will be called when the user actually clicks "Získat hluboký výklad"

        // PREMIUM GATE: We decided Angel Card deep interpretation is for Premium only, 
        // to drive subscriptions, while the static pull is Free.
        if (!req.isPremium) {
            const feature = 'angel_card_deep';
            trackPaywallHit(req.user?.id, feature).catch(() => {});
            return res.json({
                success: true,
                isTeaser: true,
                response: null,
                message: 'Hluboká interpretace Andělské karty je dostupná pouze pro Premium uživatele.',
                feature,
                requiredPlan: getRequiredPlanForFeature(feature)
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
        let fallback = false;
        let response;

        try {
            response = await callClaude(systemPrompt, message);
        } catch (aiError) {
            console.warn('Angel Card AI fallback used:', aiError.message);
            fallback = true;
            response = buildFallbackAngelCardResponse({ safeCardName, safeCardTheme, safeIntention });
        }

        res.json({ success: true, response, isTeaser: false, fallback });
    } catch (error) {
        console.error('Angel Card Error:', error.message);
        res.status(500).json({ success: false, error: 'Andělská křídla jsou momentálně zavinutá...' });
    }
});

// ─── Runes (Elder Futhark) ────────────────────────────────────────────────────
function buildFallbackRunesResponse({ safeRuneName, safeRuneMeaning, safeIntention, safeHistory }) {
    const historyText = safeHistory.length > 0
        ? `V předchozím kontextu se opakovalo: ${safeHistory.join('; ')}.`
        : 'Bez předchozího kontextu ber runu jako samostatný signál pro dnešní rozhodnutí.';

    return [
        `Runa ${safeRuneName} nese význam: ${safeRuneMeaning || 'zastavení, pozornost a návrat k vlastnímu středu'}.`,
        `Pro záměr "${safeIntention}" ukazuje hlavně na to, kde je potřeba jednat jednodušeji a pravdivěji. ${historyText}`,
        'Praktický krok: pojmenuj jednu věc, kterou už nemusíš nést sám. Potom udělej jeden malý krok, který vrátí energii zpět k tobě.'
    ].join('\n\n');
}

router.post('/runes', oracleLimiter, authenticateToken, requirePremiumSoft, async (req, res) => {
    try {
        const { rune, intention = 'obecný duchovní vhled', history = [] } = req.body;

        if (!rune || !rune.name) {
            return res.status(400).json({ success: false, error: 'Kámen (runa) je povinný.' });
        }

        if (!req.isPremium) {
            const feature = 'runes_deep_reading';
            trackPaywallHit(req.user?.id, feature).catch(() => {});
            return res.status(402).json({
                success: false,
                error: 'Hluboký runový výklad je dostupný pouze pro Hvězdné Průvodce.',
                code: 'PREMIUM_REQUIRED',
                feature,
                requiredPlan: getRequiredPlanForFeature(feature)
            });
        }

        const safeRuneName = String(rune.name).substring(0, 50);
        const safeRuneMeaning = String(rune.meaning || '').substring(0, 200);
        const safeIntention = String(intention).substring(0, 500);
        const safeHistory = Array.isArray(history)
            ? history.slice(0, 5).map(item => String(item).substring(0, 200))
            : [];

        const lang = req.body.lang || 'cs';
        const langMap = { 'cs': 'češtině (CZ)', 'sk': 'slovenčine (SK)', 'pl': 'poľštine (PL)' };
        const targetLangName = langMap[lang] || langMap['cs'];

        const historyText = safeHistory.length > 0
            ? `\nPředchozí runové kontexty: ${safeHistory.join('; ')}`
            : '';
        let contextMessage = `Vytažená runa: ${safeRuneName}\nTradiční význam: ${safeRuneMeaning}\nZáměr / Otázka uživatele: ${safeIntention}${historyText}\n\nVytvoř šamanský výklad a propojení energie této runy s životem tazatele.`;

        const systemPrompt = SYSTEM_PROMPTS.runes + `\n\nRespond in ${targetLangName}.`;
        let fallback = false;
        let response;

        try {
            response = await callClaude(systemPrompt, contextMessage);
        } catch (aiError) {
            console.warn('Runes AI fallback used:', aiError.message);
            fallback = true;
            response = buildFallbackRunesResponse({ safeRuneName, safeRuneMeaning, safeIntention, safeHistory });
        }

        res.json({ success: true, response, isTeaser: false, fallback });

    } catch (error) {
        console.error('Runes Error:', error.message);
        res.status(500).json({ success: false, error: 'Kameny mlčí. Zkuste to znovu později...' });
    }
});

// ─── Daily Wisdom (AI Powered) ────────────────────────────────────────────────
function buildFallbackDailyWisdomResponse({ safeSign, safeMoonPhase }) {
    const signText = safeSign ? `pro znamení ${safeSign}` : 'pro dnešní energii';
    const moonText = safeMoonPhase ? ` při fázi Měsíce ${safeMoonPhase}` : '';

    return [
        `Dnešní moudrost ${signText}${moonText}: zpomal tam, kde máš chuť všechno vyřešit okamžitě.`,
        'Konkrétně to znamená vybrat jednu důležitou věc, dát jí plnou pozornost a zbytek dne zjednodušit.',
        'Malý rituál: polož si ruku na hrudník, třikrát se nadechni a až potom odpověz na zprávu, rozhodnutí nebo tlak zvenku.'
    ].join('\n\n');
}

router.post('/daily-wisdom', oracleLimiter, authenticateToken, requirePremiumSoft, async (req, res) => {
    try {
        const { sign, moonPhase, lang = 'cs' } = req.body;
        
        const langMap = { 'cs': 'češtině (CZ)', 'sk': 'slovenčine (SK)', 'pl': 'poľštine (PL)' };
        const targetLangName = langMap[lang] || langMap['cs'];

        const safeSign = sign ? String(sign).substring(0, 50) : '';
        const safeMoonPhase = moonPhase ? String(moonPhase).substring(0, 80) : '';
        const signText = safeSign ? `pro znamení ${safeSign}` : 'pro všechny hledající';
        const moonText = safeMoonPhase ? `při fázi měsíce: ${safeMoonPhase}` : '';
        const message = `Generuj hluboké moudro ${signText} ${moonText} v jazyce: ${lang || 'cs'}.`;
        
        const systemPrompt = SYSTEM_PROMPTS.dailyWisdom + `\n\nRespond in ${targetLangName}.`;
        
        let fallback = false;
        let response;

        try {
            response = await callClaude(systemPrompt, message);
        } catch (aiError) {
            console.warn('Daily Wisdom AI fallback used:', aiError.message);
            fallback = true;
            response = buildFallbackDailyWisdomResponse({ safeSign, safeMoonPhase });
        }

        res.json({ success: true, response, fallback });
    } catch (error) {
        console.error('Daily Wisdom AI Error:', error);
        res.status(500).json({ success: false, error: 'Hvězdy dnes mlčí...' });
    }
});

export default router;
