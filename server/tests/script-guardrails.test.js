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
        expect(source).toContain('export async function run()');
    });

    test('horoscope prefill requires explicit write flag', () => {
        const source = readScript('server/scripts/prefill-horoscopes.js');

        expect(source).toContain("args.includes('--write')");
        expect(source).toContain('if (!SHOULD_WRITE)');
        expect(source).toContain('[DRY RUN]');
    });

    test('local server does not run scheduled jobs by default', () => {
        const source = readScript('server/index.js');
        const envExample = readScript('server/.env.example');

        expect(source).toContain("process.env.NODE_ENV === 'production' || process.env.ENABLE_SCHEDULED_JOBS === 'true'");
        expect(source).toContain("process.env.DISABLE_SCHEDULED_JOBS !== 'true'");
        expect(envExample).toContain('ENABLE_SCHEDULED_JOBS=false');
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
