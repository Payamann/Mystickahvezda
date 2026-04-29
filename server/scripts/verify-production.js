// Production smoke verification. Uses native fetch (Node 18+).

import { readFileSync } from 'node:fs';

const isLocal = process.argv.includes('--local');
const BASE_URL = (process.env.VERIFY_BASE_URL || (isLocal
    ? 'http://localhost:3001'
    : 'https://www.mystickahvezda.cz')).replace(/\/$/, '');
const EMAIL = process.env.VERIFY_EMAIL;
const PASSWORD = process.env.VERIFY_PASSWORD;
const RUN_AI_CHECKS = process.env.VERIFY_RUN_AI === 'true';
const EXPECTED_DEPLOY_SHA = process.env.VERIFY_EXPECTED_SHA || null;
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
const CONVERSION_LINK_CHECKS = [
    {
        path: '/',
        name: 'Homepage premium pricing CTA',
        snippets: [
            'plan=pruvodce',
            'source=homepage_pricing_preview',
            'feature=premium_membership'
        ]
    },
    {
        path: '/',
        name: 'Homepage daily angel card CTAs',
        snippets: [
            'id="hero-daily-card-link"',
            'href="#sluzby"',
            'Andělská karta dne',
            'prihlaseni.html?mode=register&source=header_register&feature=account',
            'prihlaseni.html?source=mobile_menu_login',
            'id="kdd-lexicon-link" href="andelske-karty.html?source=homepage_daily_card_detail&feature=daily_angel_card"',
            'id="kdd-full-reading-link"',
            'source=homepage_daily_card_full_reading',
            'feature=andelske_karty_hluboky_vhled'
        ]
    },
    {
        path: '/',
        name: 'Homepage trust and pricing copy',
        snippets: [
            'Zkušenosti uvádíme poctivě a s kontextem',
            'Nechceme předstírat veřejné hodnocení',
            'Anonymizované příběhy',
            'Kontext u každé zkušenosti',
            'Ověřené recenze oddělíme',
            'Tvůj první výklad během pár minut',
            'Než se zaregistruješ, podívej se na ukázku',
            'Co dostaneš bez placení',
            'Kdy dává smysl platit',
            'Ceník bez překvapení',
            'Začni zdarma. Plať až ve chvíli, kdy chceš víc.',
            'Jak zrušit předplatné',
            'Platby, soukromí a pravidla služby:',
            'Než si vytvoříš účet',
            'Provozovatel služby Mystická Hvězda',
            'Nenahrazují lékařskou, psychologickou, právní ani finanční pomoc',
            'Výpočty pod povrchem',
            'Chceš porovnat všechny tarify',
            'Otevřít celý ceník'
        ]
    },
    {
        path: '/minuly-zivot.html',
        name: 'Past life premium/register CTAs',
        snippets: [
            'source=past_life_banner_upgrade',
            'source=past_life_register_gate',
            'feature=minuly_zivot'
        ]
    },
    {
        path: '/jak-to-funguje.html',
        name: 'How it works signup CTA',
        snippets: [
            'mode=register',
            'source=how_it_works_cta',
            'feature=daily_guidance'
        ]
    },
    {
        path: '/kristalova-koule.html',
        name: 'Crystal ball freemium CTA',
        snippets: [
            'id="freemium-banner-text">Dnes zbývá:',
            'source=crystal_ball_banner_upgrade',
            '>Získat Premium ›</a>'
        ]
    },
    {
        path: '/runy.html',
        name: 'Runes freemium CTA',
        snippets: [
            'id="freemium-banner-text">Dnes zbývá:',
            'source=runes_freemium_banner',
            '>Získat Premium ›</a>'
        ]
    }
];

const cookieJar = new Map();
const serviceWorkerPath = new URL('../../service-worker.js', import.meta.url);

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

function extractCacheName(source) {
    return source.match(/const CACHE_NAME = '([^']+)';/)?.[1] || null;
}

function expectedServiceWorkerCacheName() {
    const source = readFileSync(serviceWorkerPath, 'utf8');
    const cacheName = extractCacheName(source);
    if (!cacheName) {
        throw new Error('Local service-worker.js does not declare CACHE_NAME.');
    }
    return cacheName;
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
    if (EXPECTED_DEPLOY_SHA) {
        const liveCommit = health.deployment?.commit || '';
        if (!liveCommit || (!liveCommit.startsWith(EXPECTED_DEPLOY_SHA) && !EXPECTED_DEPLOY_SHA.startsWith(liveCommit))) {
            throw new Error(`Deployment commit mismatch. Expected ${EXPECTED_DEPLOY_SHA}, got ${liveCommit || 'none'}.`);
        }
        console.log(`[Health] Deployment commit verified: ${liveCommit}`);
    } else if (health.deployment?.commit) {
        console.log(`[Health] Deployment commit: ${health.deployment.commit}`);
    }

    await runPublicConfigCheck();
    await runAnalyticsEndpointCheck();

    const { response: locationsRes, body: locations } = await measure('Birth locations', () => fetchJson('/api/birth-locations'));
    if (!locationsRes.ok || locations.success !== true || !Array.isArray(locations.locations) || locations.locations.length === 0) {
        throw new Error('Birth location manifest is not available.');
    }

    const staticRes = await measure('Static asset', () => fetchChecked('/js/birth-location-suggestions.js', { method: 'HEAD' }));
    if (!staticRes.ok) {
        throw new Error('Static birth-location hydrator is not available.');
    }

    await runServiceWorkerCheck();
    await runIndexChecks();
    await runPublicPageChecks();
    await runConversionLinkChecks();
    await runRedirectChecks();
    await runAstroCalculationChecks();
}

async function runAnalyticsEndpointCheck() {
    const csrfToken = await getCsrfToken();
    const { response, body } = await measure('Analytics endpoint', () => fetchJson('/api/analytics/event', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken
        },
        body: JSON.stringify({
            eventName: 'production_smoke_checked',
            feature: 'deploy_guard',
            metadata: {
                source: 'verify-production',
                path: '/api/health'
            }
        })
    }));

    if (!response.ok || body.success !== true) {
        throw new Error(`Analytics endpoint did not accept smoke event: ${JSON.stringify(body)}`);
    }
}

async function runPublicConfigCheck() {
    const { response, body } = await measure('Public config', () => fetchJson('/api/config'));
    const features = body?.features;
    const pushFlag = features?.pushNotifications;

    if (!response.ok || !features || typeof pushFlag !== 'boolean') {
        throw new Error(`Public config does not expose feature flags correctly: ${JSON.stringify(body)}`);
    }

    if (body.vapidPublicKey !== null && typeof body.vapidPublicKey !== 'string') {
        throw new Error('Public config VAPID key must be null or a string.');
    }

    if (typeof body.vapidPublicKey === 'string' && !pushFlag) {
        throw new Error('Public config exposes a VAPID key while pushNotifications is disabled.');
    }

    if (body.sentryDsn !== null && typeof body.sentryDsn !== 'string') {
        throw new Error('Public config Sentry DSN must be null or a string.');
    }
}

async function runServiceWorkerCheck() {
    const expectedCacheName = expectedServiceWorkerCacheName();
    const { response, text } = await measure('Service worker', () => fetchText(`/service-worker.js?_=${Date.now()}`, {
        headers: {
            Accept: 'application/javascript,text/javascript,*/*',
            'Cache-Control': 'no-cache',
            Pragma: 'no-cache'
        }
    }));
    const liveCacheName = extractCacheName(text);

    if (!response.ok || liveCacheName !== expectedCacheName) {
        throw new Error(`Service worker cache version mismatch. Expected ${expectedCacheName}, got ${liveCacheName || 'none'}.`);
    }
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

async function runConversionLinkChecks() {
    for (const check of CONVERSION_LINK_CHECKS) {
        const { response, text } = await measure(check.name, () => fetchText(check.path, {
            headers: {
                Accept: 'text/html',
                'Cache-Control': 'no-cache',
                Pragma: 'no-cache'
            }
        }));

        if (!response.ok) {
            throw new Error(`Conversion link check failed to load ${check.path}.`);
        }

        const missing = check.snippets.filter((snippet) => !text.includes(snippet));
        if (missing.length > 0) {
            throw new Error(`${check.name} is missing expected snippet(s): ${missing.join(', ')}`);
        }
    }
}

async function runRedirectChecks() {
    const redirectRes = await measure('Legacy shaman wheel redirect', () => fetchChecked('/shamanske-kolo.html?source=smoke', {
        method: 'HEAD',
        redirect: 'manual'
    }));
    const location = redirectRes.headers.get('location') || '';
    if (redirectRes.status !== 301 || location !== '/shamansko-kolo.html?source=smoke') {
        throw new Error(`Legacy shaman wheel redirect mismatch: ${redirectRes.status} ${location}`);
    }
}

async function runAstroCalculationChecks() {
    const coordinatePath = '/api/natal-chart/calculate?birthDate=1990-01-01&birthTime=12:00&birthPlace=Praha%20-%20souradnice&latitude=50.0755&longitude=14.4378&timeZone=Europe%2FPrague&country=CZ&name=Smoke';
    const { response: coordinateRes, body: coordinateBody } = await measure('Natal coordinates', () => fetchJson(coordinatePath));
    const coordinateChart = coordinateBody.chart;
    if (
        !coordinateRes.ok ||
        coordinateBody.success !== true ||
        coordinateChart?.engine?.precision !== 'birth_time_location_timezone' ||
        coordinateChart?.location?.source !== 'coordinates' ||
        coordinateChart?.location?.timeZoneSource !== 'input' ||
        coordinateChart?.houses?.available !== true
    ) {
        throw new Error('Natal coordinate calculation did not preserve exact coordinate/time-zone precision.');
    }

    const aliasBoundaryPath = `/api/natal-chart/calculate?birthDate=1990-01-01&birthTime=12:00&birthPlace=Nepraha&name=Smoke&_=${Date.now()}`;
    const { response: aliasRes, body: aliasBody } = await measure('Natal alias boundary', () => fetchJson(aliasBoundaryPath, {
        headers: {
            'Cache-Control': 'no-cache',
            Pragma: 'no-cache'
        }
    }));
    const aliasChart = aliasBody.chart;
    if (
        !aliasRes.ok ||
        aliasBody.success !== true ||
        aliasChart?.location !== null ||
        aliasChart?.engine?.precision !== 'birth_time_utc' ||
        aliasChart?.houses?.available !== false
    ) {
        throw new Error('Natal location alias boundary check failed; unknown place resolved as a supported city.');
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
