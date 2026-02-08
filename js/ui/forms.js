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
                const response = await fetch('/api/newsletter/subscribe', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
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
                    input.focus(); // Focus back to try again
                    alert(error.message); // Simple feedback for now
                }, 3000);
            }
        });

        // Clear invalid state on input
        input.addEventListener('input', () => {
            input.removeAttribute('aria-invalid');
        });
    });
}

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
