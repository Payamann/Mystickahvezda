(function () {
    const nonCriticalScripts = [
        'js/dist/nav-failsafe.js',
        'js/dist/exit-intent.js',
        'js/newsletter-popup.js?v=5',
        'js/push-notifications.js?v=5',
        'js/retention.js?v=6'
    ];

    function loadScript(src) {
        const script = document.createElement('script');
        script.src = src;
        script.defer = true;
        document.body.appendChild(script);
    }

    function loadNonCriticalScripts() {
        nonCriticalScripts.forEach(loadScript);
    }

    let nonCriticalLoaded = false;
    function loadNonCriticalOnce() {
        if (nonCriticalLoaded) return;
        nonCriticalLoaded = true;
        loadNonCriticalScripts();
    }

    function scheduleLoad() {
        ['pointerdown', 'keydown', 'scroll'].forEach((eventName) => {
            window.addEventListener(eventName, loadNonCriticalOnce, { once: true, passive: true });
        });

        window.setTimeout(loadNonCriticalOnce, 15000);
    }

    if (document.readyState === 'complete') {
        scheduleLoad();
    } else {
        window.addEventListener('load', scheduleLoad, { once: true });
    }
})();
