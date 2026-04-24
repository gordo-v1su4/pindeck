# Pindeck — Handoff Notes

**Last design session:** low on design minutes, so this file captures state + the next agent's queue.
**Live entry point:** `Pindeck.html` (open this — it loads all the .jsx files).

---

## What this is

A hi-fi design prototype for **Pindeck** — a film-reference image library + pitch-deck builder. Think: moodboard app → cinematic pitch decks. Pure HTML/React (Babel-in-browser) — no build step. All state is in React + `localStorage`.

## File map

| File | Purpose |
|---|---|
| `Pindeck.html` | Root document. Design tokens (`:root` CSS vars), font imports, script tags. **Edit tokens here.** |
| `app.jsx` | App shell: Sidebar, Topbar, view routing (`gallery` / `table` / `boards` / `deck`). Top-level state lives here. Also contains `BoardsView`. |
| `data.jsx` | Mock data: `IMAGES` array (18 images), `IMG()` Unsplash helper, `IMG2()` variation helper. |
| `views.jsx` | `Gallery`, `TableView`, `ImageDrawer` (detail drawer with Edit/Variations/Lineage tabs). |
| `parts.jsx` | Reusable: `Chip`, `Btn`, `Label`, `Sidebar`, `Topbar`, tokens/Tweaks panel. |
| `decks-gallery.jsx` | The "Decks" library — grid of 8 deck cards, clicking one sets `activeDeck` and opens the composer. |
| `deck.jsx` | `DeckComposerView` — left rail (deck name, image pool, color palette, overlay slider, style presets), main canvas that renders slides, present/PDF/reset. GSAP-style scroll interactions. |
| `Deck Composer.html` | **Legacy / optional:** deck composer only, implemented as one inline Babel bundle (duplicates the `deck.jsx` feature set). **Primary app** is `Pindeck.html`, which loads the shared `.jsx` files. Do not expect token/CSS parity with the unified shell unless you sync both manually. |

## Recent changes (this session)

1. **Decks library now shows 8 unique decks** (was 1 deck duplicated 8×). Each has its own `title`, `logline`, `character`, `subtitle`, `template`, `palette`, `imageSeed`. See `decks-gallery.jsx` → `DECK_PRESETS`.
2. **Composer pre-configures from clicked deck.** `DecksGallery` passes the whole preset object through `onOpen` → `setActiveDeck(preset)` → `<DeckComposerView deckMeta={preset}/>`. The composer reads `deckMeta` to seed its local state.
3. **Bug fix:** clicking "Decks" from the sidebar after viewing a composer no longer skips to the composer. `app.jsx` now clears `activeDeck` in a `useEffect` whenever `view !== "deck"` (see line ~320).
4. **Type weight softened.** `--ink` dropped from `#eef0f2` → `#c9ccd1` (board titles were too white/harsh). `--ink-mute` lifted from `0.42` → `0.56` alpha (sidebar section labels like STYLE/MEDIUM and FILTERS were getting lost). `--ink-faint` lifted from `0.24` → `0.30`. **All edits are in `Pindeck.html` lines ~25-28.**

## Open issues / next steps (in priority order)

### 1. Commit & push to `gordo-v1su4/pindeck`
I can only _read_ from GitHub in this environment — cannot push. **User needs to pull latest local, drop these files in, and push manually.** Changed files this session:
- `Pindeck.html` (token colors)
- `app.jsx` (activeDeck clear-on-leave)
- `decks-gallery.jsx` (unique deck presets — may already be committed)
- `deck.jsx` (reads `deckMeta` — may already be committed)

Suggested commit message:
```
feat(library): 8 unique deck presets + softer type scale

- DecksGallery seeds composer with per-deck title/logline/palette/template
- Clear activeDeck on sidebar navigation so Decks always lands on library
- Soften --ink from #eef0f2 → #c9ccd1 (board titles less harsh)
- Lift --ink-mute 0.42 → 0.56 (sidebar section labels readable)
```

### 2. Unsplash 404s (cosmetic)
Two image URLs 404 occasionally — `photo-1441829266145-6d4bfb7a3dd2` and `photo-1520637836862-4d197d17c962`. Swap them in `data.jsx` for stable IDs when convenient. Not blocking.

### 3. Dark-gray chip legibility (user feedback)
User flagged: in the right-side deck-gallery contact strip, dark-gray metadata text "gets a little lost." Worth auditing any remaining `var(--ink-faint)` usage on dark backgrounds in `decks-gallery.jsx` cards — bump to `--ink-mute` or add a subtle background chip.

### 4. Things user likes — keep
- **Blue accent** `#3a7bff` (the Generate button blue). Used for primary CTAs, selection outlines, focus rings. Don't change.
- **Present button** on composer works. **PDF export** button works.
- **Tweaks panel** works — toggle from toolbar. Exposes grain, density, accent color. Persists to localStorage.

## Conventions / gotchas

- **All style-objects are uniquely named** (e.g. `const tweakStyles = {...}`) — required because Babel files share window scope. Never write `const styles = {...}`.
- **Window-level exports:** at the bottom of each .jsx, `Object.assign(window, {...})` exposes components. When adding a new component, add it to the export block.
- **No build, no bundler.** Edit .jsx files → refresh browser → done. Don't introduce `import/export` syntax.
- **Fonts:** Geist + Geist Mono + Archivo Narrow. Already imported in `Pindeck.html` head.
- **View persistence:** `view` and `tweaks` are in `localStorage`. Clear with DevTools if stuck.
- **`activeDeck` is NOT persisted** — clearing it on view-change is intentional so re-entering "Decks" always starts at the library.

## If the user asks to...

| Request | Where to look |
|---|---|
| "Change the blue / accent color" | `Pindeck.html` → `--accent` |
| "Make titles bolder/softer" | `Pindeck.html` → `--ink` |
| "Add a deck to the library" | `decks-gallery.jsx` → push onto `DECK_PRESETS` |
| "Change a slide layout" | `deck.jsx` → template renderers (cinematic/editorial/etc) |
| "Add a filter chip" | `parts.jsx` → `Sidebar` component |
| "Composer's left rail" | `deck.jsx` → `DeckComposerLeftRail` |

Good luck 🎬
