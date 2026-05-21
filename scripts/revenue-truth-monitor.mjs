import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { analyzeFunnelSegments } from './analyze-funnel-segments.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_REPO = 'Payamann/MystickaHvezdaOriginalAntigravity';
const DEFAULT_BASE_URL = 'https://www.mystickahvezda.cz';
const ANALYTICS_PULSE_LIMIT = 5000;
const DEFAULT_GITHUB_STATUS_FALLBACK_MINUTES = 15;

dotenv.config({ path: path.join(rootDir, 'server', '.env') });

function usage() {
    return [
        'Usage: node scripts/revenue-truth-monitor.mjs [--since ISO | --since-railway-status | --since-live-production] [--output-dir <temp-dir>]',
        '       [--sha <commit>] [--repo owner/name] [--base-url https://...] [--top 10] [--min-events 1] [--min-step 1] [--allow-repo-output] [--summary-only]',
        '       [--diagnostic-since ISO] [--diagnostic-label funnel-fix]',
        '       [--github-status-fallback-minutes 15]',
        '',
        'Exports post-deploy, 24h, 7d, and 30d live funnel windows outside the repo,',
        'then runs the funnel leak analyzer for each generated CSV. Use --diagnostic-since',
        'to keep a stable funnel-fix baseline beside the latest production-deploy window.'
    ].join('\n');
}

function parseArgs(argv) {
    const args = {
        since: null,
        sinceRailwayStatus: false,
        sinceLiveProduction: false,
        sha: null,
        repo: process.env.GITHUB_REPOSITORY || DEFAULT_REPO,
        baseUrl: process.env.VERIFY_BASE_URL || DEFAULT_BASE_URL,
        outputDir: path.join(os.tmpdir(), 'mh-funnel'),
        top: '10',
        minEvents: '1',
        minStep: '1',
        diagnosticSince: null,
        diagnosticLabel: 'diagnostic-baseline',
        allowRepoOutput: false,
        skipAnalyticsPulse: false,
        summaryOnly: false,
        githubStatusFallbackMinutes: Number.parseInt(
            process.env.REVENUE_TRUTH_STATUS_FALLBACK_MINUTES || String(DEFAULT_GITHUB_STATUS_FALLBACK_MINUTES),
            10
        )
    };

    for (let index = 0; index < argv.length; index += 1) {
        const arg = argv[index];
        const next = () => argv[++index];

        if (arg === '--help' || arg === '-h') {
            console.log(usage());
            process.exit(0);
        } else if (arg === '--since') {
            args.since = next();
        } else if (arg.startsWith('--since=')) {
            args.since = arg.slice('--since='.length);
        } else if (arg === '--since-railway-status') {
            args.sinceRailwayStatus = true;
        } else if (arg === '--since-live-production') {
            args.sinceLiveProduction = true;
        } else if (arg === '--sha') {
            args.sha = next();
        } else if (arg.startsWith('--sha=')) {
            args.sha = arg.slice('--sha='.length);
        } else if (arg === '--repo') {
            args.repo = next();
        } else if (arg.startsWith('--repo=')) {
            args.repo = arg.slice('--repo='.length);
        } else if (arg === '--base-url') {
            args.baseUrl = next().replace(/\/$/, '');
        } else if (arg.startsWith('--base-url=')) {
            args.baseUrl = arg.slice('--base-url='.length).replace(/\/$/, '');
        } else if (arg === '--output-dir') {
            args.outputDir = next();
        } else if (arg.startsWith('--output-dir=')) {
            args.outputDir = arg.slice('--output-dir='.length);
        } else if (arg === '--top') {
            args.top = next();
        } else if (arg.startsWith('--top=')) {
            args.top = arg.slice('--top='.length);
        } else if (arg === '--min-events') {
            args.minEvents = next();
        } else if (arg.startsWith('--min-events=')) {
            args.minEvents = arg.slice('--min-events='.length);
        } else if (arg === '--min-step') {
            args.minStep = next();
        } else if (arg.startsWith('--min-step=')) {
            args.minStep = arg.slice('--min-step='.length);
        } else if (arg === '--diagnostic-since') {
            args.diagnosticSince = next();
        } else if (arg.startsWith('--diagnostic-since=')) {
            args.diagnosticSince = arg.slice('--diagnostic-since='.length);
        } else if (arg === '--diagnostic-label') {
            args.diagnosticLabel = next();
        } else if (arg.startsWith('--diagnostic-label=')) {
            args.diagnosticLabel = arg.slice('--diagnostic-label='.length);
        } else if (arg === '--allow-repo-output') {
            args.allowRepoOutput = true;
        } else if (arg === '--skip-analytics-pulse') {
            args.skipAnalyticsPulse = true;
        } else if (arg === '--summary-only') {
            args.summaryOnly = true;
        } else if (arg === '--github-status-fallback-minutes') {
            args.githubStatusFallbackMinutes = Number.parseInt(next(), 10);
        } else if (arg.startsWith('--github-status-fallback-minutes=')) {
            args.githubStatusFallbackMinutes = Number.parseInt(arg.slice('--github-status-fallback-minutes='.length), 10);
        } else {
            throw new Error(`Unknown argument: ${arg}\n${usage()}`);
        }
    }

    return args;
}

function git(args) {
    return execFileSync('git', args, { cwd: rootDir, encoding: 'utf8' }).trim();
}

function assertOutsideRepo(outputDir, allowRepoOutput) {
    const resolvedOutputDir = path.resolve(outputDir);
    const relative = path.relative(rootDir, resolvedOutputDir);
    const insideRepo = relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));

    if (insideRepo && !allowRepoOutput) {
        throw new Error(`Refusing to write live funnel exports inside the repo: ${resolvedOutputDir}. Use --allow-repo-output only for sanitized test fixtures.`);
    }

    return resolvedOutputDir;
}

function safeIsoTimestamp(value, fallback = new Date()) {
    const date = value ? new Date(value) : fallback;
    if (Number.isNaN(date.getTime())) return fallback.toISOString();
    return date.toISOString();
}

function resolveSupabaseUrl(value) {
    if (!value) return '';
    return value.startsWith('http') ? value : `https://${value}.supabase.co`;
}

function createSupabaseClient() {
    const supabaseUrl = resolveSupabaseUrl(process.env.SUPABASE_URL);
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) return null;

    return createClient(supabaseUrl, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    });
}

async function fetchGitHubJson(url) {
    const headers = {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'mysticka-hvezda-revenue-truth-monitor'
    };
    if (process.env.GITHUB_TOKEN) {
        headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    const response = await fetch(url, { headers });
    if (!response.ok) {
        throw new Error(`${url} returned ${response.status}`);
    }

    return response.json();
}

async function fetchLiveProductionDeployment({ baseUrl }) {
    const normalizedBaseUrl = baseUrl.replace(/\/$/, '');
    const response = await fetch(`${normalizedBaseUrl}/api/health`, {
        headers: {
            Accept: 'application/json',
            'Cache-Control': 'no-cache',
            Pragma: 'no-cache'
        }
    });
    if (!response.ok) {
        throw new Error(`${normalizedBaseUrl}/api/health returned ${response.status}`);
    }

    const health = await response.json();
    const commit = health.deployment?.commit || null;
    if (!commit) {
        throw new Error(`Production health metadata missing deployment commit at ${normalizedBaseUrl}/api/health.`);
    }

    console.log(`[revenue-truth] live production commit: ${commit} branch=${health.deployment?.branch || 'unknown'} health_timestamp=${health.timestamp || 'unknown'}`);
    return {
        commit,
        healthTimestamp: safeIsoTimestamp(health.timestamp)
    };
}

async function getRailwayStatusSince({ repo, sha }) {
    const resolvedSha = sha || git(['rev-parse', 'HEAD']);
    const status = await fetchGitHubJson(`https://api.github.com/repos/${repo}/commits/${resolvedSha}/status`);
    const statuses = Array.isArray(status.statuses) ? status.statuses : [];
    const railwayStatus = statuses.find((item) => (
        item.state === 'success'
        && /railway|mystickahvezda/i.test(`${item.context || ''} ${item.description || ''} ${item.target_url || ''}`)
    )) || statuses.find((item) => item.state === 'success');

    if (!railwayStatus?.updated_at && !railwayStatus?.created_at) {
        throw new Error(`No successful deployment status timestamp found for ${repo}@${resolvedSha}.`);
    }

    const since = railwayStatus.updated_at || railwayStatus.created_at;
    console.log(`[revenue-truth] since from GitHub deployment status: ${since} sha=${resolvedSha} context="${railwayStatus.context || 'unknown'}"`);
    return since;
}

function fallbackSinceFromHealth({ error, liveDeployment, fallbackMinutes }) {
    const minutes = Number.isFinite(fallbackMinutes) && fallbackMinutes > 0
        ? fallbackMinutes
        : DEFAULT_GITHUB_STATUS_FALLBACK_MINUTES;
    const reference = new Date(liveDeployment.healthTimestamp);
    const since = new Date(reference.getTime() - (minutes * 60_000)).toISOString();

    console.log(`[revenue-truth] GitHub deployment status unavailable (${error.message}); using ${minutes}m fallback window from production health timestamp ${liveDeployment.healthTimestamp}.`);
    return since;
}

async function resolveSince(args) {
    const selectedModes = [args.since, args.sinceRailwayStatus, args.sinceLiveProduction].filter(Boolean).length;
    if (selectedModes > 1) {
        throw new Error('Use only one deploy window selector: --since, --since-railway-status, or --since-live-production.');
    }
    if (args.since) return args.since;
    if (args.sinceLiveProduction) {
        const liveDeployment = await fetchLiveProductionDeployment(args);
        args.sha = liveDeployment.commit;
        try {
            return await getRailwayStatusSince(args);
        } catch (error) {
            return fallbackSinceFromHealth({
                error,
                liveDeployment,
                fallbackMinutes: args.githubStatusFallbackMinutes
            });
        }
    }
    if (args.sinceRailwayStatus) {
        return getRailwayStatusSince(args);
    }
    return null;
}

function runNodeScript(scriptPath, args) {
    execFileSync(process.execPath, [scriptPath, ...args], {
        cwd: rootDir,
        stdio: 'inherit',
        env: process.env
    });
}

function readSummary(summaryPath) {
    if (!existsSync(summaryPath)) return null;
    return JSON.parse(readFileSync(summaryPath, 'utf8'));
}

function formatDecision(metrics = {}, { historicalContext = false, diagnosticBaseline = false } = {}) {
    const authRequired = metrics.checkoutAuthRequired || 0;
    const checkoutRequested = metrics.checkoutRequested || 0;
    const checkoutStarted = metrics.checkoutStarted || 0;
    const purchases = (metrics.subscriptionCompleted || 0) + (metrics.oneTimeCompleted || 0);
    const prefix = diagnosticBaseline
        ? 'Diagnostic baseline: '
        : historicalContext
            ? 'Historical context only: '
            : '';

    if (authRequired > 0 && checkoutRequested === 0) {
        return `${prefix}P0: post-auth checkout resume/debug`;
    }
    if (checkoutRequested > 0 && checkoutStarted === 0) {
        return `${prefix}P0: server/Stripe session creation`;
    }
    if (checkoutStarted > 0 && purchases === 0) {
        return `${prefix}P0: checkout trust/cancel recovery`;
    }
    if ((metrics.totalEvents || 0) === 0) {
        if (diagnosticBaseline) {
            return 'Diagnostic baseline: no funnel events in this stable window';
        }
        return historicalContext
            ? 'Historical context only: no funnel events in this aggregate window'
            : 'No product change: insufficient post-deploy funnel events';
    }
    if (diagnosticBaseline) {
        return 'Diagnostic baseline: no critical revenue leak in this stable window';
    }
    return historicalContext
        ? 'Historical context only: no critical revenue leak in this aggregate window'
        : 'Monitor: no critical revenue leak in this aggregate window';
}

function buildWindowReport(windowDef, summary, { historicalContext = false, diagnosticBaseline = false } = {}) {
    if (!summary) return null;
    const metrics = summary.metrics || {};
    const purchases = (metrics.subscriptionCompleted || 0) + (metrics.oneTimeCompleted || 0);

    return {
        label: windowDef.label,
        slug: windowDef.slug,
        basis: diagnosticBaseline
            ? 'diagnostic_baseline'
            : historicalContext
                ? 'historical_context'
                : 'primary_window',
        since: summary.since || null,
        until: summary.periodEnd || null,
        events: summary.totalEvents || 0,
        segments: summary.segments || 0,
        checkout_auth_required: metrics.checkoutAuthRequired || 0,
        checkout_requested: metrics.checkoutRequested || 0,
        checkout_started: metrics.checkoutStarted || 0,
        purchases,
        decision: formatDecision({ ...metrics, totalEvents: summary.totalEvents || 0 }, { historicalContext, diagnosticBaseline })
    };
}

function parsePositiveInteger(value, fallback) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function analyzeWindowSegments(csvPath, args) {
    try {
        return analyzeFunnelSegments(csvPath, {
            top: parsePositiveInteger(args.top, 10),
            minEvents: parsePositiveInteger(args.minEvents, 1),
            minStep: parsePositiveInteger(args.minStep, 1)
        }).summary;
    } catch (error) {
        return {
            error: error.message,
            top_segment_actions: [],
            leak_totals_by_step: [],
            data_quality_notes: []
        };
    }
}

function printSummary(label, summary, { historicalContext = false, diagnosticBaseline = false } = {}) {
    if (!summary) {
        console.log(`[revenue-truth] ${label}: summary unavailable`);
        return;
    }

    const report = buildWindowReport({ label, slug: label }, summary, { historicalContext, diagnosticBaseline });

    console.log([
        `[revenue-truth] ${label}:`,
        `events=${report.events}`,
        `segments=${report.segments}`,
        `checkout_auth_required=${report.checkout_auth_required}`,
        `checkout_requested=${report.checkout_requested}`,
        `checkout_started=${report.checkout_started}`,
        `purchases=${report.purchases}`,
        `basis=${report.basis}`,
        `decision="${report.decision}"`
    ].join(' '));
}

function analyticsPulseDiagnosis({ analyticsEvents, funnelEvents }) {
    if (analyticsEvents === 0 && funnelEvents === 0) {
        return 'No first-party analytics or funnel events in this window: likely no tracked traffic, consented analytics, or ingest smoke after deploy.';
    }
    if (analyticsEvents > 0 && funnelEvents === 0) {
        return 'First-party analytics ingestion is active, but no paid funnel events were recorded in this window.';
    }
    if (analyticsEvents === 0 && funnelEvents > 0) {
        return 'Funnel events exist while first-party analytics is quiet; inspect consent/analytics client separately.';
    }
    return 'First-party analytics and funnel events both have activity in this window.';
}

async function printAnalyticsPulse(label, summary, supabase) {
    if (!summary?.since || !summary?.periodEnd || !supabase) return null;

    const { data, error, count } = await supabase
        .from('analytics_events')
        .select('event_type,created_at', { count: 'exact' })
        .gte('created_at', summary.since)
        .lt('created_at', summary.periodEnd)
        .order('created_at', { ascending: false })
        .limit(ANALYTICS_PULSE_LIMIT);

    if (error) {
        console.log(`[revenue-truth] ${label} analytics pulse unavailable: ${error.message}`);
        return null;
    }

    const events = data || [];
    const counts = events.reduce((acc, event) => {
        const type = event.event_type || 'unknown';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
    }, {});
    const clientErrors = (counts.client_error || 0) + (counts.error || 0);
    const funnelEvents = summary.totalEvents || 0;
    const analyticsEvents = count ?? events.length;
    const latest = events[0]?.created_at || null;

    const pulse = {
        analytics_events: analyticsEvents,
        page_view: counts.page_view || 0,
        cta_clicked: counts.cta_clicked || 0,
        begin_checkout: counts.begin_checkout || 0,
        production_smoke_checked: counts.production_smoke_checked || 0,
        client_errors: clientErrors,
        latest,
        diagnosis: analyticsPulseDiagnosis({ analyticsEvents, funnelEvents })
    };

    console.log([
        `[revenue-truth] ${label} analytics pulse:`,
        `analytics_events=${pulse.analytics_events}`,
        `page_view=${pulse.page_view}`,
        `cta_clicked=${pulse.cta_clicked}`,
        `begin_checkout=${pulse.begin_checkout}`,
        `production_smoke_checked=${pulse.production_smoke_checked}`,
        `client_errors=${pulse.client_errors}`,
        `latest=${latest || 'none'}`,
        `diagnosis="${pulse.diagnosis}"`
    ].join(' '));

    return pulse;
}

function chooseSegmentActionForDecision(windowDef) {
    const actions = windowDef?.segment_analysis?.top_segment_actions || [];
    const decision = windowDef?.decision || '';
    let selected = actions[0] || null;

    if (/post-auth checkout resume/i.test(decision)) {
        selected = actions.find((item) => (
            item.step_id === 'auth_handoff_to_checkout_request'
            || item.step_id === 'auth_handoff_to_auth_page'
            || item.step_id === 'auth_page_to_auth_form_submit'
        )) || selected;
    } else if (/server\/Stripe session creation/i.test(decision)) {
        selected = actions.find((item) => item.step_id === 'checkout_request_to_session') || selected;
    } else if (/checkout trust\/cancel recovery/i.test(decision)) {
        selected = actions.find((item) => item.step_id === 'checkout_to_purchase') || selected;
    }

    return selected;
}

function formatSegmentAction(segmentAction) {
    if (!segmentAction) return null;
    return `${segmentAction.step_label}: ${segmentAction.source}/${segmentAction.feature} (${segmentAction.denominator}->${segmentAction.next}, lost ${segmentAction.loss}). ${segmentAction.action}`;
}

function deriveNextAction(primaryWindow, windows = []) {
    if (!primaryWindow) return 'No primary window available; rerun the monitor with a valid deploy window.';
    const formatTopSegment = (windowDef) => {
        return formatSegmentAction(windowDef?.recommended_segment_action || chooseSegmentActionForDecision(windowDef));
    };

    if (primaryWindow.events === 0) {
        const diagnosticWindow = windows.find((windowDef) => (
            windowDef.basis === 'diagnostic_baseline'
            && windowDef.events > 0
        ));
        if (diagnosticWindow) {
            const topSegment = formatTopSegment(diagnosticWindow);
            return [
                `Latest deploy window has no paid funnel events; stable diagnostic baseline says: ${diagnosticWindow.decision}`,
                topSegment ? `Top segment: ${topSegment}` : null
            ].filter(Boolean).join('. ');
        }
        return 'Repeat monitor later; use historical windows for diagnostics and test coverage only.';
    }
    const topSegment = formatTopSegment(primaryWindow);
    return [
        primaryWindow.decision,
        topSegment ? `Top segment: ${topSegment}` : null
    ].filter(Boolean).join('. ');
}

function slugifyLabel(label) {
    return String(label || 'diagnostic-baseline')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'diagnostic-baseline';
}

function windowDefinitions({ since, diagnosticSince, diagnosticLabel }) {
    const windows = [];
    if (since) {
        windows.push({
            label: 'post-deploy',
            slug: 'post-deploy',
            exportArgs: ['--since', since]
        });
    }
    if (diagnosticSince) {
        const slug = `diagnostic-${slugifyLabel(diagnosticLabel)}`;
        windows.push({
            label: diagnosticLabel || 'diagnostic-baseline',
            slug,
            exportArgs: ['--since', diagnosticSince],
            diagnosticBaseline: true
        });
    }

    return [
        ...windows,
        { label: '24h', slug: '24h', exportArgs: ['--days', '1'] },
        { label: '7d', slug: '7d', exportArgs: ['--days', '7'] },
        { label: '30d', slug: '30d', exportArgs: ['--days', '30'] }
    ];
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    args.since = await resolveSince(args);
    const outputDir = assertOutsideRepo(args.outputDir, args.allowRepoOutput);
    const supabase = args.skipAnalyticsPulse ? null : createSupabaseClient();
    const windows = windowDefinitions({
        since: args.since,
        diagnosticSince: args.diagnosticSince,
        diagnosticLabel: args.diagnosticLabel
    });
    const hasPostDeployWindow = windows.some((windowDef) => windowDef.slug === 'post-deploy');
    const monitorReport = {
        generated_at: new Date().toISOString(),
        deploy_since: args.since || null,
        diagnostic_since: args.diagnosticSince || null,
        diagnostic_label: args.diagnosticSince ? args.diagnosticLabel : null,
        windows: []
    };
    mkdirSync(outputDir, { recursive: true });

    console.log(`[revenue-truth] output_dir=${outputDir}`);
    console.log('[revenue-truth] raw CSV/JSON exports stay local and must not be committed.');
    if (!supabase && !args.skipAnalyticsPulse) {
        console.log('[revenue-truth] analytics pulse skipped: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
    }

    for (const windowDef of windows) {
        const csvPath = path.join(outputDir, `${windowDef.slug}.csv`);
        const summaryPath = path.join(outputDir, `${windowDef.slug}.json`);

        runNodeScript('scripts/export-live-funnel.mjs', [
            ...windowDef.exportArgs,
            '--output',
            csvPath,
            '--summary-json',
            summaryPath
        ]);

        const summary = readSummary(summaryPath);
        const diagnosticBaseline = Boolean(windowDef.diagnosticBaseline);
        const historicalContext = hasPostDeployWindow && windowDef.slug !== 'post-deploy' && !diagnosticBaseline;
        printSummary(windowDef.label, summary, { historicalContext, diagnosticBaseline });
        const windowReport = buildWindowReport(windowDef, summary, { historicalContext, diagnosticBaseline });
        if (windowReport) {
            windowReport.segment_analysis = analyzeWindowSegments(csvPath, args);
            windowReport.recommended_segment_action = chooseSegmentActionForDecision(windowReport);
        }
        if (windowDef.slug === 'post-deploy') {
            const analyticsPulse = await printAnalyticsPulse(windowDef.label, summary, supabase);
            if (windowReport && analyticsPulse) windowReport.analytics_pulse = analyticsPulse;
        }
        if (windowReport) monitorReport.windows.push(windowReport);

        if (!args.summaryOnly) {
            runNodeScript('scripts/analyze-funnel-segments.mjs', [
                csvPath,
                '--top',
                args.top,
                '--min-events',
                args.minEvents,
                '--min-step',
                args.minStep
            ]);
        }
    }

    const primaryWindow = monitorReport.windows.find((windowDef) => windowDef.basis === 'primary_window') || monitorReport.windows[0] || null;
    monitorReport.primary_decision = primaryWindow?.decision || null;
    monitorReport.next_action = deriveNextAction(primaryWindow, monitorReport.windows);
    const monitorSummaryPath = path.join(outputDir, 'monitor-summary.json');
    writeFileSync(monitorSummaryPath, `${JSON.stringify(monitorReport, null, 2)}\n`, 'utf8');
    console.log(`[revenue-truth] monitor_summary=${monitorSummaryPath}`);
    console.log(`[revenue-truth] next_action="${monitorReport.next_action}"`);
}

try {
    await main();
} catch (error) {
    console.error(`[revenue-truth] ${error.message}`);
    process.exitCode = 1;
}
