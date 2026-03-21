(function () {
    'use strict';

    var selectedGender = '';

    function apiBase() {
        return (window.API_CONFIG && window.API_CONFIG.BASE_URL) || '/api';
    }

    function showError(msg) {
        var el = document.getElementById('pl-error');
        el.textContent = msg;
        el.style.display = 'block';
    }
    function hideError() {
        document.getElementById('pl-error').style.display = 'none';
    }

    function init() {
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
            document.getElementById('form-section').style.display = 'none';
            document.getElementById('pl-loading').style.display = 'block';
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

                document.getElementById('pl-loading').style.display = 'none';

                if (!res.ok || !data.success) {
                    document.getElementById('form-section').style.display = 'block';
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

                document.getElementById('pl-result').classList.add('visible');
                window.scrollTo({ top: document.getElementById('pl-result').offsetTop - 80, behavior: 'smooth' });

            } catch (e) {
                document.getElementById('pl-loading').style.display = 'none';
                document.getElementById('form-section').style.display = 'block';
                showError('Chyba připojení. Zkuste to prosím znovu.');
            }
        });

        // Reset
        document.getElementById('pl-reset').addEventListener('click', function() {
            document.getElementById('pl-result').classList.remove('visible');
            document.getElementById('form-section').style.display = 'block';
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // Auth check
    function checkAuth() {
        var isLoggedIn = window.Auth && window.Auth.isLoggedIn && window.Auth.isLoggedIn();
        var isPremium = window.Auth && window.Auth.isPremium && window.Auth.isPremium();

        if (!isLoggedIn || !isPremium) {
            document.getElementById('pl-form-wrap').style.display = 'none';
            document.getElementById('premium-wall').style.display = 'block';
        } else {
            document.getElementById('pl-form-wrap').style.display = 'block';
            document.getElementById('premium-wall').style.display = 'none';
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
