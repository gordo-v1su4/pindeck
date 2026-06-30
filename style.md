# Pindeck UI Style Guide

This document is a designer-facing snapshot of Pindeck's current visual system. It is meant to help a UI/UX designer understand what the app looks and feels like today: fonts, colors, highlights, buttons, menus, fields, chips, tables, drawers, motion, and the boundaries that keep the product feeling like Pindeck.

Source of truth for this snapshot:

- `src/index.css`
- `src/lib/pdTheme.ts`
- `src/components/pd/TweaksPanel.tsx`
- `src/components/ui/pindeck/PinBtn.tsx`
- `src/components/ui/pindeck/PinChip.tsx`
- `src/App.tsx`
- `src/components/pd/TableView.tsx`
- `src/components/pd/ImageDetailDrawer.tsx`
- `src/components/deck/DeckComposer.tsx`

## Product Feel

Pindeck is a dark, compact, image-first creative library. The interface should feel like a focused production tool rather than a marketing site: dense, precise, low-glare, slightly cinematic, and built for repeated scanning.

Use:

- Dark neutral surfaces with thin translucent dividers.
- Small type, compact controls, and tight vertical rhythm.
- Accent color only for active states, selected states, CTAs, links, and high-signal status.
- Glass only for floating panels, drawers, modals, and menus.
- Image thumbnails and palettes as the strongest visual content.
- Small radii, restrained shadows, and quick hover feedback.

Avoid:

- Bright white cards or large white panels.
- Oversized rounded SaaS cards.
- Decorative gradient blobs, bokeh, or marketing-style hero layouts inside the app.
- Heavy borders, loud shadows, or glossy buttons.
- Large body text in tool surfaces.
- Default browser-blue focus rings.

## Foundations

### Color Tokens

```css
:root {
  --pd-accent: #3a7bff;
  --pd-accent-ink: #c7ddff;
  --pd-accent-soft: rgba(58, 123, 255, 0.14);
  --pd-accent-hover: #2447b8;
  --pd-accent-contrast-text: #ffffff;

  --pd-bg: #08080a;
  --pd-bg-1: #0c0c0f;
  --pd-bg-2: #101014;
  --pd-panel: #0b0b0e;
  --pd-panel-2: #111116;

  --pd-ink: #c9ccd1;
  --pd-ink-dim: rgba(238, 240, 242, 0.62);
  --pd-ink-mute: rgba(238, 240, 242, 0.56);
  --pd-ink-faint: rgba(238, 240, 242, 0.3);

  --pd-line: rgba(255, 255, 255, 0.055);
  --pd-line-strong: rgba(255, 255, 255, 0.09);
  --pd-line-hi: rgba(255, 255, 255, 0.14);

  --pd-amber: #f5a524;
  --pd-cyan: #22b8cf;
  --pd-magenta: #d946ef;
  --pd-green: #2ee6a6;
  --pd-red: #ef4343;
}
```

Color roles:

- `--pd-bg`: full app background.
- `--pd-bg-1`: sidebar, topbar, and structural rails.
- `--pd-bg-2`: slightly raised dark surfaces.
- `--pd-panel`: deep panels and modal bodies.
- `--pd-line`: normal separators.
- `--pd-line-strong`: input and button borders.
- `--pd-line-hi`: hover borders and stronger emphasis.
- `--pd-ink`: primary readable text.
- `--pd-ink-dim`: secondary text and inactive controls.
- `--pd-ink-mute`: tertiary text.
- `--pd-ink-faint`: metadata, hints, empty states, and separators.

### Accent System

Default accent is Pindeck blue:

```css
--pd-accent: #3a7bff;
```

Accent is user-tweakable. Current swatches:

| Name | Hex |
| --- | --- |
| Indigo | `#3a7bff` |
| Cobalt | `#5b8def` |
| Cyan | `#22b8cf` |
| Amber | `#f5a524` |
| Red | `#ef4343` |
| Magenta | `#d946ef` |
| Mint | `#2ee6a6` |
| Violet | `#a855f7` |

Derived accent colors:

- `--pd-accent-ink`: accent blended toward pale cool white for readable text on dark UI.
- `--pd-accent-soft`: accent at about 14% opacity for active/selected fills.
- `--pd-accent-hover`: darkened accent for solid hover states.
- `--pd-accent-contrast-text`: white unless the accent is light enough to need near-black text.

Use solid accent sparingly. Most UI states should use `--pd-accent-soft` plus `--pd-accent-ink`.

### Typography

Current default stacks:

```css
:root {
  --pd-font-sans: "Geist", "Inter", ui-sans-serif, system-ui, sans-serif;
  --pd-font-mono: "Geist Mono", "JetBrains Mono", ui-monospace, monospace;
  --pd-font-display: "Archivo Narrow", "Archivo", "Geist", sans-serif;
}
```

Runtime typography presets:

| Id | Sans | Mono |
| --- | --- | --- |
| `geist` | `"Geist", sans-serif` | `"Geist Mono", monospace` |
| `inter` | `"Inter", sans-serif` | `"JetBrains Mono", monospace` |
| `archivo` | `"Archivo", sans-serif` | `"DM Mono", monospace` |
| `space` | `"Space Grotesk", sans-serif` | `"JetBrains Mono", monospace` |

Type scale:

| Use | Size | Weight | Notes |
| --- | --- | --- | --- |
| App body | `13px` | 400 | Line height around `1.45`. |
| Primary controls | `12px` | 500 | Buttons, tabs, topbar controls. |
| Secondary controls | `11px` to `11.5px` | 400-500 | Sidebar rows, filter rows. |
| Metadata labels | `9.5px` to `10px` | 500-600 | Mono, uppercase, letter-spaced. |
| Chips | `10.5px` | 500 | Compact and readable. |
| Dialog titles | `12px` to `14px` | 600 | Tight, not hero-like. |
| Table text | `11.5px` | 400-600 | Dense scanning view. |

Rules:

- Use sans for normal interface text.
- Use mono for labels, counters, IDs, metadata, status, and technical values.
- Use uppercase mono sparingly for section labels and batch status.
- Keep most letter spacing at `0`; metadata labels may use `0.06em` to `0.1em`.
- Reserve negative letter spacing for the brand lockup and deck-display typography only.

### Spacing, Radius, And Density

Current defaults:

```ts
{
  density: "cozy",
  cardStyle: "bordered",
  hover: "lift",
  letterbox: false,
  grain: true
}
```

Sizing rules:

- Sidebar: `208px`.
- Topbar: `44px`.
- Status bar: `22px`.
- Standard compact button height: `30px` to `34px`.
- Auth/tool input height: `34px`.
- Most control radii: `3px` to `5px`.
- Glass panel radius: `6px`.
- Brand mark radius: `8px`.

Use tight spacing in tool surfaces:

- Dense control gaps: `4px` to `6px`.
- Normal panel padding: `10px` to `16px`.
- Table cell padding: about `6px 8px`.
- Sidebar row padding: about `7px 10px`.

## Shell Layout

The main app shell is full-height, dark, and split into a left rail plus content surface.

```css
.pd-app {
  min-height: 100vh;
  height: 100vh;
  display: flex;
  background: var(--pd-bg);
  color: var(--pd-ink);
  font-family: var(--pd-font-sans);
  font-size: 13px;
  line-height: 1.45;
}

.pd-sidebar {
  width: 208px;
  background: var(--pd-bg-1);
  border-right: 1px solid var(--pd-line);
}

.pd-topbar {
  height: 44px;
  background: var(--pd-bg-1);
  border-bottom: 1px solid var(--pd-line);
}
```

Structural surfaces should be flat. The image content, palettes, and selected states should carry most of the visual interest.

## Components

### Buttons

Buttons are compact rectangles with small radii. Icons are preferred when the action is familiar; icon plus text is used for important commands.

Core button anatomy:

```css
.button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 5px;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.2;
  transition: all 140ms cubic-bezier(.2,.8,.2,1);
}
```

Variants:

| Variant | Background | Text | Border | Use |
| --- | --- | --- | --- | --- |
| Ghost | Transparent | `--pd-ink-dim` | Transparent | Low-emphasis toolbar actions. |
| Outline | `rgba(255,255,255,0.015)` | `--pd-ink-dim` | `--pd-line-strong` | Secondary actions. |
| Accent | `--pd-accent-soft` | `--pd-accent-ink` | Accent mixed at 38% | Active action, selected mode. |
| Primary | `--pd-accent` | `--pd-accent-contrast-text` | Subtle white alpha | Main CTA only. |
| Danger | Transparent or red wash | `--pd-red` / pale red | Red alpha border | Destructive action. |

Button sizes:

| Size | Padding | Font |
| --- | --- | --- |
| XS | `3px 8px` | `11px` |
| SM | `5px 10px` | `12px` |
| MD | `7px 12px` | `12px` |

Disabled buttons use opacity around `0.45` and `not-allowed` cursor.

### Segmented Controls

Used in Tweaks, auth mode switching, display-mode rows, density, hover, and card-style controls.

Selected segment:

```css
background: var(--pd-accent-soft);
color: var(--pd-accent-ink);
border-color: transparent;
```

Unselected segment:

```css
background: transparent;
color: var(--pd-ink-dim);
border: 1px solid var(--pd-line-strong);
```

Segment radii are usually `3px` to `5px`. Avoid pill shapes.

### Dropdowns And Menus

Menus and dropdowns should feel like compact glass panels, not bright popovers.

```css
.pd-glass-panel {
  border: 1px solid var(--pd-glass-line);
  border-radius: 6px;
  background: rgba(10, 10, 14, 0.42);
  color: var(--pd-ink);
  box-shadow:
    0 24px 80px -32px rgba(0, 0, 0, 0.82),
    0 2px 0 rgba(255, 255, 255, 0.018) inset;
  backdrop-filter: blur(12px) saturate(1.25);
}
```

Menu rows:

- Font: `11px` to `12px`.
- Padding: about `6px 8px`.
- Border/radius: `3px` to `4px`.
- Hover: `rgba(255,255,255,0.05)` and `--pd-ink`.
- Active: `--pd-accent-soft` and `--pd-accent-ink`.

### Fields And Inputs

Tool fields use a dark translucent background and accent-tinted focus.

```css
.pd-field {
  min-height: 34px;
  border: 1px solid var(--pd-line-strong);
  border-radius: 5px;
  background: rgba(5, 7, 10, 0.36);
  color: var(--pd-accent-ink);
  font-size: 12px;
  box-shadow: none;
}

.pd-field:focus-visible {
  border-color: color-mix(in srgb, var(--pd-accent) 70%, var(--pd-line-strong));
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--pd-accent) 35%, transparent) inset;
  outline: none;
}
```

Placeholders should be muted, not gray-white:

```css
color: color-mix(in srgb, var(--pd-accent-ink) 54%, var(--pd-ink-faint));
```

### Chips And Tags

Chips are small, rectangular, and lightly tinted.

```css
.pd-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px 2px 7px;
  border-radius: 3px;
  border: 1px solid transparent;
  background: rgba(255, 255, 255, 0.04);
  color: rgba(238, 240, 242, 0.78);
  font-family: var(--pd-font-sans);
  font-size: 10.5px;
  font-weight: 500;
  line-height: 1.4;
}
```

Chip types:

- Default chip: subtle white tint, no visible border.
- Outline chip: transparent fill, `--pd-line-strong` border.
- Mono chip: `--pd-font-mono`, no extra letter spacing.
- Palette chip: background uses the palette color at low alpha, text is mixed for contrast.
- Sref chip: muted blue tint, not full accent intensity.

### Labels And Metadata

Labels are quiet and technical.

```css
.pd-label {
  color: var(--pd-ink-faint);
  font-family: var(--pd-font-mono);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
```

Use labels for:

- Sidebar section headings.
- Filter headings.
- Metadata keys.
- Batch status.
- Table headers.
- Deck control sections.

### Checkboxes

Checkboxes are custom square controls, used heavily in filters and table selection.

Design:

- Square, compact, and aligned with `11px` to `11.5px` text.
- Border uses `--pd-line-strong`.
- Checked state should use `--pd-accent-soft`/`--pd-accent-ink` rather than a bright default checkbox.
- Label text uses `--pd-ink-dim`.

### Tables

Table view is dense and operational.

Rules:

- Font size around `11.5px`.
- Header text is mono, uppercase, `10px`, `600`.
- Cell padding around `6px 8px`.
- Borders use `--pd-line`.
- Row hover uses `rgba(255,255,255,0.032)`.
- Selected rows use `color-mix(in srgb, var(--pd-accent) 8%, transparent)`.
- Selected row hover increases to about `11%` accent mix.

Batch action bar:

- Selected-count text uses `--pd-accent-ink`.
- Primary batch action may use accent variant.
- Destructive action uses red tint and red border.
- Table utility rows, including batch actions, should share a compact `34px` minimum height.
- Utility-row buttons should be `24px` tall with about `3px 8px` padding, matching tag/filter chip density rather than large toolbar buttons.
- Stacked sticky utility rows should measure their actual height and offset the table header underneath, rather than adding extra dead vertical space.
- The top Filters control should open a compact dropdown with checkbox filters mirroring the left rail; it should not add another full-width table row.
- The top Columns control should open a compact dropdown too. Column toggles should use tag-sized typography (`10.5px`, `3px 7px`, `3px` radius) in a tight two-column grid, not a full-width table row.
- Selected utility chips, filter checkboxes, and dropdown buttons inherit the Tweaks selected treatment: `--pd-accent-soft` fill with `--pd-accent-ink` text.

### Cards And Image Tiles

Image tiles are content-first. Borders and shadows should stay secondary to the image.

Current card styles:

| Style | Treatment |
| --- | --- |
| Bordered | Thin line, dark backing, subtle lift. |
| Bare | Image-led, minimal chrome. |
| Glass | Glass panel treatment for richer surfaces. |
| Filmstrip | Dark strip-like frame for media browsing. |

Hover modes:

| Mode | Motion |
| --- | --- |
| Lift | Translate upward with stronger shadow. |
| Tilt | Mild perspective rotation. |
| Zoom | Image scales to about `1.065`. |
| Flip | Shallow `rotateY`. |

Default hover is `lift`:

```css
.pd-card-lift {
  transition: transform 220ms cubic-bezier(.2,.8,.2,1), box-shadow 220ms, filter 220ms;
}

.pd-card-lift:hover {
  transform: translateY(-5px);
  box-shadow: 0 20px 44px -18px rgba(0, 0, 0, 0.84), 0 0 0 1px var(--pd-line-hi);
  filter: brightness(1.015);
}
```

### Drawers, Dialogs, And Overlays

Drawers and dialogs use glass.

Glass tokens:

```css
:root {
  --pd-glass-bg: rgba(10, 10, 14, 0.42);
  --pd-glass-bg-strong: rgba(10, 10, 14, 0.56);
  --pd-glass-header: rgba(10, 10, 14, 0.36);
  --pd-glass-footer: rgba(14, 14, 18, 0.44);
  --pd-glass-field: rgba(255, 255, 255, 0.035);
  --pd-glass-line: rgba(255, 255, 255, 0.09);
  --pd-glass-line-hi: rgba(255, 255, 255, 0.15);
  --pd-glass-radius: 6px;
  --pd-glass-blur: 12px;
  --pd-glass-overlay: rgba(0, 0, 0, 0.24);
  --pd-glass-overlay-blur: 2px;
  --pd-scrollbar-thumb: rgba(40, 43, 45, 0.9);
  --pd-scrollbar-thumb-hover: rgba(62, 66, 69, 0.94);
}
```

Overlay treatment:

- Background dim: `rgba(0,0,0,0.24)`.
- Optional blur: `2px`.
- Dialog shadow: deep and soft, not a bright glow.
- Header/footer: translucent dark bands with `--pd-glass-line` separators.
- Floating menus, tweak panels, palette popovers, and dialogs should share these glass tokens unless a component has a strong reason to opt out.
- Floating popover scrollbars and main pane scrollbars should share the same 8px transparent-track scrollbar treatment.

### Toasts And Status

Toasts and status messages should use the same dark compact language:

- Success: green accent sparingly.
- Error/destructive: red wash plus red border.
- In-progress: accent ink with muted copy.
- Metadata/status text: mono, uppercase, around `10px`.

### Sliders And Numeric Controls

Deck composer range controls are rectangular and technical.

```css
.deck-rect-range {
  appearance: none;
  height: 22px;
  border-radius: 0;
  background: transparent;
}

.deck-rect-range::-webkit-slider-thumb {
  width: 7px;
  height: 22px;
  border-radius: 1px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(58, 58, 61, 0.96);
}
```

Filled range track uses `--pd-accent` on the completed portion and low white alpha on the remaining portion.

## Highlighting And Selection

Use these patterns consistently:

| State | Treatment |
| --- | --- |
| Hover | `rgba(255,255,255,0.05)` or slightly brighter border. |
| Active mode | `--pd-accent-soft` fill, `--pd-accent-ink` text. |
| Selected row | Accent mixed at 8% on dark background. |
| Selected row hover | Accent mixed at 11%. |
| Focus | Accent-tinted inset ring, no default blue outline. |
| Primary CTA | Solid `--pd-accent`, contrast text. |
| Danger | Red tint, red border, pale red text. |
| Disabled | Opacity around `0.45`. |

Selection should feel like a quiet instrument panel indicator, not a saturated badge.

## Brand Lockup

Current brand mark:

```css
.site-brand-mark {
  width: 2rem;
  height: 2rem;
  border-radius: 0.5rem;
  background: rgba(18, 18, 24, 0.96);
  border: 1px solid rgba(255, 255, 255, 0.06);
  color: #ffffff;
  font-size: 1.05rem;
  font-weight: 900;
  font-style: italic;
  letter-spacing: -0.08em;
}

.site-brand-word {
  font-size: 1.75rem;
  font-weight: 900;
  font-style: italic;
  letter-spacing: -0.07em;
  line-height: 1;
}

.site-brand-word-accent {
  color: var(--pd-accent);
}
```

Brand should be compact and slightly aggressive. Do not soften it into a rounded friendly SaaS wordmark.

## Auth Screens

Auth has a slightly larger control scale than the core app, but it still uses the same dark and accent language.

Auth field:

- Min height: about `3.35rem`.
- Radius: about `0.7rem`.
- Border: white at 10% alpha.
- Background: `rgba(10,10,14,0.92)`.

Auth primary button:

- Min height: about `3.4rem`.
- Radius: about `0.8rem`.
- Background: solid `--pd-accent`.
- Text: `--pd-accent-contrast-text`.
- Font: `0.98rem`, `700`.

Auth provider buttons:

- Grid of three.
- Min height: about `3.45rem`.
- Radius: about `0.7rem`.
- Blue backing with accent-tinted border.

## Deck Composer

The deck builder is a darker, more editorial sub-surface inside Pindeck.

Additional font families loaded for decks include:

- Schibsted Grotesk
- Karla
- Playfair Display
- Source Serif 4
- Archivo
- Archivo Black
- Quicksand
- Cabin
- Inter
- IBM Plex Sans
- IBM Plex Mono
- DM Sans
- Geist
- Geist Mono

Deck typography hooks:

```css
.font-display {
  font-family: "Bebas Neue", "Oswald", var(--font-sans);
}

.font-headline {
  font-family: "Oswald", var(--font-sans);
}

.font-body {
  font-family: var(--font-sans);
}
```

Deck composer chrome:

- Background near black: `#050505`.
- Controls use `--pd-font-sans`.
- Section labels use uppercase `10px` text with wide tracking.
- Selects and inputs use dark rectangular fields, white alpha borders, and accent selected borders.
- Color swatches are square/rectangular, not pill-shaped.

## Motion And Texture

Motion is quick, restrained, and utility-driven.

```css
@keyframes pdFadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: none; }
}

.pd-fade-in {
  animation: pdFadeIn 180ms cubic-bezier(.2,.8,.2,1) both;
}
```

Common timings:

- Hover color/background: `140ms`.
- Cards: `220ms`.
- Fade in: `180ms`.
- Generic Tailwind slide-up: `300ms`.

Optional grain:

```css
.pd-grain::before {
  content: "";
  position: fixed;
  inset: 0;
  pointer-events: none;
  opacity: 0.035;
  mix-blend-mode: overlay;
  z-index: 9999;
}
```

Grain should be barely visible and should never reduce image legibility.

## Designer Checklist

When designing new Pindeck surfaces:

1. Start from the dark shell, not a bright card.
2. Keep controls compact and rectangular.
3. Use `--pd-line` dividers before adding borders or shadows.
4. Use mono uppercase labels for technical metadata.
5. Use `--pd-accent-soft` for selected states.
6. Reserve solid accent for primary CTAs and progress/high-signal elements.
7. Keep image content dominant.
8. Use glass only for overlays, drawers, popovers, and floating panels.
9. Prefer hover brightness, border, or small transforms over large animation.
10. Check dense table, gallery, drawer, auth, and deck-composer contexts before introducing a new style.

## Current Design Debt To Preserve Awareness

The app currently mixes tokenized Pindeck styles, inline React styles, Tailwind utility classes, shadcn/Radix tokens, and deck-builder-specific styles. A designer should treat the Pindeck token system as the desired visual language, but should expect some local one-off styling in implementation.

Do not assume every current component is already perfectly abstracted. This guide describes the visual target that exists across the app today and should be consolidated toward over time.
