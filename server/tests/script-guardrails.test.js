import fs from 'fs';
import path from 'path';

const ROOT_DIR = path.resolve(process.cwd());

function readScript(relativePath) {
    return fs.readFileSync(path.join(ROOT_DIR, relativePath), 'utf8');
}

function extractStringMap(source, declarationName) {
    const match = source.match(new RegExp(`const ${declarationName} = \\{([\\s\\S]*?)\\};`));
    if (!match) {
        throw new Error(`${declarationName} map not found`);
    }

    return Object.fromEntries(
        [...match[1].matchAll(/'([^']+)'\s*:\s*'([^']+)'/g)].map((entry) => [entry[1], entry[2]])
    );
}

describe('manual script guardrails', () => {
    test('dry-run guarded scripts lazy-load live services', () => {
        const guardedScripts = [
            'server/scripts/send-newsletter.js',
            'server/scripts/send-daily-horoscope.js',
            'server/scripts/prefill-horoscopes.js'
        ];

        for (const script of guardedScripts) {
            const source = readScript(script);
            expect(`${script}\n${source}`).not.toMatch(/^import\s+.*(?:@supabase|resend|services\/claude|services\/astrology|email-service)/m);
        }
    });

    test('newsletter script requires explicit send flag', () => {
        const source = readScript('server/scripts/send-newsletter.js');

        expect(source).toContain("process.argv.includes('--send')");
        expect(source).toContain('if (SHOULD_SEND)');
        expect(source).toContain('[DRY RUN]');
        expect(source).not.toMatch(/await\s+sendNewsletter\(\s*{/);
    });

    test('daily horoscope CLI send requires explicit send flag', () => {
        const source = readScript('server/scripts/send-daily-horoscope.js');

        expect(source).toContain("process.argv.includes('--send')");
        expect(source).toContain('[DRY RUN]');
        expect(source).toContain('export async function run(options = {})');
    });

    test('daily horoscope script uses shared email service payload', () => {
        const source = readScript('server/scripts/send-daily-horoscope.js');

        expect(source).toContain("template: 'daily_horoscope'");
        expect(source).toContain('sendEmail({');
        expect(source).not.toContain('resend.emails.send');
        expect(source).not.toContain("import('resend')");
    });

    test('horoscope prefill requires explicit write flag', () => {
        const source = readScript('server/scripts/prefill-horoscopes.js');

        expect(source).toContain("args.includes('--write')");
        expect(source).toContain('if (!SHOULD_WRITE)');
        expect(source).toContain('[DRY RUN]');
    });

    test('daily reel generator requires explicit write flag before live work', () => {
        const source = readScript('scripts/daily_reel2.py');

        expect(source).toContain('parser.add_argument("--write"');
        expect(source).toContain('DAILY_REEL2_ALLOW_WRITE');
        expect(source).toContain('[DRY RUN] daily_reel2.py is guarded by default.');

        const guardIndex = source.indexOf('if not explicit_write_enabled(args):');
        const envIndex = source.indexOf('require_live_environment()', guardIndex);
        const apiStatsIndex = source.indexOf('API_STATS.reset()', guardIndex);

        expect(guardIndex).toBeGreaterThan(-1);
        expect(envIndex).toBeGreaterThan(guardIndex);
        expect(apiStatsIndex).toBeGreaterThan(envIndex);
    });

    test('paid content helper scripts are dry-run guarded by default', () => {
        const guardedScripts = [
            {
                path: 'scripts/daily_reel.py',
                envFlag: 'DAILY_REEL_ALLOW_WRITE',
                dryRun: '[DRY RUN] daily_reel.py is guarded by default.',
                guard: 'if not explicit_write_enabled(args):'
            },
            {
                path: 'scripts/evening_post.py',
                envFlag: 'EVENING_POST_ALLOW_WRITE',
                dryRun: '[DRY RUN] evening_post.py is guarded by default.',
                guard: 'if not explicit_generation_enabled(args):'
            },
            {
                path: 'scripts/generate-seo-pages.js',
                envFlag: 'GENERATE_SEO_PAGES_ALLOW_WRITE',
                dryRun: '[DRY RUN] generate-seo-pages.js is guarded by default.',
                guard: 'if (!SHOULD_WRITE)'
            }
        ];

        for (const script of guardedScripts) {
            const source = readScript(script.path);
            expect(source).toContain('--write');
            expect(source).toContain(script.envFlag);
            expect(source).toContain(script.dryRun);
            expect(source).toContain(script.guard);
        }
    });

    test('deploy verification fails loudly when expected commit metadata is missing', () => {
        const deployGuard = readScript('scripts/deploy-guard.mjs');
        const productionVerifier = readScript('server/scripts/verify-production.js');

        expect(deployGuard).toContain('if (!liveCommit)');
        expect(deployGuard).toContain('Health deployment metadata missing');
        expect(deployGuard).toContain('[smoke] deployment commit ok:');
        expect(deployGuard).toContain('const smokeExpectedSha = args.skipRemote && args.skipRailway ? null : sha;');
        expect(productionVerifier).toContain('Deployment commit verified');
        expect(productionVerifier).toContain("got ${liveCommit || 'none'}");
    });

    test('local server does not run scheduled jobs by default', () => {
        const source = readScript('server/index.js');
        const envExample = readScript('server/.env.example');

        expect(source).toContain("process.env.RAILWAY_ENVIRONMENT_NAME");
        expect(source).toContain("const IS_PRODUCTION_RUNTIME");
        expect(source).toContain("IS_PRODUCTION_RUNTIME || process.env.ENABLE_SCHEDULED_JOBS === 'true'");
        expect(source).toContain("process.env.DISABLE_SCHEDULED_JOBS !== 'true'");
        expect(source).toContain("process.env.ENABLE_DAILY_HOROSCOPE_EMAILS === 'true'");
        expect(source).toContain("process.env.DISABLE_DAILY_HOROSCOPE_EMAILS !== 'true'");
        expect(source).toContain('dailyHoroscopeEmail: SHOULD_RUN_DAILY_HOROSCOPE_EMAILS');
        expect(source).toContain('scheduledJobs: getBackgroundJobStatus()');
        expect(source).toContain('startup_catchup');
        expect(source).toContain('hourly_catchup');
        expect(envExample).toContain('ENABLE_SCHEDULED_JOBS=false');
        expect(envExample).toContain('ENABLE_DAILY_HOROSCOPE_EMAILS=false');
        expect(envExample).toContain('DISABLE_DAILY_HOROSCOPE_EMAILS=false');
    });

    test('exit intent feature map uses existing pages and covered auth features', () => {
        const source = readScript('js/exit-intent.js');
        const authContextSource = readScript('js/prihlaseni.js');
        const featureMap = extractStringMap(source, 'FEATURE_MAP');

        for (const [pageSlug, feature] of Object.entries(featureMap)) {
            expect(fs.existsSync(path.join(ROOT_DIR, `${pageSlug}.html`))).toBe(true);
            expect(authContextSource).toMatch(new RegExp(`['"]?${feature}['"]?\\s*:`));
        }
    });
});
