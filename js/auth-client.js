(() => {
    const API_URL = window.API_CONFIG?.BASE_URL || '/api';
    const PENDING_PLAN_KEY = 'pending_plan';
    const PENDING_CONTEXT_KEY = 'pending_checkout_context';
    const PENDING_AUTH_REQUIRED_EVENTS_KEY = 'mh_pending_checkout_auth_required_events';
    const POST_VERIFICATION_CHECKOUT_KEY = 'mh_post_verification_checkout';
    const POST_VERIFICATION_CHECKOUT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
    const POST_AUTH_ACTIVATION_KEY = 'post_auth_activation';
    const POST_AUTH_REDIRECT_PENDING_KEY = 'post_auth_redirect_pending';
    const SIGNUP_INTENT_KEY = 'mh_signup_intent';
    const CHECKOUT_METADATA_PARAM_KEYS = [
        'entry_source',
        'entry_feature',
        'utm_source',
        'utm_medium',
        'utm_campaign',
        'utm_content',
        'requested_card',
        'card_param'
    ];

    function setHidden(element, hidden) {
        if (element) element.hidden = hidden;
    }

    function setGdprRequirement(required) {
        const gdprInput = document.getElementById('gdpr-consent');
        if (!gdprInput) return;

        if (required) {
            gdprInput.setAttribute('required', 'required');
            return;
        }

        gdprInput.removeAttribute('required');
        gdprInput.checked = false;
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

    function hasStandaloneAuthHref(button) {
        const href = button?.getAttribute('href') || '';
        const blockedScriptScheme = ['java', 'script:'].join('');
        return href && href !== '#' && !href.startsWith('#') && !href.toLowerCase().startsWith(blockedScriptScheme);
    }

    function hasLoginCookie() {
        return document.cookie.split(';').some((cookie) => cookie.trim() === 'logged_in=1');
    }

    function sanitizeCheckoutMetadataValue(value, maxLength = 120) {
        if (value == null) return null;

        const cleaned = String(value).trim().replace(/[^\w.:-]/g, '');
        if (!cleaned) return null;

        return cleaned.slice(0, maxLength);
    }

    function setCheckoutMetadataValue(metadata, key, value) {
        const sanitized = sanitizeCheckoutMetadataValue(value);
        if (sanitized) metadata[key] = sanitized;
    }

    function getCheckoutMetadataFromParams(params, context = {}) {
        const metadata = {};
        const contextMetadata = context.metadata && typeof context.metadata === 'object' && !Array.isArray(context.metadata)
            ? context.metadata
            : {};

        setCheckoutMetadataValue(
            metadata,
            'entry_source',
            params.get('entry_source') || contextMetadata.entry_source || params.get('source') || context.source
        );
        setCheckoutMetadataValue(
            metadata,
            'entry_feature',
            params.get('entry_feature') || contextMetadata.entry_feature || params.get('feature') || context.feature
        );

        [
            'utm_source',
            'utm_medium',
            'utm_campaign',
            'utm_content',
            'requested_card'
        ].forEach((key) => {
            setCheckoutMetadataValue(metadata, key, params.get(key) || contextMetadata[key]);
        });
        setCheckoutMetadataValue(metadata, 'card_param', params.get('card') || params.get('card_param') || contextMetadata.card_param);

        return metadata;
    }

    function appendCheckoutContextToAuthUrl(authUrl, context = {}) {
        const params = new URLSearchParams();
        const metadata = getCheckoutMetadataFromParams(params, context);
        const billingInterval = context.billing_interval || context.billingInterval || null;

        if (billingInterval) {
            authUrl.searchParams.set('billing_interval', billingInterval);
        }

        const paramMap = {
            entry_source: 'entry_source',
            entry_feature: 'entry_feature',
            utm_source: 'utm_source',
            utm_medium: 'utm_medium',
            utm_campaign: 'utm_campaign',
            utm_content: 'utm_content',
            requested_card: 'requested_card',
            card_param: 'card'
        };

        CHECKOUT_METADATA_PARAM_KEYS.forEach((key) => {
            if (metadata[key]) {
                authUrl.searchParams.set(paramMap[key] || key, metadata[key]);
            }
        });
    }

    function readCachedUser() {
        if (!hasLoginCookie()) {
            localStorage.removeItem('auth_user');
            return null;
        }

        try {
            return JSON.parse(localStorage.getItem('auth_user') || 'null');
        } catch {
            localStorage.removeItem('auth_user');
            return null;
        }
    }

    const Auth = {
        // Token is stored in HttpOnly cookie (secure, XSS-proof)
        // JS cannot read it - that's the point. Use the server-set login
        // indicator cookie as the source of truth and treat auth_user as cache.
        user: readCachedUser(),

        isStandaloneAuthPage() {
            return document.body?.classList.contains('page-login') || window.location.pathname.endsWith('/prihlaseni.html') || window.location.pathname.endsWith('prihlaseni.html');
        },

        init() {
            this.updateUI();
            this.setupListeners();
            this.handleRedirect();
            void this.flushPendingCheckoutAuthRequiredEvents();
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

        bindModalListeners() {
            const modal = document.getElementById('auth-modal');
            if (!modal || modal.dataset.modalListenersAttached === 'true') return;

            modal.dataset.modalListenersAttached = 'true';
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.closeModal();
            });
        },

        isLoggedIn() {
            const loggedIn = hasLoginCookie();
            if (!loggedIn && this.user) {
                this.user = null;
                localStorage.removeItem('auth_user');
            }
            return loggedIn;
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
                    const standaloneContext = this.getStandaloneAuthContext();
                    const pendingPlan = this.getPendingCheckoutPlan();
                    const standalonePlan = !pendingPlan && standaloneContext?.plan ? standaloneContext.plan : null;
                    const checkoutContext = pendingPlan
                        ? this.getPendingCheckoutContext()
                        : standalonePlan
                            ? {
                                source: standaloneContext.source || 'standalone_auth_plan',
                                feature: standaloneContext.feature || null,
                                metadata: standaloneContext.metadata || {},
                                billing_interval: standaloneContext.billing_interval || null,
                                redirect: typeof standaloneContext.redirect === 'string'
                                    && standaloneContext.redirect.startsWith('/')
                                    && !standaloneContext.redirect.startsWith('//')
                                    ? standaloneContext.redirect
                                    : '/cenik.html',
                                authMode: standaloneContext.mode || 'register'
                            }
                            : null;
                    const checkoutPlan = pendingPlan || standalonePlan;
                    if (checkoutPlan && checkoutContext) {
                        this.rememberPostVerificationCheckout(checkoutPlan, checkoutContext);
                        void this.trackCheckoutPostVerificationEvent(
                            'checkout_post_verification_pending',
                            checkoutPlan,
                            checkoutContext
                        );
                    }
                    const authSource = checkoutContext?.source || standaloneContext?.source || null;
                    const authFeature = checkoutContext?.feature || standaloneContext?.feature || null;
                    const analyticsTracked = this.trackAuthCompletedSafely('register', {
                        source: authSource,
                        feature: authFeature,
                        entry_source: authSource,
                        entry_feature: authFeature
                    });
                    this.showToast('Ověření emailu', 'Pro dokončení registrace potvrďte prosím svůj email. 📧', 'success');
                    this.closeModal(); // Close modal but don't login yet
                    return { success: true, verificationRequired: true, analyticsTracked };
                }

                this.loginSuccess(data, { mode: 'register' });
                this.showToast('Vítejte!', 'Registrace proběhla úspěšně. 🌟', 'success');
                return { success: true, analyticsTracked: true };
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
                return { success: true, analyticsTracked: true };
            } catch (e) {
                return { success: false, error: e.message };
            }
        },

        trackAuthCompletedSafely(authMode, payload = {}) {
            try {
                window.MH_ANALYTICS?.trackAuthCompleted?.(authMode, payload);
                return true;
            } catch (analyticsError) {
                console.warn('[FUNNEL] Auth completion analytics failed:', analyticsError.message);
                return false;
            }
        },

        loginSuccess(data, options = {}) {
            // Token is now in HttpOnly cookie (set by server)
            // We only store user data in localStorage
            const pendingPlan = this.getPendingCheckoutPlan();
            const standaloneContext = this.getStandaloneAuthContext();
            const standalonePlan = !pendingPlan && standaloneContext?.plan ? standaloneContext.plan : null;
            const postVerificationCheckout = !pendingPlan && !standalonePlan
                ? this.getPostVerificationCheckout()
                : null;
            const checkoutPlan = pendingPlan || standalonePlan || postVerificationCheckout?.planId;
            const checkoutContext = pendingPlan
                ? this.getPendingCheckoutContext()
                : standalonePlan
                    ? {
                        planId: standalonePlan,
                        source: standaloneContext.source || 'standalone_auth_plan',
                        feature: standaloneContext.feature || null,
                        metadata: standaloneContext.metadata || {},
                        billing_interval: standaloneContext.billing_interval || null,
                        redirect: typeof standaloneContext.redirect === 'string'
                            && standaloneContext.redirect.startsWith('/')
                            && !standaloneContext.redirect.startsWith('//')
                            && standaloneContext.redirect !== '/profil.html'
                            ? standaloneContext.redirect
                            : '/cenik.html',
                        authMode: standaloneContext.mode || options.mode || 'register'
                    }
                    : postVerificationCheckout?.context || null;
            const postAuthRedirect = checkoutPlan ? null : this.resolvePostAuthRedirect(options);
            if (postAuthRedirect) {
                sessionStorage.setItem(POST_AUTH_REDIRECT_PENDING_KEY, postAuthRedirect);
            } else {
                sessionStorage.removeItem(POST_AUTH_REDIRECT_PENDING_KEY);
            }
            this.user = data.user;
            localStorage.setItem('auth_user', JSON.stringify(data.user));
            if (options.mode === 'register' && standaloneContext) {
                this.rememberSignupIntent(standaloneContext, postAuthRedirect || checkoutContext?.redirect || null);
            }
            this.updateUI();
            this.closeModal();

            const authMode = options.mode === 'register' ? 'register' : 'login';
            const authSource = checkoutContext?.source || standaloneContext?.source || null;
            const authFeature = checkoutContext?.feature || standaloneContext?.feature || null;
            this.trackAuthCompletedSafely(authMode, {
                source: authSource,
                feature: authFeature,
                entry_source: authSource,
                entry_feature: authFeature
            });

            // After login/register success: check for pending plan redirect
            if (checkoutPlan) {
                sessionStorage.removeItem(POST_AUTH_REDIRECT_PENDING_KEY);
                if (postVerificationCheckout) {
                    void this.trackCheckoutPostVerificationEvent(
                        'checkout_post_verification_recovered',
                        checkoutPlan,
                        checkoutContext
                    );
                }
                this._startCheckout(checkoutPlan, checkoutContext);
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
            const billingInterval = params.get('billing_interval') || params.get('billingInterval') || null;
            const metadata = getCheckoutMetadataFromParams(params, { source, feature });

            return {
                mode,
                redirect,
                source,
                feature,
                plan,
                billing_interval: billingInterval,
                metadata
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
                annual_horoscope: {
                    path: '/rocni-horoskop.html',
                    title: 'Vítejte v Mystické Hvězdě',
                    message: 'Pokračujte k ročnímu horoskopu a výhledu, který naváže na vaše datum narození.'
                },
                personal_map: {
                    path: '/osobni-mapa.html',
                    title: 'Vítejte v Mystické Hvězdě',
                    message: 'Pokračujte k osobní mapě a hlubšímu rozboru vlastního směru.'
                },
                tarot: {
                    path: '/tarot.html',
                    title: 'Vítejte v Mystické Hvězdě',
                    message: 'Vyzkoušejte hned první tarotový výklad. Je to nejrychlejší cesta k první hodnotě.'
                },
                tarot_multi_card: {
                    path: '/tarot.html',
                    title: 'Vítejte v Mystické Hvězdě',
                    message: 'Navážete rovnou vícekartovým tarotem a prvním hlubším vhledem.'
                },
                tarot_daily_card_profile_save: {
                    path: '/tarot-karta-dne.html',
                    title: 'Karta je připravená k uložení',
                    message: 'Vracíme vás ke kartě dne, aby se mohla uložit do profilu bez ztráty kontextu.'
                },
                horoskopy: {
                    path: '/horoskopy.html',
                    title: 'Vítejte v Mystické Hvězdě',
                    message: 'Začněte osobním horoskopem a získejte rychlý první vhled.'
                },
                astrocartography: {
                    path: '/astro-mapa.html',
                    title: 'Vítejte v Mystické Hvězdě',
                    message: 'Začněte astro mapou a podívejte se, která místa s vámi rezonují.'
                },
                premium_membership: {
                    path: '/cenik.html',
                    title: 'Registrace je hotová',
                    message: 'Můžete pokračovat k porovnání plánů a vybrat úroveň vedení, která dává smysl.'
                },
                subscription_management: {
                    path: '/profil.html',
                    title: 'Registrace je hotová',
                    message: 'Správu předplatného najdete v profilu. Odtud můžete pokračovat k dalšímu kroku kolem plánu.'
                },
                vip_membership: {
                    path: '/cenik.html',
                    title: 'Registrace je hotová',
                    message: 'Můžete pokračovat k VIP členství a nejvyšší úrovni osobního vedení.'
                },
                daily_guidance: {
                    path: '/horoskopy.html',
                    title: 'Vítejte v Mystické Hvězdě',
                    message: 'Začněte dnešním osobním horoskopem. Je to nejrychlejší cesta k první hodnotě.'
                },
                daily_angel_card: {
                    path: '/andelske-karty.html',
                    title: 'Vítejte v Mystické Hvězdě',
                    message: 'Vracíme vás k dennímu symbolu z homepage, aby první vhled navázal na to, kvůli čemu jste přišli.'
                },
                andelske_karty_hluboky_vhled: {
                    path: '/andelske-karty.html',
                    title: 'Vítejte v Mystické Hvězdě',
                    message: 'Pokračujte v andělských kartách a otevřete hlubší vhled bez ztráty kontextu.'
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
                lunar_calendar: {
                    path: '/lunace.html',
                    title: 'Vítejte v Mystické Hvězdě',
                    message: 'Začněte lunárním kalendářem a vezměte si z aktuální fáze měsíce konkrétní krok.'
                },
                zodiac_signs: {
                    path: '/horoskop/',
                    title: 'Vítejte v Mystické Hvězdě',
                    message: 'Začněte přehledem znamení a rychle se vraťte k horoskopu, který odpovídá vašemu tématu.'
                },
                ritual_memory: {
                    path: '/profil.html',
                    title: 'Paměť rituálu je připravená',
                    message: 'Profil bude držet výklady, reflexe a opakující se témata v jednom návratovém místě.'
                },
                profile_history: {
                    path: '/profil.html',
                    title: 'Historie výkladů je připravená',
                    message: 'Ukládejte výklady a zpětnou vazbu, aby se další kroky mohly lépe zaměřit.'
                },
                another_reading: {
                    path: '/tarot.html',
                    title: 'Navážeme dalším výkladem',
                    message: 'Pokračujte výkladem, který naváže na téma, které jste právě označili.'
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
                    path: '/shamansko-kolo.html',
                    title: 'Vítejte v Mystické Hvězdě',
                    message: 'Šamanské kolo vás rychle navede ke konkrétnímu symbolickému směru.'
                },
                minuly_zivot: {
                    path: '/minuly-zivot.html',
                    title: 'Vítejte v Mystické Hvězdě',
                    message: 'Minulý život berte jako symbolický rámec pro sebereflexi a první osobní téma.'
                },
                kristalova_koule: {
                    path: '/kristalova-koule.html',
                    title: 'Vítejte v Mystické Hvězdě',
                    message: 'Křišťálová koule pomůže formulovat první otázku a vzít si krátký osobní vhled.'
                }
            };

            Object.assign(featureMap, {
                angel_card_deep: featureMap.andelske_karty_hluboky_vhled,
                angel_numbers: featureMap.andelske_karty_hluboky_vhled,
                crystal_ball_unlimited: featureMap.kristalova_koule,
                compatibility: featureMap.partnerska_detail,
                journal_insights: featureMap.mentor,
                medicine_wheel: featureMap.shamanske_kolo_plne_cteni,
                natal_chart: featureMap.natalni_interpretace,
                numerology: featureMap.numerologie_vyklad,
                osobni_mapa_2026: featureMap.personal_map,
                rocni_horoskop_2026: featureMap.annual_horoscope,
                past_life: featureMap.minuly_zivot,
                rituals: {
                    path: '/ritualy/',
                    title: 'Vítejte v Mystické Hvězdě',
                    message: 'Začněte lunárním rituálem a vezměte si první praktický krok.'
                },
                runes_deep_reading: featureMap.runy_hluboky_vyklad,
                synastry: featureMap.partnerska_detail,
                tarot_celtic_cross: featureMap.tarot_multi_card
            });

            const sourceMap = {
                homepage_hero: {
                    path: '/horoskopy.html',
                    title: 'Vítejte v Mystické Hvězdě',
                    message: 'Začněte dnešním horoskopem a uvidíte první osobní hodnotu hned.'
                },
                pricing_free_cta: {
                    path: '/horoskopy.html',
                    title: 'Registrace je hotová',
                    message: 'Začněte denním horoskopem. Je to nejrychlejší první hodnota po vytvoření účtu.'
                },
                homepage_pricing_free_cta: {
                    path: '/horoskopy.html',
                    title: 'Registrace je hotová',
                    message: 'Začněte denním horoskopem a hned uvidíte, co účet zdarma umí.'
                },
                tarot_daily_card_profile_save: {
                    path: '/tarot-karta-dne.html',
                    title: 'Karta je připravená k uložení',
                    message: 'Vracíme vás ke kartě dne, aby se mohla uložit do profilu bez ztráty kontextu.'
                },
                newsletter_form: {
                    path: '/horoskopy.html',
                    title: 'Registrace je hotová',
                    message: 'Když už jste uvnitř, vezměte si hned první hodnotu přes osobní horoskop.'
                },
                newsletter_popup: {
                    path: '/horoskopy.html',
                    title: 'Registrace je hotová',
                    message: 'Navážete na odběr rovnou denním horoskopem a první osobní hodnotou.'
                }
            };

            const manifestActivation = window.MH_GROWTH_LOOP?.getPostSignupActivation?.({
                ...context,
                source,
                feature
            });
            const copyConfig = featureMap[feature] || sourceMap[source] || null;

            if (manifestActivation?.path) {
                return {
                    path: manifestActivation.path,
                    title: copyConfig?.title || 'Vítejte v Mystické Hvězdě',
                    message: copyConfig?.message || 'Začněte prvním osobním výkladem, který naváže na důvod registrace.'
                };
            }

            return copyConfig;
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

        rememberSignupIntent(context = {}, destination = null) {
            if (!context.source && !context.feature && !destination) return;

            try {
                const intent = window.MH_GROWTH_LOOP?.buildSignupIntent?.(context, destination) || {
                    source: context.source || null,
                    feature: context.feature || null,
                    plan: context.plan || null,
                    redirect: context.redirect || null,
                    destination: destination || context.redirect || null,
                    createdAt: Date.now()
                };
                localStorage.setItem(SIGNUP_INTENT_KEY, JSON.stringify(intent));
            } catch (error) {
                console.warn('Unable to remember signup intent:', error);
            }
        },

        buildPostAuthActivationUrl(path, context = {}) {
            const activationUrl = window.MH_GROWTH_LOOP?.buildActivationUrl?.(path, context, {
                source: 'signup_activation',
                preserveFeature: true
            });
            if (activationUrl) return activationUrl;

            const url = new URL(path || '/profil.html', window.location.origin);
            url.searchParams.set('source', 'signup_activation');

            if (context.feature) {
                url.searchParams.set('feature', context.feature);
                url.searchParams.set('entry_feature', context.feature);
            }

            if (context.source) {
                url.searchParams.set('entry_source', context.source);
            }

            return `${url.pathname}${url.search}${url.hash}`;
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
            const buildOnboardingRedirect = () => {
                const onboardingUrl = new URL('/onboarding.html', window.location.origin);
                if (context.source) onboardingUrl.searchParams.set('source', context.source);
                if (context.feature) onboardingUrl.searchParams.set('feature', context.feature);
                if (context.plan) onboardingUrl.searchParams.set('plan', context.plan);
                if (safeRedirect) onboardingUrl.searchParams.set('redirect', safeRedirect);
                return `${onboardingUrl.pathname}${onboardingUrl.search}`;
            };

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

                    return this.buildPostAuthActivationUrl(activation.path, context);
                }

                if (safeRedirect === '/profil.html') {
                    return buildOnboardingRedirect();
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

        sanitizeCheckoutContextForStorage(planId, context = {}) {
            const metadata = {};
            const rawMetadata = getCheckoutMetadataFromParams(new URLSearchParams(), context);
            CHECKOUT_METADATA_PARAM_KEYS.forEach((key) => {
                setCheckoutMetadataValue(metadata, key, rawMetadata[key]);
            });

            const redirect = typeof context.redirect === 'string'
                && context.redirect.startsWith('/')
                && !context.redirect.startsWith('//')
                ? context.redirect
                : '/cenik.html';
            const storedContext = {
                planId: sanitizeCheckoutMetadataValue(planId, 80),
                source: sanitizeCheckoutMetadataValue(context.source, 120) || 'auth_pending_plan',
                feature: sanitizeCheckoutMetadataValue(context.feature, 120),
                redirect,
                authMode: context.authMode === 'login' ? 'login' : 'register',
                metadata
            };
            const billingInterval = sanitizeCheckoutMetadataValue(
                context.billing_interval || context.billingInterval,
                40
            );
            if (billingInterval) storedContext.billing_interval = billingInterval;

            return storedContext;
        },

        rememberPostVerificationCheckout(planId, context = {}) {
            const storedContext = this.sanitizeCheckoutContextForStorage(planId, context);
            if (!storedContext.planId) return;

            try {
                localStorage.setItem(POST_VERIFICATION_CHECKOUT_KEY, JSON.stringify({
                    planId: storedContext.planId,
                    context: storedContext,
                    createdAt: Date.now()
                }));
            } catch (error) {
                console.warn('Unable to remember post-verification checkout:', error);
            }
        },

        getPostVerificationCheckout() {
            try {
                const raw = localStorage.getItem(POST_VERIFICATION_CHECKOUT_KEY);
                if (!raw) return null;

                const parsed = JSON.parse(raw);
                if (!parsed?.planId || !parsed?.context) {
                    localStorage.removeItem(POST_VERIFICATION_CHECKOUT_KEY);
                    return null;
                }

                if (Date.now() - Number(parsed.createdAt || 0) > POST_VERIFICATION_CHECKOUT_TTL_MS) {
                    localStorage.removeItem(POST_VERIFICATION_CHECKOUT_KEY);
                    return null;
                }

                return {
                    planId: parsed.planId,
                    context: parsed.context
                };
            } catch {
                localStorage.removeItem(POST_VERIFICATION_CHECKOUT_KEY);
                return null;
            }
        },

        clearPostVerificationCheckout() {
            localStorage.removeItem(POST_VERIFICATION_CHECKOUT_KEY);
        },

        getQueuedCheckoutAuthRequiredEvents() {
            try {
                const parsed = JSON.parse(sessionStorage.getItem(PENDING_AUTH_REQUIRED_EVENTS_KEY) || '[]');
                return Array.isArray(parsed) ? parsed.filter((event) => event?.id && event?.payload) : [];
            } catch {
                sessionStorage.removeItem(PENDING_AUTH_REQUIRED_EVENTS_KEY);
                return [];
            }
        },

        setQueuedCheckoutAuthRequiredEvents(events = []) {
            const cleanEvents = Array.isArray(events) ? events.slice(-8) : [];
            if (!cleanEvents.length) {
                sessionStorage.removeItem(PENDING_AUTH_REQUIRED_EVENTS_KEY);
                return;
            }
            sessionStorage.setItem(PENDING_AUTH_REQUIRED_EVENTS_KEY, JSON.stringify(cleanEvents));
        },

        queueCheckoutFunnelEvent(payload) {
            if (!payload?.eventName) return null;
            const event = {
                id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`,
                payload,
                createdAt: Date.now()
            };
            this.setQueuedCheckoutAuthRequiredEvents([
                ...this.getQueuedCheckoutAuthRequiredEvents(),
                event
            ]);
            return event.id;
        },

        buildCheckoutAuthRequiredPayload(planId, context = {}) {
            const storedContext = this.sanitizeCheckoutContextForStorage(planId, context);
            return {
                eventName: 'checkout_auth_required',
                source: storedContext.source || 'auth_pending_plan',
                feature: storedContext.feature || null,
                planId: storedContext.planId || planId,
                metadata: {
                    path: window.location.pathname,
                    redirect: storedContext.redirect || null,
                    auth_mode: storedContext.authMode || null,
                    billing_interval: storedContext.billing_interval || null,
                    ...(storedContext.metadata || {})
                }
            };
        },

        queueCheckoutAuthRequiredEvent(planId, context = {}) {
            const payload = this.buildCheckoutAuthRequiredPayload(planId, context);
            return this.queueCheckoutFunnelEvent(payload);
        },

        async sendServerFunnelEvent(payload) {
            const csrfToken = window.getCSRFToken ? await window.getCSRFToken() : null;
            if (!csrfToken) return false;

            const res = await fetch(`${API_URL}/payment/funnel-event`, {
                method: 'POST',
                credentials: 'include',
                keepalive: true,
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': csrfToken
                },
                body: JSON.stringify(payload)
            });

            return res.ok;
        },

        async flushPendingCheckoutAuthRequiredEvents() {
            if (this._flushingCheckoutAuthRequiredEvents) {
                this._flushCheckoutAuthRequiredEventsAgain = true;
                return;
            }
            const queuedEvents = this.getQueuedCheckoutAuthRequiredEvents();
            if (!queuedEvents.length) return;

            this._flushingCheckoutAuthRequiredEvents = true;
            const remaining = [];
            const attemptedIds = new Set(queuedEvents.map((event) => event.id));
            try {
                for (const event of queuedEvents) {
                    try {
                        const sent = await this.sendServerFunnelEvent(event.payload);
                        if (!sent) remaining.push(event);
                    } catch {
                        remaining.push(event);
                    }
                }
                const newlyQueuedEvents = this
                    .getQueuedCheckoutAuthRequiredEvents()
                    .filter((event) => !attemptedIds.has(event.id));
                this.setQueuedCheckoutAuthRequiredEvents([
                    ...remaining,
                    ...newlyQueuedEvents
                ]);
            } finally {
                this._flushingCheckoutAuthRequiredEvents = false;
                if (this._flushCheckoutAuthRequiredEventsAgain) {
                    this._flushCheckoutAuthRequiredEventsAgain = false;
                    if (this.getQueuedCheckoutAuthRequiredEvents().length) {
                        window.setTimeout(() => {
                            void this.flushPendingCheckoutAuthRequiredEvents();
                        }, 0);
                    }
                }
            }
        },

        setPendingCheckout(planId, context = {}) {
            if (!planId) return;

            const storedContext = this.sanitizeCheckoutContextForStorage(planId, context);
            if (!storedContext.planId) return;

            sessionStorage.setItem(PENDING_PLAN_KEY, storedContext.planId);
            sessionStorage.setItem(PENDING_CONTEXT_KEY, JSON.stringify(storedContext));
        },

        clearPendingCheckout() {
            sessionStorage.removeItem(PENDING_PLAN_KEY);
            sessionStorage.removeItem(PENDING_CONTEXT_KEY);
        },

        async trackCheckoutAuthRequired(planId, context = {}) {
            try {
                await this.sendServerFunnelEvent(this.buildCheckoutAuthRequiredPayload(planId, context));
            } catch (error) {
                console.warn('[FUNNEL] Could not record checkout auth requirement:', error.message);
            }
        },

        async trackCheckoutPostVerificationEvent(eventName, planId, context = {}) {
            try {
                const storedContext = this.sanitizeCheckoutContextForStorage(planId, context);
                await this.sendServerFunnelEvent({
                    eventName,
                    source: storedContext.source || 'auth_pending_plan',
                    feature: storedContext.feature || null,
                    planId: storedContext.planId || planId,
                    metadata: {
                        path: window.location.pathname,
                        redirect: storedContext.redirect || null,
                        auth_mode: storedContext.authMode || null,
                        billing_interval: storedContext.billing_interval || null,
                        ...(storedContext.metadata || {})
                    }
                });
            } catch (error) {
                console.warn('[FUNNEL] Could not record post-verification checkout event:', error.message);
            }
        },

        startPlanCheckout(planId, context = {}) {
            if (!planId) return;

            if (!this.isLoggedIn()) {
                const redirectTarget = typeof context.redirect === 'string' && context.redirect.startsWith('/') && !context.redirect.startsWith('//')
                    ? context.redirect
                    : '/cenik.html';
                const authMode = context.authMode === 'login' ? 'login' : 'register';
                const checkoutContext = {
                    ...context,
                    redirect: redirectTarget,
                    authMode
                };

                this.setPendingCheckout(planId, checkoutContext);
                this.queueCheckoutAuthRequiredEvent(planId, checkoutContext);

                const authUrl = new URL('/prihlaseni.html', window.location.origin);
                authUrl.searchParams.set('mode', authMode);
                authUrl.searchParams.set('redirect', redirectTarget);
                authUrl.searchParams.set('plan', planId);

                if (context.source) authUrl.searchParams.set('source', context.source);
                if (context.feature) authUrl.searchParams.set('feature', context.feature);
                appendCheckoutContextToAuthUrl(authUrl, checkoutContext);

                window.location.href = `${authUrl.pathname}${authUrl.search}`;
                return;
            }

            this._startCheckout(planId, context);
        },

        buildCheckoutRecoveryUrl(planId, context = {}, reason = 'session_failed') {
            const target = typeof context.redirect === 'string' && context.redirect.startsWith('/') && !context.redirect.startsWith('//')
                ? context.redirect
                : '/cenik.html';
            const url = new URL(target, window.location.origin);
            const metadata = context.metadata && typeof context.metadata === 'object' && !Array.isArray(context.metadata)
                ? context.metadata
                : {};
            const source = context.source || this.getPendingCheckoutContext().source || 'auth_pending_plan';
            const feature = context.feature || metadata.entry_feature || null;

            url.searchParams.set('payment', 'failure');
            url.searchParams.set('reason', reason);
            if (planId) url.searchParams.set('plan', planId);
            if (source) url.searchParams.set('source', source);
            if (feature) url.searchParams.set('feature', feature);
            const billingInterval = context.billing_interval || context.billingInterval || null;
            if (billingInterval) url.searchParams.set('billing_interval', String(billingInterval));

            const paramMap = {
                entry_source: 'entry_source',
                'entry_feature': 'entry_feature',
                utm_source: 'utm_source',
                utm_medium: 'utm_medium',
                utm_campaign: 'utm_campaign',
                utm_content: 'utm_content',
                requested_card: 'card',
                card_param: 'card'
            };

            Object.entries(paramMap).forEach(([key, param]) => {
                if (metadata[key] && !url.searchParams.has(param)) {
                    url.searchParams.set(param, String(metadata[key]));
                }
            });

            return `${url.pathname}${url.search}${url.hash}`;
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
                if (regBtn) {
                    regBtn.href = '/prihlaseni.html?mode=register&source=header_register&feature=account';
                }
                if (authBtn) {
                    authBtn.textContent = 'Přihlásit';
                    authBtn.href = '/prihlaseni.html?source=header_login';
                }
                setHidden(regBtn, false);
                setHidden(profileLink, true);

                // Mobile
                if (mobileRegBtn) {
                    mobileRegBtn.href = '/prihlaseni.html?mode=register&source=mobile_menu&feature=account';
                }
                if (mobileAuthBtn) {
                    mobileAuthBtn.textContent = 'Přihlásit se';
                    mobileAuthBtn.href = '/prihlaseni.html?source=mobile_menu_login';
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
                    if (hasStandaloneAuthHref(registerBtn)) {
                        return;
                    }
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
                    if (!this.isLoggedIn() && hasStandaloneAuthHref(authBtn)) {
                        return;
                    }
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

            // Forms (Static inside modal, safe to bind directly if modal exists)
            // But better to delegate too in case injectModal hasn't run yet? 
            // The modal is now injected lazily, so delegated listeners stay safest.
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
                const csrfToken = window.getCSRFToken ? await window.getCSRFToken() : null;
                const res = await fetch(`${API_URL}/auth/forgot-password`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(csrfToken && { 'X-CSRF-Token': csrfToken })
                    },
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
                setGdprRequirement(false);
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
                setGdprRequirement(true);
            } else {
                title.textContent = 'Přihlášení';
                btn.textContent = 'Přihlásit se';
                toggleBtn.textContent = 'Nemáte účet? Zaregistrujte se';
                setHidden(fields, true);
                setHidden(confirmPwField, true);
                setHidden(gdprWrapper, true);
                setGdprRequirement(false);
            }
        },


        openModal(mode = 'login') {
            // Auto-inject if missing
            if (!document.getElementById('auth-modal')) this.injectModal();
            this.bindModalListeners();

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
                    setGdprRequirement(true);
                } else {
                    title.textContent = 'Přihlášení';
                    btn.textContent = 'Přihlásit se';
                    toggleBtn.textContent = 'Nemáte účet? Zaregistrujte se';
                    setHidden(fields, true);
                    setHidden(confirmPwField, true);
                    setHidden(gdprWrapper, true);
                    setGdprRequirement(false);
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

            const csrfToken = window.getCSRFToken ? await window.getCSRFToken() : null;
            const res = await fetch(`${API_URL}/${endpoint}`, {
                method: 'POST',
                credentials: 'include', // Send auth_token cookie
                headers: {
                    'Content-Type': 'application/json',
                    ...(csrfToken && { 'X-CSRF-Token': csrfToken })
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
                const headers = { 'Content-Type': 'application/json' };
                const csrfToken = window.getCSRFToken ? await window.getCSRFToken() : null;
                if (csrfToken) headers['X-CSRF-Token'] = csrfToken;

                const res = await fetch(`${API_URL}/user/readings`, {
                    method: 'POST',
                    credentials: 'include', // Send auth_token cookie
                    headers,
                    body: JSON.stringify({ type, data })
                });

                if (!res.ok) {
                    const err = await res.json();
                    console.warn('Failed to save reading:', err);
                    return null;
                } else {
                    const savedData = await res.json();
                    const savedReading = savedData.reading || savedData;
                    window.MH_ANALYTICS?.trackEvent?.('feature_reading_saved', {
                        feature: type,
                        reading_type: type,
                        source: 'auth_save_reading',
                        has_saved_id: Boolean(savedReading?.id)
                    });

                    if (type !== 'journal') {
                        try {
                            if (!localStorage.getItem('mh_first_value_completed')) {
                                localStorage.setItem('mh_first_value_completed', '1');
                                window.MH_ANALYTICS?.trackEvent?.('first_value_completed', {
                                    feature: type,
                                    reading_type: type,
                                    source: 'auth_save_reading'
                                });
                            }
                        } catch {
                            window.MH_ANALYTICS?.trackEvent?.('first_value_completed', {
                                feature: type,
                                reading_type: type,
                                source: 'auth_save_reading'
                            });
                        }
                    }

                    window.dispatchEvent?.(new CustomEvent('reading:saved', {
                        detail: { reading: savedReading, type }
                    }));

                    return savedReading; // Return saved reading with ID
                }
            } catch (e) {
                console.error('Error saving reading:', e);
                return null;
            }
        },

        async saveReadingFeedback(readingId, feedback = {}) {
            if (!this.isLoggedIn() || !readingId) return null;

            try {
                const headers = { 'Content-Type': 'application/json' };
                const csrfToken = window.getCSRFToken ? await window.getCSRFToken() : null;
                if (csrfToken) headers['X-CSRF-Token'] = csrfToken;

                const res = await fetch(`${API_URL}/user/readings/${encodeURIComponent(readingId)}/feedback`, {
                    method: 'PATCH',
                    credentials: 'include',
                    headers,
                    body: JSON.stringify(feedback)
                });

                const result = await res.json().catch(() => ({}));
                if (!res.ok) {
                    console.warn('Failed to save reading feedback:', result);
                    return null;
                }

                window.MH_ANALYTICS?.trackEvent?.('reading_feedback_submitted', {
                    feature: feedback.feature || null,
                    resonance: feedback.resonance || null,
                    focus: feedback.focus || null,
                    next_action: feedback.nextAction || null,
                    source: feedback.source || 'reading_feedback'
                });

                return result;
            } catch (e) {
                console.error('Error saving reading feedback:', e);
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
                const checkoutMetadata = getCheckoutMetadataFromParams(new URLSearchParams(), {
                    ...context,
                    source
                });
                try {
                    window.MH_ANALYTICS?.trackCheckoutStarted?.(planId, {
                        ...checkoutMetadata,
                        source,
                        feature: context.feature || null
                    });
                } catch (analyticsError) {
                    console.warn('[FUNNEL] Checkout start analytics failed:', analyticsError.message);
                }
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
                        metadata: checkoutMetadata,
                        billingInterval: context.billing_interval || context.billingInterval || null
                    })
                });
                const data = await res.json();
                if (res.ok && data.url) {
                    this.clearPendingCheckout();
                    this.clearPostVerificationCheckout();
                    window.location.href = data.url;
                } else {
                    console.warn('Checkout session failed:', data);
                    this.clearPostVerificationCheckout();
                    window.location.href = this.buildCheckoutRecoveryUrl(planId, context, 'session_failed');
                }
            } catch (e) {
                console.error('Checkout error:', e);
                this.clearPostVerificationCheckout();
                window.location.href = this.buildCheckoutRecoveryUrl(planId, context, 'network_error');
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
