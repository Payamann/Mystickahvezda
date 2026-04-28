import { execFileSync } from 'node:child_process';

const DEFAULT_REPO = 'Payamann/MystickaHvezdaOriginalAntigravity';
const DEFAULT_BASE_URL = 'https://www.mystickahvezda.cz';
const DEFAULT_TIMEOUT_MS = 12 * 60 * 1000;
const DEFAULT_POLL_MS = 15 * 1000;

function parseArgs(argv) {
    const args = {
        branch: 'main',
        remote: 'origin',
        repo: process.env.GITHUB_REPOSITORY || DEFAULT_REPO,
        baseUrl: process.env.VERIFY_BASE_URL || DEFAULT_BASE_URL,
        timeoutMs: Number(process.env.DEPLOY_GUARD_TIMEOUT_MS || DEFAULT_TIMEOUT_MS),
        pollMs: Number(process.env.DEPLOY_GUARD_POLL_MS || DEFAULT_POLL_MS),
        skipRemote: false,
        skipRailway: false,
        skipSmoke: false,
        allowDirty: false
    };

    for (const arg of argv) {
        if (arg.startsWith('--sha=')) args.sha = arg.slice('--sha='.length);
        else if (arg.startsWith('--branch=')) args.branch = arg.slice('--branch='.length);
        else if (arg.startsWith('--remote=')) args.remote = arg.slice('--remote='.length);
        else if (arg.startsWith('--repo=')) args.repo = arg.slice('--repo='.length);
        else if (arg.startsWith('--base-url=')) args.baseUrl = arg.slice('--base-url='.length).replace(/\/$/, '');
        else if (arg.startsWith('--timeout-ms=')) args.timeoutMs = Number(arg.slice('--timeout-ms='.length));
        else if (arg.startsWith('--poll-ms=')) args.pollMs = Number(arg.slice('--poll-ms='.length));
        else if (arg === '--skip-remote') args.skipRemote = true;
        else if (arg === '--skip-railway') args.skipRailway = true;
        else if (arg === '--skip-smoke') args.skipSmoke = true;
        else if (arg === '--allow-dirty') args.allowDirty = true;
    }

    return args;
}

function git(args) {
    return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

function currentSha() {
    return git(['rev-parse', 'HEAD']);
}

function isWorkingTreeClean() {
    return git(['status', '--porcelain']) === '';
}

function remoteBranchSha(remote, branch) {
    const output = git(['ls-remote', remote, `refs/heads/${branch}`]);
    return output.split(/\s+/)[0] || null;
}

async function fetchJson(url) {
    const headers = {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'mysticka-hvezda-deploy-guard'
    };
    if (process.env.GITHUB_TOKEN) {
        headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    const response = await fetch(url, {
        headers
    });

    if (!response.ok) {
        throw new Error(`${url} returned ${response.status}`);
    }

    return response.json();
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function checkRunSummary(checkRuns) {
    return checkRuns
        .map((run) => `${run.name}:${run.status}/${run.conclusion || 'pending'}`)
        .join(' | ');
}

function isCheckRunTerminal(checkRuns) {
    return checkRuns.length > 0 && checkRuns.every((run) => run.status === 'completed');
}

function hasFailingCheckRun(checkRuns) {
    return checkRuns.some((run) => ['failure', 'cancelled', 'timed_out', 'action_required', 'skipped'].includes(run.conclusion));
}

async function waitForChecks({ repo, sha, timeoutMs, pollMs }) {
    const deadline = Date.now() + timeoutMs;
    let lastRuns = [];

    while (Date.now() < deadline) {
        const data = await fetchJson(`https://api.github.com/repos/${repo}/commits/${sha}/check-runs`);
        lastRuns = data.check_runs || [];
        console.log(`[checks] ${checkRunSummary(lastRuns) || 'waiting for check suite'}`);

        if (isCheckRunTerminal(lastRuns)) {
            if (hasFailingCheckRun(lastRuns)) {
                throw new Error(`GitHub checks failed: ${checkRunSummary(lastRuns)}`);
            }
            return lastRuns;
        }

        await sleep(pollMs);
    }

    throw new Error(`Timed out waiting for GitHub checks: ${checkRunSummary(lastRuns)}`);
}

async function waitForRailwayStatus({ repo, sha, timeoutMs, pollMs }) {
    const deadline = Date.now() + timeoutMs;
    let latest = null;

    while (Date.now() < deadline) {
        const data = await fetchJson(`https://api.github.com/repos/${repo}/commits/${sha}/status`);
        latest = data.statuses?.[0] || null;
        const description = latest?.description || 'no deployment status yet';
        console.log(`[railway] state=${data.state} desc="${description}"`);

        if (data.state === 'success') return data;
        if (data.state === 'failure' || data.state === 'error') {
            throw new Error(`Railway deployment status failed: ${description}`);
        }

        await sleep(pollMs);
    }

    throw new Error(`Timed out waiting for Railway status: ${latest?.description || 'no status'}`);
}

async function assertHttpOk(url, options = {}) {
    const response = await fetch(url, {
        redirect: 'follow',
        headers: {
            'Cache-Control': 'no-cache',
            Pragma: 'no-cache',
            ...(options.headers || {})
        }
    });
    const text = await response.text();
    if (!response.ok) {
        throw new Error(`${url} returned HTTP ${response.status}`);
    }
    return { response, text };
}

async function runSmokeChecks(baseUrl) {
    const normalizedBase = baseUrl.replace(/\/$/, '');
    const health = await assertHttpOk(`${normalizedBase}/api/health`, {
        headers: { Accept: 'application/json' }
    });
    const healthBody = JSON.parse(health.text);
    if (healthBody.status !== 'ok') {
        throw new Error(`Health is not ok: ${health.text.slice(0, 240)}`);
    }
    console.log(`[smoke] health ok: ${healthBody.timestamp || 'no timestamp'}`);

    const homepage = await assertHttpOk(`${normalizedBase}/`, {
        headers: { Accept: 'text/html' }
    });
    if (
        !homepage.text.includes('<html') ||
        !homepage.text.includes('lang="cs"') ||
        !homepage.text.includes('Mystick')
    ) {
        throw new Error('Homepage did not return expected HTML.');
    }
    console.log('[smoke] homepage ok');
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    const sha = args.sha || currentSha();

    console.log(`[deploy-guard] repo=${args.repo} remote=${args.remote}/${args.branch} sha=${sha}`);

    if (!args.skipRemote && !args.allowDirty && !isWorkingTreeClean()) {
        throw new Error('Working tree has uncommitted changes. Commit/push them or rerun with --allow-dirty if this is an intentional read-only check.');
    }

    if (!args.skipRemote) {
        const remoteSha = remoteBranchSha(args.remote, args.branch);
        if (remoteSha !== sha) {
            throw new Error(`${args.remote}/${args.branch} points to ${remoteSha}, expected ${sha}. Push HEAD to the deploy branch first.`);
        }
    }

    if (!args.skipRemote) await waitForChecks({ ...args, sha });
    if (!args.skipRailway) await waitForRailwayStatus({ ...args, sha });
    if (!args.skipSmoke) await runSmokeChecks(args.baseUrl);

    console.log('[deploy-guard] DEPLOY OK');
}

main().catch((error) => {
    console.error(`[deploy-guard] ${error.message}`);
    process.exit(1);
});
