(function () {
    if (window.MH_FEEDBACK_WIDGET_INIT) return;
    window.MH_FEEDBACK_WIDGET_INIT = true;

    let csrfPromise = null;

    function getCsrfToken() {
        if (window.getCSRFToken) return window.getCSRFToken();
        if (csrfPromise) return csrfPromise;
        csrfPromise = fetch('/api/csrf-token', { credentials: 'include' })
            .then((response) => response.json())
            .then((data) => data.csrfToken || null)
            .catch(() => null)
            .finally(() => {
                csrfPromise = null;
            });
        return csrfPromise;
    }

    async function sendFeedback(value, widget) {
        const status = widget.querySelector('[data-feedback-status]');
        const buttons = widget.querySelectorAll('[data-feedback-value]');

        buttons.forEach((button) => {
            button.disabled = true;
        });
        if (status) status.textContent = 'Ukládám odpověď...';

        try {
            const csrfToken = await getCsrfToken();
            if (!csrfToken) throw new Error('missing_csrf');

            const response = await fetch('/api/analytics/event', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': csrfToken
                },
                body: JSON.stringify({
                    eventName: 'feedback_submitted',
                    path: window.location.pathname,
                    page: document.title,
                    metadata: {
                        value,
                        path: window.location.pathname,
                        component: 'footer_feedback'
                    }
                })
            });

            if (!response.ok) throw new Error(`http_${response.status}`);

            widget.dataset.feedbackSubmitted = 'true';
            if (status) status.textContent = value === 'yes'
                ? 'Díky, tohle nám pomáhá držet kvalitu.'
                : 'Díky, podíváme se, kde stránka ztrácí jasnost.';
        } catch {
            if (status) status.textContent = 'Zpětnou vazbu se nepodařilo uložit.';
            buttons.forEach((button) => {
                button.disabled = false;
            });
        }
    }

    document.addEventListener('click', (event) => {
        const button = event.target.closest('[data-feedback-value]');
        if (!button) return;
        const widget = button.closest('[data-feedback-widget]');
        if (!widget || widget.dataset.feedbackSubmitted === 'true') return;
        sendFeedback(button.dataset.feedbackValue, widget);
    });
})();
