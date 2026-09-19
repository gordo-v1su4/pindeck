---
name: implement
description: "Implement a piece of work based on a spec or set of tickets."
disable-model-invocation: true
---

Implement the work described by the user in the spec or tickets.

Use /tdd where possible, at pre-agreed seams.

Run typechecking regularly, single test files regularly, and the full test suite once at the end.

Once done, use /code-review to review the work.

Commit your work to the current branch.

## Pindeck

- Ticket context: `docs/agents/architecture-linear-backlog.md` (Linear) or GitHub issues per `docs/agents/issue-tracker.md`.
- Orientation: Graft before grepping (`graft ask`, `graft skeleton`).
- UI verification: `bun run dev:frontend`, compare to https://pindeck-754f.vercel.app/ when changing library/deck UI.
- Bun only for scripts (`AGENTS.md`).
