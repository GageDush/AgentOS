# Platform Website Design Brief

## Source

Original website: https://plat-form.framer.ai/

Rendered runtime capture ID: `2471ff31-3882-47b1-8c8b-f5069861a0ad`

## What Was Retrieved

- Rendered HTML captures for 17 pages.
- Above-fold, full-page, and mobile screenshots.
- 176 gallery asset records, including logos, icons, 3D cube imagery, product/device imagery, and screenshot-inferred surfaces.
- 37 animation records.
- 148 motion protocol records.
- Contact signals:
  - `hello@platform.nl`
  - `privacy@platform.com`
  - `dpo@platform.com`
  - `+31 20 832-4455`
  - LinkedIn, X, Instagram, YouTube links.

## Platform And Hosting Read

Detected software profile:

- Framer-style generated runtime.
- React/Next-style rendered site.
- Framerusercontent asset CDN.

Best hosting fit:

- Vercel or Netlify.

Reason:

- The captured site is animation-heavy, marketing-focused, and asset-driven.
- It benefits from strong static asset delivery, preview deploys, and clean routing for multi-page marketing content.

## Visual Direction

The site reads as a premium modular SaaS/automation landing page:

- Dark, restrained base.
- Warm accent moments.
- Clean editorial spacing.
- Floating navigation and sticky/fixed runtime surfaces.
- Hero-first composition with strong above-the-fold clarity.
- Productized content sections supported by bento/cards, labs/article pages, and conversion sections.

Keep the visual language confident and polished. Avoid making it feel like a control room, military board, or secret operations dashboard. It should feel like a modern product studio website with technical depth.

## Core Page Structure

Recommended structure for a recreated version:

1. Floating nav with product identity, page links, and primary CTA.
2. Hero with concise value statement, visual system cue, and two CTAs.
3. Proof/metrics strip.
4. Feature bento grid with animated cards.
5. Work/gallery section showing actual websites or scraped references.
6. Process section with clear sequence.
7. Services/pricing cards.
8. Labs or insights grid.
9. Testimonials or trust section.
10. Contact/footer section with social and legal links.

## Asset Roles

Use the retrieved assets as evidence for these roles:

- `assets/framerusercontent_com/assets/*.svg` - logo and brand marks.
- `assets/framerusercontent_com/images/*` - 3D cube visuals, product images, device imagery, icons, article thumbnails.
- `screenshots/*above_fold.png` - page composition references.
- `screenshots/*full_page.png` - section sequencing references.
- `screenshots/*mobile.png` - responsive layout references.
- `derived/*.txt` - non-direct SVG/canvas/inferred visual records.

## Motion Direction

Preserve the feel, not generated class names.

Expected motion protocols:

- Initial load entrance on hero/nav/logo elements.
- Scroll-triggered reveals for section cards.
- Sticky/fixed navigation and selected storytelling surfaces.
- Hover lift or visual state change on CTAs/cards.
- Framer-style component variant swaps where useful.
- Mobile behavior should be handled separately instead of simply shrinking desktop.

Suggested recreation stack:

- CSS transitions for simple hover states.
- Motion/Framer Motion for entrance and scroll reveal.
- GSAP only for complex scroll timing.
- Use original implementation code only as evidence, not as copied source.

## Gallery Interpretation

The generated gallery groups this scrape into:

- Actual Websites: rendered pages and screenshots.
- Case Studies: notable full-page layout captures.
- Icons: SVG/logo/small vector assets.
- Animations: detected runtime transitions.
- Motion Protocols: reusable descriptions for scroll, sticky, hover, and entrance behavior.
- Asset Gallery: raw retrieved asset files.

## Manual Review Needed

- Verify which assets are legally reusable before public release.
- Review animation labels before using them as final design-system names.
- Review social links from the source site before treating them as real brand links.
- Loading screens were not directly detected in this scrape, so loader direction should be newly designed.

## Build Guidance

Build as a refined product-site experience, not as a raw clone. Preserve:

- Visual hierarchy.
- CTA route intent.
- Sticky/fixed navigation affordances.
- Mobile layout behavior.
- Section timing relationships.
- Premium asset density.

Avoid:

- Copying generated Framer class names.
- Copying proprietary source code.
- Reusing retrieved imagery publicly without rights review.
- Turning the interface into an over-branded internal ops board.
