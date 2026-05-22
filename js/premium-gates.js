// ============================================
// PAYWALL & PREMIUM UI COMPONENTS
// ============================================

window.Premium = {
    _planManifestPromise: null,
    _plansById: new Map(),
    _featurePlanMap: {},

    _escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    _hasLoginCookie() {
        return document.cookie.split(';').some((part) => part.trim() === 'logged_in=1');
    },

    async checkStatus() {
        if (window.Auth?.isPremium?.()) {
            if (window.MH_DEBUG) console.debug('Premium verified locally');
            return true;
        }

        if (window.Auth && !window.Auth.isLoggedIn()) return false;
        if (!window.Auth && !this._hasLoginCookie()) return false;

        try {
            const response = await fetch(`${this.getApiBaseUrl()}/payment/subscription/status`, {
                credentials: 'include'
            });

            if (!response.ok) return false;

            const data = await response.json();
            const isPremium = ['premium_monthly', 'exclusive_monthly', 'vip_majestrat'].includes(data.planType);
            const isActive = data.status === 'active' || data.status === 'trialing' || data.status === 'cancel_pending';
            const notExpired = !data.currentPeriodEnd || new Date(data.currentPeriodEnd) > new Date();

            return isPremium && isActive && notExpired;
        } catch (error) {
            console.error('Premium check error:', error);
            return false;
        }
    },

    getApiBaseUrl() {
        return window.API_CONFIG?.BASE_URL || '/api';
    },

    async loadPlanManifest() {
        if (this._planManifestPromise) return this._planManifestPromise;

        this._planManifestPromise = fetch(`${this.getApiBaseUrl()}/plans`, {
            credentials: 'same-origin'
        })
            .then(async (response) => {
                if (!response.ok) throw new Error(`Plan manifest returned ${response.status}`);
                const manifest = await response.json();
                if (!manifest.success || !Array.isArray(manifest.plans)) {
                    throw new Error('Plan manifest has invalid shape');
                }

                this._plansById = new Map(manifest.plans.map((plan) => [plan.id, plan]));
                this._featurePlanMap = manifest.featurePlanMap || {};
                return manifest;
            })
            .catch((error) => {
                console.warn('[Premium] Using fallback plan copy:', error.message);
                this._plansById = new Map();
                this._featurePlanMap = {};
                return null;
            });

        return this._planManifestPromise;
    },

    readablePlanName(name) {
        return String(name || '').replace(/\s*\([^)]*\)\s*$/, '').trim();
    },

    getPlanCtaLabel(planId, fallbackLabel) {
        const plan = this._plansById.get(planId);
        if (!plan) return fallbackLabel;

        const icon = planId === 'osviceni' ? '\u{1F52D}' : '\u2728';
        const name = this.readablePlanName(plan.name);
        let suffix = '';
        if (plan.interval === 'month') suffix = '/m\u011bs\u00edc';
        if (plan.interval === 'year') suffix = '/rok';

        if (!name || !plan.priceLabel) return fallbackLabel;
        return `${icon} Odemknout ${name} - ${plan.priceLabel}${suffix}`;
    },

    getPlanTrialDays(planId) {
        const plan = this._plansById.get(planId);
        const trialDays = Number(plan?.trialDays || 0);
        return Number.isFinite(trialDays) && trialDays > 0 ? trialDays : 0;
    },

    getConservativePaymentFooter() {
        return 'Cena se zobrazí ve Stripe před potvrzením • Zrušení v profilu';
    },

    getPlanFooter(planId, fallbackFooter = null) {
        const plan = this._plansById.get(planId);
        if (!plan) return fallbackFooter || this.getConservativePaymentFooter();

        const parts = [];
        const trialDays = this.getPlanTrialDays(planId);
        if (trialDays > 0) parts.push(`${trialDays} dn\u00ed zdarma`);
        parts.push('Cena se zobraz\u00ed ve Stripe p\u0159ed potvrzen\u00edm', 'Zru\u0161en\u00ed v profilu');
        return parts.join(' \u2022 ');
    },

    getPlanTrialBadge(planId) {
        const trialDays = this.getPlanTrialDays(planId);
        return trialDays > 0 ? `${trialDays} DN\u00cd ZDARMA` : '';
    },

    getTrialCtaLabel(planId, fallbackLabel) {
        const trialDays = this.getPlanTrialDays(planId);
        if (trialDays > 0) return `\ud83c\udf1f Vyzkou\u0161et ${trialDays} dn\u00ed zdarma`;
        return this.getPlanCtaLabel(planId, fallbackLabel || '\ud83c\udf1f Odemknout Hv\u011bzdn\u00e9ho Pr\u016fvodce');
    },

    getFeaturePlanId(featureName, fallbackPlanId = 'pruvodce') {
        return this._featurePlanMap?.[featureName] || fallbackPlanId;
    },

    buildCheckoutMetadata(source, feature, metadata = {}) {
        const nextMetadata = metadata && typeof metadata === 'object' && !Array.isArray(metadata)
            ? { ...metadata }
            : {};

        if (source && !nextMetadata.entry_source) nextMetadata.entry_source = source;
        if (feature && !nextMetadata.entry_feature) nextMetadata.entry_feature = feature;

        return nextMetadata;
    },

    buildCheckoutAuthUrl(planId, context = {}) {
        const source = context.source || 'premium_gate';
        const feature = context.feature || null;
        const redirect = typeof context.redirect === 'string'
            && context.redirect.startsWith('/')
            && !context.redirect.startsWith('//')
            ? context.redirect
            : '/cenik.html';
        const authMode = context.authMode === 'login' ? 'login' : 'register';
        const metadata = this.buildCheckoutMetadata(source, feature, context.metadata);
        const authUrl = new URL('/prihlaseni.html', window.location.origin);

        authUrl.searchParams.set('mode', authMode);
        authUrl.searchParams.set('redirect', redirect);
        authUrl.searchParams.set('plan', planId);
        authUrl.searchParams.set('source', source);
        if (feature) authUrl.searchParams.set('feature', feature);
        if (context.billing_interval || context.billingInterval) {
            authUrl.searchParams.set('billing_interval', context.billing_interval || context.billingInterval);
        }

        [
            'entry_source',
            'entry_feature',
            'utm_source',
            'utm_medium',
            'utm_campaign',
            'utm_content',
            'requested_card',
            'card_param'
        ].forEach((key) => {
            const value = metadata[key];
            if (!value) return;
            authUrl.searchParams.set(key === 'card_param' ? 'card' : key, String(value));
        });

        return `${authUrl.pathname}${authUrl.search}`;
    },

    rememberFallbackPendingCheckout(planId, context = {}) {
        try {
            const source = context.source || 'premium_gate';
            const feature = context.feature || null;
            const redirect = typeof context.redirect === 'string'
                && context.redirect.startsWith('/')
                && !context.redirect.startsWith('//')
                ? context.redirect
                : '/cenik.html';
            const authMode = context.authMode === 'login' ? 'login' : 'register';
            const metadata = this.buildCheckoutMetadata(source, feature, context.metadata);

            sessionStorage.setItem('pending_plan', planId);
            sessionStorage.setItem('pending_checkout_context', JSON.stringify({
                planId,
                source,
                feature,
                redirect,
                authMode,
                billing_interval: context.billing_interval || context.billingInterval || null,
                metadata
            }));
        } catch (error) {
            console.warn('[Premium] Could not store fallback pending checkout:', error.message);
        }
    },

    async trackServerFunnelEvent(eventName, payload = {}) {
        try {
            const csrfToken = window.getCSRFToken ? await window.getCSRFToken() : null;
            if (!csrfToken) return;

            await fetch(`${this.getApiBaseUrl()}/payment/funnel-event`, {
                method: 'POST',
                credentials: 'include',
                keepalive: true,
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': csrfToken
                },
                body: JSON.stringify({
                    eventName,
                    source: payload.source || 'premium_gate',
                    feature: payload.feature || null,
                    planId: payload.planId || null,
                    planType: payload.planType || null,
                    metadata: payload.metadata || {}
                })
            });
        } catch (error) {
            console.warn('[FUNNEL] Could not send premium gate event:', error.message);
        }
    },

    async trackPaywallCtaClick({ source = 'premium_gate', feature = null, planId = null, label = 'upgrade' } = {}) {
        try {
            window.MH_ANALYTICS?.trackEvent?.('paywall_cta_clicked', {
                label,
                source,
                feature,
                plan_id: planId
            });
        } catch (error) {
            console.warn('[FUNNEL] Could not send client paywall CTA event:', error.message);
        }
        return this.trackServerFunnelEvent('paywall_cta_clicked', {
            source,
            feature,
            planId,
            metadata: {
                path: window.location.pathname,
                label
            }
        });
    },

    async waitBrieflyForFunnelEvent(promise, timeoutMs = 350) {
        await Promise.race([
            promise,
            new Promise((resolve) => setTimeout(resolve, timeoutMs))
        ]).catch((error) => {
            console.warn('[FUNNEL] Premium gate event wait failed:', error.message);
        });
    },

    startUpgradeFlow(planId, featureName, source = 'paywall', authMode = null) {
        const metadata = this.buildCheckoutMetadata(source, featureName);
        const checkoutContext = {
            source,
            feature: featureName || null,
            metadata,
            redirect: '/cenik.html',
            authMode: authMode || (window.Auth?.isLoggedIn?.() ? 'login' : 'register')
        };

        if (window.Auth?.startPlanCheckout) {
            window.Auth.startPlanCheckout(planId, checkoutContext);
            return;
        }

        this.rememberFallbackPendingCheckout(planId, checkoutContext);
        window.location.href = this.buildCheckoutAuthUrl(planId, checkoutContext);
    },

    createOverlay({ icon, title, message, benefits, ctaLabel, footer, badgeLabel = '' }) {
        const overlay = document.createElement('div');
        overlay.className = 'paywall-overlay';
        overlay.innerHTML = `
            <div class="paywall-content">
                <div class="paywall-icon">${this._escapeHTML(icon)}</div>
                ${badgeLabel ? `<div class="paywall-trial-badge">${this._escapeHTML(badgeLabel)}</div>` : ''}
                <h3 class="paywall-title">${this._escapeHTML(title)}</h3>
                <p class="paywall-message">${this._escapeHTML(message)}</p>
                <div class="paywall-benefits">
                    ${(benefits || []).map((item) => `<div class="benefit-item">${this._escapeHTML(item)}</div>`).join('')}
                </div>
                <div class="paywall-actions">
                    <button class="btn btn--primary paywall-upgrade">${this._escapeHTML(ctaLabel)}</button>
                    <button class="btn btn--ghost paywall-close">Teď ne</button>
                </div>
                <p class="paywall-footer">${this._escapeHTML(footer)}</p>
            </div>
        `;

        document.body.appendChild(overlay);
        return overlay;
    },

    bindOverlayActions(overlay, onUpgrade, context = {}) {
        overlay.querySelector('.paywall-upgrade').addEventListener('click', () => {
            const btn = overlay.querySelector('.paywall-upgrade');
            const source = context.source || 'premium_gate';
            const feature = context.feature || null;
            const planId = context.planId || null;
            void this.trackPaywallCtaClick({
                source,
                feature,
                planId,
                label: btn.textContent?.trim() || 'upgrade'
            });
            btn.textContent = 'Přesměrovávám...';
            btn.disabled = true;
            onUpgrade();
        });

        overlay.querySelector('.paywall-close').addEventListener('click', () => overlay.remove());
        overlay.addEventListener('click', (event) => {
            if (event.target === overlay) overlay.remove();
        });
    },

    showPaywall(featureName, message = null) {
        const featurePaywalls = {
            numerology: {
                title: 'Hluboký numerologický rozbor',
                message: 'Základní číslo ukáže směr. Premium odemkne osobní cykly, silné stránky a konkrétní doporučení pro aktuální období.',
                benefits: ['✓ Osobní výklad životního čísla', '✓ Denní a měsíční numerologické cykly', '✓ Uložená historie rozborů', '✓ Doporučení pro rozhodování a načasování']
            },
            numerologie_vyklad: {
                title: 'Hluboký numerologický rozbor',
                message: 'Odemkněte plnou interpretaci čísel, která ukáže nejen význam, ale i konkrétní další krok.',
                benefits: ['✓ Osobní výklad životního čísla', '✓ Denní a měsíční numerologické cykly', '✓ Uložená historie rozborů', '✓ Doporučení pro rozhodování a načasování']
            },
            weekly_horoscope: {
                title: 'Týdenní mapa pod hvězdami',
                message: 'Denní horoskop dá směr na dnes. Premium ukáže celý týden: kdy jednat, kdy zpomalit a na co si dát pozor.',
                benefits: ['✓ Týdenní přehled energií', '✓ Vztahy, práce a vnitřní klid v souvislostech', '✓ Osobní doporučení podle znamení', '✓ Historie pro návrat k předchozím týdnům']
            },
            monthly_horoscope: {
                title: 'Měsíční mapa rozhodnutí',
                message: 'Odemkněte delší výhled, který pomůže plánovat důležité rozhovory, práci i osobní kroky.',
                benefits: ['✓ Témata měsíce', '✓ Silné a citlivé dny', '✓ Doporučení pro vztahy a práci', '✓ Návrat k uloženým výkladům']
            },
            natal_chart: {
                title: 'Plná natální interpretace',
                message: 'Základní mapa ukáže obrys. Premium odemkne domy, aspekty, silné stránky a vzorce, které se vám v životě opakují.',
                benefits: ['✓ Výklad znamení, domů a aspektů', '✓ Silné stránky a citlivá místa', '✓ Vztahové a pracovní vzorce', '✓ Osobní profil uložený pro další výklady']
            },
            natalni_interpretace: {
                title: 'Plná natální interpretace',
                message: 'Odemkněte hlubší výklad své mapy narození a propojte ji s tím, co řešíte právě teď.',
                benefits: ['✓ Výklad znamení, domů a aspektů', '✓ Silné stránky a citlivá místa', '✓ Vztahové a pracovní vzorce', '✓ Osobní profil uložený pro další výklady']
            },
            synastry: {
                title: 'Plný vztahový rozbor',
                message: 'Základní kompatibilita nestačí. Premium ukáže třecí body, komunikační styl a konkrétní doporučení pro vztah.',
                benefits: ['✓ Hlubší dynamika vztahu', '✓ Silné stránky a napětí mezi vámi', '✓ Doporučení pro komunikaci', '✓ Uložený rozbor pro pozdější návrat']
            },
            partnerska_detail: {
                title: 'Plný vztahový rozbor',
                message: 'Odemkněte, kde si rozumíte přirozeně, kde vzniká napětí a jak s tím prakticky pracovat.',
                benefits: ['✓ Hlubší dynamika vztahu', '✓ Silné stránky a napětí mezi vámi', '✓ Doporučení pro komunikaci', '✓ Uložený rozbor pro pozdější návrat']
            },
            mentor: {
                title: 'Hvězdný Průvodce bez limitu',
                message: 'Jedna odpověď pomůže v tu chvíli. Premium odemkne pokračování, historii a možnost jít v tématu hlouběji.',
                benefits: ['✓ Neomezené otázky na průvodce', '✓ Návazné odpovědi k jednomu tématu', '✓ Historie předchozích vhledů', '✓ Doporučení podle vašeho profilu']
            },
            rituals: {
                title: 'Lunární rituály pro návrat k sobě',
                message: 'Odemkněte rituály podle fáze Měsíce, záměru a aktuální energie dne.',
                benefits: ['✓ Rituály podle lunární fáze', '✓ Záměry pro vztahy, práci a klid', '✓ Večerní reflexe', '✓ Uložená osobní praxe']
            },
            tarot_multi_card: {
                title: 'Celý tarotový výklad',
                message: 'První karta naznačí směr. Premium odemkne celý výklad, skryté vlivy a konkrétní další krok.',
                benefits: ['✓ Vícekaretní výklady', '✓ Skryté vlivy a doporučení', '✓ Uložená historie tarotu', '✓ Návrat k tématům, která se opakují']
            },
            tarot_celtic_cross: {
                title: 'Keltský kříž do hloubky',
                message: 'Odemkněte plnou strukturu výkladu pro situace, které nejdou vyřešit jednou kartou.',
                benefits: ['✓ Kompletní výklad Keltského kříže', '✓ Souvislosti mezi kartami', '✓ Doporučený další krok', '✓ Uložený výklad v profilu']
            },
            astrocartography: {
                title: 'Astrokartografie a místa, která vás volají',
                message: 'Tato pokročilá mapa patří do plánu Osvícení a ukáže, kde se podporuje práce, vztahy i vnitřní růst.',
                planId: 'osviceni',
                ctaLabel: this.getPlanCtaLabel('osviceni', '🔭 Odemknout Osvícení'),
                footer: this.getPlanFooter('osviceni'),
                benefits: ['✓ Hvězdná mapa míst', '✓ Linie pro vztahy, práci a růst', '✓ Pokročilé interpretace', '✓ Roční kontext a hlubší analýzy']
            },
            journal_insights: {
                title: 'Vzorce ve vašich záznamech',
                message: 'Premium pomůže najít témata, která se opakují v deníku, výkladech i horoskopech.',
                benefits: ['✓ Analýza opakujících se témat', '✓ Souvislosti mezi výklady', '✓ Jemné návraty k minulým záznamům', '✓ Doporučení pro další reflexi']
            }
        };

        const config = featurePaywalls[featureName] || {
            title: 'Hvězdný Průvodce',
            message: 'Tady začíná hlubší osobní vedení: plné výklady, historie, osobní profil a návrat k tématům, která se opakují.',
            benefits: [
                '✓ Plné výklady místo krátkých náhledů',
                '✓ Osobní profil a uložená historie',
                '✓ Denní, týdenní i měsíční vedení',
                '✓ Hvězdný Průvodce bez limitu'
            ]
        };

        const displayMessage = message || config.message;
        const planId = config.planId || this.getFeaturePlanId(featureName, 'pruvodce');
        this.trackPaywallHit(featureName, 'inline_paywall', planId);

        const overlay = this.createOverlay({
            icon: planId === 'osviceni' ? '🔭' : '✨',
            title: config.title,
            message: displayMessage,
            benefits: config.benefits,
            ctaLabel: this.getPlanCtaLabel(planId, config.ctaLabel || '🌟 Odemknout Hvězdného Průvodce'),
            footer: this.getPlanFooter(planId, config.footer)
        });

        this.bindOverlayActions(overlay, () => this.startUpgradeFlow(planId, featureName, 'inline_paywall'), {
            source: 'inline_paywall',
            feature: featureName,
            planId
        });
    },

    showExclusivePaywall(featureName) {
        this.trackPaywallHit(featureName, 'exclusive_paywall', 'osviceni');

        const overlay = this.createOverlay({
            icon: '🔭',
            title: 'Osvícení',
            message: 'Tato funkce je dostupná od plánu Osvícení.',
            benefits: [
                '✓ Astrokartografie a vaše hvězdná mapa světa',
                '✓ Pokročilá natální karta s hlubším výkladem',
                '✓ Exkluzivní lunární rituály',
                '✓ Prioritní odpovědi duchovního průvodce'
            ],
            ctaLabel: this.getPlanCtaLabel('osviceni', '🔭 Odemknout Osvícení'),
            footer: this.getPlanFooter('osviceni')
        });

        this.bindOverlayActions(overlay, () => this.startUpgradeFlow('osviceni', featureName, 'exclusive_paywall'), {
            source: 'exclusive_paywall',
            feature: featureName,
            planId: 'osviceni'
        });
    },

    showLoginGate(container, message = null, featureName = null, source = 'inline_login_gate') {
        const defaultMsg = '⭐ Vytvořte účet a pokračujte k odemčení plného osobního výkladu';
        const safeMsg = this._escapeHTML(message || defaultMsg);
        const planId = this.getFeaturePlanId(featureName, 'pruvodce');
        this.trackPaywallHit(featureName, source, planId, 'login_gate_viewed');

        const gate = document.createElement('div');
        gate.className = 'login-gate';
        gate.innerHTML = `
            <p class="login-gate__message">${safeMsg}</p>
            <p class="login-gate__hint">Účet vytvoříte zdarma. Placený plán potvrdíte až na zabezpečeném checkoutu.</p>
            <button class="btn btn--primary login-gate-btn">Pokračovat k odemčení</button>
        `;

        container.appendChild(gate);
        gate.querySelector('.login-gate-btn').addEventListener('click', async () => {
            await this.waitBrieflyForFunnelEvent(this.trackPaywallCtaClick({
                source,
                feature: featureName || null,
                planId,
                label: gate.querySelector('.login-gate-btn')?.textContent?.trim() || 'login_gate'
            }));
            this.startUpgradeFlow(planId, featureName, source, 'register');
        });
    },

    markAsPremium(element) {
        const badge = document.createElement('span');
        badge.className = 'premium-badge';
        badge.textContent = '💎 Premium';
        badge.title = 'Tato funkce vyžaduje Premium předplatné';

        element.classList.add('premium-badge-host');
        element.appendChild(badge);
    },

    lockContent(container, featureName) {
        container.classList.add('premium-locked');

        const lockOverlay = document.createElement('div');
        lockOverlay.className = 'premium-lock-overlay';
        lockOverlay.innerHTML = `
            <div class="lock-icon">🔒</div>
            <p class="lock-text">Premium obsah</p>
            <button class="btn btn--sm btn--gold unlock-btn">Odemknout</button>
        `;

        container.appendChild(lockOverlay);

        lockOverlay.querySelector('.unlock-btn').addEventListener('click', (event) => {
            event.stopPropagation();
            this.showPaywall(featureName);
        });
    },

    trackPaywallHit(featureName, source = 'premium_gate', planId = 'pruvodce', eventName = 'paywall_viewed') {
        try {
            window.MH_ANALYTICS?.trackEvent?.(eventName, {
                feature: featureName || null,
                source,
                plan_id: planId || null
            });

            void this.trackServerFunnelEvent(eventName, {
                source,
                feature: featureName || null,
                planId,
                metadata: {
                    path: window.location.pathname
                }
            });

            if (window.analytics) {
                window.analytics.track('Paywall Hit', {
                    feature: featureName,
                    source,
                    plan_id: planId,
                    timestamp: new Date().toISOString()
                });
            }
            if (window.MH_DEBUG) console.debug('[Analytics] Paywall hit:', featureName);
        } catch (error) {
            console.error('Analytics tracking error:', error);
        }
    },

    showTrialPaywall(featureName) {
        const planId = this.getFeaturePlanId(featureName, 'pruvodce');
        this.trackPaywallHit(featureName, 'trial_paywall', planId);

        const featureMessages = {
            rituals: 'Lunární rituály tě provedou každou fází měsíce a pomůžou z denního vedení udělat návratový rituál.',
            partnerska_detail: 'Základní shoda je jen začátek. Plný rozbor ukáže třecí body, komunikaci a konkrétní další krok pro vztah.',
            numerologie_vyklad: 'Odemkni plnou interpretaci čísel, osobní cykly a doporučení pro aktuální období.',
            natalni_interpretace: 'Odemkni domy, aspekty, silné stránky a opakující se životní vzorce ve své natální kartě.',
            tarot_multi_card: 'První karta naznačí směr. Premium odemkne celý výklad, skryté vlivy a konkrétní další krok.',
            tarot_celtic_cross: 'Keltský kříž dává smysl pro složitější situace, kde jedna karta nestačí.',
            mentor: 'Pokračuj v otázce bez limitu a vrať se k historii předchozích vhledů.'
        };

        const benefits = {
            partnerska_detail: ['✓ Plný vztahový rozbor', '✓ Silné stránky a třecí body', '✓ Doporučení pro komunikaci', '✓ Uložená historie vztahových výkladů'],
            numerologie_vyklad: ['✓ Osobní numerologický výklad', '✓ Denní a měsíční cykly', '✓ Doporučení pro načasování', '✓ Uložená historie rozborů'],
            natalni_interpretace: ['✓ Výklad domů a aspektů', '✓ Silné stránky a citlivá místa', '✓ Vztahové a pracovní vzorce', '✓ Profil pro další osobní výklady'],
            tarot_multi_card: ['✓ Vícekaretní výklady', '✓ Skryté vlivy a další krok', '✓ Uložená historie tarotu', '✓ Návrat k opakujícím se tématům'],
            default: ['✓ Plné výklady bez krátkých náhledů', '✓ Osobní profil a historie', '✓ Denní, týdenní i měsíční vedení', '✓ Hvězdný Průvodce bez limitu']
        };

        const selectedBenefits = benefits[featureName] || benefits.default;

        const overlay = this.createOverlay({
            icon: '✨',
            badgeLabel: this.getPlanTrialBadge(planId),
            title: 'Hvězdný Průvodce',
            message: featureMessages[featureName] || 'Tato funkce je součástí Hvězdného Průvodce.',
            benefits: selectedBenefits,
            ctaLabel: this.getTrialCtaLabel(planId, '🌟 Odemknout Hvězdného Průvodce'),
            footer: this.getPlanFooter(planId)
        });

        this.bindOverlayActions(overlay, () => this.startUpgradeFlow(planId, featureName, 'trial_paywall'), {
            source: 'trial_paywall',
            feature: featureName,
            planId
        });
    },

    async init() {
        const [, isPremium] = await Promise.all([
            this.loadPlanManifest(),
            this.checkStatus()
        ]);
        document.body.classList.toggle('is-premium', isPremium);

        if (!isPremium) {
            document.querySelectorAll('[data-premium="true"]').forEach((element) => {
                const badge = document.createElement('span');
                badge.className = 'nav-premium-badge';
                badge.textContent = '💎';
                element.appendChild(badge);
            });
        }

    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.Premium.init();
    });
} else {
    window.Premium.init();
}
