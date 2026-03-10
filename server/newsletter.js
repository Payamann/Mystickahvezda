import express from 'express';
import { supabase } from './db-supabase.js';
import rateLimit from 'express-rate-limit'; // Security
import { validateEmail, validateString } from './utils/validation.js';

const router = express.Router();

// Specific Rate Limit for Newsletter: 5 requests per hour per IP
const newsletterLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5,
    message: { success: false, error: 'Příliš mnoho pokusů. Zkuste to prosím později.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// POST /subscribe
router.post('/subscribe', newsletterLimiter, async (req, res) => {
    const { email: rawEmail, source: rawSource = 'web_footer' } = req.body;

    try {
        // 1. Validate Input using centralized validator
        const validatedEmail = validateEmail(rawEmail);

        // Validate source
        const VALID_SOURCES = ['web_footer', 'web_popup', 'web_cenik', 'web_landing'];
        const validatedSource = VALID_SOURCES.includes(rawSource) ? rawSource : 'web_footer';

        // 2. Insert into Supabase
        const { data, error } = await supabase
            .from('newsletter_subscribers')
            .insert([
                { email: validatedEmail, source: validatedSource }
            ])
            .select();

        if (error) {
            // Handle duplicate email unique constraint violation
            if (error.code === '23505') { // Postgres code for unique_violation
                return res.status(409).json({
                    success: false,
                    error: 'Tento email je již přihlášen k odběru.'
                });
            }
            throw error;
        }

        // 3. Success
        res.status(201).json({
            success: true,
            message: 'Úspěšně přihlášeno k odběru! Děkujeme.'
        });

    } catch (validationError) {
        if (validationError.message) {
            return res.status(400).json({
                success: false,
                error: validationError.message
            });
        }
        console.error('Newsletter Subscribe Error:', validationError);
        res.status(500).json({
            success: false,
            error: 'Omlouváme se, došlo k chybě serveru. Zkuste to prosím později.'
        });
    }
});

// POST /unsubscribe (GDPR compliance)
router.post('/unsubscribe', async (req, res) => {
    const { email: rawEmail } = req.body;

    try {
        // Validate email
        const validatedEmail = validateEmail(rawEmail);

        const { data, error } = await supabase
            .from('newsletter_subscribers')
            .update({ is_active: false })
            .eq('email', validatedEmail)
            .select();

        if (error) {
            throw error;
        }

        if (!data || data.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Email nebyl nalezen v databázi odběratelů.'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Úspěšně odhlášeno z odběru newsletteru.'
        });

    } catch (validationError) {
        if (validationError.message && (validationError.message.includes('Invalid') || validationError.message.includes('required'))) {
            return res.status(400).json({
                success: false,
                error: validationError.message
            });
        }
        console.error('Newsletter Unsubscribe Error:', validationError);
        res.status(500).json({
            success: false,
            error: 'Omlouváme se, došlo k chybě serveru. Zkuste to prosím později.'
        });
    }
});

export default router;
