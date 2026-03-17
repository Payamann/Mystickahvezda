(() => {
    const API_URL = window.API_CONFIG?.BASE_URL || 'http://localhost:3001/api';


    const Auth = {
        // Token is stored in HttpOnly cookie (secure, XSS-proof)
        // JS cannot read it - that's the point. We track login state via user data.
        user: JSON.parse(localStorage.getItem('auth_user')),

        init() {
            this.injectModal();
            this.updateUI();
            this.setupListeners();
            this.handleRedirect();
            this.refreshSession(); // Auto-sync profile on load
            // Auto-refresh token every hour
            setInterval(() => this.refreshSession(), 3600000);
        },

        async refreshSession() {
            if (!this.isLoggedIn()) return;
            try {
                // Session refresh now relies on HttpOnly cookies

                const oldStatus = this.user?.subscription_status;
                const user = await this.getProfile();

                if (user) {
                    this.user = user;
                    localStorage.setItem('auth_user', JSON.stringify(user));
                    this.updateUI();

                    // Only emit if status changed to avoid infinite reload loops
                    if (oldStatus !== user.subscription_status) {
                        document.dispatchEvent(new Event('auth:refreshed'));
                    }
                }
            } catch (e) {
                console.warn('Session refresh failed:', e);
                // If profile fetch fails, user might be logged out (token expired)
                if (e.message === 'Session expired') {
                    this.logout();
                }
            }
        },

        async _refreshToken() {
            try {
                const csrfToken = window.getCSRFToken ? await window.getCSRFToken() : null;
                const res = await fetch(`${API_URL}/auth/refresh-token`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(csrfToken && { 'X-CSRF-Token': csrfToken })
                    }
                });
                if (res.ok) {
                    const data = await res.json();
                    this.user = data.user;
                    localStorage.setItem('auth_user', JSON.stringify(data.user));
                } else if (res.status === 401 || res.status === 403) {
                    // Token invalid/expired, force logout
                    this.logout();
                }
            } catch (e) {
                // Network error, retry on next interval
                console.warn('Token refresh failed:', e);
            }
        },

        handleRedirect() {
            const hash = window.location.hash;
            // ... (rest of handleRedirect logic)

            // Handle Success
            if (hash && hash.includes('access_token')) {
                history.replaceState(null, null, ' ');
                setTimeout(() => {
                    this.showToast('Ověřeno! ✅', 'Váš email byl úspěšně ověřen. Nyní se můžete přihlásit.', 'success');
                    this.openModal('login');
                }, 500);
            }

            // Handle Errors (e.g. expired link)
            if (hash && hash.includes('error=')) {
                console.warn('Auth Error in URL:', hash);

                // Extract error description if possible
                let msg = 'Odkaz je neplatný nebo vypršel.';
                if (hash.includes('otp_expired')) {
                    msg = 'Odkaz pro ověření vypršel. Prosím, zkuste to znovu.';
                }

                history.replaceState(null, null, ' '); // Clear URL
                setTimeout(() => {
                    this.showToast('Chyba ověření ❌', msg, 'error');
                }, 500);
            }
        },

        injectModal() {
            if (document.getElementById('auth-modal')) return;

            const modalHtml = window.Templates ? window.Templates.renderAuthModal() : '';
            if (modalHtml) {
                document.body.insertAdjacentHTML('beforeend', modalHtml);
            } else {
                console.error('Templates library not loaded!');
            }
        },

        isLoggedIn() {
            // Check indicator cookie (set by server) or cached user profile
            return document.cookie.includes('logged_in=1') || !!this.user;
        },

        isPremium() {
            if (!this.user || !this.user.subscription_status) return false;
            const s = this.user.subscription_status.toLowerCase();
            if (!s.includes('premium') && !s.includes('exclusive') && s !== 'vip') return false;
            // Check expiration if available
            if (this.user.subscription_expires_at) {
                const expires = new Date(this.user.subscription_expires_at);
                if (expires < new Date()) return false;
            }
            return true;
        },

        async register(email, password, additionalData = {}) {
            try {
                const csrfToken = window.getCSRFToken ? await window.getCSRFToken() : null;
                const res = await fetch(`${API_URL}/auth/register`, {
                    method: 'POST',
                    credentials: 'include', // Send cookies (auth_token will be set by server)
                    headers: {
                        'Content-Type': 'application/json',
                        ...(csrfToken && { 'X-CSRF-Token': csrfToken })
                    },
                    body: JSON.stringify({ email, password, ...additionalData })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);

                if (data.requireEmailVerification) {
                    this.showToast('Ověření emailu', 'Pro dokončení registrace potvrďte prosím svůj email. 📧', 'success');
                    this.closeModal(); // Close modal but don't login yet
                    return { success: true, verificationRequired: true };
                }

                this.loginSuccess(data);
                this.showToast('Vítejte!', 'Registrace proběhla úspěšně. 🌟', 'success');
                // Redirect new users to onboarding
                if (!localStorage.getItem('mh_onboarded')) {
                    setTimeout(() => { window.location.href = 'onboarding.html'; }, 800);
                }
                return { success: true };
            } catch (e) {
                return { success: false, error: e.message };
            }
        },

        showToast(title, message, type = 'info') {
            let container = document.querySelector('.toast-container');
            if (!container) {
                container = document.createElement('div');
                container.className = 'toast-container';
                document.body.appendChild(container);
            }

            const toast = document.createElement('div');
            toast.className = `toast toast--${type}`;

            let icon = 'ℹ️';
            if (type === 'success') icon = '✅';
            if (type === 'error') icon = '❌';

            // Build toast safely using textContent to prevent XSS
            const iconDiv = document.createElement('div');
            iconDiv.className = 'toast__icon';
            iconDiv.textContent = icon;
            const textDiv = document.createElement('div');
            const titleDiv = document.createElement('div');
            titleDiv.className = 'toast__title';
            titleDiv.textContent = title;
            const msgDiv = document.createElement('div');
            msgDiv.className = 'toast__message';
            msgDiv.textContent = message;
            textDiv.appendChild(titleDiv);
            textDiv.appendChild(msgDiv);
            toast.appendChild(iconDiv);
            toast.appendChild(textDiv);

            container.appendChild(toast);

            // Auto remove
            setTimeout(() => {
                toast.style.animation = 'fadeOutRight 0.3s ease-in forwards';
                setTimeout(() => toast.remove(), 300);
            }, 5000);
        },

        async login(email, password) {
            try {
                const csrfToken = window.getCSRFToken ? await window.getCSRFToken() : null;
                const res = await fetch(`${API_URL}/auth/login`, {
                    method: 'POST',
                    credentials: 'include', // Send cookies (auth_token will be set by server)
                    headers: {
                        'Content-Type': 'application/json',
                        ...(csrfToken && { 'X-CSRF-Token': csrfToken })
                    },
                    body: JSON.stringify({ email, password })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);

                this.loginSuccess(data);
                return { success: true };
            } catch (e) {
                return { success: false, error: e.message };
            }
        },

        loginSuccess(data) {
            // Token is now in HttpOnly cookie (set by server)
            // We only store user data in localStorage
            this.user = data.user;
            localStorage.setItem('auth_user', JSON.stringify(data.user));
            this.updateUI();
            this.closeModal();
        },

        logout() {
            // Call server logout endpoint to clear HttpOnly cookie
            fetch(`${API_URL}/auth/logout`, {
                method: 'POST',
                credentials: 'include'
            }).catch(e => console.warn('Logout API call failed:', e));

            // Clear local state
            this.user = null;
            localStorage.removeItem('auth_user');
            this.updateUI();
            window.location.reload();
        },

        // Premium activation removed - redirects to pricing page
        async activatePremium() {
            window.location.href = 'cenik.html';
        },

        updateUI() {
            // Desktop auth buttons
            const authBtn = document.getElementById('auth-btn');
            const regBtn = document.getElementById('auth-register-btn');
            const profileLink = document.getElementById('profile-link');

            // Mobile auth buttons (inside hamburger menu)
            const mobileAuthBtn = document.getElementById('mobile-auth-btn');
            const mobileRegBtn = document.getElementById('mobile-auth-register-btn');
            const mobileProfileLink = document.getElementById('mobile-profile-link');

            if (!authBtn && !mobileAuthBtn) return;

            if (this.isLoggedIn()) {
                // Desktop
                if (authBtn) {
                    authBtn.textContent = 'Odhlásit';
                    authBtn.onclick = (e) => { e.preventDefault(); this.logout(); };
                    if (this.isPremium()) {
                        authBtn.innerHTML = `Odhlásit <span style="font-size:0.8em; color:gold;">(Premium)</span>`;
                    }
                }
                if (regBtn) regBtn.style.display = 'none';
                if (profileLink) profileLink.style.display = 'inline-flex';

                // Mobile
                if (mobileAuthBtn) {
                    mobileAuthBtn.textContent = 'Odhlásit se';
                    mobileAuthBtn.onclick = (e) => { e.preventDefault(); this.logout(); };
                }
                if (mobileRegBtn) mobileRegBtn.style.display = 'none';
                if (mobileProfileLink) mobileProfileLink.style.display = 'inline-flex';
            } else {
                // Desktop
                if (authBtn) {
                    authBtn.textContent = 'Přihlásit';
                    authBtn.onclick = (e) => { e.preventDefault(); this.openModal(); };
                }
                if (regBtn) regBtn.style.display = 'inline-flex';
                if (profileLink) profileLink.style.display = 'none';

                // Mobile
                if (mobileAuthBtn) {
                    mobileAuthBtn.textContent = 'Přihlásit se';
                    mobileAuthBtn.onclick = (e) => { e.preventDefault(); this.openModal('login'); };
                }
                if (mobileRegBtn) mobileRegBtn.style.display = 'inline-flex';
                if (mobileProfileLink) mobileProfileLink.style.display = 'none';
            }

            // Hero CTA Logic
            const heroCta = document.getElementById('hero-cta-container');
            const heroCtaLoggedIn = document.getElementById('hero-cta-logged-in');
            if (heroCta) {
                heroCta.style.display = this.isLoggedIn() ? 'none' : 'block';
            }
            if (heroCtaLoggedIn) {
                heroCtaLoggedIn.style.display = this.isLoggedIn() ? 'flex' : 'none';
            }

            // Notify other components (like profile.js) that auth state changed
            document.dispatchEvent(new Event('auth:changed'));
        },

        // Modal Logic
        setupListeners() {
            // Global Delegation for dynamic elements (Header + Mobile buttons)
            document.body.addEventListener('click', (e) => {
                // Register Button (Header or Mobile)
                const registerBtn = e.target.closest('#auth-register-btn, #mobile-auth-register-btn');
                if (registerBtn) {
                    e.preventDefault();
                    this.openModal('register');
                    return;
                }

                // Hero CTA Button (Index)
                const heroBtn = e.target.closest('#hero-cta-btn');
                if (heroBtn) {
                    e.preventDefault();
                    this.openModal('register');
                    return;
                }

                // Login/Logout Button (Header or Mobile)
                const authBtn = e.target.closest('#auth-btn, #mobile-auth-btn');
                if (authBtn) {
                    e.preventDefault();
                    if (this.isLoggedIn()) {
                        this.logout();
                    } else {
                        this.openModal('login');
                    }
                    return;
                }

                // Modal Close Button
                const closeBtn = e.target.closest('.modal__close');
                if (closeBtn) {
                    this.closeModal();
                    return;
                }
            });

            // Close modal on outside click
            const modal = document.getElementById('auth-modal');
            if (modal) {
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) this.closeModal();
                });
            }

            // Forms (Static inside modal, safe to bind directly if modal exists)
            // But better to delegate too in case injectModal hasn't run yet? 
            // injectModal runs in init(), so it should be there.
            // Let's keep form listener simple or delegate it too.
            // Actually, let's look at the existing form listener...
            // It relies on getElementById('login-form').

            // Let's bind the form listener to document as well for safety
            document.body.addEventListener('submit', async (e) => {
                if (e.target.id === 'login-form') {
                    e.preventDefault();
                    const form = e.target;
                    const btn = document.getElementById('auth-submit');

                    // Password reset mode
                    if (btn && btn.dataset.mode === 'reset') {
                        const resetEmail = form.reset_email?.value || form.email.value;
                        if (resetEmail) await this.resetPassword(resetEmail);
                        return;
                    }

                    const email = form.email.value;
                    const password = form.password.value;
                    const isRegister = btn && btn.textContent === 'Zaregistrovat';

                    if (isRegister) {
                        const confirmPassword = form.confirm_password?.value;
                        const birthDate = form.birth_date?.value;

                        if (!birthDate) {
                            this.showToast('Chyba', 'Datum narození je povinné.', 'error');
                            return;
                        }

                        if (password !== confirmPassword) {
                            this.showToast('Chyba', 'Hesla se neshodují.', 'error');
                            return;
                        }
                        const res = await this.register(email, password, {
                            first_name: form.first_name?.value || undefined,
                            birth_date: birthDate,
                            birth_place: form.birth_place?.value || undefined,
                            password_confirm: confirmPassword
                        });
                        if (!res.success) this.showToast('Chyba registrace', res.error, 'error');
                    } else {
                        const res = await this.login(email, password);
                        if (!res.success) this.showToast('Chyba přihlášení', res.error, 'error');
                        else this.showToast('Vítejte zpět', 'Byli jste úspěšně přihlášeni.', 'success');
                    }
                }
            });



            // Toggle Button inside Modal
            document.body.addEventListener('click', (e) => {
                if (e.target.id === 'auth-mode-toggle') {
                    e.preventDefault();
                    this.toggleMode();
                }
                // Forgot Password Link
                if (e.target.id === 'auth-forgot-password') {
                    e.preventDefault();
                    this.openForgotPassword();
                }
            });
        },

        openForgotPassword() {
            const title = document.getElementById('auth-title');
            const btn = document.getElementById('auth-submit');
            const toggleBtn = document.getElementById('auth-mode-toggle');
            const pwField = document.getElementById('password-field-wrapper');
            const forgotLink = document.getElementById('forgot-password-link');
            const resetFields = document.getElementById('reset-password-fields');
            const registerFields = document.getElementById('register-fields');

            if (title) title.textContent = 'Obnovení hesla';
            if (btn) { btn.textContent = 'Odeslat odkaz'; btn.dataset.mode = 'reset'; }
            if (toggleBtn) toggleBtn.textContent = 'Zpět na přihlášení';
            if (pwField) pwField.style.display = 'none';
            if (forgotLink) forgotLink.style.display = 'none';
            if (resetFields) resetFields.style.display = 'block';
            if (registerFields) registerFields.style.display = 'none';
        },

        async resetPassword(email) {
            try {
                const res = await fetch(`${API_URL}/auth/forgot-password`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                });
                if (res.ok) {
                    this.showToast('Email odeslán', 'Zkontrolujte svou schránku pro odkaz na obnovení hesla.', 'success');
                    this.closeModal();
                } else {
                    this.showToast('Chyba', 'Nepodařilo se odeslat email. Zkuste to prosím znovu.', 'error');
                }
            } catch (e) {
                this.showToast('Chyba připojení', 'Zkontrolujte připojení k internetu.', 'error');
            }
        },


        toggleMode() {
            const title = document.getElementById('auth-title');
            const btn = document.getElementById('auth-submit');
            const toggleBtn = document.getElementById('auth-mode-toggle');

            if (!title || !btn || !toggleBtn) return;

            // If in reset mode, go back to login
            if (btn.dataset.mode === 'reset') {
                delete btn.dataset.mode;
                const pwField = document.getElementById('password-field-wrapper');
                const forgotLink = document.getElementById('forgot-password-link');
                const resetFields = document.getElementById('reset-password-fields');
                const registerFields = document.getElementById('register-fields');
                const confirmPwField = document.getElementById('confirm-password-field-wrapper');
                title.textContent = 'Přihlášení';
                btn.textContent = 'Přihlásit se';
                toggleBtn.textContent = 'Nemáte účet? Zaregistrujte se';
                if (pwField) pwField.style.display = 'block';
                if (forgotLink) forgotLink.style.display = 'block';
                if (resetFields) resetFields.style.display = 'none';
                if (registerFields) registerFields.style.display = 'none';
                if (confirmPwField) confirmPwField.style.display = 'none';
                return;
            }

            const isLogin = btn.textContent === 'Přihlásit se';

            const fields = document.getElementById('register-fields');
            const confirmPwField = document.getElementById('confirm-password-field-wrapper');

            if (isLogin) {
                title.textContent = 'Registrace';
                btn.textContent = 'Zaregistrovat';
                toggleBtn.textContent = 'Již máte účet? Přihlaste se';
                if (fields) fields.style.display = 'block';
                if (confirmPwField) confirmPwField.style.display = 'block';
            } else {
                title.textContent = 'Přihlášení';
                btn.textContent = 'Přihlásit se';
                toggleBtn.textContent = 'Nemáte účet? Zaregistrujte se';
                if (fields) fields.style.display = 'none';
                if (confirmPwField) confirmPwField.style.display = 'none';
            }
        },


        openModal(mode = 'login') {
            // Auto-inject if missing
            if (!document.getElementById('auth-modal')) this.injectModal();

            const modal = document.getElementById('auth-modal');
            if (modal) {
                modal.style.display = 'flex';

                // Set correct mode
                const title = document.getElementById('auth-title');
                const btn = document.getElementById('auth-submit');
                const toggleBtn = document.getElementById('auth-mode-toggle');

                if (!title || !btn || !toggleBtn) return;

                const fields = document.getElementById('register-fields');
                const confirmPwField = document.getElementById('confirm-password-field-wrapper');

                if (mode === 'register') {
                    title.textContent = 'Registrace';
                    btn.textContent = 'Zaregistrovat';
                    toggleBtn.textContent = 'Již máte účet? Přihlaste se';
                    if (fields) fields.style.display = 'block';
                    if (confirmPwField) confirmPwField.style.display = 'block';
                } else {
                    title.textContent = 'Přihlášení';
                    btn.textContent = 'Přihlásit se';
                    toggleBtn.textContent = 'Nemáte účet? Zaregistrujte se';
                    if (fields) fields.style.display = 'none';
                    if (confirmPwField) confirmPwField.style.display = 'none';
                }
            }
        },

        closeModal() {
            const modal = document.getElementById('auth-modal');
            if (modal) modal.style.display = 'none';
        },

        // API Wrapper for protected calls
        async fetchProtected(endpoint, body) {
            if (!this.isLoggedIn()) {
                this.openModal();
                throw new Error('Auth Required');
            }

            const res = await fetch(`${API_URL}/${endpoint}`, {
                method: 'POST',
                credentials: 'include', // Send auth_token cookie
                headers: {
                    'Content-Type': 'application/json'
                    // No longer need Authorization header - token is in cookie
                },
                body: JSON.stringify(body)
            });

            if (res.status === 401) {
                this.logout();
                throw new Error('Session expired');
            }
            if (res.status === 402 || res.status === 403) {
                this.showToast('Premium vyžadováno', 'Tato funkce vyžaduje Premium účet.', 'info');
                throw new Error('Premium Required');
            }

            return res;
        },


        async saveReading(type, data) {
            if (!this.isLoggedIn()) return null;

            try {
                // console.log(`💾 Saving reading (${type})...`);
                const res = await fetch(`${API_URL}/user/readings`, {
                    method: 'POST',
                    credentials: 'include', // Send auth_token cookie
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ type, data })
                });

                if (!res.ok) {
                    const err = await res.json();
                    console.warn('Failed to save reading:', err);
                    return null;
                } else {
                    const savedData = await res.json();
                    // console.log('✅ Reading saved successfully', savedData);
                    return savedData; // Return saved reading with ID
                }
            } catch (e) {
                console.error('Error saving reading:', e);
                return null;
            }
        },

        async getProfile() {
            if (!this.isLoggedIn()) return null;
            try {
                const res = await fetch(`${API_URL}/auth/profile`, {
                    credentials: 'include', // Send auth_token cookie
                    headers: { 'Content-Type': 'application/json' }
                });
                const data = await res.json();
                if (data.success) return data.user;
                return null;
            } catch (e) {
                console.error('getProfile failed', e);
                return null;
            }
        }
    };

    // Expose to window
    window.Auth = Auth;

    // Initialize when DOM is ready
    document.addEventListener('DOMContentLoaded', () => {
        Auth.init();
    });

    // When components load, just update the UI state (buttons text)
    document.addEventListener('components:loaded', () => {
        Auth.updateUI();
    });

    // Cross-tab logout: Sync logout across browser tabs/windows
    // When auth_user is removed from localStorage in another tab, log out here too
    window.addEventListener('storage', (event) => {
        if (event.key === 'auth_user') {
            // Check if the key was removed (logout in another tab)
            if (event.newValue === null && Auth.isLoggedIn()) {
                console.log('🔄 Logout detected in another tab, logging out here...');
                Auth.user = null;
                Auth.updateUI();
                // Optionally show a message
                Auth.showToast('Sesselýjícího z jiného místa', 'Byli jste odhlášeni z jiného okna prohlížeče.', 'info');
                // Don't reload - just update UI so user can login again if needed
            }
        }

        // Handle onboarding completion in another tab
        if (event.key === 'mh_onboarded' && event.newValue === '1') {
            console.log('✅ Onboarding completed in another tab');
            // Could redirect if needed
        }
    });

})();
