import express from 'express';
import rateLimit from 'express-rate-limit';
import { validateEmail, validateName, validateString } from './utils/validation.js';
import { sendEmail } from './email-service.js';

const router = express.Router();

// Contact form rate limiter: 3 messages per hour per IP
const contactLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3,
    message: { success: false, error: 'Příliš mnoho zpráv. Zkuste to prosím později.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// POST /api/contact
router.post('/', contactLimiter, async (req, res) => {
    const { name, email, subject, message } = req.body;

    try {
        // Validate inputs using centralized validators
        const validatedName = validateName(name);
        const validatedEmail = validateEmail(email);
        const validatedSubject = validateString(subject, 'Subject', 5, 200);
        const validatedMessage = validateString(message, 'Message', 10, 2000);

        // Validated inputs are ready to use; do not log contact details or message bodies.

        // Send notification to admin (fire-and-forget)
        const adminEmail = process.env.ADMIN_EMAIL || process.env.FROM_EMAIL || 'support@mystickahvezda.cz';
        sendEmail({
            to: adminEmail,
            template: 'admin_contact_notification',
            data: { name: validatedName, email: validatedEmail, subject: validatedSubject, message: validatedMessage }
        }).catch(err => console.error('[Contact] Admin notification failed:', err.message));

        res.status(200).json({
            success: true,
            message: 'Děkujeme za vaši zprávu! Ozveme se vám co nejdříve.'
        });

    } catch (e) {
        // Check if it's a validation error (from our validators)
        if (e.message && (e.message.includes('must') || e.message.includes('Invalid') || e.message.includes('required'))) {
            return res.status(400).json({
                success: false,
                error: e.message
            });
        }
        console.error('Contact Form Error:', e);
        res.status(500).json({
            success: false,
            error: 'Omlouváme se, došlo k chybě serveru. Zkuste to prosím později.'
        });
    }
});

export default router;
