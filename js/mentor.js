/**
 * Hvězdný Průvodce - Frontend Logic
 */

const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const messagesContainer = document.getElementById('chat-messages');
const typingIndicator = document.getElementById('typing-indicator');

// Auth Check - Strict
// Must be logged in to access Mentor
document.addEventListener('DOMContentLoaded', async () => {
    // Wait for auth-client to initialize (if needed) but we can check token directly
    const token = localStorage.getItem('auth_token');
    if (!token) {
        window.Auth?.showToast?.('Přihlášení vyžadováno', 'Pro vstup do Hvězdného Průvodce se prosím přihlaste.', 'info');
        window.Auth?.openModal?.('login');

        // Reload on login to initialize chat (once only to prevent listener leak)
        document.addEventListener('auth:changed', () => {
            if (localStorage.getItem('auth_token')) {
                window.location.reload();
            }
        }, { once: true });
        return;
    }

    // Check Premium Status
    try {
        const userProfile = await window.Auth.getProfile();
        // Allow everyone to enter, but track status
        // Fix: Use window.Auth instead of authClient
        // Fix: Use subscription_status instead of subscription_tier
        window.isPremium = userProfile && (userProfile.subscription_status === 'premium' || userProfile.subscription_status === 'vip');

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
    chatInput.focus();
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
        const token = localStorage.getItem('auth_token');
        const response = await fetch(`${API_CONFIG.BASE_URL}/mentor/history`, {
            headers: { 'Authorization': `Bearer ${token}` }
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
        const token = localStorage.getItem('auth_token');
        const response = await fetch(`${API_CONFIG.BASE_URL}/mentor/greeting`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();
        if (data.success && data.greeting) {
            // Add the greeting!
            addMessage(data.greeting, 'mentor', true);
        }
    } catch (e) {
        // Silent fail
        console.log('No greeting today.');
    }
}

// Auto-resize textarea
chatInput.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';

    // Enable/disable button
    if (this.value.trim().length > 0) {
        sendBtn.removeAttribute('disabled');
    } else {
        sendBtn.setAttribute('disabled', 'true');
    }
});

// Send on Enter (but Shift+Enter for newline)
chatInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

sendBtn.addEventListener('click', sendMessage);

async function sendMessage() {
    const text = chatInput.value.trim();
    if (!text) return;

    // 0. Auth Check
    const token = localStorage.getItem('auth_token');
    if (!token || !window.Auth.isLoggedIn()) {
        window.Auth?.showToast?.('Přihlášení vyžadováno', 'Pro konverzaci s Mentorem se prosím přihlaste.', 'info');
        window.Auth?.openModal?.('login');

        // Reload on login to initialize chat
        document.addEventListener('auth:changed', () => {
            if (localStorage.getItem('auth_token')) {
                window.location.reload();
            }
        }, { once: true });
        return;
    }

    // Check usage limits for free users
    if (!window.isPremium && checkUsageLimit()) {
        // Limit reached logic (The "Hook")
        addMessage(text, 'user');
        chatInput.value = '';
        chatInput.style.height = 'auto';
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
    chatInput.value = '';
    chatInput.style.height = 'auto';
    sendBtn.setAttribute('disabled', 'true');

    // Increment usage for free users
    if (!window.isPremium) {
        incrementUsage();
    }

    // 2. Show Typing Indicator
    showTyping(true);

    // 3. Call API
    try {
        const token = localStorage.getItem('auth_token'); // Fixed key
        const response = await fetch(`${API_CONFIG.BASE_URL}/mentor/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
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

    // Allow 3 messages, trigger gate on 4th
    if (usage.date === today && usage.count >= 3) {
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
    messagesContainer.insertBefore(div, typingIndicator);
    scrollToBottom();
}

function addMessage(text, type, shouldScroll = true) {
    const div = document.createElement('div');
    div.className = `message message--${type}`;

    // Safely render text: escape HTML first, then convert newlines to <br>
    div.textContent = text;
    div.innerHTML = div.innerHTML.replace(/\n/g, '<br>');

    // Insert before typing indicator
    messagesContainer.insertBefore(div, typingIndicator);

    // Scroll to bottom
    if (shouldScroll) {
        scrollToBottom();
    }
}

function showTyping(show) {
    if (show) {
        typingIndicator.style.display = 'flex';
        scrollToBottom();
    } else {
        typingIndicator.style.display = 'none';
    }
}

function scrollToBottom() {
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
        <div style="text-align: center; color: white; padding: 2rem;">
            <div style="font-size: 3rem; margin-bottom: 1rem;">🔒</div>
            <h2 style="font-family: 'Cinzel', serif; color: var(--color-mystic-gold); margin-bottom: 1rem;">Pouze pro Premium</h2>
            <p style="margin-bottom: 2rem; color: var(--color-silver-mist);">
                Hvězdný Mentor je exkluzivní průvodce pro naše předplatitele.<br>
                Získejte neomezený přístup k moudrosti hvězd.
            </p>
            <a href="/cenik.html" class="btn btn--primary">Získat Premium</a>
        </div>
    `;

    overlay.style.display = 'flex';

    // Add blur effect to messages if any (or just cover them)
    messagesContainer.style.filter = 'blur(5px)';
}
