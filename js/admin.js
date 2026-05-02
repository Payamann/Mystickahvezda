document.addEventListener('click', (event) => {
    const actionTarget = event.target.closest ? event.target.closest('[data-action]') : null;
    const action = actionTarget ? actionTarget.getAttribute('data-action') : null;

    if (action === 'loadUsers') {
        loadUsers();
    }
    if (action === 'loadFunnel') {
        loadFunnel();
    }
    if (action === 'loadBusiness') {
        loadBusiness();
    }
    if (action === 'exportFunnelCsv') {
        exportFunnelCsv();
    }
    if (action === 'exportFunnelSegmentsCsv') {
        exportFunnelCsv('segments');
    }
    if (action === 'loadAnalytics') {
        loadAnalytics();
    }
    if (action === 'exportAnalyticsCsv') {
        exportAnalyticsCsv();
    }
    if (action === 'exportAnalyticsAttributionCsv') {
        exportAnalyticsCsv('attribution');
    }
    if (action === 'loadAdminData') {
        loadAdminData();
    }
    if (action === 'loadAngelMessages') {
        loadAngelMessages();
    }
    if (action === 'approveAngelMessage' && actionTarget.dataset.id) {
        moderateAngelMessage(actionTarget.dataset.id, true);
    }
    if (action === 'unapproveAngelMessage' && actionTarget.dataset.id) {
        moderateAngelMessage(actionTarget.dataset.id, false);
    }
    if (action === 'deleteAngelMessage' && actionTarget.dataset.id) {
        deleteAngelMessage(actionTarget.dataset.id);
    }
});

document.addEventListener('change', (event) => {
    if (event.target && event.target.id === 'funnel-range-days') {
        loadFunnel();
    }
    if (event.target && event.target.id === 'business-range-days') {
        loadBusiness();
    }
    if (event.target && event.target.id === 'analytics-range-days') {
        loadAnalytics();
    }
    if (event.target && event.target.id === 'angel-message-status') {
        loadAngelMessages();
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
        loadBusiness(),
        loadFunnel(),
        loadAnalytics(),
        loadAngelMessages()
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

async function loadBusiness() {
    const daysSelect = document.getElementById('business-range-days');
    const days = daysSelect ? daysSelect.value : '30';
    const summary = document.getElementById('business-summary');
    const acquisitionTbody = document.querySelector('#business-acquisition-table tbody');
    const errorMsg = document.getElementById('error-msg');

    if (!summary || !acquisitionTbody) return;

    summary.replaceChildren(createLoadingBlock('Načítám business cockpit...'));
    acquisitionTbody.replaceChildren(createTableMessageRow(9, 'Načítám data...'));

    try {
        const response = await fetch(`${API_CONFIG.BASE_URL}/admin/business?days=${encodeURIComponent(days)}`, {
            credentials: 'include'
        });

        if (response.status === 403) {
            summary.replaceChildren(createLoadingBlock('Přístup odepřen (nejste admin).'));
            acquisitionTbody.replaceChildren(createTableMessageRow(9, 'Přístup odepřen.', 'admin-table-error'));
            return;
        }

        const data = await response.json();
        if (!data.success) throw new Error(data.error);

        renderBusiness(data.report);
        errorMsg.textContent = '';
    } catch (error) {
        console.error(error);
        summary.replaceChildren(createLoadingBlock('Business cockpit se nepodařilo načíst.'));
        acquisitionTbody.replaceChildren(createTableMessageRow(9, 'Akviziční segmenty nejsou dostupné.', 'admin-table-error'));
        errorMsg.textContent = 'Chyba při načítání business cockpit: ' + error.message;
    }
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
    dailyTbody.replaceChildren(createTableMessageRow(9, 'Načítám data...'));
    tbody.replaceChildren(createTableMessageRow(5, 'Načítám data...'));

    try {
        const response = await fetch(`${API_CONFIG.BASE_URL}/admin/funnel?days=${encodeURIComponent(days)}`, {
            credentials: 'include'
        });

        if (response.status === 403) {
            summary.replaceChildren(createLoadingBlock('Přístup odepřen (nejste admin).'));
            segmentTbody.replaceChildren(createTableMessageRow(8, 'Přístup odepřen.', 'admin-table-error'));
            dailyTbody.replaceChildren(createTableMessageRow(9, 'Přístup odepřen.', 'admin-table-error'));
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

async function loadAnalytics() {
    const daysSelect = document.getElementById('analytics-range-days');
    const days = daysSelect ? daysSelect.value : '7';
    const summary = document.getElementById('analytics-summary');
    const attributionTbody = document.querySelector('#analytics-attribution-table tbody');
    const dailyTbody = document.querySelector('#analytics-daily-table tbody');
    const errorsTbody = document.querySelector('#analytics-errors-table tbody');
    const errorMsg = document.getElementById('error-msg');

    if (!summary || !dailyTbody || !errorsTbody) return;

    summary.replaceChildren(createLoadingBlock('Načítám analytics...'));
    if (attributionTbody) attributionTbody.replaceChildren(createTableMessageRow(12, 'Načítám data...'));
    dailyTbody.replaceChildren(createTableMessageRow(7, 'Načítám data...'));
    errorsTbody.replaceChildren(createTableMessageRow(5, 'Načítám data...'));

    try {
        const response = await fetch(`${API_CONFIG.BASE_URL}/admin/analytics?days=${encodeURIComponent(days)}`, {
            credentials: 'include'
        });

        if (response.status === 403) {
            summary.replaceChildren(createLoadingBlock('Přístup odepřen (nejste admin).'));
            if (attributionTbody) attributionTbody.replaceChildren(createTableMessageRow(12, 'Přístup odepřen.', 'admin-table-error'));
            dailyTbody.replaceChildren(createTableMessageRow(7, 'Přístup odepřen.', 'admin-table-error'));
            errorsTbody.replaceChildren(createTableMessageRow(5, 'Přístup odepřen.', 'admin-table-error'));
            return;
        }

        const data = await response.json();
        if (!data.success) throw new Error(data.error);

        renderAnalytics(data.report);
        errorMsg.textContent = '';
    } catch (error) {
        console.error(error);
        summary.replaceChildren(createLoadingBlock('Analytics se nepodařilo načíst.'));
        if (attributionTbody) attributionTbody.replaceChildren(createTableMessageRow(12, 'Atribuce nejsou dostupné.', 'admin-table-error'));
        dailyTbody.replaceChildren(createTableMessageRow(9, 'Denní analytics report není dostupný.', 'admin-table-error'));
        errorsTbody.replaceChildren(createTableMessageRow(5, 'Chyby nejsou dostupné.', 'admin-table-error'));
        errorMsg.textContent = 'Chyba při načítání analytics: ' + error.message;
    }
}

async function exportAnalyticsCsv(view = 'daily') {
    const daysSelect = document.getElementById('analytics-range-days');
    const days = daysSelect ? daysSelect.value : '7';
    const errorMsg = document.getElementById('error-msg');
    const viewParam = view === 'attribution' ? '&view=attribution' : '';

    try {
        const response = await fetch(`${API_CONFIG.BASE_URL}/admin/analytics?days=${encodeURIComponent(days)}&format=csv${viewParam}`, {
            credentials: 'include'
        });

        if (!response.ok) throw new Error(`Export selhal (${response.status})`);

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = view === 'attribution'
            ? `analytics-attribution-${days}d.csv`
            : `analytics-${days}d.csv`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        errorMsg.textContent = '';
    } catch (error) {
        console.error(error);
        errorMsg.textContent = 'Analytics CSV export se nepodařil: ' + error.message;
    }
}

async function loadAngelMessages() {
    const statusSelect = document.getElementById('angel-message-status');
    const status = statusSelect ? statusSelect.value : 'pending';
    const tbody = document.querySelector('#angel-messages-table tbody');
    const errorMsg = document.getElementById('error-msg');

    if (!tbody) return;

    tbody.replaceChildren(createTableMessageRow(6, 'Načítám vzkazy...'));

    try {
        const response = await fetch(`${API_CONFIG.BASE_URL}/admin/angel-messages?status=${encodeURIComponent(status)}&limit=50`, {
            credentials: 'include'
        });

        if (response.status === 403) {
            tbody.replaceChildren(createTableMessageRow(6, 'Přístup odepřen.', 'admin-table-error'));
            return;
        }

        const data = await response.json();
        if (!data.success) throw new Error(data.error);

        renderAngelMessages(data.messages || []);
        errorMsg.textContent = '';
    } catch (error) {
        console.error(error);
        tbody.replaceChildren(createTableMessageRow(6, 'Moderaci se nepodařilo načíst.', 'admin-table-error'));
        errorMsg.textContent = 'Chyba při načítání andělských vzkazů: ' + error.message;
    }
}

function renderAngelMessages(messages) {
    const tbody = document.querySelector('#angel-messages-table tbody');
    tbody.replaceChildren();

    if (!messages || messages.length === 0) {
        tbody.appendChild(createTableMessageRow(6, 'Žádné vzkazy pro zvolený stav.'));
        return;
    }

    messages.forEach(message => {
        const tr = document.createElement('tr');
        appendCell(tr, formatDateTime(message.created_at));
        appendCell(tr, message.nickname || 'Anonym');
        appendCell(tr, formatDimension(message.category));
        appendCell(tr, message.message || '', 'admin-message-cell');
        appendCell(tr, message.approved ? 'Schváleno' : 'Čeká');

        const actionCell = document.createElement('td');
        actionCell.className = 'admin-actions-cell';
        if (message.approved) {
            actionCell.appendChild(createActionButton('Vrátit do fronty', 'unapproveAngelMessage', message.id, 'btn-demote'));
        } else {
            actionCell.appendChild(createActionButton('Schválit', 'approveAngelMessage', message.id, 'btn-promote'));
        }
        actionCell.appendChild(createActionButton('Smazat', 'deleteAngelMessage', message.id, 'btn-demote'));
        tr.appendChild(actionCell);

        tbody.appendChild(tr);
    });
}

function createActionButton(label, action, id, className) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `action-btn ${className}`;
    button.dataset.action = action;
    button.dataset.id = id;
    button.textContent = label;
    return button;
}

async function getAdminCsrfToken() {
    if (window.getCSRFToken) return window.getCSRFToken();
    const response = await fetch(`${API_CONFIG.BASE_URL}/csrf-token`, { credentials: 'include' });
    const data = await response.json();
    return data.csrfToken;
}

async function moderateAngelMessage(id, approved) {
    const errorMsg = document.getElementById('error-msg');

    try {
        const csrfToken = await getAdminCsrfToken();
        const response = await fetch(`${API_CONFIG.BASE_URL}/admin/angel-messages/${encodeURIComponent(id)}`, {
            method: 'PATCH',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': csrfToken
            },
            body: JSON.stringify({ approved })
        });

        const data = await response.json();
        if (!data.success) throw new Error(data.error);

        await loadAngelMessages();
        errorMsg.textContent = '';
    } catch (error) {
        console.error(error);
        errorMsg.textContent = 'Vzkaz se nepodařilo upravit: ' + error.message;
    }
}

async function deleteAngelMessage(id) {
    if (!confirm('Opravdu smazat tento andělský vzkaz?')) return;

    const errorMsg = document.getElementById('error-msg');

    try {
        const csrfToken = await getAdminCsrfToken();
        const response = await fetch(`${API_CONFIG.BASE_URL}/admin/angel-messages/${encodeURIComponent(id)}`, {
            method: 'DELETE',
            credentials: 'include',
            headers: { 'X-CSRF-Token': csrfToken }
        });

        const data = await response.json();
        if (!data.success) throw new Error(data.error);

        await loadAngelMessages();
        errorMsg.textContent = '';
    } catch (error) {
        console.error(error);
        errorMsg.textContent = 'Vzkaz se nepodařilo smazat: ' + error.message;
    }
}

function renderBusiness(report) {
    const summary = report.summary || {};
    const deltas = report.deltas || {};
    const userStats = report.userStats || {};
    const summaryNode = document.getElementById('business-summary');
    const metricCards = [
        ['Business score', `${formatInteger(report.score)}/100`, `Za posledních ${report.periodDays} dnů`],
        ['Návštěvníci', formatInteger(summary.visitors), formatDeltaHint(deltas.visitors, 'proti předchozímu období')],
        ['Registrace', formatInteger(summary.signups), `${formatPercent(summary.visitorToSignupRate)} visitor -> signup`],
        ['Checkouty', formatInteger(summary.checkoutStarted), `${formatPercent(summary.signupToCheckoutRate)} signup -> checkout`],
        ['Nákupy', formatInteger(summary.purchases), `${formatPercent(summary.checkoutToPurchaseRate)} checkout -> purchase`],
        ['Odhad příjmu', formatCurrency(summary.estimatedValueCzk), formatDeltaHint(deltas.estimatedValueCzk, 'proti předchozímu období')],
        ['Aktivní předplatné', formatInteger(userStats.activeSubscribers), `${formatCurrency(userStats.estimatedMrrCzk)} odhad MRR`],
        ['Noví uživatelé', formatInteger(userStats.newUsers), `${formatInteger(userStats.totalUsers)} celkem`]
    ];

    summaryNode.replaceChildren(...metricCards.map(([label, value, hint]) => createMetric(label, value, hint)));
    renderBusinessSignals(report.signals || []);
    renderBusinessActions(report.recommendedActions || []);
    renderBreakdown('business-pages', report.topPages || []);
    renderBusinessAcquisition(report.topAcquisition || []);
}

function renderBusinessSignals(signals) {
    const list = document.getElementById('business-signals');
    if (!list) return;

    list.replaceChildren();
    if (!signals.length) {
        const empty = document.createElement('li');
        empty.textContent = 'Žádné health signály.';
        list.appendChild(empty);
        return;
    }

    signals.forEach(signal => {
        const item = document.createElement('li');
        item.className = `admin-signal admin-signal--${signal.status || 'warning'}`;

        const head = document.createElement('div');
        head.className = 'admin-signal__head';

        const label = document.createElement('strong');
        label.textContent = signal.label || '-';

        const value = document.createElement('span');
        value.textContent = signal.value || '-';

        const detail = document.createElement('p');
        detail.textContent = signal.detail || '';

        const action = document.createElement('small');
        action.textContent = signal.action || '';

        head.append(label, value);
        item.append(head, detail, action);
        list.appendChild(item);
    });
}

function renderBusinessActions(actions) {
    const list = document.getElementById('business-actions');
    if (!list) return;

    list.replaceChildren();
    if (!actions.length) {
        const empty = document.createElement('li');
        empty.textContent = 'Žádné urgentní akce.';
        list.appendChild(empty);
        return;
    }

    actions.forEach(action => {
        const item = document.createElement('li');
        item.className = 'admin-action-item';

        const title = document.createElement('strong');
        title.textContent = action.title || '-';

        const meta = document.createElement('span');
        meta.textContent = `${action.owner || 'Team'} · priorita ${action.priority || '-'}`;

        const impact = document.createElement('p');
        impact.textContent = action.impact || '';

        const nextStep = document.createElement('small');
        nextStep.textContent = action.nextStep || '';

        item.append(title, meta, impact, nextStep);
        list.appendChild(item);
    });
}

function renderBusinessAcquisition(rows) {
    const tbody = document.querySelector('#business-acquisition-table tbody');
    if (!tbody) return;

    tbody.replaceChildren();
    if (!rows.length) {
        tbody.appendChild(createTableMessageRow(9, 'Zatím tu nejsou žádné akviziční segmenty.'));
        return;
    }

    rows.slice(0, 12).forEach(row => {
        const tr = document.createElement('tr');
        appendCell(tr, formatDimension(row.source));
        appendCell(tr, formatDimension(row.campaign));
        appendCell(tr, formatDimension(row.entryFeature));
        appendCell(tr, formatInteger(row.visitors));
        appendCell(tr, formatInteger(row.ctaClicks));
        appendCell(tr, formatInteger(row.signups));
        appendCell(tr, formatInteger(row.checkouts));
        appendCell(tr, formatInteger(row.purchases));
        appendCell(tr, formatPercent(row.visitorToSignupRate));
        tbody.appendChild(tr);
    });
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

function renderAnalytics(report) {
    const summary = report.summary || {};
    const feedback = summary.feedback || {};
    const feedbackValue = feedback.total
        ? `${formatInteger(feedback.yes || 0)} / ${formatInteger(feedback.no || 0)}`
        : '0 / 0';
    const feedbackHint = feedback.total
        ? `${formatInteger(feedback.total)} odpovědí, ${feedback.positiveRate ?? 0}% pozitivních`
        : 'Zatím bez odpovědí';
    const summaryNode = document.getElementById('analytics-summary');
    const metricCards = [
        ['Eventy', formatInteger(report.total), `Za posledních ${report.periodDays} dnů`],
        ['Návštěvníci', formatInteger(summary.visitors), 'Unikátní consentované clientId / userId'],
        ['Návštěvy', formatInteger(summary.visits), 'Unikátní consentované visitId'],
        ['Page views', formatInteger(summary.pageViews), 'Vlastní měření návštěv'],
        ['CTA kliky', formatInteger(summary.ctaClicks), 'Primární i kontextové výzvy'],
        ['Feedback ano/ne', feedbackValue, feedbackHint],
        ['Registrace', formatInteger(summary.signups), 'Dokončené signup eventy'],
        ['Checkouty', formatInteger(summary.checkouts), 'Zahájené platby'],
        ['Client chyby', formatInteger(summary.clientErrors), 'Frontend chyby z browseru'],
        ['Server chyby', formatInteger(summary.serverErrors), 'Backend error handler']
    ];

    summaryNode.replaceChildren(...metricCards.map(([label, value, hint]) => createMetric(label, value, hint)));

    renderBreakdown('analytics-events', Object.entries(report.byEvent || {})
        .map(([key, count]) => ({ key, count }))
        .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))
        .slice(0, 8));
    renderBreakdown('analytics-features', report.topFeatures || []);
    renderBreakdown('analytics-paths', report.topPaths || []);
    renderAnalyticsAttribution(report.attributionSegments || []);
    renderAnalyticsDaily(report.daily || []);
    renderAnalyticsErrors(report.recentErrors || []);
}

function renderAnalyticsAttribution(rows) {
    const tbody = document.querySelector('#analytics-attribution-table tbody');
    if (!tbody) return;

    tbody.replaceChildren();

    if (!rows || rows.length === 0) {
        tbody.appendChild(createTableMessageRow(12, 'Zatím tu nejsou žádné atribuční segmenty.'));
        return;
    }

    rows.forEach(row => {
        const tr = document.createElement('tr');
        appendCell(tr, formatDimension(row.source));
        appendCell(tr, formatDimension(row.campaign));
        appendCell(tr, formatDimension(row.medium));
        appendCell(tr, formatDimension(row.entryFeature));
        appendCell(tr, formatInteger(row.visitors));
        appendCell(tr, formatInteger(row.pageViews));
        appendCell(tr, formatInteger(row.ctaClicks));
        appendCell(tr, formatInteger(row.signups));
        appendCell(tr, formatInteger(row.checkouts));
        appendCell(tr, formatInteger(row.purchases));
        appendCell(tr, formatPercent(row.visitorToSignupRate));
        appendCell(tr, formatPercent(row.visitorToCheckoutRate));
        tbody.appendChild(tr);
    });
}

function renderAnalyticsDaily(rows) {
    const tbody = document.querySelector('#analytics-daily-table tbody');
    if (!tbody) return;

    tbody.replaceChildren();

    if (!rows || rows.length === 0) {
        tbody.appendChild(createTableMessageRow(9, 'Zatím tu nejsou žádná analytics data.'));
        return;
    }

    [...rows].reverse().forEach(row => {
        const tr = document.createElement('tr');
        appendCell(tr, row.date || '-');
        appendCell(tr, formatInteger(row.total));
        appendCell(tr, formatInteger(row.visitors));
        appendCell(tr, formatInteger(row.visits));
        appendCell(tr, formatInteger(row.pageViews));
        appendCell(tr, formatInteger(row.ctaClicks));
        appendCell(tr, formatInteger(row.signups));
        appendCell(tr, formatInteger(row.checkouts));
        appendCell(tr, formatInteger(row.errors));
        tbody.appendChild(tr);
    });
}

function renderAnalyticsErrors(errors) {
    const tbody = document.querySelector('#analytics-errors-table tbody');
    if (!tbody) return;

    tbody.replaceChildren();

    if (!errors || errors.length === 0) {
        tbody.appendChild(createTableMessageRow(5, 'Zatím tu nejsou žádné zachycené chyby.'));
        return;
    }

    errors.forEach(error => {
        const tr = document.createElement('tr');
        appendCell(tr, formatDateTime(error.createdAt));
        appendCell(tr, error.eventType || '-');
        appendCell(tr, formatDimension(error.feature));
        appendCell(tr, formatDimension(error.path));
        appendCell(tr, error.message || '-');
        tbody.appendChild(tr);
    });
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

function formatDeltaHint(delta = {}, label = '') {
    if (!delta || typeof delta !== 'object') return label || '';
    const deltaText = formatSignedInteger(delta.delta);
    const percentText = delta.deltaPercent == null ? 'nové období' : formatDeltaPercent(delta.deltaPercent);
    return `${deltaText} (${percentText}) ${label}`.trim();
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
