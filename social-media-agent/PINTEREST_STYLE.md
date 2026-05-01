# Pinterest Visual Workflow

Goal: Codex generates the image background, the local compositor adds all readable text.
This keeps the final pin readable and avoids AI-made pseudo-text.

## Canonical Pin Style

- Format: portrait 2:3, 1000x1500 final output.
- Background: deep navy cosmic field, `#050510`.
- Subject: one premium 3D mystical object, centered in the top 60%.
- Materials: gold, crystal, obsidian, pearl, silver, subtle nebula/stardust.
- Text area: bottom 40% must stay dark, low-detail, and clean.
- Text: no text in the AI image. All title, CTA, URL, and brand text comes from `pinterest_compositor.py`.
- Avoid: people, cards, UI, frames, borders, readable letters, words, fake logos, watermark.

## Codex Image Prompt Wrapper

Use this wrapper around the slug-specific image idea:

```text
Use case: stylized-concept
Asset type: Pinterest pin background for Mysticka Hvezda.
Primary request: <slug-specific mystical object scene>
Style/medium: premium 3D CGI icon-art, polished, high contrast, spiritual but clean.
Scene/backdrop: deep navy cosmic starfield background (#050510), subtle nebula, fine stardust.
Composition/framing: portrait 2:3. One main object centered in the top 60%. Bottom 40% is clean dark negative space for a text overlay.
Lighting/mood: soft gold rim light, violet ambient glow, calm premium mystic mood.
Constraints: background image only; no readable text, no alphabet letters, no UI, no watermark, no logo, no people, no frame, no border.
Avoid: clutter, low contrast, text-like artifacts, busy bottom area.
```

## Local Production Steps

1. Generate or choose the background image for a slug.
2. Save it as `social-media-agent/output/pinterest/inbox/<slug>.png`.
3. Run:

```bash
python pinterest_batch.py --compose
python pinterest_batch.py --csv
python pinterest_audit.py --live
```

4. Upload only when the audit has no `fail` items. A warning for apex HTTPS can be ignored for `www` links, but it should still be fixed in Railway/DNS.

## Current Style Notes

- The visual direction is strong enough for Pinterest: high contrast, clear CTA, brand present, and readable title.
- The biggest weakness is AI background text artifacts, especially on numerology pins.
- For future pins, ask Codex for object-only backgrounds. The local compositor should remain the only source of readable text.

## Tool Campaign Workflow

Blog pins are useful for SEO support, but tool pins are higher impact because they send users directly into interactive pages.

Current tool campaign data lives in:

```text
pinterest_tool_campaigns.json
```

Generate tool prompts:

```bash
python pinterest_batch.py --tool-prompts
```

Generate fallback backgrounds when no AI images are ready:

```bash
python pinterest_tool_backgrounds.py
```

Then compose and export:

```bash
python pinterest_batch.py --compose
python pinterest_batch.py --csv
python pinterest_audit.py
```

Every tool pin should keep `utm_source=pinterest`, `utm_medium=organic`, and a campaign-specific `utm_campaign` so traffic can be measured against signup and paywall events.
