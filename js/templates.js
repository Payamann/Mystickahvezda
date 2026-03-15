/**
 * Templates.js
 * Centralized string templates for UI components.
 */

class Templates {

    /**
     * Renders a Tarot card HTML string for the result view
     */
    static renderTarotResult(card, index, isMajor = true, positionLabel = '') {
        const arcanaType = isMajor ? 'Velká arkána' : 'Malá arkána';
        const delay = index * 0.2;

        return `
            <div class="tarot-result-card fade-in-up" style="animation-delay: ${delay}s;">
                <!-- Header Section -->
                <div class="tarot-result-header">
                    <div class="flex-between" style="flex-wrap: wrap; gap: 1rem; align-items: flex-start;">
                        <div>
                            <h3 class="tarot-result-title">${card.name.toUpperCase()}</h3>
                            <div class="tarot-result-meta">
                                <span>${arcanaType.toUpperCase()}</span>
                                ${positionLabel ? `<span class="text-gold" style="margin: 0 0.5rem;">•</span> <span class="text-gold">POZICE: ${positionLabel.toUpperCase()}</span>` : ''}
                            </div>
                        </div>
                        <div style="font-size: 2.5rem; filter: drop-shadow(0 0 10px rgba(212, 175, 55, 0.4));">⭐</div>
                    </div>
                </div>

                <!-- Interpretation Body -->
                <div class="tarot-result-body">
                    <div class="astrologer-note">
                        <span style="font-size: 1.2rem; margin-right: 0.5rem;">🔮</span>
                        <span class="text-xs uppercase tracking-wide text-silver">INTERPRETACE OD NAŠEHO ASTROLOGA:</span>
                    </div>
                    
                    <p class="tarot-main-text">
                        ${this.escapeHtml(card.interpretation)}
                    </p>

                    <!-- Practical Advice -->
                    <div class="tarot-practical-advice">
                        <strong class="text-starlight">Praktická rada:</strong>
                        <span style="color: var(--color-silver-mist);">${this.escapeHtml(card.meaning)}. Nebojte se udělat krok, který cítíte jako správný.</span>
                    </div>
                </div>
            </div>
        `;
    }

    static renderSummary3Card(drawnCards) {
        return `
            <div class="tarot-summary-enhanced tarot-summary-3card fade-in-up" style="animation-delay: ${drawnCards.length * 0.2}s;">
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
            <div class="tarot-summary-enhanced tarot-summary-celtic fade-in-up" style="animation-delay: ${drawnCards.length * 0.2}s;">
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
            <div class="interpretation-summary fade-in-up" style="animation-delay: ${drawnCards.length * 0.2}s;">
                <h4>✨ Cesta vaší duše</h4>
                <div id="ethereal-tarot-summary">
                    <p class="text-center" style="font-style: italic; opacity: 0.7;">
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
            <div class="ethereal-progress" id="${containerId}" style="
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 0;
                margin: 1.5rem 0;
                flex-wrap: wrap;
            ">
                ${stepsHtml}
            </div>
            <style>
            .ethereal-progress-step { display: flex; flex-direction: column; align-items: center; gap: 0.4rem; }
            .ethereal-progress-step__dot {
                width: 28px; height: 28px;
                border-radius: 50%;
                background: rgba(255,255,255,0.1);
                border: 2px solid rgba(255,255,255,0.2);
                transition: all 0.4s ease;
                position: relative;
            }
            .ethereal-progress-step.active .ethereal-progress-step__dot {
                background: var(--color-ethereal-violet);
                border-color: var(--color-ethereal-violet);
                box-shadow: 0 0 12px rgba(157,78,221,0.6);
                animation: pulse-dot 1.2s ease-in-out infinite;
            }
            .ethereal-progress-step.done .ethereal-progress-step__dot {
                background: var(--color-mystic-gold);
                border-color: var(--color-mystic-gold);
                box-shadow: 0 0 8px rgba(212,175,55,0.4);
            }
            .ethereal-progress-step.done .ethereal-progress-step__dot::after {
                content: '✓';
                position: absolute;
                inset: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 0.8rem;
                color: #000;
                font-weight: 700;
            }
            .ethereal-progress-step__label { font-size: 0.7rem; color: rgba(255,255,255,0.5); text-align: center; max-width: 80px; line-height: 1.3; }
            .ethereal-progress-step.active .ethereal-progress-step__label { color: var(--color-starlight); }
            .ethereal-progress-step.done .ethereal-progress-step__label { color: var(--color-mystic-gold); }
            .ethereal-progress-connector { width: 40px; height: 2px; background: rgba(255,255,255,0.1); margin: 14px 0 0; }
            @keyframes pulse-dot { 0%,100% { transform: scale(1); } 50% { transform: scale(1.15); } }
            </style>
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
  <div id="auth-modal" class="modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 9999; align-items: center; justify-content: center; backdrop-filter: blur(5px); -webkit-backdrop-filter: blur(5px); overflow-y: auto; padding: 1rem;">
    <div class="modal__content" style="background: #1a0a2e; padding: 2rem; border-radius: 15px; border: 1px solid rgba(155, 89, 182, 0.3); width: 100%; max-width: 400px; position: relative; margin: auto;">
        <span class="modal__close" style="position: absolute; top: 1rem; right: 1rem; cursor: pointer; color: white; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">✕</span>
        <h2 id="auth-title" style="text-align: center; color: var(--color-mystic-gold); margin-bottom: 1.5rem;">Přihlášení</h2>
        <form id="login-form">
            <div style="margin-bottom: 1rem;">
                <label style="display: block; color: rgba(255,255,255,0.7); margin-bottom: 0.5rem;">Email</label>
                <input type="email" name="email" required autocomplete="email" inputmode="email" style="width: 100%; padding: 14px 16px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); color: white; border-radius: 8px; font-size: 16px; min-height: 48px;">
            </div>
            <div id="password-field-wrapper" style="margin-bottom: 0.5rem;">
                <label style="display: block; color: rgba(255,255,255,0.7); margin-bottom: 0.5rem;">Heslo</label>
                <input type="password" name="password" required autocomplete="current-password" style="width: 100%; padding: 14px 16px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); color: white; border-radius: 8px; font-size: 16px; min-height: 48px;">
            </div>
            <div id="forgot-password-link" style="text-align: right; margin-bottom: 1rem;">
                <a href="#" id="auth-forgot-password" style="color: rgba(255,255,255,0.4); font-size: 0.8rem;">Zapomněli jste heslo?</a>
            </div>

            <!-- Reset Password Fields (hidden by default) -->
            <div id="reset-password-fields" style="display: none; margin-bottom: 1rem;">
                <p style="color: rgba(255,255,255,0.6); font-size: 0.9rem; margin-bottom: 1rem; line-height: 1.5;">Zadejte svůj email a pošleme vám odkaz pro obnovení hesla.</p>
            </div>

            <!-- Optional Register Fields (Moved to onboarding) -->
            <div id="register-fields" style="display: none; margin-bottom: 1rem;">
                <label style="display: block; color: rgba(255,255,255,0.7); margin-bottom: 0.5rem;">Potvrďte heslo</label>
                <input type="password" name="confirm_password" autocomplete="new-password" style="width: 100%; padding: 14px 16px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); color: white; border-radius: 8px; font-size: 16px; min-height: 48px;">
            </div>

            <button type="submit" id="auth-submit" class="btn btn--primary" style="width: 100%; min-height: 48px;">Přihlásit se</button>
            <p style="text-align: center; margin-top: 1rem;">
                <a href="#" id="auth-mode-toggle" style="color: var(--color-text-light); font-size: 0.9rem; min-height: 44px; display: inline-block; line-height: 44px;">Nemáte účet? Zaregistrujte se</a>
            </p>
        </form>
    </div>
  </div>`;
    }

    static renderAuthorBox(author) {
        if (!author) return '';
        
        return `
            <div class="author-box" style="margin-top: var(--space-2xl); padding: var(--space-xl); background: rgba(255,255,255,0.03); border: 1px solid rgba(212, 175, 55, 0.2); border-radius: 16px; display: flex; gap: var(--space-lg); align-items: center;">
                <div class="author-box__avatar" style="width: 80px; height: 80px; border-radius: 50%; border: 2px solid var(--color-mystic-gold); flex-shrink: 0; overflow: hidden; background: #1a0a2e;">
                    <img src="${author.image}" alt="${author.name}" width="80" height="80" style="width: 100%; height: 100%; object-fit: cover;">
                </div>
                <div class="author-box__content">
                    <h4 style="margin: 0 0 0.2rem 0; color: var(--color-mystic-gold); font-size: 1.1rem;">${author.name}</h4>
                    <p style="margin: 0 0 0.5rem 0; font-size: 0.8rem; color: var(--color-starlight); opacity: 0.8; font-weight: 600; text-transform: uppercase;">${author.role}</p>
                    <p style="margin: 0; font-size: 0.9rem; color: var(--color-silver-mist); line-height: 1.5;">${author.bio}</p>
                    ${author.links ? `
                        <div style="margin-top: 0.8rem; display: flex; gap: 1rem;">
                            ${author.links.instagram ? `<a href="${author.links.instagram}" target="_blank" style="color: rgba(255,255,255,0.4); font-size: 0.8rem; text-decoration: none;">Instagram ↗</a>` : ''}
                            ${author.links.facebook ? `<a href="${author.links.facebook}" target="_blank" style="color: rgba(255,255,255,0.4); font-size: 0.8rem; text-decoration: none;">Facebook ↗</a>` : ''}
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

// Export for module usage, or attach to window for script usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Templates;
} else {
    window.Templates = Templates;
}
