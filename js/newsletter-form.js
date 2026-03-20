(function () {
    const form = document.getElementById('newsletter-form');
    if (form) {
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            const email = document.getElementById('email-subscribe').value;
            if (!email || !email.includes('@')) return;
            if (window.Auth) {
                window.Auth.openModal('register');
                setTimeout(() => {
                    const emailInput = document.querySelector('#login-form input[name="email"]');
                    if (emailInput) emailInput.value = email;
                }, 300);
            } else {
                window.location.href = 'prihlaseni.html?email=' + encodeURIComponent(email);
            }
        });
    }
})();
