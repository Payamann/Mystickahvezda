import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_REPO = 'Payamann/MystickaHvezdaOriginalAntigravity';
const DEFAULT_BASE_URL = 'https://www.mystickahvezda.cz';
const ANALYTICS_PULSE_LIMIT = 5000;

dotenv.config({ path: path.join(rootDir, 'server', '.env') });

function usage() {
    return [
        'Usage: node scripts/revenue-truth-monitor.mjs [--since ISO | --since-railway-status | --since-live-production] [--output-dir <temp-dir>]',
        '       [--sha <commit>] [--repo owner/name] [--base-url https://...] [--top 10] [--min-events 1] [--min-step 1] [--allow-repo-output]',
        '',
        'Exports post-deploy, 24h, 7d, and 30d live funnel windows outside the repo,',
        'then runs the funnel leak analyzer for each generated CSV.'
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
        allowRepoOutput: false,
        skipAnalyticsPulse: false
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
        } else if (arg === '--allow-repo-output') {
            args.allowRepoOutput = true;
        } else if (arg === '--skip-analytics-pulse') {
            args.skipAnalyticsPulse = true;
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
    return commit;
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

async function resolveSince(args) {
    const selectedModes = [args.since, args.sinceRailwayStatus, args.sinceLiveProduction].filter(Boolean).length;
    if (selectedModes > 1) {
        throw new Error('Use only one deploy window selector: --since, --since-railway-status, or --since-live-production.');
    }
    if (args.since) return args.since;
    if (args.sinceLiveProduction) {
        args.sha = await fetchLiveProductionDeployment(args);
        return getRailwayStatusSince(args);
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

function formatDecision(metrics = {}) {
    const authRequired = metrics.checkoutAuthRequired || 0;
    const checkoutRequested = metrics.checkoutRequested || 0;
    const checkoutStarted = metrics.checkoutStarted || 0;
    const purchases = (metrics.subscriptionCompleted || 0) + (metrics.oneTimeCompleted || 0);

    if (authRequired > 0 && checkoutRequested === 0) {
        return 'P0: post-auth checkout resume/debug';
    }
    if (checkoutRequested > 0 && checkoutStarted === 0) {
        return 'P0: server/Stripe session creation';
    }
    if (checkoutStarted > 0 && purchases === 0) {
        return 'P0: checkout trust/cancel recovery';
    }
    if ((metrics.totalEvents || 0) === 0) {
        return 'No product change: insufficient post-deploy funnel events';
    }
    return 'Monitor: no critical revenue leak in this aggregate window';
}

function printSummary(label, summary) {
    if (!summary) {
        console.log(`[revenue-truth] ${label}: summary unavailable`);
        return;
    }

    const metrics = summary.metrics || {};
    const purchases = (metrics.subscriptionCompleted || 0) + (metrics.oneTimeCompleted || 0);

    console.log([
        `[revenue-truth] ${label}:`,
        `events=${summary.totalEvents || 0}`,
        `segments=${summary.segments || 0}`,
        `checkout_auth_required=${metrics.checkoutAuthRequired || 0}`,
        `checkout_requested=${metrics.checkoutRequested || 0}`,
        `checkout_started=${metrics.checkoutStarted || 0}`,
        `purchases=${purchases}`,
        `decision="${formatDecision({ ...metrics, totalEvents: summary.totalEvents || 0 })}"`
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
    if (!summary?.since || !summary?.periodEnd || !supabase) return;

    const { data, error, count } = await supabase
        .from('analytics_events')
        .select('event_type,created_at', { count: 'exact' })
        .gte('created_at', summary.since)
        .lt('created_at', summary.periodEnd)
        .order('created_at', { ascending: false })
        .limit(ANALYTICS_PULSE_LIMIT);

    if (error) {
        console.log(`[revenue-truth] ${label} analytics pulse unavailable: ${error.message}`);
        return;
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

    console.log([
        `[revenue-truth] ${label} analytics pulse:`,
        `analytics_events=${analyticsEvents}`,
        `page_view=${counts.page_view || 0}`,
        `cta_clicked=${counts.cta_clicked || 0}`,
        `begin_checkout=${counts.begin_checkout || 0}`,
        `production_smoke_checked=${counts.production_smoke_checked || 0}`,
        `client_errors=${clientErrors}`,
        `latest=${latest || 'none'}`,
        `diagnosis="${analyticsPulseDiagnosis({ analyticsEvents, funnelEvents })}"`
    ].join(' '));
}

function windowDefinitions(since) {
    const windows = [];
    if (since) {
        windows.push({
            label: 'post-deploy',
            slug: 'post-deploy',
            exportArgs: ['--since', since]
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
    mkdirSync(outputDir, { recursive: true });

    console.log(`[revenue-truth] output_dir=${outputDir}`);
    console.log('[revenue-truth] raw CSV/JSON exports stay local and must not be committed.');
    if (!supabase && !args.skipAnalyticsPulse) {
        console.log('[revenue-truth] analytics pulse skipped: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
    }

    for (const windowDef of windowDefinitions(args.since)) {
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
        printSummary(windowDef.label, summary);
        if (windowDef.slug === 'post-deploy') {
            await printAnalyticsPulse(windowDef.label, summary, supabase);
        }

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

try {
    await main();
} catch (error) {
    console.error(`[revenue-truth] ${error.message}`);
    process.exitCode = 1;
}
