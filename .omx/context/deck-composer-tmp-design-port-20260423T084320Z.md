# Context Snapshot — deck-composer-tmp-design-port

- Date: 2026-04-23
- Branch: claude/redesign
- Trigger: User reported that the design-phase TMP deck builder work was not applied to the current app.

## Task statement
Revisit `TMP/redesign` and plan a corrective implementation that ports the high-fidelity deck builder design into production `DeckComposer`, while preserving the established product split:
- `DeckView` = deck library / selector
- `DeckComposer` = selected deck editor

## Desired outcome
- Production `DeckComposer` visually and behaviorally matches the TMP design direction: left rail, deck controls, slide/block system, scroll FX, present/export controls, and cinematic continuous deck canvas.
- Production `DeckView` remains the deck library/selector and does not absorb editor controls.
- No UI copy introduces a separate product name for the deck editor.
- Existing Convex deck data and Nextcloud/WebDAV media URLs continue to be used; no storage pipeline changes.

## Known evidence
- `TMP/redesign/HANDOFF.md` identifies the design prototype map and names `deck.jsx` as the core DeckComposer design.
- `TMP/redesign/deck.jsx` includes:
  - `TEMPLATES`
  - `FONT_FAMILIES`
  - `LAYOUT_VARIANTS`
  - `SCROLL_FX`
  - `DEFAULT_BLOCKS`
  - `DeckSidebar`
  - `Canvas`
  - `DeckPage`
  - `DeckBlock`
  - `PresentModal`
  - `VariantPanel`
  - `DeckComposerView`
- Current production `src/components/deck/DeckComposer.tsx` has some style/layout controls, but does not yet match the TMP builder layout or continuous deck page composition.
- Current production `DeckView` is already the correct selection/library layer.
- PR #24 exists and is draft; additional corrective commits can be added to the same branch/PR.

## Constraints
- No new dependencies unless explicitly requested.
- Preserve Convex as app/backend and Nextcloud/WebDAV as media object storage.
- Preserve current board → deck creation, deck selection, and `localStorage` draft continuity until a later persistence contract is executed.
- Do not render or introduce any separate editor/product name; use only `DeckView` and `DeckComposer` for those sections.
- Avoid a full rewrite unless the implementation is staged and behavior is protected by build/type verification.

## Likely code touchpoints
- `src/components/deck/DeckComposer.tsx`
- `src/components/deck/DeckSection.tsx`
- `src/components/deck/types.ts`
- `src/components/DeckView.tsx`
- `src/index.css`
- optional helper modules under `src/components/deck/`
- reference-only: `TMP/redesign/deck.jsx`, `TMP/redesign/decks-gallery.jsx`, `TMP/redesign/parts.jsx`, screenshots under `TMP/redesign/`

## Unknowns / open questions
- Whether all TMP slide kinds should ship in one pass or behind an incremental compatibility adapter.
- Whether production should keep the current block content schema and map TMP block kinds into it, or introduce a versioned composer view model.
- Whether present/export UI should be visually identical to TMP now or staged after canvas parity.
