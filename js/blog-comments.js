/**
 * Mystická Hvězda – Blog Comments
 * Loads and submits comments for blog posts via API
 * Looks for `data-post-slug` attribute on a container element
 */
(function () {
    'use strict';

    const container = document.getElementById('blog-comments-section');
    if (!container) return;

    const slug = container.dataset.postSlug;
    if (!slug) return;

    const BASE = window.API_CONFIG?.BASE_URL || '/api';

    // ── Render ──────────────────────────────────────────────────────────────
    function renderComment(c) {
        const initials = c.author_name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
        const date = new Date(c.created_at).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' });
        return `
            <div style="display:flex;gap:1rem;padding:1rem 0;border-bottom:1px solid rgba(255,255,255,0.05);" class="comment-item">
                <div style="width:42px;height:42px;border-radius:50%;background:linear-gradient(135deg,#9b59b6,#d4af37);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.9rem;flex-shrink:0;">${initials}</div>
                <div style="flex:1;min-width:0;">
                    <div style="display:flex;justify-content:space-between;align-items:baseline;gap:0.5rem;flex-wrap:wrap;">
                        <span style="font-weight:600;font-size:0.92rem;color:#fff;">${escapeHtml(c.author_name)}</span>
                        <span style="font-size:0.75rem;color:rgba(255,255,255,0.3);">${date}</span>
                    </div>
                    <p style="margin:0.4rem 0 0;color:rgba(255,255,255,0.75);line-height:1.7;font-size:0.9rem;">${escapeHtml(c.content)}</p>
                </div>
            </div>
        `;
    }

    function escapeHtml(str) {
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    async function loadComments() {
        const list = document.getElementById('comments-list');
        const count = document.getElementById('comments-count');
        list.innerHTML = '<p style="color:rgba(255,255,255,0.3);font-size:0.85rem;text-align:center;padding:1rem;">Načítám komentáře...</p>';

        try {
            const res = await fetch(`${BASE}/comments?slug=${encodeURIComponent(slug)}`);
            const data = await res.json();
            const comments = data.comments || [];

            if (count) count.textContent = comments.length;

            if (comments.length === 0) {
                list.innerHTML = '<p style="color:rgba(255,255,255,0.3);font-size:0.85rem;text-align:center;padding:1rem;">Buďte první, kdo zanechá komentář!</p>';
            } else {
                list.innerHTML = comments.map(renderComment).join('');
            }
        } catch {
            list.innerHTML = '<p style="color:rgba(255,255,255,0.3);font-size:0.85rem;text-align:center;">Komentáře se nepodařilo načíst.</p>';
        }
    }

    async function submitComment(e) {
        e.preventDefault();
        const form = e.target;
        const btn = form.querySelector('[type=submit]');
        const msg = document.getElementById('comment-submit-msg');
        const name = form.querySelector('[name=name]').value.trim();
        const email = form.querySelector('[name=email]').value.trim();
        const content = form.querySelector('[name=content]').value.trim();

        if (!name || !email || !content) {
            msg.textContent = 'Vyplňte prosím všechna pole.';
            msg.style.color = '#f87171';
            return;
        }
        if (content.length < 10) {
            msg.textContent = 'Komentář musí mít alespoň 10 znaků.';
            msg.style.color = '#f87171';
            return;
        }

        btn.disabled = true;
        btn.textContent = 'Odesílám...';
        msg.textContent = '';

        try {
            const res = await fetch(`${BASE}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ slug, author_name: name, author_email: email, content })
            });
            const data = await res.json();
            if (data.success) {
                msg.textContent = '✅ Komentář odeslán a čeká na schválení. Děkujeme!';
                msg.style.color = '#4ade80';
                form.reset();
            } else {
                msg.textContent = data.error || 'Chyba při odesílání.';
                msg.style.color = '#f87171';
            }
        } catch {
            msg.textContent = 'Chyba připojení. Zkuste to znovu.';
            msg.style.color = '#f87171';
        } finally {
            btn.disabled = false;
            btn.textContent = 'Odeslat komentář';
        }
    }

    // ── Build UI ─────────────────────────────────────────────────────────────
    container.innerHTML = `
        <div style="border-top:1px solid rgba(255,255,255,0.08);padding-top:2.5rem;margin-top:2.5rem;">
            <h3 style="font-family:'Cinzel',serif;color:#ebc066;font-size:1.2rem;margin:0 0 1.5rem;">
                Komentáře <span id="comments-count" style="font-size:0.85rem;color:rgba(255,255,255,0.3);font-family:'Inter',sans-serif;font-weight:400;"></span>
            </h3>

            <div id="comments-list" style="margin-bottom:2rem;"></div>

            <!-- Comment form -->
            <div style="background:rgba(10,10,26,0.6);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:1.5rem;">
                <h4 style="margin:0 0 1.25rem;font-size:1rem;color:#fff;">Přidat komentář</h4>
                <form id="comment-form">
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;margin-bottom:0.75rem;">
                        <input name="name" type="text" placeholder="Vaše jméno *" required style="
                            padding:0.75rem 1rem;background:rgba(255,255,255,0.06);
                            border:1px solid rgba(255,255,255,0.12);border-radius:10px;
                            color:#fff;font-size:0.9rem;font-family:'Inter',sans-serif;
                        ">
                        <input name="email" type="email" placeholder="Email (nezobrazí se) *" required style="
                            padding:0.75rem 1rem;background:rgba(255,255,255,0.06);
                            border:1px solid rgba(255,255,255,0.12);border-radius:10px;
                            color:#fff;font-size:0.9rem;font-family:'Inter',sans-serif;
                        ">
                    </div>
                    <textarea name="content" placeholder="Váš komentář *" rows="4" required style="
                        width:100%;padding:0.75rem 1rem;background:rgba(255,255,255,0.06);
                        border:1px solid rgba(255,255,255,0.12);border-radius:10px;
                        color:#fff;font-size:0.9rem;font-family:'Inter',sans-serif;
                        resize:vertical;box-sizing:border-box;margin-bottom:0.75rem;
                    "></textarea>
                    <div style="display:flex;align-items:center;gap:1rem;flex-wrap:wrap;">
                        <button type="submit" class="btn btn--primary" style="font-size:0.9rem;">Odeslat komentář</button>
                        <span id="comment-submit-msg" style="font-size:0.85rem;"></span>
                    </div>
                    <p style="font-size:0.75rem;color:rgba(255,255,255,0.25);margin:0.75rem 0 0;">
                        Komentáře jsou schvalovány ručně. Email nebude zveřejněn.
                    </p>
                </form>
            </div>
        </div>
    `;

    document.getElementById('comment-form').addEventListener('submit', submitComment);
    loadComments();
})();
