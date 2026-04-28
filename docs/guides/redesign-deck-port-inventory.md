# Deck UI: `main` vs `claude/redesign` (inventory)

Snapshot against merge-base with `origin/claude/redesign` (`HEAD...claude/redesign`).

## Summary

| Area | Current `main` | `claude/redesign` | Notes |
|------|----------------|-------------------|--------|
| Composer entry | `src/components/pd/deck/DeckComposer.tsx` (lazy from App) | `src/components/deck/DeckComposer.tsx` | Large diff; redesign stacks pitch-deck TMP patterns + `DeckCanvasPage` |
| Deck shell | `pd/deck/` only | Adds `deck/DeckComposer.tsx`, `deck/DeckCanvasPage.tsx`, `deck/DeckSection.tsx` | Port layout/present/export UX selectively; preserve Convex-backed `deckId` hydration |
| App composition | Unified `Sidebar`/`Topbar` in `src/App.tsx` | Would replace with optional `PdShell` + sidebar categories (**not ported** here) |

## Diff magnitude (automated stat)

Approximate churn when comparing branches (files under `deck/` + `App`):

- `src/components/deck/DeckComposer.tsx` — substantial rewrite (+/- lines)
- `src/components/deck/DeckCanvasPage.tsx` — present in redesign
- `src/components/deck/DeckSection.tsx` — variant updates
- `src/App.tsx` — routing/shell divergence

Use this doc as follow-up backlog: pull **presentation mode**, **PDF/export chrome**, **block rails** only after Convex contracts are mapped.
