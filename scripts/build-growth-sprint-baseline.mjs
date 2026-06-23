#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { analyzeFunnelSegments } from './analyze-funnel-segments.mjs';
import { resolveDateRange } from './export-google-growth-data.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const defaultOutputDir = path.join(repoRoot, 'social-media-agent', 'output', 'google', 'growth-sprint-baseline');
const exportScript = path.join(repoRoot, 'scripts', 'export-google-growth-data.mjs');

const targetPages = [
    '/tarot-ano-ne.html',
    '/tarot-zdarma.html',
    '/profil.html',
    '/partnerska-shoda.html',
    '/partnerska-shoda/leo-scorpio.html',
    '/horoskopy.html',
];

const targetQueries = [
    'ano ne tarot',
    'karty ano ne',
    'vestba ano ne',
    'odpoved ano ne',
    'tarot ano ne zdarma',
    'lev a skorpion',
];

const sprintMetrics = [
    'GSC CTR for Tarot ANO/NE query-page rows',
    'Organic clicks to /tarot-ano-ne.html',
    'reading_save_clicked -> reading_saved',
    'Registration after saved reading',
    'Profile history visit after registration',
    'Profile history bounce / engagement',
];

function usage() {
    return [
        'Usage:',
        '  node scripts/build-growth-sprint-baseline.mjs [--days 28] [--end-date YYYY-MM-DD]',
        '       [--output-dir social-media-agent/output/google/growth-sprint-baseline]',
        '       [--funnel-segments-csv path/to/funnel-segments.csv]',
        '       [--gsc-performance-zip path/to/search-console-export.zip]',
        '       [--gsc-query-pages-csv path] [--gsc-pages-csv path]',
        '       [--ga4-landing-pages-csv path] [--ga4-sources-csv path]',
        '       [--skip-ga4] [--skip-gsc] [--check-only] [--json]',
        '',
        'Builds a repeatable baseline for the Tarot ANO/NE growth sprint.',
        'If Google API config is missing, writes a readiness report with the exact missing inputs.',
    ].join('\n');
}

function readValue(argv, index, option) {
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) {
        throw new Error(`${option} requires a value.`);
    }
    return value;
}

function parseArgs(argv) {
    const args = {
        days: 28,
        startDate: null,
        endDate: null,
        outputDir: defaultOutputDir,
        reportTop: 25,
        funnelSegmentsCsv: '',
        gscPerformanceZip: '',
        gscQueryPagesCsv: '',
        gscPagesCsv: '',
        ga4LandingPagesCsv: '',
        ga4SourcesCsv: '',
        skipGa4: false,
        skipGsc: false,
        checkOnly: false,
        json: false,
        help: false,
    };

    for (let index = 0; index < argv.length; index += 1) {
        const arg = argv[index];
        if (arg === '--help' || arg === '-h') args.help = true;
        else if (arg === '--days') args.days = Number(readValue(argv, index, arg)), index += 1;
        else if (arg === '--start-date') args.startDate = readValue(argv, index, arg), index += 1;
        else if (arg === '--end-date') args.endDate = readValue(argv, index, arg), index += 1;
        else if (arg === '--output-dir') args.outputDir = readValue(argv, index, arg), index += 1;
        else if (arg === '--report-top') args.reportTop = Number(readValue(argv, index, arg)), index += 1;
        else if (arg === '--funnel-segments-csv') args.funnelSegmentsCsv = readValue(argv, index, arg), index += 1;
        else if (arg === '--gsc-performance-zip') args.gscPerformanceZip = readValue(argv, index, arg), index += 1;
        else if (arg === '--gsc-query-pages-csv') args.gscQueryPagesCsv = readValue(argv, index, arg), index += 1;
        else if (arg === '--gsc-pages-csv') args.gscPagesCsv = readValue(argv, index, arg), index += 1;
        else if (arg === '--ga4-landing-pages-csv') args.ga4LandingPagesCsv = readValue(argv, index, arg), index += 1;
        else if (arg === '--ga4-sources-csv') args.ga4SourcesCsv = readValue(argv, index, arg), index += 1;
        else if (arg === '--skip-ga4') args.skipGa4 = true;
        else if (arg === '--skip-gsc') args.skipGsc = true;
        else if (arg === '--check-only') args.checkOnly = true;
        else if (arg === '--json') args.json = true;
        else throw new Error(`Unknown argument: ${arg}`);
    }

    if (!Number.isFinite(args.days) || args.days < 1 || args.days > 540) {
        throw new Error('--days must be a number between 1 and 540.');
    }
    if (!Number.isFinite(args.reportTop) || args.reportTop < 1 || args.reportTop > 100) {
        throw new Error('--report-top must be a number between 1 and 100.');
    }
    args.outputDir = path.resolve(repoRoot, args.outputDir);
    return args;
}

function googleExportArgs(args, { checkConfig = false, json = false } = {}) {
    const flags = [
        '--days', String(args.days),
        '--output-dir', args.outputDir,
        '--report-top', String(args.reportTop),
    ];
    if (args.startDate) flags.push('--start-date', args.startDate);
    if (args.endDate) flags.push('--end-date', args.endDate);
    if (args.gscPerformanceZip) flags.push('--gsc-performance-zip', args.gscPerformanceZip);
    if (args.gscQueryPagesCsv) flags.push('--gsc-query-pages-csv', args.gscQueryPagesCsv);
    if (args.gscPagesCsv) flags.push('--gsc-pages-csv', args.gscPagesCsv);
    if (args.ga4LandingPagesCsv) flags.push('--ga4-landing-pages-csv', args.ga4LandingPagesCsv);
    if (args.ga4SourcesCsv) flags.push('--ga4-sources-csv', args.ga4SourcesCsv);
    if (args.skipGa4) flags.push('--skip-ga4');
    if (args.skipGsc) flags.push('--skip-gsc');
    if (checkConfig) flags.push('--check-config');
    if (json) flags.push('--json');
    return flags;
}

function runNode(scriptPath, args) {
    return spawnSync(process.execPath, [scriptPath, ...args], {
        cwd: repoRoot,
        encoding: 'utf8',
        env: process.env,
        windowsHide: true,
    });
}

function parseJsonOutput(result, label) {
    try {
        return JSON.parse(result.stdout || '{}');
    } catch {
        throw new Error(`${label} did not return valid JSON.\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
    }
}

function rel(filePath) {
    return path.relative(repoRoot, filePath).replace(/\\/g, '/');
}

function mdList(items) {
    return items.map((item) => `- ${item}`).join('\n');
}

function fenced(command) {
    return ['```powershell', command, '```'].join('\n');
}

function buildReadinessMarkdown({ status, range, outputDir }) {
    const missing = status.missing.length ? mdList(status.missing.map((key) => `\`${key}\``)) : '- none';
    const command = 'node scripts/build-growth-sprint-baseline.mjs --days 28';
    const manualCommand = [
        'node scripts/build-growth-sprint-baseline.mjs --days 28',
        '--gsc-performance-zip "C:\\path\\to\\search-console-performance.zip"',
        '--ga4-landing-pages-csv "C:\\path\\to\\ga4-landing-pages.csv"',
        '--ga4-sources-csv "C:\\path\\to\\ga4-sources.csv"',
    ].join(' ');
    const funnelCommand = 'node scripts/analyze-funnel-segments.mjs "C:\\path\\to\\funnel-segments.csv" --top 12 --min-events 1 --min-step 1';

    return [
        '# Growth Sprint Baseline Readiness',
        '',
        `Generated: ${new Date().toISOString()}`,
        `Range: ${range.startDate} to ${range.endDate} (${range.days} days)`,
        `Output dir: ${rel(outputDir)}`,
        '',
        `Status: ${status.ok ? 'ready' : 'blocked'}`,
        '',
        '## Missing Google Config',
        '',
        missing,
        '',
        'Set these in `server/.env` or `.env`, or pass manual CSV/ZIP exports.',
        '',
        '## API Baseline Command',
        '',
        fenced(command),
        '',
        '## Manual Export Fallback',
        '',
        fenced(manualCommand),
        '',
        '## Funnel Segment Baseline',
        '',
        'Export `/api/admin/funnel?format=csv&view=segments`, then run:',
        '',
        fenced(funnelCommand),
        '',
        '## Sprint Targets',
        '',
        'Pages:',
        mdList(targetPages.map((item) => `\`${item}\``)),
        '',
        'Queries:',
        mdList(targetQueries.map((item) => `\`${item}\``)),
        '',
        'Metrics:',
        mdList(sprintMetrics),
        '',
    ].join('\n');
}

function buildFunnelMarkdown(analysis) {
    const actions = analysis.summary.top_segment_actions;
    const lines = [
        '# Growth Sprint Funnel Baseline',
        '',
        `Rows: ${analysis.summary.rows}`,
        `Considered rows: ${analysis.summary.considered_rows}`,
        '',
        '## Leak Totals By Step',
        '',
    ];

    if (analysis.summary.leak_totals_by_step.length === 0) {
        lines.push('_No funnel leaks found at the current thresholds._');
    } else {
        lines.push('| Step | Loss | Denominator | Conversion | Segments |');
        lines.push('|---|---:|---:|---:|---:|');
        analysis.summary.leak_totals_by_step.forEach((row) => {
            lines.push(`| ${row.step_label} | ${row.loss} | ${row.denominator} | ${row.conversion_rate}% | ${row.segments} |`);
        });
    }

    lines.push('', '## Top Segment Actions', '');
    if (actions.length === 0) {
        lines.push('_No segment actions at the current thresholds._');
    } else {
        actions.forEach((row, index) => {
            lines.push(`${index + 1}. **${row.severity}** ${row.step_label}: ${row.source} / ${row.feature}`);
            lines.push(`   Evidence: ${row.denominator} -> ${row.next}, lost ${row.loss}; conversion ${row.conversion_rate}%.`);
            lines.push(`   Next action: ${row.action}`);
        });
    }

    if (analysis.summary.data_quality_notes.length > 0) {
        lines.push('', '## Data Quality Notes', '');
        analysis.summary.data_quality_notes.forEach((note) => lines.push(`- ${note}`));
    }

    lines.push('');
    return lines.join('\n');
}

function targetOpportunityRows(summary) {
    const targetText = [...targetPages, ...targetQueries].join(' ').toLowerCase();
    return [...(summary?.growth?.p0 || []), ...(summary?.growth?.p1 || []), ...(summary?.growth?.p2 || [])]
        .filter((row) => {
            const haystack = [row.path, row.page, row.query, row.cluster].join(' ').toLowerCase();
            return haystack && targetText.split(' ').some((token) => token.length > 3 && haystack.includes(token));
        })
        .slice(0, 12);
}

function buildBaselineMarkdown({ range, googleResult, funnelAnalysis }) {
    const summary = googleResult?.summary;
    const lines = [
        '# Tarot ANO/NE Growth Sprint Baseline',
        '',
        `Generated: ${new Date().toISOString()}`,
        `Range: ${range.startDate} to ${range.endDate} (${range.days} days)`,
        '',
        '## Target Pages',
        '',
        mdList(targetPages.map((item) => `\`${item}\``)),
        '',
        '## Target Queries',
        '',
        mdList(targetQueries.map((item) => `\`${item}\``)),
        '',
        '## Sprint Metrics',
        '',
        mdList(sprintMetrics),
        '',
    ];

    if (summary) {
        lines.push(
            '## Google Baseline',
            '',
            `- GSC: ${summary.gsc.totalClicks} clicks, ${summary.gsc.totalImpressions} impressions`,
            `- GA4: ${summary.ga4.sessions} sessions, ${summary.ga4.conversions} conversions`,
            `- Google report: \`${rel(googleResult.reportPath)}\``,
            `- Google JSON: \`${rel(googleResult.summaryPath)}\``,
            '',
            '## Target Opportunities',
            '',
        );
        const targetRows = targetOpportunityRows(summary);
        if (targetRows.length === 0) {
            lines.push('_No target-specific P0/P1/P2 rows found in this export._');
        } else {
            lines.push('| Priority | Query | Page | Cluster | Clicks | Impressions | CTR | Sessions |');
            lines.push('|---|---|---|---|---:|---:|---:|---:|');
            targetRows.forEach((row) => {
                const ctr = row.ctr != null ? `${((row.ctr || 0) * 100).toFixed(1)}%` : '';
                lines.push(`| ${row.priority || ''} | ${row.query || ''} | ${row.path || row.page || ''} | ${row.cluster || ''} | ${Math.round(row.clicks || 0)} | ${Math.round(row.impressions || 0)} | ${ctr} | ${Math.round(row.sessions || 0)} |`);
            });
        }
        lines.push('');
    }

    if (funnelAnalysis) {
        lines.push(
            '## Funnel Baseline',
            '',
            `- Rows: ${funnelAnalysis.summary.rows}`,
            `- Considered rows: ${funnelAnalysis.summary.considered_rows}`,
            `- Funnel report: \`${rel(path.join(path.dirname(funnelAnalysis.csvPath), 'growth-sprint-funnel-baseline.md'))}\``,
            '',
        );
    }

    return lines.join('\n');
}

async function writeJson(filePath, data) {
    await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) {
        console.log(usage());
        return;
    }

    await fs.mkdir(args.outputDir, { recursive: true });
    const range = resolveDateRange(args);
    const checkResult = runNode(exportScript, googleExportArgs(args, { checkConfig: true, json: true }));
    const status = parseJsonOutput(checkResult, 'Google config check');
    const readinessPath = path.join(args.outputDir, 'growth-sprint-baseline-readiness.md');
    await fs.writeFile(readinessPath, buildReadinessMarkdown({ status, range, outputDir: args.outputDir }), 'utf8');

    if (args.checkOnly || !status.ok) {
        const payload = { ok: status.ok, range, readinessPath, missing: status.missing };
        if (args.json) console.log(JSON.stringify(payload, null, 2));
        else console.log(`${status.ok ? 'Baseline config ready' : 'Baseline config blocked'}: ${rel(readinessPath)}`);
        process.exitCode = status.ok ? 0 : 1;
        return;
    }

    const exportResult = runNode(exportScript, googleExportArgs(args, { json: true }));
    if (exportResult.status !== 0) {
        throw new Error(`Google export failed.\nstdout:\n${exportResult.stdout}\nstderr:\n${exportResult.stderr}`);
    }
    const googleResult = parseJsonOutput(exportResult, 'Google export');

    let funnelAnalysis = null;
    if (args.funnelSegmentsCsv) {
        const funnelPath = path.resolve(repoRoot, args.funnelSegmentsCsv);
        funnelAnalysis = analyzeFunnelSegments(funnelPath, {
            top: 12,
            minEvents: 1,
            minStep: 1,
        });
        const funnelOutputDir = path.dirname(funnelPath);
        await writeJson(path.join(funnelOutputDir, 'growth-sprint-funnel-baseline.json'), funnelAnalysis.summary);
        await fs.writeFile(path.join(funnelOutputDir, 'growth-sprint-funnel-baseline.md'), buildFunnelMarkdown(funnelAnalysis), 'utf8');
    }

    const baseline = {
        generatedAt: new Date().toISOString(),
        range,
        targetPages,
        targetQueries,
        sprintMetrics,
        google: {
            summaryPath: googleResult.summaryPath,
            reportPath: googleResult.reportPath,
        },
        funnel: funnelAnalysis ? {
            csvPath: funnelAnalysis.csvPath,
            summary: funnelAnalysis.summary,
        } : null,
    };
    const baselineJsonPath = path.join(args.outputDir, 'growth-sprint-baseline.json');
    const baselineMdPath = path.join(args.outputDir, 'growth-sprint-baseline.md');
    await writeJson(baselineJsonPath, baseline);
    await fs.writeFile(baselineMdPath, buildBaselineMarkdown({ range, googleResult, funnelAnalysis }), 'utf8');

    const output = { ok: true, baselineJsonPath, baselineMdPath, readinessPath };
    if (args.json) console.log(JSON.stringify(output, null, 2));
    else console.log(`Growth sprint baseline exported: ${rel(baselineMdPath)}`);
}

main().catch((error) => {
    console.error(`build-growth-sprint-baseline failed: ${error.message}`);
    process.exitCode = 1;
});
