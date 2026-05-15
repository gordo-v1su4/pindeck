# Pindeck Style Guide

This file captures the current website look so the same visual system can be rebuilt elsewhere and merged back without fighting the app.

## Visual Direction

Pindeck is a dark, compact, media-library interface. It should feel like a quiet creative tool: dense, crisp, low-glare, image-first, and slightly cinematic. Avoid marketing-page styling, oversized cards, heavy gradients, and soft rounded SaaS chrome.

Primary traits:

- Dark neutral shell with almost-black panels.
- Thin translucent dividers instead of heavy borders.
- Small typography, tight spacing, and compact controls.
- Blue accent by default, with runtime accent swapping.
- Glass dialogs and drawers with blur, low-opacity fills, and deep shadows.
- Small radii: mostly `3px` to `6px`.
- Subtle hover motion: lift, tilt, zoom, or flip for media cards.
- Optional film grain overlay for texture.

## Framework Assumptions

The current app uses:

- React + Vite.
- Tailwind CSS v4.
- shadcn tokens.
- Radix Themes primitives.
- Lucide/Radix-style icons via local `PinIcon` wrappers.
- `sonner` toasts.

The portable style surface lives mostly in:

- `src/index.css`
- `src/lib/pdTheme.ts`
- `src/components/ui/actionStyles.ts`
- `src/components/ui/pindeck/*`

## Fonts

Default app fonts:

```css
:root {
  --pd-font-sans: "Geist", "Inter", ui-sans-serif, system-ui, sans-serif;
  --pd-font-mono: "Geist Mono", "JetBrains Mono", ui-monospace, monospace;
  --pd-font-display: "Archivo Narrow", "Archivo", "Geist", sans-serif;
}
```

Runtime font options from Tweaks:

| Id | Sans | Mono |
| --- | --- | --- |
| `geist` | `"Geist", sans-serif` | `"Geist Mono", monospace` |
| `inter` | `"Inter", sans-serif` | `"JetBrains Mono", monospace` |
| `archivo` | `"Archivo", sans-serif` | `"DM Mono", monospace` |
| `space` | `"Space Grotesk", sans-serif` | `"JetBrains Mono", monospace` |

Deck-builder display hooks:

```css
.font-display {
  font-family: "Bebas Neue", "Oswald", var(--font-sans);
}

.font-headline {
  font-family: "Oswald", var(--font-sans);
}

.deck-scope {
  --font-display: "Archivo Narrow", "Archivo", "Geist", sans-serif;
  --font-serif: "Instrument Serif", "DM Serif Display", serif;
}
```

Typography rules:

- App body: `13px`, line-height `1.45`.
- Main navigation and control text: `11px` to `12px`.
- Labels and metadata: `9.5px` to `10.5px`, often mono, uppercase.
- Dialog titles: around `13px`, semibold.
- Avoid negative tracking except for the Pindeck logo/brand lockup and deck display glyphs.

## Core CSS Tokens

Use these tokens as the base theme in a separate project:

```css
:root {
  --pd-accent: #3a7bff;
  --pd-accent-ink: #c7ddff;
  --pd-accent-soft: rgba(58, 123, 255, 0.14);
  --pd-accent-hover: #2447b8;
  --pd-accent-contrast-text: #ffffff;

  --pd-font-sans: "Geist", "Inter", ui-sans-serif, system-ui, sans-serif;
  --pd-font-mono: "Geist Mono", "JetBrains Mono", ui-monospace, monospace;
  --pd-font-display: "Archivo Narrow", "Archivo", "Geist", sans-serif;

  --pd-ink: #c9ccd1;
  --pd-ink-dim: rgba(238, 240, 242, 0.62);
  --pd-ink-mute: rgba(238, 240, 242, 0.56);
  --pd-ink-faint: rgba(238, 240, 242, 0.3);

  --pd-bg: #08080a;
  --pd-bg-1: #0c0c0f;
  --pd-bg-2: #101014;
  --pd-panel: #0b0b0e;
  --pd-panel-2: #111116;

  --pd-line: rgba(255, 255, 255, 0.055);
  --pd-line-strong: rgba(255, 255, 255, 0.09);
  --pd-line-hi: rgba(255, 255, 255, 0.14);

  --pd-amber: #f5a524;
  --pd-cyan: #22b8cf;
  --pd-magenta: #d946ef;
  --pd-green: #2ee6a6;
  --pd-red: #ef4343;

  --pd-radius: 6px;
  --pd-radius-sm: 4px;
  --pd-shadow-deep:
    0 16px 40px -18px rgba(0, 0, 0, 0.95),
    0 2px 0 rgba(255, 255, 255, 0.02) inset;
}
```

## Glass Tokens

Use these for modals, drawers, dropdowns, overlays, and floating panels:

```css
:root {
  --pd-glass-bg: rgba(10, 10, 14, 0.66);
  --pd-glass-bg-strong: rgba(10, 10, 14, 0.78);
  --pd-glass-header: rgba(10, 10, 14, 0.64);
  --pd-glass-footer: rgba(14, 14, 18, 0.66);
  --pd-glass-field: rgba(255, 255, 255, 0.035);
  --pd-glass-line: rgba(255, 255, 255, 0.09);
  --pd-glass-line-hi: rgba(255, 255, 255, 0.15);
  --pd-glass-radius: 6px;
  --pd-glass-blur: 22px;
  --pd-glass-overlay: rgba(0, 0, 0, 0.38);
  --pd-glass-overlay-blur: 4px;
  --pd-glass-shadow:
    0 24px 80px -28px rgba(0, 0, 0, 0.95),
    0 2px 0 rgba(255, 255, 255, 0.025) inset;
}
```

Glass panel recipe:

```css
.pd-glass-dialog {
  border: 1px solid var(--pd-glass-line);
  border-radius: var(--pd-glass-radius);
  background: var(--pd-glass-bg);
  color: var(--pd-ink);
  box-shadow: var(--pd-glass-shadow);
  backdrop-filter: blur(var(--pd-glass-blur)) saturate(1.25);
}
```

## Layout

Main app shell:

- Full viewport height.
- Background `var(--pd-bg)`.
- Text `var(--pd-ink)`.
- Font `var(--pd-font-sans)`.
- Sidebar width `208px`.
- Topbar height `44px`.
- Status bar height `22px`.

Canonical shell structure:

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

## Components

### Buttons

Default action buttons are compact, low-contrast, and rectangular:

```css
.pd-action-secondary {
  min-height: 30px;
  border: 1px solid var(--pd-line-strong);
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.025);
  color: var(--pd-ink-dim);
  font-family: var(--pd-font-sans);
  font-size: 12px;
  font-weight: 500;
}

.pd-action-secondary:hover {
  border-color: var(--pd-line-hi);
  background: rgba(255, 255, 255, 0.045);
  color: var(--pd-ink);
}

.pd-action-primary,
.creative-action-primary {
  background: var(--pd-accent);
  color: var(--pd-accent-contrast-text);
}

.pd-action-tab[data-active="true"],
.creative-action-accent {
  border-color: color-mix(in srgb, var(--pd-accent) 40%, transparent);
  background: var(--pd-accent-soft);
  color: var(--pd-accent-ink);
}
```

### Fields

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

### Chips

```css
.pd-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px 2px 7px;
  border-radius: 3px;
  border: 1px solid transparent;
  background: rgba(255, 255, 255, 0.05);
  color: var(--pd-ink-dim);
  font-family: var(--pd-font-sans);
  font-size: 10.5px;
  font-weight: 500;
  line-height: 1.4;
}

.pd-chip--outline {
  background: transparent;
  border-color: var(--pd-line-strong);
}

.pd-chip--mono {
  font-family: var(--pd-font-mono);
  letter-spacing: 0;
}
```

### Labels

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

## Motion

Motion is quick and restrained:

```css
@keyframes pdFadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: none; }
}

.pd-fade-in {
  animation: pdFadeIn 180ms cubic-bezier(.2,.8,.2,1) both;
}

.pd-card-lift {
  transition: transform 220ms cubic-bezier(.2,.8,.2,1), box-shadow 220ms, filter 220ms;
}

.pd-card-lift:hover {
  transform: translateY(-5px);
  box-shadow: 0 20px 44px -18px rgba(0, 0, 0, 0.84), 0 0 0 1px var(--pd-line-hi);
  filter: brightness(1.015);
}
```

Hover variants used by the app:

- `lift`: translate upward with shadow.
- `tilt`: mild perspective rotation.
- `zoom`: image scale to `1.065`.
- `flip`: shallow `rotateY`.

## Texture

Optional film grain:

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

Use a tiny SVG fractal-noise data URL or equivalent bitmap noise. The grain should be barely visible.

## Brand Lockup

The Pindeck mark is compact and italic:

```css
.site-brand-mark {
  width: 2rem;
  height: 2rem;
  border-radius: 0.5rem;
  background: rgba(18, 18, 24, 0.96);
  border: 1px solid rgba(255, 255, 255, 0.06);
  color: #fff;
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

## Tweaks Defaults

Current defaults:

```ts
const DEFAULT_TWEAKS = {
  accent: "#3a7bff",
  density: "cozy",
  cardStyle: "bordered",
  typography: "geist",
  hover: "lift",
  letterbox: false,
  grain: true,
  showTweaks: false,
};
```

Accent swatches:

| Name | Hex |
| --- | --- |
| Indigo | `#3a7bff` |
| Cobalt | `#5b8def` |
| Cyan | `#22b8cf` |
| Amber | `#f5a524` |
| Red | `#ef4343` |

When changing accent, also derive:

- `--pd-accent-ink`: accent blended toward `#f8fafc` by about 58%.
- `--pd-accent-hover`: accent darkened to about 78%.
- `--pd-accent-soft`: accent at about 14% opacity.
- `--pd-accent-contrast-text`: `#fff` unless the accent is very light, then `#0c0c0f`.

## Implementation Checklist

When recreating this style somewhere else:

1. Add the `--pd-*` tokens to `:root`.
2. Wrap the app in `.pd-theme`.
3. Use `var(--pd-bg)` for the page shell and `var(--pd-bg-1)` for rails/topbars.
4. Keep the sidebar around `208px` and topbar around `44px`.
5. Use `var(--pd-line)` borders instead of visible outlines.
6. Keep buttons at `30px` to `34px` tall with `3px` to `5px` radii.
7. Use mono uppercase labels for metadata and section headings.
8. Use `--pd-accent-soft` for selected states, not solid blue fills.
9. Reserve solid `--pd-accent` for primary CTAs and progress/high-signal elements.
10. Add glass treatment only to dialogs, drawers, menus, and floating panels.

## Avoid

- Bright white panels.
- Large rounded cards.
- Purple-heavy gradients or decorative blobs.
- Marketing hero composition inside the app.
- Large body text in tool surfaces.
- Thick borders.
- Loud drop shadows on ordinary controls.
- Blue default browser focus rings; use accent-tinted focus shadows.

