/**
 * API Documentation Router
 * GET /api/docs       — Swagger UI (HTML, via CDN)
 * GET /api/docs/openapi.yaml — Raw OpenAPI spec
 *
 * Access control:
 *   - In non-production: always accessible
 *   - In production: requires DOCS_TOKEN env var to be set and matched via
 *     ?token=... query param or Authorization: Bearer ... header
 */
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const SPEC_PATH = path.join(__dirname, '..', 'openapi.yaml');

export function isDocAllowed(req) {
    if (process.env.NODE_ENV !== 'production') return true;

    const docsToken = process.env.DOCS_TOKEN;
    if (!docsToken) return false; // Production without DOCS_TOKEN = disabled

    const queryToken = req.query.token;
    const authHeader = req.headers['authorization'];
    const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    return queryToken === docsToken || bearerToken === docsToken;
}

// GET /api/docs — Swagger UI HTML
router.get('/', (req, res) => {
    if (!isDocAllowed(req)) {
        return res.status(403).json({ error: 'API documentation is disabled in production. Set DOCS_TOKEN to enable.' });
    }

    const specUrl = '/api/docs/openapi.yaml';
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mystická Hvězda API Docs</title>
  <meta name="robots" content="noindex, nofollow">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css">
  <link rel="stylesheet" href="/css/style.v2.min.css?v=11">
</head>
<body class="api-docs-page">
  <div id="swagger-ui" data-spec-url="${specUrl}"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script src="/js/dist/swagger-docs.js" defer></script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.send(html);
});

// GET /api/docs/openapi.yaml — raw spec
router.get('/openapi.yaml', (req, res) => {
    if (!isDocAllowed(req)) {
        return res.status(403).json({ error: 'API documentation is disabled in production.' });
    }

    try {
        const spec = fs.readFileSync(SPEC_PATH, 'utf8');
        res.setHeader('Content-Type', 'application/yaml');
        res.setHeader('Cache-Control', 'no-store');
        res.send(spec);
    } catch (err) {
        res.status(500).json({ error: 'Could not read OpenAPI spec.' });
    }
});

export default router;
