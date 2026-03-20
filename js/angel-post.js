// angel-post.js — Andělská pošta frontend logic

const catLabels = { laska: '❤️ Láska', zdravi: '💚 Zdraví', kariera: '💼 Kariéra', rodina: '🏠 Rodina', dek: '🙏 Vděčnost', jine: '✨ Jiné' };

const demoMessages = [
    { nickname: 'Monika', message: 'Drazí andělé, prosím vás o sílu a trpělivost v těžkém čase. Věřím, že vše dopadne dobře.', category: 'zdravi', likes: 23, created_at: new Date(Date.now() - 3600000) },
    { nickname: 'Anonym', message: 'Děkuji andělům za ochranu mé rodiny. Každý den cítím vaši přítomnost.', category: 'dek', likes: 47, created_at: new Date(Date.now() - 7200000) },
    { nickname: 'Lucie K.', message: 'Prosím o vedení v mém rozhodování o práci. Chci jít správnou cestou a přinést světu dobro.', category: 'kariera', likes: 18, created_at: new Date(Date.now() - 10800000) },
    { nickname: 'Tomáš', message: 'Andělé, sešlete mi do cesty správného člověka. Jsem připraven milovat a být milován.', category: 'laska', likes: 31, created_at: new Date(Date.now() - 18000000) },
    { nickname: 'Anonym', message: 'Modlím se za zdraví svých rodičů. Ať jsou obklopeni vaším světlem.', category: 'zdravi', likes: 52, created_at: new Date(Date.now() - 86400000) },
];

let localMessages = [...demoMessages];
let liked = new Set();

try {
    const savedLikes = JSON.parse(localStorage.getItem('mh_angel_liked_ids') || '[]');
    liked = new Set(savedLikes);
} catch (e) {
    liked = new Set();
}

// --- RENDER ---

function renderMessages() {
    const wall = document.getElementById('messages-container');
    if (!wall) return;

    if (localMessages.length === 0) {
        wall.innerHTML = '<div style="text-align:center;color:rgba(255,255,255,0.4);padding:2rem;">Zatím žádné vzkazy. Buďte první!</div>';
        return;
    }

    const html = localMessages.map((msg, i) => {
        const text = msg.message || msg.text || '';
        const msgKey = msg.id ? String(msg.id) : text.substring(0, 20);
        const ago = timeAgo(msg.created_at);
        const cat = catLabels[msg.category] || '✨ Jiné';
        const isLiked = liked.has(msgKey);

        return `<div class="message-card">
            <div class="message-meta">
                <span>👤 ${msg.nickname || 'Anonym'} <span class="category-tag">${cat}</span></span>
                <span>${ago}</span>
            </div>
            <p class="message-text">"${text}"</p>
            <div style="text-align:right;margin-top:0.5rem;">
                <button class="heart-btn ${isLiked ? 'liked' : ''}" data-index="${i}" aria-label="Podpořit srdíčkem">
                    ${isLiked ? '❤️' : '🤍'} ${msg.likes}
                </button>
            </div>
        </div>`;
    }).join('');

    wall.innerHTML = html;
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
    const text = document.getElementById('msg-text').value.trim();
    const nickname = document.getElementById('msg-nickname').value.trim() || 'Anonym';
    const category = document.getElementById('msg-category').value;
    const msgEl = document.getElementById('submit-msg');

    if (text.length < 10) {
        document.getElementById('msg-text').style.borderColor = 'rgba(231,76,60,0.8)';
        msgEl.textContent = '❌ Váš vzkaz andělům musí mít alespoň 10 znaků.';
        msgEl.style.color = '#e74c3c';
        msgEl.style.display = 'block';
        setTimeout(() => { msgEl.style.display = 'none'; }, 4000);
        return;
    }

    document.getElementById('msg-text').style.borderColor = 'rgba(255,255,255,0.1)';

    const newMsg = { nickname, message: text, category, likes: 0, created_at: new Date() };

    try {
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
            msgEl.textContent = '❌ ' + (data.error || 'Nastala chyba při odesílání.');
            msgEl.style.color = '#e74c3c';
            msgEl.style.display = 'block';
            setTimeout(() => { msgEl.style.display = 'none'; }, 5000);
            return;
        }

        if (data.id) newMsg.id = data.id;

    } catch (e) {
        console.warn('AngelPost API offline, pouzivam lokalni rezim.', e);
    }

    localMessages.unshift(newMsg);
    renderMessages();

    document.getElementById('msg-text').value = '';
    document.getElementById('msg-nickname').value = '';
    document.getElementById('char-count').textContent = '0';

    msgEl.textContent = '✨ Váš vzkaz byl odeslán andělům!';
    msgEl.style.color = '#2ed573';
    msgEl.style.display = 'block';
    setTimeout(() => { msgEl.style.display = 'none'; }, 4000);

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
            if (data.length > 0) {
                localMessages = [...data, ...demoMessages.slice(0, 3)];
                renderMessages();
            }
        }
    } catch (e) { /* use demo data */ }
}

// --- INIT (defer ensures DOM is ready) ---

renderMessages();
loadMessages();

const btnSubmit = document.getElementById('btn-submit-msg');
if (btnSubmit) btnSubmit.addEventListener('click', submitMessage);

const msgInput = document.getElementById('msg-text');
if (msgInput) msgInput.addEventListener('input', updateCounter);

const messagesContainer = document.getElementById('messages-container');
if (messagesContainer) {
    messagesContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.heart-btn');
        if (btn) {
            const index = parseInt(btn.getAttribute('data-index'));
            if (!isNaN(index)) {
                btn.style.transform = 'scale(1.3)';
                setTimeout(() => likeMessage(index), 100);
            }
        }
    });
}
