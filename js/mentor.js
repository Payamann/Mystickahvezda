/**
 * Hvězdný Průvodce - Frontend Logic
 */

// DOM elementy — inicializujeme v DOMContentLoaded (bezpečná inicializace)
let chatInput, sendBtn, messagesContainer, typingIndicator;
const MENTOR_DAILY_LIMIT = 3;
const MENTOR_PENDING_PROMPT_KEY = 'mentor_pending_prompt_v1';
const MENTOR_PENDING_PROMPT_MAX_AGE_MS = 30 * 60 * 1000;
const MENTOR_PAYMENT_REASSURANCE = 'Cena se zobraz\u00ed ve Stripe p\u0159ed potvrzen\u00edm. Zru\u0161en\u00ed najdete v profilu.';

function getMentorUsageStorageKey(date = new Date()) {
    return `mh_daily_mentor_${date.toDateString()}`;
}

function readMentorUsageCount(date = new Date()) {
    try {
        return Math.max(0, Number.parseInt(localStorage.getItem(getMentorUsageStorageKey(date)) || '0', 10) || 0);
    } catch {
        return 0;
    }
}

function writeMentorUsageCount(count, date = new Date()) {
    try {
        localStorage.setItem(getMentorUsageStorageKey(date), String(Math.max(0, count)));
    } catch {
        // Storage can fail in strict privacy modes; server-side quota still protects the limit.
    }
}

function resizeChatInput() {
    if (!chatInput) return;
    const lineEstimate = chatInput.value.split('\n').length + Math.floor(chatInput.value.length / 70);
    chatInput.rows = Math.max(1, Math.min(6, lineEstimate));
}

function resetChatInput() {
    if (!chatInput) return;
    chatInput.value = '';
    chatInput.rows = 1;
}

function fillMentorPrompt(prompt, promptType = 'unknown') {
    if (!chatInput || !prompt) return;

    chatInput.value = prompt;
    resizeChatInput();
    sendBtn?.removeAttribute('disabled');
    chatInput.focus();
    chatInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.MH_ANALYTICS?.trackCTA?.('mentor_prompt_starter', {
        feature: 'mentor',
        prompt_type: promptType
    });
}

function setupMentorPromptStarters() {
    document.querySelectorAll('[data-mentor-prompt]').forEach((button) => {
        if (button.dataset.mentorPromptBound === 'true') return;
        button.dataset.mentorPromptBound = 'true';
        button.addEventListener('click', () => {
            fillMentorPrompt(button.dataset.mentorPrompt || '', button.dataset.mentorPromptType || 'unknown');
        });
    });
}

function buildMentorUpgradeUrl(source = 'mentor_inline_upsell') {
    const pricingUrl = new URL('/cenik.html', window.location.origin);
    pricingUrl.searchParams.set('plan', 'pruvodce');
    pricingUrl.searchParams.set('source', source);
    pricingUrl.searchParams.set('feature', 'mentor');
    pricingUrl.searchParams.set('entry_source', source);
    pricingUrl.searchParams.set('entry_feature', 'mentor');
    return `${pricingUrl.pathname}${pricingUrl.search}`;
}

function buildMentorSignupUrl(source = 'mentor_entry_auth_gate') {
    const signupUrl = new URL('/prihlaseni.html', window.location.origin);
    signupUrl.searchParams.set('mode', 'register');
    signupUrl.searchParams.set('redirect', '/mentor.html');
    signupUrl.searchParams.set('source', source);
    signupUrl.searchParams.set('feature', 'mentor');
    return `${signupUrl.pathname}${signupUrl.search}`;
}

function savePendingMentorPrompt(prompt, source = 'mentor_entry_auth_gate') {
    const cleanPrompt = String(prompt || '').trim().slice(0, 2000);
    if (!cleanPrompt) return;

    try {
        sessionStorage.setItem(MENTOR_PENDING_PROMPT_KEY, JSON.stringify({
            prompt: cleanPrompt,
            source,
            createdAt: Date.now()
        }));
    } catch {
        // Losing the pending prompt is preferable to blocking signup.
    }
}

function restorePendingMentorPrompt() {
    if (!chatInput) return;

    let pending;
    try {
        pending = JSON.parse(sessionStorage.getItem(MENTOR_PENDING_PROMPT_KEY) || 'null');
    } catch {
        pending = null;
    }

    if (!pending?.prompt || (Date.now() - Number(pending.createdAt || 0)) > MENTOR_PENDING_PROMPT_MAX_AGE_MS) {
        try { sessionStorage.removeItem(MENTOR_PENDING_PROMPT_KEY); } catch {}
        return;
    }

    chatInput.value = pending.prompt;
    resizeChatInput();
    sendBtn?.removeAttribute('disabled');
    chatInput.focus();
    chatInput.scrollIntoView({ behavior: 'smooth', block: 'center' });

    try { sessionStorage.removeItem(MENTOR_PENDING_PROMPT_KEY); } catch {}
    window.MH_ANALYTICS?.trackAction?.('mentor_prompt_restored_after_signup', {
        source: pending.source || 'mentor_entry_auth_gate',
        feature: 'mentor'
    });
}

function startMentorSignupFlow(prompt, source = 'mentor_entry_auth_gate') {
    savePendingMentorPrompt(prompt, source);
    window.MH_ANALYTICS?.trackCTA?.(source, {
        feature: 'mentor',
        destination: '/prihlaseni.html',
        auth_mode: 'register'
    });
    window.location.href = buildMentorSignupUrl(source);
}

function startMentorUpgradeFlow(source = 'mentor_inline_upsell') {
    window.MH_ANALYTICS?.trackCTA?.(source, {
        plan_id: 'pruvodce',
        feature: 'mentor'
    });

    if (window.Auth?.startPlanCheckout) {
        window.Auth.startPlanCheckout('pruvodce', {
            source,
            feature: 'mentor',
            metadata: {
                entry_source: source,
                entry_feature: 'mentor'
            },
            redirect: '/cenik.html',
            authMode: window.Auth?.isLoggedIn?.() ? 'login' : 'register'
        });
        return;
    }

    window.location.href = buildMentorUpgradeUrl(source);
}

function trackMentorPaywallDismissed(source) {
    window.MH_ANALYTICS?.trackAction?.('paywall_dismissed', {
        source,
        feature: 'mentor'
    });
}

function runAfterComponentsLoaded(callback) {
    let hasRun = false;
    const run = () => {
        if (hasRun) return;
        hasRun = true;
        callback();
    };
    if (document.readyState === 'complete' && document.getElementById('auth-btn')) {
        run();
        return;
    }
    document.addEventListener('components:loaded', run, { once: true });
    window.setTimeout(run, 1200);
}

function keepMentorFree(source, overlay = null) {
    trackMentorPaywallDismissed(source);
    overlay?.classList.remove('limit-reached-overlay--visible');
    messagesContainer?.classList.remove('chat-messages--blurred');

    if (chatInput) {
        chatInput.disabled = true;
        chatInput.placeholder = 'Denní limit zdarma je vyčerpaný. Ke starším odpovědím se můžeš vrátit tady.';
    }
    if (sendBtn) sendBtn.disabled = true;
}

document.addEventListener('DOMContentLoaded', async () => {
    // Inicializuj DOM elementy — musí být uvnitř DOMContentLoaded
    chatInput = document.getElementById('chat-input');
    sendBtn = document.getElementById('send-btn');
    messagesContainer = document.getElementById('chat-messages');
    typingIndicator = document.getElementById('typing-indicator');
    setupMentorPromptStarters();

    // Připoj event listenery až po inicializaci DOM
    if (chatInput) {
        chatInput.addEventListener('input', function () {
            resizeChatInput();

            if (this.value.trim().length > 0) {
                sendBtn?.removeAttribute('disabled');
            } else {
                sendBtn?.setAttribute('disabled', 'true');
            }
        });

        chatInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }
    if (sendBtn) sendBtn.addEventListener('click', sendMessage);
    // Wait for auth-client to initialize (if needed) but we can check token directly.
    // Odhlášený návštěvník má nejdřív vidět hodnotu: starter otázky a chat input.
    // Registrace se spouští až při odeslání otázky, kdy prompt uložíme pro návrat.
    if (!window.Auth?.isLoggedIn()) {
        document.addEventListener('auth:changed', () => {
            if (window.Auth?.isLoggedIn()) window.location.reload();
        }, { once: true });
        window.isPremium = false;
        return;
    }

    // Check Premium Status
    try {
        const userProfile = await window.Auth.getProfile();
        // Allow everyone to enter, but use the shared Auth helper for plan status.
        window.isPremium = Boolean(userProfile && window.Auth?.isPremium?.());

        // Initialize usage tracking for free users
        if (!window.isPremium) {
            initUsageTracking();
        }

        // Load History for everyone (if any)
        loadHistory();
        restorePendingMentorPrompt();

    } catch (error) {
        console.error('Failed to verify subscription:', error);
    }

    // Auto-focus input
    chatInput?.focus();
});

function initUsageTracking() {
    writeMentorUsageCount(readMentorUsageCount());
}

async function loadHistory() {
    try {
        const response = await fetch(`${API_CONFIG.BASE_URL}/mentor/history`, {
            credentials: 'include'
        });

        const data = await response.json();
        if (data.success && data.history) {
            // Remove the default welcome message if we have history?
            // Or keep it as a header? Let's keep it for now or maybe clear container.
            // Actually, if we have history, it might feel weird to have the default greeting at top.
            // Let's remove default greeting if we have history.
            if (data.history.length > 0) {
                const welcomeMsg = messagesContainer.querySelector('.message--mentor');
                if (welcomeMsg && welcomeMsg.innerText.includes('Vítej, poutníku')) {
                    welcomeMsg.remove();
                }

                data.history.forEach(msg => {
                    addMessage(msg.content, msg.role, false); // false = do not scroll yet
                });
                scrollToBottom();
            }

            // Always check if we should greet (e.g. if >12h since last msg, backend decides)
            // We call this regardless of history length to catch "return" visitors
            checkGreeting();

        }
    } catch (e) {
        console.warn('Failed to load history', e);
    }
}

async function checkGreeting() {
    // Basic frontend check to avoid spamming the API on every reload if we KNOW we just chatted?
    // Actually, backend comparison is better. API call is cheap.

    try {
        const csrfToken = window.getCSRFToken ? await window.getCSRFToken() : null;
        const response = await fetch(`${API_CONFIG.BASE_URL}/mentor/greeting`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                ...(csrfToken && { 'X-CSRF-Token': csrfToken })
            }
        });

        const data = await response.json();
        if (data.success && data.greeting) {
            // Add the greeting!
            addMessage(data.greeting, 'mentor', true);
        }
    } catch (e) {
        // Silent fail
        if (window.MH_DEBUG) console.debug('No greeting today.');
    }
}

async function sendMessage() {
    if (!chatInput || !sendBtn || !messagesContainer || !typingIndicator) return;
    const text = chatInput.value.trim();
    if (!text) return;

    // 0. Auth Check (token je HttpOnly cookie, kontrolujeme přes Auth objekt)
    if (!window.Auth?.isLoggedIn()) {
        window.Auth?.showToast?.('Účet zdarma uloží otázku', 'Vytvořte si účet a Průvodce se vrátí přesně k této otázce.', 'info');
        startMentorSignupFlow(text, 'mentor_entry_auth_gate');
        document.addEventListener('auth:changed', () => {
            if (window.Auth?.isLoggedIn()) window.location.reload();
        }, { once: true });
        return;
    }

    // Check usage limits for free users
    if (!window.isPremium && checkUsageLimit()) {
        // Limit reached logic (The "Hook")
        addMessage(text, 'user');
        resetChatInput();
        chatInput.disabled = true;
        sendBtn.disabled = true;

        showTyping(true);

        // Simulate thinking time then show teaser
        setTimeout(() => {
            showTyping(false);
            showTeaserResponse();
        }, 2000);
        return;
    }

    // 1. Add User Message
    addMessage(text, 'user');
    resetChatInput();
    sendBtn.setAttribute('disabled', 'true');

    // Increment usage for free users
    if (!window.isPremium) {
        incrementUsage();
    }

    // 2. Show Typing Indicator
    showTyping(true);

    // 3. Call API
    try {
        const csrfToken = window.getCSRFToken ? await window.getCSRFToken() : null;
        const response = await fetch(`${API_CONFIG.BASE_URL}/mentor/chat`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                ...(csrfToken && { 'X-CSRF-Token': csrfToken })
            },
            body: JSON.stringify({ message: text })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Chat API Error:', response.status, errorData);
            if (response.status === 402 || response.status === 403) {
                // Subscription issue - show paywall
                showPaywall();
                throw new Error('Premium vyžadováno');
            }
            throw new Error(errorData.error || 'Chyba komunikace');
        }

        const data = await response.json();

        // Hide typing
        showTyping(false);

        if (data.reply) {
            addMessage(data.reply, 'mentor');
        } else if (data.error) {
            addMessage(`⚠️ Chyba: ${data.error}`, 'mentor');
        }

    } catch (error) {
        showTyping(false);
        console.error('Chat error:', error);
        addMessage("Omlouvám se, hvězdné spojení bylo přerušeno. Zkus to prosím za chvíli.", 'mentor');
    }
}

function checkUsageLimit() {
    return readMentorUsageCount() >= MENTOR_DAILY_LIMIT;
}

function incrementUsage() {
    writeMentorUsageCount(readMentorUsageCount() + 1);
}

function showTeaserResponse() {
    // Create a blurred teaser message
    const div = document.createElement('div');
    div.className = 'message message--mentor message--blurred';
    div.innerHTML = `
        <p>Hvězdný průvodce zachytil vzorec: ptáš se na rozhodnutí, ale odpověď začíná u hranice, kterou teď chráníš.</p>
        <p class="blur-text">V plné odpovědi bys dostal jeden konkrétní další krok, návaznou otázku a propojení s předchozí historií chatu.</p>
        <div class="premium-lock-overlay">
            <div class="lock-icon">🔒</div>
            <h3>Odemknout návazný krok</h3>
            <p>Zamčeno: konkrétní další krok k této otázce a navazující otázka pro pokračování.</p>
            <div class="mentor-paywall__actions">
                <a href="${buildMentorUpgradeUrl('mentor_teaser_gate')}" class="btn btn--primary btn--sm mentor-upgrade-btn">Odemknout vedení</a>
                <button type="button" class="btn btn--ghost btn--sm mentor-paywall-dismiss-btn">Zůstat u dnešního chatu</button>
            </div>
            <p class="mentor-paywall__reassurance">${MENTOR_PAYMENT_REASSURANCE}</p>
        </div>
    `;
    messagesContainer?.insertBefore(div, typingIndicator);
    div.querySelector('.mentor-upgrade-btn')?.addEventListener('click', (event) => {
        event.preventDefault();
        startMentorUpgradeFlow('mentor_teaser_gate');
    });
    div.querySelector('.mentor-paywall-dismiss-btn')?.addEventListener('click', () => {
        div.remove();
        keepMentorFree('mentor_teaser_gate');
        addMessage('Denní bezplatný limit je dnes vyčerpaný. Tvoje dosavadní odpovědi zůstávají v chatu a další otázku můžeš položit zítra.', 'mentor');
    });
    scrollToBottom();
}

function addMessage(text, type, shouldScroll = true) {
    const div = document.createElement('div');
    div.className = `message message--${type}`;

    // Safely render text and simple markdown (bold/italic)
    // 1. Escape HTML by setting textContent
    div.textContent = text;
    let html = div.innerHTML;

    // 2. Convert newlines to <br>
    html = html.replace(/\n/g, '<br>');

    // 3. Render Markdown bold **text** or __text__
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');

    // 4. Render Markdown italic *text* or _text_ (ensure we don't catch bold parts)
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    html = html.replace(/(_)(.*?)(_)/g, '<em>$2</em>');

    div.innerHTML = typeof DOMPurify !== 'undefined' ? DOMPurify.sanitize(html) : html;

    // Insert before typing indicator
    messagesContainer?.insertBefore(div, typingIndicator);

    // Scroll to bottom
    if (shouldScroll) {
        scrollToBottom();
    }
}

function showTyping(show) {
    if (show) {
        if (typingIndicator) {
            typingIndicator.hidden = false;
            typingIndicator.classList.add('mh-flex-visible');
        }
        scrollToBottom();
    } else {
        if (typingIndicator) {
            typingIndicator.hidden = true;
            typingIndicator.classList.remove('mh-flex-visible');
        }
    }
}

function scrollToBottom() {
    if (!messagesContainer) return;
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function showPaywall() {
    // Disable inputs
    chatInput.disabled = true;
    sendBtn.disabled = true;

    // Show overlay or modal
    // We'll create a simple overlay inside the chat container programmatically or use an existing one if available.
    // Based on mentor.html lines 212-227, there is a .limit-reached-overlay but it's for "limit reached".
    // We can reuse it or create a "Premium Only" specific one.

    // Let's modify the overlay content
    let overlay = document.querySelector('.limit-reached-overlay');
    if (!overlay) {
        // Create if missing (though it is in HTML)
        overlay = document.createElement('div');
        overlay.className = 'limit-reached-overlay';
        document.querySelector('.chat-container').appendChild(overlay);
    }

    overlay.innerHTML = `
        <div class="mentor-paywall">
            <div class="mentor-paywall__icon">🔒</div>
            <h2 class="mentor-paywall__title">Denní limit zdarma je vyčerpaný</h2>
            <p class="mentor-paywall__copy">
                Zamčený výstup: navazující odpověď k poslední otázce, jeden konkrétní další krok a propojení s historií chatu.
            </p>
            <div class="mentor-paywall__actions">
                <a href="${buildMentorUpgradeUrl('mentor_paywall_overlay')}" class="btn btn--primary mentor-paywall-upgrade-btn">Odemknout vedení</a>
                <button type="button" class="btn btn--ghost mentor-paywall-dismiss-btn">Zůstat u dnešního chatu</button>
            </div>
            <p class="mentor-paywall__reassurance">${MENTOR_PAYMENT_REASSURANCE}</p>
        </div>
    `;

    overlay.classList.add('limit-reached-overlay--visible');
    overlay.querySelector('.mentor-paywall-upgrade-btn')?.addEventListener('click', (event) => {
        event.preventDefault();
        startMentorUpgradeFlow('mentor_paywall_overlay');
    });
    overlay.querySelector('.mentor-paywall-dismiss-btn')?.addEventListener('click', () => {
        keepMentorFree('mentor_paywall_overlay', overlay);
    });

    // Add blur effect to messages if any (or just cover them)
    messagesContainer?.classList.add('chat-messages--blurred');
}
