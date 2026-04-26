(() => {
    const API_URL = window.API_CONFIG?.BASE_URL || '/api';
    const PENDING_PLAN_KEY = 'pending_plan';
    const PENDING_CONTEXT_KEY = 'pending_checkout_context';
    const POST_AUTH_ACTIVATION_KEY = 'post_auth_activation';
    const POST_AUTH_REDIRECT_PENDING_KEY = 'post_auth_redirect_pending';

    function setHidden(element, hidden) {
        if (element) element.hidden = hidden;
    }

    function setAuthButtonPremiumLabel(button, isPremium) {
        if (!button) return;
        button.textContent = 'Odhlásit';
        if (!isPremium) return;

        const badge = document.createElement('span');
        badge.className = 'auth-premium-label';
        badge.textContent = '(Premium)';
        button.append(' ', badge);
    }

    const Auth = {
        // Token is stored in HttpOnly cookie (secure, XSS-proof)
        // JS cannot read it - that's the point. We track login state via user data.
        user: (() => {
            try { return JSON.parse(localStorage.getItem('auth_user') || 'null'); }
            catch { localStorage.removeItem('auth_user'); return null; }
        })(),

        isStandaloneAuthPage() {
            return document.body?.classList.contains('page-login') || window.location.pathname.endsWith('/prihlaseni.html') || window.location.pathname.endsWith('prihlaseni.html');
        },

        init() {
            if (!this.isStandaloneAuthPage()) {
                this.injectModal();
            }
            this.updateUI();
            this.setupListeners();
            this.handleRedirect();
            this.maybeShowPostAuthActivation();
            this.refreshSession(); // Auto-sync profile on load
            // Auto-refresh token every 15 minutes (faster detection of trial expiration)
            setInterval(() => this.refreshSession(), 900000);
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
            if (!s.includes('premium') && !s.includes('exclusive') && !s.includes('vip')) return false;
            // Check expiration if available
            if (this.user.premiumExpires) {
                const expires = new Date(this.user.premiumExpires);
                if (expires < new Date()) return false;
            }
            return true;
        },

        // Osvícení or VIP level check (exclusive_monthly, vip)
        isExclusive() {
            if (!this.user || !this.user.subscription_status) return false;
            const s = this.user.subscription_status.toLowerCase();
            if (!s.includes('exclusive') && !s.includes('vip')) return false;
            if (this.user.premiumExpires) {
                const expires = new Date(this.user.premiumExpires);
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

                this.loginSuccess(data, { mode: 'register' });
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
                toast.classList.add('toast--leaving');
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

                this.loginSuccess(data, { mode: 'login' });
                return { success: true };
            } catch (e) {
                return { success: false, error: e.message };
            }
        },

        loginSuccess(data, options = {}) {
            // Token is now in HttpOnly cookie (set by server)
            // We only store user data in localStorage
            const pendingPlan = this.getPendingCheckoutPlan();
            const pendingContext = pendingPlan ? this.getPendingCheckoutContext() : null;
            const postAuthRedirect = pendingPlan ? null : this.resolvePostAuthRedirect(options);
            if (postAuthRedirect) {
                sessionStorage.setItem(POST_AUTH_REDIRECT_PENDING_KEY, postAuthRedirect);
            } else {
                sessionStorage.removeItem(POST_AUTH_REDIRECT_PENDING_KEY);
            }
            this.user = data.user;
            localStorage.setItem('auth_user', JSON.stringify(data.user));
            this.updateUI();
            this.closeModal();

            // After login/register success: check for pending plan redirect
            if (pendingPlan) {
                sessionStorage.removeItem(POST_AUTH_REDIRECT_PENDING_KEY);
                this._startCheckout(pendingPlan, pendingContext);
                return;
            }

            if (postAuthRedirect) {
                setTimeout(() => {
                    sessionStorage.removeItem(POST_AUTH_REDIRECT_PENDING_KEY);
                    window.location.href = postAuthRedirect;
                }, 500);
            }
        },

        getStandaloneAuthContext() {
            if (!this.isStandaloneAuthPage()) return null;

            const params = new URLSearchParams(window.location.search);
            const mode = params.get('mode') === 'register' ? 'register' : 'login';
            const redirect = params.get('redirect') || '/profil.html';
            const source = params.get('source') || null;
            const feature = params.get('feature') || null;
            const plan = params.get('plan') || null;

            return {
                mode,
                redirect,
                source,
                feature,
                plan
            };
        },

        getPostAuthActivationConfig(context = {}) {
            const feature = context.feature || '';
            const source = context.source || '';

            const featureMap = {
                partnerska_detail: {
                    path: '/partnerska-shoda.html',
                    title: 'Vítejte v Mystické Hvězdě',
                    message: 'Začněte partnerskou shodou. První výsledek vám rychle ukáže osobní hodnotu.'
                },
                synastry: {
                    path: '/partnerska-shoda.html',
                    title: 'Vítejte v Mystické Hvězdě',
                    message: 'Začněte partnerskou shodou. První výsledek vám rychle ukáže osobní hodnotu.'
                },
                natalni_interpretace: {
                    path: '/natalni-karta.html',
                    title: 'Vítejte v Mystické Hvězdě',
                    message: 'Natální karta je jeden z nejsilnějších prvních momentů. Začněte právě tady.'
                },
                numerologie_vyklad: {
                    path: '/numerologie.html',
                    title: 'Vítejte v Mystické Hvězdě',
                    message: 'V numerologii nejrychleji uvidíte, jak osobní umí být vaše první vedení.'
                },
                tarot: {
                    path: '/tarot.html',
                    title: 'Vítejte v Mystické Hvězdě',
                    message: 'Vyzkoušejte hned první tarotový výklad. Je to nejrychlejší cesta k první hodnotě.'
                },
                horoskopy: {
                    path: '/horoskopy.html',
                    title: 'Vítejte v Mystické Hvězdě',
                    message: 'Začněte osobním horoskopem a získejte rychlý první vhled.'
                },
                weekly_horoscope: {
                    path: '/horoskopy.html',
                    title: 'Vítejte v Mystické Hvězdě',
                    message: 'Začněte osobním horoskopem a získejte rychlý první vhled.'
                },
                monthly_horoscope: {
                    path: '/horoskopy.html',
                    title: 'Vítejte v Mystické Hvězdě',
                    message: 'Začněte osobním horoskopem a získejte rychlý první vhled.'
                },
                mentor: {
                    path: '/mentor.html',
                    title: 'Vítejte v Mystické Hvězdě',
                    message: 'Položte hned první otázku Hvězdnému Průvodci a získejte osobní kontakt s produktem.'
                },
                hvezdny_mentor: {
                    path: '/mentor.html',
                    title: 'Vítejte v Mystické Hvězdě',
                    message: 'Položte hned první otázku Hvězdnému Průvodci a získejte osobní kontakt s produktem.'
                },
                runy_hluboky_vyklad: {
                    path: '/runy.html',
                    title: 'Vítejte v Mystické Hvězdě',
                    message: 'Runy jsou silný první krok, pokud chcete okamžitý osobní výklad.'
                },
                shamanske_kolo_plne_cteni: {
                    path: '/shamanske-kolo.html',
                    title: 'Vítejte v Mystické Hvězdě',
                    message: 'Šamanské kolo vás rychle dostane k hlubšímu prvnímu zážitku.'
                },
                minuly_zivot: {
                    path: '/minuly-zivot.html',
                    title: 'Vítejte v Mystické Hvězdě',
                    message: 'Minulý život je silný vstupní zážitek, pokud chcete začít něčím hlubokým.'
                },
                kristalova_koule: {
                    path: '/kristalova-koule.html',
                    title: 'Vítejte v Mystické Hvězdě',
                    message: 'Křišťálová koule je rychlý první moment, který ukáže osobní vedení v praxi.'
                }
            };

            const sourceMap = {
                newsletter_form: {
                    path: '/horoskopy.html',
                    title: 'Registrace je hotová',
                    message: 'Když už jste uvnitř, vezměte si hned první hodnotu přes osobní horoskop.'
                }
            };

            return featureMap[feature] || sourceMap[source] || null;
        },

        setPostAuthActivation(context = {}) {
            if (!context?.path) return;

            sessionStorage.setItem(POST_AUTH_ACTIVATION_KEY, JSON.stringify({
                path: context.path,
                title: context.title || 'Vítejte',
                message: context.message || '',
                source: context.source || null,
                feature: context.feature || null
            }));
        },

        maybeShowPostAuthActivation() {
            try {
                const raw = sessionStorage.getItem(POST_AUTH_ACTIVATION_KEY);
                if (!raw) return;

                const activation = JSON.parse(raw);
                if (!activation?.path || window.location.pathname !== activation.path) {
                    return;
                }

                sessionStorage.removeItem(POST_AUTH_ACTIVATION_KEY);

                if (activation.title || activation.message) {
                    this.showToast(
                        activation.title || 'Vítejte',
                        activation.message || 'Začněte prvním osobním výkladem.',
                        'success'
                    );
                }

                window.MH_ANALYTICS?.trackEvent?.('signup_activation_landed', {
                    source: activation.source || 'direct',
                    feature: activation.feature || null,
                    destination: activation.path
                });
            } catch (error) {
                console.warn('Post-auth activation handling failed:', error);
                sessionStorage.removeItem(POST_AUTH_ACTIVATION_KEY);
            }
        },

        resolvePostAuthRedirect(options = {}) {
            const context = this.getStandaloneAuthContext();
            if (!context) return null;

            const safeRedirect = typeof context.redirect === 'string' && context.redirect.startsWith('/') && !context.redirect.startsWith('//')
                ? context.redirect
                : '/profil.html';

            if (options.mode === 'register') {
                const activation = this.getPostAuthActivationConfig(context);
                if (activation?.path) {
                    this.setPostAuthActivation({
                        ...activation,
                        source: context.source,
                        feature: context.feature
                    });

                    window.MH_ANALYTICS?.trackEvent?.('signup_activation_redirected', {
                        source: context.source || 'register',
                        feature: context.feature || null,
                        destination: activation.path
                    });

                    return activation.path;
                }

                if (safeRedirect === '/profil.html' && !localStorage.getItem('mh_onboarded')) {
                    return '/onboarding.html';
                }
            }

            return safeRedirect;
        },

        getPendingCheckoutPlan() {
            return sessionStorage.getItem(PENDING_PLAN_KEY);
        },

        getPendingCheckoutContext() {
            try {
                return JSON.parse(sessionStorage.getItem(PENDING_CONTEXT_KEY) || '{}');
            } catch {
                return {};
            }
        },

        setPendingCheckout(planId, context = {}) {
            if (!planId) return;

            sessionStorage.setItem(PENDING_PLAN_KEY, planId);
            sessionStorage.setItem(PENDING_CONTEXT_KEY, JSON.stringify({
                planId,
                source: 'unknown',
                redirect: '/cenik.html',
                authMode: 'register',
                ...context
            }));
        },

        clearPendingCheckout() {
            sessionStorage.removeItem(PENDING_PLAN_KEY);
            sessionStorage.removeItem(PENDING_CONTEXT_KEY);
        },

        startPlanCheckout(planId, context = {}) {
            if (!planId) return;

            if (!this.isLoggedIn()) {
                const redirectTarget = typeof context.redirect === 'string' && context.redirect.startsWith('/') && !context.redirect.startsWith('//')
                    ? context.redirect
                    : '/cenik.html';
                const authMode = context.authMode === 'login' ? 'login' : 'register';

                this.setPendingCheckout(planId, {
                    ...context,
                    redirect: redirectTarget,
                    authMode
                });

                const authUrl = new URL('/prihlaseni.html', window.location.origin);
                authUrl.searchParams.set('mode', authMode);
                authUrl.searchParams.set('redirect', redirectTarget);
                authUrl.searchParams.set('plan', planId);

                if (context.source) authUrl.searchParams.set('source', context.source);
                if (context.feature) authUrl.searchParams.set('feature', context.feature);

                window.location.href = `${authUrl.pathname}${authUrl.search}`;
                return;
            }

            this._startCheckout(planId, context);
        },

        async logout() {
            // Call server logout endpoint to clear HttpOnly cookie
            const csrfToken = window.getCSRFToken ? await window.getCSRFToken() : null;
            await fetch(`${API_URL}/auth/logout`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    ...(csrfToken && { 'X-CSRF-Token': csrfToken })
                }
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
                    setAuthButtonPremiumLabel(authBtn, this.isPremium());
                }
                setHidden(regBtn, true);
                setHidden(profileLink, false);

                // Mobile
                if (mobileAuthBtn) {
                    mobileAuthBtn.textContent = 'Odhlásit se';
                }
                setHidden(mobileRegBtn, true);
                setHidden(mobileProfileLink, false);
            } else {
                // Desktop
                if (authBtn) {
                    authBtn.textContent = 'Přihlásit';
                }
                setHidden(regBtn, false);
                setHidden(profileLink, true);

                // Mobile
                if (mobileAuthBtn) {
                    mobileAuthBtn.textContent = 'Přihlásit se';
                }
                setHidden(mobileRegBtn, false);
                setHidden(mobileProfileLink, true);
            }

            // Hero CTA Logic
            const heroCta = document.getElementById('hero-cta-container');
            const heroCtaLoggedIn = document.getElementById('hero-cta-logged-in');
            setHidden(heroCta, this.isLoggedIn());
            setHidden(heroCtaLoggedIn, !this.isLoggedIn());

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

                // Hero CTA Button (Index) now uses dedicated registration page
                const heroBtn = e.target.closest('#hero-cta-btn');
                if (heroBtn) {
                    return;
                }

                // Guest profile CTA uses dedicated login page with redirect back
                const profileLoginBtn = e.target.closest('#profile-login-btn');
                if (profileLoginBtn) {
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
                    if (this.isStandaloneAuthPage()) return;

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
                if (this.isStandaloneAuthPage()) return;

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
            setHidden(pwField, true);
            setHidden(forgotLink, true);
            setHidden(resetFields, false);
            setHidden(registerFields, true);
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
                const gdprWrapper = document.getElementById('gdpr-consent-wrapper');
                title.textContent = 'Přihlášení';
                btn.textContent = 'Přihlásit se';
                toggleBtn.textContent = 'Nemáte účet? Zaregistrujte se';
                setHidden(pwField, false);
                setHidden(forgotLink, false);
                setHidden(resetFields, true);
                setHidden(registerFields, true);
                setHidden(confirmPwField, true);
                setHidden(gdprWrapper, true);
                return;
            }

            const isLogin = btn.textContent === 'Přihlásit se';

            const fields = document.getElementById('register-fields');
            const confirmPwField = document.getElementById('confirm-password-field-wrapper');
            const gdprWrapper = document.getElementById('gdpr-consent-wrapper');

            if (isLogin) {
                title.textContent = 'Registrace';
                btn.textContent = 'Zaregistrovat';
                toggleBtn.textContent = 'Již máte účet? Přihlaste se';
                setHidden(fields, false);
                setHidden(confirmPwField, false);
                setHidden(gdprWrapper, false);
            } else {
                title.textContent = 'Přihlášení';
                btn.textContent = 'Přihlásit se';
                toggleBtn.textContent = 'Nemáte účet? Zaregistrujte se';
                setHidden(fields, true);
                setHidden(confirmPwField, true);
                setHidden(gdprWrapper, true);
            }
        },


        openModal(mode = 'login') {
            // Auto-inject if missing
            if (!document.getElementById('auth-modal')) this.injectModal();

            const modal = document.getElementById('auth-modal');
            if (modal) {
                modal.hidden = false;

                // Set correct mode
                const title = document.getElementById('auth-title');
                const btn = document.getElementById('auth-submit');
                const toggleBtn = document.getElementById('auth-mode-toggle');

                if (!title || !btn || !toggleBtn) return;

                const fields = document.getElementById('register-fields');
                const confirmPwField = document.getElementById('confirm-password-field-wrapper');
                const gdprWrapper = document.getElementById('gdpr-consent-wrapper');

                if (mode === 'register') {
                    title.textContent = 'Registrace';
                    btn.textContent = 'Zaregistrovat';
                    toggleBtn.textContent = 'Již máte účet? Přihlaste se';
                    setHidden(fields, false);
                    setHidden(confirmPwField, false);
                    setHidden(gdprWrapper, false);
                } else {
                    title.textContent = 'Přihlášení';
                    btn.textContent = 'Přihlásit se';
                    toggleBtn.textContent = 'Nemáte účet? Zaregistrujte se';
                    setHidden(fields, true);
                    setHidden(confirmPwField, true);
                    setHidden(gdprWrapper, true);
                }
            }
        },

        closeModal() {
            const modal = document.getElementById('auth-modal');
            if (modal) modal.hidden = true;
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
        },

        async _startCheckout(planId, context = {}) {
            try {
                const source = context.source || this.getPendingCheckoutContext().source || 'auth_pending_plan';
                window.MH_ANALYTICS?.trackCheckoutStarted?.(planId, {
                    source,
                    feature: context.feature || null
                });
                const csrfToken = window.getCSRFToken ? await window.getCSRFToken() : null;
                const res = await fetch(`${API_URL}/payment/create-checkout-session`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(csrfToken && { 'X-CSRF-Token': csrfToken })
                    },
                    body: JSON.stringify({
                        planId,
                        source,
                        feature: context.feature || null,
                        billingInterval: context.billing_interval || context.billingInterval || null
                    })
                });
                const data = await res.json();
                if (res.ok && data.url) {
                    this.clearPendingCheckout();
                    window.location.href = data.url;
                } else {
                    console.warn('Checkout session failed:', data);
                    window.location.href = context.redirect || '/cenik.html';
                }
            } catch (e) {
                console.error('Checkout error:', e);
                window.location.href = context.redirect || '/cenik.html';
            }
        },
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
                if (window.MH_DEBUG) console.debug('Logout detected in another tab, logging out here...');
                Auth.user = null;
                Auth.updateUI();
                // Optionally show a message
                Auth.showToast('Odhlášení z jiného okna', 'Byli jste odhlášeni z jiného okna prohlížeče.', 'info');
                // Don't reload - just update UI so user can login again if needed
            }
        }

        // Handle onboarding completion in another tab
        if (event.key === 'mh_onboarded' && event.newValue === '1') {
            if (window.MH_DEBUG) console.debug('Onboarding completed in another tab');
            // Could redirect if needed
        }
    });

})();
