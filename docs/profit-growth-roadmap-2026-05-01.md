# Profit Growth Roadmap - 2026-05-01

Mandate: grow profit, not just ship features. The near-term strategy is to turn existing high-intent traffic into registered users, first-value moments, and paid upgrades.

## Current Read

- Technical crawl health is good: local site audit passes.
- Checkout E2E is stable: pricing and payment tests pass.
- The app already has broad product value: tarot, horoscopes, numerology, natal chart, partner match, runes, crystal ball, past life, lunar tools, mentor.
- The biggest leak is likely not missing functionality. It is users arriving with a specific intent, seeing a paywall or pricing page, and leaving before a second value moment.

## Changes Shipped In This Session

1. Pricing recovery path for paywall traffic
   - `cenik.html` now keeps the paid recommendation, but also offers a relevant free preview when the visitor came from a specific feature.
   - Example: numerology paywall -> pricing -> "open numerology free preview" instead of only "show paid plan".
   - New first-party funnel events: `pricing_recommendation_clicked`, `pricing_preview_clicked`.

2. Tarot free-tool SEO/CRO cluster
   - `tarot-zdarma.html` now has an intent router for:
     - Tarot ANO/NE
     - Karta dne
     - 3-card reading
     - Angel cards
   - This strengthens internal links around high-intent queries and reduces choice friction.

3. Checkout cancel recovery
   - Stripe cancel URLs now preserve plan, source, and feature context.
   - `cenik.html?payment=cancel` renders a recovery panel instead of relying only on a toast.
   - The panel can route the visitor back to the selected plan, to the relevant free preview, or to a lower-commitment one-time yearly horoscope offer.

4. Tarot landing attribution
   - Legacy CTA links on `tarot-zdarma.html` now carry `source=tarot_free_landing` and feature context.
   - This keeps SEO traffic attributable when visitors move from the landing page into live tools.

5. Life-number calculator monetization bridge
   - `kalkulacka-cisla-osudu.html` now routes intent after the free calculation into full numerology, partner match, yearly horoscope, or personal map.
   - Result CTA now preserves `source=life_number_result` and `feature=numerologie_vyklad`.
   - Date validation no longer hard-codes 2025, so the tool stays current in 2026 and beyond.

6. Partner-match result bridge
   - `partnerska-shoda.html` now has a trust strip before calculation, FAQ schema, and visible FAQ content.
   - After a free compatibility result, visitors see a four-path bridge: full relationship analysis, natal chart, relationship tarot, or mentor question.
   - Premium CTA preserves `source=partner_match_result` and `feature=partnerska_detail`, and sends public funnel events for paywall view/click.

7. Tarot ANO/NE conversion bridge
   - `tarot-ano-ne.html` now has a trust strip, visible FAQ content, and FAQ schema for high-intent search visitors.
   - After the free one-card answer, visitors see a contextual bridge into Premium, one-card tarot, three-card tarot, or angel cards.
   - Premium CTA preserves `source=tarot_yes_no_result` and `feature=tarot_multi_card`, and sends public funnel events for paywall view/click.

8. Consent banner conversion friction
   - The global cookie banner is more compact and now marks the root scroll container while visible.
   - `tarot-ano-ne.html` listens for the banner and keeps result actions above it on mobile, so first-value CTAs remain reachable before consent is saved.
   - Added E2E coverage for the mobile result + cookie-banner overlap case.

9. Tarot daily-card SEO entry
   - Added `tarot-karta-dne.html` as a dedicated landing page for the "tarot karta dne zdarma" intent.
   - The page links into the existing tarot tool with `source=tarot_daily_card_landing`, preserves FAQ schema, and routes users to ANO/NE, three-card tarot, angel cards, or Premium.
   - `tarot-zdarma.html` and the header dropdown now point daily-card visitors to this focused entry page instead of a generic tarot jump.

## External Market Signals

- eTarot ranks around a broad free tarot hub with clear sub-intents: one-card reading, daily card, monthly card, annual card. Source: https://etarot.cz/
- Muj-horoskop positions "karta dne" as free, Czech, no registration, and daily. Source: https://muj-horoskop.cz/tarot-vyklady/karta-dne
- Horoskopy.cz is a strong daily-horoscope habit competitor. Source: https://www.horoskopy.cz/
- Najdise has entrenched free card-reading demand and long informational text. Source: https://vyklad-karet.najdise.cz/

## Profit Priorities

### P0 - This Week

1. Measure paywall recovery
   - Watch `sourceFeatureSegments` in admin funnel.
   - Key question: after `pricing_preview_clicked`, do users return to a tool and later hit `paywall_cta_clicked` again?
   - If yes, make preview recovery a pattern across more paid entry points.

2. Add checkout-cancel recovery on `cenik.html?payment=cancel`
   - Shipped: the page now renders a compact recovery module with the chosen plan, relevant preview, and one-time yearly horoscope fallback.
   - Next iteration: test an email reminder capture only if checkout cancel volume is large enough.

3. Strengthen the 4 highest-intent free pages
   - `tarot-zdarma.html`
   - `tarot-ano-ne.html`
   - `kalkulacka-cisla-osudu.html`
   - `partnerska-shoda.html`
   - Shipped for all four: intent routing/contextual bridge, paid attribution, and trust/FAQ support where the page needed it.
   - Next iteration: compare tool-completion -> paywall-view rates by `source` before adding more free-page variants.

### P1 - Next 14 Days

1. Build free-tool landing clusters
   - Tarot cluster: ANO/NE, karta dne, 3 karty, keltsky kriz, vyklad na lasku.
   - Shipped: ANO/NE, tarot zdarma hub, and karta dne.
   - Remaining: focused pages for 3-card tarot, Celtic Cross, and love tarot.
   - Numerology cluster: cislo osudu, osobni rok 2026, partnerska numerologie, vyznam data narozeni.
   - Horoscope cluster: denni, tydenni, mesicni, rocni, znameni-specific internal links.

2. Create onboarding email sequence tied to first interest
   - Day 0: result recap + next best free tool.
   - Day 1: deeper value + saved history.
   - Day 3: Premium reason tied to original feature.
   - Day 6: one-time product offer for users who do not subscribe.

3. Add social-to-tool landing discipline
   - Every Pinterest/TikTok/Instagram post should map to exactly one URL and one first action.
   - Avoid sending social traffic to generic homepage unless the post is brand-level.

### P2 - 30 Days

1. Programmatic SEO expansion
   - Daily horoscope by sign is already present. Extend the same architecture to:
     - tarot card meanings
     - angel card meanings
     - numerology numbers
     - compatibility pair pages
   - Quality gate: each generated page must link to a live interactive tool and a next paid step.

2. Launch low-budget acquisition loops
   - Pinterest: daily card, lunar phase, zodiac mini-guides.
   - Short-form video: one specific question -> one tool URL.
   - Newsletter swaps with Czech wellness/spirituality creators.
   - Affiliate/referral only after conversion tracking is clean.

3. Product monetization experiments
   - One-time "personal yearly map" offer after free numerology or natal chart.
   - Premium annual discount after 2 repeat tool sessions.
   - Save offer after checkout cancel.

## Metrics To Watch

- Visitor -> signup by source.
- Signup -> first tool completion.
- First tool completion -> paywall view.
- Paywall view -> pricing view.
- Pricing view -> checkout start.
- Checkout start -> purchase.
- Pricing view -> preview recovery -> later checkout start.
- Revenue by source + feature, not only global revenue.

## Decision Rule

Prioritize work that improves one of these:

1. More high-intent visitors arrive.
2. More visitors get a personal result before leaving.
3. More paywall viewers reach checkout.
4. More checkout abandoners return to a lower-friction offer.

Avoid building net-new mystical features until the existing high-intent tools have cleaner acquisition, activation, and monetization loops.
