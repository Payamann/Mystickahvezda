#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import {
    DEFAULT_PREMIUM_PLAN_TYPE,
    LIVE_STRIPE_PRICE_IDS,
    PREMIUM_PLAN_TYPES,
    SUBSCRIPTION_PLANS,
    getPlanTypeForPlanId,
    normalizePlanType,
} from '../server/config/constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(rootDir, 'server', '.env') });

const ACTIVE_STRIPE_SUBSCRIPTION_STATUSES = new Set(['active', 'trialing', 'past_due']);
const STRIPE_PRICE_ENV_KEYS = Object.freeze({
    pruvodce: 'STRIPE_PRICE_PRUVODCE_MONTHLY',
    'pruvodce-rocne': 'STRIPE_PRICE_PRUVODCE_YEARLY',
    osviceni: 'STRIPE_PRICE_OSVICENI_MONTHLY',
    'osviceni-rocne': 'STRIPE_PRICE_OSVICENI_YEARLY',
    'vip-majestrat': 'STRIPE_PRICE_VIP_MAJESTRAT_MONTHLY',
});

function usage() {
    return [
        'Usage: node scripts/reconcile-stripe-subscriptions.mjs --email user@example.com [--execute] [--json]',
        '       node scripts/reconcile-stripe-subscriptions.mjs --customer cus_... [--execute] [--json]',
        '       node scripts/reconcile-stripe-subscriptions.mjs --subscription sub_... [--execute] [--json]',
        '',
        'Dry-run by default. Uses Stripe as source of truth and repairs Supabase users/subscriptions.',
        'Requires STRIPE_SECRET_KEY and SUPABASE_SERVICE_ROLE_KEY. Refuses non-live Stripe keys unless --allow-test is passed.',
        'Also checks whether a live webhook endpoint for /webhook/stripe is enabled.',
    ].join('\n');
}

function parseArgs(argv) {
    const args = {
        emails: [],
        customers: [],
        subscriptions: [],
        execute: false,
        json: false,
        allowTest: false,
        recordFunnel: true,
        limit: 10,
    };

    for (let i = 0; i < argv.length; i += 1) {
        const arg = argv[i];
        const next = () => argv[++i];

        if (arg === '--help' || arg === '-h') {
            console.log(usage());
            process.exit(0);
        } else if (arg === '--email') {
            args.emails.push(next());
        } else if (arg.startsWith('--email=')) {
            args.emails.push(arg.slice('--email='.length));
        } else if (arg === '--customer') {
            args.customers.push(next());
        } else if (arg.startsWith('--customer=')) {
            args.customers.push(arg.slice('--customer='.length));
        } else if (arg === '--subscription') {
            args.subscriptions.push(next());
        } else if (arg.startsWith('--subscription=')) {
            args.subscriptions.push(arg.slice('--subscription='.length));
        } else if (arg === '--execute') {
            args.execute = true;
        } else if (arg === '--json') {
            args.json = true;
        } else if (arg === '--allow-test') {
            args.allowTest = true;
        } else if (arg === '--no-funnel') {
            args.recordFunnel = false;
        } else if (arg === '--limit') {
            args.limit = Number(next());
        } else if (arg.startsWith('--limit=')) {
            args.limit = Number(arg.slice('--limit='.length));
        } else {
            throw new Error(`Unknown argument: ${arg}\n${usage()}`);
        }
    }

    args.emails = normalizeUnique(args.emails.map((email) => String(email || '').trim().toLowerCase()).filter(Boolean));
    args.customers = normalizeUnique(args.customers.map((id) => String(id || '').trim()).filter(Boolean));
    args.subscriptions = normalizeUnique(args.subscriptions.map((id) => String(id || '').trim()).filter(Boolean));

    if (!args.emails.length && !args.customers.length && !args.subscriptions.length) {
        throw new Error(`Provide --email, --customer, or --subscription.\n${usage()}`);
    }
    if (!Number.isFinite(args.limit) || args.limit < 1 || args.limit > 100) {
        throw new Error('--limit must be a number between 1 and 100.');
    }

    return args;
}

function normalizeUnique(values) {
    return [...new Set(values)];
}

function resolveSupabaseUrl(value) {
    if (!value) return '';
    return value.startsWith('http') ? value : `https://${value}.supabase.co`;
}

function unixToIso(value) {
    const seconds = Number(value);
    if (!Number.isFinite(seconds) || seconds <= 0) return null;
    return new Date(seconds * 1000).toISOString();
}

function maskId(value) {
    const text = String(value || '');
    if (!text) return null;
    if (text.length <= 10) return text;
    return `${text.slice(0, 6)}...${text.slice(-4)}`;
}

function maskEmail(email) {
    if (!email) return null;
    const [local, domain = ''] = String(email).split('@');
    return `${local.slice(0, 2)}***@${domain}`;
}

function buildPriceIdPlanMap(env = process.env) {
    const entries = [];
    for (const [planId, priceId] of Object.entries(LIVE_STRIPE_PRICE_IDS)) {
        if (priceId) entries.push([priceId, planId]);
    }
    for (const [planId, envKey] of Object.entries(STRIPE_PRICE_ENV_KEYS)) {
        if (env[envKey]) entries.push([env[envKey], planId]);
    }
    return new Map(entries);
}

function normalizeStripeStatus(status) {
    const text = String(status || '').trim().toLowerCase();
    if (text === 'canceled') return 'cancelled';
    return text || 'unknown';
}

function getSubscriptionItems(subscription) {
    const data = subscription?.items?.data;
    return Array.isArray(data) ? data : [];
}

export function inferPlanFromStripeSubscription(subscription, { priceIdPlanMap = buildPriceIdPlanMap() } = {}) {
    const warnings = [];
    const metadata = subscription?.metadata || {};
    const metadataPlanType = normalizePlanType(metadata.planType, null);
    if (metadataPlanType && PREMIUM_PLAN_TYPES.includes(metadataPlanType)) {
        return {
            planId: metadata.planId || null,
            planType: metadataPlanType,
            source: 'subscription.metadata.planType',
            priceId: getSubscriptionItems(subscription)[0]?.price?.id || null,
            warnings,
        };
    }

    if (metadata.planId && SUBSCRIPTION_PLANS[metadata.planId]) {
        return {
            planId: metadata.planId,
            planType: getPlanTypeForPlanId(metadata.planId, DEFAULT_PREMIUM_PLAN_TYPE),
            source: 'subscription.metadata.planId',
            priceId: getSubscriptionItems(subscription)[0]?.price?.id || null,
            warnings,
        };
    }

    for (const item of getSubscriptionItems(subscription)) {
        const priceId = item?.price?.id;
        const planId = priceId ? priceIdPlanMap.get(priceId) : null;
        if (planId && SUBSCRIPTION_PLANS[planId]) {
            return {
                planId,
                planType: getPlanTypeForPlanId(planId, DEFAULT_PREMIUM_PLAN_TYPE),
                source: 'price.id',
                priceId,
                warnings,
            };
        }
    }

    warnings.push('Could not map Stripe price or metadata to a configured plan; using default premium plan type.');
    return {
        planId: null,
        planType: DEFAULT_PREMIUM_PLAN_TYPE,
        source: 'fallback',
        priceId: getSubscriptionItems(subscription)[0]?.price?.id || null,
        warnings,
    };
}

function summarizeStripeSubscription(subscription, planInference) {
    const item = getSubscriptionItems(subscription)[0] || {};
    const price = item.price || {};
    return {
        id: subscription.id,
        maskedId: maskId(subscription.id),
        customerId: typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id || null,
        maskedCustomerId: maskId(typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id),
        status: normalizeStripeStatus(subscription.status),
        currentPeriodEnd: unixToIso(subscription.current_period_end),
        cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
        created: unixToIso(subscription.created),
        planId: planInference.planId,
        planType: planInference.planType,
        planInferenceSource: planInference.source,
        priceId: planInference.priceId || price.id || null,
        maskedPriceId: maskId(planInference.priceId || price.id),
        unitAmount: price.unit_amount ?? null,
        currency: price.currency || null,
        interval: price.recurring?.interval || null,
        warnings: planInference.warnings,
    };
}

async function fetchWebhookEndpointHealth(stripe) {
    const response = await stripe.webhookEndpoints.list({ limit: 100 });
    const endpoints = response.data || [];
    const matching = endpoints.filter((endpoint) => /\/webhook\/stripe\/?$/.test(endpoint.url || ''));
    return {
        total: endpoints.length,
        matching: matching.map((endpoint) => ({
            id: endpoint.id,
            maskedId: maskId(endpoint.id),
            url: endpoint.url,
            status: endpoint.status,
            enabledEvents: endpoint.enabled_events || [],
        })),
        hasEnabledStripeWebhook: matching.some((endpoint) => endpoint.status === 'enabled'),
    };
}

async function fetchCustomers(stripe, args) {
    const customers = new Map();

    for (const customerId of args.customers) {
        const customer = await stripe.customers.retrieve(customerId);
        if (!customer.deleted) customers.set(customer.id, customer);
    }

    for (const subscriptionId of args.subscriptions) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const customerId = typeof subscription.customer === 'string'
            ? subscription.customer
            : subscription.customer?.id;
        if (customerId && !customers.has(customerId)) {
            const customer = await stripe.customers.retrieve(customerId);
            if (!customer.deleted) customers.set(customer.id, customer);
        }
    }

    for (const email of args.emails) {
        const response = await stripe.customers.list({ email, limit: args.limit });
        for (const customer of response.data || []) {
            customers.set(customer.id, customer);
        }
    }

    return [...customers.values()];
}

async function fetchCandidateSubscriptions(stripe, args, customers) {
    const subscriptions = new Map();

    for (const subscriptionId of args.subscriptions) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        subscriptions.set(subscription.id, subscription);
    }

    for (const customer of customers) {
        const response = await stripe.subscriptions.list({
            customer: customer.id,
            status: 'all',
            limit: args.limit,
        });
        for (const subscription of response.data || []) {
            subscriptions.set(subscription.id, subscription);
        }
    }

    return [...subscriptions.values()].sort((left, right) => (right.created || 0) - (left.created || 0));
}

async function findUsersForCustomer(supabase, customer) {
    const candidates = new Map();
    const customerId = customer?.id || null;
    const email = String(customer?.email || '').trim().toLowerCase();

    if (email) {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email);
        if (error) throw error;
        for (const row of data || []) candidates.set(row.id, row);
    }

    if (customerId) {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('stripe_customer_id', customerId);
        if (error) throw error;
        for (const row of data || []) candidates.set(row.id, row);
    }

    return [...candidates.values()];
}

async function findSubscriptionForUser(supabase, userId) {
    const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
    if (error) throw error;
    return data || null;
}

function isSubscriptionEntitling(subscriptionSummary) {
    return ACTIVE_STRIPE_SUBSCRIPTION_STATUSES.has(subscriptionSummary.status)
        && PREMIUM_PLAN_TYPES.includes(subscriptionSummary.planType);
}

function buildPlannedChange({ user, localSubscription, customer, subscriptionSummary }) {
    const shouldGrantPremium = isSubscriptionEntitling(subscriptionSummary);
    const userUpdate = {
        stripe_customer_id: customer.id,
        is_premium: shouldGrantPremium,
    };
    const subscriptionUpsert = {
        user_id: user.id,
        plan_type: shouldGrantPremium ? subscriptionSummary.planType : 'free',
        status: subscriptionSummary.status,
        current_period_end: subscriptionSummary.currentPeriodEnd,
        stripe_subscription_id: subscriptionSummary.id,
    };

    return {
        user: {
            id: user.id,
            maskedId: maskId(user.id),
            email: maskEmail(user.email),
            isPremiumBefore: user.is_premium,
            stripeCustomerIdBefore: maskId(user.stripe_customer_id),
        },
        stripeCustomer: {
            id: customer.id,
            maskedId: maskId(customer.id),
            email: maskEmail(customer.email),
        },
        stripeSubscription: {
            ...subscriptionSummary,
            id: subscriptionSummary.id,
            customerId: subscriptionSummary.customerId,
            priceId: subscriptionSummary.priceId,
        },
        localSubscriptionBefore: localSubscription ? {
            id: maskId(localSubscription.id),
            planType: localSubscription.plan_type,
            status: localSubscription.status,
            currentPeriodEnd: localSubscription.current_period_end,
            stripeSubscriptionId: maskId(localSubscription.stripe_subscription_id),
        } : null,
        shouldGrantPremium,
        userUpdate,
        subscriptionUpsert,
        action: shouldGrantPremium ? 'grant_or_sync_premium' : 'sync_inactive_subscription',
    };
}

function redactChange(change) {
    return {
        ...change,
        user: {
            ...change.user,
            id: change.user.maskedId,
        },
        stripeCustomer: {
            ...change.stripeCustomer,
            id: change.stripeCustomer.maskedId,
        },
        stripeSubscription: {
            ...change.stripeSubscription,
            id: change.stripeSubscription.maskedId,
            customerId: change.stripeSubscription.maskedCustomerId,
            priceId: change.stripeSubscription.maskedPriceId,
        },
        userUpdate: {
            stripe_customer_id: maskId(change.userUpdate.stripe_customer_id),
            is_premium: change.userUpdate.is_premium,
        },
        subscriptionUpsert: {
            ...change.subscriptionUpsert,
            user_id: maskId(change.subscriptionUpsert.user_id),
            stripe_subscription_id: maskId(change.subscriptionUpsert.stripe_subscription_id),
        },
    };
}

async function applyChange(supabase, change, { recordFunnel }) {
    const { error: userError } = await supabase
        .from('users')
        .update(change.userUpdate)
        .eq('id', change.user.id);
    if (userError) throw userError;

    const { error: subscriptionError } = await supabase
        .from('subscriptions')
        .upsert(change.subscriptionUpsert, { onConflict: 'user_id' });
    if (subscriptionError) throw subscriptionError;

    if (recordFunnel) {
        const { error: funnelError } = await supabase
            .from('funnel_events')
            .insert({
                user_id: change.user.id,
                event_name: 'subscription_entitlement_reconciled',
                source: 'stripe_reconciliation',
                feature: 'premium_membership',
                plan_id: change.stripeSubscription.planId,
                plan_type: change.subscriptionUpsert.plan_type,
                stripe_session_id: null,
                stripe_event_id: null,
                metadata: {
                    stripe_subscription_id: change.stripeSubscription.id,
                    stripe_customer_id: change.stripeCustomer.id,
                    stripe_status: change.stripeSubscription.status,
                    action: change.action,
                    plan_inference_source: change.stripeSubscription.planInferenceSource,
                },
            });
        if (funnelError) throw funnelError;
    }
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    const stripeKey = process.env.STRIPE_SECRET_KEY || '';
    if (!stripeKey) throw new Error('Missing STRIPE_SECRET_KEY.');
    if (!args.allowTest && !stripeKey.startsWith('sk_live_')) {
        throw new Error('Refusing to reconcile with a non-live Stripe key. Pass --allow-test only for local test runs.');
    }

    const supabaseUrl = resolveSupabaseUrl(process.env.SUPABASE_URL);
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
        throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
    }

    const stripe = new Stripe(stripeKey);
    const supabase = createClient(supabaseUrl, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
    });
    const priceIdPlanMap = buildPriceIdPlanMap();

    const [webhookHealth, customers] = await Promise.all([
        fetchWebhookEndpointHealth(stripe),
        fetchCustomers(stripe, args),
    ]);
    const subscriptions = await fetchCandidateSubscriptions(stripe, args, customers);
    const customersById = new Map(customers.map((customer) => [customer.id, customer]));

    const changes = [];
    const skipped = [];
    for (const subscription of subscriptions) {
        const customerId = typeof subscription.customer === 'string'
            ? subscription.customer
            : subscription.customer?.id;
        let customer = customersById.get(customerId);
        if (!customer && customerId) {
            customer = await stripe.customers.retrieve(customerId);
            if (!customer.deleted) customersById.set(customer.id, customer);
        }
        if (!customer || customer.deleted) {
            skipped.push({ subscriptionId: maskId(subscription.id), reason: 'missing_or_deleted_customer' });
            continue;
        }

        const users = await findUsersForCustomer(supabase, customer);
        if (users.length === 0) {
            skipped.push({
                subscriptionId: maskId(subscription.id),
                customerId: maskId(customer.id),
                customerEmail: maskEmail(customer.email),
                reason: 'no_matching_supabase_user',
            });
            continue;
        }
        if (users.length > 1) {
            skipped.push({
                subscriptionId: maskId(subscription.id),
                customerId: maskId(customer.id),
                customerEmail: maskEmail(customer.email),
                reason: 'multiple_matching_supabase_users',
                users: users.map((user) => maskId(user.id)),
            });
            continue;
        }

        const planInference = inferPlanFromStripeSubscription(subscription, { priceIdPlanMap });
        const subscriptionSummary = summarizeStripeSubscription(subscription, planInference);
        const localSubscription = await findSubscriptionForUser(supabase, users[0].id);
        changes.push(buildPlannedChange({
            user: users[0],
            localSubscription,
            customer,
            subscriptionSummary,
        }));
    }

    const applied = [];
    if (args.execute) {
        for (const change of changes) {
            await applyChange(supabase, change, { recordFunnel: args.recordFunnel });
            applied.push(change);
        }
    }

    const result = {
        mode: args.execute ? 'execute' : 'dry-run',
        stripeMode: stripeKey.startsWith('sk_live_') ? 'live' : 'test',
        webhookHealth: {
            total: webhookHealth.total,
            hasEnabledStripeWebhook: webhookHealth.hasEnabledStripeWebhook,
            matching: webhookHealth.matching.map((endpoint) => ({
                id: endpoint.maskedId,
                url: endpoint.url,
                status: endpoint.status,
                enabledEvents: endpoint.enabledEvents,
            })),
        },
        customersChecked: customers.length,
        subscriptionsChecked: subscriptions.length,
        plannedChanges: changes.map(redactChange),
        skipped,
        applied: applied.map(redactChange),
    };

    if (args.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
    }

    console.log(`Stripe subscription reconciliation ${result.mode} (${result.stripeMode})`);
    console.log(`Webhook endpoint /webhook/stripe enabled: ${result.webhookHealth.hasEnabledStripeWebhook ? 'yes' : 'NO'}`);
    console.log(`Customers checked: ${result.customersChecked}; subscriptions checked: ${result.subscriptionsChecked}`);
    console.log(`Planned changes: ${result.plannedChanges.length}; skipped: ${result.skipped.length}; applied: ${result.applied.length}`);
    for (const change of result.plannedChanges) {
        console.log([
            `- ${change.user.email}`,
            `action=${change.action}`,
            `before=${change.localSubscriptionBefore?.planType || '(none)'}/${change.localSubscriptionBefore?.status || '(none)'}`,
            `after=${change.subscriptionUpsert.plan_type}/${change.subscriptionUpsert.status}`,
            `period_end=${change.subscriptionUpsert.current_period_end || '(missing)'}`,
            `subscription=${change.subscriptionUpsert.stripe_subscription_id || '(missing)'}`,
        ].join(' | '));
        for (const warning of change.stripeSubscription.warnings || []) {
            console.log(`  warning: ${warning}`);
        }
    }
    for (const skip of result.skipped) {
        console.log(`- skipped ${skip.subscriptionId || skip.customerId || skip.customerEmail}: ${skip.reason}`);
    }
    if (!args.execute && changes.length > 0) {
        console.log('No changes written. Re-run with --execute after reviewing the dry-run.');
    }
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
    main().catch((error) => {
        console.error(`reconcile-stripe-subscriptions failed: ${error?.message || error}`);
        process.exit(1);
    });
}
