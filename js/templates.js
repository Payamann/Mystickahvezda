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
                ${this.renderAiSummaryLoading()}
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
                ${this.renderAiSummaryLoading()}
                
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
                <div id="ai-tarot-summary">
                    <p class="text-center" style="font-style: italic; opacity: 0.7;">
                        <span class="loading-spinner"></span> Spojuji se s univerzem...
                    </p>
                </div>
            </div>
        `;
    }

    static renderAiSummaryLoading() {
        return `
            <div class="summary-content" id="ai-tarot-summary">
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

    static renderAuthModal() {
        return `
  <div id="auth-modal" class="modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 9999; align-items: center; justify-content: center; backdrop-filter: blur(5px);">
    <div class="modal__content" style="background: #1a0a2e; padding: 2rem; border-radius: 15px; border: 1px solid rgba(155, 89, 182, 0.3); width: 100%; max-width: 400px; position: relative;">
        <span class="modal__close" style="position: absolute; top: 1rem; right: 1rem; cursor: pointer; color: white;">✕</span>
        <h2 id="auth-title" style="text-align: center; color: var(--color-mystic-gold); margin-bottom: 1.5rem;">Přihlášení</h2>
        <form id="login-form">
            <div style="margin-bottom: 1rem;">
                <label style="display: block; color: rgba(255,255,255,0.7); margin-bottom: 0.5rem;">Email</label>
                <input type="email" name="email" required style="width: 100%; padding: 0.8rem; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); color: white; border-radius: 5px;">
            </div>
            <div style="margin-bottom: 1.5rem;">
                <label style="display: block; color: rgba(255,255,255,0.7); margin-bottom: 0.5rem;">Heslo</label>
                <input type="password" name="password" required style="width: 100%; padding: 0.8rem; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); color: white; border-radius: 5px;">
            </div>

            <!-- Optional Register Fields -->
            <div id="register-fields" style="display: none; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 1rem; margin-bottom: 1rem;">
                <p style="text-align: center; color: var(--color-mystic-gold); font-size: 0.9rem; margin-bottom: 1rem;">Doplňující údaje (nepovinné)</p>
                <div style="margin-bottom: 1rem;">
                    <label style="display: block; color: rgba(255,255,255,0.7); margin-bottom: 0.5rem;">Jméno</label>
                    <input type="text" name="first_name" style="width: 100%; padding: 0.8rem; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); color: white; border-radius: 5px;">
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-bottom: 1rem;">
                    <div>
                        <label style="display: block; color: rgba(255,255,255,0.7); margin-bottom: 0.5rem; font-size: 0.8rem;">Datum narození</label>
                        <input type="date" name="birth_date" style="width: 100%; padding: 0.8rem 0.5rem; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); color: white; border-radius: 5px;">
                    </div>
                     <div>
                        <label style="display: block; color: rgba(255,255,255,0.7); margin-bottom: 0.5rem; font-size: 0.8rem;">Čas narození</label>
                        <input type="time" name="birth_time" style="width: 100%; padding: 0.8rem 0.5rem; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); color: white; border-radius: 5px;">
                    </div>
                </div>
                <div style="margin-bottom: 1rem;">
                    <label style="display: block; color: rgba(255,255,255,0.7); margin-bottom: 0.5rem;">Místo narození</label>
                    <input type="text" name="birth_place" placeholder="Např. Praha" style="width: 100%; padding: 0.8rem; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); color: white; border-radius: 5px;">
                </div>
            </div>

            <button type="submit" id="auth-submit" class="btn btn--primary" style="width: 100%;">Přihlásit se</button>
            <p style="text-align: center; margin-top: 1rem;">
                <a href="#" id="auth-mode-toggle" style="color: var(--color-text-light); font-size: 0.9rem;">Nemáte účet? Zaregistrujte se</a>
            </p>
        </form>
    </div>
  </div>`;
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
