const BASE_URL = 'http://localhost:3001';

const CREDENTIALS = {
    email: 'pavel.hajek1989@gmail.com',
    password: '123456'
};

async function testAuthFlow() {
    console.log('🔐 Starting Authenticated User Flow...');
    let token = '';
    let userId = '';

    // 1. LOGIN
    try {
        console.log('➡️ Logging in...');
        const response = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(CREDENTIALS)
        });
        const data = await response.json();

        if (data.token) {
            token = data.token;
            userId = data.user.id;
            console.log('✅ Login Successful. Token received.');
            console.log('ℹ️ User Status:', data.user.subscription_status);
        } else {
            throw new Error('Login failed: ' + JSON.stringify(data));
        }
    } catch (e) {
        console.error('❌ Login Error:', e.message);
        return; // Stop if login fails
    }

    // 2. CHECK PREMIUM STATUS (Profile)
    let isPremium = false;
    try {
        const response = await fetch(`${BASE_URL}/api/auth/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const profile = await response.json();
        console.log('👤 Profile Data:', {
            email: profile.user.email,
            is_premium: profile.user.is_premium
        });
        isPremium = profile.user.is_premium;
    } catch (e) {
        console.error('❌ Profile Check Error:', e.message);
    }

    // 3. TRY PREMIUM FEATURE (Tarot 3 Cards) - Pre-Upgrade
    /*
    if (!isPremium) {
        console.log('➡️ Testing Basic User Limits (Tarot 3 Cards)...');
        try {
            const response = await fetch(`${BASE_URL}/api/tarot`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ 
                    question: 'Limit Test', 
                    cards: ['Card1', 'Card2', 'Card3'], 
                    spreadType: 'tříkartový' 
                })
            });
            
            if (response.status === 403) {
                console.log('✅ Limit Enforced: 3-card reading blocked for Basic user.');
            } else if (response.ok) {
                console.error('❌ Limit FAIL: Basic user allowed to do 3-card reading!');
            } else {
                 console.log('ℹ️ Tarot response status:', response.status);
            }
        } catch (e) {
            console.error('❌ Tarot Limit Test Error:', e.message);
        }
    } else {
        console.log('ℹ️ User is already Premium, skipping Limit Test.');
    }
    */

    // 4. PERFORM UPGRADE (Simulate Payment)
    if (!isPremium) {
        console.log('➡️ Upgrading to Premium...');
        try {
            const response = await fetch(`${BASE_URL}/api/payment/process`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    items: [{ id: 'premium_sub', name: 'Hvězdný Průvodce' }],
                    total: 199
                })
            });
            const data = await response.json();
            if (data.success) {
                console.log('✅ Payment Successful. User Upgraded.');
            } else {
                console.error('❌ Payment Failed:', data);
            }
        } catch (e) {
            console.error('❌ Payment Error:', e.message);
        }
    }

    // 5. VERIFY PREMIUM FEATURE (Tarot 3 Cards) - Post-Upgrade
    console.log('➡️ Verifying Premium Access (Tarot 3 Cards)...');
    try {
        const response = await fetch(`${BASE_URL}/api/tarot`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                question: 'Premium Test',
                cards: ['Card1', 'Card2', 'Card3'],
                spreadType: 'tříkartový'
            })
        });

        const data = await response.json();
        if (data.success) {
            console.log('✅ Premium Access Confirmed: 3-card reading allowed.');
            console.log('🔮 Gemini Response Length:', data.response ? data.response.length : 0);
        } else {
            console.error('❌ Premium Access FAIL:', data);
        }

    } catch (e) {
        console.error('❌ Premium Verification Error:', e.message);
    }
}

testAuthFlow();
