import { supabase } from '../db-supabase.js';

// ============================================
// MOON PHASE CALCULATIONS
// ============================================

export function calculateMoonPhase() {
    const now = new Date();
    const synodic = 29.53058867; // Synodic month (new moon to new moon)
    const knownNewMoon = new Date('2024-01-11T11:57:00'); // Known New Moon reference
    const diffDays = (now - knownNewMoon) / (1000 * 60 * 60 * 24);
    const phaseIndex = (diffDays % synodic);

    // Normalize to 0-29.5
    let currentPhase = phaseIndex;
    if (currentPhase < 0) currentPhase += synodic;

    // Determine simplified phase name
    if (currentPhase < 1.5 || currentPhase > 28) return 'Nov (Znovuzrození, nové začátky)';
    if (currentPhase < 7) return 'Dorůstající srpek (Budování, sbírání sil)';
    if (currentPhase < 9) return 'První čtvrť (Překonávání překážek)';
    if (currentPhase < 14) return 'Dorůstající měsíc (Zdokonalování)';
    if (currentPhase < 16) return 'Úplněk (Vyvrcholení, odhalení pravdy)';
    if (currentPhase < 21) return 'Couvající měsíc (Uvolňování, vděčnost)';
    if (currentPhase < 23) return 'Poslední čtvrť (Odpouštění)';
    return 'Couvající srpek (Očista, odpočinek)';
}

// ============================================
// HOROSCOPE CACHE & UTILS
// ============================================

// Generate cache key based on sign, period, and date
export function getHoroscopeCacheKey(sign, period) {
    const now = new Date();
    const signNormalized = sign.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    if (period === 'weekly') {
        // ISO week number
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const days = Math.floor((now - startOfYear) / (24 * 60 * 60 * 1000));
        const week = Math.ceil((days + startOfYear.getDay() + 1) / 7);
        return `${signNormalized}_weekly_${now.getFullYear()}-W${String(week).padStart(2, '0')}`;
    } else if (period === 'monthly') {
        return `${signNormalized}_monthly_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    } else {
        // Daily (default)
        return `${signNormalized}_daily_${now.toISOString().split('T')[0]}`;
    }
}

// Get cached horoscope from database
export async function getCachedHoroscope(cacheKey) {
    try {
        const { data, error } = await supabase
            .from('cache_horoscopes')
            .select('*')
            .eq('cache_key', cacheKey)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null; // Not found
            throw error;
        }

        return data;
    } catch (e) {
        console.warn('Cache get error:', e.message);
        return null;
    }
}

// Save horoscope to database cache
export async function saveCachedHoroscope(cacheKey, sign, period, response, periodLabel) {
    try {
        const { error } = await supabase
            .from('cache_horoscopes')
            .upsert({
                cache_key: cacheKey,
                sign,
                period,
                response,
                period_label: periodLabel,
                generated_at: new Date().toISOString()
            }, {
                onConflict: 'cache_key'
            });

        if (error) throw error;
    } catch (e) {
        console.warn('Cache save error:', e.message);
    }
}
