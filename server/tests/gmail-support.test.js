import { jest } from '@jest/globals';
import {
    createSupportDraftReply,
    decodeBase64Url,
    encodeBase64Url,
    extractPlainTextFromPayload,
    getGmailSupportStatus,
    selectReplyContext
} from '../services/gmail-support.js';

function createMessage({
    id,
    threadId = 'thread-1',
    from,
    to = 'support@mystickahvezda.cz',
    subject = 'Pomoc s uctem',
    body = 'Dobry den, potrebuji pomoc.',
    messageId = `<${id}@example.com>`,
    internalDate = '1781720000000'
}) {
    return {
        id,
        threadId,
        internalDate,
        snippet: body.slice(0, 80),
        payload: {
            mimeType: 'text/plain',
            headers: [
                { name: 'From', value: from },
                { name: 'To', value: to },
                { name: 'Subject', value: subject },
                { name: 'Message-ID', value: messageId }
            ],
            body: {
                data: encodeBase64Url(body)
            }
        }
    };
}

describe('Gmail support service', () => {
    test('reports missing OAuth settings without exposing secrets', () => {
        const status = getGmailSupportStatus({
            SUPPORT_EMAIL: 'support@mystickahvezda.cz',
            GMAIL_CLIENT_SECRET: 'top-secret-value'
        });

        expect(status.configured).toBe(false);
        expect(status.missing).toEqual([
            'GMAIL_CLIENT_ID',
            'GMAIL_REFRESH_TOKEN'
        ]);
        expect(status.supportEmail).toBe('support@mystickahvezda.cz');
        expect(JSON.stringify(status)).not.toContain('top-secret-value');
    });

    test('extracts plain text from a Gmail payload', () => {
        const payload = {
            mimeType: 'multipart/alternative',
            parts: [
                {
                    mimeType: 'text/html',
                    body: { data: encodeBase64Url('<p>Fallback</p>') }
                },
                {
                    mimeType: 'text/plain',
                    body: { data: encodeBase64Url('Plain support message') }
                }
            ]
        };

        expect(extractPlainTextFromPayload(payload)).toBe('Plain support message');
    });

    test('selects the latest non-support sender as reply target', () => {
        const messages = [
            createMessage({ id: 'm1', from: 'Customer <customer@example.com>' }),
            createMessage({
                id: 'm2',
                from: 'support@mystickahvezda.cz',
                to: 'customer@example.com',
                body: 'Uz jsme odpovedeli.'
            }),
            createMessage({
                id: 'm3',
                from: 'Customer <customer@example.com>',
                body: 'Jeste jeden dotaz.',
                messageId: '<customer-followup@example.com>'
            })
        ];

        const context = selectReplyContext(messages, 'support@mystickahvezda.cz');

        expect(context.to).toBe('customer@example.com');
        expect(context.inReplyTo).toBe('<customer-followup@example.com>');
        expect(context.subject).toBe('Pomoc s uctem');
    });

    test('creates a Gmail draft reply without sending it', async () => {
        const threadGet = jest.fn().mockResolvedValue({
            data: {
                id: 'thread-1',
                messages: [
                    createMessage({
                        id: 'm1',
                        from: 'Customer <customer@example.com>',
                        messageId: '<customer-original@example.com>'
                    })
                ]
            }
        });
        const draftCreate = jest.fn().mockResolvedValue({
            data: {
                id: 'draft-1',
                message: { id: 'draft-message-1' }
            }
        });
        const gmailClient = {
            users: {
                threads: { get: threadGet },
                drafts: { create: draftCreate }
            }
        };

        const result = await createSupportDraftReply({
            threadId: 'thread-1',
            body: 'Dobry den,\n\npredplatne jsem zkontroloval.'
        }, {
            gmailClient,
            env: {
                GMAIL_SUPPORT_EMAIL: 'support@mystickahvezda.cz'
            }
        });

        expect(result).toEqual({
            draftId: 'draft-1',
            messageId: 'draft-message-1',
            threadId: 'thread-1',
            to: 'customer@example.com',
            subject: 'Re: Pomoc s uctem'
        });
        expect(threadGet).toHaveBeenCalledWith({
            userId: 'me',
            id: 'thread-1',
            format: 'full'
        });
        expect(draftCreate).toHaveBeenCalledTimes(1);

        const payload = draftCreate.mock.calls[0][0];
        expect(payload.userId).toBe('me');
        expect(payload.requestBody.message.threadId).toBe('thread-1');

        const raw = decodeBase64Url(payload.requestBody.message.raw);
        expect(raw).toContain('To: customer@example.com');
        expect(raw).toContain('From: support@mystickahvezda.cz');
        expect(raw).toContain('Subject: Re: Pomoc s uctem');
        expect(raw).toContain('In-Reply-To: <customer-original@example.com>');
        expect(raw).toContain('Dobry den,');
    });
});
