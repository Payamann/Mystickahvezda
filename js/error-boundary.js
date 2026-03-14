/**
 * Mystická Hvězda - Global Error Boundary
 * Prevents application crashes from showing a blank screen.
 */
(function() {
    window.addEventListener('error', function(event) {
        console.error('Captured Global Error:', event.error);
        showErrorUI(event.message);
    });

    window.addEventListener('unhandledrejection', function(event) {
        console.error('Captured Async Error:', event.reason);
        showErrorUI('Problém s připojením k vesmírným serverům.');
    });

    function showErrorUI(message) {
        // Only show if it's a critical breakage (no other content visible)
        const root = document.querySelector('main') || document.body;
        if (root && root.innerHTML.length < 500) {
            const errorDiv = document.createElement('div');
            errorDiv.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: #0a0a1a; color: white; display: flex; flex-direction: column;
                justify-content: center; align-items: center; z-index: 9999;
                text-align: center; padding: 2rem; font-family: 'Cinzel', serif;
            `;
            
            errorDiv.innerHTML = `
                <div style="max-width: 600px; border: 1px solid rgba(212,175,55,0.3); padding: 3rem; border-radius: 20px; background: rgba(255,255,255,0.02); backdrop-filter: blur(20px);">
                    <h1 style="color: #d4af37; font-size: 2rem; margin-bottom: 1rem;">Omlouváme se, hvězdy jsou dočasně v mlze.</h1>
                    <p style="color: rgba(255,255,255,0.7); margin-bottom: 2rem; font-family: 'Inter', sans-serif;">
                        Došlo k nečekané technické chybě. Naši mágové na nápravě již pracují.
                    </p>
                    <button onclick="window.location.reload()" style="cursor: pointer; background: #d4af37; border: none; padding: 1rem 2rem; border-radius: 10px; font-weight: bold; color: #0a0a1a; font-family: 'Inter', sans-serif;">
                        Zkusit znovu spojení
                    </button>
                    <a href="/" style="display: block; margin-top: 1rem; color: rgba(255,255,255,0.4); text-decoration: none; font-size: 0.9rem;">Zpět na hlavní bránu</a>
                </div>
            `;
            document.body.appendChild(errorDiv);
        }
    }
})();
