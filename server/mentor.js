import express from 'express';
import { calculateMoonPhase } from './services/astrology.js';
import { supabase } from './db-supabase.js';
import { authenticateToken, requirePremiumSoft, trackPaywallHit } from './middleware.js';
import { callClaude } from './services/claude.js';
import {
    buildCompactMentorHistory,
    buildCompactReadingContext
} from './services/mentor-context.js';
import { SYSTEM_PROMPTS } from './config/prompts.js';
import xss from 'xss';

const router = express.Router();

router.post('/chat', authenticateToken, requirePremiumSoft, async (req, res) => {
    try {
        const { message } = req.body;
        const userId = req.user.id;

        if (!message || typeof message !== 'string') {
            return res.status(400).json({ error: 'Zpráva chybí.' });
        }
        if (message.length > 2000) {
            return res.status(400).json({ error: 'Zpráva je příliš dlouhá (max 2000 znaků).' });
        }

        if (!req.isPremium) {
            const today = new Date().toISOString().split('T')[0];
            const { count: messageCount = 0, error: countError } = await supabase
                .from('mentor_messages')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', userId)
                .eq('role', 'user')
                .gte('created_at', `${today}T00:00:00`);

            if (countError) {
                console.error('Mentor message count error:', countError);
            } else if (messageCount >= 3) {
                trackPaywallHit(userId, 'mentor_unlimited').catch(() => {});
                return res.status(402).json({
                    error: 'Denní limit 3 zpráv byl vyčerpán. Upgrade na Premium pro neomezený přístup.',
                    code: 'PREMIUM_REQUIRED',
                    feature: 'mentor_unlimited'
                });
            }
        }

        const sanitizedMessage = xss(message, {
            whiteList: {},
            stripIgnoredTag: true
        }).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
            .trim();

        console.log(`[Mentor] Request received from user ${userId}`);

        let userContext = {};
        try {
            const { data: profile } = await supabase
                .from('users')
                .select('first_name, birth_date')
                .eq('id', userId)
                .single();

            if (profile) {
                userContext = {
                    name: profile.first_name,
                    birthDate: profile.birth_date,
                    zodiacSign: null
                };
            }
        } catch (error) {
            console.warn('[Mentor] Could not fetch profile for context', error);
        }

        let history = [];
        let historySummary = '';
        try {
            const { data: messages } = await supabase
                .from('mentor_messages')
                .select('role, content')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(12);

            if (messages) {
                const compacted = buildCompactMentorHistory(messages.reverse());
                history = compacted.recent;
                historySummary = compacted.summary;
            }
        } catch (error) {
            console.warn('[Mentor] Could not fetch chat history', error);
        }

        let appContext = '';
        try {
            const { data: readings } = await supabase
                .from('readings')
                .select('type, created_at, data')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(3);

            const contextParts = [`Aktuální fáze Měsíce: ${calculateMoonPhase()}`];
            const readingContext = buildCompactReadingContext(readings || []);
            if (readingContext) contextParts.push(`Nedávné výklady:\n${readingContext}`);
            if (historySummary) contextParts.push(`Souhrn starší konverzace:\n${historySummary}`);
            appContext = contextParts.join('\n\n');
        } catch (error) {
            console.warn('[Mentor] Could not fetch reading context', error);
            if (historySummary) {
                appContext = `Souhrn starší konverzace:\n${historySummary}`;
            }
        }

        try {
            await supabase.from('mentor_messages').insert({
                user_id: userId,
                role: 'user',
                content: sanitizedMessage
            });
        } catch {
            // A temporary history write failure must not block the answer.
        }

        console.log('[Mentor] Calling Claude API with compact context...');
        const responseText = await callClaude(
            SYSTEM_PROMPTS.mentor,
            [...history, { role: 'user', content: sanitizedMessage }],
            { userContext, appContext },
            { feature: 'mentor' }
        );

        try {
            await supabase.from('mentor_messages').insert({
                user_id: userId,
                role: 'mentor',
                content: responseText
            });
        } catch {
            // A temporary history write failure must not hide a valid answer.
        }

        res.json({ success: true, reply: responseText });
    } catch (error) {
        console.error('Mentor Chat API Critical Error:', error);
        res.status(500).json({ error: 'Spojení s mentorem se nezdařilo.' });
    }
});

router.get('/history', authenticateToken, requirePremiumSoft, async (req, res) => {
    try {
        const userId = req.user.id;
        const { data: messages, error } = await supabase
            .from('mentor_messages')
            .select('role, content, created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) throw error;
        res.json({ success: true, history: (messages || []).reverse() });
    } catch (error) {
        console.error('Mentor History Error:', error);
        res.status(500).json({ error: 'Historie se nepodařila načíst.' });
    }
});

export default router;
