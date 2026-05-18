(() => {
    const isStandaloneAuthPage = () => document.body.classList.contains('page-login');

    const setText = (selector, value) => {
        const el = document.querySelector(selector);
        if (el) el.textContent = value;
    };

    const patchModalTexts = () => {
        setText('#auth-title', 'Přihlášení');
        setText('#auth-submit', 'Přihlásit se');
        setText('#auth-mode-toggle', 'Nemáte účet? Zaregistrujte se');
        setText('#auth-forgot-password', 'Zapomněli jste heslo?');
        setText('#password-field-wrapper label', 'Heslo');
        setText('#confirm-password-field-wrapper label', 'Potvrďte heslo');
        setText('#reset-password-fields p', 'Zadejte svůj e-mail a pošleme vám odkaz pro obnovení hesla.');

        const registerLabels = document.querySelectorAll('#register-fields label');
        if (registerLabels[0]) registerLabels[0].textContent = 'Datum narození';

        const close = document.querySelector('.modal__close');
        if (close) {
            close.textContent = 'x';
            close.setAttribute('aria-label', 'Zavřít');
        }
    };

    const patchAuthUi = () => {
        const authBtn = document.getElementById('auth-btn');
        const mobileAuthBtn = document.getElementById('mobile-auth-btn');
        const premiumLogged = authBtn?.innerHTML?.includes('Premium');

        if (authBtn) {
            authBtn.innerHTML = premiumLogged
                ? 'Odhlásit <span class="auth-premium-label">(Premium)</span>'
                : 'Přihlásit';
        }

        if (document.cookie.includes('logged_in=1') || window.Auth?.user) {
            if (authBtn) {
                authBtn.innerHTML = window.Auth?.isPremium?.()
                    ? 'Odhlásit <span class="auth-premium-label">(Premium)</span>'
                    : 'Odhlásit';
            }
            if (mobileAuthBtn) mobileAuthBtn.textContent = 'Odhlásit se';
        } else {
            if (authBtn) authBtn.textContent = 'Přihlásit';
            if (mobileAuthBtn) mobileAuthBtn.textContent = 'Přihlásit se';
        }
    };

    const normalizeToast = (title, message) => {
        const compactTitle = String(title || '').toLowerCase();
        const compactMessage = String(message || '').toLowerCase();

        if (compactTitle.startsWith('ov')) {
            return ['Ověřeno', 'Váš e-mail byl úspěšně ověřen. Nyní se můžete přihlásit.'];
        }
        if (compactTitle.includes('email') && compactTitle.includes('odes')) {
            return ['E-mail odeslán', 'Zkontrolujte svou schránku pro odkaz na obnovení hesla.'];
        }
        if (compactTitle.includes('email')) {
            return ['Ověření e-mailu', 'Pro dokončení registrace potvrďte prosím svůj e-mail.'];
        }
        if (compactTitle.includes('premium')) {
            return ['Premium vyžadováno', 'Tato funkce vyžaduje premium účet.'];
        }
        if (compactTitle.includes('odhl')) {
            return ['Odhlášení z jiného okna', 'Byli jste odhlášeni z jiného okna prohlížeče.'];
        }
        if (compactTitle.includes('prihl') && compactTitle.includes('chyba')) {
            return ['Chyba přihlášení', message];
        }
        if (compactTitle.includes('pripoj')) {
            return ['Chyba připojení', 'Zkontrolujte připojení k internetu.'];
        }
        if (compactTitle.includes('obnov')) {
            return ['Obnovení hesla', 'Zadejte svůj e-mail a pošleme vám odkaz pro obnovení hesla.'];
        }
        if (compactTitle.includes('vitejte') && compactMessage.includes('registro')) {
            return ['Vítejte', 'Registrace proběhla úspěšně.'];
        }
        if (compactTitle.includes('vitejte')) {
            return ['Vítejte zpět', 'Byli jste úspěšně přihlášeni.'];
        }
        if (compactTitle.includes('chyba') && compactMessage.includes('over')) {
            return ['Chyba ověření', 'Odkaz je neplatný nebo vypršel.'];
        }

        return [title, message];
    };

    const patchAuth = () => {
        if (!window.Auth || window.Auth.__copyFixesApplied) return;

        const originalShowToast = window.Auth.showToast?.bind(window.Auth);
        if (originalShowToast) {
            window.Auth.showToast = (title, message, type = 'info') => {
                const [nextTitle, nextMessage] = normalizeToast(title, message);
                return originalShowToast(nextTitle, nextMessage, type);
            };
        }

        const wrap = (methodName, after) => {
            const original = window.Auth[methodName]?.bind(window.Auth);
            if (!original) return;
            window.Auth[methodName] = (...args) => {
                const result = original(...args);
                after(...args);
                return result;
            };
        };

        wrap('openModal', (mode) => {
            patchModalTexts();

            if (mode === 'register') {
                setText('#auth-title', 'Registrace');
                setText('#auth-submit', 'Zaregistrovat');
                setText('#auth-mode-toggle', 'Již máte účet? Přihlaste se');
            }
        });
        wrap('openForgotPassword', () => {
            setText('#auth-title', 'Obnovení hesla');
            setText('#auth-submit', 'Odeslat odkaz');
            setText('#auth-mode-toggle', 'Zpět na přihlášení');
            patchModalTexts();
        });
        wrap('toggleMode', () => {
            patchModalTexts();

            const title = document.getElementById('auth-title');
            const submit = document.getElementById('auth-submit');
            const toggle = document.getElementById('auth-mode-toggle');
            const isRegister = submit?.textContent?.toLowerCase().includes('zaregistrovat');

            if (isRegister) {
                if (title) title.textContent = 'Registrace';
                if (toggle) toggle.textContent = 'Již máte účet? Přihlaste se';
            } else if (submit?.dataset?.mode === 'reset') {
                if (title) title.textContent = 'Obnovení hesla';
                if (submit) submit.textContent = 'Odeslat odkaz';
                if (toggle) toggle.textContent = 'Zpět na přihlášení';
            } else {
                if (title) title.textContent = 'Přihlášení';
                if (submit) submit.textContent = 'Přihlásit se';
                if (toggle) toggle.textContent = 'Nemáte účet? Zaregistrujte se';
            }
        });
        wrap('updateUI', patchAuthUi);

        window.Auth.__copyFixesApplied = true;
        patchModalTexts();
        patchAuthUi();
    };

    document.addEventListener('DOMContentLoaded', () => {
        if (isStandaloneAuthPage()) return;

        patchModalTexts();
        patchAuthUi();

        const interval = window.setInterval(() => {
            patchAuth();
            if (window.Auth?.__copyFixesApplied) window.clearInterval(interval);
        }, 100);

        window.setTimeout(() => window.clearInterval(interval), 5000);
    });

    document.addEventListener('auth:changed', patchAuthUi);
    document.addEventListener('components:loaded', patchAuthUi);
})();
