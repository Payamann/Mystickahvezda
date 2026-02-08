// using native fetch
// We will use native fetch.

const BASE_URL = 'http://localhost:3001';
const AUTH_URL = `${BASE_URL}/api/auth`;

// Test Users
const PREMIUM_USER = { email: 'pavel.hajek1989@gmail.com', password: 'password123' }; // Pavel is likely premium?
// Wait, user provided credentials: pavel.hajek1989@gmail.com / 123456.
const USER_CREDENTIALS = { email: 'pavel.hajek1989@gmail.com', password: '123456' };

async function registerOrLogin(user) {
    // Try Login
    let res = await fetch(`${AUTH_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
    });
    let data = await res.json();

    if (res.ok && data.token) return data.token;

    console.log(`Login failed for ${user.email}, trying register...`);

    // Try Register
    res = await fetch(`${AUTH_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
    });
    data = await res.json();

    // Login again
    res = await fetch(`${AUTH_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
    });
    data = await res.json();
    return data.token;
}

async function testNumerology(token, label) {
    console.log(`\n🔢 Testing Numerology as ${label}...`);
    const input = {
        name: "Jan Novák",
        birthDate: "1990-01-01",
        lifePath: 1,
        destiny: 1,
        soul: 1,
        personality: 1
    };

    const res = await fetch(`${BASE_URL}/api/numerology`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(input)
    });

    const text = await res.text();
    console.log(`Status: ${res.status}`);
    try {
        const data = JSON.parse(text);
        if (res.status === 200) {
            console.log("✅ Success! Response:", data.response.substring(0, 50) + "...");
        } else {
            console.log("❌ Failed/Blocked (JSON):", data);
        }
    } catch (e) {
        console.log("❌ Failed/Blocked (Text):", text);
    }
    return res.status;
}

async function testAstrocartography() {
    console.log(`\n🌍 Testing Astrocartography (Public Endpoint)...`);
    const input = {
        name: "Cestovatel",
        birthDate: "1990-01-01",
        birthTime: "12:00",
        birthPlace: "Praha"
    };

    const res = await fetch(`${BASE_URL}/api/astrocartography`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
    });

    const text = await res.text();
    console.log(`Status: ${res.status}`);
    try {
        const data = JSON.parse(text);
        if (res.status === 200) {
            console.log("✅ Success! Response:", data.response.substring(0, 50) + "...");
        } else {
            console.log("❌ Failed (JSON):", data);
        }
    } catch (e) {
        console.log("❌ Failed (Text):", text);
    }
}

async function run() {
    try {
        const token = await registerOrLogin(USER_CREDENTIALS);
        if (!token) {
            console.error("Login failed (Token undefined). Check credentials or email verification.");
            return;
        }

        // Test Numerology (Should be Premium or Free depending on DB)
        await testNumerology(token, "Pavel");

        // Test Astrocartography
        await testAstrocartography();

    } catch (e) {
        console.error("Test Error:", e);
    }
}

run();
