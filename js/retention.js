/**
 * RETENTION: Churn Prevention Flows
 *
 * Cancellation Flow:
 * - Exit intent detection
 * - Pause instead of cancel option
 * - Feedback collection
 * - Win-back campaigns
 */

const MH_RETENTION = {
    /**
     * Show cancellation modal when user attempts to cancel subscription
     */
    showCancellationModal(onConfirm) {
        const modal = document.createElement('div');
        modal.className = 'retention-modal-overlay';
        modal.innerHTML = `
            <div class="retention-modal">
                <button class="retention-modal__close" onclick="MH_RETENTION.closeCancellationModal()">×</button>

                <h2 class="retention-modal__title">Chceme se zlepšit! 💫</h2>
                <p class="retention-modal__subtitle">Prosím řekněte nám, proč chcete odejít</p>

                <form id="cancellation-feedback-form" class="retention-form">
                    <!-- Cancellation reason options -->
                    <div class="retention-form__options">
                        <label class="retention-form__option">
                            <input type="radio" name="reason" value="too_expensive" required>
                            <span class="retention-form__label">💰 Příliš drahé</span>
                            <span class="retention-form__hint">Nabídneme vám slevu</span>
                        </label>

                        <label class="retention-form__option">
                            <input type="radio" name="reason" value="not_using">
                            <span class="retention-form__label">😴 Nepoužívám</span>
                            <span class="retention-form__hint">Pozastavte na měsíc zdarma</span>
                        </label>

                        <label class="retention-form__option">
                            <input type="radio" name="reason" value="found_better">
                            <span class="retention-form__label">🔍 Mám lepší alternativu</span>
                            <span class="retention-form__hint">Kterou aplikaci?</span>
                        </label>

                        <label class="retention-form__option">
                            <input type="radio" name="reason" value="personal">
                            <span class="retention-form__label">🤷 Osobní důvody</span>
                            <span class="retention-form__hint">Můžete se vrátit později</span>
                        </label>

                        <label class="retention-form__option">
                            <input type="radio" name="reason" value="other">
                            <span class="retention-form__label">❓ Jiné</span>
                            <span class="retention-form__hint">Můžete napsat více</span>
                        </label>
                    </div>

                    <!-- Optional feedback text -->
                    <textarea
                        id="cancellation-feedback-text"
                        class="retention-form__textarea"
                        placeholder="Ostatní informace (volitelné)..."
                        rows="3"
                    ></textarea>

                    <!-- Action buttons -->
                    <div class="retention-form__actions">
                        <button type="button" class="btn btn--secondary" onclick="MH_RETENTION.handleCancellation()">
                            Zrušit
                        </button>
                        <button type="button" class="btn btn--primary" onclick="MH_RETENTION.handleOffer()">
                            Podívat se na nabídky
                        </button>
                    </div>
                </form>

                <!-- Pause subscription offer (appears after selecting reason) -->
                <div id="pause-offer" class="retention-offer" style="display: none;">
                    <h3>⏸️ Pozastavit místo zrušení?</h3>
                    <p>Vaše předplatné bude pozastaveno na <strong>1 měsíc zdarma</strong>.</p>
                    <p>Vraťte se, až vám budeme chybět — bez ztráty dat.</p>
                    <button class="btn btn--primary" onclick="MH_RETENTION.handlePause()">
                        Pozastavit na měsíc
                    </button>
                </div>

                <!-- Discount offer (appears for "too expensive") -->
                <div id="discount-offer" class="retention-offer" style="display: none;">
                    <h3>💝 Speciální nabídka</h3>
                    <p>Máme pro vás <strong>50% slevu</strong> na příští 3 měsíce.</p>
                    <p class="retention-offer__code">Kód: <code>COMEBACK50</code></p>
                    <button class="btn btn--primary" onclick="MH_RETENTION.handleDiscountAccept()">
                        Přijmout slevu
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.currentModal = modal;

        // Form submit handler
        document.getElementById('cancellation-feedback-form').addEventListener('change', (e) => {
            const reason = e.target.value;
            this.showRelevantOffer(reason);
        });

        // Track that user is in churn flow
        trackEvent('churn_prevention_shown', { timestamp: new Date() });
    },

    /**
     * Show relevant offer based on cancellation reason
     */
    showRelevantOffer(reason) {
        document.getElementById('pause-offer').style.display = 'none';
        document.getElementById('discount-offer').style.display = 'none';

        if (reason === 'not_using') {
            document.getElementById('pause-offer').style.display = 'block';
            trackEvent('pause_offer_shown');
        } else if (reason === 'too_expensive') {
            document.getElementById('discount-offer').style.display = 'block';
            trackEvent('discount_offer_shown');
        }
    },

    /**
     * User confirmed cancellation (no option taken)
     */
    async handleCancellation() {
        const form = document.getElementById('cancellation-feedback-form');
        const reason = form.querySelector('input[name="reason"]:checked')?.value;
        const feedback = document.getElementById('cancellation-feedback-text').value;

        // Save feedback
        try {
            const response = await fetch('/api/retention/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'cancellation',
                    reason: reason || 'not_provided',
                    feedback: feedback,
                    timestamp: new Date().toISOString()
                })
            });

            if (response.ok) {
                trackEvent('churn_confirmed', { reason });
            }
        } catch (e) {
            console.warn('Failed to save churn feedback:', e);
        }

        // Proceed with cancellation
        this.closeCancellationModal();
        // Call parent cancellation handler
        if (window.onCancellationConfirmed) {
            window.onCancellationConfirmed();
        }
    },

    /**
     * User wants to pause subscription instead of cancel
     */
    async handlePause() {
        try {
            const response = await fetch('/api/subscription/pause', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pauseDays: 30
                })
            });

            const data = await response.json();

            if (response.ok) {
                this.showToast('✓ Vaše předplatné je pozastaveno na 1 měsíc!', 'success');
                trackEvent('pause_accepted');
                this.closeCancellationModal();

                // Send pause notification email
                this.sendPauseEmail();

                // Redirect to account page
                setTimeout(() => {
                    window.location.href = '/profil.html';
                }, 2000);
            } else {
                this.showToast('Chyba: ' + (data.error || 'Unknown error'), 'error');
            }
        } catch (e) {
            this.showToast('Chyba při pozastavení: ' + e.message, 'error');
        }
    },

    /**
     * User accepts discount offer
     */
    async handleDiscountAccept() {
        try {
            const response = await fetch('/api/subscription/apply-discount', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    couponCode: 'COMEBACK50'
                })
            });

            if (response.ok) {
                this.showToast('✓ Sleva byla aplikována! 50% na 3 měsíce.', 'success');
                trackEvent('discount_accepted');
                this.closeCancellationModal();

                // Send discount confirmation email
                this.sendDiscountEmail();

                setTimeout(() => {
                    window.location.reload();
                }, 2000);
            }
        } catch (e) {
            this.showToast('Chyba při aplikování slevy: ' + e.message, 'error');
        }
    },

    /**
     * Show offer selection (called on form change)
     */
    handleOffer() {
        const reason = document.querySelector('input[name="reason"]:checked')?.value;

        if (!reason) {
            this.showToast('Prosím vyberte důvod odchodu', 'info');
            return;
        }

        if (reason === 'not_using') {
            this.handlePause();
        } else if (reason === 'too_expensive') {
            this.handleDiscountAccept();
        } else {
            this.handleCancellation();
        }
    },

    /**
     * Close cancellation modal
     */
    closeCancellationModal() {
        if (this.currentModal) {
            this.currentModal.style.animation = 'retention-modal-fade-out 0.3s ease-out';
            setTimeout(() => {
                this.currentModal.remove();
                this.currentModal = null;
            }, 300);
        }
    },

    /**
     * Show toast notification
     */
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `retention-toast retention-toast--${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'retention-toast-fade-out 0.3s ease-out';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    /**
     * Send pause email notification
     */
    async sendPauseEmail() {
        try {
            await fetch('/api/email/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    template: 'subscription_paused',
                    data: { daysUntilResume: 30 }
                })
            });
        } catch (e) {
            console.warn('Failed to send pause email:', e);
        }
    },

    /**
     * Send discount email notification
     */
    async sendDiscountEmail() {
        try {
            await fetch('/api/email/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    template: 'discount_applied',
                    data: { discount: 50, months: 3 }
                })
            });
        } catch (e) {
            console.warn('Failed to send discount email:', e);
        }
    }
};

// Export for use in subscription management pages
window.MH_RETENTION = MH_RETENTION;
