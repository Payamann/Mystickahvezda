import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const checks = [
    {
        name: 'validate-html',
        script: 'scripts/validate-html.js',
        input: { toolInput: { file_path: 'index.html' } }
    },
    {
        name: 'validate-sw-assets',
        script: 'scripts/validate-sw-assets.js',
        input: { toolInput: { file_path: 'service-worker.js' } }
    }
];

let failed = false;

for (const check of checks) {
    const result = spawnSync(
        process.execPath,
        [check.script],
        {
            cwd: rootDir,
            encoding: 'utf8',
            input: JSON.stringify(check.input)
        }
    );

    if (result.status !== 0) {
        failed = true;
        console.error(`[hooks] ${check.name} exited with ${result.status}`);
        if (result.stderr) console.error(result.stderr.trim());
        continue;
    }

    let output;
    try {
        output = JSON.parse(result.stdout || '{}');
    } catch (error) {
        failed = true;
        console.error(`[hooks] ${check.name} returned invalid JSON: ${error.message}`);
        console.error((result.stdout || '').trim());
        continue;
    }

    if (output.hookSpecificOutput) {
        failed = true;
        console.error(`[hooks] ${check.name} reported a validation warning:`);
        console.error(JSON.stringify(output.hookSpecificOutput, null, 2));
    }
}

if (failed) {
    process.exit(1);
}

console.log('[hooks] OK: hook validators execute and return clean JSON.');
