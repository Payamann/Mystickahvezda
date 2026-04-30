import { supabase } from '../db-supabase.js';

const DEFAULT_RETENTION_DAYS = 180;
const MIN_RETENTION_DAYS = 30;
const CACHE_TABLES = Object.freeze([
    { table: 'cache_numerology', dateColumn: 'generated_at' },
    { table: 'cache_past_life', dateColumn: 'generated_at' },
    { table: 'cache_medicine_wheel', dateColumn: 'generated_at' },
    { table: 'one_time_order_inputs', dateColumn: 'created_at', envKey: 'ONE_TIME_ORDER_RETENTION_DAYS' },
    { table: 'analytics_events', dateColumn: 'created_at', envKey: 'ANALYTICS_RETENTION_DAYS' },
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

export async function prunePersonalDataCaches({ days = process.env.PERSONAL_DATA_RETENTION_DAYS } = {}) {
    const retentionDays = normalizeRetentionDays(days);
    const cutoff = getRetentionCutoffDate(retentionDays);
    const results = [];

    for (const { table, dateColumn, envKey } of CACHE_TABLES) {
        const tableRetentionDays = normalizeRetentionDays(envKey ? process.env[envKey] || retentionDays : retentionDays);
        const tableCutoff = getRetentionCutoffDate(tableRetentionDays);
        try {
            const { error, count } = await supabase
                .from(table)
                .delete({ count: 'exact' })
                .lte(dateColumn, tableCutoff);

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

    const job = schedule.scheduleJob('30 3 * * *', async () => {
        const summary = await prunePersonalDataCaches();
        const deletedTotal = summary.results.reduce((sum, row) => sum + row.deleted, 0);
        console.warn(`[DATA_RETENTION] Pruned ${deletedTotal} old personal cache rows before ${summary.cutoff}.`);
    });

    console.warn('[DATA_RETENTION] Daily personal cache pruning scheduled (03:30 UTC).');
    return job;
}
