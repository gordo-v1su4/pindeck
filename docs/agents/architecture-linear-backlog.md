# Architecture tightening — Linear backlog

Tracked in Linear project **Pindeck** (V1su4). GitHub remains the default issue tracker for product work (`docs/agents/issue-tracker.md`); use these Linear issues for the 2026-09 architecture deepening pass.

| ID | Title | Status | URL |
|----|--------|--------|-----|
| **V1S-82** | [Arch] Pindeck codebase tightening — parent | Backlog | https://linear.app/v1su4/issue/V1S-82 |
| **V1S-83** | [Arch-1] Deepen application shell — extract from App.tsx | **Done** · [PR #35](https://github.com/gordo-v1su4/pindeck/pull/35) | https://linear.app/v1su4/issue/V1S-83 |
| **V1S-88** | [Arch-1b] App shell state hooks (view, filters, columns) | **Done** (merged to main) | https://linear.app/v1su4/issue/V1S-88 |
| **V1S-84** | [Arch-2] Split convex/images.ts by domain seam | Backlog | https://linear.app/v1su4/issue/V1S-84 |
| **V1S-85** | [Arch-3] Retire legacy ImageGrid + Radix TableView | Backlog | https://linear.app/v1su4/issue/V1S-85 |
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
