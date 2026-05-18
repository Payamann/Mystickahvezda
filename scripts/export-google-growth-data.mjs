#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import dotenv from 'dotenv';
import { google } from 'googleapis';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(rootDir, 'server', '.env') });
dotenv.config({ path: path.join(rootDir, '.env') });

const DEFAULT_DAYS = 90;
const DEFAULT_LIMIT = 25000;
const DEFAULT_OUTPUT_DIR = path.join(rootDir, 'social-media-agent', 'output', 'google');
const GOOGLE_SCOPES = [
    'https://www.googleapis.com/auth/analytics.readonly',
    'https://www.googleapis.com/auth/webmasters.readonly',
];

function toDateString(date) {
    return date.toISOString().slice(0, 10);
}

export function resolveDateRange({ days = DEFAULT_DAYS, startDate = null, endDate = null } = {}) {
    const end = endDate ? new Date(`${endDate}T00:00:00Z`) : new Date();
    if (Number.isNaN(end.getTime())) throw new Error(`Invalid end date: ${endDate}`);

    const start = startDate
        ? new Date(`${startDate}T00:00:00Z`)
        : new Date(end.getTime() - (Number(days) - 1) * 24 * 60 * 60 * 1000);
    if (Number.isNaN(start.getTime())) throw new Error(`Invalid start date: ${startDate}`);
    if (start > end) throw new Error('Start date must be before or equal to end date.');

    return {
        startDate: toDateString(start),
        endDate: toDateString(end),
        days: Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1,
    };
}

export function parseArgs(argv) {
    const args = {
        days: DEFAULT_DAYS,
        startDate: null,
        endDate: null,
        limit: DEFAULT_LIMIT,
        outputDir: DEFAULT_OUTPUT_DIR,
        credentials: process.env.GOOGLE_APPLICATION_CREDENTIALS || '',
        ga4PropertyId: process.env.GA4_PROPERTY_ID || '',
        gscSiteUrl: process.env.GSC_SITE_URL || '',
        skipGa4: false,
        skipGsc: false,
        checkConfig: false,
        json: false,
    };

    for (let i = 0; i < argv.length; i += 1) {
        const arg = argv[i];
        if (arg === '--days') args.days = Number(argv[++i]);
        else if (arg === '--start-date') args.startDate = argv[++i];
        else if (arg === '--end-date') args.endDate = argv[++i];
        else if (arg === '--limit') args.limit = Number(argv[++i]);
        else if (arg === '--output-dir') args.outputDir = argv[++i];
        else if (arg === '--credentials') args.credentials = argv[++i];
        else if (arg === '--ga4-property-id') args.ga4PropertyId = argv[++i];
        else if (arg === '--gsc-site-url') args.gscSiteUrl = argv[++i];
        else if (arg === '--skip-ga4') args.skipGa4 = true;
        else if (arg === '--skip-gsc') args.skipGsc = true;
        else if (arg === '--check-config') args.checkConfig = true;
        else if (arg === '--json') args.json = true;
        else if (arg === '--help' || arg === '-h') {
            console.log([
                'Usage: node scripts/export-google-growth-data.mjs [--days 90]',
                '       [--credentials C:\\path\\service-account.json]',
                '       [--ga4-property-id 123456789] [--gsc-site-url sc-domain:example.com]',
                '       [--output-dir social-media-agent/output/google]',
                '       [--skip-ga4] [--skip-gsc] [--check-config] [--json]',
                '',
                'Exports GA4 and Google Search Console data into normalized CSV + JSON files for the Codex growth operator.',
            ].join('\n'));
            process.exit(0);
        } else {
            throw new Error(`Unknown argument: ${arg}`);
        }
    }

    if (!Number.isFinite(args.days) || args.days < 1 || args.days > 540) {
        throw new Error('--days must be a number between 1 and 540.');
    }
    if (!Number.isFinite(args.limit) || args.limit < 1 || args.limit > 25000) {
        throw new Error('--limit must be a number between 1 and 25000.');
    }
    args.outputDir = path.resolve(rootDir, args.outputDir);

    return args;
}

function configStatus(args) {
    const missing = [];
    if (!args.credentials) missing.push('GOOGLE_APPLICATION_CREDENTIALS');
    if (!args.skipGa4 && !args.ga4PropertyId) missing.push('GA4_PROPERTY_ID');
    if (!args.skipGsc && !args.gscSiteUrl) missing.push('GSC_SITE_URL');

    return {
        ok: missing.length === 0,
        missing,
        hasCredentialsPath: Boolean(args.credentials),
        ga4Enabled: !args.skipGa4,
        gscEnabled: !args.skipGsc,
        ga4PropertyId: args.ga4PropertyId || null,
        gscSiteUrl: args.gscSiteUrl || null,
    };
}

async function createGoogleAuth(credentials) {
    return new google.auth.GoogleAuth({
        keyFile: credentials,
        scopes: GOOGLE_SCOPES,
    });
}

function safeNumber(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

function normalizePath(value) {
    const text = String(value || '').trim();
    if (!text) return '';
    try {
        const url = new URL(text);
        return `${url.pathname || '/'}${url.search || ''}`;
    } catch {
        return text.startsWith('/') ? text : `/${text}`;
    }
}

export function normalizeGscRows(rows = [], dimensions = []) {
    return rows.map((row) => {
        const keys = row.keys || [];
        const item = {
            clicks: safeNumber(row.clicks),
            impressions: safeNumber(row.impressions),
            ctr: safeNumber(row.ctr),
            position: safeNumber(row.position),
        };

        dimensions.forEach((dimension, index) => {
            item[dimension] = keys[index] || '';
        });
        if (item.page) item.path = normalizePath(item.page);
        return item;
    });
}

export function normalizeGa4Rows(rows = [], dimensions = [], metrics = []) {
    return rows.map((row) => {
        const item = {};
        dimensions.forEach((dimension, index) => {
            item[dimension] = row.dimensionValues?.[index]?.value || '';
        });
        metrics.forEach((metric, index) => {
            item[metric] = safeNumber(row.metricValues?.[index]?.value);
        });
        if (item.landingPagePlusQueryString || item.landingPage) {
            item.path = normalizePath(item.landingPagePlusQueryString || item.landingPage);
        }
        if (item.sessions) {
            item.engagementRate = Math.round(((item.engagedSessions || 0) / item.sessions) * 1000) / 10;
            item.conversionRate = Math.round(((item.conversions || 0) / item.sessions) * 1000) / 10;
        } else {
            item.engagementRate = 0;
            item.conversionRate = 0;
        }
        return item;
    });
}

async function runGscQuery(searchconsole, siteUrl, { startDate, endDate, dimensions, limit }) {
    const allRows = [];
    let startRow = 0;
    const pageSize = Math.min(limit, 25000);

    while (allRows.length < limit) {
        const response = await searchconsole.searchanalytics.query({
            siteUrl,
            requestBody: {
                startDate,
                endDate,
                dimensions,
                rowLimit: Math.min(pageSize, limit - allRows.length),
                startRow,
            },
        });

        const rows = response.data.rows || [];
        allRows.push(...rows);
        if (rows.length < pageSize) break;
        startRow += rows.length;
    }

    return normalizeGscRows(allRows, dimensions);
}

async function runGa4Report(analyticsdata, propertyId, {
    startDate,
    endDate,
    dimensions,
    metrics,
    limit,
}) {
    const response = await analyticsdata.properties.runReport({
        property: `properties/${propertyId}`,
        requestBody: {
            dateRanges: [{ startDate, endDate }],
            dimensions: dimensions.map((name) => ({ name })),
            metrics: metrics.map((name) => ({ name })),
            limit,
            orderBys: [{ metric: { metricName: metrics[0] }, desc: true }],
        },
    });

    return normalizeGa4Rows(response.data.rows || [], dimensions, metrics);
}

async function runGa4ReportWithFallback(analyticsdata, propertyId, options) {
    try {
        return await runGa4Report(analyticsdata, propertyId, options);
    } catch (error) {
        const fallback = {
            ...options,
            dimensions: options.dimensions.map((dimension) => (
                dimension === 'landingPagePlusQueryString' ? 'landingPage' : dimension
            )),
            metrics: options.metrics.filter((metric) => metric !== 'conversions' && metric !== 'totalRevenue'),
        };
        if (
            fallback.dimensions.join('|') === options.dimensions.join('|')
            && fallback.metrics.join('|') === options.metrics.join('|')
        ) {
            throw error;
        }
        return runGa4Report(analyticsdata, propertyId, fallback);
    }
}

function sortByMetric(rows, metric) {
    return [...rows].sort((a, b) => (b[metric] || 0) - (a[metric] || 0));
}

function buildCtrOpportunity(row) {
    const impressions = row.impressions || 0;
    const ctrPercent = (row.ctr || 0) * 100;
    const position = row.position || 0;
    if (impressions < 50 || position > 20 || ctrPercent >= 3.5) return 0;
    const positionWeight = position <= 10 ? 2 : 1;
    return Math.round((impressions * positionWeight * (3.5 - ctrPercent)) / 10);
}

export function buildGoogleGrowthSummary({ gscQueryPages = [], gscPages = [], ga4LandingPages = [], ga4Sources = [], range }) {
    const ga4ByPath = new Map(ga4LandingPages.map((row) => [row.path, row]));
    const pageOpportunities = sortByMetric(
        gscPages.map((row) => {
            const ga4 = ga4ByPath.get(row.path) || {};
            return {
                ...row,
                sessions: ga4.sessions || 0,
                engagedSessions: ga4.engagedSessions || 0,
                conversions: ga4.conversions || 0,
                totalRevenue: ga4.totalRevenue || 0,
                engagementRate: ga4.engagementRate || 0,
                conversionRate: ga4.conversionRate || 0,
                opportunityScore: buildCtrOpportunity(row),
            };
        }),
        'opportunityScore',
    ).filter((row) => row.opportunityScore > 0);

    const queryOpportunities = sortByMetric(
        gscQueryPages.map((row) => ({
            ...row,
            opportunityScore: buildCtrOpportunity(row),
        })),
        'opportunityScore',
    ).filter((row) => row.opportunityScore > 0);

    return {
        generatedAt: new Date().toISOString(),
        range,
        gsc: {
            queryPageRows: gscQueryPages.length,
            pageRows: gscPages.length,
            totalClicks: Math.round(gscPages.reduce((sum, row) => sum + (row.clicks || 0), 0)),
            totalImpressions: Math.round(gscPages.reduce((sum, row) => sum + (row.impressions || 0), 0)),
            topPages: sortByMetric(gscPages, 'clicks').slice(0, 20),
            topQueries: sortByMetric(gscQueryPages, 'clicks').slice(0, 20),
            ctrOpportunities: pageOpportunities.slice(0, 20),
            queryOpportunities: queryOpportunities.slice(0, 20),
        },
        ga4: {
            landingPageRows: ga4LandingPages.length,
            sourceRows: ga4Sources.length,
            sessions: Math.round(ga4LandingPages.reduce((sum, row) => sum + (row.sessions || 0), 0)),
            conversions: Math.round(ga4LandingPages.reduce((sum, row) => sum + (row.conversions || 0), 0)),
            revenue: Math.round(ga4LandingPages.reduce((sum, row) => sum + (row.totalRevenue || 0), 0) * 100) / 100,
            topLandingPages: sortByMetric(ga4LandingPages, 'sessions').slice(0, 20),
            topSources: sortByMetric(ga4Sources, 'sessions').slice(0, 20),
            landingPagesWithTrafficNoConversion: sortByMetric(
                ga4LandingPages.filter((row) => (row.sessions || 0) >= 10 && (row.conversions || 0) === 0),
                'sessions',
            ).slice(0, 20),
        },
    };
}

function csvCell(value) {
    const text = value == null ? '' : String(value);
    return `"${text.replace(/"/g, '""')}"`;
}

async function writeCsv(filePath, rows, columns) {
    const csv = [columns, ...rows.map((row) => columns.map((column) => row[column] ?? ''))]
        .map((row) => row.map(csvCell).join(','))
        .join('\n');
    await fs.writeFile(filePath, `${csv}\n`, 'utf8');
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    const range = resolveDateRange(args);
    const status = configStatus(args);

    if (args.checkConfig) {
        const output = { ...status, range };
        console.log(args.json ? JSON.stringify(output, null, 2) : `Google config ${status.ok ? 'OK' : `missing: ${status.missing.join(', ')}`}`);
        process.exit(status.ok ? 0 : 1);
    }

    if (!status.ok) {
        throw new Error(`Missing Google config: ${status.missing.join(', ')}`);
    }

    const auth = await createGoogleAuth(args.credentials);
    const authClient = await auth.getClient();
    const outputDir = args.outputDir;
    await fs.mkdir(outputDir, { recursive: true });

    let gscQueryPages = [];
    let gscPages = [];
    let ga4LandingPages = [];
    let ga4Sources = [];

    if (!args.skipGsc) {
        const searchconsole = google.searchconsole({ version: 'v1', auth: authClient });
        gscQueryPages = await runGscQuery(searchconsole, args.gscSiteUrl, {
            ...range,
            dimensions: ['query', 'page'],
            limit: args.limit,
        });
        gscPages = await runGscQuery(searchconsole, args.gscSiteUrl, {
            ...range,
            dimensions: ['page'],
            limit: args.limit,
        });
    }

    if (!args.skipGa4) {
        const analyticsdata = google.analyticsdata({ version: 'v1beta', auth: authClient });
        ga4LandingPages = await runGa4ReportWithFallback(analyticsdata, args.ga4PropertyId, {
            ...range,
            dimensions: ['landingPagePlusQueryString'],
            metrics: ['sessions', 'engagedSessions', 'conversions', 'totalRevenue'],
            limit: args.limit,
        });
        ga4Sources = await runGa4ReportWithFallback(analyticsdata, args.ga4PropertyId, {
            ...range,
            dimensions: ['sessionSourceMedium', 'sessionCampaignName'],
            metrics: ['sessions', 'engagedSessions', 'conversions', 'totalRevenue'],
            limit: args.limit,
        });
    }

    const summary = buildGoogleGrowthSummary({
        gscQueryPages,
        gscPages,
        ga4LandingPages,
        ga4Sources,
        range,
    });

    const daysSuffix = `${range.days}d`;
    const summaryPath = path.join(outputDir, `google-growth-${daysSuffix}.json`);
    await fs.writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
    await fs.writeFile(path.join(outputDir, 'google-growth-latest.json'), `${JSON.stringify(summary, null, 2)}\n`, 'utf8');

    await writeCsv(path.join(outputDir, `gsc-query-pages-${daysSuffix}.csv`), gscQueryPages, ['query', 'page', 'path', 'clicks', 'impressions', 'ctr', 'position']);
    await writeCsv(path.join(outputDir, `gsc-pages-${daysSuffix}.csv`), gscPages, ['page', 'path', 'clicks', 'impressions', 'ctr', 'position']);
    await writeCsv(path.join(outputDir, `ga4-landing-pages-${daysSuffix}.csv`), ga4LandingPages, ['landingPagePlusQueryString', 'landingPage', 'path', 'sessions', 'engagedSessions', 'engagementRate', 'conversions', 'conversionRate', 'totalRevenue']);
    await writeCsv(path.join(outputDir, `ga4-sources-${daysSuffix}.csv`), ga4Sources, ['sessionSourceMedium', 'sessionCampaignName', 'sessions', 'engagedSessions', 'engagementRate', 'conversions', 'conversionRate', 'totalRevenue']);

    if (args.json) {
        console.log(JSON.stringify({ summaryPath, summary }, null, 2));
        return;
    }

    console.log(`Google growth data exported: ${summaryPath}`);
    console.log(`GSC: ${summary.gsc.pageRows} pages, ${summary.gsc.queryPageRows} query-page rows, ${summary.gsc.totalClicks} clicks, ${summary.gsc.totalImpressions} impressions`);
    console.log(`GA4: ${summary.ga4.landingPageRows} landing pages, ${summary.ga4.sourceRows} sources, ${summary.ga4.sessions} sessions, ${summary.ga4.conversions} conversions`);
    if (summary.gsc.ctrOpportunities[0]) {
        const row = summary.gsc.ctrOpportunities[0];
        console.log(`Top SEO opportunity: ${row.path} (${row.impressions} impressions, ${(row.ctr * 100).toFixed(1)}% CTR, position ${row.position.toFixed(1)})`);
    }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    main().catch((error) => {
        console.error(`export-google-growth-data failed: ${error?.message || error}`);
        process.exit(1);
    });
}
