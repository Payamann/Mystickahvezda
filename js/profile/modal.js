/**
 * Modal logic for viewing reading details
 */

import { escapeHtml, apiUrl, authHeaders, getReadingIcon, getReadingTitle } from './shared.js';
import { getAllReadings, updateReading, renderReadings, loadReadings } from './readings.js';
import { loadFavorites } from './favorites.js';

// State
let currentReadingId = null;
let currentReadingIsFavorite = false;
let previousFocus = null;

export async function viewReading(id) {
    const modal = document.getElementById('reading-modal');
    const content = document.getElementById('reading-modal-content');
    if (!modal || !content) return;

    currentReadingId = id;
    modal.style.display = 'flex';
    content.innerHTML = '<p style="text-align: center; opacity: 0.6;">Načítání...</p>';

    // Trap focus inside modal
    trapFocus(modal);

    try {
        const response = await fetch(`${apiUrl()}/user/readings/${id}`, {
            credentials: 'include',
            headers: authHeaders()
        });

        if (!response.ok) throw new Error('Failed to fetch reading');

        const data = await response.json();
        const reading = data.reading;

        currentReadingIsFavorite = reading.is_favorite;
        updateFavoriteButton();

        content.innerHTML = renderReadingContent(reading);

    } catch (error) {
        console.error('Error loading reading:', error);
        content.innerHTML = `<p style="color: #e74c3c;">Nepodařilo se načíst výklad.</p>`;
    }
}

export function closeReadingModal() {
    const modal = document.getElementById('reading-modal');
    if (modal) modal.style.display = 'none';
    currentReadingId = null;
    releaseFocus();
}

export async function toggleFavoriteModal() {
    if (!currentReadingId) return;
    await toggleFavorite(currentReadingId);
    currentReadingIsFavorite = !currentReadingIsFavorite;
    updateFavoriteButton();
}

export async function toggleFavorite(id, buttonEl = null) {
    try {
        const response = await fetch(`${apiUrl()}/user/readings/${id}/favorite`, {
            method: 'PATCH',
            credentials: 'include',
            headers: authHeaders()
        });

        if (!response.ok) throw new Error('Failed to toggle favorite');

        const data = await response.json();

        if (buttonEl) {
            buttonEl.textContent = data.is_favorite ? '⭐' : '☆';
            buttonEl.title = data.is_favorite ? 'Odebrat z oblíbených' : 'Přidat do oblíbených';
            buttonEl.setAttribute('aria-label', data.is_favorite ? 'Odebrat z oblíbených' : 'Přidat do oblíbených');
        }

        // Update local data and re-render readings list if needed
        const allReadings = getAllReadings();
        const reading = allReadings.find(r => r.id === id);
        if (reading) {
            reading.is_favorite = data.is_favorite;
            // We need to trigger stats update - this will be handled by dashboard.js which listens to events
            // but for now let's just update the list UI if it's visible
            renderReadings();
        }

        // Dispatch custom event for stats update
        document.dispatchEvent(new CustomEvent('reading:updated', { detail: { readings: allReadings } }));

        // Refresh favorites tab if visible
        const favoritesTab = document.getElementById('tab-favorites');
        if (favoritesTab && favoritesTab.style.display !== 'none') {
            loadFavorites();
        }

    } catch (error) {
        console.error('Error toggling favorite:', error);
        window.Auth?.showToast?.('Chyba', 'Nepodařilo se změnit oblíbené.', 'error');
    }
}

export async function deleteReading() {
    if (!currentReadingId) return;

    if (!confirm('Opravdu chcete smazat tento výklad? Tuto akci nelze vrátit.')) {
        return;
    }

    try {
        const response = await fetch(`${apiUrl()}/user/readings/${currentReadingId}`, {
            method: 'DELETE',
            headers: authHeaders()
        });

        if (!response.ok) throw new Error('Failed to delete reading');

        window.Auth?.showToast?.('Smazáno', 'Výklad byl smazán.', 'success');
        closeReadingModal();

        // Reload readings to refresh list and stats
        const readings = await loadReadings();
        document.dispatchEvent(new CustomEvent('reading:updated', { detail: { readings } }));

    } catch (error) {
        console.error('Error deleting reading:', error);
        window.Auth?.showToast?.('Chyba', 'Nepodařilo se smazat výklad.', 'error');
    }
}

function updateFavoriteButton() {
    const btn = document.getElementById('modal-favorite-btn');
    if (btn) {
        btn.textContent = currentReadingIsFavorite ? '⭐ V oblíbených' : '☆ Přidat do oblíbených';
        btn.setAttribute('aria-label', currentReadingIsFavorite ? 'Odebrat z oblíbených' : 'Přidat do oblíbených');
    }
}

function trapFocus(modal) {
    previousFocus = document.activeElement;
    const closeBtn = modal.querySelector('.modal__close');
    if (closeBtn) closeBtn.focus();
}

function releaseFocus() {
    if (previousFocus) {
        previousFocus.focus();
        previousFocus = null;
    }
}

function renderReadingContent(reading) {
    const date = new Date(reading.created_at).toLocaleDateString('cs-CZ', {
        day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    let contentHtml = `
        <div style="text-align: center; margin-bottom: 1.5rem;">
            <span style="font-size: 3rem;" aria-hidden="true">${getReadingIcon(reading.type)}</span>
            <h2 style="margin: 0.5rem 0;">${escapeHtml(getReadingTitle(reading.type))}</h2>
            <p style="opacity: 0.6; font-size: 0.9rem;">${date}</p>
        </div>
        <div class="reading-content" style="background: rgba(0,0,0,0.2); padding: 1.5rem; border-radius: 10px; max-height: 400px; overflow-y: auto;">
    `;

    const data = reading.data || {};

    function getTarotImageByName(name) {
        if (!name) return 'img/tarot/tarot_placeholder.webp';
        const normalized = name.normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/ /g, '_');
        return `img/tarot/tarot_${normalized}.webp`;
    }

    if (reading.type === 'tarot' && data.cards) {
        contentHtml += `<div style="display: flex; flex-wrap: wrap; gap: 1rem; justify-content: center; margin-bottom: 1.5rem;">`;
        data.cards.forEach(card => {
            const imagePath = getTarotImageByName(card.name);
            contentHtml += `
                <div style="text-align: center; width: 100px; display: flex; flex-direction: column; align-items: center;">
                    <div style="position: relative; width: 80px; height: 120px; margin-bottom: 0.5rem;">
                         <img src="${escapeHtml(imagePath)}"
                              alt="${escapeHtml(card.name)}"
                              loading="lazy"
                              onerror="this.onerror=null;this.src='img/tarot/tarot_placeholder.webp';"
                              style="width: 100%; height: 100%; object-fit: cover; border-radius: 6px; box-shadow: 0 4px 10px rgba(0,0,0,0.5);">
                    </div>
                    <p style="font-size: 0.75rem; margin: 0; font-weight: 600; color: var(--color-mystic-gold); line-height: 1.2;">${escapeHtml(card.name)}</p>
                    ${card.position ? `<small style="font-size: 0.65rem; opacity: 0.7;">${escapeHtml(card.position)}</small>` : ''}
                </div>
            `;
        });
        contentHtml += `</div>`;

        const summary = data.response || data.interpretation;
        if (summary) {
            contentHtml += `
                <div style="background: rgba(255,255,255,0.05); padding: 1.25rem; border-radius: 8px; border-left: 3px solid var(--color-mystic-gold);">
                    <h4 style="color: var(--color-mystic-gold); margin-bottom: 0.75rem; font-size: 1rem;">VÝKLAD KARET</h4>
                    <div style="line-height: 1.8; font-size: 1rem; color: var(--color-silver-mist);">
                        ${summary.replace(/\n/g, '<br>')}
                    </div>
                </div>
            `;
        }
    } else if (reading.type === 'horoscope' && (data.text || data.prediction)) {
        const text = data.text || data.prediction;
        const periodMap = { 'daily': 'Denní horoskop', 'weekly': 'Týdenní horoskop', 'monthly': 'Měsíční horoskop' };
        const periodLabel = periodMap[data.period] || data.period || 'Horoskop';

        contentHtml += `
            <div style="text-align: center; margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid rgba(255,255,255,0.1);">
                <h3 style="color: var(--color-mystic-gold); font-size: 1.5rem; margin-bottom: 0.2rem;">${escapeHtml(data.sign || 'Znamení')}</h3>
                <span style="text-transform: uppercase; letter-spacing: 2px; font-size: 0.75rem; opacity: 0.7;">${escapeHtml(periodLabel)}</span>
            </div>
            <div style="font-size: 1.05rem; line-height: 1.8; color: var(--color-starlight); margin-bottom: 1.5rem;">
                ${escapeHtml(text)}
            </div>
        `;

        if (data.luckyNumbers) {
            contentHtml += `
                <div style="background: rgba(212, 175, 55, 0.1); padding: 0.75rem; border-radius: 8px; text-align: center;">
                    <span style="display: block; font-size: 0.8rem; text-transform: uppercase; color: var(--color-mystic-gold); margin-bottom: 0.25rem;">Šťastná čísla</span>
                    <span style="font-family: var(--font-heading); font-size: 1.2rem; letter-spacing: 1px;">${escapeHtml(data.luckyNumbers.toString())}</span>
                </div>
            `;
        }
    } else if (data.answer) {
        if (data.question) {
            contentHtml += `
                <div style="margin-bottom: 1.5rem; padding: 1rem; border-left: 3px solid var(--color-mystic-gold); background: rgba(255,255,255,0.03);">
                    <small style="text-transform: uppercase; color: var(--color-mystic-gold); font-size: 0.7rem; display: block; margin-bottom: 0.3rem;">Otázka</small>
                    <p style="font-style: italic; opacity: 0.9; margin: 0; font-family: var(--font-heading); font-size: 1.1rem;">"${escapeHtml(data.question)}"</p>
                </div>
            `;
        }
        contentHtml += `
            <div style="font-size: 1.05rem; line-height: 1.8; color: var(--color-starlight);">
                ${escapeHtml(data.answer)}
            </div>
        `;
    } else if (data.interpretation || data.text || data.result) {
        let content = data.interpretation || data.text || data.result;

        if (typeof content === 'string' && /<[a-z][\s\S]*>/i.test(content)) {
            content = content.replace(/<\/?(?:html|head|body|script|iframe|object|embed|form|input|link|meta|style)[^>]*>/gi, '');
            content = content.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
            contentHtml += `<div class="formatted-content" style="line-height: 1.7; color: var(--color-starlight);">${content}</div>`;
        } else {
            contentHtml += `<p style="line-height: 1.7;">${escapeHtml(content)}</p>`;
        }
    } else {
        contentHtml += `<pre style="white-space: pre-wrap; font-size: 0.85rem;">${escapeHtml(JSON.stringify(data, null, 2))}</pre>`;
    }

    contentHtml += `</div>`;
    return contentHtml;
}
