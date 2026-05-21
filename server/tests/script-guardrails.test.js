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
        const productionCommitVerifier = readScript('scripts/verify-production-commit.mjs');

        expect(deployGuard).toContain('if (!liveCommit)');
        expect(deployGuard).toContain('Health deployment metadata missing');
        expect(deployGuard).toContain('[smoke] deployment commit ok:');
        expect(deployGuard).toContain('const smokeExpectedSha = args.skipRemote && args.skipRailway ? null : sha;');
        expect(deployGuard).toContain('fetchLiveDeploymentCommit');
        expect(deployGuard).toContain('Production health currently reports deployment commit');
        expect(deployGuard).toContain('Check Railway GitHub integration/status');
        expect(productionVerifier).toContain('Deployment commit verified');
        expect(productionVerifier).toContain("got ${liveCommit || 'none'}");
        expect(productionVerifier).toContain('runApexDomainDiagnostic');
        expect(productionVerifier).toContain('VERIFY_SKIP_ASTRO');
        expect(productionVerifier).toContain('[Astro checks] skipped');
        expect(productionVerifier).toContain('Add ${VERIFY_APEX_URL} as a Railway custom domain');
        expect(productionCommitVerifier).toContain('VERIFY_EXPECTED_SHA');
        expect(productionCommitVerifier).toContain("git(['rev-parse', 'HEAD'])");
        expect(productionCommitVerifier).toContain('server/scripts/verify-production.js');
    });

    test('revenue truth monitor keeps live exports out of the repo by default', () => {
        const source = readScript('scripts/revenue-truth-monitor.mjs');

        expect(source).toContain("path.join(os.tmpdir(), 'mh-funnel')");
        expect(source).toContain('assertOutsideRepo');
        expect(source).toContain('Refusing to write live funnel exports inside the repo');
        expect(source).toContain('raw CSV/JSON exports stay local and must not be committed');
        expect(source).toContain('scripts/export-live-funnel.mjs');
        expect(source).toContain('scripts/analyze-funnel-segments.mjs');
        expect(source).toContain('monitor-summary.json');
        expect(source).toContain('next_action');
        expect(source).toContain('--summary-only');
        expect(source).toContain('GitHub deployment status unavailable');
        expect(source).toContain('--github-status-fallback-minutes');
        expect(source).toContain('analyzeFunnelSegments');
        expect(source).toContain('segment_analysis');
        expect(source).toContain('top_segment_actions');
        expect(source).toContain('recommended_segment_action');
    });

    test('production browser smokes keep telemetry read-only', () => {
        const blocker = readScript('scripts/smoke-telemetry-blocker.mjs');

        [
            'scripts/production-pricing-handoff-smoke.mjs',
            'scripts/production-auth-handoff-smoke.mjs',
            'scripts/production-tool-runtime-smoke.mjs'
        ].forEach((scriptPath) => {
            const source = readScript(scriptPath);
            expect(source).toContain('createSmokeTelemetryBlocker');
            expect(source).toContain("telemetry.print('");
        });

        expect(blocker).toContain('**/api/payment/funnel-event');
        expect(blocker).toContain('**/api/analytics/event');
        expect(blocker).toContain('**/api/analytics/batch');
        expect(blocker).toContain('telemetry_blocked');
        expect(blocker).toContain('readOnly: true');
        expect(blocker).toContain('sanitizeTelemetryPayload');
        expect(blocker).toContain('events(routeKey = null)');

        const authHandoff = readScript('scripts/production-auth-handoff-smoke.mjs');
        expect(authHandoff).toContain("name: 'register-paid-tarot'");
        expect(authHandoff).toMatch(/name: 'register-paid-tarot'[\s\S]*?mockCheckoutSubmit: true/);
        expect(authHandoff).toContain('checkout_auth_required');
        expect(authHandoff).toContain('checkout_auth_page_viewed');
        expect(authHandoff).toContain('payment_events=');
        expect(authHandoff).toContain('clearScenarioStorage');
        expect(authHandoff).toContain("new URL('/api/health'");
        expect(authHandoff).toContain("name: 'register-weekly-horoscope-inline-flow'");
        expect(authHandoff).toContain('mockCheckoutSubmit: true');
        expect(authHandoff).toContain('checkout_auth_form_submitted');
    });

    test('production verifier covers intent landing clusters', () => {
        const source = readScript('server/scripts/verify-production.js');

        [
            '/tydenni-horoskop.html',
            '/mesicni-horoskop.html',
            '/osobni-rok-2026.html',
            '/partnerska-numerologie.html',
            '/vyznam-data-narozeni.html',
            '/tarot-zdarma.html',
            '/tarot-tri-karty.html',
            '/tarot-keltsky-kriz.html',
            '/tarot-laska.html',
            '/tarot-ano-ne.html'
        ].forEach((path) => {
            expect(source).toContain(`'${path}'`);
        });

        [
            'Horoscope intent cluster',
            'Numerology intent cluster',
            'Tarot intent cluster',
            'Angel cards intent cluster',
            'Synastry intent cluster',
            'Crystal ball intent cluster',
            'Runes intent cluster',
            'Mentor prompt starters',
            'Shaman wheel intent cluster',
            'Past life symbolic intent cluster',
            'Lunar practical guidance cluster',
            'Pricing first week premium value',
            'data-analytics-cta="angel_intent_draw_card"',
            'data-analytics-feature="andelske_karty_hluboky_vhled"',
            'kristalova-koule.html?source=angel_intent_cluster',
            'data-mentor-prompt-type="decision"',
            'css/pages/mentor.css?v=4',
            'data-analytics-cta="shaman_wheel_intent_birth"',
            'runy.html?source=shaman_wheel_intent_cluster',
            'data-analytics-cta="past_life_intent_symbolic"',
            'natalni-karta.html?source=past_life_intent_cluster',
            'data-analytics-cta="lunar_practice_today"',
            'mentor.html?source=lunar_practice',
            'ne jako pevnou předpověď',
            'data-analytics-cta="horoscope_hub_weekly"',
            'data-analytics-cta="numerology_hub_personal_year"',
            'data-analytics-cta="tarot_intent_three_card"',
            'data-analytics-cta="synastry_intent_calculator"',
            'partnerska-numerologie.html?source=synastry_intent_cluster',
            'data-analytics-cta="crystal_intent_open_question"',
            'mentor.html?source=crystal_intent_cluster',
            'data-analytics-cta="runes_intent_daily"',
            'kristalova-koule.html?source=runes_intent_cluster',
            'data-analytics-cta="pricing_first_week_natal"',
            'profil.html?source=pricing_first_week&amp;feature=profile_history'
        ].forEach((snippet) => {
            expect(source).toContain(snippet);
        });
    });

    test('chakra article keeps energy practice outside medical claims', () => {
        const html = readScript('blog/cakrove-leceni-navod.html');

        expect(html).toContain('nenahrazuje lékařskou ani psychologickou péči');
        expect(html).toContain('bez zdravotních slibů');
        expect(html).not.toContain('Blokovaná čakra se vždy projeví');
        expect(html).not.toContain('diabetes jako energetický korelát');
        expect(html).not.toContain('pro lepší zdraví, vztahy a hojnost');
        expect(html).not.toContain('skutečně ovlivňuje nervový systém a endokrinní žlázy');
    });

    test('local server does not run scheduled jobs by default', () => {
        const source = readScript('server/index.js');
        const runtime = readScript('server/config/runtime.js');
        const envExample = readScript('server/.env.example');

        expect(runtime).toContain("process.env.RAILWAY_ENVIRONMENT_NAME");
        expect(runtime).toContain("function isProductionRuntime()");
        expect(source).toContain("isProductionRuntime() || process.env.ENABLE_SCHEDULED_JOBS === 'true'");
        expect(source).toContain("process.env.DISABLE_SCHEDULED_JOBS !== 'true'");
        expect(source).toContain("process.env.ENABLE_SOCIAL_AGENT_SCHEDULER === 'true'");
        expect(source).toContain("process.env.ENABLE_DAILY_HOROSCOPE_EMAILS === 'true'");
        expect(source).toContain("process.env.DISABLE_DAILY_HOROSCOPE_EMAILS !== 'true'");
        expect(source).toContain('socialAgent: getSocialAgentSchedulerStatus()');
        expect(source).toContain('dailyHoroscopeEmail: shouldRunDailyHoroscopeEmails()');
        expect(source).toContain('scheduledJobs: getBackgroundJobStatus()');
        expect(source).toContain('startup_catchup');
        expect(source).toContain('hourly_catchup');
        expect(envExample).toContain('ENABLE_SCHEDULED_JOBS=false');
        expect(envExample).toContain('ENABLE_SOCIAL_AGENT_SCHEDULER=false');
        expect(envExample).toContain('ENABLE_DAILY_HOROSCOPE_EMAILS=false');
        expect(envExample).toContain('DISABLE_DAILY_HOROSCOPE_EMAILS=false');
    });

    test('social media agent scheduler is opt-in beyond the AI API key', () => {
        const source = readScript('server/index.js');

        expect(source).toContain('function shouldRunSocialAgentScheduler()');
        expect(source).toContain("if (shouldRunSocialAgentScheduler() && process.env.ANTHROPIC_API_KEY)");
        expect(source).toContain('set ENABLE_SOCIAL_AGENT_SCHEDULER=true to enable');
    });

    test('production background jobs handle process and promise failures locally', () => {
        const serverSource = readScript('server/index.js');
        const emailQueueSource = readScript('server/jobs/email-queue.js');
        const dataRetentionSource = readScript('server/jobs/data-retention.js');

        expect(serverSource).toContain("child.on('error'");
        expect(serverSource).toContain("child.stdout?.on('data'");
        expect(serverSource).toContain("alertBackgroundJobFailure('social_agent_failed'");
        expect(serverSource).toContain('function runBackgroundTask(label, task, metadata = {})');
        expect(serverSource).toContain("runBackgroundTask('horoscope_prefill'");
        expect(serverSource).toContain("runBackgroundTask('daily_horoscope_startup_catchup'");
        expect(serverSource).toContain("process.platform === 'win32' ? 'python' : 'python3'");
        expect(serverSource).not.toMatch(/schedule\.scheduleJob\([^;\n]*async/);

        expect(emailQueueSource).toContain("processEmailQueue().catch(err =>");
        expect(emailQueueSource).toContain('[JOB] Error on scheduled email queue run:');

        expect(dataRetentionSource).toContain('prunePersonalDataCaches()');
        expect(dataRetentionSource).toContain(".catch((error) =>");
        expect(dataRetentionSource).toContain('[DATA_RETENTION] Scheduled cache pruning failed:');
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
