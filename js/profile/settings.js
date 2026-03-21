/**
 * Settings: Avatar picker, subscription management, profile & password update
 */

import { apiUrl, authHeaders } from './shared.js';

// ==========================================
// SETTINGS FORM
// ==========================================

export function initSettingsForm() {
    const user = window.Auth?.user;
    if (!user) return;

    const nameEl = document.getElementById('settings-name');
    const emailEl = document.getElementById('settings-email');
    const birthtimeEl = document.getElementById('settings-birthtime');
    const birthplaceEl = document.getElementById('settings-birthplace');

    if (nameEl) nameEl.value = user.first_name || '';
    if (emailEl) emailEl.value = user.email || '';
    if (birthtimeEl) birthtimeEl.value = user.birth_time || '';
    if (birthplaceEl) birthplaceEl.value = user.birth_place || '';
}

export async function saveSettings() {
    const btn = document.getElementById('save-settings-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Ukládám...'; }

    try {
        const name = document.getElementById('settings-name')?.value.trim();
        const birthtime = document.getElementById('settings-birthtime')?.value;
        const birthplace = document.getElementById('settings-birthplace')?.value.trim();
        const currentPassword = document.getElementById('settings-current-password')?.value;
        const newPassword = document.getElementById('settings-password')?.value;
        const confirmPassword = document.getElementById('settings-password-confirm')?.value;

        // Profile update
        const profileBody = {};
        if (name !== undefined) profileBody.first_name = name;
        if (birthtime) profileBody.birth_time = birthtime;
        if (birthplace !== undefined) profileBody.birth_place = birthplace;

        const profileRes = await fetch(`${apiUrl()}/auth/profile`, {
            method: 'PUT',
            credentials: 'include',
            headers: authHeaders(true),
            body: JSON.stringify(profileBody)
        });

        if (!profileRes.ok) {
            const err = await profileRes.json().catch(() => ({}));
            throw new Error(err.error || 'Nepodařilo se uložit profil.');
        }

        const profileData = await profileRes.json();

        // Update local auth_user cache
        let cached = {};
        try { cached = JSON.parse(localStorage.getItem('auth_user') || '{}'); } catch (e) { /* */ }
        Object.assign(cached, profileData.user || profileBody);
        localStorage.setItem('auth_user', JSON.stringify(cached));
        if (window.Auth) window.Auth.user = cached;

        // Password change (only if new password is provided)
        if (newPassword) {
            if (!currentPassword) {
                throw new Error('Zadejte prosím aktuální heslo.');
            }
            if (newPassword !== confirmPassword) {
                throw new Error('Nová hesla se neshodují.');
            }

            const pwRes = await fetch(`${apiUrl()}/user/password`, {
                method: 'PUT',
                credentials: 'include',
                headers: authHeaders(true),
                body: JSON.stringify({
                    currentPassword,
                    password: newPassword,
                    password_confirm: confirmPassword
                })
            });

            if (!pwRes.ok) {
                const err = await pwRes.json().catch(() => ({}));
                throw new Error(err.error || 'Nepodařilo se změnit heslo.');
            }

            // Clear password fields
            const fields = ['settings-current-password', 'settings-password', 'settings-password-confirm'];
            fields.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });

            window.Auth?.showToast?.('Heslo změněno', 'Heslo bylo úspěšně změněno. Budete odhlášeni.', 'success');
            setTimeout(() => window.Auth?.logout?.(), 2000);
            return;
        }

        window.Auth?.showToast?.('Uloženo', 'Nastavení bylo úspěšně uloženo.', 'success');

    } catch (e) {
        console.error('Settings save error:', e);
        window.Auth?.showToast?.('Chyba', e.message || 'Nepodařilo se uložit nastavení.', 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Uložit změny'; }
    }
}

// ==========================================
// AVATAR PICKER
// ==========================================

export function toggleAvatarPicker() {
    const picker = document.getElementById('avatar-picker');
    if (!picker) return;
    const isHidden = picker.style.display === 'none' || !picker.style.display;
    picker.style.display = isHidden ? 'block' : 'none';

    // Highlight current avatar
    if (isHidden) {
        const currentAvatar = document.getElementById('user-avatar')?.textContent?.trim();
        picker.querySelectorAll('.avatar-option').forEach(opt => {
            opt.classList.toggle('avatar-option--active', opt.dataset.avatar === currentAvatar);
        });
    }
}

export async function selectAvatar(emoji) {
    const avatarEl = document.getElementById('user-avatar');
    const picker = document.getElementById('avatar-picker');

    // Optimistic UI update
    if (avatarEl) avatarEl.textContent = emoji;
    if (picker) picker.style.display = 'none';

    // Highlight selected
    picker?.querySelectorAll('.avatar-option').forEach(opt => {
        opt.classList.toggle('avatar-option--active', opt.dataset.avatar === emoji);
    });

    try {
        const res = await fetch(`${apiUrl()}/auth/profile`, {
            method: 'PUT',
            credentials: 'include',
            headers: authHeaders(true),
            body: JSON.stringify({ avatar: emoji })
        });

        if (res.ok) {
            // Update local storage
            let currentUser = {};
            try { currentUser = JSON.parse(localStorage.getItem('auth_user') || '{}'); } catch (e) { /* */ }
            currentUser.avatar = emoji;
            localStorage.setItem('auth_user', JSON.stringify(currentUser));
            if (window.Auth) window.Auth.user = currentUser;
            window.Auth?.showToast?.('Avatar změněn', `Váš nový avatar: ${emoji}`, 'success');
        } else {
            throw new Error('Failed to save avatar');
        }
    } catch (e) {
        console.error('Error saving avatar:', e);
        window.Auth?.showToast?.('Chyba', 'Nepodařilo se uložit avatar.', 'error');
    }
}

// ==========================================
// SUBSCRIPTION MANAGEMENT
// ==========================================

export async function loadSubscriptionStatus() {
    const container = document.getElementById('subscription-details');
    if (!container) return;

    try {
        const res = await fetch(`${apiUrl()}/payment/subscription/status`, {
            credentials: 'include',
            headers: authHeaders()
        });

        if (!res.ok) throw new Error('Failed to load subscription');

        const data = await res.json();
        renderSubscriptionCard(data);

    } catch (e) {
        console.error('Subscription status error:', e);
        container.innerHTML = `
            <div class="subscription-info">
                <div class="subscription-plan">
                    <span class="subscription-plan__name">🆓 Poutník (Zdarma)</span>
                </div>
                <div class="subscription-actions">
                    <a href="cenik.html" class="btn btn--gold btn--sm">🚀 Upgradovat</a>
                </div>
            </div>
        `;
    }
}

function renderSubscriptionCard(sub) {
    const container = document.getElementById('subscription-details');
    if (!container) return;

    const planNames = {
        'free': '🆓 Poutník (Zdarma)',
        'premium_monthly': '⭐ Hvězdný Průvodce (Měsíční)',
        'premium_yearly': '💎 Osvícení (Roční)',
        'premium_pro': '🚀 Premium Pro',
        'exclusive_monthly': '✨ Exclusive',
        'vip': '👑 VIP Věštecký Majestát',
        'vip_majestrat': '👑 VIP Majestát'
    };

    const statusLabels = {
        'active': { text: 'Aktivní', class: 'badge--success' },
        'trialing': { text: 'Zkušební období', class: 'badge--info' },
        'cancel_pending': { text: 'Zrušeno (aktivní do konce období)', class: 'badge--warning' },
        'past_due': { text: 'Platba selhala', class: 'badge--danger' },
        'cancelled': { text: 'Zrušeno', class: 'badge--danger' }
    };

    const planName = planNames[sub.planType] || sub.planType || 'Zdarma';
    const statusInfo = statusLabels[sub.status] || { text: sub.status, class: '' };
    const isPremium = sub.planType !== 'free';
    const periodEnd = sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd) : null;
    const periodEndStr = periodEnd ? periodEnd.toLocaleDateString('cs-CZ', {
        day: 'numeric', month: 'long', year: 'numeric'
    }) : null;

    let html = `<div class="subscription-info">`;

    // Plan name and status
    html += `
        <div class="subscription-plan">
            <span class="subscription-plan__name">${planName}</span>
            <span class="badge ${statusInfo.class}">${statusInfo.text}</span>
        </div>
    `;

    // Trial countdown
    if (sub.status === 'trialing' && periodEnd) {
        const daysRemaining = Math.max(0, Math.ceil((periodEnd - new Date()) / 86400000));
        const dayWord = daysRemaining === 1 ? 'den' : (daysRemaining >= 2 && daysRemaining <= 4) ? 'dny' : 'dní';
        html += `<div class="trial-countdown" style="margin: 12px 0; padding: 12px 16px; background: rgba(52, 152, 219, 0.15); border: 1px solid rgba(52, 152, 219, 0.3); border-radius: 8px;">
            <span style="color: var(--color-starlight, #f0e68c);">⏳ Zkušební období: zbývá <strong>${daysRemaining}</strong> ${dayWord}</span>
            <span style="display: block; opacity: 0.7; font-size: 0.85rem; margin-top: 4px;">Končí: ${periodEndStr}</span>
        </div>`;
    }

    // Period end
    if (isPremium && periodEndStr) {
        const label = sub.status === 'cancel_pending'
            ? 'Přístup končí'
            : sub.status === 'trialing'
            ? 'Zkušební období končí'
            : 'Další platba';
        html += `<p class="subscription-period">${label}: <strong>${periodEndStr}</strong></p>`;
    }

    // Actions
    html += `<div class="subscription-actions">`;

    if (!isPremium) {
        html += `<a href="cenik.html" class="btn btn--gold btn--sm">🚀 Upgradovat na Premium</a>`;
    } else {
        if (sub.canCancel && sub.status !== 'cancel_pending') {
            html += `<button id="sub-cancel-btn" class="btn btn--sm btn--glass">Zrušit předplatné</button>`;
        }
        if (sub.status === 'cancel_pending') {
            html += `<button id="sub-reactivate-btn" class="btn btn--sm btn--primary">Obnovit předplatné</button>`;
        }
        html += `<button id="sub-portal-btn" class="btn btn--sm btn--glass">Správa plateb</button>`;
    }

    html += `</div></div>`;

    container.innerHTML = html;

    // Bind subscription action buttons
    document.getElementById('sub-cancel-btn')?.addEventListener('click', cancelSubscription);
    document.getElementById('sub-reactivate-btn')?.addEventListener('click', reactivateSubscription);
    document.getElementById('sub-portal-btn')?.addEventListener('click', openStripePortal);
}

async function cancelSubscription() {
    if (!confirm('Opravdu chcete zrušit předplatné? Přístup budete mít do konce aktuálního období.')) {
        return;
    }

    const btn = document.getElementById('sub-cancel-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Ruším...'; }

    try {
        const res = await fetch(`${apiUrl()}/payment/cancel`, {
            method: 'POST',
            headers: authHeaders(true)
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Cancel failed');

        window.Auth?.showToast?.('Zrušeno', data.message || 'Předplatné bude zrušeno na konci období.', 'success');
        await loadSubscriptionStatus();

    } catch (e) {
        console.error('Cancel error:', e);
        window.Auth?.showToast?.('Chyba', e.message || 'Nepodařilo se zrušit předplatné.', 'error');
        if (btn) { btn.disabled = false; btn.textContent = 'Zrušit předplatné'; }
    }
}

async function reactivateSubscription() {
    const btn = document.getElementById('sub-reactivate-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Obnovuji...'; }

    try {
        const res = await fetch(`${apiUrl()}/payment/reactivate`, {
            method: 'POST',
            headers: authHeaders(true)
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Reactivate failed');

        window.Auth?.showToast?.('Obnoveno', data.message || 'Předplatné bylo obnoveno.', 'success');
        await loadSubscriptionStatus();

    } catch (e) {
        console.error('Reactivate error:', e);
        window.Auth?.showToast?.('Chyba', e.message || 'Nepodařilo se obnovit předplatné.', 'error');
        if (btn) { btn.disabled = false; btn.textContent = 'Obnovit předplatné'; }
    }
}

async function openStripePortal() {
    const btn = document.getElementById('sub-portal-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Otevírám...'; }

    try {
        const res = await fetch(`${apiUrl()}/payment/portal`, {
            method: 'POST',
            headers: authHeaders(true)
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Portal failed');

        if (data.url) {
            window.location.href = data.url;
        }

    } catch (e) {
        console.error('Portal error:', e);
        window.Auth?.showToast?.('Chyba', e.message || 'Nepodařilo se otevřít správu plateb.', 'error');
        if (btn) { btn.disabled = false; btn.textContent = 'Správa plateb'; }
    }
}
