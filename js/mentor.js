/**
 * Hvězdný Průvodce - Frontend Logic
 */

// DOM elementy — inicializujeme v DOMContentLoaded (bezpečná inicializace)
let chatInput, sendBtn, messagesContainer, typingIndicator;

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

function startMentorUpgradeFlow(source = 'mentor_inline_upsell') {
    window.MH_ANALYTICS?.trackCTA?.(source, {
        plan_id: 'pruvodce',
        feature: 'mentor'
    });
    window.Auth?.startPlanCheckout?.('pruvodce', {
        source,
        feature: 'mentor',
        redirect: '/cenik.html',
        authMode: window.Auth?.isLoggedIn?.() ? 'login' : 'register'
    });
}

function runAfterComponentsLoaded(callback) {
    let hasRun = false;
    const run = () => {
        if (hasRun) return;
        hasRun = true;
        callback();
    };

    if (document.querySelector('.header') || !document.getElementById('header-placeholder')) {
        run();
        return;
    }

    document.addEventListener('components:loaded', run, { once: true });
    window.setTimeout(run, 1200);
}

document.addEventListener('DOMContentLoaded', async () => {
    // Inicializuj DOM elementy — musí být uvnitř DOMContentLoaded
    chatInput = document.getElementById('chat-input');
    sendBtn = document.getElementById('send-btn');
    messagesContainer = document.getElementById('chat-messages');
    typingIndicator = document.getElementById('typing-indicator');

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
    // Wait for auth-client to initialize (if needed) but we can check token directly
    // Auth token je HttpOnly cookie — JS k němu nemá přístup.
    // Používáme window.Auth.isLoggedIn() které čte user data z localStorage.
    if (!window.Auth?.isLoggedIn()) {
        window.Auth?.showToast?.('Přihlášení vyžadováno', 'Pro vstup do Hvězdného Průvodce se prosím přihlaste.', 'info');
        runAfterComponentsLoaded(() => startMentorUpgradeFlow('mentor_entry_auth_gate'));

        document.addEventListener('auth:changed', () => {
            if (window.Auth?.isLoggedIn()) window.location.reload();
        }, { once: true });
        return;
    }

    // Check Premium Status
    try {
        const userProfile = await window.Auth.getProfile();
        // Allow everyone to enter, but track status
        // Fix: Use window.Auth instead of authClient
        // Fix: Use subscription_status instead of subscription_tier
        const premiumStatuses = ['premium_monthly', 'exclusive_monthly', 'vip_majestrat'];
        window.isPremium = userProfile && premiumStatuses.includes(userProfile.subscription_status);

        // Initialize usage tracking for free users
        if (!window.isPremium) {
            initUsageTracking();
        }

        // Load History for everyone (if any)
        loadHistory();

    } catch (error) {
        console.error('Failed to verify subscription:', error);
    }

    // Auto-focus input
    chatInput?.focus();
});

function initUsageTracking() {
    const today = new Date().toISOString().split('T')[0];
    const usage = JSON.parse(localStorage.getItem('mentor_usage') || '{}');

    if (usage.date !== today) {
        localStorage.setItem('mentor_usage', JSON.stringify({ date: today, count: 0 }));
    }
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
        window.Auth?.showToast?.('Přihlášení vyžadováno', 'Pro konverzaci s Průvodcem se prosím přihlaste.', 'info');
        startMentorUpgradeFlow('mentor_chat_auth_gate');
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
    const today = new Date().toISOString().split('T')[0];
    const usage = JSON.parse(localStorage.getItem('mentor_usage') || '{}');

    // Allow 5 messages, trigger gate on 6th
    if (usage.date === today && usage.count >= 5) {
        return true;
    }
    return false;
}

function incrementUsage() {
    const today = new Date().toISOString().split('T')[0];
    const usage = JSON.parse(localStorage.getItem('mentor_usage') || '{}');
    let count = usage.count || 0;

    if (usage.date !== today) {
        count = 0;
    }

    localStorage.setItem('mentor_usage', JSON.stringify({ date: today, count: count + 1 }));
}

function showTeaserResponse() {
    // Create a blurred teaser message
    const div = document.createElement('div');
    div.className = 'message message--mentor message--blurred';
    div.innerHTML = `
        <p>Hvězdy naznačují, že tvá cesta je...</p>
        <p class="blur-text">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
        <div class="premium-lock-overlay">
            <div class="lock-icon">🔒</div>
            <h3>Odemkněte plnou odpověď</h3>
            <p>Využili jste své volné otázky pro dnešní den.</p>
            <a href="cenik.html" class="btn btn--primary btn--sm">Získat Premium</a>
        </div>
    `;
    messagesContainer?.insertBefore(div, typingIndicator);
    div.querySelector('a[href="cenik.html"]')?.addEventListener('click', (event) => {
        event.preventDefault();
        startMentorUpgradeFlow('mentor_teaser_gate');
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
            <h2 class="mentor-paywall__title">Pouze pro Premium</h2>
            <p class="mentor-paywall__copy">
                Hvězdný Mentor je exkluzivní průvodce pro naše předplatitele.<br>
                Získejte neomezený přístup k moudrosti hvězd.
            </p>
            <a href="/cenik.html" class="btn btn--primary">Získat Premium</a>
        </div>
    `;

    overlay.classList.add('limit-reached-overlay--visible');
    overlay.querySelector('a[href="/cenik.html"]')?.addEventListener('click', (event) => {
        event.preventDefault();
        startMentorUpgradeFlow('mentor_paywall_overlay');
    });

    // Add blur effect to messages if any (or just cover them)
    messagesContainer.classList.add('chat-messages--blurred');
}
