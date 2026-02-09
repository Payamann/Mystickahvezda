import express from 'express';
import { supabase } from './db-supabase.js';
import rateLimit from 'express-rate-limit'; // Security

const router = express.Router();

// Specific Rate Limit for Newsletter: 5 requests per hour per IP
const newsletterLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5,
    message: { success: false, error: 'Příliš mnoho pokusů. Zkuste to prosím později.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Helper for email validation (requires at least 2-char TLD)
const isValidEmail = (email) => {
    return /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z]{2,})+$/.test(email);
};

// POST /subscribe
router.post('/subscribe', newsletterLimiter, async (req, res) => {
    let { email, source = 'web_footer' } = req.body;

    // 1. Validate Input
    if (!email || !isValidEmail(email)) {
        return res.status(400).json({
            success: false,
            error: 'Zadejte prosím platnou emailovou adresu.'
        });
    }

    // Normalize email and validate source
    email = email.trim().toLowerCase();
    const VALID_SOURCES = ['web_footer', 'web_popup', 'web_cenik', 'web_landing'];
    if (!VALID_SOURCES.includes(source)) {
        source = 'web_footer';
    }

    try {
        // 2. Insert into Supabase
        const { data, error } = await supabase
            .from('newsletter_subscribers')
            .insert([
                { email, source }
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

    } catch (e) {
        console.error('Newsletter Subscribe Error:', e);
        res.status(500).json({
            success: false,
            error: 'Omlouváme se, došlo k chybě serveru. Zkuste to prosím později.'
        });
    }
});

export default router;
