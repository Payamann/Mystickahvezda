/* ============================================
   8. EMAIL FORM (Demo handling with validation)
   ============================================ */
export function initEmailForms() {
    const emailForms = document.querySelectorAll('.email-form');

    emailForms.forEach(form => {
        const input = form.querySelector('input[type="email"]');
        const button = form.querySelector('button');

        if (!input || !button) return;

        // Store original button text
        const originalButtonText = button.textContent;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = input.value.trim();

            // Basic validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!email || !emailRegex.test(email)) {
                input.setAttribute('aria-invalid', 'true');
                input.focus();
                return;
            }

            input.setAttribute('aria-invalid', 'false');

            // UI Loading State
            button.textContent = '⏳ Odesílám...';
            button.disabled = true;
            input.disabled = true;

            try {
                const csrfToken = window.getCSRFToken ? await window.getCSRFToken() : null;
                const baseUrl = window.API_CONFIG?.BASE_URL || '/api';
                const response = await fetch(`${baseUrl}/newsletter/subscribe`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        ...(csrfToken && { 'X-CSRF-Token': csrfToken })
                    },
                    body: JSON.stringify({ email })
                });

                const data = await response.json();

                if (data.success) {
                    // Success State
                    button.textContent = '✓ Odesláno!';
                    button.classList.add('btn--success');

                    // Announce to SR
                    const announcement = document.createElement('div');
                    announcement.setAttribute('role', 'status');
                    announcement.setAttribute('aria-live', 'polite');
                    announcement.className = 'sr-only';
                    announcement.textContent = data.message;
                    form.appendChild(announcement);

                    setTimeout(() => {
                        button.textContent = originalButtonText;
                        button.classList.remove('btn--success');
                        button.disabled = false;
                        input.disabled = false;
                        input.value = '';
                        announcement.remove();
                    }, 4000);
                } else {
                    // Error State (e.g. duplicate email)
                    throw new Error(data.error || 'Nastala chyba');
                }

            } catch (error) {
                console.error('Newsletter Error:', error);

                // Show error locally
                button.textContent = '❌ Chyba';
                button.classList.add('btn--error'); // Ensure this class exists or is okay

                // Reset after delay
                setTimeout(() => {
                    button.textContent = originalButtonText;
                    button.classList.remove('btn--error');
                    button.disabled = false;
                    input.disabled = false;
                    input.focus();
                    if (window.Auth?.showToast) {
                        window.Auth.showToast('Chyba', error.message, 'error');
                    }
                }, 3000);
            }
        });

        // Clear invalid state on input
        input.addEventListener('input', () => {
            input.removeAttribute('aria-invalid');
        });
    });
}

const FIELD_ERROR_CLASS = 'form-field-error';
const FORM_SUMMARY_CLASS = 'form-error-summary';

function getFieldContainer(field) {
    const passwordWrap = field.closest('.password-input-wrap');
    if (passwordWrap?.parentElement) return passwordWrap.parentElement;

    return field.closest('.form-group, .settings-row > div, label') || field.parentElement;
}

function getFriendlyValidationMessage(field) {
    if (field.validity.valueMissing) return 'Vyplňte prosím toto pole.';
    if (field.validity.typeMismatch && field.type === 'email') return 'Zadejte prosím platný e-mail.';
    if (field.validity.tooShort) return `Zadejte alespoň ${field.minLength} znaků.`;
    if (field.validity.patternMismatch) return 'Hodnota nemá očekávaný formát.';
    if (field.validity.customError) return field.validationMessage;
    return field.validationMessage || 'Zkontrolujte prosím toto pole.';
}

function ensureFieldError(field) {
    const container = getFieldContainer(field);
    if (!container) return null;

    let error = container.querySelector(`:scope > .${FIELD_ERROR_CLASS}`);
    if (!error) {
        error = document.createElement('p');
        error.className = FIELD_ERROR_CLASS;
        error.id = `${field.id || field.name || 'field'}-error`;
        error.setAttribute('role', 'alert');
        container.appendChild(error);
    }

    const describedBy = new Set((field.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean));
    describedBy.add(error.id);
    field.setAttribute('aria-describedby', Array.from(describedBy).join(' '));

    return error;
}

export function setFieldError(field, message) {
    if (!field) return;
    const error = ensureFieldError(field);
    field.setAttribute('aria-invalid', 'true');
    field.classList.add('form-input--invalid');
    if (error) {
        error.textContent = message || getFriendlyValidationMessage(field);
        error.hidden = false;
    }
}

export function clearFieldError(field) {
    if (!field) return;
    const container = getFieldContainer(field);
    const error = container?.querySelector(`:scope > .${FIELD_ERROR_CLASS}`);
    field.removeAttribute('aria-invalid');
    field.classList.remove('form-input--invalid');
    if (error) {
        error.textContent = '';
        error.hidden = true;
    }
}

function ensureFormSummary(form) {
    let summary = form.querySelector(`:scope > .${FORM_SUMMARY_CLASS}`);
    if (!summary) {
        summary = document.createElement('div');
        summary.className = FORM_SUMMARY_CLASS;
        summary.setAttribute('role', 'alert');
        summary.setAttribute('aria-live', 'assertive');
        summary.hidden = true;
        form.prepend(summary);
    }
    return summary;
}

export function setFormSummary(form, message) {
    if (!form) return;
    const summary = ensureFormSummary(form);
    summary.textContent = message;
    summary.hidden = false;
}

export function clearFormSummary(form) {
    const summary = form?.querySelector(`:scope > .${FORM_SUMMARY_CLASS}`);
    if (summary) {
        summary.textContent = '';
        summary.hidden = true;
    }
}

export function setSubmitPending(button, pending, pendingText = 'Pracuji...') {
    if (!button) return;

    if (pending) {
        if (!button.dataset.originalLabel) {
            button.dataset.originalLabel = button.textContent?.trim() || '';
        }
        button.disabled = true;
        button.setAttribute('aria-busy', 'true');
        button.classList.add('is-submitting');
        button.textContent = pendingText;
        return;
    }

    button.disabled = false;
    button.removeAttribute('aria-busy');
    button.classList.remove('is-submitting');
    if (button.dataset.originalLabel) {
        button.textContent = button.dataset.originalLabel;
        delete button.dataset.originalLabel;
    }
}

export function initFormUX() {
    const forms = document.querySelectorAll('form:not([data-form-ux="off"])');

    forms.forEach(form => {
        if (form.dataset.formUxInit === 'true') return;
        form.dataset.formUxInit = 'true';

        form.addEventListener('invalid', (event) => {
            const field = event.target;
            if (!(field instanceof HTMLElement)) return;
            setFieldError(field, getFriendlyValidationMessage(field));
            setFormSummary(form, 'Zkontrolujte prosím zvýrazněná pole.');
        }, true);

        form.addEventListener('submit', () => {
            clearFormSummary(form);
            form.querySelectorAll('[aria-invalid="true"]').forEach(clearFieldError);
        }, true);

        form.querySelectorAll('input, select, textarea').forEach(field => {
            field.addEventListener('input', () => {
                field.setCustomValidity('');
                clearFieldError(field);
                if (form.checkValidity()) clearFormSummary(form);
            });
            field.addEventListener('change', () => {
                if (field.checkValidity()) clearFieldError(field);
            });
        });
    });
}

window.MH_FORM_UX = {
    setFieldError,
    clearFieldError,
    setFormSummary,
    clearFormSummary,
    setSubmitPending
};

function validateDateInput(input) {
    if (!input.value) return;

    // Use HTML attributes if present, or defaults
    const minStr = input.getAttribute('min') || '1900-01-01';
    const maxStr = input.getAttribute('max') || '2100-12-31';

    const minDate = new Date(minStr);
    const maxDate = new Date(maxStr);
    const valueDate = new Date(input.value);

    // Invalid date check
    if (isNaN(valueDate.getTime())) {
        input.value = '';
        return;
    }

    // Range check REMOVED as per user request
    // We only rely on the 4-digit limit enforced in the input event listener.
    input.setCustomValidity('');
}

/* ============================================
   10. DATE INPUT VALIDATION
   ============================================ */
export function initDateValidation() {
    const dateInputs = document.querySelectorAll('input[type="date"]');

    dateInputs.forEach(input => {
        // Validation on blur/change
        input.addEventListener('blur', (e) => validateDateInput(e.target));
        input.addEventListener('change', (e) => validateDateInput(e.target));

        // Prevent manual entry of > 4 digit years
        input.addEventListener('input', (e) => {
            const val = e.target.value;
            if (val) {
                // Splits YYYY-MM-DD
                const parts = val.split('-');
                // parts[0] is year.
                if (parts[0] && parts[0].length > 4) {
                    // Truncate year to 4 digits
                    const newYear = parts[0].substring(0, 4);
                    // Reconstruct valid date string YYYY-MM-DD
                    const newValue = `${newYear}-${parts[1]}-${parts[2]}`;

                    // Only update if it actually changed to prevent cursor jumping issues if possible (though date inputs are tricky)
                    if (e.target.value !== newValue) {
                        e.target.value = newValue;
                    }
                }
            }
        });
    });
}
