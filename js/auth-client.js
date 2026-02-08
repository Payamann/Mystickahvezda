(() => {
    const API_URL = window.API_CONFIG?.BASE_URL || 'http://localhost:3001/api';

    const Auth = {
        token: localStorage.getItem('auth_token'),
        user: JSON.parse(localStorage.getItem('auth_user')),

        init() {
            this.injectModal();
            this.updateUI();
            this.setupListeners();
            this.handleRedirect();
            this.refreshSession(); // Auto-sync profile on load
        },

        async refreshSession() {
            if (!this.isLoggedIn()) return;
            try {
                const oldStatus = this.user?.subscription_status;
                const user = await this.getProfile();

                if (user) {
                    this.user = user;
                    localStorage.setItem('auth_user', JSON.stringify(user));
                    this.updateUI();

                    // Only emit if status changed to avoid infinite reload loops
                    if (oldStatus !== user.subscription_status) {
                        console.log(`🔄 Status changed (${oldStatus} -> ${user.subscription_status}), triggering refresh...`);
                        document.dispatchEvent(new Event('auth:refreshed'));
                    }
                }
            } catch (e) {
                console.warn('Session refresh failed:', e);
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
            return !!this.token;
        },

        isPremium() {
            if (!this.user || !this.user.subscription_status) return false;
            const s = this.user.subscription_status.toLowerCase();
            return s.includes('premium') || s === 'vip';
        },

        async register(email, password, additionalData = {}) {
            try {
                const res = await fetch(`${API_URL}/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
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
                const res = await fetch(`${API_URL}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
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
            this.token = data.token;
            this.user = data.user;
            localStorage.setItem('auth_token', data.token);
            localStorage.setItem('auth_user', JSON.stringify(data.user));
            this.updateUI();
            this.closeModal();
        },

        logout() {
            this.token = null;
            this.user = null;
            localStorage.removeItem('auth_token');
            localStorage.removeItem('auth_user');
            this.updateUI();
            window.location.reload();
        },

        // Premium activation removed - redirects to pricing page
        async activatePremium() {
            window.location.href = 'cenik.html';
        },

        updateUI() {
            // Debug Phase: Check if elements exist
            const authBtn = document.getElementById('auth-btn');
            const regBtn = document.getElementById('auth-register-btn');
            const profileLink = document.getElementById('profile-link');

            console.log('Auth.updateUI running. LoggedIn:', this.isLoggedIn());
            console.log('Elements found:', {
                authBtn: !!authBtn,
                regBtn: !!regBtn,
                profileLink: !!profileLink
            });

            if (!authBtn) return;

            if (this.isLoggedIn()) {
                authBtn.textContent = 'Odhlásit';
                authBtn.onclick = (e) => { e.preventDefault(); this.logout(); };

                // Hide register button when logged in
                if (regBtn) {
                    regBtn.style.display = 'none';
                    console.log('Hiding register button');
                } else {
                    console.warn('Register button not found during updateUI (LoggedIn)');
                }

                if (profileLink) profileLink.style.display = 'inline-flex';

                // Add premium badge if needed
                if (this.isPremium()) {
                    authBtn.innerHTML = `Odhlásit <span style="font-size:0.8em; color:gold;">(Premium)</span>`;
                }
            } else {
                authBtn.textContent = 'Přihlásit';
                authBtn.onclick = (e) => { e.preventDefault(); this.openModal(); };

                // Show register button when logged out
                if (regBtn) {
                    regBtn.style.display = 'inline-flex';
                    console.log('Showing register button');
                }
                if (profileLink) profileLink.style.display = 'none';
            }

            // Notify other components (like profile.js) that auth state changed
            document.dispatchEvent(new Event('auth:changed'));
        },

        // Modal Logic
        setupListeners() {
            // Global Delegation for dynamic elements (Header buttons)
            document.body.addEventListener('click', (e) => {
                // Register Button (Header)
                const registerBtn = e.target.closest('#auth-register-btn');
                if (registerBtn) {
                    e.preventDefault();
                    this.openModal('register');
                    return;
                }

                // Login/Logout Button (Header)
                const authBtn = e.target.closest('#auth-btn');
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
                    const email = form.email.value;
                    const password = form.password.value;
                    const btn = document.getElementById('auth-submit');
                    const isRegister = btn && btn.textContent === 'Zaregistrovat';

                    if (isRegister) {
                        const additionalData = {
                            first_name: form.first_name?.value,
                            birth_date: form.birth_date?.value,
                            birth_time: form.birth_time?.value,
                            birth_place: form.birth_place?.value
                        };
                        const res = await this.register(email, password, additionalData);
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
            });
        },

        toggleMode() {
            const title = document.getElementById('auth-title');
            const btn = document.getElementById('auth-submit');
            const toggleBtn = document.getElementById('auth-mode-toggle');

            if (!title || !btn || !toggleBtn) return;

            const isLogin = btn.textContent === 'Přihlásit se';

            const fields = document.getElementById('register-fields');

            if (isLogin) {
                title.textContent = 'Registrace';
                btn.textContent = 'Zaregistrovat';
                toggleBtn.textContent = 'Již máte účet? Přihlaste se';
                if (fields) fields.style.display = 'block';
            } else {
                title.textContent = 'Přihlášení';
                btn.textContent = 'Přihlásit se';
                toggleBtn.textContent = 'Nemáte účet? Zaregistrujte se';
                if (fields) fields.style.display = 'none';
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

                if (mode === 'register') {
                    title.textContent = 'Registrace';
                    btn.textContent = 'Zaregistrovat';
                    toggleBtn.textContent = 'Již máte účet? Přihlaste se';
                    if (fields) fields.style.display = 'block';
                } else {
                    title.textContent = 'Přihlášení';
                    btn.textContent = 'Přihlásit se';
                    toggleBtn.textContent = 'Nemáte účet? Zaregistrujte se';
                    if (fields) fields.style.display = 'none';
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
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
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
                console.log(`💾 Saving reading (${type})...`);
                const res = await fetch(`${API_URL}/user/readings`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.token}`
                    },
                    body: JSON.stringify({ type, data })
                });

                if (!res.ok) {
                    const err = await res.json();
                    console.warn('Failed to save reading:', err);
                    return null;
                } else {
                    const savedData = await res.json();
                    console.log('✅ Reading saved successfully', savedData);
                    return savedData; // Return saved reading with ID
                }
            } catch (e) {
                console.error('Error saving reading:', e);
                return null;
            }
        },

        async getProfile() {
            if (!this.token) return null;
            try {
                const res = await fetch(`${API_URL}/auth/profile`, {
                    headers: { 'Authorization': `Bearer ${this.token}` }
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

})();
