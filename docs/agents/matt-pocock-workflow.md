# Matt Pocock engineering workflow (pindeck)

Pindeck uses **Matt Pocock skills** for product/engineering work (not pstack). Repo config: `docs/agents/issue-tracker.md`, `docs/agents/domain.md`.

## Skills in this repo

| Skill | Path |
|--------|------|
| **implement** | `.agents/skills/implement/SKILL.md` |

Other skills (`grill-with-docs`, `to-spec`, `to-tickets`, `tdd`, `code-review`, `diagnosing-bugs`, `improve-codebase-architecture`) ship with the **Matt Pocock Cursor/Claude plugin**. If a slash command is not attached in your session, follow the same rules below and the **Linear/GitHub ticket acceptance criteria**.

## `/implement` (default for tickets)

1. Read the ticket (Linear arch issues: `docs/agents/architecture-linear-backlog.md`).
2. Use **Graft** (`graft ask`, `graft skeleton`) before reading huge files.
3. **TDD** at agreed seams where practical; run `bun run build` and targeted tests during work; full test suite once at the end.
4. **Code-review** mindset before commit: standards + spec/ticket AC.
5. Commit on the ticket branch; do not mix unrelated refactors.

## Architecture / Linear tickets

- Parent epic: **V1S-82** · Active slice: **V1S-83** (app shell) unless another issue is named.
- New agent chat per ticket; paste issue ID + branch + acceptance criteria.

## Ask-matt map (quick)

- Fuzzy idea → `/grill-with-docs`
- Multi-session feature → `/to-spec` → `/to-tickets` → `/implement` (fresh chat per ticket)
- Bug → `/diagnosing-bugs` or GitHub issue + `/implement`
- Codebase health → `/improve-codebase-architecture` (then grill the chosen deepening)
