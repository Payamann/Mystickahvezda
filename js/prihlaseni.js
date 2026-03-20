
        document.addEventListener('DOMContentLoaded', () => {

            // Auth-client.js automatically binds to #login-form and handles submission.

            // It also handles #auth-mode-toggle.

            // We just need to check if we are already logged in, and if so, redirect back.



            const loginForm = document.getElementById('login-form');

            const forgotPasswordForm = document.getElementById('forgot-password-form');

            const resetPasswordForm = document.getElementById('reset-password-form');

            const forgotPasswordLink = document.getElementById('forgot-password-link');

            const backToLoginBtn = document.getElementById('back-to-login');

            const loginHeader = document.querySelector('.login-header h1');

            const loginSubtitle = document.querySelector('.login-header p');



            // Check for reset token in URL

            const urlParams = new URLSearchParams(window.location.search);

            const isResetMode = urlParams.get('reset') === 'true';

            const hash = window.location.hash;



            if (isResetMode && hash) {

                // Show reset password form

                loginForm.style.display = 'none';

                forgotPasswordForm.style.display = 'none';

                resetPasswordForm.style.display = 'block';

                forgotPasswordLink.style.display = 'none';

                document.getElementById('auth-mode-toggle').parentElement.style.display = 'none';

                loginHeader.textContent = 'Obnovení hesla';

                loginSubtitle.textContent = 'Zadejte nové heslo';

            }



            // Forgot password link click

            forgotPasswordLink?.addEventListener('click', () => {

                loginForm.style.display = 'none';

                forgotPasswordForm.style.display = 'block';

                forgotPasswordLink.style.display = 'none';

                document.getElementById('auth-mode-toggle').parentElement.style.display = 'none';

                loginHeader.textContent = 'Zapomenuté heslo';

                loginSubtitle.textContent = 'Zadejte svůj email';

            });



            // Back to login

            backToLoginBtn?.addEventListener('click', () => {

                loginForm.style.display = 'block';

                forgotPasswordForm.style.display = 'none';

                forgotPasswordLink.style.display = 'block';

                document.getElementById('auth-mode-toggle').parentElement.style.display = 'block';

                loginHeader.textContent = 'Vítejte zpět';

                loginSubtitle.textContent = 'Přihlaste se ke svému účtu';

            });



            // Forgot password form submission

            forgotPasswordForm?.addEventListener('submit', async (e) => {

                e.preventDefault();

                const email = document.getElementById('forgot-email').value;

                const submitBtn = forgotPasswordForm.querySelector('button[type="submit"]');

                const originalText = submitBtn.textContent;



                submitBtn.textContent = 'Odesílám...';

                submitBtn.disabled = true;



                try {

                    const csrfToken = window.getCSRFToken ? await window.getCSRFToken() : null;

                    const response = await fetch('/api/auth/forgot-password', {

                        method: 'POST',

                        headers: {
                            'Content-Type': 'application/json',
                            ...(csrfToken && { 'X-CSRF-Token': csrfToken })
                        },

                        body: JSON.stringify({ email })

                    });



                    const data = await response.json();



                    if (data.success) {

                        if (window.Auth?.showToast) {

                            window.Auth.showToast('Email odeslán', data.message, 'success');

                        } else {

                            alert(data.message);

                        }

                        // Go back to login

                        backToLoginBtn.click();

                    } else {

                        throw new Error(data.error || 'Chyba při odesílání emailu');

                    }

                } catch (error) {

                    if (window.Auth?.showToast) {

                        window.Auth.showToast('Chyba', error.message, 'error');

                    } else {

                        alert(error.message);

                    }

                } finally {

                    submitBtn.textContent = originalText;

                    submitBtn.disabled = false;

                }

            });



            // Reset password form submission

            resetPasswordForm?.addEventListener('submit', async (e) => {

                e.preventDefault();

                const newPassword = document.getElementById('new-password').value;

                const confirmPassword = document.getElementById('confirm-password').value;



                if (newPassword !== confirmPassword) {
                    if (window.Auth?.showToast) {
                        window.Auth.showToast('Chyba', 'Hesla se neshodují', 'error');
                    } else {
                        alert('Hesla se neshodují');
                    }
                    return;
                }



                const submitBtn = resetPasswordForm.querySelector('button[type="submit"]');

                const originalText = submitBtn.textContent;

                submitBtn.textContent = 'Ukládám...';

                submitBtn.disabled = true;



                try {

                    // Extract access_token from URL hash

                    const hashParams = new URLSearchParams(hash.substring(1));

                    const accessToken = hashParams.get('access_token');



                    if (!accessToken) {

                        throw new Error('Neplatný odkaz pro obnovení hesla');

                    }



                    const csrfToken2 = window.getCSRFToken ? await window.getCSRFToken() : null;

                    const response = await fetch('/api/auth/reset-password', {

                        method: 'POST',

                        headers: {

                            'Content-Type': 'application/json',

                            'Authorization': `Bearer ${accessToken}`,

                            ...(csrfToken2 && { 'X-CSRF-Token': csrfToken2 })

                        },

                        body: JSON.stringify({ password: newPassword })

                    });



                    const data = await response.json();



                    if (data.success) {

                        if (window.Auth?.showToast) {

                            window.Auth.showToast('Úspěch', 'Heslo bylo změněno. Můžete se přihlásit.', 'success');

                        } else {

                            alert('Heslo bylo změněno. Můžete se přihlásit.');

                        }

                        // Redirect to login

                        window.location.href = '/prihlaseni.html';

                    } else {

                        throw new Error(data.error || 'Chyba při změně hesla');

                    }

                } catch (error) {

                    if (window.Auth?.showToast) {

                        window.Auth.showToast('Chyba', error.message, 'error');

                    } else {

                        alert(error.message);

                    }

                } finally {

                    submitBtn.textContent = originalText;

                    submitBtn.disabled = false;

                }

            });



            setTimeout(() => {

                if (window.Auth && window.Auth.isLoggedIn()) {

                    const urlParams = new URLSearchParams(window.location.search);

                    const redirect = urlParams.get('redirect');

                    // Only allow relative redirects to prevent open redirect attacks
                    if (redirect && redirect.startsWith('/') && !redirect.startsWith('//')) {

                        window.location.href = redirect;

                    } else {

                        window.location.href = '/profil.html';

                    }

                }

            }, 500); // Small delay to let Auth init

        });



        // Handle "auth:changed" event from auth-client.js

        document.addEventListener('auth:changed', () => {

            if (window.Auth && window.Auth.isLoggedIn()) {

                const urlParams = new URLSearchParams(window.location.search);

                let redirect = urlParams.get('redirect') || '/profil.html';

                // Only allow relative redirects to prevent open redirect attacks
                if (!redirect.startsWith('/') || redirect.startsWith('//')) {
                    redirect = '/profil.html';
                }

                // prevent infinite loop if redirect points to self

                if (!redirect.includes('prihlaseni')) {

                    window.location.href = redirect;

                }

            }

        });

        // CRO: Update heading when toggling between login and register
        document.addEventListener('DOMContentLoaded', () => {
            const toggleBtn = document.getElementById('auth-mode-toggle');
            const titleEl = document.getElementById('login-page-title');
            const subtitleEl = document.getElementById('login-page-subtitle');
            const socialProofEl = document.getElementById('login-social-proof');
            let isRegisterMode = false;

            toggleBtn?.addEventListener('click', () => {
                isRegisterMode = !isRegisterMode;
                const confirmPwWrapper = document.getElementById('confirm-password-field-wrapper');
                if (isRegisterMode) {
                    if (titleEl) titleEl.textContent = 'Začněte svou cestu';
                    if (subtitleEl) subtitleEl.textContent = 'Registrace je zdarma • přístup okamžitě';
                    if (socialProofEl) socialProofEl.style.display = 'block';
                    if (confirmPwWrapper) confirmPwWrapper.style.display = 'block';
                    toggleBtn.textContent = 'Máte účet? Přihlaste se';
                } else {
                    if (titleEl) titleEl.textContent = 'Vítejte zpět';
                    if (subtitleEl) subtitleEl.textContent = 'Přihlaste se ke svému účtu';
                    if (socialProofEl) socialProofEl.style.display = 'none';
                    if (confirmPwWrapper) confirmPwWrapper.style.display = 'none';
                    toggleBtn.textContent = 'Nemáte účet? Zaregistrujte se zdarma →';
                }
            });

            // If URL has ?mode=register, auto-switch to register
            if (new URLSearchParams(window.location.search).get('mode') === 'register') {
                setTimeout(() => toggleBtn?.click(), 100);
            }
        });
