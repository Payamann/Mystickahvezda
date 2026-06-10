import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();
const serverDir = path.join(rootDir, 'server');
const allowedProviderFile = path.join(serverDir, 'services', 'claude.js');
const violations = [];

function walk(directory) {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const fullPath = path.join(directory, entry.name);
        if (entry.isDirectory()) {
            if (['node_modules', 'tests', 'migrations'].includes(entry.name)) return [];
            return walk(fullPath);
        }
        return entry.isFile() && entry.name.endsWith('.js') ? [fullPath] : [];
    });
}

function extractCalls(source, functionName) {
    const calls = [];
    let cursor = 0;
    const needle = `${functionName}(`;

    while ((cursor = source.indexOf(needle, cursor)) !== -1) {
        let depth = 0;
        let quote = null;
        let escaped = false;
        let end = cursor + needle.length;

        for (; end < source.length; end += 1) {
            const char = source[end];
            if (escaped) {
                escaped = false;
                continue;
            }
            if (char === '\\') {
                escaped = true;
                continue;
            }
            if (quote) {
                if (char === quote) quote = null;
                continue;
            }
            if (char === '"' || char === "'" || char === '`') {
                quote = char;
                continue;
            }
            if (char === '(') depth += 1;
            if (char === ')') {
                if (depth === 0) {
                    end += 1;
                    break;
                }
                depth -= 1;
            }
        }

        calls.push(source.slice(cursor, end));
        cursor = end;
    }
    return calls;
}

for (const filePath of walk(serverDir)) {
    const source = fs.readFileSync(filePath, 'utf8');
    const relativePath = path.relative(rootDir, filePath).replaceAll('\\', '/');

    if (filePath !== allowedProviderFile
        && (source.includes('api.anthropic.com') || source.includes("'anthropic-version'"))) {
        violations.push(`${relativePath}: direct Anthropic API access`);
    }

    if (filePath !== allowedProviderFile && source.includes('callClaude(')) {
        for (const call of extractCalls(source, 'callClaude')) {
            if (!call.includes('feature:')) {
                violations.push(`${relativePath}: callClaude without an explicit feature profile`);
            }
        }
    }
}

if (violations.length > 0) {
    console.error('AI cost control check failed:');
    violations.forEach((violation) => console.error(`- ${violation}`));
    process.exit(1);
}

console.log('AI cost control check passed.');
