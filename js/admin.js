document.addEventListener('click', (event) => {
    const actionTarget = event.target.closest ? event.target.closest('[data-action]') : null;
    const action = actionTarget ? actionTarget.getAttribute('data-action') : null;

    if (action === 'loadUsers') {
        loadUsers();
    }
    if (action === 'loadFunnel') {
        loadFunnel();
    }
    if (action === 'exportFunnelCsv') {
        exportFunnelCsv();
    }
    if (action === 'exportFunnelSegmentsCsv') {
        exportFunnelCsv('segments');
    }
    if (action === 'loadAdminData') {
        loadAdminData();
    }
});

document.addEventListener('change', (event) => {
    if (event.target && event.target.id === 'funnel-range-days') {
        loadFunnel();
    }
});

document.addEventListener('DOMContentLoaded', async () => {
    await checkAdminAccess();
});

const integerFormatter = new Intl.NumberFormat('cs-CZ');
const currencyFormatter = new Intl.NumberFormat('cs-CZ', {
    style: 'currency',
    currency: 'CZK',
    maximumFractionDigits: 0
});

async function checkAdminAccess() {
    const profile = await window.Auth.getProfile();

    if (!profile) {
        window.location.href = 'prihlaseni.html?redirect=admin.html';
        return;
    }

    document.getElementById('admin-email').textContent = profile.email;
    loadAdminData();
}

async function loadAdminData() {
    await Promise.all([
        loadUsers(),
        loadFunnel()
    ]);
}

async function loadUsers() {
    const tbody = document.querySelector('#users-table tbody');
    const errorMsg = document.getElementById('error-msg');

    try {
        const response = await fetch(`${API_CONFIG.BASE_URL}/admin/users`, {
            credentials: 'include'
        });

        if (response.status === 403) {
            tbody.replaceChildren(createTableMessageRow(6, 'Přístup odepřen (nejste admin).', 'admin-table-error'));
            return;
        }

        const data = await response.json();

        if (!data.success) throw new Error(data.error);

        renderUsers(data.users);
        errorMsg.textContent = '';
    } catch (error) {
        console.error(error);
        errorMsg.textContent = 'Chyba při načítání uživatelů: ' + error.message;
    }
}

function renderUsers(users) {
    const tbody = document.querySelector('#users-table tbody');
    tbody.replaceChildren();

    if (!users || users.length === 0) {
        tbody.appendChild(createTableMessageRow(6, 'Zatím tu nejsou žádní uživatelé.'));
        return;
    }

    users.forEach(user => {
        const sub = (user.subscriptions && user.subscriptions.length > 0)
            ? user.subscriptions[0]
            : (typeof user.subscriptions === 'object' ? user.subscriptions : {});
        const plan = sub.plan_type || 'free';
        const credits = sub.credits || 0;
        const safeClass = plan.split('_')[0].replace(/[^a-z]/g, '');

        const tr = document.createElement('tr');

        const tdEmail = document.createElement('td');
        tdEmail.textContent = user.email;

        const tdId = document.createElement('td');
        tdId.className = 'admin-user-id';
        tdId.textContent = user.id.substring(0, 8) + '...';

        const tdPlan = document.createElement('td');
        const badge = document.createElement('span');
        badge.className = `status-badge status-${safeClass}`;
        badge.textContent = plan;
        tdPlan.appendChild(badge);

        const tdCredits = document.createElement('td');
        tdCredits.textContent = credits;

        const tdDate = document.createElement('td');
        tdDate.textContent = new Date(user.created_at).toLocaleDateString();

        const tdActions = document.createElement('td');
        [
            { plan: 'premium_monthly', label: 'Premium', className: 'btn-promote' },
            { plan: 'exclusive_monthly', label: 'Osv\u00edcen\u00ed', className: 'btn-promote' },
            { plan: 'vip_majestrat', label: 'VIP Majest\u00e1t', className: 'btn-promote' },
            { plan: 'free', label: 'Free', className: 'btn-demote' }
        ].forEach(({ plan: nextPlan, label, className }) => {
            const btn = document.createElement('button');
            btn.className = `action-btn ${className}`;
            btn.textContent = label;
            btn.addEventListener('click', () => updateSub(user.id, nextPlan));
            tdActions.appendChild(btn);
        });

        tr.append(tdEmail, tdId, tdPlan, tdCredits, tdDate, tdActions);
        tbody.appendChild(tr);
    });
}

async function loadFunnel() {
    const daysSelect = document.getElementById('funnel-range-days');
    const days = daysSelect ? daysSelect.value : '30';
    const summary = document.getElementById('funnel-summary');
    const segmentTbody = document.querySelector('#funnel-segments-table tbody');
    const dailyTbody = document.querySelector('#funnel-daily-table tbody');
    const tbody = document.querySelector('#funnel-events-table tbody');
    const errorMsg = document.getElementById('error-msg');

    summary.replaceChildren(createLoadingBlock('Načítám funnel...'));
    segmentTbody.replaceChildren(createTableMessageRow(8, 'Načítám data...'));
    dailyTbody.replaceChildren(createTableMessageRow(7, 'Načítám data...'));
    tbody.replaceChildren(createTableMessageRow(5, 'Načítám data...'));

    try {
        const response = await fetch(`${API_CONFIG.BASE_URL}/admin/funnel?days=${encodeURIComponent(days)}`, {
            credentials: 'include'
        });

        if (response.status === 403) {
            summary.replaceChildren(createLoadingBlock('Přístup odepřen (nejste admin).'));
            segmentTbody.replaceChildren(createTableMessageRow(8, 'Přístup odepřen.', 'admin-table-error'));
            dailyTbody.replaceChildren(createTableMessageRow(7, 'Přístup odepřen.', 'admin-table-error'));
            tbody.replaceChildren(createTableMessageRow(5, 'Přístup odepřen.', 'admin-table-error'));
            return;
        }

        const data = await response.json();
        if (!data.success) throw new Error(data.error);

        renderFunnel(data.report);
        errorMsg.textContent = '';
    } catch (error) {
        console.error(error);
        summary.replaceChildren(createLoadingBlock('Funnel se nepodařilo načíst.'));
        segmentTbody.replaceChildren(createTableMessageRow(8, 'Segmenty nejsou dostupné.', 'admin-table-error'));
        dailyTbody.replaceChildren(createTableMessageRow(7, 'Denní report není dostupný.', 'admin-table-error'));
        tbody.replaceChildren(createTableMessageRow(5, 'Funnel report není dostupný.', 'admin-table-error'));
        errorMsg.textContent = 'Chyba při načítání funnelu: ' + error.message;
    }
}

async function exportFunnelCsv(view = 'daily') {
    const daysSelect = document.getElementById('funnel-range-days');
    const days = daysSelect ? daysSelect.value : '30';
    const errorMsg = document.getElementById('error-msg');
    const viewParam = view === 'segments' ? '&view=segments' : '';

    try {
        const response = await fetch(`${API_CONFIG.BASE_URL}/admin/funnel?days=${encodeURIComponent(days)}&format=csv${viewParam}`, {
            credentials: 'include'
        });

        if (!response.ok) throw new Error(`Export selhal (${response.status})`);

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = view === 'segments'
            ? `funnel-segmenty-${days}d.csv`
            : `funnel-${days}d.csv`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        errorMsg.textContent = '';
    } catch (error) {
        console.error(error);
        errorMsg.textContent = 'CSV export se nepodařil: ' + error.message;
    }
}

function renderFunnel(report) {
    const metrics = report.metrics || {};
    const summary = document.getElementById('funnel-summary');
    const metricCards = [
        ['Paywall views', formatInteger(metrics.paywallViewed), `${formatPercent(metrics.paywallToCheckoutRate)} pokračuje do checkoutu`],
        ['Checkouty', formatInteger(metrics.checkoutStarted), 'Zahájené Stripe checkout sessions'],
        ['Premium konverze', formatInteger(metrics.subscriptionCompleted), `${formatPercent(metrics.conversionRate)} z checkoutů`],
        ['Jednorázové nákupy', formatInteger(metrics.oneTimeCompleted), 'Roční horoskop a další produkty'],
        ['Selhání', formatInteger(metrics.failures), 'Validace, Stripe nebo platba'],
        ['Refundy', formatInteger(metrics.refunds), 'Vrácené platby'],
        ['Odhad hodnoty', formatCurrency(metrics.estimatedValueCzk), `Za posledních ${report.days} dní`],
    ];

    summary.replaceChildren(...metricCards.map(([label, value, hint]) => createMetric(label, value, hint)));
    renderBreakdown('funnel-sources', report.topSources);
    renderBreakdown('funnel-features', report.topFeatures);
    renderBreakdown('funnel-plans', report.topPlans);
    renderSourceComparison(report.sourceComparison);
    renderFunnelSegments(report.sourceFeatureSegments || []);
    renderFunnelDaily(report.daily || []);
    renderFunnelEvents(report.recentEvents || []);
}

function renderFunnelSegments(rows) {
    const tbody = document.querySelector('#funnel-segments-table tbody');
    if (!tbody) return;

    tbody.replaceChildren();

    if (!rows || rows.length === 0) {
        tbody.appendChild(createTableMessageRow(8, 'Zatím tu nejsou žádné source + feature segmenty.'));
        return;
    }

    rows.forEach(row => {
        const tr = document.createElement('tr');
        appendCell(tr, formatDimension(row.source));
        appendCell(tr, formatDimension(row.feature));
        appendCell(tr, formatInteger(row.paywallViewed));
        appendCell(tr, formatInteger(row.checkoutStarted));
        appendCell(tr, formatInteger(row.purchaseCompleted));
        appendCell(tr, formatRatePair(row));
        appendCell(tr, formatRatePair(row.previous));
        appendCell(tr, `${formatRateDelta(row.paywallToCheckoutRateDelta)} / ${formatRateDelta(row.checkoutToPurchaseRateDelta)}`);
        tbody.appendChild(tr);
    });
}

function renderFunnelDaily(rows) {
    const tbody = document.querySelector('#funnel-daily-table tbody');
    tbody.replaceChildren();

    if (!rows || rows.length === 0) {
        tbody.appendChild(createTableMessageRow(7, 'Zatím tu nejsou žádná denní data.'));
        return;
    }

    [...rows].reverse().forEach(row => {
        const tr = document.createElement('tr');
        appendCell(tr, row.date || '-');
        appendCell(tr, formatInteger(row.paywallViewed));
        appendCell(tr, formatInteger(row.checkoutStarted));
        appendCell(tr, formatInteger(row.subscriptionCompleted));
        appendCell(tr, formatInteger(row.oneTimeCompleted));
        appendCell(tr, formatInteger(row.failures));
        appendCell(tr, formatInteger(row.refunds));
        tbody.appendChild(tr);
    });
}

function renderBreakdown(elementId, rows) {
    const list = document.getElementById(elementId);
    list.replaceChildren();

    if (!rows || rows.length === 0) {
        const empty = document.createElement('li');
        empty.textContent = 'Žádná data.';
        list.appendChild(empty);
        return;
    }

    rows.forEach(row => {
        const item = document.createElement('li');

        const label = document.createElement('strong');
        label.textContent = formatDimension(row.key);

        const count = document.createElement('span');
        count.textContent = formatInteger(row.count);

        item.append(label, count);
        list.appendChild(item);
    });
}

function renderSourceComparison(rows) {
    const list = document.getElementById('funnel-source-comparison');
    if (!list) return;

    list.replaceChildren();

    if (!rows || rows.length === 0) {
        const empty = document.createElement('li');
        empty.textContent = '\u017d\u00e1dn\u00e1 data.';
        list.appendChild(empty);
        return;
    }

    rows.forEach(row => {
        const item = document.createElement('li');

        const label = document.createElement('strong');
        label.textContent = formatDimension(row.key);

        const counts = document.createElement('span');
        counts.textContent = `${formatInteger(row.current)} / ${formatInteger(row.previous)} (${formatSignedInteger(row.delta)}, ${formatDeltaPercent(row.deltaPercent)})`;

        item.append(label, counts);
        list.appendChild(item);
    });
}

function renderFunnelEvents(events) {
    const tbody = document.querySelector('#funnel-events-table tbody');
    tbody.replaceChildren();

    if (events.length === 0) {
        tbody.appendChild(createTableMessageRow(5, 'Zatím tu nejsou žádné funnel události.'));
        return;
    }

    events.forEach(event => {
        const tr = document.createElement('tr');
        appendCell(tr, formatDateTime(event.createdAt));
        appendCell(tr, event.eventName || '-');
        appendCell(tr, formatDimension(event.source));
        appendCell(tr, formatDimension(event.feature));
        appendCell(tr, formatDimension(event.planId || event.planType));
        tbody.appendChild(tr);
    });
}

function createMetric(label, value, hint) {
    const metric = document.createElement('div');
    metric.className = 'admin-metric';

    const labelNode = document.createElement('span');
    labelNode.className = 'admin-metric__label';
    labelNode.textContent = label;

    const valueNode = document.createElement('strong');
    valueNode.className = 'admin-metric__value';
    valueNode.textContent = value;

    const hintNode = document.createElement('span');
    hintNode.className = 'admin-metric__hint';
    hintNode.textContent = hint;

    metric.append(labelNode, valueNode, hintNode);
    return metric;
}

function createLoadingBlock(text) {
    const block = document.createElement('div');
    block.className = 'admin-loading';
    block.textContent = text;
    return block;
}

function createTableMessageRow(colspan, text, className = '') {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = colspan;
    if (className) td.className = className;
    td.textContent = text;
    tr.appendChild(td);
    return tr;
}

function appendCell(row, text, className = '') {
    const cell = document.createElement('td');
    if (className) cell.className = className;
    cell.textContent = text;
    row.appendChild(cell);
}

function formatInteger(value) {
    return integerFormatter.format(Number(value) || 0);
}

function formatCurrency(value) {
    return currencyFormatter.format(Number(value) || 0);
}

function formatPercent(value) {
    return `${integerFormatter.format(Number(value) || 0)} %`;
}

function formatRatePair(row = {}) {
    return `${formatPercent(row.paywallToCheckoutRate)} / ${formatPercent(row.checkoutToPurchaseRate)}`;
}

function formatRateDelta(value) {
    if (value == null) return 'bez srovnani';

    const numericValue = Number(value) || 0;
    const formatted = formatPercent(numericValue);
    return numericValue > 0 ? `+${formatted}` : formatted;
}

function formatSignedInteger(value) {
    const numericValue = Number(value) || 0;
    const formatted = integerFormatter.format(numericValue);
    return numericValue > 0 ? `+${formatted}` : formatted;
}

function formatDeltaPercent(value) {
    if (value == null) return 'nov\u00fd zdroj';

    const numericValue = Number(value) || 0;
    const formatted = formatPercent(numericValue);
    return numericValue > 0 ? `+${formatted}` : formatted;
}

function formatDimension(value) {
    if (!value || value === '(nezadano)') return 'Nezadáno';
    if (value === '(direct)') return 'Direct';
    return value;
}

function formatDateTime(value) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString('cs-CZ', {
        dateStyle: 'short',
        timeStyle: 'short'
    });
}

window.updateSub = async function updateSub(userId, plan) {
    if (!confirm(`Opravdu změnit plán na ${plan} pro uživatele ${userId}?`)) return;

    try {
        const csrfToken = window.getCSRFToken ? await window.getCSRFToken() : null;
        const response = await fetch(`${API_CONFIG.BASE_URL}/admin/user/${userId}/subscription`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {})
            },
            body: JSON.stringify({ plan_type: plan })
        });

        const data = await response.json();
        if (data.success) {
            alert('Aktualizováno.');
            loadAdminData();
        } else {
            alert('Chyba: ' + data.error);
        }
    } catch (e) {
        alert('Chyba spojení.');
    }
};
