# Audit Hardening Handoff - 2026-04-30

This note tracks the production handoff for the April security, privacy,
performance, SEO and trust audit pass. It is intentionally operational: code
changes are in the diff, and this file lists what must be verified before and
after deploy.

## Implemented scope

- Sensitive one-time purchase inputs are no longer stored in Stripe metadata.
  Checkout flows now store birth/order inputs in `one_time_order_inputs` and
  pass only sanitized metadata to Stripe.
- Database hardening was added for purchase inputs, one-time purchases, funnel
  events, email tables and push subscriptions through RLS policies.
- Production startup now fails fast when required Stripe or Supabase secrets are
  missing instead of running in a partially broken state.
- API responses default to `Cache-Control: no-store`, with explicit exceptions
  only where public cache is intentional.
- Service worker caching avoids HTML shells, respects `no-store`/private
  responses and precaches local font assets.
- Public HTML pages no longer load Google Fonts directly; local font CSS is used
  instead.
- DOMPurify and lucide CDN includes are guarded by pinned versions, SRI,
  `crossorigin` and `referrerpolicy`.
- Direct public HTML GA/GTM snippets were removed from audited pages; analytics
  must go through the consent-managed app loader.
- Unbacked rating/review schema and missing hreflang targets were removed.
- Pricing, privacy and terms copy was tightened around AI-symbolic outputs,
  payments, card handling, retention and cancellation expectations.
- Premium gates were tightened for tarot summary and daily wisdom endpoints.
- Regression tests were added or updated for the security/privacy paths, service
  worker behavior, data retention and premium gating.
- Site structure audit now checks direct GTM loaders, CDN integrity attributes,
  hreflang target existence and public Google Fonts usage.

## Required deploy steps

1. Apply database migration:
   `migrations/20260429_privacy_security_hardening.sql`
2. Confirm production env variables before restart:
   `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`,
   `STRIPE_WEBHOOK_SECRET`, `ONE_TIME_ORDER_RETENTION_DAYS`.
3. Rebuild static assets with `npm run build:js`.
4. Deploy application code and the generated `service-worker.js` together.
5. Run production smoke verification:
   `npm run verify:production`
6. In Stripe dashboard, verify successful webhooks for one-time purchases after
   first live test checkout.

## Post-deploy smoke paths

- `/cenik.html` - pricing copy, checkout CTA and no fake guarantees.
- `/tarot.html` - premium tarot summary returns 402 for non-premium multi-card
  requests and works for premium users.
- `/osobni-mapa.html` and `/rocni-horoskop.html` - checkout creation succeeds
  without sensitive metadata in Stripe.
- `/service-worker.js` - cache name matches the local build and no stale HTML
  shell is served.
- Browser devtools network check - no `fonts.googleapis.com` or
  `fonts.gstatic.com` requests from public pages.
- Supabase - `one_time_order_inputs` rows are created before checkout and marked
  fulfilled after webhook processing.

## Rollback notes

- If one-time purchase fulfillment fails after deploy, first check the database
  migration and Supabase service role access. The webhook still has a legacy
  sanitized metadata fallback, but live checkout should rely on
  `one_time_order_inputs`.
- If users report stale pages, ask them to refresh once after service worker
  update, then verify `service-worker.js` cache name in production.
- If CDN script integrity fails, update the pinned URL and SRI hash together.

## Remaining backlog after this audit pass

- Add production monitoring alerts for failed Stripe webhooks and unexpected
  402/500 spikes on premium endpoints.
- Add a scheduled database retention job in production infrastructure if it is
  not already wired to `server/jobs/data-retention.js`.
- Run a real Lighthouse/WebPageTest pass on production after deploy. Local tests
  verify structure and regressions, not CDN edge timing.
- Review conversion impact of pricing/trust copy after several days of analytics
  data; avoid changing price packaging before measuring.
- Add deeper load testing for checkout creation, premium AI endpoints and
  horoscope cache hot paths.
- Continue CRO work on onboarding, upgrade modals and cancellation/retention
  flows as a separate product iteration.
