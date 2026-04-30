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
const LIVE_PERSONAL_MAP_PRICE_ID = 'price_1TRAzfAo8bdbnsKa82dgiM61';
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';
const defaultPersonalMapPriceId = stripeSecretKey.startsWith('sk_live_') ? LIVE_PERSONAL_MAP_PRICE_ID : '';
const PRODUCT = {
    id: 'osobni_mapa_2026',
    type: 'personal_map',
    name: 'Osobní mapa zbytku roku 2026',
    price: 29900,
    currency: 'czk',
    year: '2026',
    stripePriceId: process.env.STRIPE_PERSONAL_MAP_PRICE_ID || defaultPersonalMapPriceId
};

const VALID_SIGNS = ['beran', 'byk', 'blizenci', 'rak', 'lev', 'panna', 'vahy', 'stir', 'strelec', 'kozoroh', 'vodnar', 'ryby'];
const VALID_GENDERS = ['feminine', 'masculine', 'neutral'];
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
    if (typeof value !== 'string') return 'personal_map_page';
    const trimmed = value.trim();
    if (!trimmed) return 'personal_map_page';
    return trimmed.replace(/[^\w:-]/g, '_').slice(0, 80);
}

function cleanText(value, maxLength) {
    if (typeof value !== 'string') return '';
    return value.trim().replace(/\s+/g, ' ').slice(0, maxLength);
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
                description: `Prémiový osobní PDF výklad pro ${customerName}`
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
    const customerName = cleanText(req.body.name, 100);
    const email = cleanText(req.body.email, 160).toLowerCase();
    const birthDate = typeof req.body.birthDate === 'string' ? req.body.birthDate.trim() : '';
    const birthTime = cleanText(req.body.birthTime, 20);
    const birthPlace = cleanText(req.body.birthPlace, 120);
    const sign = typeof req.body.sign === 'string' ? req.body.sign.trim() : '';
    const grammaticalGender = typeof req.body.grammaticalGender === 'string' ? req.body.grammaticalGender.trim() : 'neutral';
    const focus = cleanText(req.body.focus, 500);
    const source = cleanCheckoutSource(req.body.source);

    if (!customerName || !birthDate || !sign || !email || !focus) {
        return res.status(400).json({ error: 'Vyplňte prosím všechna povinná pole.' });
    }

    if (!EMAIL_PATTERN.test(email)) {
        return res.status(400).json({ error: 'Neplatná e-mailová adresa.' });
    }

    if (!VALID_SIGNS.includes(sign)) {
        return res.status(400).json({ error: 'Neplatné znamení.' });
    }

    if (!VALID_GENDERS.includes(grammaticalGender)) {
        return res.status(400).json({ error: 'Neplatný způsob oslovení.' });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate) || !isValidIsoDate(birthDate) || new Date(`${birthDate}T00:00:00Z`) >= new Date()) {
        return res.status(400).json({ error: 'Neplatné datum narození.' });
    }

    if (birthTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(birthTime)) {
        return res.status(400).json({ error: 'Neplatný čas narození.' });
    }

    if (focus.length < 8) {
        return res.status(400).json({ error: 'Napište prosím alespoň krátce, co teď řešíte.' });
    }

    try {
        const order = await createOneTimeOrderInput({
            productType: PRODUCT.type,
            productId: PRODUCT.id,
            customerEmail: email,
            customerName,
            payload: {
                birthDate,
                birthTime,
                birthPlace,
                sign,
                grammaticalGender,
                focus
            }
        });
        const stripe = getStripeClient();
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            customer_email: email,
            line_items: [buildLineItem(customerName)],
            mode: 'payment',
            locale: 'cs',
            success_url: `${APP_URL}/osobni-mapa.html?status=success&source=${encodeURIComponent(source)}&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${APP_URL}/osobni-mapa.html?status=cancel&source=${encodeURIComponent(source)}`,
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
        console.error('[PERSONAL_MAP] Checkout session error:', err.message);
        return res.status(500).json({ error: 'Platba se nezdařila. Zkuste to prosím znovu.' });
    }
});

export default router;
