
// using native fetch (Node 18+)

// Check if running locally
const isLocal = process.argv.includes('--local');
const BASE_URL = isLocal ? 'http://localhost:3001' : 'https://mystickahvezdaoriginalantigravity-production.up.railway.app';
const EMAIL = process.env.VERIFY_EMAIL;
const PASSWORD = process.env.VERIFY_PASSWORD;

async function measure(name, fn) {
    const start = Date.now();
    try {
        const res = await fn();
        const duration = Date.now() - start;
        console.log(`[${name}] Took ${duration}ms - Status: ${res.status}`);
        return res;
    } catch (e) {
        const duration = Date.now() - start;
        console.error(`[${name}] Failed after ${duration}ms:`, e.message);
        throw e;
    }
}

async function run() {
    if (!EMAIL || !PASSWORD) {
        throw new Error('Set VERIFY_EMAIL and VERIFY_PASSWORD before running production verification.');
    }

    console.log(`🚀 Starting Production Verification on ${BASE_URL}`);

    // 1. Health Check
    await measure('Health Check', () => fetch(`${BASE_URL}/api/health`));

    // 2. Login
    let token;
    const loginRes = await measure('Login', () => fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: EMAIL, password: PASSWORD })
    }));

    if (loginRes.ok) {
        const data = await loginRes.json();
        token = data.token;
        console.log('✅ Login Successful');
    } else {
        console.error('❌ Login Failed');
        process.exit(1);
    }

    // 3. User Readings (DB Access)
    const readingsRes = await measure('Fetch Readings (DB)', () => fetch(`${BASE_URL}/api/user/readings?limit=5`, {
        headers: { 'Authorization': `Bearer ${token}` }
    }));

    if (readingsRes.ok) {
        const rData = await readingsRes.json();
        console.log(`📚 Found ${rData.readings?.length || 0} readings`);
    }

    // 4. Horoscope (AI + Cache)
    // We use a random sign to maybe trigger a cache miss/hit logic or just check general speed
    const sign = 'Lev';
    const horoRes = await measure('Horoscope Generation (AI/DB)', () => fetch(`${BASE_URL}/api/horoscope`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` // Optional but good to pass
        },
        body: JSON.stringify({ sign, period: 'daily' })
    }));

    if (horoRes.ok) {
        const hData = await horoRes.json();
        console.log('🔮 Horoscope Response:', hData.period);
    } else {
        console.error('❌ Horoscope Failed:', horoRes.status);
    }

    // 5. Crystal Ball (Simple AI Check)
    await measure('Crystal Ball (AI Check)', () => fetch(`${BASE_URL}/api/crystal-ball`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: 'Funguješ?' })
    }));

    console.log('✨ Verification Complete');
}

run().catch(console.error);
