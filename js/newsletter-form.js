(function () {
    const form = document.getElementById('newsletter-form');
    if (form) {
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            const email = document.getElementById('email-subscribe').value;
            if (!email || !email.includes('@')) return;

            window.MH_ANALYTICS?.trackCTA?.('newsletter_form_submit', {
                destination: '/prihlaseni.html',
                auth_mode: 'register'
            });

            const authUrl = new URL('/prihlaseni.html', window.location.origin);
            authUrl.searchParams.set('mode', 'register');
            authUrl.searchParams.set('source', 'newsletter_form');
            authUrl.searchParams.set('redirect', '/profil.html');
            authUrl.searchParams.set('email', email);
            window.location.href = `${authUrl.pathname}${authUrl.search}`;
        });
    }
})();
