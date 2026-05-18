#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const REQUIRED_COLUMNS = [
    'source',
    'feature',
    'total_events'
];

const OPTIONAL_COLUMNS = [
    'first_value_completed',
    'activation_completed',
    'paywall_viewed',
    'pricing_intent',
    'checkout_requested',
    'checkout_started',
    'purchase_completed',
    'failures',
    'paywall_to_pricing_intent_rate',
    'pricing_intent_to_checkout_request_rate',
    'checkout_request_to_session_rate',
    'pricing_intent_to_checkout_rate',
    'first_value_to_checkout_rate',
    'activation_to_checkout_rate',
    'paywall_to_checkout_rate',
    'checkout_to_purchase_rate'
];

const STEP_DEFINITIONS = [
    {
        id: 'first_value_to_checkout',
        label: 'first value -> checkout',
        fromColumn: 'first_value_completed',
        toColumn: 'checkout_started',
        rateColumn: 'first_value_to_checkout_rate',
        deltaColumn: 'first_value_to_checkout_rate_delta',
        action: ({ feature }) => `Add a contextual Premium bridge immediately after the first ${feature} value moment, before sending users back to generic navigation.`
    },
    {
        id: 'activation_to_checkout',
        label: 'activation -> checkout',
        fromColumn: 'activation_completed',
        toColumn: 'checkout_started',
        rateColumn: 'activation_to_checkout_rate',
        deltaColumn: 'activation_to_checkout_rate_delta',
        action: ({ feature }) => `Move the upgrade CTA closer to the completed ${feature} ritual/reading and tie the offer to the next personal step, not a generic plan pitch.`
    },
    {
        id: 'paywall_to_pricing_intent',
        label: 'paywall -> pricing intent',
        fromColumn: 'paywall_viewed',
        toColumn: 'pricing_intent',
        rateColumn: 'paywall_to_pricing_intent_rate',
        deltaColumn: 'paywall_to_pricing_intent_rate_delta',
        action: ({ source, feature }) => `Rewrite the ${feature} paywall reached from ${source}: show one locked outcome, one primary CTA, and preserve source/feature params into pricing.`
    },
    {
        id: 'pricing_intent_to_checkout_request',
        label: 'pricing intent -> checkout request',
        fromColumn: 'pricing_intent',
        toColumn: 'checkout_requested',
        rateColumn: 'pricing_intent_to_checkout_request_rate',
        deltaColumn: 'pricing_intent_to_checkout_request_rate_delta',
        action: ({ source, feature }) => `Audit the ${source}/${feature} paid-plan auth handoff: preserve pending plan context, clarify the registration CTA, and verify the checkout request fires after login.`
    },
    {
        id: 'checkout_request_to_session',
        label: 'checkout request -> Stripe session',
        fromColumn: 'checkout_requested',
        toColumn: 'checkout_started',
        rateColumn: 'checkout_request_to_session_rate',
        deltaColumn: 'checkout_request_to_session_rate_delta',
        action: ({ source, feature }) => `Audit Stripe session creation for ${source}/${feature}: check price IDs, duplicate-subscription blocks, CSRF/auth failures, and checkout_session_failed metadata.`
    },
    {
        id: 'pricing_intent_to_checkout',
        label: 'pricing intent -> checkout',
        fromColumn: 'pricing_intent',
        toColumn: 'checkout_started',
        rateColumn: 'pricing_intent_to_checkout_rate',
        deltaColumn: 'pricing_intent_to_checkout_rate_delta',
        action: ({ source, feature }) => `Audit the ${source}/${feature} CTA path: verify plan mapping, URL attribution, selected interval, and that the click reaches checkout without another decision point.`
    },
    {
        id: 'paywall_to_checkout',
        label: 'paywall -> checkout',
        fromColumn: 'paywall_viewed',
        toColumn: 'checkout_started',
        rateColumn: 'paywall_to_checkout_rate',
        deltaColumn: 'paywall_to_checkout_rate_delta',
        action: ({ feature }) => `Shorten the paid path for ${feature}: test direct checkout or a compact pricing preview against the current multi-step route.`
    },
    {
        id: 'checkout_to_purchase',
        label: 'checkout -> purchase',
        fromColumn: 'checkout_started',
        toColumn: 'purchase_completed',
        rateColumn: 'checkout_to_purchase_rate',
        deltaColumn: 'checkout_to_purchase_rate_delta',
        action: ({ source, feature }) => `Review checkout trust and recovery for ${source}/${feature}: inspect cancel/failure reasons, payment copy, and post-cancel return module.`
    }
];

function usage() {
    return [
        'Usage:',
        '  node scripts/analyze-funnel-segments.mjs <funnel-segments.csv> [--top 8] [--min-events 3] [--min-step 2]',
        '',
        'Reads the admin funnel segments CSV export (view=segments) and ranks source+feature leaks by funnel step.',
        '',
        'Options:',
        '  --top <n>         Number of segment actions to print. Default: 8',
        '  --min-events <n>  Ignore rows with fewer total_events. Default: 3',
        '  --min-step <n>    Ignore a step when its denominator is below this count. Default: 2',
        '  --help           Show this help'
    ].join('\n');
}

function parseArgs(argv) {
    const options = {
        top: 8,
        minEvents: 3,
        minStep: 2,
        csvPath: null
    };

    for (let index = 0; index < argv.length; index += 1) {
        const arg = argv[index];
        const [name, inlineValue] = arg.split('=', 2);

        if (arg === '--help' || arg === '-h') {
            options.help = true;
            continue;
        }

        if (name === '--top' || name === '--min-events' || name === '--min-step') {
            const value = inlineValue ?? argv[index + 1];
            if (inlineValue == null) index += 1;
            const parsed = Number.parseInt(value, 10);
            if (!Number.isFinite(parsed) || parsed < 1) {
                throw new Error(`${name} must be a positive integer.`);
            }

            if (name === '--top') options.top = parsed;
            if (name === '--min-events') options.minEvents = parsed;
            if (name === '--min-step') options.minStep = parsed;
            continue;
        }

        if (arg.startsWith('--')) {
            throw new Error(`Unknown option: ${arg}`);
        }

        if (options.csvPath) {
            throw new Error(`Unexpected extra argument: ${arg}`);
        }
        options.csvPath = arg;
    }

    return options;
}

function parseCsv(text) {
    const rows = [];
    let row = [];
    let field = '';
    let inQuotes = false;

    const source = text.replace(/^\uFEFF/, '');

    for (let index = 0; index < source.length; index += 1) {
        const char = source[index];

        if (inQuotes) {
            if (char === '"') {
                if (source[index + 1] === '"') {
                    field += '"';
                    index += 1;
                } else {
                    inQuotes = false;
                }
            } else {
                field += char;
            }
            continue;
        }

        if (char === '"') {
            inQuotes = true;
            continue;
        }

        if (char === ',') {
            row.push(field);
            field = '';
            continue;
        }

        if (char === '\n' || char === '\r') {
            row.push(field);
            field = '';
            if (char === '\r' && source[index + 1] === '\n') index += 1;
            if (row.some(cell => cell !== '')) rows.push(row);
            row = [];
            continue;
        }

        field += char;
    }

    if (field !== '' || row.length > 0) {
        row.push(field);
        if (row.some(cell => cell !== '')) rows.push(row);
    }

    if (inQuotes) {
        throw new Error('CSV ended inside a quoted field.');
    }

    return rows;
}

function rowsToObjects(rows) {
    if (rows.length === 0) {
        throw new Error('CSV is empty.');
    }

    const headers = rows[0].map(header => header.trim());
    const missing = REQUIRED_COLUMNS.filter(column => !headers.includes(column));
    if (missing.length > 0) {
        throw new Error(`CSV is missing required column(s): ${missing.join(', ')}`);
    }

    return rows.slice(1).map((values, index) => {
        const record = {};
        for (const [headerIndex, header] of headers.entries()) {
            record[header] = values[headerIndex] ?? '';
        }
        record.__line = index + 2;
        return record;
    });
}

function missingOptionalColumns(rows) {
    if (rows.length === 0) return [];
    const headers = rows[0].map(header => header.trim());
    return OPTIONAL_COLUMNS.filter(column => !headers.includes(column));
}

function parseNumber(value) {
    if (value == null) return 0;
    const normalized = String(value).trim().replace(/%$/, '').replace(/\s/g, '').replace(',', '.');
    if (normalized === '') return 0;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
}

function parseOptionalNumber(value) {
    if (value == null || String(value).trim() === '') return null;
    const parsed = parseNumber(value);
    return Number.isFinite(parsed) ? parsed : null;
}

function rate(numerator, denominator) {
    if (!denominator || denominator <= 0) return 0;
    return Math.round((numerator / denominator) * 1000) / 10;
}

function formatPercent(value) {
    if (value == null || !Number.isFinite(value)) return 'n/a';
    return `${Number.isInteger(value) ? value : value.toFixed(1)}%`;
}

function formatSignedPercent(value) {
    if (value == null || !Number.isFinite(value)) return 'n/a';
    const sign = value > 0 ? '+' : '';
    return `${sign}${Number.isInteger(value) ? value : value.toFixed(1)}pp`;
}

function severityFor(leak) {
    if (leak.loss >= 10 || (leak.denominator >= 10 && leak.conversionRate < 25)) return 'critical';
    if (leak.loss >= 5 || (leak.denominator >= 5 && leak.conversionRate < 50)) return 'high';
    return 'medium';
}

function normalizeRow(record) {
    return {
        source: record.source || '(direct)',
        feature: record.feature || '(nezadano)',
        totalEvents: parseNumber(record.total_events),
        first_value_completed: parseNumber(record.first_value_completed),
        activation_completed: parseNumber(record.activation_completed),
        daily_ritual_completed: parseNumber(record.daily_ritual_completed),
        reading_feedback_submitted: parseNumber(record.reading_feedback_submitted),
        paywall_viewed: parseNumber(record.paywall_viewed),
        pricing_intent: parseNumber(record.pricing_intent),
        checkout_started: parseNumber(record.checkout_started),
        purchase_completed: parseNumber(record.purchase_completed),
        one_time_pdf_delivered: parseNumber(record.one_time_pdf_delivered),
        one_time_lifecycle_scheduled: parseNumber(record.one_time_lifecycle_scheduled),
        failures: parseNumber(record.failures),
        rates: Object.fromEntries([
            ...STEP_DEFINITIONS.map(step => [step.rateColumn, parseOptionalNumber(record[step.rateColumn])]),
            ...STEP_DEFINITIONS.map(step => [step.deltaColumn, parseOptionalNumber(record[step.deltaColumn])])
        ]),
        line: record.__line
    };
}

function buildLeaks(rows, { minEvents, minStep }) {
    const leaks = [];

    for (const row of rows) {
        if (row.totalEvents < minEvents) continue;

        for (const step of STEP_DEFINITIONS) {
            const denominator = row[step.fromColumn] || 0;
            const next = row[step.toColumn] || 0;
            const loss = Math.max(0, denominator - next);
            if (denominator < minStep || loss <= 0) continue;

            const conversionRate = row.rates[step.rateColumn] ?? rate(next, denominator);
            const delta = row.rates[step.deltaColumn];
            const leak = {
                stepId: step.id,
                stepLabel: step.label,
                source: row.source,
                feature: row.feature,
                denominator,
                next,
                loss,
                conversionRate,
                delta,
                totalEvents: row.totalEvents,
                failures: row.failures,
                line: row.line,
                action: step.action(row)
            };
            leak.severity = severityFor(leak);
            leaks.push(leak);
        }

        if (row.failures > 0) {
            const denominator = Math.max(row.checkout_started, row.pricing_intent, row.paywall_viewed, row.totalEvents);
            const failureRate = rate(row.failures, denominator);
            leaks.push({
                stepId: 'technical_failures',
                stepLabel: 'technical failures',
                source: row.source,
                feature: row.feature,
                denominator,
                next: denominator - row.failures,
                loss: row.failures,
                conversionRate: 100 - failureRate,
                delta: null,
                totalEvents: row.totalEvents,
                failures: row.failures,
                line: row.line,
                severity: row.failures >= 5 || failureRate >= 10 ? 'high' : 'medium',
                action: `Inspect recent failures for ${row.source}/${row.feature}; fix validation, Stripe, or webhook errors before scaling this segment.`
            });
        }
    }

    return leaks.sort((a, b) => b.loss - a.loss
        || a.conversionRate - b.conversionRate
        || b.denominator - a.denominator
        || a.stepLabel.localeCompare(b.stepLabel)
        || a.source.localeCompare(b.source)
        || a.feature.localeCompare(b.feature));
}

function summarizeByStep(leaks) {
    const byStep = new Map();

    for (const leak of leaks) {
        if (!byStep.has(leak.stepLabel)) {
            byStep.set(leak.stepLabel, {
                stepLabel: leak.stepLabel,
                denominator: 0,
                next: 0,
                loss: 0,
                segments: 0
            });
        }
        const summary = byStep.get(leak.stepLabel);
        summary.denominator += leak.denominator;
        summary.next += leak.next;
        summary.loss += leak.loss;
        summary.segments += 1;
    }

    return [...byStep.values()]
        .map(summary => ({
            ...summary,
            conversionRate: rate(summary.next, summary.denominator)
        }))
        .sort((a, b) => b.loss - a.loss
            || a.conversionRate - b.conversionRate
            || a.stepLabel.localeCompare(b.stepLabel));
}

function buildDataQualityNotes(rows) {
    const notes = [];

    for (const row of rows) {
        if (row.checkout_started > row.pricing_intent && row.pricing_intent === 0) {
            notes.push(`${row.source}/${row.feature}: checkout_started exists with no pricing_intent. Check attribution continuity or direct-checkout tracking.`);
        }
        if (row.purchase_completed > row.checkout_started) {
            notes.push(`${row.source}/${row.feature}: purchase_completed exceeds checkout_started. Check whether webhook completion keeps the same source/feature.`);
        }
        if (row.paywall_viewed > 0 && row.pricing_intent === 0 && row.checkout_started > 0) {
            notes.push(`${row.source}/${row.feature}: checkout starts from paywall without pricing intent. Verify CTA event coverage.`);
        }
    }

    return notes.slice(0, 5);
}

function printReport({ csvPath, rows, consideredRows, leaks, options, missingOptional }) {
    const relativePath = path.relative(rootDir, csvPath).replace(/\\/g, '/');
    console.log(`Funnel segment leak analysis`);
    console.log(`File: ${relativePath.startsWith('..') ? csvPath : relativePath}`);
    console.log(`Rows: ${rows.length} (${consideredRows.length} with total_events >= ${options.minEvents})`);
    console.log(`Thresholds: min step denominator ${options.minStep}, top ${options.top}`);
    if (missingOptional.length > 0) {
        console.log(`Schema note: optional column(s) missing and treated as 0/n/a: ${missingOptional.join(', ')}`);
    }
    console.log('');

    if (consideredRows.length === 0) {
        console.log('No rows passed the minimum event threshold. Lower --min-events or export a longer date range.');
        return;
    }

    if (leaks.length === 0) {
        console.log('No funnel leaks found at the current thresholds.');
        return;
    }

    console.log('Leak totals by step:');
    for (const summary of summarizeByStep(leaks)) {
        console.log(`- ${summary.stepLabel}: lost ${summary.loss}/${summary.denominator} across ${summary.segments} segment(s), conversion ${formatPercent(summary.conversionRate)}`);
    }
    console.log('');

    console.log('Top segment actions:');
    for (const [index, leak] of leaks.slice(0, options.top).entries()) {
        console.log(`${index + 1}. [${leak.severity}] ${leak.stepLabel}: ${leak.source} / ${leak.feature}`);
        console.log(`   Evidence: ${leak.denominator} -> ${leak.next}, lost ${leak.loss}; conversion ${formatPercent(leak.conversionRate)}; delta ${formatSignedPercent(leak.delta)}; total events ${leak.totalEvents}`);
        console.log(`   Next action: ${leak.action}`);
    }

    const notes = buildDataQualityNotes(consideredRows);
    if (notes.length > 0) {
        console.log('');
        console.log('Data quality checks:');
        for (const note of notes) {
            console.log(`- ${note}`);
        }
    }
}

function main() {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) {
        console.log(usage());
        return;
    }
    if (!options.csvPath) {
        throw new Error(`Missing CSV path.\n\n${usage()}`);
    }

    const csvPath = path.resolve(process.cwd(), options.csvPath);
    const text = fs.readFileSync(csvPath, 'utf8');
    const parsedRows = parseCsv(text);
    const missingOptional = missingOptionalColumns(parsedRows);
    const records = rowsToObjects(parsedRows);
    const rows = records.map(normalizeRow);
    const consideredRows = rows.filter(row => row.totalEvents >= options.minEvents);
    const leaks = buildLeaks(rows, options);

    printReport({ csvPath, rows, consideredRows, leaks, options, missingOptional });
}

try {
    main();
} catch (error) {
    console.error(`Funnel analysis failed: ${error.message}`);
    process.exitCode = 1;
}
