/**
 * Reading history management
 */

import { escapeHtml, apiUrl, authHeaders, getReadingIcon, getReadingTitle } from './shared.js';

// State
let allReadings = [];
let currentFilter = 'all';
let displayedCount = 0;
const PAGE_SIZE = 10;

// Getter for allReadings (used by modal.js)
export function getAllReadings() {
    return allReadings;
}

// Setter for updating a reading (used by modal.js)
export function updateReading(id, updates) {
    const reading = allReadings.find(r => r.id === id);
    if (reading) {
        Object.assign(reading, updates);
    }
}

export async function loadReadings() {
    const container = document.getElementById('readings-list');

    try {
        const response = await fetch(`${apiUrl()}/user/readings`, {
            credentials: 'include',
            headers: authHeaders()
        });

        if (!response.ok) throw new Error('Failed to load readings');

        const data = await response.json();
        allReadings = data.readings || [];
        displayedCount = 0;

        renderReadings();
        return allReadings;

    } catch (error) {
        console.error('Error loading readings:', error);
        if (container) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state__icon">⚠️</div>
                    <p class="empty-state__text">Nepodařilo se načíst historii.</p>
                    <button class="btn btn--glass btn--sm" onclick="location.reload()">Zkusit znovu</button>
                </div>
            `;
        }
        return [];
    }
}

export function handleFilterChange(e) {
    currentFilter = e.target.value;
    displayedCount = 0;
    renderReadings();
}

function getFilteredReadings() {
    if (currentFilter === 'all') return allReadings;
    return allReadings.filter(r => r.type === currentFilter);
}

export function renderReadings() {
    const container = document.getElementById('readings-list');
    if (!container) return;

    const filtered = getFilteredReadings();

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state__icon">🔮</div>
                <h4 class="empty-state__title">${currentFilter === 'all' ? 'Zatím nemáte žádné výklady' : 'Žádné výklady tohoto typu'}</h4>
                <p class="empty-state__text">${currentFilter === 'all' ? 'Vydejte se na cestu za poznáním hvězd!' : 'Zkuste jiný typ výkladu.'}</p>
                ${currentFilter === 'all' ? `
                    <div style="display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap; margin-top: 1rem;">
                        <a href="tarot.html" class="btn btn--primary btn--sm">🃏 Tarot</a>
                        <a href="kristalova-koule.html" class="btn btn--glass btn--sm">🔮 Křišťálová koule</a>
                        <a href="horoskopy.html" class="btn btn--glass btn--sm">⭐ Horoskop</a>
                    </div>
                ` : ''}
            </div>
        `;
        updatePagination(0, 0);
        return;
    }

    // Show paginated results
    const toShow = filtered.slice(0, displayedCount + PAGE_SIZE);
    displayedCount = toShow.length;

    container.innerHTML = toShow.map(reading => `
        <div class="reading-item card" onclick="viewReading('${escapeHtml(reading.id)}')">
            <div class="reading-item__inner">
                <div class="reading-item__left">
                    <span class="reading-item__icon" aria-hidden="true">${getReadingIcon(reading.type)}</span>
                    <div>
                        <strong>${escapeHtml(getReadingTitle(reading.type))}</strong>
                        <p class="reading-item__date">
                            ${new Date(reading.created_at).toLocaleDateString('cs-CZ', {
        day: 'numeric', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    })}
                        </p>
                    </div>
                </div>
                <div class="reading-item__actions">
                    <button class="btn btn--sm btn--glass" onclick="event.stopPropagation(); toggleFavorite('${escapeHtml(reading.id)}', this)"
                        title="${reading.is_favorite ? 'Odebrat z oblíbených' : 'Přidat do oblíbených'}"
                        aria-label="${reading.is_favorite ? 'Odebrat z oblíbených' : 'Přidat do oblíbených'}">
                        ${reading.is_favorite ? '⭐' : '☆'}
                    </button>
                    <button class="btn btn--sm btn--glass" onclick="event.stopPropagation(); viewReading('${escapeHtml(reading.id)}')" aria-label="Zobrazit detail">Zobrazit</button>
                </div>
            </div>
        </div>
    `).join('');

    updatePagination(displayedCount, filtered.length);
}

export function showMoreReadings() {
    renderReadings();
}

function updatePagination(shown, total) {
    const paginationEl = document.getElementById('readings-pagination');
    if (!paginationEl) return;

    if (shown < total) {
        paginationEl.style.display = 'block';
        const btn = document.getElementById('readings-load-more');
        if (btn) btn.textContent = `Načíst další (${total - shown} zbývá)`;
    } else {
        paginationEl.style.display = 'none';
    }
}
