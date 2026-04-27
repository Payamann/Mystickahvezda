// Production smoke verification. Uses native fetch (Node 18+).

const isLocal = process.argv.includes('--local');
const BASE_URL = (process.env.VERIFY_BASE_URL || (isLocal
    ? 'http://localhost:3001'
    : 'https://www.mystickahvezda.cz')).replace(/\/$/, '');
const EMAIL = process.env.VERIFY_EMAIL;
const PASSWORD = process.env.VERIFY_PASSWORD;
const RUN_AI_CHECKS = process.env.VERIFY_RUN_AI === 'true';
const EXPECTED_SITEMAP_URL = process.env.VERIFY_EXPECTED_SITEMAP_URL || 'https://www.mystickahvezda.cz/sitemap.xml';
const PUBLIC_PAGE_PATHS = (process.env.VERIFY_PUBLIC_PATHS || [
    '/',
    '/horoskopy.html',
    '/natalni-karta.html',
    '/tarot.html',
    '/partnerska-shoda.html',
    '/astro-mapa.html',
    '/cenik.html'
].join(','))
    .split(',')
    .map((path) => path.trim())
    .filter(Boolean);

const cookieJar = new Map();

function storeCookies(response) {
    const setCookies = response.headers.getSetCookie?.() || [];
    const fallbackSetCookie = response.headers.get('set-cookie');
    const cookies = setCookies.length > 0
        ? setCookies
        // Older fetch implementations may fold multiple Set-Cookie headers.
        : (fallbackSetCookie || '').split(/,(?=\s*[^;,=\s]+=[^;,]+)/);

    cookies
        .map((value) => value.trim())
        .filter(Boolean)
        .forEach((cookie) => {
            const [pair] = cookie.split(';');
            const separator = pair.indexOf('=');
            if (separator <= 0) return;
            cookieJar.set(pair.slice(0, separator), pair.slice(separator + 1));
        });
}

function cookieHeader() {
    return [...cookieJar.entries()]
        .map(([name, value]) => `${name}=${value}`)
        .join('; ');
}

async function measure(name, fn) {
    const start = Date.now();
    try {
        const res = await fn();
        const duration = Date.now() - start;
        const status = res?.status ?? res?.response?.status ?? 'n/a';
        console.log(`[${name}] ${duration}ms -> ${status}`);
        return res;
    } catch (error) {
        const duration = Date.now() - start;
        console.error(`[${name}] failed after ${duration}ms: ${error.message}`);
        throw error;
    }
}

async function fetchChecked(path, options = {}) {
    const response = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers: {
            ...(cookieJar.size > 0 ? { Cookie: cookieHeader() } : {}),
            ...(options.headers || {})
        }
    });
    storeCookies(response);
    return response;
}

async function fetchJson(path, options = {}) {
    const response = await fetchChecked(path, {
        ...options,
        headers: {
            Accept: 'application/json',
            ...(options.headers || {})
        }
    });
    const text = await response.text();
    let body;
    try {
        body = text ? JSON.parse(text) : {};
    } catch {
        throw new Error(`${path} returned non-JSON response: ${text.slice(0, 120)}`);
    }
    return { response, body };
}

async function fetchText(path, options = {}) {
    const response = await fetchChecked(path, options);
    const text = await response.text();
    return { response, text };
}

async function getCsrfToken() {
    const { response, body } = await fetchJson('/api/csrf-token');
    if (!response.ok || typeof body.csrfToken !== 'string') {
        throw new Error('Could not obtain CSRF token.');
    }
    return body.csrfToken;
}

async function runPublicChecks() {
    const { response: healthRes, body: health } = await measure('Health', () => fetchJson('/api/health'));
    if (!healthRes.ok || health.status !== 'ok') {
        throw new Error(`Health check is not ok: ${JSON.stringify(health)}`);
    }
    if (health.checks?.db !== 'ok' || health.checks?.ai !== 'ok') {
        throw new Error(`Health dependencies are not ok: ${JSON.stringify(health.checks)}`);
    }

    const { response: locationsRes, body: locations } = await measure('Birth locations', () => fetchJson('/api/birth-locations'));
    if (!locationsRes.ok || locations.success !== true || !Array.isArray(locations.locations) || locations.locations.length === 0) {
        throw new Error('Birth location manifest is not available.');
    }

    const staticRes = await measure('Static asset', () => fetchChecked('/js/birth-location-suggestions.js', { method: 'HEAD' }));
    if (!staticRes.ok) {
        throw new Error('Static birth-location hydrator is not available.');
    }

    await runIndexChecks();
    await runPublicPageChecks();
}

async function runIndexChecks() {
    const { response: sitemapRes, text: sitemap } = await measure('Sitemap', () => fetchText('/sitemap.xml', {
        headers: { Accept: 'application/xml,text/xml,*/*' }
    }));
    if (!sitemapRes.ok || !sitemap.includes('<urlset')) {
        throw new Error('Sitemap is not available or does not look like an XML sitemap.');
    }

    const { response: robotsRes, text: robots } = await measure('Robots', () => fetchText('/robots.txt'));
    if (!robotsRes.ok || !robots.includes(EXPECTED_SITEMAP_URL)) {
        throw new Error('robots.txt is not available or does not point to the canonical sitemap.');
    }
}

async function runPublicPageChecks() {
    for (const pagePath of PUBLIC_PAGE_PATHS) {
        const path = pagePath.startsWith('/') ? pagePath : `/${pagePath}`;
        const { response, text } = await measure(`Page ${path}`, () => fetchText(path, {
            headers: { Accept: 'text/html' }
        }));
        const contentType = response.headers.get('content-type') || '';

        if (!response.ok || !contentType.includes('text/html') || !text.includes('<html')) {
            throw new Error(`Public page check failed for ${path}.`);
        }
    }
}

async function runAuthenticatedChecks() {
    if (!EMAIL || !PASSWORD) {
        console.log('[Auth checks] skipped: set VERIFY_EMAIL and VERIFY_PASSWORD to enable.');
        return;
    }

    const csrfToken = await getCsrfToken();
    const { response: loginRes } = await measure('Login', () => fetchJson('/api/auth/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-csrf-token': csrfToken
        },
        body: JSON.stringify({ email: EMAIL, password: PASSWORD })
    }));
    if (!loginRes.ok || !cookieJar.has('auth_token')) {
        throw new Error('Login failed or auth cookie was not set.');
    }

    const { response: readingsRes, body: readings } = await measure('Readings', () => fetchJson('/api/user/readings?limit=5'));
    if (!readingsRes.ok || !Array.isArray(readings.readings)) {
        throw new Error('Authenticated readings endpoint failed.');
    }
}

async function runAiChecks() {
    if (!RUN_AI_CHECKS) {
        console.log('[AI checks] skipped: set VERIFY_RUN_AI=true to enable paid model calls.');
        return;
    }

    const horoscopeCsrf = await getCsrfToken();
    const { response: horoscopeRes, body: horoscope } = await measure('Horoscope', () => fetchJson('/api/horoscope', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-csrf-token': horoscopeCsrf
        },
        body: JSON.stringify({ sign: 'Lev', period: 'daily' })
    }));
    if (!horoscopeRes.ok || horoscope.success !== true) {
        throw new Error('Daily horoscope check failed.');
    }

    const crystalCsrf = await getCsrfToken();
    const { response: crystalRes, body: crystal } = await measure('Crystal ball', () => fetchJson('/api/crystal-ball', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-csrf-token': crystalCsrf
        },
        body: JSON.stringify({ question: 'Funguje produkcni AI smoke check?' })
    }));
    if (!crystalRes.ok || crystal.success !== true) {
        throw new Error('Crystal ball check failed.');
    }
}

async function run() {
    console.log(`Starting production verification on ${BASE_URL}`);
    await runPublicChecks();
    await runAuthenticatedChecks();
    await runAiChecks();
    console.log('Production verification complete.');
}

run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
