import express from 'express';
import Stripe from 'stripe';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createOneTimeOrderInput, attachStripeSessionToOrderInput } from '../services/one-time-orders.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const router = express.Router();
const APP_URL = process.env.APP_URL || 'http://localhost:3001';
const LIVE_ANNUAL_HOROSCOPE_PRICE_ID = 'price_1TRBSUAo8bdbnsKa4aiQhQ7J';
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';
const defaultAnnualHoroscopePriceId = stripeSecretKey.startsWith('sk_live_') ? LIVE_ANNUAL_HOROSCOPE_PRICE_ID : '';
const PRODUCT = {
    id: 'rocni_horoskop_2026',
    type: 'rocni_horoskop',
    name: 'Roční horoskop na míru 2026',
    price: 19900,
    currency: 'czk',
    year: '2026',
    stripePriceId: process.env.STRIPE_ANNUAL_HOROSCOPE_PRICE_ID || defaultAnnualHoroscopePriceId
};
const VALID_SIGNS = ['beran', 'byk', 'blizenci', 'rak', 'lev', 'panna', 'vahy', 'stir', 'strelec', 'kozoroh', 'vodnar', 'ryby'];
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

let stripeClient;

function getStripeClient() {
    if (stripeClient) return stripeClient;

    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
        throw new Error('Missing STRIPE_SECRET_KEY');
    }

    stripeClient = new Stripe(secretKey);
    return stripeClient;
}

function cleanCheckoutSource(value) {
    if (typeof value !== 'string') return 'annual_horoscope_page';
    const trimmed = value.trim();
    if (!trimmed) return 'annual_horoscope_page';
    return trimmed.replace(/[^\w:-]/g, '_').slice(0, 80);
}

function isValidIsoDate(value) {
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function buildLineItem(customerName) {
    if (PRODUCT.stripePriceId) {
        return {
            price: PRODUCT.stripePriceId,
            quantity: 1
        };
    }

    return {
        price_data: {
            currency: PRODUCT.currency,
            product_data: {
                name: PRODUCT.name,
                description: `Personalizovaný horoskop pro ${customerName} - ${PRODUCT.year}`
            },
            unit_amount: PRODUCT.price
        },
        quantity: 1
    };
}

router.get('/product', (_req, res) => {
    res.json({
        id: PRODUCT.id,
        name: PRODUCT.name,
        price: PRODUCT.price,
        currency: PRODUCT.currency,
        year: PRODUCT.year,
        stripePriceId: PRODUCT.stripePriceId
    });
});

router.post('/checkout', async (req, res) => {
    const { birthDate, sign } = req.body;
    const customerName = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const source = cleanCheckoutSource(req.body.source);

    if (!customerName || !birthDate || !sign || !email) {
        return res.status(400).json({ error: 'Vyplňte všechna pole.' });
    }

    if (!EMAIL_PATTERN.test(email)) {
        return res.status(400).json({ error: 'Neplatná e-mailová adresa.' });
    }

    if (customerName.length > 100) {
        return res.status(400).json({ error: 'Neplatné jméno.' });
    }

    if (!VALID_SIGNS.includes(sign)) {
        return res.status(400).json({ error: 'Neplatné znamení.' });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate) || !isValidIsoDate(birthDate) || new Date(`${birthDate}T00:00:00Z`) >= new Date()) {
        return res.status(400).json({ error: 'Neplatné datum narození.' });
    }

    try {
        const order = await createOneTimeOrderInput({
            productType: PRODUCT.type,
            productId: PRODUCT.id,
            customerEmail: email,
            customerName,
            payload: {
                birthDate,
                sign
            }
        });
        const stripe = getStripeClient();
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            customer_email: email,
            line_items: [buildLineItem(customerName)],
            mode: 'payment',
            locale: 'cs',
            success_url: `${APP_URL}/rocni-horoskop.html?status=success&source=${encodeURIComponent(source)}&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${APP_URL}/rocni-horoskop.html?status=cancel&source=${encodeURIComponent(source)}`,
            metadata: {
                productType: PRODUCT.type,
                productId: PRODUCT.id,
                productYear: PRODUCT.year,
                orderId: order.id,
                source,
                price: String(PRODUCT.price),
                currency: PRODUCT.currency
            }
        });

        await attachStripeSessionToOrderInput(order.id, session.id);
        return res.json({ url: session.url });
    } catch (err) {
        console.error('[HOROSKOP] Checkout session error:', err.message);
        return res.status(500).json({ error: 'Platba se nezdařila. Zkuste to prosím znovu.' });
    }
});

export default router;
