(function () {
    'use strict';

    var selectedGender = '';

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

    function startPastLifeCheckout(source, authMode) {
        window.Auth?.startPlanCheckout?.('pruvodce', {
            source: source || 'past_life_premium_wall',
            feature: 'minuly_zivot',
            redirect: '/cenik.html',
            authMode: authMode || 'register'
        });
    }

    function init() {
        var upgradeBtn = document.getElementById('past-life-upgrade-btn');
        var registerBtn = document.getElementById('past-life-register-btn');

        if (upgradeBtn) {
            upgradeBtn.addEventListener('click', function(event) {
                event.preventDefault();
                startPastLifeCheckout('past_life_premium_wall', 'register');
            });
        }

        if (registerBtn) {
            registerBtn.addEventListener('click', function(event) {
                event.preventDefault();
                startPastLifeCheckout('past_life_register_gate', 'register');
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
            var name = document.getElementById('pl-name').value.trim();
            var birth = document.getElementById('pl-birth').value;
            var place = (document.getElementById('pl-place').value || '').trim();
            var gender = selectedGender;

            if (!name || name.length < 2) { showError('Zadejte své jméno.'); return; }
            if (!birth) { showError('Zadejte datum narození.'); return; }
            if (!gender) { showError('Vyberte pohlaví.'); return; }

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
                    body: JSON.stringify({ name: name, birthDate: birth, gender: gender, place: place })
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
        var shareText = '\uD83D\uDD2E ' + firstName + ' odhalil/a sv\u016Fj minul\u00FD \u017Eivot: ' +
            (r.era ? 'V \u00E9\u0159e \u201E' + r.era + '\u201C ' : '') +
            (r.identity ? 'byl/a ' + r.identity.substring(0, 60) + (r.identity.length > 60 ? '\u2026' : '') + '. ' : '') +
            'Zjisti sv\u00E9 akashick\u00E9 z\u00E1znamy \u2935\uFE0F';

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
        var isPremium = window.Auth && window.Auth.isPremium && window.Auth.isPremium();

        if (!isLoggedIn || !isPremium) {
            setBlockVisible(document.getElementById('pl-form-wrap'), false);
            setBlockVisible(document.getElementById('premium-wall'), true);
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
