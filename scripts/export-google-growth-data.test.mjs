import test from 'node:test';
import assert from 'node:assert/strict';
import {
    buildGoogleGrowthSummary,
    normalizeGa4Rows,
    normalizeGscRows,
    resolveDateRange,
} from './export-google-growth-data.mjs';

test('resolveDateRange derives inclusive date ranges', () => {
    assert.deepEqual(resolveDateRange({ startDate: '2026-05-01', endDate: '2026-05-10' }), {
        startDate: '2026-05-01',
        endDate: '2026-05-10',
        days: 10,
    });
});

test('normalizeGscRows maps dimensions and extracts URL path', () => {
    const rows = normalizeGscRows([
        {
            keys: ['tarot karta', 'https://www.mystickahvezda.cz/tarot.html?source=gsc'],
            clicks: 12,
            impressions: 400,
            ctr: 0.03,
            position: 8.4,
        },
    ], ['query', 'page']);

    assert.equal(rows[0].query, 'tarot karta');
    assert.equal(rows[0].path, '/tarot.html?source=gsc');
    assert.equal(rows[0].impressions, 400);
});

test('normalizeGa4Rows calculates engagement and conversion rates', () => {
    const rows = normalizeGa4Rows([
        {
            dimensionValues: [{ value: '/tarot.html' }],
            metricValues: [
                { value: '100' },
                { value: '44' },
                { value: '2' },
                { value: '398' },
            ],
        },
    ], ['landingPagePlusQueryString'], ['sessions', 'engagedSessions', 'conversions', 'totalRevenue']);

    assert.equal(rows[0].path, '/tarot.html');
    assert.equal(rows[0].engagementRate, 44);
    assert.equal(rows[0].conversionRate, 2);
    assert.equal(rows[0].totalRevenue, 398);
});

test('buildGoogleGrowthSummary joins GSC demand with GA4 landing page quality', () => {
    const summary = buildGoogleGrowthSummary({
        range: { startDate: '2026-05-01', endDate: '2026-05-10', days: 10 },
        gscPages: [
            {
                page: 'https://www.mystickahvezda.cz/numerologie.html',
                path: '/numerologie.html',
                clicks: 10,
                impressions: 1000,
                ctr: 0.01,
                position: 7,
            },
        ],
        gscQueryPages: [
            {
                query: 'numerologie zdarma',
                page: 'https://www.mystickahvezda.cz/numerologie.html',
                path: '/numerologie.html',
                clicks: 5,
                impressions: 800,
                ctr: 0.00625,
                position: 6,
            },
        ],
        ga4LandingPages: [
            {
                path: '/numerologie.html',
                sessions: 120,
                engagedSessions: 60,
                conversions: 0,
                totalRevenue: 0,
                engagementRate: 50,
                conversionRate: 0,
            },
        ],
        ga4Sources: [],
    });

    assert.equal(summary.gsc.totalImpressions, 1000);
    assert.equal(summary.gsc.ctrOpportunities[0].path, '/numerologie.html');
    assert.equal(summary.gsc.ctrOpportunities[0].sessions, 120);
    assert.equal(summary.ga4.landingPagesWithTrafficNoConversion[0].path, '/numerologie.html');
});
