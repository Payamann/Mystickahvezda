import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function usage() {
    return [
        'Usage: node scripts/verify-production-commit.mjs [--sha <commit>] [--base-url https://...] [--skip-astro]',
        '',
        'Runs the production verifier with VERIFY_EXPECTED_SHA set to the given commit,',
        'or to local HEAD when --sha is omitted.'
    ].join('\n');
}

function git(args) {
    return execFileSync('git', args, { cwd: rootDir, encoding: 'utf8' }).trim();
}

function parseArgs(argv) {
    const args = {
        sha: null,
        baseUrl: null,
        skipAstro: false
    };

    for (let index = 0; index < argv.length; index += 1) {
        const arg = argv[index];
        const next = () => argv[++index];

        if (arg === '--help' || arg === '-h') {
            console.log(usage());
            process.exit(0);
        } else if (arg === '--sha') {
            args.sha = next();
        } else if (arg.startsWith('--sha=')) {
            args.sha = arg.slice('--sha='.length);
        } else if (arg === '--base-url') {
            args.baseUrl = next();
        } else if (arg.startsWith('--base-url=')) {
            args.baseUrl = arg.slice('--base-url='.length);
        } else if (arg === '--skip-astro') {
            args.skipAstro = true;
        } else {
            throw new Error(`Unknown argument: ${arg}\n${usage()}`);
        }
    }

    if (!args.sha) args.sha = git(['rev-parse', 'HEAD']);
    return args;
}

function main() {
    const args = parseArgs(process.argv.slice(2));
    const env = {
        ...process.env,
        VERIFY_EXPECTED_SHA: args.sha
    };

    if (args.baseUrl) env.VERIFY_BASE_URL = args.baseUrl.replace(/\/$/, '');
    if (args.skipAstro) env.VERIFY_SKIP_ASTRO = 'true';

    console.log(`[production-commit] verifying production runtime commit ${args.sha}`);
    execFileSync(process.execPath, ['server/scripts/verify-production.js'], {
        cwd: rootDir,
        stdio: 'inherit',
        env
    });
}

try {
    main();
} catch (error) {
    console.error(`[production-commit] ${error.message}`);
    process.exit(1);
}
