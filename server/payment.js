import express from 'express';
import { supabase } from './db-supabase.js';
import { authenticateToken, optionalPremiumCheck } from './middleware.js';
import Stripe from 'stripe';
import { sendEmail, sendPauseEmail, sendDiscountEmail, sendOnboardingSequence, sendUpgradeReminders, sendChurnRecoveryEmail, sendTrialReminderEmails } from './email-service.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { validateString, validateNumber, validateUserId } from './utils/validation.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const APP_URL = process.env.APP_URL || 'http://localhost:3001';
const router = express.Router();

import {
    DEFAULT_PREMIUM_PLAN_TYPE,
    PLAN_TYPES,
    PREMIUM_PLAN_TYPES,
    SUBSCRIPTION_PLANS,
    isPremiumPlanType,
    normalizePlanType
} from './config/constants.js';

const PLANS = SUBSCRIPTION_PLANS;

const PUBLIC_FUNNEL_EVENTS = new Set([
    'paywall_viewed',
    'login_gate_viewed',
    'upgrade_cta_viewed',
]);

function cleanFunnelValue(value, fallback = null, maxLength = 120) {
    if (typeof value !== 'string') return fallback;
    const trimmed = value.trim();
    if (!trimmed) return fallback;
    return trimmed.slice(0, maxLength);
}

async function recordFunnelEvent(eventName, {
    userId = null,
    source = null,
    feature = null,
    planId = null,
    planType = null,
    stripeSessionId = null,
    stripeEventId = null,
    metadata = {}
} = {}) {
    try {
        await supabase.from('funnel_events').insert({
            user_id: userId,
            event_name: eventName,
            source: cleanFunnelValue(source),
            feature: cleanFunnelValue(feature),
            plan_id: cleanFunnelValue(planId),
            plan_type: cleanFunnelValue(planType),
            stripe_session_id: cleanFunnelValue(stripeSessionId),
            stripe_event_id: cleanFunnelValue(stripeEventId),
            metadata
        });
    } catch (error) {
        console.warn('[FUNNEL] Could not record funnel event:', eventName, error.message);
    }
}

function sanitizeFunnelMetadata(metadata) {
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
        return {};
    }

    const safeMetadata = {};
    const entries = Object.entries(metadata).slice(0, 12);

    for (const [rawKey, rawValue] of entries) {
        const key = cleanFunnelValue(rawKey, null, 40);
        if (!key) continue;

        if (typeof rawValue === 'string') {
            safeMetadata[key] = cleanFunnelValue(rawValue, null, 240);
        } else if (typeof rawValue === 'number' && Number.isFinite(rawValue)) {
            safeMetadata[key] = rawValue;
        } else if (typeof rawValue === 'boolean' || rawValue === null) {
            safeMetadata[key] = rawValue;
        }
    }

    return safeMetadata;
}

// Helper to check premium status (aligned with middleware logic)
export async function isPremiumUser(userId) {
    try {
        const { data: subscription } = await supabase
            .from('subscriptions')
            .select('plan_type, status, current_period_end')
            .eq('user_id', userId)
            .single();

        if (!subscription) return false;

        const isActive = subscription.status === 'active' || subscription.status === 'trialing' || subscription.status === 'cancel_pending';
        const notExpired = new Date(subscription.current_period_end) > new Date();
        const isPremium = isPremiumPlanType(subscription.plan_type);

        return isActive && notExpired && isPremium;
    } catch (e) {
        console.error('Error checking premium status:', e);
        return false;
    }
}

/**
 * Get or create a Stripe customer for the user
 */
async function getOrCreateStripeCustomer(userId, email) {
    // Check if user already has a Stripe customer ID
    const { data: userData } = await supabase
        .from('users')
        .select('stripe_customer_id')
        .eq('id', userId)
        .single();

    if (userData?.stripe_customer_id) {
        return userData.stripe_customer_id;
    }

    // Create new Stripe customer
    const customer = await stripe.customers.create({
        email,
        metadata: { supabase_user_id: userId }
    });

    // Save customer ID to users table
    await supabase
        .from('users')
        .update({ stripe_customer_id: customer.id })
        .eq('id', userId);

    return customer.id;
}

// ============================================
// GET /subscription/status - Frontend calls this to check premium access
// ============================================
router.get('/subscription/status', authenticateToken, async (req, res) => {
    try {
        const { data: subscription } = await supabase
            .from('subscriptions')
            .select('plan_type, status, current_period_end, stripe_subscription_id')
            .eq('user_id', req.user.id)
            .single();

        if (!subscription) {
            return res.json({
                planType: 'free',
                status: 'active',
                currentPeriodEnd: null,
                canCancel: false
            });
        }

        const canCancel = !!subscription.stripe_subscription_id &&
            (subscription.status === 'active' || subscription.status === 'trialing');

        res.json({
            planType: subscription.plan_type || 'free',
            status: subscription.status || 'active',
            currentPeriodEnd: subscription.current_period_end,
            canCancel
        });
    } catch (error) {
        console.error('Subscription Status Error:', error);
        res.status(500).json({ error: 'Nepodařilo se načíst stav předplatného.' });
    }
});

// ============================================
// POST /funnel-event - Public top-of-funnel tracking
// ============================================
router.post('/funnel-event', optionalPremiumCheck, async (req, res) => {
    try {
        const eventName = cleanFunnelValue(req.body?.eventName, null, 80);

        if (!eventName || !PUBLIC_FUNNEL_EVENTS.has(eventName)) {
            return res.status(400).json({ success: false, error: 'Invalid funnel event.' });
        }

        await recordFunnelEvent(eventName, {
            userId: req.user?.id || null,
            source: req.body?.source,
            feature: req.body?.feature,
            planId: req.body?.planId,
            planType: req.body?.planType,
            metadata: sanitizeFunnelMetadata(req.body?.metadata)
        });

        res.json({ success: true });
    } catch (error) {
        console.error('[FUNNEL] Public event failed:', error);
        res.status(500).json({ success: false, error: 'Could not record funnel event.' });
    }
});

// ============================================
// POST /create-checkout-session - Create Stripe Checkout for subscription
// ============================================
router.post('/create-checkout-session', authenticateToken, async (req, res) => {
    try {
        const { planId } = req.body;
        const user = req.user;
        const source = cleanFunnelValue(req.body?.source, 'direct');
        const feature = cleanFunnelValue(req.body?.feature);

        // Validate planId - must be one of the defined plans
        const validPlanIds = Object.keys(PLANS);
        if (!planId || typeof planId !== 'string' || !validPlanIds.includes(planId)) {
            await recordFunnelEvent('checkout_validation_failed', {
                userId: user.id,
                source,
                feature,
                planId: cleanFunnelValue(planId),
                metadata: { reason: 'invalid_plan_id' }
            });
            return res.status(400).json({ error: 'Invalid plan selected' });
        }

        const plan = PLANS[planId];

        if (plan.price === 0) {
            await recordFunnelEvent('checkout_validation_failed', {
                userId: user.id,
                source,
                feature,
                planId,
                planType: plan.type,
                metadata: { reason: 'free_plan_checkout_blocked' }
            });
            return res.status(400).json({ error: 'Cannot create session for free plan' });
        }

        // Get or create Stripe customer to link subscriptions
        const customerId = await getOrCreateStripeCustomer(user.id, user.email);

        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'czk',
                    product_data: {
                        name: plan.name,
                        description: 'Přístup ke všem prémiovým funkcím Mystické Hvězdy',
                    },
                    unit_amount: plan.price,
                    recurring: {
                        interval: plan.interval
                    }
                },
                quantity: 1,
            }],
            mode: 'subscription',
            payment_method_collection: 'always',
            locale: 'cs',
            success_url: `${APP_URL}/profil.html?payment=success&plan=${encodeURIComponent(planId)}&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${APP_URL}/cenik.html?payment=cancel`,
            client_reference_id: user.id,
            metadata: {
                userId: user.id,
                planId,
                planType: plan.type,
                billingInterval: plan.interval,
                source,
                feature: feature || ''
            },
            subscription_data: {
                ...(plan.trialDays > 0 && { trial_period_days: plan.trialDays }),
                metadata: {
                    userId: user.id,
                    planId,
                    planType: plan.type,
                    billingInterval: plan.interval,
                    source,
                    feature: feature || ''
                }
            }
        });

        await recordFunnelEvent('checkout_session_created', {
            userId: user.id,
            source,
            feature,
            planId,
            planType: plan.type,
            stripeSessionId: session.id,
            metadata: {
                billingInterval: plan.interval,
                amount: plan.price,
                currency: 'czk'
            }
        });

        res.json({ id: session.id, url: session.url });
    } catch (error) {
        console.error('Stripe Session Error:', error);
        await recordFunnelEvent('checkout_session_failed', {
            userId: req.user?.id,
            source: req.body?.source,
            feature: req.body?.feature,
            planId: req.body?.planId,
            metadata: { error: error.message }
        });
        res.status(500).json({ error: 'Platba se nezdařila. Zkuste to prosím později.' });
    }
});

// ============================================
// POST /cancel - Cancel active subscription
// ============================================
router.post('/cancel', authenticateToken, async (req, res) => {
    try {
        const { data: subscription } = await supabase
            .from('subscriptions')
            .select('stripe_subscription_id, status')
            .eq('user_id', req.user.id)
            .single();

        if (!subscription?.stripe_subscription_id) {
            return res.status(400).json({ error: 'Nemáte aktivní předplatné ke zrušení.' });
        }

        if (subscription.status !== 'active' && subscription.status !== 'trialing') {
            return res.status(400).json({ error: 'Předplatné již bylo zrušeno.' });
        }

        // Cancel at period end (user keeps access until current period expires)
        await stripe.subscriptions.update(subscription.stripe_subscription_id, {
            cancel_at_period_end: true
        });

        // Update local status to reflect pending cancellation
        await supabase
            .from('subscriptions')
            .update({ status: 'cancel_pending' })
            .eq('user_id', req.user.id);

        await recordFunnelEvent('subscription_cancel_requested', {
            userId: req.user.id,
            metadata: {
                stripeSubscriptionId: subscription.stripe_subscription_id,
                previousStatus: subscription.status
            }
        });

        res.json({
            success: true,
            message: 'Předplatné bude zrušeno na konci aktuálního období.'
        });
    } catch (error) {
        console.error('Cancel Subscription Error:', error);
        res.status(500).json({ error: 'Nepodařilo se zrušit předplatné.' });
    }
});

// ============================================
// POST /reactivate - Reactivate a cancelled subscription before period end
// ============================================
router.post('/reactivate', authenticateToken, async (req, res) => {
    try {
        const { data: subscription } = await supabase
            .from('subscriptions')
            .select('stripe_subscription_id, status')
            .eq('user_id', req.user.id)
            .single();

        if (!subscription?.stripe_subscription_id) {
            return res.status(400).json({ error: 'Nemáte předplatné k obnovení.' });
        }

        if (subscription.status !== 'cancel_pending') {
            return res.status(400).json({ error: 'Předplatné není ve stavu čekajícího zrušení.' });
        }

        // Remove cancellation
        await stripe.subscriptions.update(subscription.stripe_subscription_id, {
            cancel_at_period_end: false
        });

        await supabase
            .from('subscriptions')
            .update({ status: 'active' })
            .eq('user_id', req.user.id);

        await recordFunnelEvent('subscription_reactivated', {
            userId: req.user.id,
            metadata: {
                stripeSubscriptionId: subscription.stripe_subscription_id
            }
        });

        res.json({
            success: true,
            message: 'Předplatné bylo úspěšně obnoveno.'
        });
    } catch (error) {
        console.error('Reactivate Subscription Error:', error);
        res.status(500).json({ error: 'Nepodařilo se obnovit předplatné.' });
    }
});

// ============================================
// POST /portal - Create Stripe Customer Portal session for self-service management
// ============================================
router.post('/portal', authenticateToken, async (req, res) => {
    try {
        const { data: userData } = await supabase
            .from('users')
            .select('stripe_customer_id')
            .eq('id', req.user.id)
            .single();

        if (!userData?.stripe_customer_id) {
            return res.status(400).json({ error: 'Nemáte propojený platební účet.' });
        }

        const portalSession = await stripe.billingPortal.sessions.create({
            customer: userData.stripe_customer_id,
            return_url: `${APP_URL}/profil.html`
        });

        res.json({ url: portalSession.url });
    } catch (error) {
        console.error('Portal Session Error:', error);
        res.status(500).json({ error: 'Nepodařilo se otevřít správu předplatného.' });
    }
});

// ============================================
// Stripe Webhook Handler
// ============================================
export async function handleStripeWebhook(rawBody, sig) {
    let event;

    if (!STRIPE_WEBHOOK_SECRET) {
        console.error('[STRIPE] CRITICAL: STRIPE_WEBHOOK_SECRET not set. Rejecting webhook.');
        throw new Error('Webhook secret not configured');
    }
    try {
        event = stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.error('[STRIPE] Webhook signature verification failed:', err.message);
        throw new Error('Webhook signature verification failed');
    }

    console.log(`[STRIPE] Webhook received: ${event.type} (ID: ${event.id})`);

    const { error: reserveError } = await supabase
        .from('payment_events')
        .insert({
            event_id: event.id,
            event_type: event.type,
            status: 'processing'
        });

    if (reserveError) {
        if (reserveError.code === '23505') {
            console.log(`[STRIPE] Event ${event.id} already reserved/processed. Skipping.`);
            return;
        }
        console.error(`[STRIPE] Failed to reserve event ${event.id}: ${reserveError.message}`);
        throw new Error(`Event reservation failed: ${reserveError.message}`);
    }

    try {
        switch (event.type) {
            case 'checkout.session.completed':
                await handleCheckoutCompleted(event.data.object, event.id);
                break;
            case 'invoice.paid':
                await handleInvoicePaid(event.data.object, event.id);
                break;
            case 'invoice.payment_failed':
                await handleInvoicePaymentFailed(event.data.object, event.id);
                break;
            case 'customer.subscription.updated':
                await handleSubscriptionUpdated(event.data.object, event.id);
                break;
            case 'customer.subscription.deleted':
                await handleSubscriptionDeleted(event.data.object, event.id);
                break;
            case 'customer.subscription.trial_will_end':
                await handleTrialWillEnd(event.data.object);
                break;
            case 'charge.refunded':
            case 'refund.created':
                await handleRefundEvent(event.data.object, event.id, event.type);
                break;
            default:
                console.log(`[STRIPE] Unhandled event type: ${event.type}`);
        }

        // RECORD PROCESSED EVENT (idempotency guard — must succeed)
        const { error: updateError } = await supabase
            .from('payment_events')
            .update({ status: 'success' })
            .eq('event_id', event.id);
        if (updateError) {
            console.error(`[STRIPE] Failed to mark event ${event.id} as success:`, updateError.message);
            throw new Error(`Event status update failed: ${updateError.message}`);
        }

    } catch (err) {
        console.error(`[STRIPE] Error processing event ${event.id}:`, err);
        await recordFunnelEvent('stripe_webhook_failed', {
            stripeEventId: event.id,
            metadata: {
                eventType: event.type,
                error: err.message
            }
        });
        await supabase
            .from('payment_events')
            .delete()
            .eq('event_id', event.id)
            .eq('status', 'processing');
        throw err; // Re-throw to make Stripe retry
    }
}

/**
 * Handle checkout.session.completed - dispatches to one-time or subscription handler
 */
async function handleCheckoutCompleted(session, stripeEventId = null) {
    if (session.mode === 'payment' && session.metadata?.productType === 'rocni_horoskop') {
        return handleRocniHoroskopPurchase(session, stripeEventId);
    }
    return handleSubscriptionCheckoutCompleted(session, stripeEventId);
}

/**
 * Handle one-time purchase of Roční Horoskop na míru
 * Generates PDF via Claude + Playwright, sends via Resend
 */
async function handleRocniHoroskopPurchase(session, stripeEventId = null) {
    const { customerName, birthDate, sign, email, productId = 'rocni_horoskop_2026' } = session.metadata || {};
    const customerEmail = email || session.customer_email || session.customer_details?.email;

    if (!customerName || !birthDate || !sign || !customerEmail) {
        console.error('[HOROSKOP] Missing metadata in checkout session:', session.id);
        return;
    }

    console.log(`[HOROSKOP] Generating PDF for ${customerEmail} (${sign})`);

    await recordOneTimePurchase(session, {
        productType: 'rocni_horoskop',
        productId,
        email: customerEmail
    });

    await recordFunnelEvent('one_time_purchase_completed', {
        stripeSessionId: session.id,
        stripeEventId,
        metadata: {
            productType: 'rocni_horoskop',
            productId,
            amount: session.amount_total || Number(session.metadata?.price) || null,
            currency: session.currency || session.metadata?.currency || 'czk'
        }
    });

    // Run async — don't block webhook response
    setImmediate(async () => {
        try {
            const { generateHoroscopeContent, renderPdf } = await import('./services/horoscope-pdf.js');
            const { sendHoroscopePdf } = await import('./email-service.js');

            const sections = await generateHoroscopeContent({ name: customerName, birthDate, sign });
            const pdfBuffer = await renderPdf({ name: customerName, sign, birthDate, sections });

            await sendHoroscopePdf({ to: customerEmail, name: customerName, sign, pdfBuffer });
            console.log(`[HOROSKOP] PDF sent to ${customerEmail}`);
        } catch (err) {
            console.error(`[HOROSKOP] PDF generation/delivery failed for ${customerEmail}:`, err.message);
        }
    });
}

async function recordOneTimePurchase(session, { productType, productId, email }) {
    const { error } = await supabase
        .from('one_time_purchases')
        .insert({
            stripe_session_id: session.id,
            stripe_payment_intent_id: session.payment_intent || null,
            customer_email: email,
            product_type: productType,
            product_id: productId,
            amount_total: session.amount_total || Number(session.metadata?.price) || null,
            currency: session.currency || session.metadata?.currency || 'czk',
            status: session.payment_status || 'paid',
            metadata: session.metadata || {}
        });

    if (error) {
        console.warn('[HOROSKOP] Could not record one-time purchase:', error.message);
    }
}

/**
 * Handle checkout.session.completed - initial subscription creation
 */
async function handleSubscriptionCheckoutCompleted(session, stripeEventId = null) {
    const userId = session.client_reference_id || session.metadata?.userId;
    const rawPlanType = session.metadata?.planType || DEFAULT_PREMIUM_PLAN_TYPE;
    let planType = normalizePlanType(rawPlanType, DEFAULT_PREMIUM_PLAN_TYPE);
    if (!PREMIUM_PLAN_TYPES.includes(planType)) {
        console.error('[STRIPE] Invalid plan type in webhook:', rawPlanType);
        planType = DEFAULT_PREMIUM_PLAN_TYPE;
    }
    const billingInterval = session.metadata?.billingInterval || 'month';
    const stripeSubscriptionId = session.subscription;
    const stripeCustomerId = session.customer;
    const userEmail = session.customer_email || session.customer_details?.email;

    if (!userId) {
        console.error('[STRIPE] checkout.session.completed: no userId found');
        return;
    }

    console.log(`[STRIPE] Checkout completed for user ${userId}, plan: ${planType}`);

    // Fetch subscription from Stripe to get both period end and actual status (trialing vs active)
    let currentPeriodEnd;
    let subStatus = 'active';

    if (stripeSubscriptionId) {
        try {
            const stripeSub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
            currentPeriodEnd = new Date(stripeSub.current_period_end * 1000).toISOString();
            subStatus = stripeSub.status || 'active'; // 'trialing', 'active', etc.
        } catch (e) {
            console.error('[STRIPE] Failed to retrieve subscription:', e.message);
            // Fallback: use webhook data or calculate
            if (session.subscription_details?.current_period_end) {
                currentPeriodEnd = new Date(session.subscription_details.current_period_end * 1000).toISOString();
            } else {
                const expiry = new Date();
                if (billingInterval === 'year') {
                    expiry.setFullYear(expiry.getFullYear() + 1);
                } else {
                    expiry.setMonth(expiry.getMonth() + 1);
                }
                currentPeriodEnd = expiry.toISOString();
            }
        }
    } else if (session.subscription_details?.current_period_end) {
        currentPeriodEnd = new Date(session.subscription_details.current_period_end * 1000).toISOString();
    }

    // Save Stripe customer ID on the user
    if (stripeCustomerId) {
        await supabase
            .from('users')
            .update({ stripe_customer_id: stripeCustomerId, is_premium: true })
            .eq('id', userId);
    }

    const { data: existingSubscription, error: existingSubscriptionError } = await supabase
        .from('subscriptions')
        .select('stripe_subscription_id, status')
        .eq('user_id', userId)
        .maybeSingle();

    if (existingSubscriptionError) {
        console.error('[STRIPE] Failed to load existing subscription before upsert:', existingSubscriptionError);
    }

    const isFirstPaidSubscription = !existingSubscription?.stripe_subscription_id;

    // Upsert subscription record
    const subData = {
        user_id: userId,
        plan_type: planType,
        status: subStatus,
        current_period_end: currentPeriodEnd,
        stripe_subscription_id: stripeSubscriptionId || null
    };

    const { error } = await supabase
        .from('subscriptions')
        .upsert(subData, { onConflict: 'user_id' });

    if (error) {
        console.error('[STRIPE] Supabase upsert error:', error);
    } else {
        console.log(`[STRIPE] User ${userId} upgraded to ${planType}.`);

        await recordFunnelEvent('subscription_checkout_completed', {
            userId,
            source: session.metadata?.source,
            feature: session.metadata?.feature,
            planId: session.metadata?.planId,
            planType,
            stripeSessionId: session.id,
            stripeEventId,
            metadata: {
                status: subStatus,
                billingInterval,
                isFirstPaidSubscription
            }
        });

        // RETENTION: Send onboarding emails + automation sequences
        if (userEmail) {
            try {
                await sendOnboardingEmails(userId, userEmail, planType);

                // Trigger upgrade reminders (Day 7, 14) for free users upgrading
                // Only send if it's their first purchase
                if (isFirstPaidSubscription) {
                    // First purchase - send reminders and churn prevention
                    // Skip upgrade reminders for trial users (they already paid/are trialing)
                    if (subStatus !== 'trialing') {
                        try {
                            await sendUpgradeReminders(userId, userEmail);
                            await sendChurnRecoveryEmail(userId, userEmail);
                            console.log(`[RETENTION] Email sequences scheduled for new subscriber ${userId}`);
                        } catch (seqError) {
                            console.warn(`[RETENTION] Failed to schedule sequences for ${userId}:`, seqError.message);
                        }
                    }
                }

                // Schedule trial reminder emails if this is a trial subscription
                if (subStatus === 'trialing' && currentPeriodEnd) {
                    try {
                        const { sendTrialReminderEmails } = await import('./email-service.js');
                        await sendTrialReminderEmails(userId, userEmail, currentPeriodEnd);
                        console.log(`[RETENTION] Trial reminders scheduled for ${userId}`);
                    } catch (trialEmailError) {
                        console.warn(`[RETENTION] Trial reminder scheduling failed:`, trialEmailError.message);
                    }
                }
            } catch (emailError) {
                console.warn(`[RETENTION] Onboarding email failed for user ${userId}:`, emailError.message);
                // Don't block subscription if emails fail
            }
        }
    }
}

/**
 * RETENTION: Send onboarding email sequence to new premium subscriber
 * Improves conversion retention and feature discovery
 */
async function sendOnboardingEmails(userId, email, planType) {
    try {
        await sendOnboardingSequence(userId, email, planType);
    } catch (error) {
        console.error(`[RETENTION] Failed to send onboarding sequence for user ${userId}:`, error.message);
        // Don't throw - subscription is already created
    }
}

/**
 * Get feature list based on subscription plan
 */
function getFeaturesByPlan(planType) {
    const features = {
        [PLAN_TYPES.PREMIUM]: [
            'Unlimited tarot readings',
            'Weekly & monthly horoscopes',
            'Hvězdný Průvodce (chat)',
            'Nativity chart interpretation',
            'Numerology readings'
        ],
        [PLAN_TYPES.EXCLUSIVE]: [
            'Everything in Premium, plus:',
            'Priority AI responses',
            'Exclusive premium content',
            'Early access to new features',
            'Dedicated email support'
        ],
        [PLAN_TYPES.VIP]: [
            'Everything in Exclusive, plus:',
            'Priority 24/7 support (do 2h)',
            'Personalizovaný Daily Horoscope',
            'Neomezené konzultace s Průvodcem',
            'Exkluzivní měsíční Tarot (3x)',
            'Astrokartografické mapy (4x/rok)',
            'VIP komunita & diskuse'
        ],
        // 'vip' plan type byl odstraněn — v backendu neexistuje, platný typ je 'vip_majestrat'
    };

    return features[normalizePlanType(planType, DEFAULT_PREMIUM_PLAN_TYPE)] || features[DEFAULT_PREMIUM_PLAN_TYPE];
}

async function handleRefundEvent(refundOrCharge, stripeEventId, eventType) {
    await recordFunnelEvent('payment_refunded', {
        stripeEventId,
        stripeSessionId: refundOrCharge.payment_intent || null,
        metadata: {
            eventType,
            chargeId: refundOrCharge.charge || refundOrCharge.id || null,
            amount: refundOrCharge.amount_refunded || refundOrCharge.amount || null,
            currency: refundOrCharge.currency || null,
            status: refundOrCharge.status || null
        }
    });
}

/**
 * Handle invoice.paid - recurring payment succeeded (subscription renewal)
 */
async function handleInvoicePaid(invoice, stripeEventId = null) {
    const stripeSubscriptionId = invoice.subscription;
    if (!stripeSubscriptionId) return;

    // Find user by subscription ID
    const { data: sub } = await supabase
        .from('subscriptions')
        .select('user_id')
        .eq('stripe_subscription_id', stripeSubscriptionId)
        .single();

    if (!sub) {
        console.log(`[STRIPE] invoice.paid: no local subscription found for ${stripeSubscriptionId}`);
        return;
    }

    // Fetch updated period from Stripe
    try {
        const stripeSub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
        const currentPeriodEnd = new Date(stripeSub.current_period_end * 1000).toISOString();

        await supabase
            .from('subscriptions')
            .update({
                status: 'active',
                current_period_end: currentPeriodEnd
            })
            .eq('stripe_subscription_id', stripeSubscriptionId);

        await supabase.from('users').update({ is_premium: true }).eq('id', sub.user_id);

        await recordFunnelEvent('subscription_invoice_paid', {
            userId: sub.user_id,
            stripeEventId,
            metadata: {
                stripeSubscriptionId,
                amountPaid: invoice.amount_paid || null,
                currency: invoice.currency || null,
                currentPeriodEnd
            }
        });

        console.log(`[STRIPE] Subscription renewed for user ${sub.user_id} until ${currentPeriodEnd}`);
    } catch (e) {
        console.error('[STRIPE] Failed to process invoice.paid:', e.message);
    }
}

/**
 * Handle invoice.payment_failed - payment failed, mark as past_due
 */
async function handleInvoicePaymentFailed(invoice, stripeEventId = null) {
    const stripeSubscriptionId = invoice.subscription;
    if (!stripeSubscriptionId) return;

    const { error } = await supabase
        .from('subscriptions')
        .update({ status: 'past_due' })
        .eq('stripe_subscription_id', stripeSubscriptionId);

    if (error) {
        console.error('[STRIPE] Failed to mark subscription as past_due:', error);
    } else {
        await recordFunnelEvent('subscription_payment_failed', {
            stripeEventId,
            metadata: {
                stripeSubscriptionId,
                amountDue: invoice.amount_due || null,
                currency: invoice.currency || null,
                attemptCount: invoice.attempt_count || null
            }
        });
        console.log(`[STRIPE] Subscription ${stripeSubscriptionId} marked as past_due`);
    }
}

/**
 * Handle customer.subscription.updated - plan changes, trial end, etc.
 */
async function handleSubscriptionUpdated(subscription, stripeEventId = null) {
    const stripeSubscriptionId = subscription.id;

    const { data: sub } = await supabase
        .from('subscriptions')
        .select('user_id')
        .eq('stripe_subscription_id', stripeSubscriptionId)
        .single();

    if (!sub) {
        console.log(`[STRIPE] subscription.updated: no local record for ${stripeSubscriptionId}`);
        return;
    }

    const currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();
    let status = subscription.status; // active, past_due, canceled, trialing, etc.

    // Map Stripe statuses to our internal statuses
    if (subscription.cancel_at_period_end && (status === 'active' || status === 'trialing')) {
        status = 'cancel_pending';
    }

    await supabase
        .from('subscriptions')
        .update({
            status,
            current_period_end: currentPeriodEnd
        })
        .eq('stripe_subscription_id', stripeSubscriptionId);

    // Update is_premium flag
    const isPremium = (status === 'active' || status === 'trialing' || status === 'cancel_pending');
    await supabase.from('users').update({ is_premium: isPremium }).eq('id', sub.user_id);

    await recordFunnelEvent('subscription_updated', {
        userId: sub.user_id,
        stripeEventId,
        metadata: {
            stripeSubscriptionId,
            status,
            isPremium,
            cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
            currentPeriodEnd
        }
    });

    console.log(`[STRIPE] Subscription ${stripeSubscriptionId} updated: status=${status}`);
}

/**
 * Handle customer.subscription.deleted - subscription fully cancelled
 */
async function handleSubscriptionDeleted(subscription, stripeEventId = null) {
    const stripeSubscriptionId = subscription.id;

    const { data: sub } = await supabase
        .from('subscriptions')
        .select('user_id')
        .eq('stripe_subscription_id', stripeSubscriptionId)
        .single();

    if (!sub) {
        console.log(`[STRIPE] subscription.deleted: no local record for ${stripeSubscriptionId}`);
        return;
    }

    await supabase
        .from('subscriptions')
        .update({
            status: 'cancelled',
            plan_type: PLAN_TYPES.FREE,
            stripe_subscription_id: null
        })
        .eq('user_id', sub.user_id);

    await supabase.from('users').update({ is_premium: false }).eq('id', sub.user_id);

    await recordFunnelEvent('subscription_cancelled', {
        userId: sub.user_id,
        planType: PLAN_TYPES.FREE,
        stripeEventId,
        metadata: {
            stripeSubscriptionId,
            status: subscription.status || 'deleted'
        }
    });

    console.log(`[STRIPE] Subscription cancelled for user ${sub.user_id}`);
}

/**
 * Handle customer.subscription.trial_will_end
 * Stripe sends this 3 days before trial ends — schedule reminder emails
 */
async function handleTrialWillEnd(subscription) {
    const stripeSubscriptionId = subscription.id;
    const trialEnd = subscription.trial_end
        ? new Date(subscription.trial_end * 1000).toISOString()
        : null;

    if (!trialEnd) {
        console.warn('[STRIPE] trial_will_end: no trial_end date on subscription');
        return;
    }

    const { data: sub } = await supabase
        .from('subscriptions')
        .select('user_id')
        .eq('stripe_subscription_id', stripeSubscriptionId)
        .single();

    if (!sub) {
        console.log(`[STRIPE] trial_will_end: no local record for ${stripeSubscriptionId}`);
        return;
    }

    const { data: user } = await supabase
        .from('users')
        .select('email')
        .eq('id', sub.user_id)
        .single();

    if (!user?.email) {
        console.warn(`[STRIPE] trial_will_end: no email for user ${sub.user_id}`);
        return;
    }

    await sendTrialReminderEmails(sub.user_id, user.email, trialEnd);
    console.log(`[STRIPE] Trial reminder emails scheduled for user ${sub.user_id}, trial ends: ${trialEnd}`);
}

// ============================================
// RETENTION ENDPOINTS (Churn Prevention)
// ============================================

/**
 * POST /retention/feedback
 * Save user feedback during cancellation flow
 */
router.post('/retention/feedback', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { type, reason, feedback } = req.body;

        // Validate inputs
        const validTypes = ['churn', 'pause', 'downgrade', 'cancellation'];
        const validReasons = [
            'too_expensive',
            'not_using',
            'technical_issues',
            'found_alternative',
            'found_better',
            'personal',
            'other',
            'not_provided'
        ];

        if (!type || !validTypes.includes(type)) {
            return res.status(400).json({ error: 'Invalid feedback type' });
        }

        if (!reason || !validReasons.includes(reason)) {
            return res.status(400).json({ error: 'Invalid feedback reason' });
        }

        // Validate optional feedback text
        let validatedFeedback = null;
        if (feedback) {
            validatedFeedback = validateString(feedback, 'Feedback', 0, 500);
        }

        // Create retention_feedback table if doesn't exist
        const { data, error } = await supabase
            .from('retention_feedback')
            .insert({
                user_id: userId,
                type,
                reason,
                feedback: validatedFeedback,
                created_at: new Date().toISOString()
            });

        if (error) {
            console.error('[RETENTION] Error saving feedback:', error);
            return res.status(500).json({ error: 'Failed to save feedback' });
        }

        console.log(`[RETENTION] Feedback saved for user ${userId}: ${reason}`);
        res.json({ success: true, message: 'Feedback saved' });
    } catch (err) {
        console.error('[RETENTION] Error in feedback endpoint:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /subscription/pause
 * Pause subscription for specified days (no charge)
 */
router.post('/subscription/pause', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        let { pauseDays = 30 } = req.body;

        // Validate pauseDays
        try {
            pauseDays = validateNumber(pauseDays || 30, 'Pause days', 1, 365);
        } catch (err) {
            return res.status(400).json({ error: err.message });
        }

        // Get user's subscription
        const { data: sub, error: subError } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (!sub || subError) {
            return res.status(404).json({ error: 'Subscription not found' });
        }

        if (sub.status !== 'active') {
            return res.status(400).json({ error: 'Can only pause active subscriptions' });
        }

        // Calculate pause end date
        const pauseUntil = new Date();
        pauseUntil.setDate(pauseUntil.getDate() + pauseDays);

        // Update subscription status to paused
        const { error: updateError } = await supabase
            .from('subscriptions')
            .update({
                status: 'paused',
                pause_until: pauseUntil.toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('user_id', userId);

        if (updateError) {
            console.error('[RETENTION] Error pausing subscription:', updateError);
            return res.status(500).json({ error: 'Failed to pause subscription' });
        }

        // If Stripe subscription exists, update it
        if (sub.stripe_subscription_id) {
            try {
                await stripe.subscriptions.update(sub.stripe_subscription_id, {
                    pause_collection: {
                        behavior: 'mark_uncollectible',
                        resumes_at: Math.floor(pauseUntil.getTime() / 1000)
                    }
                });
            } catch (stripeErr) {
                console.warn('[RETENTION] Warning: Could not pause Stripe subscription:', stripeErr.message);
                // Don't fail the endpoint if Stripe update fails
            }
        }

        // Send pause confirmation email
        try {
            const { data: userData } = await supabase
                .from('users')
                .select('email')
                .eq('id', userId)
                .single();

            if (userData?.email) {
                await sendPauseEmail(userData.email, pauseDays);
            }
        } catch (emailErr) {
            console.warn('[RETENTION] Warning: Could not send pause email:', emailErr.message);
        }

        console.log(`[RETENTION] Subscription paused for user ${userId} until ${pauseUntil}`);
        res.json({
            success: true,
            message: `Subscription paused for ${pauseDays} days`,
            pauseUntil: pauseUntil.toISOString()
        });
    } catch (err) {
        console.error('[RETENTION] Error in pause endpoint:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /subscription/apply-discount
 * Apply discount coupon to active subscription
 */
async function getOrCreateRetentionCoupon(couponCode) {
    try {
        return await stripe.coupons.retrieve(couponCode);
    } catch (err) {
        if (couponCode !== 'STAY25') {
            throw err;
        }

        return stripe.coupons.create({
            id: 'STAY25',
            name: 'Retention 25% for 3 months',
            percent_off: 25,
            duration: 'repeating',
            duration_in_months: 3
        });
    }
}

router.post('/subscription/apply-discount', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { couponCode } = req.body;

        // Validate coupon code
        if (!couponCode || typeof couponCode !== 'string') {
            return res.status(400).json({ error: 'Coupon code is required' });
        }

        const validatedCode = couponCode.trim().toUpperCase();

        // Coupon codes should be alphanumeric and short (typically 10-50 chars max)
        if (!/^[A-Z0-9\-]{3,50}$/.test(validatedCode)) {
            return res.status(400).json({ error: 'Invalid coupon code format' });
        }

        // Get user's subscription
        const { data: sub, error: subError } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (!sub || subError || !sub.stripe_subscription_id) {
            return res.status(404).json({ error: 'Stripe subscription not found' });
        }

        // Verify coupon exists in Stripe, create the standard retention coupon if missing
        let coupon;
        try {
            coupon = await getOrCreateRetentionCoupon(validatedCode);
        } catch (err) {
            return res.status(400).json({ error: `Coupon not found` });
        }

        if (coupon.valid === false) {
            return res.status(400).json({ error: 'Coupon is no longer valid' });
        }

        // Apply coupon to subscription
        try {
            await stripe.subscriptions.update(sub.stripe_subscription_id, {
                coupon: validatedCode
            });
        } catch (stripeErr) {
            console.error('[STRIPE] Discount error:', stripeErr.message);
            return res.status(400).json({ error: 'Nepodařilo se použít slevu. Zkontrolujte kód a zkuste to znovu.' });
        }

        // Log discount application
        await supabase
            .from('retention_feedback')
            .insert({
                user_id: userId,
                type: 'discount_applied',
                reason: couponCode,
                feedback: `Applied coupon ${couponCode}`,
                created_at: new Date().toISOString()
            })
            .catch(err => console.warn('Could not log discount application:', err));

        // Send discount confirmation email
        try {
            const { data: userData } = await supabase
                .from('users')
                .select('email')
                .eq('id', userId)
                .single();

            if (userData?.email) {
                const discountPercent = coupon.percent_off || coupon.amount_off;
                const months = coupon.duration === 'repeating' ? coupon.duration_in_months : 1;
                await sendDiscountEmail(userData.email, discountPercent, months);
            }
        } catch (emailErr) {
            console.warn('[RETENTION] Warning: Could not send discount email:', emailErr.message);
        }

        console.log(`[RETENTION] Discount coupon '${couponCode}' applied to user ${userId}`);
        res.json({
            success: true,
            message: `Coupon '${couponCode}' applied successfully`,
            discount: {
                name: coupon.name,
                percent_off: coupon.percent_off,
                amount_off: coupon.amount_off,
                duration: coupon.duration
            }
        });
    } catch (err) {
        console.error('[RETENTION] Error in apply-discount endpoint:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /email/send
 * Send email via Resend
 */
router.post('/email/send', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { template, data } = req.body;

        if (!template) {
            return res.status(400).json({ error: 'template required' });
        }

        // Get user's email
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('email')
            .eq('id', userId)
            .single();

        if (!userData?.email || userError) {
            return res.status(404).json({ error: 'User email not found' });
        }

        // Send email via Resend
        try {
            const result = await sendEmail({
                to: userData.email,
                template,
                data: data || {}
            });

            res.json({
                success: true,
                message: 'Email sent successfully',
                emailId: result.emailId,
                template,
                to: userData.email
            });
        } catch (sendErr) {
            console.error('[EMAIL] Error sending email:', sendErr);
            return res.status(500).json({ error: 'Failed to send email' });
        }
    } catch (err) {
        console.error('[EMAIL] Error in send endpoint:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Legacy endpoint
router.post('/process', authenticateToken, async (req, res) => {
    res.status(410).json({ success: false, error: 'Tento endpoint byl nahrazen Stripe Checkout.' });
});

export default router;
