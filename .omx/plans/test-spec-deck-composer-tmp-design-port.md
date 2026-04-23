# Test Spec — Port TMP deck builder design into DeckComposer

- Date: 2026-04-23
- Companion PRD: `.omx/plans/prd-deck-composer-tmp-design-port.md`

## Verification strategy

This is a visual/editor parity task. Static checks are required, but visual/manual verification against `TMP/redesign` is also required.

## Required command checks

- `bunx tsc -p . -noEmit --pretty false`
- `bunx tsc -p convex -noEmit --pretty false`
- `bun run build`
- `bun run lint`

## Audit checks

Run after implementation:

```bash
rg -n 'PitchCraft|pitch-deck|Commercial visual engine|Object.assign\(window|window\.Deck|Pindeck.html|Deck Composer.html' src/components/deck src/components/DeckView.tsx
```

Expected:
- no forbidden/prototype editor naming in production UI
- no Babel/global prototype patterns copied into production

## Manual visual checks

### DeckView
- Open Decks tab.
- Confirm it behaves as a deck library / selector.
- Confirm selecting a deck opens DeckComposer.

### DeckComposer shell
Compare against `TMP/redesign/Screenshot 2026-04-21 213337.png` and user screenshot:
- left rail exists
- deck name area exists
- image slots exist
- color palette strip exists
- overlay slider exists
- style/template controls exist
- scroll FX controls exist
- block list exists
- present/export/reset actions exist
- top strip has deck title, template, FX, block count, preview/present actions

### Canvas
- Hero/cold-open block renders near top.
- Logline/tone/character/reference blocks render in a continuous deck page.
- Images use real `deck.slides` URLs, not TMP hardcoded Unsplash fixtures.
- Fewer-than-10-image decks still render.
- Missing image data fails gracefully.

### Controls
- Template/style selection changes canvas palette/typography.
- Font selection changes canvas typography.
- Scroll FX selection is visible in the top strip and affects presentation/canvas behavior where implemented.
- Block visibility toggles affect canvas.
- Selected block variant controls affect selected block.

### Present/export
- Present opens a live deck view.
- Close returns to composer.
- PDF/export still works or fails with a clear toast; no silent breakage.

## Regression checks

- Board → deck creation still opens selected deck.
- Deck switching still works.
- Existing localStorage draft does not crash the new composer.
- No Convex schema changes were made.
- Nextcloud/WebDAV media URLs continue to render through existing image URL fields.

## Completion evidence

Implementation report must include:
- changed files
- which TMP features were ported
- any TMP features intentionally deferred
- command check results
- visual/manual checklist result
- remaining risks
