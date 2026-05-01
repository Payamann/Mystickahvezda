# Pinterest dominance system

Last updated: 2026-05-02

## Goal

Use Pinterest as an evergreen visual discovery engine, not as a generic social feed.

The primary business goal is to send users directly into interactive tools where they can get value immediately and then encounter a natural upgrade path.

## Highest-impact targets

Tool pins should be prioritized over generic blog pins because they land users inside a conversion-capable experience.

1. `/tarot-ano-ne.html`
2. `/tarot-karta-dne.html`
3. `/tarot-laska.html`
4. `/numerologie.html`
5. `/partnerska-shoda.html`
6. `/lunace.html`
7. `/andelske-karty.html`
8. `/natalni-karta.html`
9. `/kristalova-koule.html`
10. `/runy.html`

## Production model

Each tool campaign has:

- one reusable visual background
- five hook variants
- one board mapping
- one description
- one keyword set
- UTM-tagged destination links

This turns 10 tool pages into 50 scheduled pins without creating 50 separate visual concepts.

## Workflow

```bash
cd social-media-agent
python pinterest_batch.py --tool-prompts
python pinterest_tool_backgrounds.py
python pinterest_batch.py --compose
python pinterest_batch.py --csv
python pinterest_audit.py
```

For higher-quality visuals, replace files in:

```text
social-media-agent/output/pinterest/inbox/<slug>.png
```

Then rerun:

```bash
python pinterest_batch.py --compose
python pinterest_batch.py --csv
python pinterest_audit.py
```

## Measurement

Every tool campaign link uses:

```text
utm_source=pinterest
utm_medium=organic
utm_campaign=<tool_cluster>
utm_content=<slug>_v<variant>
```

This lets us compare:

- tool cluster performance
- hook performance
- save/click ratio
- downstream signup and paywall clicks

## Weekly operating cadence

- Monday: publish/export next 21 pins.
- Wednesday: review top saves and outbound clicks.
- Friday: generate 10 new hook variants for the best two URLs.
- Monthly: retire weak hooks and create new visual backgrounds for winners.

## Next strategic upgrade

Add shareable result images inside the product:

- tarot card result image
- tarot yes/no answer image
- numerology life-number image
- compatibility score image
- lunar phase ritual image

These should include a subtle brand mark and a direct save/share action. This would turn users into distribution, not just traffic.
