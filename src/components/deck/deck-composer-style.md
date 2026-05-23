# Deck Composer Style Guide

This document is the designer-facing style sheet for the Pindeck Deck Composer only. It covers the editor surface where a saved board becomes a deck: left editing rail, workspace header, selected-block strip, canvas preview, live presentation overlay, and deck-specific controls.

Source of truth:

- `src/components/deck/DeckComposer.tsx`
- `src/components/deck/DeckComposer.css`
- `src/components/deck/DeckCanvasPage.tsx`
- `src/components/deck/DeckSection.tsx`
- `src/index.css`
- `style.md`

## Product Role

The Deck Composer should feel like a compact cinematic editing console, not a document editor or marketing page builder. It is a working surface for arranging images, palette, type, overlay treatment, slide blocks, and presentation export.

Use:

- Dense dark tool chrome.
- Small, precise labels.
- Strong image preview as the main visual object.
- Accent color for active selections, primary actions, selected slides, and focus.
- Low-glare panel separation with thin translucent lines.
- Framed 16:9 slide previews that feel like production boards.

Avoid:

- Bright cards or white panels.
- Oversized control labels.
- Decorative backgrounds that compete with the deck.
- Rounded SaaS-style surfaces above `6px`.
- Heavy shadows around every control.
- Replacing the existing composer workflow with a separate page-builder model.

## Composer Shell

The root shell is `.deck-scope`.

```css
.deck-scope {
  --deck-bg: #050506;
  --deck-panel: #0c0c10;
  --deck-panel-raised: #111117;
  --deck-line: rgba(255, 255, 255, 0.08);
  --deck-line-strong: rgba(255, 255, 255, 0.14);
  --deck-text: rgba(245, 247, 250, 0.88);
  --deck-text-soft: rgba(245, 247, 250, 0.58);
  --deck-text-faint: rgba(245, 247, 250, 0.32);
}
```

The composer keeps the app's Pindeck accent variables:

```css
--pd-accent
--pd-accent-ink
--pd-accent-soft
--pd-accent-contrast-text
--pd-font-sans
--pd-font-mono
```

Do not redefine Pindeck dynamic accent or font variables inside `.deck-scope`. The composer should inherit the current app Tweaks accent.

## Layout

The composer has three zones:

| Zone | Purpose | Current treatment |
| --- | --- | --- |
| Left rail | Edit deck name, image strip, colors, overlays, type, layout, blocks, export | `328px` dark panel, thin right divider, compact sections |
| Workspace header | Deck state, treatment badge, effect badge, block count, preview/present actions | Sticky dark bar with small uppercase metadata |
| Canvas well | Selected bar plus stacked 16:9 slide preview | Dark preview field, centered max width, framed slide blocks |

Desktop layout:

- Left rail: fixed `328px`.
- Workspace: fills remaining width.
- Canvas preview max: `720px`.
- Preview frame: centered, not full-bleed.

Mobile/tablet layout:

- Left rail becomes an absolute overlay.
- Width: `min(340px, calc(100vw - 28px))`.
- Workspace header becomes tighter.
- Canvas padding reduces to `14px`.

## Color And Surface Rules

Use near-black neutrals:

| Role | Value |
| --- | --- |
| Composer background | `#050506` |
| Sidebar panel | `#0c0c10` |
| Raised controls | `#111117` |
| Canvas field | `#050507` |
| Normal line | `rgba(255,255,255,0.08)` |
| Strong line | `rgba(255,255,255,0.14)` |

Use gradients only as subtle tonal lift:

```css
linear-gradient(180deg, rgba(255,255,255,0.018), transparent 180px)
```

Do not use decorative gradient blobs, saturated page washes, or bright spotlight backgrounds in the composer chrome.

## Typography

Composer chrome uses `var(--pd-font-sans)`.

Labels:

- Uppercase.
- `9px` to `10px`.
- Weight `600` to `700`.
- Letter spacing around `0.18em` to `0.28em`.
- Color `white/30` to `white/48`, with accent reserved for values.

Control text:

- Buttons: `10px` to `12px`.
- Inputs: `0.98rem` for deck title only.
- Select summaries: `10px` to `11px`.

Slide canvas typography is governed by `DeckCanvasPage.tsx` and its selected font preset. Do not normalize slide typography to app chrome typography.

## Controls

### Inputs

Deck title input:

- Height: `44px`.
- Radius: `4px`.
- Border: thin translucent line.
- Background: `#121218`.
- Focus: accent border plus subtle accent glow.

### Image Slots

Image slots are compact 4:3 thumbnails:

- Five-column grid.
- Active slot uses accent border.
- Empty slot uses dashed border and a centered plus.
- Hover may lift by `-1px` and brighten slightly.

### Color Swatches

Swatches are functional controls, not decorative chips:

- Five-column grid.
- Tall square-ish ratio.
- Color fills most of the button.
- Label sits in a darker footer.
- Labels: `PRI`, `SEC`, `ACC`, `DAR`, `LIQ`.

### Sliders

Overlay sliders are rectangular and technical:

- Flat two-pixel track.
- Narrow rectangular thumb.
- Accent-filled track before the thumb.
- Focus uses accent ring on the thumb.

Avoid pill sliders here.

### Selects

Select triggers should feel like compact preset panels:

- Radius `4px`.
- Dark raised background.
- Thin border.
- Typography preset includes a small preview square.
- Dropdown content is dark glass with a thin border and restrained shadow.

## Blocks List

The blocks list is the editor's table of contents.

Selected block:

- Accent-soft fill.
- Accent-tinted border.
- Subtle inset highlight.

Normal block:

- `#0c0c10` background.
- `white/8` border.
- Small uppercase title.

Hidden blocks:

- Reduced opacity.
- Muted text.

Lock and visibility controls should remain icon-only, with hover color changes. Do not add text labels inside the row.

## Canvas Preview

The canvas preview uses `.deck-canvas-page` around slide blocks.

```css
.deck-canvas-page {
  padding: 10px;
  border: 1px solid rgba(255, 255, 255, 0.075);
  background: #050507;
}
```

Slide blocks:

- Always 16:9.
- Thin border.
- Subtle inset line.
- Hover: slightly stronger border.
- Selected: accent border plus accent-tinted outer ring.

The selected slide state should be visible enough for editing, but not so loud that it changes the perceived deck design.

## Presentation Overlay

The live presentation overlay remains separate from the editing chrome:

- Full-screen black overlay.
- Sticky top bar.
- `DeckSection` renders presentation slides.
- Snap scrolling stays enabled.

Do not apply editor panel chrome to presentation slides. Presentation mode should feel like showing the actual deck, not editing it.

## Motion

Motion is quick and practical:

- Hover and focus transitions: `140ms` to `170ms`.
- Button press: `translateY(1px)`.
- Thumbnail hover: slight lift and brightness.

Respect reduced motion:

```css
@media (prefers-reduced-motion: reduce) {
  .deck-scope *,
  .deck-scope *::before,
  .deck-scope *::after {
    transition-duration: 1ms !important;
    animation-duration: 1ms !important;
  }
}
```

## Refinement Targets

Good next refinements:

- Add a compact block-detail editor for title and copy near the selected-block bar.
- Add small tooltips for lock, visibility, preview, present, PDF, and reset.
- Improve the `+ BLANK` deck creation path so empty guest states can reach a previewable composer.
- Add responsive canvas zoom controls instead of relying only on max width.
- Make palette swatches show copied hex values on hover or click.

Keep future changes scoped through `.deck-scope`, `.deck-canvas-page`, `.deck-preview-frame`, and `.deck-selected-bar` so composer styling does not leak into gallery, boards, table, auth, or the app shell.
