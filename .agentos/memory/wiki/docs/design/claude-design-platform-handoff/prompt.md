---
slug: docs/design/claude-design-platform-handoff/prompt
title: Prompt
tags: [docs, auto-indexed]
archived: false
valid_from: 2026-06-16
---
# Prompt

Source: `docs/design/claude-design-platform-handoff/prompt.md` (excerpt; secrets redacted).

## Excerpt

# Build Prompt

Create a premium SaaS/product-studio landing site inspired by the rendered runtime capture of Platform at `https://plat-form.framer.ai/`.

Use the local handoff bundle as design evidence:

- `DESIGN.md`
- `raw/gallery.json`
- `raw/manifest.json`
- `screenshots/`
- `assets/`
- `derived/`

The goal is not to copy the original source. Recreate the design direction with original implementation code and semantic component names.

## Product Feel

The website should feel like a modern automation/platform company:

- polished
- technical
- confident
- editorial
- conversion-focused
- warm enough to feel human

It should not feel like a secret military dashboard, spy board, or control-room UI.

## Required Pages Or Sections

Build a complete base landing experience with:

1. Floating navigation with product identity and primary CTA.
2. Hero section with clear product promise, supporting paragraph, and two CTAs.
3. Metrics/proof row.
4. Feature bento grid.
5. Work/gallery section showing actual website references or portfolio-like cards.
6. Process section.
7. Services or pricing cards.
8. Labs/articles grid.
9. Testimonials or social proof.
10. Contact/footer section with legal/social links.

## Visual System

Use:

- dark charcoal base
- warm accent color
- clean white text hierarchy
- soft borders
- compact cards with 8px or smaller radius
- strong spacing
- real image/asset surfaces from the handoff only as reference unless rights are confirmed

## Motion System

Add a restrained but premium motion layer:

- hero load-in choreography
- staggered card reveals
- scroll-triggered section reveals
- subtle CTA hover lift
- sticky/floating nav behavior
- optional velocity or marquee accent band
- mobile-specific layout and motion behavior

Use semantic motion names:

- `hero_intro_sequence`
- `floating_navigation`
- `scroll_reveal_section`
- `animated_feature_card`
- `sticky_story_panel`
- `primary_cta_hover`
- `gallery_card_reveal`

Avoid generated labels like:

- `framer-abc123`
- `div-wrapper-9`
- `section div div div`

## Asset Handling

Use the retrieved assets as reference material and internal placeholders only. If this becomes public-facing, replace unlicensed assets with owned or generated equivalents.

Important local reference folders:

- `assets/` for retrieved images and SVGs.
- `screenshots/` for actual visual hierarchy.
- `derived/` for s

## Related

- [[index]]
- [[areas/repo-layout]]
