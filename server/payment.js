import express from 'express';
import { supabase } from './db-supabase.js';
import { authenticateToken, PREMIUM_PLAN_TYPES } from './middleware.js';
import Stripe from 'stripe';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const router = express.Router();

// Helper to check premium status (uses shared PREMIUM_PLAN_TYPES from middleware)
export async function isPremiumUser(userId) {
    try {
        const { data: subscription } = await supabase
            .from('subscriptions')
            .select('plan_type, status, current_period_end')
            .eq('user_id', userId)
            .single();

        if (!subscription) return false;

        const isActive = subscription.status === 'active';
        const notExpired = new Date(subscription.current_period_end) > new Date();
        const isPremium = PREMIUM_PLAN_TYPES.includes(subscription.plan_type);

        return isActive && notExpired && isPremium;
    } catch (e) {
        console.error('Error checking premium status:', e);
        return false;
    }
}

// Create Stripe Checkout Session
router.post('/create-checkout-session', authenticateToken, async (req, res) => {
    try {
        const { planId } = req.body;
        const user = req.user;

        // Define plans (consistent with cenik.html)
        const plans = {
            'poutnik': { // Free/Basic - shouldn't happen but keep for safety
                name: 'Poutník (Základ)',
                price: 0,
                type: 'free'
            },
            'pruvodce': { // Monthly
                name: 'Hvězdný Průvodce (Měsíční)',
                price: 19900, // 199 CZK
                type: 'premium_monthly'
            },
            'osviceni': { // Yearly
                name: 'Osvícení (Roční)',
                price: 119000, // 1190 CZK
                type: 'premium_yearly'
            }
        };

        const plan = plans[planId] || plans['pruvodce'];

        if (plan.price === 0) {
            return res.status(400).json({ error: 'Cannot create session for free plan' });
        }

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'czk',
                    product_data: {
                        name: plan.name,
                        description: 'Přístup ke všem prémiovým funkcím Mystické Hvězdy',
                    },
                    unit_amount: plan.price,
                },
                quantity: 1,
            }],
            mode: 'payment',
            success_url: `${process.env.APP_URL}/profil.html?payment=success`,
            cancel_url: `${process.env.APP_URL}/cenik.html?payment=cancel`,
            customer_email: user.email,
            client_reference_id: user.id,
            metadata: {
                userId: user.id,
                planType: plan.type
            }
        });

        res.json({ id: session.id, url: session.url });
    } catch (error) {
        console.error('Stripe Session Error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Handle Stripe Webhook Events with signature verification
 * @param {Buffer} rawBody - Raw request body
 * @param {string} sig - Stripe-Signature header
 */
export async function handleStripeWebhook(rawBody, sig) {
    let event;

    // Verify webhook signature
    if (STRIPE_WEBHOOK_SECRET) {
        try {
            event = stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET);
        } catch (err) {
            console.error('[STRIPE] Webhook signature verification failed:', err.message);
            throw new Error('Webhook signature verification failed');
        }
    } else if (IS_PRODUCTION) {
        console.error('[STRIPE] STRIPE_WEBHOOK_SECRET is required in production. Rejecting webhook.');
        throw new Error('Webhook secret not configured');
    } else {
        console.warn('[STRIPE] Dev mode: STRIPE_WEBHOOK_SECRET not set, skipping signature verification.');
        event = JSON.parse(rawBody.toString());
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const userId = session.client_reference_id || session.metadata.userId;
        const planType = session.metadata.planType || 'premium_monthly';

        console.log(`[STRIPE] Payment completed for user ${userId}, upgrading to ${planType}`);

        const expiryDate = new Date();
        if (planType === 'premium_yearly') {
            expiryDate.setFullYear(expiryDate.getFullYear() + 1);
        } else {
            expiryDate.setMonth(expiryDate.getMonth() + 1);
        }

        const subData = {
            user_id: userId,
            plan_type: planType,
            status: 'active',
            current_period_end: expiryDate.toISOString()
        };

        // Update or Insert subscription in Supabase
        const { error } = await supabase
            .from('subscriptions')
            .upsert(subData, { onConflict: 'user_id' });

        if (error) {
            console.error('[STRIPE] Supabase Update Error:', error);
        } else {
            // Also update is_premium for quick check in users table
            await supabase.from('users').update({ is_premium: true }).eq('id', userId);
            console.log(`[STRIPE] User ${userId} successfully upgraded to ${planType}.`);
        }
    }
}

// Keep legacy /process for backward compatibility during transition if needed
router.post('/process', authenticateToken, async (req, res) => {
    res.status(410).json({ success: false, error: 'Tento endpoint byl nahrazen Stripe Checkout.' });
});

export default router;

