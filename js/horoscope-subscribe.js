(function () {
    'use strict';

    var SUB_KEY = 'mh_horoscope_subscribed';

    function init() {
        var btn = document.getElementById('horoscope-subscribe-btn');
        var subscribedMsg = document.getElementById('horoscope-subscribed-msg');

        if (!btn) return;

        // If already subscribed, show success state
        if (localStorage.getItem(SUB_KEY)) {
            showSubscribed();
        }

        btn.addEventListener('click', async function () {
            var email = document.getElementById('horoscope-email-input').value.trim();
            var sign = document.getElementById('horoscope-sign-select').value;

            if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                alert('Zadejte platnou emailovou adresu.');
                return;
            }
            if (!sign) {
                alert('Vyberte své znamení zvěrokruhu.');
                return;
            }

            btn.disabled = true;
            btn.textContent = 'Přihlašuji...';

            try {
                var base = (window.API_CONFIG && window.API_CONFIG.BASE_URL) || '/api';

                var csrfRes = await fetch(base + '/csrf-token', { credentials: 'include' });
                var csrfData = await csrfRes.json();
                var csrfToken = csrfData.csrfToken || csrfData.token || '';

                var res = await fetch(base + '/subscribe/horoscope', {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
                    body: JSON.stringify({ email: email, zodiac_sign: sign })
                });
                var data = await res.json();

                if (res.ok && data.success) {
                    localStorage.setItem(SUB_KEY, sign);
                    showSubscribed();
                    if (window.Auth && window.Auth.showToast) {
                        window.Auth.showToast('Hotovo!', 'Potvrzení přijde na tvůj email.', 'success');
                    }
                } else {
                    alert(data.error || 'Chyba při přihlašování. Zkuste to znovu.');
                    btn.disabled = false;
                    btn.textContent = '✨ Přihlásit k odběru';
                }
            } catch (e) {
                alert('Chyba připojení. Zkuste to prosím znovu.');
                btn.disabled = false;
                btn.textContent = '✨ Přihlásit k odběru';
            }
        });

        function showSubscribed() {
            if (btn) { btn.style.display = 'none'; }
            if (subscribedMsg) { subscribedMsg.style.display = 'block'; }
            var emailInput = document.getElementById('horoscope-email-input');
            var signSelect = document.getElementById('horoscope-sign-select');
            if (emailInput) emailInput.style.display = 'none';
            if (signSelect) signSelect.style.display = 'none';
        }

        // Pre-fill sign from personalization
        window.addEventListener('personalization:ready', function () {
            if (localStorage.getItem(SUB_KEY)) return;
            var sign = window.MH_PERSONALIZATION && window.MH_PERSONALIZATION.getSign && window.MH_PERSONALIZATION.getSign();
            var signMap = { beran: 'Beran', byk: 'Býk', blizenci: 'Blíženci', rak: 'Rak', lev: 'Lev', panna: 'Panna', vahy: 'Váhy', stir: 'Štír', strelec: 'Střelec', kozoroh: 'Kozoroh', vodnar: 'Vodnář', ryby: 'Ryby' };
            var sel = document.getElementById('horoscope-sign-select');
            if (sign && signMap[sign] && sel) sel.value = signMap[sign];
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
