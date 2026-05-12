/**
 * Templates.js
 * Centralized string templates for UI components.
 */

(() => {
class Templates {
    static animationDelayClass(step) {
        const safeStep = Math.max(0, Math.min(10, Number.parseInt(step, 10) || 0));
        return `anim-delay-step-${safeStep}`;
    }

    /**
     * Renders a Tarot card HTML string for the result view
     */
    static renderTarotResult(card, index, isMajor = true, positionLabel = '') {
        const arcanaType = isMajor ? 'Velká arkána' : 'Malá arkána';
        const delayClass = this.animationDelayClass(index);

        return `
            <div class="tarot-result-card fade-in-up ${delayClass}">
                <!-- Header Section -->
                <div class="tarot-result-header">
                    <div class="flex-between tarot-result-header__top">
                        <div>
                            <h3 class="tarot-result-title">${card.name.toUpperCase()}</h3>
                            <div class="tarot-result-meta">
                                <span>${arcanaType.toUpperCase()}</span>
                                ${positionLabel ? `<span class="text-gold tarot-result-meta__separator">•</span> <span class="text-gold">POZICE: ${positionLabel.toUpperCase()}</span>` : ''}
                            </div>
                        </div>
                        <div class="tarot-result-star">⭐</div>
                    </div>
                </div>

                <!-- Interpretation Body -->
                <div class="tarot-result-body">
                    <div class="astrologer-note">
                        <span class="astrologer-note__icon">🔮</span>
                        <span class="text-xs uppercase tracking-wide text-silver">INTERPRETACE OD NAŠEHO ASTROLOGA:</span>
                    </div>
                    
                    <p class="tarot-main-text">
                        ${this.escapeHtml(card.interpretation)}
                    </p>

                    <!-- Practical Advice -->
                    <div class="tarot-practical-advice">
                        <strong class="text-starlight">Praktická rada:</strong>
                        <span class="tarot-practical-advice__text">${this.escapeHtml(card.meaning)}. Nebojte se udělat krok, který cítíte jako správný.</span>
                    </div>
                </div>
            </div>
        `;
    }

    static renderSummary3Card(drawnCards) {
        return `
            <div class="tarot-summary-enhanced tarot-summary-3card fade-in-up ${this.animationDelayClass(drawnCards.length)}">
                <div class="summary-header">
                    <div class="summary-icon">🔮</div>
                    <h4>Propojení vaší cesty</h4>
                    <p class="summary-subtitle">Odkaz minulosti, síla přítomnosti, příslib budoucnosti</p>
                </div>
                <div class="summary-timeline">
                    <div class="timeline-item">
                        <span class="timeline-emoji">📜</span>
                        <span class="timeline-label">Minulost</span>
                        <span class="timeline-card">${this.escapeHtml(drawnCards[0]?.name || '')}</span>
                    </div>
                    <div class="timeline-connector">→</div>
                    <div class="timeline-item">
                        <span class="timeline-emoji">⏳</span>
                        <span class="timeline-label">Přítomnost</span>
                        <span class="timeline-card">${this.escapeHtml(drawnCards[1]?.name || '')}</span>
                    </div>
                    <div class="timeline-connector">→</div>
                    <div class="timeline-item">
                        <span class="timeline-emoji">✨</span>
                        <span class="timeline-label">Budoucnost</span>
                        <span class="timeline-card">${this.escapeHtml(drawnCards[2]?.name || '')}</span>
                    </div>
                </div>
                <!-- AI Summary container -->
                ${this.renderEtherealSummaryLoading()}
            </div>
        `;
    }

    static renderSummaryCeltic(drawnCards) {
        return `
            <div class="tarot-summary-enhanced tarot-summary-celtic fade-in-up ${this.animationDelayClass(drawnCards.length)}">
                <div class="celtic-header">
                    <div class="celtic-cross-icon">
                        <span>☆</span>
                        <span>✦</span>
                        <span>☆</span>
                    </div>
                    <h4>Hluboký vhled do vaší cesty</h4>
                    <p class="summary-subtitle">Komplexní analýza keltského kříže</p>
                </div>
                
                <div class="celtic-grid">
                    <div class="celtic-section celtic-core">
                        <h5>🎯 Jádro situace</h5>
                        <div class="celtic-cards-mini">
                            <span>${this.escapeHtml(drawnCards[0]?.name || '')}</span>
                            <span class="card-separator">×</span>
                            <span>${this.escapeHtml(drawnCards[1]?.name || '')}</span>
                        </div>
                    </div>
                    <div class="celtic-section celtic-influences">
                        <h5>🌊 Skryté vlivy</h5>
                        <div class="celtic-cards-mini">
                            <span>${this.escapeHtml(drawnCards[2]?.name || '')}</span>
                            <span class="card-separator">&</span>
                            <span>${this.escapeHtml(drawnCards[3]?.name || '')}</span>
                        </div>
                    </div>
                    <div class="celtic-section celtic-timeline">
                        <h5>⏳ Tok času</h5>
                        <div class="celtic-cards-mini">
                            <span>${this.escapeHtml(drawnCards[4]?.name || '')}</span>
                            <span class="card-separator">→</span>
                            <span>${this.escapeHtml(drawnCards[5]?.name || '')}</span>
                        </div>
                    </div>
                    <div class="celtic-section celtic-outcome">
                        <h5>🏁 Cesta k výsledku</h5>
                        <div class="celtic-cards-mini">
                            <span>${this.escapeHtml(drawnCards[6]?.name || '')}</span>
                            <span>${this.escapeHtml(drawnCards[7]?.name || '')}</span>
                            <span>${this.escapeHtml(drawnCards[8]?.name || '')}</span>
                            <span class="card-separator">→</span>
                            <span class="outcome-card">${this.escapeHtml(drawnCards[9]?.name || '')}</span>
                        </div>
                    </div>
                </div>
                
                <!-- AI Summary container -->
                ${this.renderEtherealSummaryLoading()}
                
                <div class="celtic-footer">
                    <span>✧</span>
                    <span>Keltský kříž – nejkomplexnější tarotový výklad</span>
                    <span>✧</span>
                </div>
            </div>
        `;
    }

    static renderSummaryDefault(drawnCards) {
        return `
            <div class="interpretation-summary fade-in-up ${this.animationDelayClass(drawnCards.length)}">
                <h4>✨ Cesta vaší duše</h4>
                <div id="ethereal-tarot-summary">
                    <p class="text-center tarot-summary-loading-text">
                        <span class="loading-spinner"></span> Spojuji se s univerzem...
                    </p>
                </div>
            </div>
        `;
    }

    static renderEtherealSummaryLoading() {
        return `
            <div class="summary-content" id="ethereal-tarot-summary">
                <div class="summary-loading">
                    <div class="loading-crystal">
                        <span>💎</span>
                    </div>
                    <p>Komunikuji s vyššími říšemi...</p>
                    <small>Připravuji hlubokou analýzu vašich 10 karet</small>
                </div>
            </div>
        `;
    }

    /**
     * Renders a multi-step AI progress indicator
     * @param {string[]} steps - Array of step labels
     * @param {string} containerId - ID to use for the container
     */
    static renderEtherealProgress(steps = [], containerId = 'ethereal-progress') {
        const stepsHtml = steps.map((step, i) => `
            <div class="ethereal-progress-step${i === 0 ? ' active' : ''}" data-step="${i}">
                <div class="ethereal-progress-step__dot"></div>
                <span class="ethereal-progress-step__label">${this.escapeHtml(step)}</span>
            </div>
        `).join('<div class="ethereal-progress-connector"></div>');

        return `
            <div class="ethereal-progress" id="${containerId}">
                ${stepsHtml}
            </div>
        `;
    }

    /**
     * Updates which step is active in the AI progress indicator
     * @param {string} containerId 
     * @param {number} activeIndex 
     */
    static updateEtherealProgress(containerId, activeIndex) {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.querySelectorAll('.ethereal-progress-step').forEach((step, i) => {
            step.classList.remove('active', 'done');
            if (i < activeIndex) step.classList.add('done');
            else if (i === activeIndex) step.classList.add('active');
        });
    }

    static renderAuthModal() {
        return `
  <div id="auth-modal" class="modal modal--auth" hidden>
    <div class="modal__content auth-modal__content">
        <span class="modal__close auth-modal__close">✕</span>
        <h2 id="auth-title" class="auth-modal__title">Přihlášení</h2>
        <form id="login-form">
            <div class="auth-modal__field">
                <label class="auth-modal__label">Email</label>
                <input class="auth-modal__input" type="email" name="email" required autocomplete="email" inputmode="email">
            </div>
            <div id="password-field-wrapper" class="auth-modal__field auth-modal__field--compact">
                <label class="auth-modal__label">Heslo</label>
                <input class="auth-modal__input" type="password" name="password" required autocomplete="current-password">
            </div>
            <div id="confirm-password-field-wrapper" class="auth-modal__field" hidden>
                <label class="auth-modal__label">Potvrďte heslo</label>
                <input class="auth-modal__input" type="password" name="confirm_password" autocomplete="new-password">
            </div>
            <div id="forgot-password-link" class="auth-modal__forgot">
                <a href="#" id="auth-forgot-password" class="auth-modal__muted-link">Zapomněli jste heslo?</a>
            </div>

            <!-- Reset Password Fields (hidden by default) -->
            <div id="reset-password-fields" class="auth-modal__field" hidden>
                <p class="auth-modal__help-text">Zadejte svůj email a pošleme vám odkaz pro obnovení hesla.</p>
            </div>

            <!-- Optional Register Fields (Moved to onboarding) -->
            <div id="register-fields" class="auth-modal__field" hidden>
                <div class="auth-modal__field">
                    <label class="auth-modal__label">Datum narození</label>
                    <input class="auth-modal__input" type="date" name="birth_date">
                </div>
            </div>

            <button type="submit" id="auth-submit" class="btn btn--primary auth-modal__submit">Přihlásit se</button>
            <p class="auth-modal__toggle-wrap">
                <a href="#" id="auth-mode-toggle" class="auth-modal__mode-toggle">Nemáte účet? Zaregistrujte se</a>
            </p>
        </form>
    </div>
  </div>`;
    }

    static renderAuthorBox(author) {
        if (!author) return '';
        
        return `
            <div class="author-box">
                <div class="author-box__avatar">
                    <img class="author-box__image" src="${author.image}" alt="${author.name}" width="80" height="80">
                </div>
                <div class="author-box__content">
                    <h4 class="author-box__name">${author.name}</h4>
                    <p class="author-box__role">${author.role}</p>
                    <p class="author-box__bio">${author.bio}</p>
                    ${author.links ? `
                        <div class="author-box__links">
                            ${author.links.instagram ? `<a class="author-box__link" href="${author.links.instagram}" target="_blank" rel="noopener">Instagram ↗</a>` : ''}
                            ${author.links.facebook ? `<a class="author-box__link" href="${author.links.facebook}" target="_blank" rel="noopener">Facebook ↗</a>` : ''}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    static escapeHtml(text) {
        if (!text) return '';
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

// Attach to window for browser usage
if (typeof window !== 'undefined') {
    window.Templates = Templates;
}
})();
