# Architecture tightening — Linear backlog

Tracked in Linear project **Pindeck** (V1su4). GitHub remains the default issue tracker for product work (`docs/agents/issue-tracker.md`); use these Linear issues for the 2026-09 architecture deepening pass.

| ID | Title | Status | URL |
|----|--------|--------|-----|
| **V1S-82** | [Arch] Pindeck codebase tightening — parent | Backlog | https://linear.app/v1su4/issue/V1S-82 |
| **V1S-83** | [Arch-1] Deepen application shell — extract from App.tsx | **Done** · [PR #35](https://github.com/gordo-v1su4/pindeck/pull/35) | https://linear.app/v1su4/issue/V1S-83 |
| **V1S-88** | [Arch-1b] App shell state hooks (view, filters, columns) | **Done** (merged to main) | https://linear.app/v1su4/issue/V1S-88 |
| **V1S-84** | [Arch-2] Split convex/images.ts by domain seam | **Done** · [PR #38](https://github.com/gordo-v1su4/pindeck/pull/38) (`c5d2aa6`) | https://linear.app/v1su4/issue/V1S-84 |
| **V1S-85** | [Arch-3] Retire legacy ImageGrid + Radix TableView | **Done** · [PR #38](https://github.com/gordo-v1su4/pindeck/pull/38) | https://linear.app/v1su4/issue/V1S-85 |
| **V1S-86** | [Arch-4] Unify Trigger orchestration module interface | **Done** · [PR #39](https://github.com/gordo-v1su4/pindeck/pull/39) | https://linear.app/v1su4/issue/V1S-86 |
| **V1S-87** | [Arch-5] Storage-path adapter module (mediaStorage) | **Done** · [PR #39](https://github.com/gordo-v1su4/pindeck/pull/39) | https://linear.app/v1su4/issue/V1S-87 |

**Project:** https://linear.app/v1su4/project/pindeck-e51791bcf11f

## Order

1. **V1S-83** → **V1S-88** (done)
2. **V1S-85** + **V1S-84** (done together, PR #38)
3. **V1S-86** + **V1S-87** (this combined PR)

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
| `analysis.ts` | metadata refresh, AI status (orchestration lease lives in `orchestrationState.ts`) |
| `generation.ts` | save generated children + artifact lookup |
| `shared.ts` | URL/storage/lineage helpers (no Convex wrappers) |

### Greptile on PR #38 (verbatim)

Threads: [`.filter`](https://github.com/gordo-v1su4/pindeck/pull/38#discussion_r4051866483) · [`.collect`](https://github.com/gordo-v1su4/pindeck/pull/38#discussion_r4051866852) · [`ctx` types](https://github.com/gordo-v1su4/pindeck/pull/38#discussion_r4051865583). Same text is on Linear **V1S-84**.

1. **`.filter` status (withdrawn as merge blocker):** *“That’s a valid scope distinction. For `library.list`, the `withIndex` calls already cover the available `group`/`category` predicates, while the status predicate must currently preserve legacy rows where `status` is `undefined`. Moving it to post-`take()` filtering would change pagination and could allow pending rows to consume the page, so this is not a safe change for the split PR. I’m withdrawing this as a merge blocker for the file split; status backfill plus a status index can be handled in the follow-up ticket.”*
2. **`.collect` aggregations (withdrawn as merge blocker):** *“You’re right. Because `libraryAggregations` returns exact totals across the full active library, adding `.take()` or cursor pagination here would produce incorrect counts unless the aggregation were accumulated across every page. The `by_status` index/backfill is the appropriate follow-up for making this scalable, and it’s out of scope for this refactor. I’m withdrawing this as a merge blocker for `libraryAggregations`.”*
3. **`ctx: any`:** fixed in `27bb6e4` (`MutationCtx` / `QueryCtx`). Greptile marked the note **addressed**; no further bot reply.

**Follow-up (not V1S-86):** backfill omitted `images.status` → `"active"` and add `by_status`. Needs a Convex schema deploy. Do not fold into Trigger orchestration.

## V1S-86 (Arch-4)

Orchestration interface:

| File | Responsibility |
|------|----------------|
| `orchestrationSeam.ts` | HTTP/worker path constants (Convex isolate-safe) |
| `orchestrationCore.ts` | Idempotency keys, dispatch IDs, terminal status (Node) |
| `orchestrationState.ts` | Lease claim + status mutations |
| `triggerDispatch.ts` | Trigger SDK `tasks.trigger` only |
| `orchestration.ts` | Protected HTTP callbacks |

Trigger task **payloads** are unchanged, so already-deployed workers stay compatible until you ship new bundles. After merging worker changes that import `orchestrationSeam`, run `bun run trigger:deploy` (see `proxmox-home/docs/triggerdev-vm100-runbook.md`). Convex backend changes deploy with `bun run deploy:convex` after loading self-hosted env (see `proxmox-home/docs/hostinger-convex-runbook.md`).

## V1S-87 (Arch-5)

[`convex/lib/mediaAdapter.ts`](../../convex/lib/mediaAdapter.ts) is the path/URL interface (`normalizeStoragePath`, RustFS / Nextcloud / Convex adapters). [`convex/mediaAdapter.ts`](../../convex/mediaAdapter.ts) re-exports it. [`convex/mediaStorage.ts`](../../convex/mediaStorage.ts) stays the Node upload/cleanup actions; host checks in [`convex/images/shared.ts`](../../convex/images/shared.ts) go through the adapter. Unit tests live in [`convex/lib/mediaAdapter.test.ts`](../../convex/lib/mediaAdapter.test.ts).

## V1S-85 (Arch-3)

Removed unused Radix `src/components/ImageGrid.tsx` + `src/components/TableView.tsx` and exclusive siblings (`ImageModal`, `EditImageModal`, `GenerateVariationsModal`, `CategoryFilter`). Production gallery/table remain `src/components/pd/GalleryView.tsx` + `src/components/pd/TableView.tsx`. Unique live behaviors (palette refresh, lineage, sref/originals filters, like/save-to-board) were already in pd; project-row dnd and `reExtractAll` “resample all” were dead-path-only and not ported.
