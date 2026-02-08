export function initPaymentButtons() {
    const buyButtons = document.querySelectorAll('a[data-plan]');

    buyButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const planId = btn.getAttribute('data-plan');

            if (planId === 'poutnik') {
                if (!window.Auth?.isLoggedIn()) {
                    window.Auth?.toggleModal?.();
                } else {
                    window.location.href = 'profil.html';
                }
                return;
            }

            handlePaymentClick(planId, btn);
        });
    });
}

async function handlePaymentClick(planId, btn) {
    // Check if user is logged in
    if (!window.Auth || !window.Auth.isLoggedIn()) {
        window.Auth?.showToast?.('Přihlášení vyžadováno', 'Pro nákup předplatného se prosím nejdříve přihlaste.', 'info');
        window.Auth?.toggleModal?.();
        return;
    }

    const originalText = btn.innerHTML;

    try {
        // Loading state
        btn.disabled = true;
        btn.style.opacity = '0.7';
        btn.innerHTML = '<span class="loading-spinner" style="width: 16px; height: 16px; border-width: 2px; vertical-align: middle; margin-right: 8px;"></span> Přesměrování...';

        const token = window.Auth.token || localStorage.getItem('auth_token');
        const baseUrl = window.API_CONFIG?.BASE_URL || 'http://localhost:3001/api';

        const response = await fetch(`${baseUrl}/payment/create-checkout-session`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ planId })
        });

        const result = await response.json();

        if (result.url) {
            // Redirect to Stripe Checkout
            window.location.href = result.url;
        } else {
            throw new Error(result.error || 'Nepodařilo se vytvořit platební relaci');
        }

    } catch (error) {
        console.error('Payment Error:', error);
        window.Auth?.showToast?.('Chyba platby', error.message, 'error');

        // Reset button
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.innerHTML = originalText;
    }
}

