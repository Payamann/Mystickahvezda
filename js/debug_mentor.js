console.log('--- DEBUGGING MENTOR STATE ---');
console.log('window.Auth exists:', !!window.Auth);
console.log('window.authClient exists:', !!window.authClient);
console.log('window.isPremium:', window.isPremium);

if (window.Auth) {
    console.log('Auth.isPremium():', window.Auth.isPremium());
    console.log('Auth.user:', window.Auth.user);
    window.Auth.getProfile().then(p => {
        console.log('Fetched Profile:', p);
        console.log('Subscription Tier (Profile):', p?.subscription_tier);
        console.log('Subscription Status (Profile):', p?.subscription_status);
    });
}

if (window.authClient) {
    console.log('authClient found (unexpected if not defined anywhere).');
} else {
    console.error('CRITICAL: window.authClient is NOT defined, but mentor.js uses it!');
}
