(function () {
    'use strict';

    var selectedGender = '';
    var PAST_LIFE_BANNER_SOURCE = 'past_life_banner_upgrade';
    var PAST_LIFE_REGISTER_SOURCE = 'past_life_register_gate';

    function apiBase() {
        return (window.API_CONFIG && window.API_CONFIG.BASE_URL) || '/api';
    }

    function setBlockVisible(element, visible) {
        if (!element) return;
        element.hidden = !visible;
        element.classList.toggle('mh-block-visible', visible);
    }

    function setInlineFlexVisible(element, visible) {
        if (!element) return;
        element.hidden = !visible;
        element.classList.toggle('mh-inline-flex-visible', visible);
    }

    function showError(msg) {
        var el = document.getElementById('pl-error');
        el.textContent = msg;
        setBlockVisible(el, true);
    }
    function hideError() {
        setBlockVisible(document.getElementById('pl-error'), false);
    }

    function escapeHtml(value) {
        var div = document.createElement('div');
        div.textContent = String(value || '');
        return div.innerHTML;
    }

    function hasPremiumAccess() {
        return !!(window.Auth && window.Auth.isLoggedIn && window.Auth.isLoggedIn()
            && window.Auth.isPremium && window.Auth.isPremium());
    }

    function buildPastLifeCheckoutUrl(source) {
        var pricingUrl = new URL('/cenik.html', window.location.origin);
        pricingUrl.searchParams.set('plan', 'pruvodce');
        pricingUrl.searchParams.set('source', source);
        pricingUrl.searchParams.set('feature', 'minuly_zivot');
        pricingUrl.searchParams.set('entry_source', source);
        pricingUrl.searchParams.set('entry_feature', 'minuly_zivot');
        return pricingUrl.pathname + pricingUrl.search;
    }

    function startPastLifeCheckout(source, authMode) {
        var checkoutSource = source || PAST_LIFE_BANNER_SOURCE;
        window.MH_ANALYTICS?.trackCTA?.(checkoutSource, {
            plan_id: 'pruvodce',
            feature: 'minuly_zivot'
        });

        if (window.Auth?.startPlanCheckout) {
            window.Auth.startPlanCheckout('pruvodce', {
                source: checkoutSource,
                feature: 'minuly_zivot',
                redirect: '/cenik.html',
                authMode: authMode || 'register',
                metadata: {
                    entry_source: checkoutSource,
                    entry_feature: 'minuly_zivot'
                }
            });
            return;
        }

        window.location.href = buildPastLifeCheckoutUrl(checkoutSource);
    }

    function startPastLifeLogin() {
        window.MH_ANALYTICS?.trackCTA?.(PAST_LIFE_REGISTER_SOURCE, {
            destination: '/prihlaseni.html',
            feature: 'minuly_zivot',
            auth_mode: 'login'
        });

        var authUrl = new URL('/prihlaseni.html', window.location.origin);
        authUrl.searchParams.set('mode', 'login');
        authUrl.searchParams.set('redirect', '/minuly-zivot.html');
        authUrl.searchParams.set('source', PAST_LIFE_REGISTER_SOURCE);
        authUrl.searchParams.set('feature', 'minuly_zivot');
        window.location.href = authUrl.pathname + authUrl.search;
    }

    function buildPastLifePayload() {
        return {
            name: document.getElementById('pl-name').value.trim(),
            birthDate: document.getElementById('pl-birth').value,
            place: (document.getElementById('pl-place').value || '').trim(),
            gender: selectedGender
        };
    }

    function getPreviewArchetype(payload) {
        var month = Number(String(payload.birthDate).split('-')[1]) || 1;
        var archetypes = [
            'strážce příběhů a rodové paměti',
            'poutník mezi dvěma světy',
            'léčitel tichých zlomů',
            'tvůrce, který hledá skrytý řád'
        ];
        var energy = payload.gender === 'muz'
            ? 'aktivní ochranná energie'
            : (payload.gender === 'zena' ? 'citlivá tvořivá energie' : 'vyvážená pozorující energie');

        return {
            archetype: archetypes[(month - 1) % archetypes.length],
            energy: energy
        };
    }

    function showPastLifeUpgradePreview(payload, source) {
        var formSection = document.getElementById('form-section');
        var existing = document.getElementById('past-life-preview-gate');
        var firstName = (payload.name || 'tvé jméno').split(/\s+/)[0];
        var preview = getPreviewArchetype(payload);

        if (!existing) {
            existing = document.createElement('div');
            existing.id = 'past-life-preview-gate';
            existing.className = 'past-life-preview-gate';
            formSection.appendChild(existing);
        }

        existing.innerHTML = `
            <div class="past-life-preview-gate__badge">Náhled před odemčením</div>
            <h3>Výklad pro ${escapeHtml(firstName)} je připravený k odemčení</h3>
            <p>Neodeslali jsme datum narození na prémiový výklad. Tohle je jen lokální náhled struktury, abys věděl, co přesně se otevře po pokračování.</p>
            <div class="past-life-preview-gate__sample">
                <span>Možná stopa: ${escapeHtml(preview.archetype)}</span>
                <span>Forma výkladu: ${escapeHtml(preview.energy)}</span>
                <span>Odemkne se: éra, role duše, karmická lekce, dary, opakující vzorce a další krok.</span>
            </div>
            <div class="past-life-preview-gate__actions">
                <button type="button" class="btn btn--primary past-life-preview-gate__cta">Odemknout celý výklad</button>
                <button type="button" class="btn btn--secondary past-life-preview-gate__edit">Upravit údaje</button>
            </div>
        `;

        window.MH_ANALYTICS?.trackAction?.('paywall_viewed', {
            source: source,
            feature: 'minuly_zivot',
            plan_id: 'pruvodce',
            has_birth_date: Boolean(payload.birthDate),
            has_place: Boolean(payload.place)
        });

        existing.querySelector('.past-life-preview-gate__cta')?.addEventListener('click', function() {
            sessionStorage.setItem('pendingPastLifeContext', JSON.stringify(payload));
            startPastLifeCheckout(source, window.Auth?.isLoggedIn?.() ? 'login' : 'register');
        });

        existing.querySelector('.past-life-preview-gate__edit')?.addEventListener('click', function() {
            window.MH_ANALYTICS?.trackAction?.('paywall_dismissed', {
                source: source,
                feature: 'minuly_zivot'
            });
            existing.remove();
            document.getElementById('pl-name')?.focus();
        });

        existing.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function appendPastLifeFavoriteAction(container, readingId) {
        if (!container || !readingId) return;

        document.getElementById('favorite-past-life-action')?.remove();

        var action = document.createElement('div');
        action.id = 'favorite-past-life-action';
        action.className = 'text-center favorite-reading-action mt-md';
        action.innerHTML = `
            <button id="favorite-past-life-btn" class="btn btn--glass favorite-reading-action__button">
                <span class="favorite-icon">☆</span> Přidat do oblíbených
            </button>
        `;
        container.appendChild(action);

        action.querySelector('#favorite-past-life-btn')?.addEventListener('click', async function() {
            if (typeof window.toggleFavorite === 'function') {
                await window.toggleFavorite(readingId, 'favorite-past-life-btn');
            }
        });
    }

    function init() {
        var upgradeBtn = document.getElementById('past-life-upgrade-btn');
        var registerBtn = document.getElementById('past-life-register-btn');

        if (upgradeBtn) {
            upgradeBtn.addEventListener('click', function(event) {
                event.preventDefault();
                startPastLifeCheckout(PAST_LIFE_BANNER_SOURCE, 'register');
            });
        }

        if (registerBtn) {
            registerBtn.addEventListener('click', function(event) {
                event.preventDefault();
                startPastLifeLogin();
            });
        }

        // Gender buttons
        document.querySelectorAll('.gender-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
                document.querySelectorAll('.gender-btn').forEach(function(b) { b.classList.remove('selected'); });
                btn.classList.add('selected');
                selectedGender = btn.dataset.gender;
                document.getElementById('pl-gender').value = selectedGender;
            });
        });

        // Submit
        document.getElementById('pl-submit').addEventListener('click', async function() {
            hideError();
            var payload = buildPastLifePayload();
            var name = payload.name;
            var birth = payload.birthDate;
            var place = payload.place;
            var gender = payload.gender;

            if (!name || name.length < 2) { showError('Zadejte své jméno.'); return; }
            if (!birth) { showError('Zadejte datum narození.'); return; }
            if (!gender) { showError('Vyberte formu výkladu.'); return; }

            if (!hasPremiumAccess()) {
                sessionStorage.setItem('pendingPastLifeContext', JSON.stringify(payload));
                showPastLifeUpgradePreview(payload, window.Auth?.isLoggedIn?.() ? 'past_life_free_submit_gate' : 'past_life_submit_gate');
                return;
            }

            // Show loading
            setBlockVisible(document.getElementById('form-section'), false);
            setBlockVisible(document.getElementById('pl-loading'), true);
            document.getElementById('pl-result').classList.remove('visible');

            try {
                // Get CSRF token
                var csrfRes = await fetch(apiBase() + '/csrf-token', { credentials: 'include' });
                var csrfData = await csrfRes.json();

                var res = await fetch(apiBase() + '/past-life', {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-Token': csrfData.csrfToken || ''
                    },
                    body: JSON.stringify(payload)
                });

                var data = await res.json();

                setBlockVisible(document.getElementById('pl-loading'), false);

                if (!res.ok || !data.success) {
                    setBlockVisible(document.getElementById('form-section'), true);
                    showError(data.error || 'Chyba serveru. Zkuste to prosím znovu.');
                    return;
                }

                // Fill result
                var r = data.result;
                document.getElementById('res-era').textContent = r.era || '';
                document.getElementById('res-identity').textContent = r.identity || '';
                document.getElementById('res-karmic').textContent = r.karmic_lesson || '';
                document.getElementById('res-gifts').textContent = r.gifts || '';
                document.getElementById('res-patterns').textContent = r.patterns || '';
                document.getElementById('res-mission').textContent = r.mission || '';
                document.getElementById('res-message').textContent = r.message || '';

                setupShare(name, r);

                if (window.Auth?.saveReading) {
                    try {
                        var saveResult = await window.Auth.saveReading('past-life', {
                            name: name,
                            birthDate: birth,
                            gender: gender,
                            place: place,
                            result: r,
                            fallback: !!data.fallback
                        });

                        if (saveResult?.id) {
                            appendPastLifeFavoriteAction(document.getElementById('pl-result'), saveResult.id);
                        }
                    } catch (saveError) {
                        console.warn('Past life save failed:', saveError.message);
                    }
                }

                document.getElementById('pl-result').classList.add('visible');
                window.scrollTo({ top: document.getElementById('pl-result').offsetTop - 80, behavior: 'smooth' });

            } catch (e) {
                setBlockVisible(document.getElementById('pl-loading'), false);
                setBlockVisible(document.getElementById('form-section'), true);
                showError('Chyba připojení. Zkuste to prosím znovu.');
            }
        });

        // Reset
        document.getElementById('pl-reset').addEventListener('click', function() {
            document.getElementById('pl-result').classList.remove('visible');
            setBlockVisible(document.getElementById('form-section'), true);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    function setupShare(name, r) {
        var pageUrl = 'https://www.mystickahvezda.cz/minuly-zivot.html';
        var firstName = name.split(' ')[0];
        var shareText = '\uD83D\uDD2E ' + firstName + ' má symbolický vhled minulého života: ' +
            (r.era ? 'V \u00E9\u0159e \u201E' + r.era + '\u201C ' : '') +
            (r.identity ? r.identity.substring(0, 60) + (r.identity.length > 60 ? '\u2026' : '') + '. ' : '') +
            'Vytvo\u0159 si vlastn\u00ED sebereflexn\u00ED v\u00FDklad \u2935\uFE0F';

        // Facebook
        var fbBtn = document.getElementById('share-fb');
        fbBtn.href = 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(pageUrl) +
            '&quote=' + encodeURIComponent(shareText);

        // X (Twitter)
        var xBtn = document.getElementById('share-x');
        xBtn.href = 'https://x.com/intent/tweet?text=' + encodeURIComponent(shareText + '\n' + pageUrl);

        // Copy
        var copyBtn = document.getElementById('share-copy');
        var copyLabel = document.getElementById('copy-label');
        copyBtn.onclick = function() {
            var toCopy = shareText + '\n' + pageUrl;
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(toCopy).then(function() {
                    showCopied(copyBtn, copyLabel);
                }).catch(function() {
                    fallbackCopy(toCopy, copyBtn, copyLabel);
                });
            } else {
                fallbackCopy(toCopy, copyBtn, copyLabel);
            }
        };

        // Native share (mobile)
        var nativeBtn = document.getElementById('share-native');
        if (navigator.share) {
            setInlineFlexVisible(nativeBtn, true);
            nativeBtn.onclick = function() {
                navigator.share({
                    title: 'M\u016Fj minul\u00FD \u017Eivot \u2014 Akashick\u00E9 Z\u00E1znamy',
                    text: shareText,
                    url: pageUrl
                }).catch(function() {});
            };
        } else {
            setInlineFlexVisible(nativeBtn, false);
        }
    }

    function showCopied(btn, label) {
        btn.classList.add('copied');
        label.textContent = 'Zkop\u00EDrov\u00E1no!';
        setTimeout(function() {
            btn.classList.remove('copied');
            label.textContent = 'Kop\u00EDrovat odkaz';
        }, 2200);
    }

    function fallbackCopy(text, btn, label) {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.className = 'clipboard-hidden-textarea';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); showCopied(btn, label); } catch(e) {}
        document.body.removeChild(ta);
    }

    // Auth check
    function checkAuth() {
        var isLoggedIn = window.Auth && window.Auth.isLoggedIn && window.Auth.isLoggedIn();
        var isPremium = hasPremiumAccess();

        if (!isPremium) {
            setBlockVisible(document.getElementById('pl-form-wrap'), true);
            setBlockVisible(document.getElementById('premium-wall'), true);
            document.getElementById('past-life-register-btn').textContent = isLoggedIn
                ? 'Zkontrolovat účet'
                : 'Přihlásit se k aktivnímu účtu';
        } else {
            setBlockVisible(document.getElementById('pl-form-wrap'), true);
            setBlockVisible(document.getElementById('premium-wall'), false);
        }
    }

    document.addEventListener('auth:changed', checkAuth);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            init();
            setTimeout(checkAuth, 300);
        });
    } else {
        init();
        setTimeout(checkAuth, 300);
    }
})();
