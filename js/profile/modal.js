/**
 * Modal logic for viewing reading details
 */

import { escapeHtml, apiUrl, authHeaders, authHeadersWithCsrf, getReadingIcon, getReadingTitle } from './shared.js';
import { getAllReadings, updateReading, renderReadings, loadReadings } from './readings.js';
import { loadFavorites } from './favorites.js';

// State
let currentReadingId = null;
let currentReadingIsFavorite = false;
let previousFocus = null;
let activeModal = null;
let focusTrapHandler = null;

const FEEDBACK_RESONANCE_OPTIONS = [
    { value: 'fits', label: 'Sedí' },
    { value: 'neutral', label: 'Ještě nevím' },
    { value: 'miss', label: 'Netrefilo se' }
];

const FEEDBACK_FOCUS_OPTIONS = [
    { value: 'relationships', label: 'Vztahy' },
    { value: 'work', label: 'Práce' },
    { value: 'energy', label: 'Energie' },
    { value: 'self', label: 'Sebepoznání' },
    { value: 'timing', label: 'Načasování' }
];

export async function viewReading(id) {
    const modal = document.getElementById('reading-modal');
    const content = document.getElementById('reading-modal-content');
    if (!modal || !content) return;

    currentReadingId = id;
    modal.hidden = false;
    modal.classList.add('is-visible');
    content.innerHTML = '<p class="reading-modal__loading">Načítání...</p>';

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
        bindReadingImageFallbacks(content);
        bindReadingFeedback(content, reading);

    } catch (error) {
        console.error('Error loading reading:', error);
        content.innerHTML = '<p class="reading-modal__error">Nepodařilo se načíst výklad.</p>';
    }
}

export function closeReadingModal() {
    const modal = document.getElementById('reading-modal');
    if (modal) {
        modal.classList.remove('is-visible');
        modal.hidden = true;
    }
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
            headers: await authHeadersWithCsrf()
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
        if (favoritesTab && favoritesTab.classList.contains('is-active')) {
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
            credentials: 'include',
            headers: await authHeadersWithCsrf()
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
    activeModal = modal;

    const focusable = getFocusableElements(modal);
    const initialFocus = modal.querySelector('.modal__close') || focusable[0] || modal;
    initialFocus.focus();

    focusTrapHandler = (event) => {
        if (!activeModal) return;

        if (event.key === 'Escape') {
            event.preventDefault();
            closeReadingModal();
            return;
        }

        if (event.key !== 'Tab') return;

        const currentFocusable = getFocusableElements(activeModal);
        if (!currentFocusable.length) {
            event.preventDefault();
            activeModal.focus();
            return;
        }

        const first = currentFocusable[0];
        const last = currentFocusable[currentFocusable.length - 1];

        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    };

    document.addEventListener('keydown', focusTrapHandler);
}

function releaseFocus() {
    if (focusTrapHandler) {
        document.removeEventListener('keydown', focusTrapHandler);
        focusTrapHandler = null;
    }

    activeModal = null;

    if (previousFocus) {
        previousFocus.focus();
        previousFocus = null;
    }
}

function getFocusableElements(modal) {
    return Array.from(modal.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )).filter((element) => element.offsetParent !== null);
}

function bindReadingImageFallbacks(root) {
    root.querySelectorAll('[data-tarot-fallback]').forEach((image) => {
        image.addEventListener('error', () => {
            if (image.dataset.fallbackApplied === '1') return;
            image.dataset.fallbackApplied = '1';
            image.src = '/img/tarot/tarot_placeholder.webp';
        });
    });
}

function setReadingFeedbackStatus(panel, message, state = 'neutral') {
    const status = panel?.querySelector?.('.reading-feedback__status');
    if (!status) return;
    status.textContent = message;
    status.dataset.state = state;
}

async function saveProfileReadingFeedback(readingId, payload, panel, trigger) {
    if (!readingId) return null;

    if (trigger) trigger.disabled = true;
    setReadingFeedbackStatus(panel, 'Ukládám zpětnou vazbu...', 'pending');

    let result = null;
    if (window.Auth?.saveReadingFeedback) {
        result = await window.Auth.saveReadingFeedback(readingId, {
            ...payload,
            feature: 'profile_history',
            source: 'profile_reading_modal'
        });
    } else {
        const response = await fetch(`${apiUrl()}/user/readings/${encodeURIComponent(readingId)}/feedback`, {
            method: 'PATCH',
            credentials: 'include',
            headers: await authHeadersWithCsrf(true),
            body: JSON.stringify({
                ...payload,
                feature: 'profile_history',
                source: 'profile_reading_modal'
            })
        });
        result = await response.json().catch(() => null);
        if (!response.ok) result = null;
    }

    if (trigger) trigger.disabled = false;

    if (!result?.success) {
        setReadingFeedbackStatus(panel, 'Nepodařilo se uložit. Zkus to znovu.', 'error');
        return null;
    }

    if (result.reading) {
        updateReading(readingId, result.reading);
    }

    const refreshedReadings = await loadReadings();
    document.dispatchEvent(new CustomEvent('reading:updated', { detail: { readings: refreshedReadings } }));
    setReadingFeedbackStatus(panel, 'Uloženo. Paměť profilu má další signál pro návratový rituál.', 'success');
    return result;
}

function renderReadingFeedbackPanel(reading) {
    const data = reading?.data;
    if (reading?.type === 'journal' || !data || typeof data !== 'object' || Array.isArray(data)) return '';

    const feedback = data.feedback && typeof data.feedback === 'object' && !Array.isArray(data.feedback)
        ? data.feedback
        : {};
    const resonanceChips = FEEDBACK_RESONANCE_OPTIONS.map(option => `
        <button type="button" class="reading-feedback__chip ${feedback.resonance === option.value ? 'is-selected' : ''}" data-feedback-resonance="${option.value}">
            ${escapeHtml(option.label)}
        </button>
    `).join('');
    const focusChips = FEEDBACK_FOCUS_OPTIONS.map(option => `
        <button type="button" class="reading-feedback__chip ${feedback.focus === option.value ? 'is-selected' : ''}" data-feedback-focus="${option.value}">
            ${escapeHtml(option.label)}
        </button>
    `).join('');

    return `
        <section class="reading-feedback" data-reading-feedback="${escapeHtml(reading.id)}">
            <div class="reading-feedback__header">
                <span class="reading-feedback__eyebrow">Zpětná vazba</span>
                <strong>Co má profil brát jako další signál?</strong>
            </div>
            <div class="reading-feedback__chips" aria-label="Zpětná vazba k výkladu">
                ${resonanceChips}
            </div>
            <div class="reading-feedback__chips" aria-label="Téma pro paměť rituálu">
                ${focusChips}
            </div>
            <div class="reading-feedback__actions">
                <button type="button" class="btn btn--glass btn--sm" data-feedback-next-action="journal">Zapsat reflexi</button>
                <a class="btn btn--glass btn--sm" href="tarot.html?source=profile_feedback&feature=another_reading" data-feedback-next-action="another_reading">Navázat výkladem</a>
            </div>
            <p class="reading-feedback__status" aria-live="polite"></p>
        </section>
    `;
}

function focusJournalFromModal() {
    closeReadingModal();
    const input = document.getElementById('journal-input');
    if (!input) return;

    window.history.replaceState(null, '', '#journal-input');
    input.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => input.focus(), 250);
}

function bindReadingFeedback(root, reading) {
    const panel = root.querySelector('[data-reading-feedback]');
    if (!panel) return;

    panel.addEventListener('click', async (event) => {
        const resonanceBtn = event.target.closest('[data-feedback-resonance]');
        const focusBtn = event.target.closest('[data-feedback-focus]');
        const nextActionEl = event.target.closest('[data-feedback-next-action]');
        const clickedEl = resonanceBtn || focusBtn || nextActionEl;
        if (!clickedEl) return;

        const payload = {};
        if (resonanceBtn) payload.resonance = resonanceBtn.dataset.feedbackResonance;
        if (focusBtn) payload.focus = focusBtn.dataset.feedbackFocus;
        if (nextActionEl) payload.nextAction = nextActionEl.dataset.feedbackNextAction;

        panel.querySelectorAll('.reading-feedback__chip').forEach((chip) => {
            if ((payload.resonance && chip.dataset.feedbackResonance)
                || (payload.focus && chip.dataset.feedbackFocus)) {
                chip.classList.toggle('is-selected', chip === clickedEl);
            }
        });

        if (nextActionEl?.tagName === 'A') {
            event.preventDefault();
            const result = await saveProfileReadingFeedback(reading.id, payload, panel, null);
            if (result?.success) window.location.href = nextActionEl.getAttribute('href');
            return;
        }

        if (payload.nextAction === 'journal') {
            const result = await saveProfileReadingFeedback(reading.id, payload, panel, nextActionEl);
            if (result?.success) focusJournalFromModal();
            return;
        }

        await saveProfileReadingFeedback(reading.id, payload, panel, clickedEl);
    });
}

function formatStructuredFieldLabel(key) {
    const labels = {
        era: 'Období',
        identity: 'Identita',
        karmic_lesson: 'Karmická lekce',
        gifts: 'Dary',
        patterns: 'Vzorce',
        mission: 'Mise',
        message: 'Poselství',
        strengths: 'Silné stránky',
        challenges: 'Výzvy'
    };

    return labels[key] || String(key)
        .replace(/_/g, ' ')
        .replace(/^\w/, (char) => char.toUpperCase());
}

function renderStructuredObjectContent(content) {
    if (!content || typeof content !== 'object') return '';

    return Object.entries(content)
        .filter(([, value]) => value !== null && value !== undefined && value !== '')
        .map(([key, value]) => {
            const displayValue = typeof value === 'object'
                ? JSON.stringify(value, null, 2)
                : String(value);

            return `
                <section class="reading-structured-field">
                    <h4 class="reading-structured-field__label">${escapeHtml(formatStructuredFieldLabel(key))}</h4>
                    <p class="reading-structured-field__value">${escapeHtml(displayValue).replace(/\n/g, '<br>')}</p>
                </section>
            `;
        })
        .join('');
}

function renderMetricSummary(title, metrics) {
    const items = metrics
        .filter((item) => item.value !== null && item.value !== undefined && item.value !== '')
        .map((item) => `
            <span class="reading-metric">
                <strong>${escapeHtml(item.label)}</strong>
                <span>${escapeHtml(item.value)}</span>
            </span>
        `)
        .join('');

    if (!items) return '';

    return `
        <section class="reading-summary-panel">
            <h3 class="reading-summary-panel__title">${escapeHtml(title)}</h3>
            <div class="reading-metric-grid">${items}</div>
        </section>
    `;
}

function renderChartSummary(chart) {
    const summary = chart?.summary;
    if (!summary) return '';

    return renderMetricSummary('Vypočtená mapa', [
        { label: 'Slunce', value: summary.sunSign },
        { label: 'Měsíc', value: summary.moonSign },
        { label: 'Ascendent', value: summary.ascendantSign || 'nevypočten' },
        { label: 'Dominantní živel', value: summary.dominantElement },
        { label: 'Modalita', value: summary.dominantQuality }
    ]);
}

function renderSynastrySummary(data) {
    const scores = data?.synastry?.scores || data?.scores;
    if (!scores) return '';

    return renderMetricSummary('Skóre vztahu', [
        { label: 'Celkem', value: `${scores.total ?? '--'} %` },
        { label: 'Emoce', value: `${scores.emotion ?? '--'} %` },
        { label: 'Komunikace', value: `${scores.communication ?? '--'} %` },
        { label: 'Vášeň', value: `${scores.passion ?? '--'} %` },
        { label: 'Stabilita', value: `${scores.stability ?? '--'} %` }
    ]);
}

function renderAstrocartographySummary(astrocartography) {
    if (!astrocartography || typeof astrocartography !== 'object') return '';

    const recommendations = Array.isArray(astrocartography.recommendations)
        ? astrocartography.recommendations.slice(0, 3)
        : [];
    const lines = Array.isArray(astrocartography.angularLines)
        ? astrocartography.angularLines.slice(0, 4)
        : [];

    const recommendationHtml = recommendations.map((item) => `
        <li>
            <strong>${escapeHtml(item.city || 'Místo')}</strong>
            <span>${escapeHtml(item.score ?? '--')} / 100 · ${escapeHtml(item.primaryPlanet?.name || 'planeta')}</span>
        </li>
    `).join('');
    const lineHtml = lines.map((line) => `
        <li>
            <strong>${escapeHtml(line.planetName || 'Planeta')} ${escapeHtml(line.angle || '')}</strong>
            <span>${escapeHtml(line.longitude ?? '--')}°</span>
        </li>
    `).join('');

    if (!recommendationHtml && !lineHtml) return '';

    return `
        <section class="reading-summary-panel">
            <h3 class="reading-summary-panel__title">Astro mapa</h3>
            ${recommendationHtml ? `<ul class="reading-summary-list">${recommendationHtml}</ul>` : ''}
            ${lineHtml ? `<ul class="reading-summary-list reading-summary-list--compact">${lineHtml}</ul>` : ''}
        </section>
    `;
}

function renderReadingContent(reading) {
    const date = new Date(reading.created_at).toLocaleDateString('cs-CZ', {
        day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    let contentHtml = `
        <div class="reading-detail__header">
            <span class="reading-detail__icon" aria-hidden="true">${getReadingIcon(reading.type)}</span>
            <h2 class="reading-detail__title">${escapeHtml(getReadingTitle(reading.type))}</h2>
            <p class="reading-detail__date">${date}</p>
        </div>
        <div class="reading-content reading-detail__body">
    `;

    const data = reading.data || {};
    if (data && typeof data === 'object') {
        if (reading.type === 'synastry') {
            contentHtml += renderSynastrySummary(data);
        }
        contentHtml += renderChartSummary(data.chart || data.synastry?.person1?.chart);
        if (reading.type === 'astrocartography') {
            contentHtml += renderAstrocartographySummary(data.astrocartography);
        }
    }

    function getTarotImageByName(name) {
        if (!name) return 'img/tarot/tarot_placeholder.webp';
        const normalized = name.normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/ /g, '_');
        return `img/tarot/tarot_${normalized}.webp`;
    }

    if (typeof data === 'string') {
        contentHtml += `<div class="reading-plain-text">${escapeHtml(data).replace(/\n/g, '<br>')}</div>`;
    } else if (reading.type === 'tarot' && data.cards) {
        contentHtml += '<div class="reading-tarot-grid">';
        data.cards.forEach(card => {
            const imagePath = getTarotImageByName(card.name);
            contentHtml += `
                <div class="reading-tarot-card">
                    <div class="reading-tarot-card__image-wrap">
                         <img src="${escapeHtml(imagePath)}"
                              alt="${escapeHtml(card.name)}"
                              loading="lazy"
                              data-tarot-fallback
                              class="reading-tarot-card__image">
                    </div>
                    <p class="reading-tarot-card__title">${escapeHtml(card.name)}</p>
                    ${card.position ? `<small class="reading-tarot-card__position">${escapeHtml(card.position)}</small>` : ''}
                </div>
            `;
        });
        contentHtml += `</div>`;

        const summary = data.response || data.interpretation;
        if (summary) {
            const escapedSummary = escapeHtml(summary).replace(/\n/g, '<br>');
            contentHtml += `
                <div class="reading-interpretation">
                    <h4 class="reading-interpretation__title">VÝKLAD KARET</h4>
                    <div class="reading-interpretation__text">
                        ${escapedSummary}
                    </div>
                </div>
            `;
        }
    } else if (reading.type === 'horoscope' && (data.text || data.prediction)) {
        const text = data.text || data.prediction;
        const periodMap = { 'daily': 'Denní horoskop', 'weekly': 'Týdenní horoskop', 'monthly': 'Měsíční horoskop' };
        const periodLabel = periodMap[data.period] || data.period || 'Horoskop';

        contentHtml += `
            <div class="reading-horoscope-header">
                <h3 class="reading-horoscope-header__sign">${escapeHtml(data.sign || 'Znamení')}</h3>
                <span class="reading-horoscope-header__period">${escapeHtml(periodLabel)}</span>
            </div>
            <div class="reading-horoscope-text">
                ${escapeHtml(text)}
            </div>
        `;

        if (data.luckyNumbers) {
            contentHtml += `
                <div class="reading-lucky-numbers">
                    <span class="reading-lucky-numbers__label">Šťastná čísla</span>
                    <span class="reading-lucky-numbers__value">${escapeHtml(data.luckyNumbers.toString())}</span>
                </div>
            `;
        }
    } else if (data.answer) {
        if (data.question) {
            contentHtml += `
                <div class="reading-question">
                    <small class="reading-question__label">Otázka</small>
                    <p class="reading-question__text">"${escapeHtml(data.question)}"</p>
                </div>
            `;
        }
        contentHtml += `
            <div class="reading-answer">
                ${escapeHtml(data.answer)}
            </div>
        `;
    } else if (data.interpretation || data.response || data.text || data.result) {
        let content = data.interpretation || data.response || data.text || data.result;

        if (typeof content === 'string') {
            const fallbackHtml = escapeHtml(content).replace(/\n/g, '<br>');
            const sanitized = typeof DOMPurify !== 'undefined' ? DOMPurify.sanitize(fallbackHtml) : fallbackHtml;
            contentHtml += `<div class="formatted-content reading-formatted-content">${sanitized}</div>`;
        } else {
            contentHtml += `<div class="reading-structured">${renderStructuredObjectContent(content)}</div>`;
        }
    } else {
        contentHtml += `<pre class="reading-json">${escapeHtml(JSON.stringify(data, null, 2))}</pre>`;
    }

    contentHtml += `</div>`;
    contentHtml += renderReadingFeedbackPanel(reading);
    return contentHtml;
}
