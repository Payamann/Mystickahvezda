import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const sections = [
    {
        name: 'api',
        label: 'API endpoints',
        files: [
            'tests/e2e/api-oracle.spec.js',
            'tests/e2e/api-community.spec.js',
        ],
    },
    {
        name: 'core',
        label: 'Core flows',
        defaultWorkers: 1,
        files: [
            'tests/e2e/homepage.spec.js',
            'tests/e2e/navigation.spec.js',
            'tests/e2e/auth.spec.js',
            'tests/e2e/profil.spec.js',
        ],
    },
    {
        name: 'content',
        label: 'Content and SEO pages',
        files: [
            'tests/e2e/content-pages.spec.js',
            'tests/e2e/seo-pages.spec.js',
            'tests/e2e/horoscope.spec.js',
        ],
    },
    {
        name: 'tools',
        label: 'Astro and divination tools',
        files: [
            'tests/e2e/astrology-tools.spec.js',
            'tests/e2e/tarot.spec.js',
            'tests/e2e/divination.spec.js',
            'tests/e2e/numerologie.spec.js',
            'tests/e2e/mentor-shamansko.spec.js',
        ],
    },
    {
        name: 'checkout',
        label: 'Pricing and payment',
        files: [
            'tests/e2e/cenik-payment.spec.js',
        ],
    },
];

const args = process.argv.slice(2);
let project = 'chromium';
let selectedSection = null;
let listSections = false;
const passthroughArgs = [];

for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '--all-projects') {
        project = null;
        continue;
    }

    if (arg === '--list' || arg === '--list-sections') {
        listSections = true;
        continue;
    }

    if (arg === '--project') {
        project = args[index + 1];
        index += 1;
        continue;
    }

    if (arg.startsWith('--project=')) {
        project = arg.split('=')[1];
        continue;
    }

    if (arg === '--section') {
        selectedSection = args[index + 1];
        index += 1;
        continue;
    }

    if (arg.startsWith('--section=')) {
        selectedSection = arg.split('=')[1];
        continue;
    }

    passthroughArgs.push(arg);
}

const requestedSections = selectedSection
    ? sections.filter((section) => section.name === selectedSection)
    : sections;

if (listSections) {
    console.log('Available E2E sections:');
    for (const section of sections) {
        const defaults = section.defaultWorkers ? ` (default --workers=${section.defaultWorkers})` : '';
        console.log(`- ${section.name}: ${section.label}${defaults}`);
        for (const file of section.files) {
            console.log(`  ${file}`);
        }
    }
    process.exit(0);
}

if (requestedSections.length === 0) {
    console.error(`Unknown E2E section: ${selectedSection}`);
    console.error(`Available sections: ${sections.map((section) => section.name).join(', ')}`);
    process.exit(1);
}

const missingFiles = requestedSections
    .flatMap((section) => section.files.map((file) => ({ section: section.name, file })))
    .filter(({ file }) => !fs.existsSync(path.join(process.cwd(), file)));

if (missingFiles.length > 0) {
    console.error('Missing E2E spec file(s):');
    for (const missing of missingFiles) {
        console.error(`- ${missing.section}: ${missing.file}`);
    }
    process.exit(1);
}

const lockPath = path.join(process.cwd(), 'tmp', 'e2e-section-runner.lock');
const staleLockMs = 2 * 60 * 60 * 1000;

function isProcessRunning(pid) {
    if (!Number.isInteger(pid) || pid <= 0) return false;

    try {
        process.kill(pid, 0);
        return true;
    } catch {
        return false;
    }
}

function readExistingLock() {
    try {
        return JSON.parse(fs.readFileSync(lockPath, 'utf8'));
    } catch {
        return null;
    }
}

function removeStaleLockIfNeeded() {
    if (!fs.existsSync(lockPath)) return;

    const lock = readExistingLock();
    const createdAt = lock?.createdAt ? Date.parse(lock.createdAt) : null;
    const isStaleByAge = Number.isFinite(createdAt) && Date.now() - createdAt > staleLockMs;
    const isStaleByProcess = lock?.pid ? !isProcessRunning(lock.pid) : true;

    if (isStaleByAge || isStaleByProcess) {
        fs.rmSync(lockPath, { force: true });
    }
}

function acquireRunnerLock() {
    fs.mkdirSync(path.dirname(lockPath), { recursive: true });
    removeStaleLockIfNeeded();

    let fd;
    try {
        fd = fs.openSync(lockPath, 'wx');
    } catch (error) {
        if (error.code !== 'EEXIST') throw error;

        const lock = readExistingLock();
        const owner = lock
            ? `pid=${lock.pid || 'unknown'}, section=${lock.selectedSection || 'all'}, project=${lock.project || 'all'}, since=${lock.createdAt || 'unknown'}`
            : 'unknown owner';

        console.error('[e2e] Another E2E section runner is already active in this workspace.');
        console.error(`[e2e] ${owner}`);
        console.error('[e2e] Run E2E sections sequentially, or wait for the current run to finish.');
        process.exit(1);
    }

    fs.writeFileSync(fd, JSON.stringify({
        pid: process.pid,
        selectedSection: selectedSection || 'all',
        project: project || 'all',
        createdAt: new Date().toISOString()
    }, null, 2));

    return () => {
        try {
            fs.closeSync(fd);
        } catch {
            // Ignore cleanup errors during process shutdown.
        }
        fs.rmSync(lockPath, { force: true });
    };
}

const releaseRunnerLock = acquireRunnerLock();
process.on('exit', releaseRunnerLock);
process.on('SIGINT', () => {
    releaseRunnerLock();
    process.exit(130);
});
process.on('SIGTERM', () => {
    releaseRunnerLock();
    process.exit(143);
});

const playwrightCliPath = path.join(process.cwd(), 'node_modules', 'playwright', 'cli.js');
const reporterArgs = passthroughArgs.some((arg) => arg === '--reporter' || arg.startsWith('--reporter='))
    ? []
    : ['--reporter=dot'];

function getExplicitWorkerCount(args) {
    for (let index = 0; index < args.length; index += 1) {
        const arg = args[index];
        if (arg === '--workers') {
            return Number.parseInt(args[index + 1], 10);
        }
        if (arg.startsWith('--workers=')) {
            return Number.parseInt(arg.split('=')[1], 10);
        }
    }

    return null;
}

const results = [];

for (const section of requestedSections) {
    const startedAt = Date.now();
    const projectLabel = project ? project : 'all projects';
    const explicitWorkerCount = getExplicitWorkerCount(passthroughArgs);
    const defaultWorkerArgs = explicitWorkerCount === null && section.defaultWorkers
        ? [`--workers=${section.defaultWorkers}`]
        : [];

    console.log('');
    console.log(`=== E2E section: ${section.name} (${section.label}) | ${projectLabel} ===`);
    if (defaultWorkerArgs.length > 0) {
        console.log(`[e2e] Using stable default for ${section.name}: ${defaultWorkerArgs[0]}`);
    } else if (section.defaultWorkers && explicitWorkerCount > section.defaultWorkers) {
        console.warn(`[e2e] ${section.name} is auth-heavy and is most stable with --workers=${section.defaultWorkers}.`);
    }

    const commandArgs = [
        playwrightCliPath,
        'test',
        ...section.files,
        ...(project ? [`--project=${project}`] : []),
        ...reporterArgs,
        ...defaultWorkerArgs,
        ...passthroughArgs,
    ];

    const result = spawnSync(process.execPath, commandArgs, {
        stdio: 'inherit',
        shell: false,
    });

    if (result.error) {
        console.error(`Failed to start Playwright for section "${section.name}": ${result.error.message}`);
    }

    const durationSeconds = Math.round((Date.now() - startedAt) / 1000);
    const status = result.status === 0 ? 'PASS' : 'FAIL';

    results.push({
        name: section.name,
        status,
        durationSeconds,
        exitCode: result.status ?? 1,
    });
}

console.log('');
console.log('=== E2E section summary ===');
for (const result of results) {
    console.log(`${result.status.padEnd(4)} ${result.name.padEnd(8)} ${String(result.durationSeconds).padStart(4)}s`);
}

const failed = results.filter((result) => result.status !== 'PASS');
process.exit(failed.length > 0 ? 1 : 0);
