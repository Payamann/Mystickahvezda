import { supabase } from '../db-supabase.js';

const DEFAULT_RETENTION_DAYS = 180;
const MIN_RETENTION_DAYS = 30;
const TABLE_RETENTION_TARGETS = Object.freeze([
    { table: 'cache_numerology', dateColumn: 'generated_at' },
    { table: 'cache_past_life', dateColumn: 'generated_at' },
    { table: 'cache_medicine_wheel', dateColumn: 'generated_at' },
    { table: 'ai_response_cache', dateColumn: 'updated_at', envKey: 'AI_RESPONSE_CACHE_RETENTION_DAYS' },
    { table: 'one_time_order_inputs', dateColumn: 'created_at', envKey: 'ONE_TIME_ORDER_RETENTION_DAYS' },
    { table: 'analytics_events', dateColumn: 'created_at', envKey: 'ANALYTICS_RETENTION_DAYS' },
    { table: 'login_attempts', dateColumn: 'created_at', envKey: 'LOGIN_ATTEMPTS_RETENTION_DAYS', defaultDays: 30 },
]);

const HOROSCOPE_CACHE_RETENTION = Object.freeze([
    { period: 'daily', days: 2, envKey: 'HOROSCOPE_DAILY_CACHE_RETENTION_DAYS' },
    { period: 'weekly', days: 14, envKey: 'HOROSCOPE_WEEKLY_CACHE_RETENTION_DAYS' },
    { period: 'monthly', days: 60, envKey: 'HOROSCOPE_MONTHLY_CACHE_RETENTION_DAYS' },
]);

export function normalizeRetentionDays(value) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return DEFAULT_RETENTION_DAYS;
    return Math.max(MIN_RETENTION_DAYS, parsed);
}

export function getRetentionCutoffDate(days = DEFAULT_RETENTION_DAYS, now = new Date()) {
    const cutoff = new Date(now.getTime() - normalizeRetentionDays(days) * 24 * 60 * 60 * 1000);
    return cutoff.toISOString();
}

function normalizeShortRetentionDays(value, fallback) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed < 1) return fallback;
    return parsed;
}

function getExactCutoffDate(days, now = new Date()) {
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return cutoff.toISOString();
}

async function deleteOlderThan({ table, dateColumn, cutoff, filters = [] }) {
    let query = supabase
        .from(table)
        .delete({ count: 'exact' });

    for (const [column, value] of filters) {
        query = query.eq(column, value);
    }

    return query.lte(dateColumn, cutoff);
}

export async function pruneHoroscopeCaches({ now = new Date() } = {}) {
    const results = [];

    for (const { period, days, envKey } of HOROSCOPE_CACHE_RETENTION) {
        const retentionDays = normalizeShortRetentionDays(process.env[envKey], days);
        const cutoff = getExactCutoffDate(retentionDays, now);

        try {
            const { error, count } = await deleteOlderThan({
                table: 'cache_horoscopes',
                dateColumn: 'generated_at',
                cutoff,
                filters: [['period', period]]
            });

            if (error) throw error;

            results.push({
                table: 'cache_horoscopes',
                period,
                deleted: count || 0,
                cutoff,
                retentionDays,
                ok: true
            });
        } catch (error) {
            console.error(`[DATA_RETENTION] Failed pruning cache_horoscopes/${period}:`, error.message);
            results.push({
                table: 'cache_horoscopes',
                period,
                deleted: 0,
                cutoff,
                retentionDays,
                ok: false,
                error: error.message
            });
        }
    }

    return results;
}

export async function prunePersonalDataCaches({ days = process.env.PERSONAL_DATA_RETENTION_DAYS } = {}) {
    const retentionDays = normalizeRetentionDays(days);
    const cutoff = getRetentionCutoffDate(retentionDays);
    const results = [];

    results.push(...await pruneHoroscopeCaches());

    for (const { table, dateColumn, envKey, defaultDays } of TABLE_RETENTION_TARGETS) {
        const fallbackDays = defaultDays || retentionDays;
        const tableRetentionDays = normalizeRetentionDays(envKey ? process.env[envKey] || fallbackDays : fallbackDays);
        const tableCutoff = getRetentionCutoffDate(tableRetentionDays);
        try {
            const { error, count } = await deleteOlderThan({
                table,
                dateColumn,
                cutoff: tableCutoff
            });

            if (error) throw error;

            results.push({
                table,
                deleted: count || 0,
                cutoff: tableCutoff,
                retentionDays: tableRetentionDays,
                ok: true
            });
        } catch (error) {
            console.error(`[DATA_RETENTION] Failed pruning ${table}:`, error.message);
            results.push({
                table,
                deleted: 0,
                cutoff: tableCutoff,
                retentionDays: tableRetentionDays,
                ok: false,
                error: error.message
            });
        }
    }

    return {
        cutoff,
        retentionDays,
        results
    };
}

export function initializeDataRetentionJob(schedule) {
    if (process.env.DISABLE_DATA_RETENTION === 'true') {
        console.warn('[DATA_RETENTION] Scheduled cache pruning disabled.');
        return null;
    }

    const job = schedule.scheduleJob('30 3 * * *', () => {
        prunePersonalDataCaches()
            .then((summary) => {
                const deletedTotal = summary.results.reduce((sum, row) => sum + row.deleted, 0);
                console.warn(`[DATA_RETENTION] Pruned ${deletedTotal} old personal cache rows before ${summary.cutoff}.`);
            })
            .catch((error) => {
                console.error('[DATA_RETENTION] Scheduled cache pruning failed:', error);
            });
    });

    console.warn('[DATA_RETENTION] Daily personal cache pruning scheduled (03:30 UTC).');
    return job;
}
