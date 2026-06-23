import { google } from 'googleapis';

export const GMAIL_SUPPORT_SCOPES = Object.freeze([
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.compose'
]);

const DEFAULT_SUPPORT_EMAIL = 'support@mystickahvezda.cz';
const DEFAULT_THREAD_QUERY = 'in:inbox newer_than:30d';
const DEFAULT_USER_ID = 'me';
const MAX_THREAD_LIMIT = 25;
const MAX_QUERY_LENGTH = 300;
const MAX_DRAFT_BODY_LENGTH = 20000;
const MAX_MESSAGE_BODY_LENGTH = 6000;
const HEADER_NAMES = [
    'From',
    'To',
    'Cc',
    'Subject',
    'Date',
    'Message-ID',
    'In-Reply-To',
    'References'
];

export function getGmailSupportConfig(env = process.env) {
    return {
        clientId: env.GMAIL_CLIENT_ID || '',
        clientSecret: env.GMAIL_CLIENT_SECRET || '',
        refreshToken: env.GMAIL_REFRESH_TOKEN || '',
        redirectUri: env.GMAIL_REDIRECT_URI || '',
        supportEmail: env.GMAIL_SUPPORT_EMAIL || env.SUPPORT_EMAIL || DEFAULT_SUPPORT_EMAIL,
        userId: env.GMAIL_USER_ID || DEFAULT_USER_ID
    };
}

function getMissingConfig(config) {
    return [
        ['GMAIL_CLIENT_ID', config.clientId],
        ['GMAIL_CLIENT_SECRET', config.clientSecret],
        ['GMAIL_REFRESH_TOKEN', config.refreshToken]
    ].filter(([, value]) => !value).map(([key]) => key);
}

export function getGmailSupportStatus(env = process.env) {
    const config = getGmailSupportConfig(env);
    const missing = getMissingConfig(config);

    return {
        configured: missing.length === 0,
        missing,
        supportEmail: config.supportEmail,
        userId: config.userId,
        scopes: [...GMAIL_SUPPORT_SCOPES]
    };
}

function createHttpError(message, status = 400, code = 'GMAIL_SUPPORT_ERROR') {
    const error = new Error(message);
    error.status = status;
    error.code = code;
    return error;
}

function createGmailClient(env = process.env) {
    const config = getGmailSupportConfig(env);
    const missing = getMissingConfig(config);

    if (missing.length > 0) {
        throw createHttpError(
            `Gmail support is not configured. Missing: ${missing.join(', ')}`,
            503,
            'GMAIL_SUPPORT_NOT_CONFIGURED'
        );
    }

    const auth = new google.auth.OAuth2(
        config.clientId,
        config.clientSecret,
        config.redirectUri || undefined
    );
    auth.setCredentials({ refresh_token: config.refreshToken });

    return google.gmail({ version: 'v1', auth });
}

function getClient(options = {}) {
    return options.gmailClient || createGmailClient(options.env);
}

function getUserId(options = {}) {
    return getGmailSupportConfig(options.env).userId;
}

function getSupportEmail(options = {}) {
    return getGmailSupportConfig(options.env).supportEmail;
}

function normalizeThreadLimit(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return 10;
    return Math.min(MAX_THREAD_LIMIT, Math.max(1, Math.trunc(parsed)));
}

function normalizeQuery(value) {
    if (typeof value !== 'string') return DEFAULT_THREAD_QUERY;
    const trimmed = value.trim();
    if (!trimmed) return DEFAULT_THREAD_QUERY;
    return trimmed.slice(0, MAX_QUERY_LENGTH);
}

function normalizeThreadId(threadId) {
    if (typeof threadId !== 'string' || !threadId.trim()) {
        throw createHttpError('threadId is required.', 400, 'GMAIL_THREAD_ID_REQUIRED');
    }
    return threadId.trim();
}

function normalizeDraftBody(body) {
    if (typeof body !== 'string' || !body.trim()) {
        throw createHttpError('Draft body is required.', 400, 'GMAIL_DRAFT_BODY_REQUIRED');
    }
    return body.trim().slice(0, MAX_DRAFT_BODY_LENGTH);
}

function getHeader(headers = [], name) {
    const found = headers.find(header => header.name?.toLowerCase() === name.toLowerCase());
    return found?.value || '';
}

function safeHeaderValue(value) {
    return String(value || '').replace(/[\r\n]+/g, ' ').trim();
}

function truncateText(value, maxLength = MAX_MESSAGE_BODY_LENGTH) {
    if (!value || value.length <= maxLength) return value || '';
    return `${value.slice(0, maxLength - 1)}...`;
}

export function encodeBase64Url(value) {
    return Buffer.from(value, 'utf8')
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/g, '');
}

export function decodeBase64Url(value = '') {
    const normalized = String(value).replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    return Buffer.from(padded, 'base64').toString('utf8');
}

function encodeHeaderText(value) {
    const normalized = safeHeaderValue(value);
    if (/^[\x20-\x7E]*$/.test(normalized)) return normalized;
    return `=?UTF-8?B?${Buffer.from(normalized, 'utf8').toString('base64')}?=`;
}

function ensureReplySubject(subject) {
    const normalized = safeHeaderValue(subject) || 'Support';
    return /^re:/i.test(normalized) ? normalized : `Re: ${normalized}`;
}

export function buildReplyMime({
    to,
    from,
    subject,
    body,
    inReplyTo = '',
    references = ''
}) {
    const headers = [
        `To: ${safeHeaderValue(to)}`,
        `From: ${safeHeaderValue(from)}`,
        `Subject: ${encodeHeaderText(ensureReplySubject(subject))}`
    ];

    if (inReplyTo) headers.push(`In-Reply-To: ${safeHeaderValue(inReplyTo)}`);
    if (references) headers.push(`References: ${safeHeaderValue(references)}`);

    headers.push(
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset="UTF-8"',
        'Content-Transfer-Encoding: 8bit'
    );

    return `${headers.join('\r\n')}\r\n\r\n${String(body || '').trim()}\r\n`;
}

function extractEmailAddress(value = '') {
    const bracketMatch = String(value).match(/<([^<>@\s]+@[^<>@\s]+)>/);
    if (bracketMatch) return bracketMatch[1].toLowerCase();

    const directMatch = String(value).match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    return directMatch ? directMatch[0].toLowerCase() : '';
}

function isSupportSender(message, supportEmail) {
    const from = extractEmailAddress(message.from);
    return from && from === String(supportEmail || '').toLowerCase();
}

function normalizeInternalDate(value) {
    const timestamp = Number(value);
    if (!Number.isFinite(timestamp)) return null;
    return new Date(timestamp).toISOString();
}

function stripHtml(html = '') {
    return html
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

function collectPayloadBodies(payload, targetMimeType, output = []) {
    if (!payload) return output;

    if (payload.mimeType === targetMimeType && payload.body?.data) {
        output.push(decodeBase64Url(payload.body.data));
    }

    for (const part of payload.parts || []) {
        collectPayloadBodies(part, targetMimeType, output);
    }

    return output;
}

export function extractPlainTextFromPayload(payload) {
    const textParts = collectPayloadBodies(payload, 'text/plain');
    if (textParts.length > 0) {
        return truncateText(textParts.join('\n\n').trim());
    }

    const htmlParts = collectPayloadBodies(payload, 'text/html');
    if (htmlParts.length > 0) {
        return truncateText(stripHtml(htmlParts.join('\n\n')));
    }

    return '';
}

function normalizeMessage(message, { includeBody = false } = {}) {
    const headers = message.payload?.headers || [];
    const normalized = {
        id: message.id,
        threadId: message.threadId,
        internalDate: normalizeInternalDate(message.internalDate),
        snippet: message.snippet || '',
        from: getHeader(headers, 'From'),
        to: getHeader(headers, 'To'),
        cc: getHeader(headers, 'Cc'),
        subject: getHeader(headers, 'Subject'),
        date: getHeader(headers, 'Date'),
        messageId: getHeader(headers, 'Message-ID'),
        inReplyTo: getHeader(headers, 'In-Reply-To'),
        references: getHeader(headers, 'References')
    };

    if (includeBody) {
        normalized.body = extractPlainTextFromPayload(message.payload);
    }

    return normalized;
}

function getLatestMessage(messages = []) {
    return messages.length > 0 ? messages[messages.length - 1] : null;
}

export function selectReplyContext(messages = [], supportEmail = DEFAULT_SUPPORT_EMAIL) {
    const normalizedMessages = messages.map(message => normalizeMessage(message, { includeBody: true }));
    const latestExternal = [...normalizedMessages].reverse()
        .find(message => !isSupportSender(message, supportEmail));

    if (!latestExternal) {
        throw createHttpError('No external customer message found in this thread.', 400, 'GMAIL_NO_REPLY_TARGET');
    }

    const firstSubject = normalizedMessages.find(message => message.subject)?.subject || latestExternal.subject || 'Support';
    const references = [latestExternal.references, latestExternal.messageId].filter(Boolean).join(' ').trim();

    return {
        to: extractEmailAddress(latestExternal.from) || latestExternal.from,
        subject: firstSubject,
        inReplyTo: latestExternal.messageId,
        references,
        latestExternal
    };
}

function summarizeThread(thread) {
    const messages = thread.messages || [];
    const normalizedMessages = messages.map(message => normalizeMessage(message));
    const latest = getLatestMessage(normalizedMessages);
    const firstWithSubject = normalizedMessages.find(message => message.subject);

    return {
        id: thread.id,
        historyId: thread.historyId,
        messageCount: messages.length,
        subject: firstWithSubject?.subject || latest?.subject || '',
        snippet: latest?.snippet || thread.snippet || '',
        lastInternalDate: latest?.internalDate || null,
        latestMessage: latest
    };
}

export async function listRecentSupportThreads({ limit = 10, query = DEFAULT_THREAD_QUERY } = {}, options = {}) {
    const gmail = getClient(options);
    const userId = getUserId(options);
    const maxResults = normalizeThreadLimit(limit);
    const q = normalizeQuery(query);

    const listResponse = await gmail.users.threads.list({
        userId,
        q,
        maxResults
    });

    const refs = listResponse.data.threads || [];
    const threads = await Promise.all(refs.map(async threadRef => {
        const threadResponse = await gmail.users.threads.get({
            userId,
            id: threadRef.id,
            format: 'metadata',
            metadataHeaders: HEADER_NAMES
        });
        return summarizeThread(threadResponse.data);
    }));

    return {
        query: q,
        limit: maxResults,
        resultSizeEstimate: listResponse.data.resultSizeEstimate || threads.length,
        threads
    };
}

export async function getSupportThread(threadId, options = {}) {
    const gmail = getClient(options);
    const userId = getUserId(options);
    const id = normalizeThreadId(threadId);

    const threadResponse = await gmail.users.threads.get({
        userId,
        id,
        format: 'full'
    });

    const thread = threadResponse.data;
    const messages = (thread.messages || []).map(message => normalizeMessage(message, { includeBody: true }));

    return {
        id: thread.id,
        historyId: thread.historyId,
        messageCount: messages.length,
        subject: messages.find(message => message.subject)?.subject || '',
        messages
    };
}

export async function createSupportDraftReply({ threadId, body }, options = {}) {
    const gmail = getClient(options);
    const userId = getUserId(options);
    const supportEmail = getSupportEmail(options);
    const id = normalizeThreadId(threadId);
    const draftBody = normalizeDraftBody(body);

    const threadResponse = await gmail.users.threads.get({
        userId,
        id,
        format: 'full'
    });

    const messages = threadResponse.data.messages || [];
    const replyContext = selectReplyContext(messages, supportEmail);
    const mime = buildReplyMime({
        to: replyContext.to,
        from: supportEmail,
        subject: replyContext.subject,
        body: draftBody,
        inReplyTo: replyContext.inReplyTo,
        references: replyContext.references
    });

    const createResponse = await gmail.users.drafts.create({
        userId,
        requestBody: {
            message: {
                threadId: id,
                raw: encodeBase64Url(mime)
            }
        }
    });

    return {
        draftId: createResponse.data.id,
        messageId: createResponse.data.message?.id || null,
        threadId: id,
        to: replyContext.to,
        subject: ensureReplySubject(replyContext.subject)
    };
}
