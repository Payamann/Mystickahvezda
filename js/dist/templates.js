(()=>{(()=>{class l{static animationDelayClass(a){return`anim-delay-step-${Math.max(0,Math.min(10,Number.parseInt(a,10)||0))}`}static renderTarotResult(a,e,i=!0,s=""){const t=i?"Velk\xE1 ark\xE1na":"Mal\xE1 ark\xE1na";return`
            <div class="tarot-result-card fade-in-up ${this.animationDelayClass(e)}">
                <!-- Header Section -->
                <div class="tarot-result-header">
                    <div class="flex-between tarot-result-header__top">
                        <div>
                            <h3 class="tarot-result-title">${a.name.toUpperCase()}</h3>
                            <div class="tarot-result-meta">
                                <span>${t.toUpperCase()}</span>
                                ${s?`<span class="text-gold tarot-result-meta__separator">\u2022</span> <span class="text-gold">POZICE: ${s.toUpperCase()}</span>`:""}
                            </div>
                        </div>
                        <div class="tarot-result-star">\u2B50</div>
                    </div>
                </div>

                <!-- Interpretation Body -->
                <div class="tarot-result-body">
                    <div class="astrologer-note">
                        <span class="astrologer-note__icon">\u{1F52E}</span>
                        <span class="text-xs uppercase tracking-wide text-silver">INTERPRETACE OD NA\u0160EHO ASTROLOGA:</span>
                    </div>
                    
                    <p class="tarot-main-text">
                        ${this.escapeHtml(a.interpretation)}
                    </p>

                    <!-- Practical Advice -->
                    <div class="tarot-practical-advice">
                        <strong class="text-starlight">Praktick\xE1 rada:</strong>
                        <span class="tarot-practical-advice__text">${this.escapeHtml(a.meaning)}. Nebojte se ud\u011Blat krok, kter\xFD c\xEDt\xEDte jako spr\xE1vn\xFD.</span>
                    </div>
                </div>
            </div>
        `}static renderSummary3Card(a){return`
            <div class="tarot-summary-enhanced tarot-summary-3card fade-in-up ${this.animationDelayClass(a.length)}">
                <div class="summary-header">
                    <div class="summary-icon">\u{1F52E}</div>
                    <h4>Propojen\xED va\u0161\xED cesty</h4>
                    <p class="summary-subtitle">Odkaz minulosti, s\xEDla p\u0159\xEDtomnosti, p\u0159\xEDslib budoucnosti</p>
                </div>
                <div class="summary-timeline">
                    <div class="timeline-item">
                        <span class="timeline-emoji">\u{1F4DC}</span>
                        <span class="timeline-label">Minulost</span>
                        <span class="timeline-card">${this.escapeHtml(a[0]?.name||"")}</span>
                    </div>
                    <div class="timeline-connector">\u2192</div>
                    <div class="timeline-item">
                        <span class="timeline-emoji">\u23F3</span>
                        <span class="timeline-label">P\u0159\xEDtomnost</span>
                        <span class="timeline-card">${this.escapeHtml(a[1]?.name||"")}</span>
                    </div>
                    <div class="timeline-connector">\u2192</div>
                    <div class="timeline-item">
                        <span class="timeline-emoji">\u2728</span>
                        <span class="timeline-label">Budoucnost</span>
                        <span class="timeline-card">${this.escapeHtml(a[2]?.name||"")}</span>
                    </div>
                </div>
                <!-- AI Summary container -->
                ${this.renderEtherealSummaryLoading()}
            </div>
        `}static renderSummaryCeltic(a){return`
            <div class="tarot-summary-enhanced tarot-summary-celtic fade-in-up ${this.animationDelayClass(a.length)}">
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
                            <span>${this.escapeHtml(a[0]?.name||"")}</span>
                            <span class="card-separator">\xD7</span>
                            <span>${this.escapeHtml(a[1]?.name||"")}</span>
                        </div>
                    </div>
                    <div class="celtic-section celtic-influences">
                        <h5>\u{1F30A} Skryt\xE9 vlivy</h5>
                        <div class="celtic-cards-mini">
                            <span>${this.escapeHtml(a[2]?.name||"")}</span>
                            <span class="card-separator">&</span>
                            <span>${this.escapeHtml(a[3]?.name||"")}</span>
                        </div>
                    </div>
                    <div class="celtic-section celtic-timeline">
                        <h5>\u23F3 Tok \u010Dasu</h5>
                        <div class="celtic-cards-mini">
                            <span>${this.escapeHtml(a[4]?.name||"")}</span>
                            <span class="card-separator">\u2192</span>
                            <span>${this.escapeHtml(a[5]?.name||"")}</span>
                        </div>
                    </div>
                    <div class="celtic-section celtic-outcome">
                        <h5>\u{1F3C1} Cesta k v\xFDsledku</h5>
                        <div class="celtic-cards-mini">
                            <span>${this.escapeHtml(a[6]?.name||"")}</span>
                            <span>${this.escapeHtml(a[7]?.name||"")}</span>
                            <span>${this.escapeHtml(a[8]?.name||"")}</span>
                            <span class="card-separator">\u2192</span>
                            <span class="outcome-card">${this.escapeHtml(a[9]?.name||"")}</span>
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
        `}static renderSummaryDefault(a){return`
            <div class="interpretation-summary fade-in-up ${this.animationDelayClass(a.length)}">
                <h4>\u2728 Cesta va\u0161\xED du\u0161e</h4>
                <div id="ethereal-tarot-summary">
                    <p class="text-center tarot-summary-loading-text">
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
        `}static renderEtherealProgress(a=[],e="ethereal-progress"){const i=a.map((s,t)=>`
            <div class="ethereal-progress-step${t===0?" active":""}" data-step="${t}">
                <div class="ethereal-progress-step__dot"></div>
                <span class="ethereal-progress-step__label">${this.escapeHtml(s)}</span>
            </div>
        `).join('<div class="ethereal-progress-connector"></div>');return`
            <div class="ethereal-progress" id="${e}">
                ${i}
            </div>
        `}static updateEtherealProgress(a,e){const i=document.getElementById(a);i&&i.querySelectorAll(".ethereal-progress-step").forEach((s,t)=>{s.classList.remove("active","done"),t<e?s.classList.add("done"):t===e&&s.classList.add("active")})}static renderAuthModal(){return`
  <div id="auth-modal" class="modal modal--auth" hidden>
    <div class="modal__content auth-modal__content">
        <span class="modal__close auth-modal__close">\u2715</span>
        <h2 id="auth-title" class="auth-modal__title">P\u0159ihl\xE1\u0161en\xED</h2>
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
                <label class="auth-modal__label">Potvr\u010Fte heslo</label>
                <input class="auth-modal__input" type="password" name="confirm_password" autocomplete="new-password">
            </div>
            <div id="forgot-password-link" class="auth-modal__forgot">
                <a href="#" id="auth-forgot-password" class="auth-modal__muted-link">Zapomn\u011Bli jste heslo?</a>
            </div>

            <!-- Reset Password Fields (hidden by default) -->
            <div id="reset-password-fields" class="auth-modal__field" hidden>
                <p class="auth-modal__help-text">Zadejte sv\u016Fj email a po\u0161leme v\xE1m odkaz pro obnoven\xED hesla.</p>
            </div>

            <!-- Optional Register Fields (Moved to onboarding) -->
            <div id="register-fields" class="auth-modal__field" hidden>
                <div class="auth-modal__field">
                    <label class="auth-modal__label">Datum narozen\xED</label>
                    <input class="auth-modal__input" type="date" name="birth_date">
                </div>
            </div>

            <button type="submit" id="auth-submit" class="btn btn--primary auth-modal__submit">P\u0159ihl\xE1sit se</button>
            <p class="auth-modal__toggle-wrap">
                <a href="#" id="auth-mode-toggle" class="auth-modal__mode-toggle">Nem\xE1te \xFA\u010Det? Zaregistrujte se</a>
            </p>
        </form>
    </div>
  </div>`}static renderAuthorBox(a){return a?`
            <div class="author-box">
                <div class="author-box__avatar">
                    <img class="author-box__image" src="${a.image}" alt="${a.name}" width="80" height="80">
                </div>
                <div class="author-box__content">
                    <h4 class="author-box__name">${a.name}</h4>
                    <p class="author-box__role">${a.role}</p>
                    <p class="author-box__bio">${a.bio}</p>
                    ${a.links?`
                        <div class="author-box__links">
                            ${a.links.instagram?`<a class="author-box__link" href="${a.links.instagram}" target="_blank" rel="noopener">Instagram \u2197</a>`:""}
                            ${a.links.facebook?`<a class="author-box__link" href="${a.links.facebook}" target="_blank" rel="noopener">Facebook \u2197</a>`:""}
                        </div>
                    `:""}
                </div>
            </div>
        `:""}static escapeHtml(a){return a?a.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;"):""}}typeof window<"u"&&(window.Templates=l)})();})();
