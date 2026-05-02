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
        account: 'Účet zdarma',
        astrocartography: 'Astrokartografie',
        daily_guidance: 'Denní vedení',
        weekly_horoscope: 'Týdenní horoskop',
        monthly_horoscope: 'Měsíční horoskop',
        horoskopy: 'Horoskopy',
        premium_membership: 'Premium členství',
        subscription_management: 'Správa předplatného',
        vip_membership: 'VIP členství',
        tarot: 'Tarot',
        tarot_daily_card_profile_save: 'Tarot karta dne',
        tarot_multi_card: 'Vícekartový tarot',
        daily_angel_card: 'Andělská karta dne',
        andelske_karty_hluboky_vhled: 'Andělské karty',
        synastry: 'Partnerská shoda',
        partnerska_detail: 'Detail partnerské shody',
        numerologie_vyklad: 'Numerologický výklad',
        numerology: 'Numerologický výklad',
        annual_horoscope: 'Roční horoskop na míru',
        personal_map: 'Osobní mapa',
        natalni_interpretace: 'Interpretace natální karty',
        runy_hluboky_vyklad: 'Hloubkový výklad run',
        shamanske_kolo_plne_cteni: 'Plné čtení šamanského kola',
        minuly_zivot: 'Minulý život',
        kristalova_koule: 'Křišťálová koule',
        rituals: 'Lunární rituály',
        mentor: 'Hvězdný průvodce',
        hvezdny_mentor: 'Hvězdný průvodce',
        angel_card_deep: 'Andělské karty',
        crystal_ball_unlimited: 'Křišťálová koule',
        journal_insights: 'Vzorce v deníku',
        medicine_wheel: 'Šamanské kolo',
        natal_chart: 'Natální karta',
        past_life: 'Minulý život',
        runes_deep_reading: 'Hloubkový výklad run',
        tarot_celtic_cross: 'Keltský kříž'
    };

    const SIGNUP_CONTEXT_BY_FEATURE = {
        account: {
            title: 'Účet zdarma bez zdržení',
            copy: 'Po registraci vás provedeme prvním nastavením a pošleme k osobnímu výkladu, který dává smysl jako první.',
            stepTitle: 'Otevřeme první osobní krok',
            stepCopy: 'Začnete krátkým výběrem znamení a hned potom konkrétním výkladem.'
        },
        premium_membership: {
            title: 'Premium bez ztráty kontextu',
            copy: 'Po registraci vás vrátíme k plánu, který jste si vybrali, aby šlo pokračovat bez hledání.',
            stepTitle: 'Vrátíme vás k vybranému plánu',
            stepCopy: 'Registrace drží plán i zdroj kliknutí, takže další krok zůstane jasný.'
        },
        subscription_management: {
            title: 'Předplatné bez ztráty kontextu',
            copy: 'Po přihlášení nebo registraci se vrátíte ke správě předplatného a dalšímu kroku kolem plánu.',
            stepTitle: 'Vrátíme vás ke správě plánu',
            stepCopy: 'Kontext plánu zůstane zachovaný i po dokončení auth kroku.'
        },
        vip_membership: {
            title: 'VIP členství bez ztráty kontextu',
            copy: 'Po registraci budete pokračovat k VIP plánu a nejvyšší úrovni osobního vedení.',
            stepTitle: 'Vrátíme vás k VIP plánu',
            stepCopy: 'Neztratíte cestu z homepage ani plán, který jste otevřeli.'
        },
        astrocartography: {
            title: 'Astrokartografie po registraci',
            copy: 'Po vytvoření účtu budete pokračovat k astro mapě a místům, která s vámi astrologicky rezonují.',
            stepTitle: 'Otevřeme astro mapu',
            stepCopy: 'Začnete nástrojem, kvůli kterému jste klikli.'
        },
        daily_guidance: {
            title: 'Denní vedení po registraci',
            copy: 'Po vytvoření účtu vás pošleme rovnou na horoskopy, kde získáte první osobní vhled.',
            stepTitle: 'Otevřeme denní horoskopy',
            stepCopy: 'Začnete tím nejrychlejším: dnešním vedením bez čekání.'
        },
        horoskopy: {
            title: 'Osobní horoskopy po registraci',
            copy: 'Po vytvoření účtu budete pokračovat na horoskopy a vezmete si první denní vhled.',
            stepTitle: 'Otevřeme osobní horoskopy',
            stepCopy: 'První hodnota přijde hned po registraci, ne až v profilu.'
        },
        weekly_horoscope: {
            title: 'Týdenní horoskop po registraci',
            copy: 'Po vytvoření účtu budete pokračovat k horoskopům a můžete otevřít širší týdenní vedení.',
            stepTitle: 'Otevřeme horoskopy',
            stepCopy: 'Začnete denním vhledem a snadno přejdete na týdenní vedení.'
        },
        monthly_horoscope: {
            title: 'Měsíční horoskop po registraci',
            copy: 'Po vytvoření účtu budete pokračovat k horoskopům a můžete otevřít širší měsíční vedení.',
            stepTitle: 'Otevřeme horoskopy',
            stepCopy: 'Začnete denním vhledem a snadno přejdete na měsíční vedení.'
        },
        tarot: {
            title: 'Tarotový výklad po registraci',
            copy: 'Po vytvoření účtu budete pokračovat k tarotu a můžete si rovnou položit první otázku.',
            stepTitle: 'Otevřeme tarotový výklad',
            stepCopy: 'Navážete přímo na záměr, se kterým jste přišli.'
        },
        tarot_daily_card_profile_save: {
            title: 'Uložte kartu dne do profilu',
            copy: 'Vytvořte si účet zdarma a vraťte se ke stejné kartě dne, aby nezmizela jen jako jednorázový náhodný vhled.',
            stepTitle: 'Vrátíme vás ke kartě dne',
            stepCopy: 'Po registraci pokračujete u stejného symbolu a můžete si výklad uložit do profilu.'
        },
        tarot_multi_card: {
            title: 'Vícekartový tarot po registraci',
            copy: 'Po vytvoření účtu se vrátíte k tarotu a můžete pokračovat v hlubším výkladu.',
            stepTitle: 'Otevřeme vícekartový tarot',
            stepCopy: 'Registrace naváže na výklad, který jste chtěli odemknout.'
        },
        daily_angel_card: {
            title: 'Andělská karta po registraci',
            copy: 'Po vytvoření účtu se vrátíte k denní kartě a můžete si uložit svůj první vhled.',
            stepTitle: 'Vrátíme vás k andělské kartě',
            stepCopy: 'Nepřijdete o poselství, kvůli kterému jste klikli.'
        },
        andelske_karty_hluboky_vhled: {
            title: 'Andělské karty po registraci',
            copy: 'Po vytvoření účtu se vrátíte k andělským kartám a můžete pokračovat v hlubším výkladu.',
            stepTitle: 'Vrátíme vás k andělským kartám',
            stepCopy: 'Registrace drží kontext výkladu a otevře další krok.'
        },
        partnerska_detail: {
            title: 'Partnerská shoda po registraci',
            copy: 'Po vytvoření účtu budete pokračovat k partnerské shodě bez hledání správné stránky.',
            stepTitle: 'Otevřeme partnerskou shodu',
            stepCopy: 'Začnete rovnou tam, kde vzniká první osobní výsledek.'
        },
        natalni_interpretace: {
            title: 'Natální karta po registraci',
            copy: 'Po vytvoření účtu vás navedeme na natální kartu a první osobní interpretaci.',
            stepTitle: 'Otevřeme natální kartu',
            stepCopy: 'Datum narození doplníte až v nástroji, který ho opravdu potřebuje.'
        },
        numerologie_vyklad: {
            title: 'Numerologie po registraci',
            copy: 'Po vytvoření účtu budete pokračovat k numerologii a prvnímu osobnímu výkladu.',
            stepTitle: 'Otevřeme numerologii',
            stepCopy: 'První vhled dostanete z konkrétního nástroje, ne z prázdného profilu.'
        },
        annual_horoscope: {
            title: 'Roční horoskop po registraci',
            copy: 'Po vytvoření účtu budete pokračovat k ročnímu horoskopu a výhledu, který naváže na vaše osobní datum.',
            stepTitle: 'Otevřeme roční horoskop',
            stepCopy: 'Navážete na výpočet, který jste si vybrali, místo obecného profilu.'
        },
        personal_map: {
            title: 'Osobní mapa po registraci',
            copy: 'Po vytvoření účtu budete pokračovat k osobní mapě a hlubšímu rozboru vlastního směru.',
            stepTitle: 'Otevřeme osobní mapu',
            stepCopy: 'Registrace vás vrátí k hlubšímu výstupu, kvůli kterému jste klikli.'
        },
        runy_hluboky_vyklad: {
            title: 'Runy po registraci',
            copy: 'Po vytvoření účtu se vrátíte k runám a můžete pokračovat v hlubším výkladu.',
            stepTitle: 'Otevřeme runový výklad',
            stepCopy: 'Registrace naváže na otázku, kvůli které jste přišli.'
        },
        shamanske_kolo_plne_cteni: {
            title: 'Šamanské kolo po registraci',
            copy: 'Po vytvoření účtu se vrátíte k šamanskému kolu a můžete pokračovat v plném čtení.',
            stepTitle: 'Otevřeme šamanské kolo',
            stepCopy: 'Navážete na výklad, který jste si vybrali.'
        },
        minuly_zivot: {
            title: 'Minulý život po registraci',
            copy: 'Po vytvoření účtu se vrátíte k výkladu minulého života a můžete pokračovat bez ztráty kontextu.',
            stepTitle: 'Otevřeme minulý život',
            stepCopy: 'Začnete přímo funkcí, která slibuje nejhlubší první zážitek.'
        },
        kristalova_koule: {
            title: 'Křišťálová koule po registraci',
            copy: 'Po vytvoření účtu se vrátíte ke křišťálové kouli a můžete položit první osobní otázku.',
            stepTitle: 'Otevřeme křišťálovou kouli',
            stepCopy: 'Registrace vás nepřesměruje do prázdného profilu, ale zpět k otázce.'
        },
        mentor: {
            title: 'Hvězdný průvodce po registraci',
            copy: 'Po vytvoření účtu budete pokračovat k průvodci a můžete položit první otázku.',
            stepTitle: 'Otevřeme Hvězdného průvodce',
            stepCopy: 'První kontakt s produktem začne okamžitou otázkou.'
        }
    };

    Object.assign(SIGNUP_CONTEXT_BY_FEATURE, {
        hvezdny_mentor: SIGNUP_CONTEXT_BY_FEATURE.mentor,
        angel_card_deep: SIGNUP_CONTEXT_BY_FEATURE.andelske_karty_hluboky_vhled,
        crystal_ball_unlimited: SIGNUP_CONTEXT_BY_FEATURE.kristalova_koule,
        journal_insights: SIGNUP_CONTEXT_BY_FEATURE.mentor,
        medicine_wheel: SIGNUP_CONTEXT_BY_FEATURE.shamanske_kolo_plne_cteni,
        natal_chart: SIGNUP_CONTEXT_BY_FEATURE.natalni_interpretace,
        numerology: SIGNUP_CONTEXT_BY_FEATURE.numerologie_vyklad,
        past_life: SIGNUP_CONTEXT_BY_FEATURE.minuly_zivot,
        runes_deep_reading: SIGNUP_CONTEXT_BY_FEATURE.runy_hluboky_vyklad,
        synastry: SIGNUP_CONTEXT_BY_FEATURE.partnerska_detail,
        tarot_celtic_cross: SIGNUP_CONTEXT_BY_FEATURE.tarot_multi_card,
        rituals: {
            title: 'Lunární rituály po registraci',
            copy: 'Po vytvoření účtu budete pokračovat k rituálům a můžete začít osobní praxí podle aktuální energie.',
            stepTitle: 'Otevřeme lunární rituály',
            stepCopy: 'První krok povede rovnou k praxi, ne do prázdného profilu.'
        }
    });

    const SIGNUP_CONTEXT_BY_SOURCE = {
        homepage_hero: SIGNUP_CONTEXT_BY_FEATURE.daily_guidance,
        pricing_free_cta: {
            title: 'Začínáte zdarma',
            copy: 'Vytvoříte si účet bez platební karty a potom vás pošleme na první denní horoskop.',
            stepTitle: 'Otevřeme bezplatný denní vhled',
            stepCopy: 'Uvidíte, co účet zdarma umí, dřív než řešíte placený plán.'
        },
        homepage_pricing_free_cta: {
            title: 'Začínáte zdarma',
            copy: 'Vytvoříte si účet bez platební karty a potom pokračujete k dennímu vedení.',
            stepTitle: 'Otevřeme denní horoskopy',
            stepCopy: 'První hodnota přijde hned po registraci.'
        },
        newsletter_form: SIGNUP_CONTEXT_BY_FEATURE.daily_guidance,
        newsletter_popup: SIGNUP_CONTEXT_BY_FEATURE.daily_guidance,
        tarot_daily_card_profile_save: SIGNUP_CONTEXT_BY_FEATURE.tarot_daily_card_profile_save
    };

    const SIGNUP_CONTEXT_BY_REDIRECT = {
        '/horoskopy.html': SIGNUP_CONTEXT_BY_FEATURE.daily_guidance,
        '/tarot.html': SIGNUP_CONTEXT_BY_FEATURE.tarot,
        '/andelske-karty.html': SIGNUP_CONTEXT_BY_FEATURE.daily_angel_card,
        '/partnerska-shoda.html': SIGNUP_CONTEXT_BY_FEATURE.partnerska_detail,
        '/natalni-karta.html': SIGNUP_CONTEXT_BY_FEATURE.natalni_interpretace,
        '/numerologie.html': SIGNUP_CONTEXT_BY_FEATURE.numerologie_vyklad,
        '/rocni-horoskop.html': SIGNUP_CONTEXT_BY_FEATURE.annual_horoscope,
        '/osobni-mapa.html': SIGNUP_CONTEXT_BY_FEATURE.personal_map,
        '/mentor.html': SIGNUP_CONTEXT_BY_FEATURE.mentor
    };

    const GENERIC_SIGNUP_CONTEXT = {
        title: 'Účet zdarma bez zdržení',
        copy: 'Po registraci vás navedeme k prvnímu osobnímu výkladu. Nepotřebujeme platební kartu ani dlouhý dotazník.',
        stepTitle: 'Otevřeme první osobní výklad',
        stepCopy: 'Začnete produktem, ne prázdnou administrací.'
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
    const passwordInput = document.getElementById('password');
    const passwordHelp = document.getElementById('password-help');
    const confirmPwWrapper = document.getElementById('confirm-password-field-wrapper');
    const confirmPwInput = document.getElementById('confirm-password-reg');
    const registerFields = document.getElementById('register-fields');
    const gdprWrapper = document.getElementById('gdpr-consent-wrapper');
    const gdprConsent = document.getElementById('gdpr-consent');
    const signupValuePanel = document.getElementById('signup-value-panel');
    const signupNextStepTitle = document.getElementById('signup-next-step-title');
    const signupNextStepCopy = document.getElementById('signup-next-step-copy');
    const signupSafetyNote = document.getElementById('signup-safety-note');
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

    const getSafeRedirectTarget = () => (
        redirectTarget.startsWith('/') && !redirectTarget.startsWith('//')
            ? redirectTarget
            : '/profil.html'
    );

    const getSignupContext = () => (
        SIGNUP_CONTEXT_BY_FEATURE[requestedFeature]
        || SIGNUP_CONTEXT_BY_SOURCE[requestedSource]
        || SIGNUP_CONTEXT_BY_REDIRECT[getSafeRedirectTarget()]
        || GENERIC_SIGNUP_CONTEXT
    );

    const renderSignupValuePanel = () => {
        const context = getSignupContext();
        if (signupNextStepTitle) signupNextStepTitle.textContent = context.stepTitle;
        if (signupNextStepCopy) signupNextStepCopy.textContent = context.stepCopy;
    };

    const renderCheckoutContext = () => {
        if (!checkoutContextBanner) return;

        const plan = requestedPlan ? PLAN_COPY[requestedPlan] : null;
        const featureLabel = requestedFeature ? FEATURE_LABELS[requestedFeature] || requestedFeature : null;

        if (plan) {
            if (checkoutContextTitle) checkoutContextTitle.textContent = plan.title;
            if (checkoutContextCopy) {
                checkoutContextCopy.textContent = featureLabel
                    ? `Navazujete na funkci: ${featureLabel}. ${plan.copy}`
                    : plan.copy;
            }
            if (checkoutContextLabel) {
                checkoutContextLabel.textContent = requestedSource ? 'Pokračujete k odemčení' : 'Pokračujete k plánu';
            }
            setBlockVisible(checkoutContextBanner, true);
            return;
        }

        const shouldShowActivationContext = isRegisterMode && (
            requestedFeature
            || requestedSource
            || getSafeRedirectTarget() !== '/profil.html'
        );

        if (!shouldShowActivationContext) {
            setBlockVisible(checkoutContextBanner, false);
            return;
        }

        const context = getSignupContext();
        if (checkoutContextLabel) checkoutContextLabel.textContent = featureLabel || 'První hodnota';
        if (checkoutContextTitle) checkoutContextTitle.textContent = context.title;
        if (checkoutContextCopy) checkoutContextCopy.textContent = context.copy;
        setBlockVisible(checkoutContextBanner, true);
    };

    const trackAuthView = (source = 'page_load') => {
        window.MH_ANALYTICS?.trackAuthViewed?.(isRegisterMode ? 'register' : 'login', {
            source,
            redirect_target: redirectTarget,
            pending_plan: pendingPlan
        });
    };

    const bindPasswordToggles = () => {
        document.querySelectorAll('[data-password-toggle]').forEach((button) => {
            if (button.dataset.bound === 'true') return;
            button.dataset.bound = 'true';

            button.addEventListener('click', () => {
                const input = document.getElementById(button.dataset.passwordToggle);
                if (!input) return;

                const nextType = input.type === 'password' ? 'text' : 'password';
                input.type = nextType;
                const isVisible = nextType === 'text';
                button.textContent = isVisible ? 'Skrýt' : 'Zobrazit';
                button.setAttribute('aria-pressed', isVisible ? 'true' : 'false');
                button.setAttribute('aria-label', isVisible ? 'Skrýt heslo' : 'Zobrazit heslo');
            });
        });
    };

    const applyMode = () => {
        if (!authSubmitBtn) {
            return;
        }

        document.body.classList.toggle('auth-register-mode', isRegisterMode);

        if (forgotPasswordLink) {
            setBlockVisible(forgotPasswordLink, !isRegisterMode);
        }

        if (isRegisterMode) {
            renderSignupValuePanel();
            if (loginHeader) loginHeader.textContent = 'Vytvořte si účet zdarma';
            if (loginSubtitle) loginSubtitle.textContent = 'Stačí e-mail a heslo. Platební kartu nevyžadujeme a osobní údaje doplníte až u výkladu, který je opravdu potřebuje.';
            setBlockVisible(socialProofEl, true);
            setBlockVisible(signupValuePanel, true);
            setBlockVisible(passwordHelp, true);
            setBlockVisible(signupSafetyNote, true);
            setBlockVisible(confirmPwWrapper, true);
            setBlockVisible(registerFields, false);
            setBlockVisible(gdprWrapper, true);
            if (passwordInput) {
                passwordInput.autocomplete = 'new-password';
                passwordInput.minLength = 8;
            }
            if (confirmPwInput) confirmPwInput.required = true;
            if (confirmPwInput) confirmPwInput.minLength = 8;
            if (gdprConsent) gdprConsent.required = true;
            authSubmitBtn.textContent = 'Vytvořit účet zdarma';
            if (toggleBtn) toggleBtn.textContent = 'Máte účet? Přihlaste se';
        } else {
            if (loginHeader) loginHeader.textContent = 'Vítejte zpět';
            if (loginSubtitle) loginSubtitle.textContent = 'Přihlaste se ke svému účtu a pokračujte tam, kde jste skončili.';
            setBlockVisible(socialProofEl, false);
            setBlockVisible(signupValuePanel, false);
            setBlockVisible(passwordHelp, false);
            setBlockVisible(signupSafetyNote, false);
            setBlockVisible(confirmPwWrapper, false);
            setBlockVisible(registerFields, false);
            setBlockVisible(gdprWrapper, false);
            if (passwordInput) {
                passwordInput.autocomplete = 'current-password';
                passwordInput.removeAttribute('minlength');
            }
            if (confirmPwInput) {
                confirmPwInput.required = false;
                confirmPwInput.removeAttribute('minlength');
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

        renderCheckoutContext();
    };

    bindPasswordToggles();

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

                if (password.length < 8) {
                    throw new Error('Heslo musí mít alespoň 8 znaků.');
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
