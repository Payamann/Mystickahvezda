# Email operations

Goal: people can write to `support@mystickahvezda.cz`, transactional emails can be sent from the app, and replies go to a real inbox.

## Current project decision

2026-06-18: Treat Resend as the app transactional email sender, not as the primary mailbox. Finish a real mailbox for `support@mystickahvezda.cz` through Google Workspace, Zoho, Fastmail, or another mailbox provider, then keep app emails on Resend with `Reply-To: support@mystickahvezda.cz`.

2026-06-18 registration QA found Supabase Auth returning `over_email_send_rate_limit` after signup attempts. Registration now creates confirmed Supabase users by default and does not require a Supabase confirmation email. Set `AUTH_REQUIRE_EMAIL_VERIFICATION=true` only if custom SMTP is configured and email confirmation is intentionally re-enabled.

2026-06-18 support cockpit: the admin app can read the Google Workspace support inbox and create Gmail draft replies for `support@mystickahvezda.cz`. It does not send replies automatically; every response must be reviewed and sent manually in Gmail.

## Runtime env

Set these in production:

```env
RESEND_API_KEY=re_...
FROM_EMAIL=Mysticka Hvezda <noreply@mystickahvezda.cz>
SUPPORT_EMAIL=support@mystickahvezda.cz
REPLY_TO_EMAIL=support@mystickahvezda.cz
ADMIN_EMAIL=real-team-inbox@example.com
```

If Google Workspace/Gmail should be visible in the admin support cockpit, also set:

```env
GMAIL_SUPPORT_EMAIL=support@mystickahvezda.cz
GMAIL_CLIENT_ID=...
GMAIL_CLIENT_SECRET=...
GMAIL_REFRESH_TOKEN=...
GMAIL_REDIRECT_URI=...
GMAIL_USER_ID=me
```

Required Gmail OAuth scopes:

```text
https://www.googleapis.com/auth/gmail.readonly
https://www.googleapis.com/auth/gmail.compose
```

Use a refresh token for the `support@mystickahvezda.cz` mailbox. `gmail.compose` is enough for draft creation; do not grant `gmail.send` unless the product explicitly adds manual send controls later.

## Gmail support cockpit setup

1. In Google Cloud, enable the Gmail API for the project used by Mysticka Hvezda.
2. Create an OAuth client for a web app or desktop app.
3. Authorize the `support@mystickahvezda.cz` mailbox with the two scopes above and request offline access.
4. Store the resulting refresh token and OAuth client values in Railway.
5. Open `/admin.html` and use the Support inbox panel to confirm `configured: true`.

If Google Workspace later supports domain-wide delegation for this mailbox, keep the same admin endpoints but replace the OAuth refresh-token client with delegated service-account auth.

If Resend receives inbound mail for the root domain, also set:

```env
RESEND_WEBHOOK_SECRET=whsec_...
SUPPORT_FORWARD_EMAIL=real-team-inbox@example.com
INBOUND_FORWARD_FROM=Mysticka Hvezda <noreply@mystickahvezda.cz>
```

`SUPPORT_FORWARD_EMAIL` must be a real mailbox outside `mystickahvezda.cz` unless `ALLOW_SAME_DOMAIN_SUPPORT_FORWARD=true` is intentionally set. Forwarding Resend inbound mail back to the same root domain can create a mail loop.

## Recommended setup: real support mailbox

Use this if `support@mystickahvezda.cz` is a mailbox at Active24, Google Workspace, Seznam, or another normal mail provider.

1. Create/verify the mailbox `support@mystickahvezda.cz`.
2. Point root-domain MX records to that mailbox provider only.
3. Keep Resend for outbound app emails.
4. Keep `REPLY_TO_EMAIL=support@mystickahvezda.cz`.

Current DNS has a higher-priority MX to `inbound-smtp.eu-west-1.amazonaws.com`, then Active24 MX records. If Active24 is meant to receive support mail, remove or lower the AWS/Resend inbound MX so it does not intercept normal user emails.

## Alternative setup: Resend inbound forwarding

Use this if Resend should receive all mail sent to `support@mystickahvezda.cz`.

1. In Resend, enable Receiving for the domain.
2. In Resend Webhooks, create a webhook:

```text
URL: https://www.mystickahvezda.cz/webhook/resend
Event: email.received
```

3. Copy the webhook signing secret to Railway as `RESEND_WEBHOOK_SECRET`.
4. Set `SUPPORT_FORWARD_EMAIL` to the real internal mailbox where support should read messages.
5. Send a real test email to `support@mystickahvezda.cz` and confirm it arrives in `SUPPORT_FORWARD_EMAIL`.

The app verifies the Resend webhook signature and uses `emails.receiving.forward()` to forward the original email with content and attachments preserved.

## DNS checklist

There must be only one SPF TXT record for `mystickahvezda.cz`. If Resend and the current mailbox provider both send mail, merge both includes into one record, for example:

```text
v=spf1 a mx include:_spf.websupport.cz include:amazonses.com -all
```

The subdomain `send.mystickahvezda.cz` is already configured for Resend SPF/MX. If you keep outbound mail on that subdomain instead of the root domain, use:

```env
FROM_EMAIL=Mysticka Hvezda <noreply@send.mystickahvezda.cz>
INBOUND_FORWARD_FROM=Mysticka Hvezda <noreply@send.mystickahvezda.cz>
```

Keep `REPLY_TO_EMAIL=support@mystickahvezda.cz` so users reply to the public support address, not to the sending subdomain.

Keep the Resend DKIM TXT record:

```text
resend._domainkey.mystickahvezda.cz
```

Keep DMARC, but after SPF/DKIM are confirmed, review whether `p=quarantine` is appropriate:

```text
_dmarc.mystickahvezda.cz TXT "v=DMARC1; p=quarantine"
```

## Smoke test

1. Send an app email and verify the recipient sees `Reply-To: support@mystickahvezda.cz`.
2. Reply to that email and confirm the reply reaches the real team inbox.
3. Send a fresh email directly to `support@mystickahvezda.cz`.
4. Submit the website contact form and confirm the admin notification reaches `ADMIN_EMAIL` or `SUPPORT_FORWARD_EMAIL`.
5. Open `/admin.html`, confirm the Support inbox panel shows Gmail as active, open a thread, create a draft, then verify the draft appears in Gmail and is not sent automatically.
