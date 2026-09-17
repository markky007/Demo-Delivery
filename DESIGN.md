---
version: alpha
name: Apple
description: A quintessentially minimalist, product-forward system built on Apple's SF Pro type family and generous whitespace. Surfaces stay near-white with a translucent, blurred sticky navigation bar, letting large display headlines and photographic hero content carry the page. Text defaults to a soft near-black ink, with a single confident blue accent reserved for links and pill-shaped call-to-action buttons.
colors:
  primary: '#0071E3'
  primary-link: '#0066CC'
  primary-on-dark: '#2997FF'
  ink: '#1D1D1F'
  ink-strong: '#000000'
  body: '#414143'
  muted: '#6E6E73'
  muted-light: '#86868B'
  surface: '#FFFFFF'
  surface-subtle: '#FAFAFC'
  surface-footer: '#F5F5F7'
  surface-alt: '#E8E8ED'
  hairline: '#D2D2D7'
  accent-warm: '#B64400'
typography:
  hero-display:
    fontFamily: Inter, LINE Seed Sans TH, Prompt, sans-serif
    fontSize: 56px
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: 0px
  display-md:
    fontFamily: Inter, LINE Seed Sans TH, Prompt, sans-serif
    fontSize: 28px
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: 0px
  title-lead:
    fontFamily: Inter, LINE Seed Sans TH, Prompt, sans-serif
    fontSize: 22px
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: 0px
  body-lg:
    fontFamily: Inter, LINE Seed Sans TH, Prompt, sans-serif
    fontSize: 17px
    fontWeight: 500
    lineHeight: 1.45
    letterSpacing: 0px
  body-lg-strong:
    fontFamily: Inter, LINE Seed Sans TH, Prompt, sans-serif
    fontSize: 17px
    fontWeight: 600
    lineHeight: 1.45
    letterSpacing: 0px
  body:
    fontFamily: Inter, LINE Seed Sans TH, Prompt, sans-serif
    fontSize: 15px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0px
  body-strong:
    fontFamily: Inter, LINE Seed Sans TH, Prompt, sans-serif
    fontSize: 15px
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: 0px
  caption:
    fontFamily: Inter, LINE Seed Sans TH, Prompt, sans-serif
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: 0.12px
  caption-strong:
    fontFamily: Inter, LINE Seed Sans TH, Prompt, sans-serif
    fontSize: 12px
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: 0.12px
  nav-link:
    fontFamily: Inter, LINE Seed Sans TH, Prompt, sans-serif
    fontSize: 13px
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: 0px
rounded:
  sm: 8px
  md: 11px
  lg: 18px
  xl: 28px
  pill: 980px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 20px
  xl: 24px
  2xl: 28px
  gutter: 18px
  section: 44px
components:
  navbar:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.ink}'
    height: 44px
    borderColor: '{colors.ink}'
    borderWidth: 0px
    position: fixed
  nav-link:
    typography: '{typography.nav-link}'
  footer:
    backgroundColor: '{colors.surface-footer}'
    textColor: '{colors.ink-strong}'
    height: 1028px
    columns: '5'
    position: relative
  footer-link:
    textColor: '{colors.ink-strong}'
    typography: '{typography.caption}'
  button-primary:
    backgroundColor: '{colors.primary}'
    textColor: '{colors.surface}'
    typography: '{typography.body-lg}'
    rounded: '{rounded.pill}'
    padding: 8px 16px
  button-secondary:
    backgroundColor: '{colors.surface-alt}'
    textColor: '{colors.ink}'
    rounded: '{rounded.pill}'
    padding: 8px 16px
  link:
    textColor: '{colors.primary-link}'
    typography: '{typography.body-lg}'
  card:
    backgroundColor: '{colors.surface-subtle}'
    textColor: '{colors.ink}'
    rounded: '{rounded.xl}'
    boxShadow: rgba(0, 0, 0, 0.08) 2px 4px 12px 0px
  input:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.ink}'
    borderColor: '{colors.hairline}'
    borderWidth: 1px
    rounded: '{rounded.md}'
    typography: '{typography.body-lg}'
  badge:
    backgroundColor: '{colors.accent-warm}'
    textColor: '{colors.surface}'
    typography: '{typography.caption-strong}'
    rounded: '{rounded.pill}'
---

# Apple

## Overview

Apple's system is the reference implementation of product-forward minimalism: near-white surfaces, generous whitespace, and a single confident accent, all engineered to disappear so that large display headlines and photographic hero content carry the page. The personality is calm, premium, and mainstream-aspirational — short declarative headlines ("Surprise and shine.", "College, sorted.") sit above glossy product renders, and the UI chrome deliberately recedes.

Density is low and rhythmic. Sections are full-bleed tonal blocks — white, light gray, and pure black — that stack to create separation without any structural chrome. Hierarchy is built almost entirely from **type scale and weight contrast** (a 56px/800 hero against 17px/400 body) plus tonal panel changes, not from borders, shadows, or color. The one splash of color, **Action Blue** (`{colors.primary}` — #0071E3), is rationed to interactive elements only.

The result reads as editorial rather than app-like: pill-shaped CTAs, a translucent blurred sticky navigation bar, and photographic imagery supplying the only real sense of depth.

**Key Characteristics:**

- Two-typeface system: **SF Pro Display** for large headlines, **SF Pro Text** for everything ≤21px
- Only three font weights in play — 400, 600, and 800 (weight 500 is deliberately absent)
- Near-white surface ladder (`{colors.surface}`, `{colors.surface-subtle}`, `{colors.surface-footer}`, `{colors.surface-alt}`) creates depth through tone, not shadow
- Blue is reserved strictly for links and CTAs; body text is a soft near-black ink
- Pill-shaped buttons (`{rounded.pill}` — 980px) are the universal CTA shape
- Translucent, backdrop-blurred sticky nav bar at 44px height
- Full-bleed tonal section blocks including high-contrast black panels
- Tight, negative letter-spacing on body text; large headlines pull even tighter (-1.568px)

## Colors

The palette is disciplined and near-monochrome: a stack of near-white surfaces, a soft near-black ink family for text, and exactly one blue accent reserved for interaction. There are no gradients in the UI chrome — the only gradient-like dimensionality comes from product photography itself.

### Brand & Accent

- **Action Blue** (`{colors.primary}` — #0071E3): the confident CTA and interactive fill. Observed 42 interactive uses and zero as text or surface — reserve it strictly for filled buttons and interactive affordances.
- **Link Blue** (`{colors.primary-link}` — #0066CC): a slightly deeper blue used specifically for text links against light surfaces.
- **Blue on Dark** (`{colors.primary-on-dark}` — #2997FF): the brighter link blue used on black/dark panels for contrast.
- **Warm Rust** (`{colors.accent-warm}` — #B64400): a rare warm accent used for badges/marketing labels only (15 uses across 3 pages).

### Text (Ink)

- **Primary Ink** (`{colors.ink}` — #1D1D1F): the default soft near-black for headlines and body copy — the single most-used color on the site.
- **True Black** (`{colors.ink-strong}` — #000000): reserved for maximum-contrast contexts including footer text and black panels.
- **Body Gray** (`{colors.body}` — #414143): secondary body copy.
- **Muted** (`{colors.muted}` — #6E6E73) and **Muted Light** (`{colors.muted-light}` — #86868B): captions, disclaimers, and de-emphasized supporting text.

### Surface

- **Pure White** (`{colors.surface}` — #FFFFFF): the base canvas and nav background.
- **Subtle** (`{colors.surface-subtle}` — #FAFAFC): card fills and faintly-off-white section blocks.
- **Footer Gray** (`{colors.surface-footer}` — #F5F5F7): the footer panel and alternating light-gray section blocks.
- **Alt Gray** (`{colors.surface-alt}` — #E8E8ED): secondary button fill and denser surface tint.

### Hairlines & Borders

- **Hairline** (`{colors.hairline}` — #D2D2D7): the 1px rule for input borders and dividers. Observed almost entirely in interactive/border roles — reserve it for borders, not fills.

No dark-mode token block is defined. The site does use full-bleed black panels as a design device (via `{colors.ink-strong}` surfaces and `{colors.primary-on-dark}` links), but there is no systematic light/dark theme — treat black panels as a per-section styling choice, not a global theme toggle.

## Typography

The system implements a bilingual, Thai-first and Latin-precision typography stack. Latin characters, display headlines, and high-precision numbers use **Inter**; Thai characters render seamlessly through **LINE Seed Sans TH** (with **Prompt** and Apple system font fallbacks); receipts and order codes use **JetBrains Mono** with tabular numeric alignment.

### Font Family Stack

- **Primary Sans (Display & Body)**: `'Inter', 'LINE Seed Sans TH', 'Prompt', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Sukhumvit Set', sans-serif`
- **Monospace (Receipts / Codes / POS)**: `'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`

### Hierarchy & Scale

| Token                         | Size      | Weight | Line Height | Letter Spacing | Thai-Safe Guideline                                |
| ----------------------------- | --------- | ------ | ----------- | -------------- | -------------------------------------------------- |
| `{typography.hero-display}`   | 36px / 56px | 700 / 800 | 1.20      | normal / 0     | Hero banners and primary dashboard metrics         |
| `{typography.display-md}`     | 28px      | 600    | 1.25        | normal / 0     | Main section titles (`.text-h3`, `.type-h1`)       |
| `{typography.title-lead}`     | 22px      | 600    | 1.30        | normal / 0     | Card headings / category headers (`.type-h2`)      |
| `{typography.body-lg}`        | 17px      | 500/600| 1.45        | normal / 0     | Primary buttons, navigation, highlights            |
| `{typography.body}`           | 15px      | 400    | 1.50        | normal / 0     | Food item titles, descriptions, standard reading   |
| `{typography.body-sm}`        | 13px      | 400    | 1.45        | normal / 0     | Secondary metadata, customer notes, options        |
| `{typography.caption}`        | 12px      | 500    | 1.40        | 0.01em         | Status badges, tags, timestamps                    |
| `{typography.mono}`           | 13px–15px | 500/600| 1.40        | 0              | Order IDs, receipt line items, tabular currency    |

### Principles & Thai Typography Rules

- **Zero Negative Tracking on Thai Text:** Never apply negative `letter-spacing` to Thai text blocks; negative tracking causes Thai tone marks (วรรณยุกต์: ่, ้, ๊, ๋) and upper/lower vowels (สระบน/ล่าง: ิ, ี, ึ, ื, ุ, ู) to collide or clip.
- **Generous Line-Heights for Diacritics:** Body line-height must stay at `1.45–1.50` to accommodate multiple vertical diacritic tiers in Thai without vertical truncation.
- **Tabular Numerics for Finance & POS:** All currency values (฿), queue codes, and receipt quantities must apply `.tabular-nums` (`font-variant-numeric: tabular-nums`) so that numbers align consistently in columns.
- **Font Sizing Stability:** `font-size-adjust: from-font` is applied to root text to eliminate layout shifts (CLS) when web fonts swap from system fallbacks.

## Layout

### Spacing System

The spacing scale is an effectively 4px-based ladder: `{spacing.xs}` (4px), `{spacing.sm}` (8px), `{spacing.md}` (16px), `{spacing.lg}` (20px), `{spacing.xl}` (24px), `{spacing.2xl}` (28px), plus a `{spacing.gutter}` (18px) for grid gaps and a large `{spacing.section}` (44px) for vertical section rhythm. 8px and 4px are by far the most frequently observed increments; 28px anchors mid-scale block padding.

### Grid & Container

The home and marketing pages are centered single-column hero sections that give way to a two-column product tile grid (Mac mini / MacBook Air / MacBook Pro / iPad Pro). The Store page shifts to a denser horizontal-scroll carousel of product and accessory cards with consistent internal padding and small forward-arrow affordances. Column gaps track the `{spacing.gutter}` (18px) value. The footer is a **5-column** link layout (`{components.footer}` columns: 5). On mobile all multi-column grids collapse to a single stacked column while preserving section order.

### Whitespace Philosophy

Whitespace is the primary compositional tool. Generous vertical breathing room around hero headlines and product renders is what signals premium restraint — sections are separated by empty space and tonal panel changes rather than rules or shadows. Let content float in the negative space; don't tighten the vertical rhythm to fit more in.

## Elevation & Depth

| Level        | Treatment                                          | Use                                                                            |
| ------------ | -------------------------------------------------- | ------------------------------------------------------------------------------ |
| Base         | Flat tonal panel — no shadow                       | Full-bleed sections alternating white / `{colors.surface-footer}` gray / black |
| Nav          | Translucent surface + backdrop blur                | Sticky header: `saturate(1.8) blur(20px)` over `{colors.surface}`              |
| Card         | Single soft shadow `rgba(0,0,0,0.08) 2px 4px 12px` | `{components.card}` on Store/product tiles                                     |
| Photographic | Depth from imagery itself                          | Glossy product renders with soft gradients supply dimensionality               |

**Shadow philosophy.** Elevation comes from surface change, not shadows. Section separation is achieved by stacking flat tonal blocks — white, light gray, and pure black — while the UI chrome stays resolutely flat. The one exception is the card token (`{components.card}`), which carries a single low-opacity shadow (8% black, 12px blur) on the denser Store carousels. The sticky nav earns its depth from a saturate+blur backdrop filter rather than a drop shadow. Everywhere else, the only illusion of dimension comes from the product photography.

## Shapes

### Border Radius Scale

| Token            | Value | Use                                 |
| ---------------- | ----- | ----------------------------------- |
| `{rounded.sm}`   | 8px   | Small controls, subtle rounding     |
| `{rounded.md}`   | 11px  | Input fields (`{components.input}`) |
| `{rounded.lg}`   | 18px  | Medium containers                   |
| `{rounded.xl}`   | 28px  | Cards (`{components.card}`)         |
| `{rounded.pill}` | 980px | All buttons, badges — full pill     |

The geometry is soft and confident. Buttons and badges are fully pill-shaped via `{rounded.pill}` (980px), which is the dominant radius signature across the system (observed 88 times on 7 pages). Content containers use progressively larger corner radii — 8px through 28px — with cards landing at the generous `{rounded.xl}` (28px). Circular (50%) shapes appear for avatars and icon buttons in the evidence. There are no sharp/zero-radius interactive elements; the pill CTA and rounded card are the two shape motifs a builder must get right.

## Components

### Navigation

**`navbar`** — A fixed (`{components.navbar}` position: fixed) 44px-tall bar on a `{colors.surface}` white background with `{colors.ink}` text. Its defining trait is a translucent backdrop filter (`saturate(1.8) blur(20px)`) — content scrolls beneath a frosted-glass bar rather than a solid one. Border width is 0px (no visible hairline rule). Nav links use `{typography.nav-link}` — 12px, weight 600, line-height 1, tight -0.12px tracking. The header carries **no CTA button** (`hasCtaButton: false`); it's a pure navigation and search/bag row.

### Buttons

**`button-primary`** — The signature filled CTA: `{colors.primary}` (Action Blue) fill, `{colors.surface}` white text, `{typography.body-lg}` label, fully pill-shaped (`{rounded.pill}`), padded 8px 16px. Use for the single primary action per section.

**`button-secondary`** — Lower-emphasis pill on `{colors.surface-alt}` (#E8E8ED) fill with `{colors.ink}` text, same pill shape and 8px 16px padding. Pairs with the primary for secondary actions (e.g. "Learn more" next to "Buy").

**`link`** — Inline text link in `{colors.primary-link}` (#0066CC) using `{typography.body-lg}`; on dark panels this shifts to `{colors.primary-on-dark}` (#2997FF). Frequently paired with a chevron affordance.

### Cards & Containers

**`card`** — Product/Store tile on `{colors.surface-subtle}` (#FAFAFC) fill with `{colors.ink}` text, generous `{rounded.xl}` (28px) corners, and a single soft shadow `rgba(0,0,0,0.08) 2px 4px 12px`. This is the only routinely-shadowed surface in the system; it appears on the Store carousels and product grids.

### Inputs & Forms

**`input`** — White `{colors.surface}` field with a 1px `{colors.hairline}` (#D2D2D7) border, `{rounded.md}` (11px) corners, and `{typography.body-lg}` text in `{colors.ink}`. The hairline border is the only visible framing — no fill tint or shadow.

### Badges & Chips

**`badge`** — Small pill in `{colors.accent-warm}` (#B64400 Warm Rust) with `{colors.surface}` white text and `{typography.caption-strong}` (12px/600). Fully pill-shaped via `{rounded.pill}`. Used sparingly for marketing labels like "New."

### Footer

**`footer`** — A tall (1028px observed) relative-positioned panel on `{colors.surface-footer}` (#F5F5F7) with `{colors.ink-strong}` (#000000) text. Organized into **5 link columns** holding ~75 links. Footer links use `{components.footer-link}` — `{colors.ink-strong}` text at `{typography.caption}` (12px/400, note: lighter weight than the 600 nav links). Legal/disclaimer text sits at the bottom in the same small caption treatment. No CTA button in the footer.

## Do's and Don'ts

### Do

- **Do** reserve `{colors.primary}` (#0071E3) strictly for interactive fills — evidence shows 42 interactive uses and zero as text or surface.
- **Do** use `{colors.primary-link}` (#0066CC) for text links on light surfaces and switch to `{colors.primary-on-dark}` (#2997FF) on black panels.
- **Do** keep the two-typeface split — `{typography.hero-display}` in SF Pro Display, body in SF Pro Text — and never add a third family.
- **Do** limit weights to 400, 600, and 800 (the only cuts observed); reserve 800 for `{typography.hero-display}`.
- **Do** make all CTAs and badges fully pill-shaped with `{rounded.pill}` (980px).
- **Do** create section separation with flat tonal panels (`{colors.surface}` / `{colors.surface-footer}` / `{colors.ink-strong}`), not shadows.
- **Do** reserve `{colors.hairline}` (#D2D2D7) for 1px borders and dividers, not fills.

### Don't

- **Don't** introduce weight 500 (medium) — it is deliberately absent from the ladder.
- **Don't** apply Action Blue (`{colors.primary}`) to body text or backgrounds.
- **Don't** add drop shadows to nav or buttons; the only shadowed surface is `{components.card}` at 8% opacity.
- **Don't** put a CTA button in the header or footer — neither carries one (`hasCtaButton: false`).
- **Don't** use the Warm Rust `{colors.accent-warm}` (#B64400) for anything but rare marketing badges.
- **Don't** tighten the generous vertical whitespace to increase density — the breathing room is the brand.
- **Don't** frame content blocks with visible borders; use tonal fields and photographic edges instead.

## Responsive Behavior

This is a **two-viewport analysis** (desktop and mobile captures); no intermediate breakpoint pixel values were measured, so exact breakpoints are unknown.

What the evidence shows: on desktop, hero sections are centered single columns that transition into a two-column product tile grid, and the Store page uses horizontal-scroll carousels. On mobile, all multi-column grids collapse to a **single stacked column**, preserving the same section order and pill buttons while tightening vertical rhythm and scaling images down. The footer's 5-column link layout similarly reflows on mobile.

Touch targets are supported by the pill button padding (8px 16px) and the 44px fixed nav height — 44px aligns with a standard comfortable touch target. Buttons and nav links retain their `{typography.nav-link}` and `{typography.body-lg}` sizing across viewports.

## Iteration Guide

1. **Reference tokens, never hex.** Edit `{colors.primary}` once to reshade every CTA; never hardcode #0071E3 in a component.
2. **Keep the weight ceiling at three.** New type styles must reuse 400, 600, or 800 — adding 500 or 700 breaks the deliberate ladder.
3. **Preserve the two-family split.** Display sizes (≥28px) belong to SF Pro Display; everything at reading size to SF Pro Text. Don't introduce a third face.
4. **Blue is interaction-only.** Any new accent color must not compete with `{colors.primary}` / `{colors.primary-link}`; text stays in the ink/muted family.
5. **Depth = surface, not shadow.** Build new sections from the tonal surface ladder (`{colors.surface}` → `{colors.surface-footer}` → `{colors.ink-strong}`); only `{components.card}` may carry its 8% shadow.
6. **Pills for actions, rounded-xl for cards.** New buttons/badges take `{rounded.pill}`; new content containers take `{rounded.xl}` or smaller radii from the scale.
7. **Unbreakable boundaries:** 44px fixed blurred nav with no CTA, generous whitespace, and near-white surfaces. Don't add a header button or compress the vertical rhythm.

## Known Gaps

- **Nav link color dropped.** The token `colors.nav-link` (#333336) and its reference in `components.nav-link.textColor` were dropped because the exact color wasn't confirmed in grounding; nav links are rendered here via `{colors.ink}`. Actual nav link color may be a slightly lighter #333336.
- **Avatar / circle radius unverified.** `rounded.circle` (9999px) and `components.avatar.rounded` were dropped — circular avatar treatment is inferred from 50% radii in evidence but not tokenized.
- **Hover, focus, and active states not captured.** Static screenshots can't show button hover shades, link underlines on hover, or focus rings — these must be inferred.
- **Animation and transitions unknown.** Apple's signature scroll-driven and hover animations are not represented in the evidence.
- **Two-viewport responsive only.** No tablet/intermediate breakpoints were measured; exact breakpoint pixels are unknown.
- **Auth-walled/checkout surfaces not reached.** Cart, sign-in, and configurator flows behind the Store CTAs were not captured, so their component styling is unverified.
- **Some off-palette colors observed** (e.g. #00FF00, #5E7EAF, #2D2A45) appear tied to product imagery or one-off marketing content rather than the system palette and were excluded.
