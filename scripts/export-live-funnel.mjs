#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(rootDir, 'server', '.env') });

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(['active', 'trialing', 'cancel_pending', 'past_due']);
const DAY_MS = 24 * 60 * 60 * 1000;

function parseArgs(argv) {
    const args = {
        days: 90,
        limit: 5000,
        output: path.join(rootDir, 'social-media-agent', 'output', 'revenue', 'funnel-segments-90d.csv'),
        summaryJson: null,
        since: null,
        until: null,
        skipEntitlementAudit: false,
        json: false,
        verbose: false,
    };

    for (let i = 0; i < argv.length; i += 1) {
        const arg = argv[i];
        if (arg === '--days') args.days = Number(argv[++i]);
        else if (arg === '--limit') args.limit = Number(argv[++i]);
        else if (arg === '--output') args.output = argv[++i];
        else if (arg === '--summary-json') args.summaryJson = argv[++i];
        else if (arg === '--since') args.since = argv[++i];
        else if (arg === '--until') args.until = argv[++i];
        else if (arg === '--skip-entitlement-audit') args.skipEntitlementAudit = true;
        else if (arg === '--json') args.json = true;
        else if (arg === '--verbose') args.verbose = true;
        else if (arg === '--help' || arg === '-h') {
            console.log([
                'Usage: node scripts/export-live-funnel.mjs [--days 90] [--since ISO] [--until ISO] [--limit 5000]',
                '       [--output social-media-agent/output/revenue/funnel-segments-90d.csv]',
                '       [--summary-json social-media-agent/output/revenue/funnel-live-summary.json]',
                '       [--skip-entitlement-audit] [--json]',
                '',
                'Exports live Supabase funnel_events into the same segments CSV used by the Codex growth operator.',
                'When --since is provided, exports that exact window and compares it to the previous equally long window.',
                'Also audits subscription/user entitlement drift without printing emails or payment identifiers.',
            ].join('\n'));
            process.exit(0);
        } else {
            throw new Error(`Unknown argument: ${arg}`);
        }
    }

    if (!Number.isFinite(args.days) || args.days < 1 || args.days > 365) {
        throw new Error('--days must be a number between 1 and 365.');
    }
    if (!Number.isFinite(args.limit) || args.limit < 1 || args.limit > 5000) {
        throw new Error('--limit must be a number between 1 and 5000.');
    }
    if (args.until && !args.since) {
        throw new Error('--until requires --since so the export window is explicit.');
    }

    if (args.since) args.since = parseIsoDateArg('--since', args.since).toISOString();
    if (args.until) args.until = parseIsoDateArg('--until', args.until).toISOString();
    if (args.since && args.until && new Date(args.until).getTime() <= new Date(args.since).getTime()) {
        throw new Error('--until must be later than --since.');
    }

    args.output = path.resolve(rootDir, args.output);
    if (args.summaryJson) args.summaryJson = path.resolve(rootDir, args.summaryJson);

    return args;
}

function parseIsoDateArg(name, value) {
    if (!value) throw new Error(`${name} requires an ISO timestamp value.`);
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        throw new Error(`${name} must be a valid ISO timestamp.`);
    }
    return date;
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

async function importAdminFunnelTools(verbose) {
    const originalLog = console.log;
    if (!verbose) {
        console.log = (...parts) => {
            const text = parts.map(String).join(' ');
            if (/Supabase initialized|Supabase credentials missing|WARNING: Supabase/i.test(text)) {
                return;
            }
            originalLog(...parts);
        };
    }

    try {
        return await import('../server/admin.js');
    } finally {
        console.log = originalLog;
    }
}

async function fetchFunnelEvents(supabase, { days, limit, since: explicitSince, until }) {
    const periodEndDate = until ? new Date(until) : new Date();
    const sinceDate = explicitSince
        ? new Date(explicitSince)
        : new Date(periodEndDate.getTime() - days * DAY_MS);
    const windowMs = periodEndDate.getTime() - sinceDate.getTime();
    if (windowMs <= 0) {
        throw new Error('Export window is empty: --since must be earlier than --until/current time.');
    }
    const previousSinceDate = new Date(sinceDate.getTime() - windowMs);
    const since = sinceDate.toISOString();
    const previousSince = previousSinceDate.toISOString();
    const periodEnd = periodEndDate.toISOString();
    const reportDays = explicitSince ? Math.max(1, Math.ceil(windowMs / DAY_MS)) : days;
    const queryLimit = Math.min(5000, limit * 2);

    const query = supabase
        .from('funnel_events')
        .select(`
            id,
            user_id,
            event_name,
            source,
            feature,
            plan_id,
            plan_type,
            stripe_session_id,
            stripe_event_id,
            metadata,
            created_at
        `)
        .gte('created_at', previousSince)
        .lt('created_at', periodEnd)
        .order('created_at', { ascending: false })
        .limit(queryLimit);

    const { data, error } = await query;

    if (error) throw error;

    return {
        events: data || [],
        options: { days: reportDays, since, previousSince, periodEnd, limit },
    };
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

async function buildEntitlementAudit(supabase, { isPremiumPlanType, normalizePlanType }) {
    const { data: subscriptions, error } = await supabase
        .from('subscriptions')
        .select('id,user_id,status,plan_type,current_period_end,created_at')
        .in('status', Array.from(ACTIVE_SUBSCRIPTION_STATUSES))
        .limit(1000);

    if (error) throw error;

    const rows = subscriptions || [];
    const userIds = [...new Set(rows.map((row) => row.user_id).filter(Boolean))];
    const usersById = await fetchUsersById(supabase, userIds);

    const premiumRows = rows.filter((row) => isPremiumPlanType(row.plan_type));
    const mismatches = premiumRows.filter((row) => usersById.get(row.user_id)?.is_premium !== true);
    const missingUsers = premiumRows.filter((row) => !usersById.has(row.user_id));
    const unknownActivePlanTypes = [...new Set(
        rows
            .filter((row) => normalizePlanType(row.plan_type, null) == null)
            .map((row) => row.plan_type || '(empty)')
    )].sort();

    return {
        activeSubscriptions: rows.length,
        activePremiumSubscriptions: premiumRows.length,
        usersChecked: userIds.length,
        premiumFlagMismatches: mismatches.length,
        premiumRowsMissingUser: missingUsers.length,
        unknownActivePlanTypes,
        mismatchSamples: mismatches.slice(0, 5).map((row) => ({
            subscriptionId: maskId(row.id),
            userId: maskId(row.user_id),
            status: row.status,
            planType: row.plan_type,
            normalizedPlanType: normalizePlanType(row.plan_type),
            currentPeriodEnd: row.current_period_end || null,
        })),
    };
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

    const [
        { buildFunnelReport, buildFunnelSegmentsCsv },
        { isPremiumPlanType, normalizePlanType },
    ] = await Promise.all([
        importAdminFunnelTools(args.verbose),
        import('../server/config/constants.js'),
    ]);

    const { events, options } = await fetchFunnelEvents(supabase, args);
    const report = buildFunnelReport(events, options);
    const csv = buildFunnelSegmentsCsv(report);

    await fs.mkdir(path.dirname(args.output), { recursive: true });
    await fs.writeFile(args.output, `${csv}\n`, 'utf8');

    let entitlementAudit = null;
    if (!args.skipEntitlementAudit) {
        entitlementAudit = await buildEntitlementAudit(supabase, { isPremiumPlanType, normalizePlanType });
    }

    const summary = {
        generatedAt: new Date().toISOString(),
        output: args.output,
        days: options.days,
        since: options.since,
        previousSince: options.previousSince,
        periodEnd: options.periodEnd,
        limit: args.limit,
        totalEvents: report.totalEvents,
        segments: report.sourceFeatureSegments?.length || 0,
        metrics: report.metrics,
        entitlementAudit,
    };

    if (args.summaryJson) {
        await fs.mkdir(path.dirname(args.summaryJson), { recursive: true });
        await fs.writeFile(args.summaryJson, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
    }

    if (args.json) {
        console.log(JSON.stringify(summary, null, 2));
    } else {
        console.log(`Live funnel CSV exported: ${args.output}`);
        console.log(`Window: ${summary.since} -> ${summary.periodEnd} | previous: ${summary.previousSince} -> ${summary.since}`);
        console.log(`Events: ${summary.totalEvents} | segments: ${summary.segments} | checkout_auth_required: ${summary.metrics.checkoutAuthRequired || 0} | checkout_requested: ${summary.metrics.checkoutRequested || 0} | checkout_started: ${summary.metrics.checkoutStarted || 0} | purchases: ${(summary.metrics.subscriptionCompleted || 0) + (summary.metrics.oneTimeCompleted || 0)}`);
        if (entitlementAudit) {
            console.log(`Entitlements: active premium ${entitlementAudit.activePremiumSubscriptions}, premium flag mismatches ${entitlementAudit.premiumFlagMismatches}`);
        }
        if (args.summaryJson) console.log(`Summary JSON: ${args.summaryJson}`);
    }
}

main().catch((error) => {
    console.error(`export-live-funnel failed: ${error?.message || error}`);
    process.exit(1);
});
