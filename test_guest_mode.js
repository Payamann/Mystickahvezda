// Native fetch is used, no imports needed for this simple test script in Node 24

const BASE_URL = 'http://localhost:3001';

async function testGuestMode() {
    console.log('🧪 Starting Guest Mode Verification...');
    let results = {
        homepage: false,
        horoscope: false,
        tarotLimit: false,
        mentorGate: 'Manual check required'
    };

    // 1. Homepage Check
    try {
        const response = await fetch(BASE_URL);
        const html = await response.text();
        if (html.includes('Mystická') && response.ok) {
            console.log('✅ Homepage Loaded');
            results.homepage = true;
        } else {
            console.error('❌ Homepage Failed');
        }
    } catch (e) {
        console.error('❌ Homepage Error:', e.message);
    }

    // 2. Horoscope API
    try {
        const response = await fetch(`${BASE_URL}/api/horoscope`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sign: 'Beran', period: 'daily' })
        });
        const data = await response.json();
        if (data.success && data.response) {
            console.log('✅ Horoscope API Works (Result length:', data.response.length, ')');
            results.horoscope = true;
        } else {
            console.error('❌ Horoscope API Failed:', data);
        }
    } catch (e) {
        console.error('❌ Horoscope API Error:', e.message);
    }

    // 3. Tarot Limit Check (Guest trying 3 cards)
    try {
        // Without Authorization header
        const response = await fetch(`${BASE_URL}/api/tarot`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                question: 'Test',
                cards: ['Ace of Cups', 'Two of Cups', 'Three of Cups'],
                spreadType: 'tříkartový'
            })
        });

        // Should return 401 or 403 because endpoint requires auth middleware first?
        // Wait, app.post('/api/tarot', authenticateToken, ...)
        // So guest without token should get 401 Unauthorized immediately.

        if (response.status === 401) {
            console.log('✅ Tarot 3-card blocked for Guest (401 Unauthorized)');
            results.tarotLimit = true;
        } else {
            console.error('❌ Tarot 3-card NOT blocked correctly (Status:', response.status, ')');
        }

    } catch (e) {
        console.error('❌ Tarot Limit Error:', e.message);
    }

    console.log('\n📊 TEST RESULTS:', results);
}

testGuestMode();
