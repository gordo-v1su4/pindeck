# Pindeck Agent Instructions

## Package Manager

- Use Bun project-wide.
- Prefer `bun install`, `bun run <script>`, and `bunx <package>` for package execution.
- Do not introduce `npm`, `npx`, `yarn`, or `pnpm` commands unless a specific upstream tool cannot run through Bun; document the exception inline when that happens.
- Keep deployment commands aligned with Bun as well, including Vercel build commands and local scripts.

<!-- TRIGGER.DEV SKILLS START -->
## Trigger.dev agent skills

This project has Trigger.dev agent skills installed in `.agents/skills/`. Before writing or changing Trigger.dev code (background tasks, scheduled tasks, realtime, or chat.agent AI agents), load the most relevant skill: `trigger-authoring-chat-agent`, `trigger-authoring-tasks`, `trigger-chat-agent-advanced`, `trigger-cost-savings`, `trigger-getting-started`, `trigger-realtime-and-frontend`.
<!-- TRIGGER.DEV SKILLS END -->

<!-- graft:start -->
## Graft — repo context graph

This repo is indexed in `graft/`: small linked markdown nodes that explain each
system and carry exact file:line spans, kept in sync with the code through git.

For ANY task here — understanding how something works, finding where code lives,
or scoping a change — get context from the graph before grepping or opening
source files. Re-ask freely (it's cheap) and reuse literal identifiers you
already have (symbol, error string, file name) as the query. New to this repo?
Run `graft map` first — a token-budgeted orientation (dir clusters, hubs,
hotspots), no LLM, no key.

- Run `graft ask "<your question>" --source` → ranked nodes with the relevant
  code spans inlined (each hit's ≤8-line crux by default; `--full` for whole
  definitions when the crux isn't enough). Match the tool to the task shape:
  for understanding or editing, the top node IS the answer — cite its
  `covers:` file:line spans and edit straight from `--source`. For
  exhaustive tasks ("every occurrence / every caller of this pattern"), ranked
  results are top-N, not complete — run `graft grep "<literal>"` instead
  (exhaustive over indexed files, grouped by enclosing symbol), falling back
  to raw `grep -rn` only for unindexed files.
- `graft skeleton <file>` → every definition's signature + span, ~10× cheaper
  than reading the file; use it to skim an API surface.
- `graft callers <symbol>` gives precomputed, exact edges — who calls this.
  Add `--direction out` for what it calls, or `--depth N` to walk
  transitively for the full blast radius. For structural questions, skip
  ranking and use this directly.
- Or browse: `graft/INDEX.md` lists every node; follow the links.
- Monorepos and folders of multiple repos rank fairly across sub-projects —
  hits carry `[scope/]` labels naming which one they're from. Narrow with
  `graft ask "<task>" --in <scope>/` once you know where you're working.

If a returned span is truncated ("+N more lines"), open the file at that exact
range before finalizing. Only open source files when a node genuinely lacks a
needed detail, and then at the exact file:line the node points to — never
re-read whole files.

After big code changes, refresh the graph with `graft build` (deterministic,
no API key, $0).
<!-- graft:end -->

## Agent skills

### Issue tracker

GitHub Issues in `gordo-v1su4/pindeck` (`gh` CLI). See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context: `CONTEXT.md` and `docs/adr/` at repo root when present. See `docs/agents/domain.md`.

### Matt Pocock engineering

Workflow map + `/implement` fallback: `docs/agents/matt-pocock-workflow.md`. Vendored skill: `.agents/skills/implement/SKILL.md`.

### Architecture backlog (Linear)

Codebase deepening (2026-09): Linear project **Pindeck**, parent **V1S-82**. Index: `docs/agents/architecture-linear-backlog.md`. **Start:** V1S-83 (App shell).

## Learned User Preferences

- When the user explicitly approves finished work, commit and push directly to `main` without opening a PR unless they ask for one.
- Verify UI changes in Cursor’s native browser (or Playwright) with the dev server running and Convex-backed data loaded before calling a slice done.
- Compare local UI to the published reference at https://pindeck-754f.vercel.app/ when porting or aligning redesign work.
- Persist app-facing state in Convex; use object storage (RustFS/S3) for media, not UI preferences or composer state in `localStorage`.
- Port redesign work surgically—keep existing backend wiring; avoid replacing working Convex integration while changing frontend layout.
- Use `bun` / `bunx` for repo and global CLIs (e.g. Graft); for MCP server launcher `command` entries, prefer `npx` over `bunx` because Bun often breaks MCP binaries.
- Feature-branch large UI overhauls when scope diverges sharply from `main`; merge only after browser verification against the reference deployment.
- Hide Google/GitHub sign-in unless OAuth providers and env secrets are fully configured; email/password and guest sign-in are the supported paths.
- Prioritize Graft on large, complicated codebases first; plan to add Graft to every new app from the beginning over time.
- Reload Cursor (Developer: Reload Window) only after changing `.cursor/mcp.json` or when Graft MCP fails—not after `bun run graft:build` or other local graph updates.
- On pindeck, use **Matt Pocock engineering skills** (`/grill-with-docs`, `/to-spec`, `/to-tickets`, `/implement`, `/diagnosing-bugs`, etc.) and `docs/agents/*`—not the **pstack** marketplace plugin (`/poteto-mode`).

## Learned Workspace Facts

- Frontend dev server: `bun run dev:frontend` at http://localhost:4000.
- Production Convex deployment target is `tremendous-jaguar-953` (enforced by `scripts/enforce-production-convex.sh` and CI `check:prod-target`).
- Deck gallery/composer UI follows the `claude/redesign` stack (`DeckView`, `src/components/deck/*`); Tweaks `--pd-accent*` tokens style composer chrome, not slide canvas content.
- Dominant palette swatches come from `images.colors` (and client extraction) across gallery, table, and deck library previews.
- Sign-in UI exposes email/password and guest only when Google/GitHub OAuth is not configured.
- Graft is per-repo: add `@nanonets/graft` as a devDependency with tree-sitter packages in `trustedDependencies`, keep `graft/` gitignored, run `bunx graft init --yes` once; after clone or large edits run `bunx graft build` (prefer `bunx graft mcp` in `.cursor/mcp.json` over a global `graft` binary). Reference wiring: **zig-swap** (https://github.com/gordo-v1su4/zig-swap) uses a global `graft` CLI and committed Cursor/hooks only; pindeck uses devDependency + `bunx` MCP so `bun install` suffices on fresh clones.
