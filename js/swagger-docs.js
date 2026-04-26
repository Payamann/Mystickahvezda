(function initSwaggerDocs() {
    const mount = document.getElementById('swagger-ui');
    if (!mount || typeof window.SwaggerUIBundle !== 'function') return;

    window.SwaggerUIBundle({
        url: mount.dataset.specUrl || '/api/docs/openapi.yaml',
        dom_id: '#swagger-ui',
        presets: [
            window.SwaggerUIBundle.presets.apis,
            window.SwaggerUIBundle.SwaggerUIStandalonePreset,
        ],
        layout: 'BaseLayout',
        deepLinking: true,
        tryItOutEnabled: true,
        requestInterceptor: (req) => {
            if (req.method !== 'GET' && !req.headers['X-CSRF-Token']) {
                return fetch('/api/csrf-token')
                    .then((res) => res.json())
                    .then((data) => {
                        req.headers['X-CSRF-Token'] = data.csrfToken;
                        return req;
                    });
            }
            return req;
        },
    });
})();
