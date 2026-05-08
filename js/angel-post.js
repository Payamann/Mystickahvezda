// angel-post.js — Andělská pošta frontend logic

const catLabels = { laska: '❤️ Láska', zdravi: '💚 Zdraví', kariera: '💼 Kariéra', rodina: '🏠 Rodina', dek: '🙏 Vděčnost', jine: '✨ Jiné' };

let localMessages = [];
let loadError = false;
let liked = new Set();

try {
    const savedLikes = JSON.parse(localStorage.getItem('mh_angel_liked_ids') || '[]');
    liked = new Set(savedLikes);
} catch (e) {
    liked = new Set();
}

// --- RENDER ---

function showSubmitMessage(type, text, duration = 4000) {
    const msgEl = document.getElementById('submit-msg');
    if (!msgEl) return;

    msgEl.textContent = text;
    msgEl.hidden = false;
    msgEl.classList.add('mh-block-visible');
    msgEl.classList.toggle('submit-message--error', type === 'error');
    msgEl.classList.toggle('submit-message--success', type === 'success');
    setTimeout(() => {
        msgEl.hidden = true;
        msgEl.classList.remove('mh-block-visible', 'submit-message--error', 'submit-message--success');
    }, duration);
}

function renderMessages() {
    const wall = document.getElementById('messages-container');
    if (!wall) return;

    wall.textContent = '';

    if (loadError) {
        const errorState = document.createElement('div');
        errorState.className = 'message-empty-state message-empty-state--error';
        errorState.textContent = 'Vzkazy se teď nepodařilo načíst. Zkuste to prosím za chvíli.';
        wall.appendChild(errorState);
        return;
    }

    if (localMessages.length === 0) {
        const emptyState = document.createElement('div');
        emptyState.className = 'message-empty-state';
        emptyState.textContent = 'Zatím žádné schválené vzkazy. Buďte první, kdo pošle zprávu andělům.';
        wall.appendChild(emptyState);
        return;
    }

    localMessages.forEach((msg, i) => {
        const text = msg.message || msg.text || '';
        const msgKey = msg.id ? String(msg.id) : text.substring(0, 20);
        const ago = timeAgo(msg.created_at);
        const cat = catLabels[msg.category] || '✨ Jiné';
        const isLiked = liked.has(msgKey);

        const card = document.createElement('div');
        card.className = 'message-card';

        const meta = document.createElement('div');
        meta.className = 'message-meta';

        const author = document.createElement('span');
        author.append(document.createTextNode(`👤 ${msg.nickname || 'Anonym'} `));

        const category = document.createElement('span');
        category.className = 'category-tag';
        category.textContent = msg.pendingReview ? `${cat} · čeká na schválení` : cat;
        author.appendChild(category);

        const time = document.createElement('span');
        time.textContent = ago;

        meta.append(author, time);

        const messageText = document.createElement('p');
        messageText.className = 'message-text';
        messageText.textContent = `"${text}"`;

        const actions = document.createElement('div');
        actions.className = 'message-actions';

        const heartBtn = document.createElement('button');
        heartBtn.className = `heart-btn ${isLiked ? 'liked' : ''}`;
        heartBtn.dataset.index = String(i);
        heartBtn.setAttribute('aria-label', 'Podpořit srdíčkem');
        heartBtn.textContent = `${isLiked ? '❤️' : '🤍'} ${msg.likes}`;

        actions.appendChild(heartBtn);
        card.append(meta, messageText, actions);
        wall.appendChild(card);
    });
}

function timeAgo(date) {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return 'právě teď';
    if (seconds < 3600) return `před ${Math.floor(seconds / 60)} min`;
    if (seconds < 86400) return `před ${Math.floor(seconds / 3600)} hod`;
    return `před ${Math.floor(seconds / 86400)} dny`;
}

function likeMessage(i) {
    const msg = localMessages[i];
    const text = msg.message || msg.text || '';
    const msgKey = msg.id ? String(msg.id) : text.substring(0, 20);

    if (liked.has(msgKey)) return;

    liked.add(msgKey);
    msg.likes++;
    localStorage.setItem('mh_angel_liked_ids', JSON.stringify([...liked]));
    renderMessages();

    if (msg.id) {
        (async () => {
            const csrfToken = window.getCSRFToken ? await window.getCSRFToken() : null;
            const baseUrl = window.API_CONFIG?.BASE_URL || '/api';
            fetch(`${baseUrl}/angel-post/${msg.id}/like`, {
                method: 'POST',
                headers: { ...(csrfToken && { 'X-CSRF-Token': csrfToken }) }
            }).catch(() => {});
        })();
    }
}

function updateCounter() {
    const el = document.getElementById('msg-text');
    if (el) {
        document.getElementById('char-count').textContent = el.value.length;
    }
}

async function submitMessage() {
    if (submitMessage.isSubmitting) return;

    const textInput = document.getElementById('msg-text');
    if (!textInput) return;

    const text = textInput.value.trim();
    const nickname = document.getElementById('msg-nickname').value.trim() || 'Anonym';
    const category = document.getElementById('msg-category').value;

    if (text.length < 10) {
        textInput.classList.add('form-input--invalid');
        showSubmitMessage('error', '❌ Váš vzkaz andělům musí mít alespoň 10 znaků.');
        return;
    }

    textInput.classList.remove('form-input--invalid');

    let newMsg = null;
    const submitButton = document.getElementById('btn-submit-msg');

    try {
        submitMessage.isSubmitting = true;
        if (submitButton) submitButton.disabled = true;

        const csrfToken = window.getCSRFToken ? await window.getCSRFToken() : null;
        const baseUrl = window.API_CONFIG?.BASE_URL || '/api';
        const res = await fetch(`${baseUrl}/angel-post`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(csrfToken && { 'X-CSRF-Token': csrfToken })
            },
            body: JSON.stringify({ nickname, message: text, category })
        });

        const data = await res.json();

        if (!res.ok) {
            showSubmitMessage('error', '❌ ' + (data.error || 'Nastala chyba při odesílání.'), 5000);
            return;
        }

        newMsg = {
            id: data.id,
            nickname,
            message: text,
            category,
            likes: 0,
            created_at: new Date(),
            pendingReview: Boolean(data.pendingReview)
        };

    } catch (e) {
        console.warn('AngelPost API unavailable:', e);
        showSubmitMessage('error', '❌ Vzkaz se nepodařilo uložit. Zkuste to prosím znovu za chvíli.', 5000);
        return;
    } finally {
        submitMessage.isSubmitting = false;
        if (submitButton) submitButton.disabled = false;
    }

    if (!newMsg) return;

    localMessages.unshift(newMsg);
    renderMessages();

    textInput.value = '';
    document.getElementById('msg-nickname').value = '';
    document.getElementById('char-count').textContent = '0';

    showSubmitMessage('success', '✨ Váš vzkaz byl odeslán andělům a čeká na schválení.');

    setTimeout(() => {
        const wall = document.querySelector('.messages-wall');
        if (wall) {
            const y = wall.getBoundingClientRect().top + window.scrollY - 100;
            window.scrollTo({ top: y, behavior: 'smooth' });
        }
    }, 300);
}

async function loadMessages() {
    try {
        const baseUrl = window.API_CONFIG?.BASE_URL || '/api';
        const res = await fetch(`${baseUrl}/angel-post?limit=20`);
        if (res.ok) {
            const data = await res.json();
            localMessages = Array.isArray(data) ? data : [];
            loadError = false;
            renderMessages();
            return;
        }

        localMessages = [];
        loadError = true;
        renderMessages();
    } catch (e) {
        console.warn('AngelPost messages failed to load:', e);
        localMessages = [];
        loadError = true;
        renderMessages();
    }
}

// --- INIT (defer ensures DOM is ready) ---

renderMessages();
loadMessages();

const btnSubmit = document.getElementById('btn-submit-msg');
const angelPostForm = document.getElementById('angel-post-form');
if (angelPostForm) {
    angelPostForm.addEventListener('submit', (event) => {
        event.preventDefault();
        submitMessage();
    });
} else if (btnSubmit) {
    btnSubmit.addEventListener('click', submitMessage);
}

const msgInput = document.getElementById('msg-text');
if (msgInput) msgInput.addEventListener('input', updateCounter);

const messagesContainer = document.getElementById('messages-container');
if (messagesContainer) {
    messagesContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.heart-btn');
        if (btn) {
            const index = parseInt(btn.getAttribute('data-index'));
            if (!isNaN(index)) {
                btn.classList.add('heart-btn--pop');
                setTimeout(() => btn.classList.remove('heart-btn--pop'), 220);
                setTimeout(() => likeMessage(index), 100);
            }
        }
    });
}
