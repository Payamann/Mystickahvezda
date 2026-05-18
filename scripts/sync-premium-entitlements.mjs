#!/usr/bin/env node
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { isPremiumPlanType, normalizePlanType } from '../server/config/constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(rootDir, 'server', '.env') });

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(['active', 'trialing', 'cancel_pending', 'past_due']);

function parseArgs(argv) {
    const args = {
        execute: false,
        json: false,
        limit: 1000,
    };

    for (let i = 0; i < argv.length; i += 1) {
        const arg = argv[i];
        if (arg === '--execute') args.execute = true;
        else if (arg === '--json') args.json = true;
        else if (arg === '--limit') args.limit = Number(argv[++i]);
        else if (arg === '--help' || arg === '-h') {
            console.log([
                'Usage: node scripts/sync-premium-entitlements.mjs [--execute] [--json] [--limit 1000]',
                '',
                'Dry-run by default. Finds active premium subscriptions whose users.is_premium flag is not true.',
                'Use --execute only after reviewing the dry-run output.',
            ].join('\n'));
            process.exit(0);
        } else {
            throw new Error(`Unknown argument: ${arg}`);
        }
    }

    if (!Number.isFinite(args.limit) || args.limit < 1 || args.limit > 5000) {
        throw new Error('--limit must be a number between 1 and 5000.');
    }

    return args;
}

function resolveSupabaseUrl(value) {
    if (!value) return '';
    return value.startsWith('http') ? value : `https://${value}.supabase.co`;
}

function maskId(value) {
    const text = String(value || '');
    if (text.length <= 10) return text || '(missing)';
    return `${text.slice(0, 6)}...${text.slice(-4)}`;
}

async function fetchUsersById(supabase, userIds) {
    if (userIds.length === 0) return new Map();

    const users = new Map();
    const chunkSize = 100;
    for (let start = 0; start < userIds.length; start += chunkSize) {
        const chunk = userIds.slice(start, start + chunkSize);
        const { data, error } = await supabase
            .from('users')
            .select('id,is_premium')
            .in('id', chunk);
        if (error) throw error;
        (data || []).forEach((row) => users.set(row.id, row));
    }
    return users;
}

async function updateUsersPremiumFlag(supabase, userIds) {
    if (userIds.length === 0) return 0;

    const { data, error } = await supabase
        .from('users')
        .update({ is_premium: true })
        .in('id', userIds)
        .select('id');

    if (error) throw error;
    return Array.isArray(data) ? data.length : userIds.length;
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    const supabaseUrl = resolveSupabaseUrl(process.env.SUPABASE_URL);
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
        throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in server/.env.');
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: subscriptions, error } = await supabase
        .from('subscriptions')
        .select('id,user_id,status,plan_type,current_period_end')
        .in('status', Array.from(ACTIVE_SUBSCRIPTION_STATUSES))
        .limit(args.limit);
    if (error) throw error;

    const activeSubscriptions = subscriptions || [];
    const premiumSubscriptions = activeSubscriptions.filter((row) => isPremiumPlanType(row.plan_type));
    const userIds = [...new Set(premiumSubscriptions.map((row) => row.user_id).filter(Boolean))];
    const usersById = await fetchUsersById(supabase, userIds);
    const mismatches = premiumSubscriptions.filter((row) => usersById.get(row.user_id)?.is_premium !== true);
    const missingUsers = premiumSubscriptions.filter((row) => !usersById.has(row.user_id));
    const fixUserIds = [...new Set(mismatches.map((row) => row.user_id).filter((id) => usersById.has(id)))];

    let updatedUsers = 0;
    if (args.execute) {
        updatedUsers = await updateUsersPremiumFlag(supabase, fixUserIds);
    }

    const result = {
        mode: args.execute ? 'execute' : 'dry-run',
        activeSubscriptions: activeSubscriptions.length,
        activePremiumSubscriptions: premiumSubscriptions.length,
        premiumFlagMismatches: mismatches.length,
        premiumRowsMissingUser: missingUsers.length,
        usersToUpdate: fixUserIds.length,
        updatedUsers,
        samples: mismatches.slice(0, 5).map((row) => ({
            subscriptionId: maskId(row.id),
            userId: maskId(row.user_id),
            status: row.status,
            planType: row.plan_type,
            normalizedPlanType: normalizePlanType(row.plan_type),
            currentPeriodEnd: row.current_period_end || null,
        })),
    };

    if (args.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
    }

    console.log(`Premium entitlement sync ${result.mode}`);
    console.log(`Active premium subscriptions: ${result.activePremiumSubscriptions}`);
    console.log(`Premium flag mismatches: ${result.premiumFlagMismatches}`);
    console.log(`Users to update: ${result.usersToUpdate}`);
    if (args.execute) {
        console.log(`Updated users: ${result.updatedUsers}`);
    } else if (result.usersToUpdate > 0) {
        console.log('No changes written. Re-run with --execute after review.');
    }
    result.samples.forEach((sample, index) => {
        console.log(`${index + 1}. user=${sample.userId} subscription=${sample.subscriptionId} plan=${sample.planType} normalized=${sample.normalizedPlanType}`);
    });
}

main().catch((error) => {
    console.error(`sync-premium-entitlements failed: ${error?.message || error}`);
    process.exit(1);
});
