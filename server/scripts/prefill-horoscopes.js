#!/usr/bin/env node
/**
 * Pre-fill horoscope cache pro konkrétní datum
 * Usage:
 *   node server/scripts/prefill-horoscopes.js 2026-04-02         # dry run guard
 *   node server/scripts/prefill-horoscopes.js 2026-04-02 --write # generate and write cache
 */
import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
import { config } from 'dotenv';
config({ path: path.join(__dirname, '../.env') });

let runtimeDeps;

async function getRuntimeDeps() {
    if (runtimeDeps) return runtimeDeps;

    const [
        { createClient },
        { callClaude },
        { SYSTEM_PROMPTS }
    ] = await Promise.all([
        import('@supabase/supabase-js'),
        import('../services/claude.js'),
        import('../config/prompts.js')
    ]);

    runtimeDeps = {
        supabase: createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
        ),
        callClaude,
        SYSTEM_PROMPTS
    };

    return runtimeDeps;
}

const SIGNS = ['Beran', 'Býk', 'Blíženci', 'Rak', 'Lev', 'Panna', 'Váhy', 'Štír', 'Střelec', 'Kozoroh', 'Vodnář', 'Ryby'];

const SIGN_ACCUSATIVE = {
    'Beran': 'Berana', 'Býk': 'Býka', 'Blíženci': 'Blížence', 'Rak': 'Raka',
    'Lev': 'Lva', 'Panna': 'Pannu', 'Váhy': 'Váhy', 'Štír': 'Štíra',
    'Střelec': 'Střelce', 'Kozoroh': 'Kozoroha', 'Vodnář': 'Vodnáře', 'Ryby': 'Ryby'
};

const args = process.argv.slice(2);
const SHOULD_WRITE = args.includes('--write');
const targetDate = args.find((arg) => !arg.startsWith('--')) || new Date(Date.now() + 86400000).toISOString().split('T')[0];
const dateObj = new Date(targetDate + 'T12:00:00Z');
const dateStr = dateObj.toLocaleDateString('cs-CZ');

console.log(`\n🌟 Pre-filling horoscope cache pro datum: ${targetDate} (${dateStr})\n`);

if (!SHOULD_WRITE) {
    console.log('[DRY RUN] Horoskopy nebyly generovány ani zapsány do cache.');
    console.log(`[DRY RUN] Pro skutečný zápis spusťte: node server/scripts/prefill-horoscopes.js ${targetDate} --write`);
    process.exit(0);
}

const genderInstruction = `\nTEXT VŽDY FORMULUJ PŘÍSNĚ GENDEROVĚ NEUTRÁLNĚ (vyhni se minulému času a slovům, která určují pohlaví čtenáře, např. místo "jsi připraven" nebo "udělal jsi" piš "je čas se připravit" nebo "došlo k pokroku"). Text piš i nadále poutavě a plynule.`;

async function generateAndCache(sign) {
    const { supabase, callClaude, SYSTEM_PROMPTS } = await getRuntimeDeps();
    const signNorm = sign.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const cacheKey = `${signNorm}_daily_${targetDate}_v3-cs-nocontext`;

    // Check if already cached
    const { data: existing } = await supabase
        .from('cache_horoscopes')
        .select('cache_key')
        .eq('cache_key', cacheKey)
        .single();

    if (existing) {
        console.log(`  ⏭️  ${sign} — již v cache, přeskakuji`);
        return;
    }

    const signAcc = SIGN_ACCUSATIVE[sign] || sign;
    const prompt = `Jsi laskavý astrologický průvodce. Generuješ denní horoskop pro ${signAcc} na den ${dateStr}.\nOdpověď MUSÍ být validní JSON objekt bez markdown formátování (žádné \`\`\`json).\nStruktura:\n{\n  "prediction": "Text horoskopu (přesně 2 věty) specifický pro ${signAcc}. Hlavní energie dne a jedna konkrétní rada vycházející z vlastností tohoto znamení.",\n  "affirmation": "Osobní denní mantra — silná, poetická, specifická pro ${signAcc} a jeho element. 15–25 slov, první osoba, přítomný čas. Nesmí být generická ani klišovitá.",\n  "luckyNumbers": [číslo1, číslo2, číslo3, číslo4]\n}\nText piš česky, poeticky a povzbudivě.${genderInstruction}`;

    const message = `Vygeneruj horoskop pro znamení ${sign} na ${dateStr}.`;
    const systemPrompt = SYSTEM_PROMPTS?.horoscope || 'Jsi astrologický asistent.';

    const rawResponse = await callClaude(systemPrompt, message, prompt);

    // Parse JSON response
    let parsed;
    try {
        const cleaned = rawResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        parsed = JSON.parse(cleaned);
    } catch {
        // Fallback: store raw text
        parsed = { prediction: rawResponse, affirmation: '', luckyNumbers: [3, 7, 11, 22] };
    }

    const { error } = await supabase.from('cache_horoscopes').upsert({
        cache_key: cacheKey,
        sign,
        period: 'daily',
        response: JSON.stringify(parsed),
        period_label: 'Denní inspirace',
        generated_at: new Date().toISOString()
    }, { onConflict: 'cache_key' });

    if (error) throw new Error(error.message);
    console.log(`  ✅ ${sign} — uloženo (key: ${cacheKey})`);
}

async function run() {
    let ok = 0, failed = 0;
    for (const sign of SIGNS) {
        try {
            await generateAndCache(sign);
            ok++;
        } catch (e) {
            console.error(`  ❌ ${sign} — chyba: ${e.message}`);
            failed++;
        }
        // krátká pauza aby nedošlo k rate limiting
        await new Promise(r => setTimeout(r, 800));
    }
    console.log(`\n✨ Hotovo — úspěch: ${ok}, chyby: ${failed}`);
}

run().catch(e => {
    console.error('Fatal:', e);
    process.exit(1);
}).then(() => process.exit(0));
