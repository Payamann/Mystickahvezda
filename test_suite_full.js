// Native fetch used in Node 24+
// In Node 24 (User's env), fetch is global.

const BASE_URL = 'http://localhost:3001';
const COLORS = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    reset: '\x1b[0m',
    bold: '\x1b[1m'
};

function log(status, msg) {
    if (status === 'PASS') console.log(`${COLORS.green}✅ [PASS] ${msg}${COLORS.reset}`);
    else if (status === 'FAIL') console.log(`${COLORS.red}❌ [FAIL] ${msg}${COLORS.reset}`);
    else if (status === 'INFO') console.log(`${COLORS.bold}ℹ️  [INFO] ${msg}${COLORS.reset}`);
    else console.log(msg);
}

async function runTestSuite() {
    console.log(`${COLORS.bold}🚀 STARTING AGENTIC E2E SYSTEM TEST 🚀${COLORS.reset}\n`);

    // 1. VISUAL/ASSET CHECKS
    log('INFO', 'Checking Static Assets & Styles...');
    try {
        const cssRes = await fetch(`${BASE_URL}/css/style.v2.css`);
        const cssText = await cssRes.text();

        // Verify Header Centering
        if (cssText.includes('.header__inner') && cssText.includes('justify-content: center')) {
            log('PASS', 'Header CSS is CENTERED (.header__inner { justify-content: center })');
        } else {
            log('FAIL', 'Header CSS is NOT centered!');
        }

        // Verify Rebranding
        const priceRes = await fetch(`${BASE_URL}/cenik.html`);
        const priceHtml = await priceRes.text();
        if (priceHtml.includes('Osobní Průvodce')) {
            log('PASS', 'Pricing Page contains "Osobní Průvodce" (Rebranded)');
        } else {
            log('FAIL', 'Pricing Page still says "AI Mentor" or is missing content');
        }

        if (priceHtml.includes('js/platby.js')) {
            log('PASS', 'Pricing Page includes Payment Script (js/platby.js)');
        } else {
            log('FAIL', 'Payment script missing in cenik.html');
        }

    } catch (e) {
        log('FAIL', `Asset Check Error: ${e.message}`);
    }
    console.log('');

    // 2. AUTHENTICATION & USER FLOW
    log('INFO', 'Testing User Authentication Flow...');
    let token = null;
    let userId = null;

    try {
        const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'pavel.hajek1989@gmail.com', password: '123456' })
        });
        const loginData = await loginRes.json();

        if (loginData.token) {
            token = loginData.token;
            userId = loginData.user.id;
            log('PASS', `Login Successful for ${loginData.user.email}`);
            log('INFO', `User Role: ${loginData.user.subscription_status}`);
        } else {
            throw new Error('Login failed: ' + JSON.stringify(loginData));
        }

    } catch (e) {
        log('FAIL', `Critical Auth Error: ${e.message}`);
        return; // Stop if auth fails
    }
    console.log('');

    // 3. API ENDPOINT & LIMIT CHECKS
    log('INFO', 'Testing API Endpoints & Limits...');

    // Horoscope (Public)
    try {
        const horoRes = await fetch(`${BASE_URL}/api/horoscope`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sign: 'Lev', period: 'daily' })
        });
        const horoData = await horoRes.json();
        if (horoData.success) log('PASS', 'Public Horoscope API is FUNCTIONAL');
        else log('FAIL', 'Horoscope API Failed');
    } catch (e) { log('FAIL', `Horoscope Error: ${e.message}`); }

    // Tarot (Protected/Premium)
    try {
        const tarotRes = await fetch(`${BASE_URL}/api/tarot`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                question: 'Deep Test',
                cards: ['Death', 'Sun', 'Moon'],
                spreadType: 'tříkartový'
            })
        });
        const tarotData = await tarotRes.json();

        if (tarotData.success) {
            const len = tarotData.response.length;
            log('PASS', `Premium Tarot Access GRANTED (Response: ${len} chars)`);
        } else {
            // If user is basic, this should be 403. If premium, it should work.
            // We configured user to be premium in previous steps.
            log('FAIL', `Tarot Access Denied: ${tarotData.error} (Code: ${tarotData.code})`);
        }

    } catch (e) { log('FAIL', `Tarot Error: ${e.message}`); }

    // 4. MENTOR CHAT (Soft Gate)
    log('INFO', 'Testing Mentor Chat...');
    try {
        const mentorRes = await fetch(`${BASE_URL}/api/mentor/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ message: "Ahoj, funguješ?" })
        });
        const mentorData = await mentorRes.json();
        if (mentorData.success) {
            log('PASS', `Mentor Chat Works (Reply: "${mentorData.reply.substring(0, 30)}...")`);
        } else {
            log('FAIL', `Mentor Chat Failed: ${mentorData.error}`);
        }
    } catch (e) { log('FAIL', `Mentor Error: ${e.message}`); }

    console.log(`\n${COLORS.bold}🏁 SYSTEM TEST COMPLETED 🏁${COLORS.reset}`);
}

runTestSuite();
