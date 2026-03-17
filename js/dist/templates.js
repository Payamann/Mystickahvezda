class Templates{static renderTarotResult(e,s,i=!0,t=""){const a=i?"Velk\xE1 ark\xE1na":"Mal\xE1 ark\xE1na";return`
            <div class="tarot-result-card fade-in-up" style="animation-delay: ${s*.2}s;">
                <!-- Header Section -->
                <div class="tarot-result-header">
                    <div class="flex-between" style="flex-wrap: wrap; gap: 1rem; align-items: flex-start;">
                        <div>
                            <h3 class="tarot-result-title">${e.name.toUpperCase()}</h3>
                            <div class="tarot-result-meta">
                                <span>${a.toUpperCase()}</span>
                                ${t?`<span class="text-gold" style="margin: 0 0.5rem;">\u2022</span> <span class="text-gold">POZICE: ${t.toUpperCase()}</span>`:""}
                            </div>
                        </div>
                        <div style="font-size: 2.5rem; filter: drop-shadow(0 0 10px rgba(212, 175, 55, 0.4));">\u2B50</div>
                    </div>
                </div>

                <!-- Interpretation Body -->
                <div class="tarot-result-body">
                    <div class="astrologer-note">
                        <span style="font-size: 1.2rem; margin-right: 0.5rem;">\u{1F52E}</span>
                        <span class="text-xs uppercase tracking-wide text-silver">INTERPRETACE OD NA\u0160EHO ASTROLOGA:</span>
                    </div>
                    
                    <p class="tarot-main-text">
                        ${this.escapeHtml(e.interpretation)}
                    </p>

                    <!-- Practical Advice -->
                    <div class="tarot-practical-advice">
                        <strong class="text-starlight">Praktick\xE1 rada:</strong>
                        <span style="color: var(--color-silver-mist);">${this.escapeHtml(e.meaning)}. Nebojte se ud\u011Blat krok, kter\xFD c\xEDt\xEDte jako spr\xE1vn\xFD.</span>
                    </div>
                </div>
            </div>
        `}static renderSummary3Card(e){return`
            <div class="tarot-summary-enhanced tarot-summary-3card fade-in-up" style="animation-delay: ${e.length*.2}s;">
                <div class="summary-header">
                    <div class="summary-icon">\u{1F52E}</div>
                    <h4>Propojen\xED va\u0161\xED cesty</h4>
                    <p class="summary-subtitle">Odkaz minulosti, s\xEDla p\u0159\xEDtomnosti, p\u0159\xEDslib budoucnosti</p>
                </div>
                <div class="summary-timeline">
                    <div class="timeline-item">
                        <span class="timeline-emoji">\u{1F4DC}</span>
                        <span class="timeline-label">Minulost</span>
                        <span class="timeline-card">${this.escapeHtml(e[0]?.name||"")}</span>
                    </div>
                    <div class="timeline-connector">\u2192</div>
                    <div class="timeline-item">
                        <span class="timeline-emoji">\u23F3</span>
                        <span class="timeline-label">P\u0159\xEDtomnost</span>
                        <span class="timeline-card">${this.escapeHtml(e[1]?.name||"")}</span>
                    </div>
                    <div class="timeline-connector">\u2192</div>
                    <div class="timeline-item">
                        <span class="timeline-emoji">\u2728</span>
                        <span class="timeline-label">Budoucnost</span>
                        <span class="timeline-card">${this.escapeHtml(e[2]?.name||"")}</span>
                    </div>
                </div>
                <!-- AI Summary container -->
                ${this.renderEtherealSummaryLoading()}
            </div>
        `}static renderSummaryCeltic(e){return`
            <div class="tarot-summary-enhanced tarot-summary-celtic fade-in-up" style="animation-delay: ${e.length*.2}s;">
                <div class="celtic-header">
                    <div class="celtic-cross-icon">
                        <span>\u2606</span>
                        <span>\u2726</span>
                        <span>\u2606</span>
                    </div>
                    <h4>Hlubok\xFD vhled do va\u0161\xED cesty</h4>
                    <p class="summary-subtitle">Komplexn\xED anal\xFDza keltsk\xE9ho k\u0159\xED\u017Ee</p>
                </div>
                
                <div class="celtic-grid">
                    <div class="celtic-section celtic-core">
                        <h5>\u{1F3AF} J\xE1dro situace</h5>
                        <div class="celtic-cards-mini">
                            <span>${this.escapeHtml(e[0]?.name||"")}</span>
                            <span class="card-separator">\xD7</span>
                            <span>${this.escapeHtml(e[1]?.name||"")}</span>
                        </div>
                    </div>
                    <div class="celtic-section celtic-influences">
                        <h5>\u{1F30A} Skryt\xE9 vlivy</h5>
                        <div class="celtic-cards-mini">
                            <span>${this.escapeHtml(e[2]?.name||"")}</span>
                            <span class="card-separator">&</span>
                            <span>${this.escapeHtml(e[3]?.name||"")}</span>
                        </div>
                    </div>
                    <div class="celtic-section celtic-timeline">
                        <h5>\u23F3 Tok \u010Dasu</h5>
                        <div class="celtic-cards-mini">
                            <span>${this.escapeHtml(e[4]?.name||"")}</span>
                            <span class="card-separator">\u2192</span>
                            <span>${this.escapeHtml(e[5]?.name||"")}</span>
                        </div>
                    </div>
                    <div class="celtic-section celtic-outcome">
                        <h5>\u{1F3C1} Cesta k v\xFDsledku</h5>
                        <div class="celtic-cards-mini">
                            <span>${this.escapeHtml(e[6]?.name||"")}</span>
                            <span>${this.escapeHtml(e[7]?.name||"")}</span>
                            <span>${this.escapeHtml(e[8]?.name||"")}</span>
                            <span class="card-separator">\u2192</span>
                            <span class="outcome-card">${this.escapeHtml(e[9]?.name||"")}</span>
                        </div>
                    </div>
                </div>
                
                <!-- AI Summary container -->
                ${this.renderEtherealSummaryLoading()}
                
                <div class="celtic-footer">
                    <span>\u2727</span>
                    <span>Keltsk\xFD k\u0159\xED\u017E \u2013 nejkomplexn\u011Bj\u0161\xED tarotov\xFD v\xFDklad</span>
                    <span>\u2727</span>
                </div>
            </div>
        `}static renderSummaryDefault(e){return`
            <div class="interpretation-summary fade-in-up" style="animation-delay: ${e.length*.2}s;">
                <h4>\u2728 Cesta va\u0161\xED du\u0161e</h4>
                <div id="ethereal-tarot-summary">
                    <p class="text-center" style="font-style: italic; opacity: 0.7;">
                        <span class="loading-spinner"></span> Spojuji se s univerzem...
                    </p>
                </div>
            </div>
        `}static renderEtherealSummaryLoading(){return`
            <div class="summary-content" id="ethereal-tarot-summary">
                <div class="summary-loading">
                    <div class="loading-crystal">
                        <span>\u{1F48E}</span>
                    </div>
                    <p>Komunikuji s vy\u0161\u0161\xEDmi \u0159\xED\u0161emi...</p>
                    <small>P\u0159ipravuji hlubokou anal\xFDzu va\u0161ich 10 karet</small>
                </div>
            </div>
        `}static renderEtherealProgress(e=[],s="ethereal-progress"){const i=e.map((t,a)=>`
            <div class="ethereal-progress-step${a===0?" active":""}" data-step="${a}">
                <div class="ethereal-progress-step__dot"></div>
                <span class="ethereal-progress-step__label">${this.escapeHtml(t)}</span>
            </div>
        `).join('<div class="ethereal-progress-connector"></div>');return`
            <div class="ethereal-progress" id="${s}" style="
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 0;
                margin: 1.5rem 0;
                flex-wrap: wrap;
            ">
                ${i}
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
                content: '\u2713';
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
        `}static updateEtherealProgress(e,s){const i=document.getElementById(e);i&&i.querySelectorAll(".ethereal-progress-step").forEach((t,a)=>{t.classList.remove("active","done"),a<s?t.classList.add("done"):a===s&&t.classList.add("active")})}static renderAuthModal(){return`
  <div id="auth-modal" class="modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 9999; align-items: center; justify-content: center; backdrop-filter: blur(5px); -webkit-backdrop-filter: blur(5px); overflow-y: auto; padding: 1rem;">
    <div class="modal__content" style="background: #1a0a2e; padding: 2rem; border-radius: 15px; border: 1px solid rgba(155, 89, 182, 0.3); width: 100%; max-width: 400px; position: relative; margin: auto;">
        <span class="modal__close" style="position: absolute; top: 1rem; right: 1rem; cursor: pointer; color: white; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">\u2715</span>
        <h2 id="auth-title" style="text-align: center; color: var(--color-mystic-gold); margin-bottom: 1.5rem;">P\u0159ihl\xE1\u0161en\xED</h2>
        <form id="login-form">
            <div style="margin-bottom: 1rem;">
                <label style="display: block; color: rgba(255,255,255,0.7); margin-bottom: 0.5rem;">Email</label>
                <input type="email" name="email" required autocomplete="email" inputmode="email" style="width: 100%; padding: 14px 16px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); color: white; border-radius: 8px; font-size: 16px; min-height: 48px;">
            </div>
            <div id="password-field-wrapper" style="margin-bottom: 0.5rem;">
                <label style="display: block; color: rgba(255,255,255,0.7); margin-bottom: 0.5rem;">Heslo</label>
                <input type="password" name="password" required autocomplete="current-password" style="width: 100%; padding: 14px 16px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); color: white; border-radius: 8px; font-size: 16px; min-height: 48px;">
            </div>
            <div id="confirm-password-field-wrapper" style="display: none; margin-bottom: 1rem;">
                <label style="display: block; color: rgba(255,255,255,0.7); margin-bottom: 0.5rem;">Potvr\u010Fte heslo</label>
                <input type="password" name="confirm_password" autocomplete="new-password" style="width: 100%; padding: 14px 16px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); color: white; border-radius: 8px; font-size: 16px; min-height: 48px;">
            </div>
            <div id="forgot-password-link" style="text-align: right; margin-bottom: 1rem;">
                <a href="#" id="auth-forgot-password" style="color: rgba(255,255,255,0.4); font-size: 0.8rem;">Zapomn\u011Bli jste heslo?</a>
            </div>

            <!-- Reset Password Fields (hidden by default) -->
            <div id="reset-password-fields" style="display: none; margin-bottom: 1rem;">
                <p style="color: rgba(255,255,255,0.6); font-size: 0.9rem; margin-bottom: 1rem; line-height: 1.5;">Zadejte sv\u016Fj email a po\u0161leme v\xE1m odkaz pro obnoven\xED hesla.</p>
            </div>

            <!-- Optional Register Fields (Moved to onboarding) -->
            <div id="register-fields" style="display: none; margin-bottom: 1rem;">
                <div style="margin-bottom: 1rem;">
                    <label style="display: block; color: rgba(255,255,255,0.7); margin-bottom: 0.5rem;">Datum narozen\xED</label>
                    <input type="date" name="birth_date" style="width: 100%; padding: 14px 16px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); color: white; border-radius: 8px; font-size: 16px; min-height: 48px;">
                </div>
            </div>

            <button type="submit" id="auth-submit" class="btn btn--primary" style="width: 100%; min-height: 48px;">P\u0159ihl\xE1sit se</button>
            <p style="text-align: center; margin-top: 1rem;">
                <a href="#" id="auth-mode-toggle" style="color: var(--color-text-light); font-size: 0.9rem; min-height: 44px; display: inline-block; line-height: 44px;">Nem\xE1te \xFA\u010Det? Zaregistrujte se</a>
            </p>
        </form>
    </div>
  </div>`}static renderAuthorBox(e){return e?`
            <div class="author-box" style="margin-top: var(--space-2xl); padding: var(--space-xl); background: rgba(255,255,255,0.03); border: 1px solid rgba(212, 175, 55, 0.2); border-radius: 16px; display: flex; gap: var(--space-lg); align-items: center;">
                <div class="author-box__avatar" style="width: 80px; height: 80px; border-radius: 50%; border: 2px solid var(--color-mystic-gold); flex-shrink: 0; overflow: hidden; background: #1a0a2e;">
                    <img src="${e.image}" alt="${e.name}" width="80" height="80" style="width: 100%; height: 100%; object-fit: cover;">
                </div>
                <div class="author-box__content">
                    <h4 style="margin: 0 0 0.2rem 0; color: var(--color-mystic-gold); font-size: 1.1rem;">${e.name}</h4>
                    <p style="margin: 0 0 0.5rem 0; font-size: 0.8rem; color: var(--color-starlight); opacity: 0.8; font-weight: 600; text-transform: uppercase;">${e.role}</p>
                    <p style="margin: 0; font-size: 0.9rem; color: var(--color-silver-mist); line-height: 1.5;">${e.bio}</p>
                    ${e.links?`
                        <div style="margin-top: 0.8rem; display: flex; gap: 1rem;">
                            ${e.links.instagram?`<a href="${e.links.instagram}" target="_blank" style="color: rgba(255,255,255,0.4); font-size: 0.8rem; text-decoration: none;">Instagram \u2197</a>`:""}
                            ${e.links.facebook?`<a href="${e.links.facebook}" target="_blank" style="color: rgba(255,255,255,0.4); font-size: 0.8rem; text-decoration: none;">Facebook \u2197</a>`:""}
                        </div>
                    `:""}
                </div>
            </div>
        `:""}static escapeHtml(e){return e?e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;"):""}}typeof module<"u"&&module.exports?module.exports=Templates:window.Templates=Templates;
