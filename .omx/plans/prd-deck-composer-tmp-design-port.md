# PRD — Port TMP deck builder design into DeckComposer

- Date: 2026-04-23
- Branch: `claude/redesign`
- Workflow: `ralplan`
- Context snapshot: `.omx/context/deck-composer-tmp-design-port-20260423T084320Z.md`
- Existing PR: #24 (`claude/redesign` → `main`)

## Problem

The production app has only partially absorbed the high-fidelity TMP deck builder design. The current `DeckComposer` has editor controls and a slide preview, but it does not yet reflect the actual design-phase reference in `TMP/redesign/deck.jsx`: the left editor rail, template-driven block system, scroll FX controls, continuous cinematic canvas, present/export modal behavior, and block variant editor are either missing, simplified, or implemented differently.

The corrective work must preserve the product model:
- `DeckView` is the deck library / selector
- `DeckComposer` is the selected deck editor

No separate editor/product naming should be introduced in the UI.

## Goal

Port the TMP deck builder design into production with a staged, verifiable implementation that:
- makes `DeckComposer` visually and structurally match the TMP reference
- keeps `DeckView` as the library/selector layer
- maps current Convex deck data into the TMP-inspired editor model
- preserves current media URL behavior from Convex + Nextcloud/WebDAV
- avoids schema/storage changes in this pass

## Non-goals

- No Convex schema change for composer state in this pass.
- No Nextcloud/WebDAV media storage change.
- No new dependencies.
- No new route system.
- No user-facing copy for a separate editor/product name.
- No replacement of `DeckView` with the TMP gallery; `DeckView` remains the library/selector and can later borrow TMP gallery card ideas separately.

---

# RALPLAN-DR summary

## Principles

1. **TMP is the visual source of truth for DeckComposer** — production must port the design intent, not just keep the current simplified editor.
2. **Preserve the product split** — `DeckView` selects decks; `DeckComposer` edits the selected deck.
3. **Adapter before schema change** — map current Convex deck fields into TMP-inspired editor state without changing backend schema first.
4. **Stage the port** — port shell/sidebar/canvas first, then variants/presentation/export polish, then persistence later.
5. **Verify visual parity and flows** — typecheck/build is necessary but not enough; screenshot/manual comparison is required.

## Decision drivers

1. **The current UI misses the TMP design**: the screenshot shows a mature builder with a left rail, block list, FX selector, and continuous cinematic page.
2. **Existing production data is already live**: decks come from Convex and images from Nextcloud-backed URLs, so the port must adapt, not replace data flow.
3. **Prior work already unified app chrome**: the missing layer is specifically `DeckComposer` design parity, not another broad app-wide polish pass.

## Viable options

### Option A — Small visual patch to current DeckComposer
**Pros**
- Lowest effort
- Least risk to existing localStorage draft behavior

**Cons**
- Does not solve the user's core complaint that TMP design work was not applied
- Keeps current simplified block/canvas model
- Likely creates more follow-up churn

### Option B — Staged TMP port using an adapter layer (**recommended**)
**Pros**
- Ports the design intent while preserving Convex data and current app structure
- Allows safe incremental commits and verification
- Lets `DeckComposer` adopt TMP controls/canvas without requiring backend changes

**Cons**
- More work than a visual patch
- Needs careful mapping between current block schema and TMP block kinds
- Requires visual QA against TMP screenshots

### Option C — Full rewrite from TMP `deck.jsx`
**Pros**
- Fastest way to visually match the prototype if treated as a direct source copy

**Cons**
- TMP code is Babel/prototype style, not production TypeScript
- Higher regression risk
- Would duplicate logic and bypass existing Convex/media integration patterns

## Recommendation

Choose **Option B: staged TMP port using an adapter layer**.

---

# Source reference inventory

## Primary TMP files
- `TMP/redesign/deck.jsx` — main editor/canvas/presentation source reference
- `TMP/redesign/decks-gallery.jsx` — deck preset/gallery source reference; use as optional inspiration for `DeckView`, not a replacement
- `TMP/redesign/parts.jsx` — primitive/button/chip patterns; reuse ideas, not code wholesale
- `TMP/redesign/HANDOFF.md` — prototype map and intent notes
- `TMP/redesign/Screenshot 2026-04-21 213237.png`
- `TMP/redesign/Screenshot 2026-04-21 213337.png`

## TMP features to port into production

### Editor shell / left rail
- fixed left editor rail
- deck name input
- image pool slots with count
- palette swatches labeled PRI/SEC/ACC/DAR/LIQ or production-equivalent labels
- overlay slider with show-image/dark labels
- template/style selector
- scroll FX selector
- block list with visibility/lock controls
- bottom actions: present live, PDF/export, reset

### Top composer strip
- back/library affordance into `DeckView`
- current deck title
- selected template chip
- selected FX chip
- visible block count
- preview and present actions

### Canvas / deck rendering
- continuous scroll page, not just isolated repeated slides
- hero/cold-open block
- logline split block
- tone/palette grid
- protagonist/character block
- references/story/stakes/outro blocks
- selected block outline and canvas-click selection
- block-specific layout variants
- template accent and typography applied to canvas

### Interaction model
- template presets from `TEMPLATES`
- font family presets from `FONT_FAMILIES`
- scroll FX from `SCROLL_FX`: parallax, snap/reveal, kinetic, dolly, frame sequence
- block variants from `LAYOUT_VARIANTS`
- present modal with live HTML mode and static export/PDF mode

---

# Production architecture target

## Keep
- `DeckView` remains the library/selector.
- `DeckComposer` remains the editor.
- Existing `DeckDetail` data from `convex/decks.ts` remains the source input.
- Existing `image.imageUrl` / `previewUrl` / `derivativeUrls` remain the media source.
- Existing localStorage draft behavior remains until a later persistence contract.

## Add / adapt
- Add a production adapter inside `DeckComposer` or a helper file:
  - current `DeckDetail` → TMP-style `composerDeckMeta`
  - current slides/images → TMP-style image pool
  - current `BlockData[]` → TMP-style block descriptors and slide content
- Add or refactor production renderer helpers:
  - `DeckComposerRail`
  - `DeckComposerTopbar`
  - `DeckCanvasPage`
  - `DeckCanvasBlock`
  - `DeckPresentModal`
  - optional `deckComposerModel.ts` for adapters/constants

## Avoid
- Do not paste prototype global `window.*` patterns.
- Do not introduce Babel-style globals.
- Do not reintroduce any separate editor/product name.
- Do not change backend schema as part of the first port.

---

# Phased implementation plan

## Phase 1 — TMP parity model and constants

### Goal
Move TMP design concepts into production TypeScript constants and adapter functions without changing rendering yet.

### Target files
- `src/components/deck/types.ts`
- new optional `src/components/deck/deckComposerModel.ts`
- `src/components/deck/DeckComposer.tsx`

### Work
- Define production equivalents for:
  - `TEMPLATES`
  - `FONT_FAMILIES`
  - `LAYOUT_VARIANTS`
  - `SCROLL_FX`
  - `DEFAULT_BLOCKS`
- Add adapter from current `DeckDetail` to TMP-style composer state.
- Keep current blocks/localStorage state working during the transition.

### Must not change
- No backend/schema change.
- No media URL handling change.

### Done when
- TypeScript constants compile.
- Current `DeckComposer` still renders.
- No user-visible change required yet.

---

## Phase 2 — Left rail and top composer strip

### Goal
Replace the simplified production editor chrome with the TMP-inspired editor structure.

### Target files
- `src/components/deck/DeckComposer.tsx`
- `src/index.css` if shared styles are needed

### Work
- Implement left rail with:
  - close/back to `DeckView` if needed
  - deck name display/input
  - image pool slots
  - color palette swatches
  - overlay slider
  - template/style selector
  - scroll FX selector
  - block list
  - present/export/reset actions
- Implement top strip with:
  - library/back affordance
  - deck title
  - template chip
  - FX chip
  - visible block count
  - preview/present actions

### Must not change
- `DeckView` remains library/selector.
- Board → deck creation and selected deck routing stay intact.

### Done when
- Screenshot-level layout matches TMP: left rail + top strip + central canvas.
- No separate editor/product naming appears.

---

## Phase 3 — Continuous deck canvas renderer

### Goal
Port TMP continuous deck page composition into production while using real deck images.

### Target files
- `src/components/deck/DeckComposer.tsx`
- `src/components/deck/DeckSection.tsx`
- optional new helper components under `src/components/deck/`

### Work
- Implement continuous canvas/page mode inspired by TMP `DeckPage` / `DeckBlock`.
- Add block renderers for:
  - hero/cold-open
  - logline
  - tone/palette grid
  - character/protagonist
  - sequence/motifs
  - references/story/stakes/outro
- Use real `deck.slides` images from Convex, falling back gracefully when images are missing.
- Add selected block outline and click-to-select behavior.

### Must not change
- Existing image URLs and derivative URLs remain untouched.
- No hardcoded Unsplash dependency in production.

### Done when
- Production canvas visually resembles TMP screenshot using real deck data.
- Existing deck opens without crashing even with fewer than 10 images.

---

## Phase 4 — Variants, fonts, and scroll effects

### Goal
Make the controls actually affect the canvas.

### Target files
- `DeckComposer.tsx`
- `DeckSection.tsx` or new deck canvas helpers

### Work
- Wire template selection to accent/palette/type system.
- Wire font family selection to canvas typography.
- Wire scroll FX selection to canvas behavior.
- Add layout variant selector per selected block.
- Preserve current edit/preview content editing where practical.

### Must not change
- Do not require server persistence yet.

### Done when
- Template/font/FX controls are visibly reflected in the canvas.
- Local draft reload preserves selected controls where applicable.

---

## Phase 5 — Present/export parity and verification

### Goal
Restore TMP present/export experience in production-safe form.

### Target files
- `DeckComposer.tsx`
- `DeckSection.tsx` / canvas helpers

### Work
- Implement present modal with live mode.
- Keep existing PDF export functional or adapt it to the new canvas.
- Ensure export filename uses deck title and not any forbidden/prototype naming.

### Done when
- Present opens and scrolls the continuous deck.
- PDF/export still works.
- Build/type/lint pass.
- Visual comparison is acceptable against TMP screenshots.

---

# Acceptance criteria

## Visual / UX
- `DeckView` shows deck library/selection only.
- Clicking a deck opens `DeckComposer` editor for that deck.
- `DeckComposer` has a TMP-like left rail, top strip, continuous canvas, block list, template/font/FX controls, and present/export actions.
- No separate editor/product name appears in UI copy.
- Canvas uses real deck images from Convex/Nextcloud-backed URLs.
- Decks with fewer than 10 images still render gracefully.

## Functional
- Board → deck creation still opens the new deck in the deck tab.
- Existing deck switching still works.
- Local draft state remains intact or is migrated forward without loss.
- Present/export remain available.
- No Convex schema or media storage change.

## Verification
- `bunx tsc -p . -noEmit --pretty false`
- `bunx tsc -p convex -noEmit --pretty false`
- `bun run build`
- `bun run lint`
- residual grep audit for forbidden old editor/product names and stale direct prototype globals
- manual browser smoke:
  1. open DeckView
  2. select a deck
  3. confirm left rail/top strip/canvas match TMP direction
  4. switch template/style/FX and see canvas change
  5. present deck
  6. export PDF
  7. return to deck library

---

# ADR

## Decision
Port the TMP deck builder design into production through a staged adapter-based implementation rather than a direct prototype copy.

## Drivers
- TMP has the missing high-fidelity design work.
- Current production `DeckComposer` is simplified and does not match TMP.
- Production data/media flows must remain stable.

## Alternatives considered
- Small patch to current editor: rejected because it would not apply the TMP design.
- Direct copy of TMP `deck.jsx`: rejected because it is prototype/Babel/global style and would bypass production TypeScript patterns.
- Backend-first persistence work: rejected because the missing problem is visual/editor parity, not schema.

## Consequences
- More frontend work is required in `DeckComposer` and deck render helpers.
- A small adapter/model layer is needed to map Convex deck data into TMP-like composer state.
- Visual QA against TMP screenshots becomes part of completion.

## Follow-ups
- After visual parity, define a server-side `composerState` contract if persistence beyond localStorage is needed.
- Later, optionally bring `DeckView` deck cards closer to `decks-gallery.jsx` contact-strip previews.
- Evaluate storing exported deck artifacts only after editor parity is complete.

---

# Execution staffing guidance

## Recommended path
Use `$ralph` for sequential, verification-heavy execution.

## Agent roles
- `executor`: implement adapter/constants, left rail, top strip, canvas, and present/export parity.
- `architect`: verify production architecture after Phase 2 and Phase 3.
- `verifier`: run build/type/lint and visual/manual checklist.
- `designer` or `vision`: compare against TMP screenshots if visual scoring is needed.

## Suggested Ralph prompt
`$ralph implement .omx/plans/prd-deck-composer-tmp-design-port.md with .omx/plans/test-spec-deck-composer-tmp-design-port.md, preserving DeckView as library and DeckComposer as editor, using TMP/redesign/deck.jsx as the visual source reference.`
