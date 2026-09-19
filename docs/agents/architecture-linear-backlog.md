# Architecture tightening — Linear backlog

Tracked in Linear project **Pindeck** (V1su4). GitHub remains the default issue tracker for product work (`docs/agents/issue-tracker.md`); use these Linear issues for the 2026-09 architecture deepening pass.

| ID | Title | Status | URL |
|----|--------|--------|-----|
| **V1S-82** | [Arch] Pindeck codebase tightening — parent | Backlog | https://linear.app/v1su4/issue/V1S-82 |
| **V1S-83** | [Arch-1] Deepen application shell — extract from App.tsx | **Done** · [PR #35](https://github.com/gordo-v1su4/pindeck/pull/35) | https://linear.app/v1su4/issue/V1S-83 |
| **V1S-88** | [Arch-1b] App shell state hooks (view, filters, columns) | **Done** (merged to main) | https://linear.app/v1su4/issue/V1S-88 |
| **V1S-84** | [Arch-2] Split convex/images.ts by domain seam | **In progress** (combined PR, `gordo/v1s-84-85-arch-2-and-3`) | https://linear.app/v1su4/issue/V1S-84 |
| **V1S-85** | [Arch-3] Retire legacy ImageGrid + Radix TableView | **In progress** (combined PR, `gordo/v1s-84-85-arch-2-and-3`) | https://linear.app/v1su4/issue/V1S-85 |
| **V1S-86** | [Arch-4] Unify Trigger orchestration module interface | Backlog | https://linear.app/v1su4/issue/V1S-86 |
| **V1S-87** | [Arch-5] Storage-path adapter module (mediaStorage) | Backlog | https://linear.app/v1su4/issue/V1S-87 |

**Project:** https://linear.app/v1su4/project/pindeck-e51791bcf11f

## Order

1. **V1S-83** → **V1S-88** (same [Arch-1] theme; finish hooks after PR #35)
2. **V1S-85** can overlap with V1S-83/V1S-88
3. **V1S-84** → **V1S-86** → **V1S-87**

## Pickup checklist

1. Open the Linear issue (acceptance criteria + files).
2. Load `.agents/skills/implement/SKILL.md` or `docs/agents/matt-pocock-workflow.md` (do not search the repo for a missing plugin path).
3. `graft ask "<topic>" --source` or `graft skeleton <file>`.
4. Branch: use Linear’s suggested `gitBranchName` on the issue.
5. Matt flow: `/implement` on the ticket text, or `/grill-with-docs` if scope is fuzzy.
6. Close Linear issue when acceptance boxes are done; update this table if IDs change.

## V1S-83 / V1S-88 (Arch-1)

| Issue | What | Status |
|--------|------|--------|
| **V1S-83** | Topbar + Sidebar → `src/components/shell/` | Merged [PR #35](https://github.com/gordo-v1su4/pindeck/pull/35) |
| **V1S-88** | Shell state hooks (view, filters, columns) | Merged to `main` (`00b6973`) |

Close **V1S-83** when V1S-88 is done and acceptance criteria on both are met.

## V1S-84 (Arch-2)

Split `convex/images.ts` into [`convex/images/`](../../convex/images/):

| File | Responsibility |
|------|----------------|
| `index.ts` | Re-exports only — keeps `api.images.*` / `internal.images.*` |
| `library.ts` | list, aggregations, search, getById, getLineage, likes/views |
| `ingest.ts` | createExternal, ingestExternal, ingestExternalHttp |
| `moderation.ts` | pending queue, approve/deny, Discord HTTP |
| `lifecycle.ts` | delete, cleanup, media repair, backfill/quarantine |
| `uploads.ts` | upload URL, uploadMultiple, drafts/processing |
| `analysis.ts` | metadata refresh, AI status, orchestration claim/set |
| `generation.ts` | save generated children + artifact lookup |
| `shared.ts` | URL/storage/lineage helpers (no Convex wrappers) |

## V1S-85 (Arch-3)

Removed unused Radix `src/components/ImageGrid.tsx` + `src/components/TableView.tsx` and exclusive siblings (`ImageModal`, `EditImageModal`, `GenerateVariationsModal`, `CategoryFilter`). Production gallery/table remain `src/components/pd/GalleryView.tsx` + `src/components/pd/TableView.tsx`. Unique live behaviors (palette refresh, lineage, sref/originals filters, like/save-to-board) were already in pd; project-row dnd and `reExtractAll` “resample all” were dead-path-only and not ported.
