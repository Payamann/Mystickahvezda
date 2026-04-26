document.addEventListener('DOMContentLoaded', () => {
    const PLAN_COPY = {
        pruvodce: {
            title: 'Hvězdný Průvodce',
            copy: 'Odemknete plné výklady, natální kartu, numerologii a každodenní vedení bez limitu.'
        },
        osviceni: {
            title: 'Osvícení',
            copy: 'Pokračujete k pokročilým nástrojům, jako je astrokartografie a hlubší osobní analýzy.'
        },
        'vip-majestrat': {
            title: 'VIP Majestrát',
            copy: 'Pokračujete k nejvyšší hloubce, prioritě a osobní péči.'
        }
    };

    const FEATURE_LABELS = {
        astrocartography: 'Astrokartografie',
        synastry: 'Partnerská shoda',
        partnerska_detail: 'Detail partnerské shody',
        numerologie_vyklad: 'Numerologický výklad',
        natalni_interpretace: 'Interpretace natální karty',
        runy_hluboky_vyklad: 'Hloubkový výklad run',
        shamanske_kolo_plne_cteni: 'Plné čtení šamanského kola',
        minuly_zivot: 'Minulý život',
        kristalova_koule: 'Křišťálová koule',
        rituals: 'Lunární rituály',
        mentor: 'Hvězdný průvodce'
    };

    const loginForm = document.getElementById('login-form');
    const forgotPasswordForm = document.getElementById('forgot-password-form');
    const resetPasswordForm = document.getElementById('reset-password-form');
    const forgotPasswordLink = document.getElementById('forgot-password-link');
    const backToLoginBtn = document.getElementById('back-to-login');
    const loginHeader = document.getElementById('login-page-title');
    const loginSubtitle = document.getElementById('login-page-subtitle');
    const authModeWrapper = document.getElementById('auth-mode-toggle')?.parentElement;
    const authSubmitBtn = document.getElementById('auth-submit');
    const toggleBtn = document.getElementById('auth-mode-toggle');
    const socialProofEl = document.getElementById('login-social-proof');
    const confirmPwWrapper = document.getElementById('confirm-password-field-wrapper');
    const confirmPwInput = document.getElementById('confirm-password-reg');
    const registerFields = document.getElementById('register-fields');
    const gdprWrapper = document.getElementById('gdpr-consent-wrapper');
    const gdprConsent = document.getElementById('gdpr-consent');
    const checkoutContextBanner = document.getElementById('checkout-context-banner');
    const checkoutContextLabel = document.getElementById('checkout-context-label');
    const checkoutContextTitle = document.getElementById('checkout-context-title');
    const checkoutContextCopy = document.getElementById('checkout-context-copy');
    const urlParams = new URLSearchParams(window.location.search);
    const isResetMode = urlParams.get('reset') === 'true';
    const hash = window.location.hash;
    let isRegisterMode = urlParams.get('mode') === 'register' || urlParams.get('registrace') === '1';
    const redirectTarget = urlParams.get('redirect') || '/profil.html';
    const hasExplicitCheckoutContext = urlParams.has('plan') || urlParams.has('feature') || urlParams.has('source');
    const pendingPlan = !hasExplicitCheckoutContext
        ? (window.Auth?.getPendingCheckoutPlan?.() || sessionStorage.getItem('pending_plan') || null)
        : null;
    const pendingContext = !hasExplicitCheckoutContext
        ? (window.Auth?.getPendingCheckoutContext?.() || {})
        : {};
    const requestedPlan = urlParams.get('plan') || pendingPlan;
    const requestedFeature = urlParams.get('feature') || pendingContext.feature || null;
    const requestedSource = urlParams.get('source') || pendingContext.source || null;
    const requestedEmail = urlParams.get('email') || '';

    const hasPendingAuthRedirect = () => Boolean(
        sessionStorage.getItem('pending_plan')
        || sessionStorage.getItem('post_auth_activation')
        || sessionStorage.getItem('post_auth_redirect_pending')
    );

    const setBlockVisible = (element, visible) => {
        if (!element) return;
        element.hidden = !visible;
        element.classList.toggle('mh-block-visible', visible);
    };

    const renderCheckoutContext = () => {
        if (!checkoutContextBanner || !requestedPlan || !PLAN_COPY[requestedPlan]) {
            return;
        }

        const plan = PLAN_COPY[requestedPlan];
        const featureLabel = requestedFeature ? FEATURE_LABELS[requestedFeature] || requestedFeature : null;

        if (checkoutContextTitle) checkoutContextTitle.textContent = plan.title;
        if (checkoutContextCopy) {
            checkoutContextCopy.textContent = featureLabel
                ? `${featureLabel} vás přivedla sem. ${plan.copy}`
                : plan.copy;
        }
        if (checkoutContextLabel) {
            checkoutContextLabel.textContent = requestedSource ? 'Pokračujete k odemčení' : 'Pokračujete k plánu';
        }

        setBlockVisible(checkoutContextBanner, true);
    };

    const trackAuthView = (source = 'page_load') => {
        window.MH_ANALYTICS?.trackAuthViewed?.(isRegisterMode ? 'register' : 'login', {
            source,
            redirect_target: redirectTarget,
            pending_plan: pendingPlan
        });
    };

    const applyMode = () => {
        if (!authSubmitBtn) {
            return;
        }

        if (forgotPasswordLink) {
            setBlockVisible(forgotPasswordLink, !isRegisterMode);
        }

        if (isRegisterMode) {
            if (loginHeader) loginHeader.textContent = 'Začněte svou cestu';
            if (loginSubtitle) loginSubtitle.textContent = 'Registrace je zdarma a zabere jen chvilku. Datum narození doplníte až ve chvíli, kdy budete chtít osobní výklad.';
            setBlockVisible(socialProofEl, true);
            setBlockVisible(confirmPwWrapper, true);
            setBlockVisible(registerFields, false);
            setBlockVisible(gdprWrapper, true);
            if (confirmPwInput) confirmPwInput.required = true;
            if (gdprConsent) gdprConsent.required = true;
            authSubmitBtn.textContent = 'Zaregistrovat';
            if (toggleBtn) toggleBtn.textContent = 'Máte účet? Přihlaste se';
        } else {
            if (loginHeader) loginHeader.textContent = 'Vítejte zpět';
            if (loginSubtitle) loginSubtitle.textContent = 'Přihlaste se ke svému účtu a pokračujte tam, kde jste skončili.';
            setBlockVisible(socialProofEl, false);
            setBlockVisible(confirmPwWrapper, false);
            setBlockVisible(registerFields, false);
            setBlockVisible(gdprWrapper, false);
            if (confirmPwInput) {
                confirmPwInput.required = false;
                confirmPwInput.value = '';
            }
            if (gdprConsent) {
                gdprConsent.required = false;
                gdprConsent.checked = false;
            }
            authSubmitBtn.textContent = 'Přihlásit se';
            if (toggleBtn) toggleBtn.textContent = 'Nemáte účet? Zaregistrujte se zdarma →';
        }

        const emailInput = document.getElementById('email');
        if (emailInput && requestedEmail && !emailInput.value) {
            emailInput.value = requestedEmail;
        }
    };

    if (isResetMode && hash) {
        setBlockVisible(loginForm, false);
        setBlockVisible(forgotPasswordForm, false);
        setBlockVisible(resetPasswordForm, true);
        setBlockVisible(forgotPasswordLink, false);
        setBlockVisible(authModeWrapper, false);
        if (loginHeader) loginHeader.textContent = 'Obnovení hesla';
        if (loginSubtitle) loginSubtitle.textContent = 'Zadejte nové heslo a vraťte se zpět do svého účtu.';
    } else {
        applyMode();
        renderCheckoutContext();
        trackAuthView();
    }

    loginForm?.addEventListener('submit', async (event) => {
        event.preventDefault();

        const email = document.getElementById('email')?.value?.trim();
        const password = document.getElementById('password')?.value || '';

        if (!window.Auth || !authSubmitBtn) {
            return;
        }

        authSubmitBtn.disabled = true;
        const originalText = authSubmitBtn.textContent;
        authSubmitBtn.textContent = isRegisterMode ? 'Registruji...' : 'Přihlašuji...';

        try {
            if (isRegisterMode) {
                const confirmPassword = confirmPwInput?.value || '';

                if (password !== confirmPassword) {
                    throw new Error('Hesla se neshodují.');
                }

                const result = await window.Auth.register(email, password, {
                    password_confirm: confirmPassword
                });

                if (!result.success) {
                    throw new Error(result.error || 'Registrace se nepodařila.');
                }

                window.MH_ANALYTICS?.trackAuthCompleted?.('register', {
                    method: 'email',
                    redirect_target: redirectTarget,
                    pending_plan: pendingPlan
                });
            } else {
                const result = await window.Auth.login(email, password);
                if (!result.success) {
                    throw new Error(result.error || 'Přihlášení se nepodařilo.');
                }

                window.MH_ANALYTICS?.trackAuthCompleted?.('login', {
                    method: 'email',
                    redirect_target: redirectTarget,
                    pending_plan: pendingPlan
                });

                window.Auth.showToast?.('Vítejte zpět', 'Byli jste úspěšně přihlášeni.', 'success');
            }
        } catch (error) {
            window.Auth.showToast?.('Chyba', error.message, 'error');
        } finally {
            authSubmitBtn.disabled = false;
            authSubmitBtn.textContent = originalText;
        }
    });

    forgotPasswordLink?.addEventListener('click', () => {
        setBlockVisible(loginForm, false);
        setBlockVisible(forgotPasswordForm, true);
        setBlockVisible(forgotPasswordLink, false);
        setBlockVisible(authModeWrapper, false);
        if (loginHeader) loginHeader.textContent = 'Zapomenuté heslo';
        if (loginSubtitle) loginSubtitle.textContent = 'Pošleme vám odkaz pro nastavení nového hesla.';
    });

    backToLoginBtn?.addEventListener('click', () => {
        setBlockVisible(loginForm, true);
        setBlockVisible(forgotPasswordForm, false);
        setBlockVisible(authModeWrapper, true);
        applyMode();
    });

    forgotPasswordForm?.addEventListener('submit', async (event) => {
        event.preventDefault();
        const email = document.getElementById('forgot-email')?.value;
        const submitBtn = forgotPasswordForm.querySelector('button[type="submit"]');
        const originalText = submitBtn?.textContent;

        if (!submitBtn) {
            return;
        }

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
                window.trackEvent?.('password_reset_requested', {
                    source: 'forgot_password_form'
                });
                window.Auth?.showToast?.('E-mail odeslán', data.message, 'success');
                backToLoginBtn?.click();
            } else {
                throw new Error(data.error || 'Nepodařilo se odeslat e-mail s obnovou hesla.');
            }
        } catch (error) {
            window.Auth?.showToast?.('Chyba', error.message, 'error');
        } finally {
            submitBtn.textContent = originalText || 'Odeslat odkaz pro obnovu';
            submitBtn.disabled = false;
        }
    });

    resetPasswordForm?.addEventListener('submit', async (event) => {
        event.preventDefault();
        const newPassword = document.getElementById('new-password')?.value;
        const confirmPassword = document.getElementById('confirm-password')?.value;

        if (newPassword !== confirmPassword) {
            window.Auth?.showToast?.('Chyba', 'Hesla se neshodují.', 'error');
            return;
        }

        const submitBtn = resetPasswordForm.querySelector('button[type="submit"]');
        const originalText = submitBtn?.textContent;

        if (!submitBtn) {
            return;
        }

        submitBtn.textContent = 'Ukládám...';
        submitBtn.disabled = true;

        try {
            const hashParams = new URLSearchParams(hash.substring(1));
            const accessToken = hashParams.get('access_token');

            if (!accessToken) {
                throw new Error('Neplatný odkaz pro obnovení hesla.');
            }

            const csrfToken = window.getCSRFToken ? await window.getCSRFToken() : null;
            const response = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`,
                    ...(csrfToken && { 'X-CSRF-Token': csrfToken })
                },
                body: JSON.stringify({ password: newPassword })
            });

            const data = await response.json();

            if (data.success) {
                window.trackEvent?.('password_reset_completed', {
                    source: 'reset_password_form'
                });
                window.Auth?.showToast?.('Úspěch', 'Heslo bylo změněno. Můžete se přihlásit.', 'success');
                window.location.href = '/prihlaseni.html';
            } else {
                throw new Error(data.error || 'Nepodařilo se změnit heslo.');
            }
        } catch (error) {
            window.Auth?.showToast?.('Chyba', error.message, 'error');
        } finally {
            submitBtn.textContent = originalText || 'Nastavit nové heslo';
            submitBtn.disabled = false;
        }
    });

    toggleBtn?.addEventListener('click', () => {
        isRegisterMode = !isRegisterMode;
        applyMode();
        trackAuthView('toggle');
    });

    setTimeout(() => {
        if (window.Auth?.isLoggedIn()) {
            if (hasPendingAuthRedirect()) {
                return;
            }

            const redirect = urlParams.get('redirect');
            if (redirect && redirect.startsWith('/') && !redirect.startsWith('//')) {
                window.location.href = redirect;
            } else {
                window.location.href = '/profil.html';
            }
        }
    }, 500);
});

document.addEventListener('auth:changed', () => {
    if (window.Auth?.isLoggedIn()) {
        if (sessionStorage.getItem('pending_plan')
            || sessionStorage.getItem('post_auth_activation')
            || sessionStorage.getItem('post_auth_redirect_pending')) {
            return;
        }

        const urlParams = new URLSearchParams(window.location.search);
        let redirect = urlParams.get('redirect') || '/profil.html';

        if (!redirect.startsWith('/') || redirect.startsWith('//')) {
            redirect = '/profil.html';
        }

        if (!redirect.includes('prihlaseni')) {
            window.location.href = redirect;
        }
    }
});
