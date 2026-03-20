
(function() {

    const today = new Date().toDateString();

    const storageKey = 'mh_daily_crystal_' + today;

    const DAILY_LIMIT = 3;

    const used = parseInt(localStorage.getItem(storageKey) || '0');

    const remaining = Math.max(0, DAILY_LIMIT - used);



    const banner = document.getElementById('freemium-banner');

    const countEl = document.getElementById('freemium-count');



    // Zobrazit jen nepřihlášeným nebo free uživatelům

    document.addEventListener('DOMContentLoaded', () => {

        const auth = window.Auth;

        if (!auth || !auth.isPremium()) {

            if (countEl) countEl.textContent = remaining + ' / ' + DAILY_LIMIT;

            if (banner) banner.style.display = 'block';

        }

    });

})();
