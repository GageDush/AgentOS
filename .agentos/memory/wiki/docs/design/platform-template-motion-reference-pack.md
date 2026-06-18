---
slug: docs/design/platform-template-motion-reference-pack
title: Platform Template Motion Reference Pack
tags: [docs, auto-indexed]
archived: false
valid_from: 2026-06-16
---
# Platform Template Motion Reference Pack

Source: `docs/design/platform-template-motion-reference-pack.md` (excerpt; secrets redacted).

## Excerpt

# Platform Template Motion Reference Pack

## Template Read

Your `Platform` landing page already has a strong baseline:

- dark charcoal foundation
- warm orange accent
- particle-wave hero canvas
- masked hover button treatment
- animated stat counters
- character-based intro text reveal
- product grid with floating 3D assets

That means the best additions are not "more effects everywhere."
The right move is to layer in a few high-quality interactions that deepen the existing tone:

- stronger landing animation
- smoother section-to-section scroll reveals
- one or two proximity effects
- a tasteful loader
- richer product-card motion

## Best-Fit Motion References

### 1. Hero landing choreography

Best source:

- Framer animation examples: [framer.com/blog/website-animation-examples](https://www.framer.com/blog/website-animation-examples/)

Why it fits:

- Your template already opens with a canvas-backed hero.
- Framer’s best examples lean on staged entrances, subtle background motion, and layered copy reveals instead of a giant one-shot gimmick.

What to borrow:

- headline lines entering in sequence
- CTA and proof stats fading in a beat later
- background motion already alive before text settles
- one secondary object drifting or rotating very slowly in the hero

### 2. Scroll reveal for copy blocks

Best source:

- React Bits Scroll Reveal: [reactbits.dev/text-animations/scroll-reveal](https://reactbits.dev/text-animations/scroll-reveal)

Why it fits:

- Your intro section already hints at text-based reveal behavior.
- This complements your premium SaaS tone without turning every section into a circus.

What to use it for:

- intro statement
- section openers
- feature headlines
- testimonial pull quotes

Avoid:

- applying it to long paragraphs
- revealing every single text block on the page

### 3. Proximity-based headline or nav treatment

Best source:

- React Bits Variable Proximity: [reactbits.dev/text-animations/variable-proximity](https://reactbits.dev/text-animations/variable-proximity)

Why it fits:

- You specifically like proximity motion.
- This effect feels modern and playful when used once or twice, especially with your orange-on-dark palette.

Best placements:

- hero eyebrow or slogan
- nav labels on desktop
- feature category labels
- footer callout text

Do not use it on:

- body copy
- pricing tables
- forms

### 4. Scroll-velocity

## Related

- [[index]]
- [[areas/repo-layout]]
