import crypto from 'crypto';
import fs from 'fs';

const htmlFileCspCache = new Map();

function normalizeDirectiveValues(values) {
    return values.filter(Boolean);
}

export function buildInlineScriptHashes(html) {
    const hashes = new Set();
    const scriptBlockPattern = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
    let match;

    while ((match = scriptBlockPattern.exec(html)) !== null) {
        const scriptBody = match[1];
        if (!scriptBody.trim()) continue;

        const hash = crypto.createHash('sha256').update(scriptBody, 'utf8').digest('base64');
        hashes.add(`'sha256-${hash}'`);
    }

    return [...hashes].sort();
}

export function buildContentSecurityPolicy({ inlineScriptHashes = [] } = {}) {
    const directives = {
        'default-src': ["'self'", 'https://cdnjs.cloudflare.com'],
        'base-uri': ["'self'"],
        'form-action': ["'self'", 'https://checkout.stripe.com'],
        'script-src': normalizeDirectiveValues([
            "'self'",
            ...inlineScriptHashes,
            'https://js.stripe.com',
            'https://cdn.jsdelivr.net',
            'https://cdnjs.cloudflare.com',
            'https://unpkg.com',
            'https://www.googletagmanager.com',
            'https://browser.sentry-cdn.com',
            '*.sentry.io',
        ]),
        'script-src-attr': ["'none'"],
        'style-src': [
            "'self'",
            'https://fonts.googleapis.com',
            'https://cdnjs.cloudflare.com',
            'https://cdn.jsdelivr.net',
        ],
        'style-src-attr': ["'none'"],
        'font-src': ["'self'", 'https://fonts.gstatic.com', 'https://cdnjs.cloudflare.com', 'data:'],
        'img-src': ["'self'", 'data:', 'blob:', 'https:', 'https://cdn.jsdelivr.net'],
        'connect-src': normalizeDirectiveValues([
            "'self'",
            process.env.SUPABASE_URL ? `https://${process.env.SUPABASE_URL.replace(/^https?:\/\//, '')}` : '',
            'https://api.stripe.com',
            'https://generativelanguage.googleapis.com',
            'https://cdnjs.cloudflare.com',
            'https://fonts.googleapis.com',
            'https://fonts.gstatic.com',
            'https://cdn.jsdelivr.net',
            'https://unpkg.com',
            'https://www.google-analytics.com',
            'https://region1.google-analytics.com',
            'https://analytics.google.com',
            'https://region1.analytics.google.com',
            'https://stats.g.doubleclick.net',
            'https://www.googletagmanager.com',
        ]),
        'frame-src': ["'self'", 'https://js.stripe.com', 'https://checkout.stripe.com'],
        'object-src': ["'none'"],
        'frame-ancestors': ["'none'"],
    };

    if (process.env.NODE_ENV === 'production') {
        directives['upgrade-insecure-requests'] = [];
    }

    return Object.entries(directives)
        .map(([directive, values]) => values.length ? `${directive} ${values.join(' ')}` : directive)
        .join('; ');
}

export function setBaseContentSecurityPolicy(req, res, next) {
    res.setHeader('Content-Security-Policy', buildContentSecurityPolicy());
    next();
}

export function setHtmlContentSecurityPolicy(res, html) {
    res.setHeader('Content-Security-Policy', buildContentSecurityPolicy({
        inlineScriptHashes: buildInlineScriptHashes(html),
    }));
}

export function setHtmlFileContentSecurityPolicy(res, filePath) {
    const stats = fs.statSync(filePath);
    const cached = htmlFileCspCache.get(filePath);
    if (cached && cached.mtimeMs === stats.mtimeMs && cached.size === stats.size) {
        res.setHeader('Content-Security-Policy', cached.policy);
        return;
    }

    const html = fs.readFileSync(filePath, 'utf8');
    const policy = buildContentSecurityPolicy({
        inlineScriptHashes: buildInlineScriptHashes(html),
    });

    htmlFileCspCache.set(filePath, {
        mtimeMs: stats.mtimeMs,
        size: stats.size,
        policy,
    });
    res.setHeader('Content-Security-Policy', policy);
}
