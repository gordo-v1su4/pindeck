# Trigger.dev Orchestration

**Where workers run:** a dedicated Linux host with Trigger.dev workers. Deploy with `bun run trigger:deploy` from a checkout of this repo (see [`docs/architecture/platform-topology.md`](architecture/platform-topology.md)).

Pindeck uses a **self-hosted Trigger.dev** control plane (`TRIGGER_API_URL`, `TRIGGER_PROJECT_REF` in env). SDK/CLI version is pinned in `package.json`.

## Workflows

Convex remains the canonical image database and RustFS remains durable storage.
Trigger owns the long-running orchestration and calls protected Convex HTTP
actions to perform work with the existing backend implementation.

| Task                              | Queue                              | Entry points                                            | Callback                                                |
| --------------------------------- | ---------------------------------- | ------------------------------------------------------- | ------------------------------------------------------- |
| `pindeck-finalize-upload`         | `pindeck-media`                    | Browser and deck uploads, failed-upload retry           | `/orchestration/media-finalize`                         |
| `pindeck-external-ingest`         | `pindeck-media`                    | Discord bot, Pinterest sidecar, `/ingestExternal`       | `/orchestration/external-ingest`                        |
| `pindeck-media-repair`            | `pindeck-media`                    | Single and bulk media regeneration                      | `/orchestration/media-repair`                           |
| `pindeck-image-refresh`           | `pindeck-analysis`                 | Manual refresh, moderation approval, generated children | `/orchestration/image-refresh`                          |
| `pindeck-generate-variations`     | `pindeck-generation-orchestration` | UI and Discord variation requests                       | `/orchestration/generate-variations/{prepare,complete}` |
| `pindeck-generate-variation-item` | `pindeck-generation`               | Parent fan-out, one FAL render per run                  | `/orchestration/generate-variations/persist`            |

The production flow is:

```text
Pindeck mutation or ingest HTTP action
  -> small Convex dispatch action
  -> Trigger task with queue, retry cap, tags, metadata, and idempotency key
  -> protected Convex callback or preparation step
  -> media gateway / RustFS / palette / OpenRouter work
  -> Convex image and orchestration terminal state
```

Variation generation deliberately has a parent and a child task. The parent
prepares an ownership-checked Convex request, then triggers and waits for one
`pindeck-generate-variation-item` child at a time. Each child submits exactly
one FAL request and persists exactly one durable artifact through the protected
Convex endpoint. The render queue has concurrency `1`, so requests from
different parents are serialized as well as the children within one parent.
Convex remains authoritative for ownership, lineage, artifact idempotency,
database state, and RustFS persistence.

`PINDECK_TRIGGER_ORCHESTRATION_ENABLED` selects exactly one path. When it is
`true`, heavy jobs dispatch to Trigger. When it is `false`, the legacy Convex
scheduler path remains available for rollback.

## Queues and failure policy

- `pindeck-analysis`: concurrency `2`
- `pindeck-media`: concurrency `2`
- `pindeck-generation-orchestration`: concurrency `2`
- `pindeck-generation`: concurrency `1`

All Pindeck tasks use the `medium-1x` machine preset (1 vCPU, 2 GB RAM). The
default `small-1x` preset has only 0.5 GB RAM; the self-hosted Bun 1.3.3 worker
committed about 1 GB at startup and crashed with `SIGILL` before media-repair
task code ran. Do not reduce the preset without a production Bun cold-start
smoke on the worker host.

Network, rate-limit, and server failures retry with capped exponential backoff.
Permanent media failures such as source `404`, invalid image, unsupported
media, or missing row abort without wasting retries. Paid FAL item runs have
one attempt because a replay after provider acceptance could duplicate a
charge. Persistence uses a stable generation artifact key so a repeated
callback cannot create a second Convex child or durable object.

Dispatches use a one-hour Convex deduplication window. Convex atomically claims
a request digest and assigns a nonce-derived dispatch correlation ID before it
calls Trigger. That dispatch ID is also the Trigger idempotency key, closing the
race between a fast task callback and the returned Trigger run ID while still
allowing the same operation to be run again after the one-hour window. A
different dispatch cannot replace an image while its current claim has a live
lease. The lease lasts 15 minutes and is refreshed by guarded progress updates.
Before reclaiming an expired lease with a stored run ID, the dispatch action
retrieves that run from Trigger: queued or executing work has its lease renewed,
while only a missing run or confirmed terminal run can proceed through recovery.
This prevents both permanent pre-callback locks and replacement of healthy work
waiting behind a queue backlog.

The image row stores `orchestrationRunId`, dispatch ID, request digest, claim
time, lease expiry, task, status, retry-safe progress, cached callback output,
error, and update time for correlation with the Trigger dashboard. Lease claim
and status writes live in [`convex/orchestrationState.ts`](../convex/orchestrationState.ts).
Idempotency keys, dispatch IDs, and terminal status mapping live in
[`convex/orchestrationCore.ts`](../convex/orchestrationCore.ts) (Node-only).
The HTTP callback seam lives in
[`convex/orchestrationSeam.ts`](../convex/orchestrationSeam.ts)
([`convex/http.ts`](../convex/http.ts) and `src/trigger/*`).
[`convex/triggerDispatch.ts`](../convex/triggerDispatch.ts) is the Trigger SDK
dispatch layer only. Do not duplicate `ORCHESTRATION_HTTP_SEAM` /
`ORCHESTRATION_WORKER_PATHS` path strings. Task payloads are unchanged, but
after merging worker imports of `orchestrationSeam`, run `bun run trigger:deploy`
so the worker host runs the updated task bundle (keep runbooks private).

Every callback includes its Trigger run ID and dispatch ID. Convex rejects a stale
callback if a newer run owns the row, applies orchestration and AI status
atomically, checkpoints completed side effects before the next step, and
returns the cached terminal result when Trigger retries after a lost HTTP
response.

## Realtime Work Activity

Every dispatch includes exactly one `user:<convexUserId>` tag plus task and
image correlation tags. The authenticated Convex
`triggerDispatch.createWorkActivityToken` action issues a 15-minute Trigger
public token whose read scope contains only the current user's tag. The
frontend refreshes that token before expiry and subscribes through
`@trigger.dev/react-hooks@4.5.3` against the self-hosted Trigger base URL.

The Work Activity pop-down shows the last 24 hours and groups render-item runs
beneath their generation parent. Task metadata uses `stage`, `stageLabel`,
`progressMode`, item totals, provider status, and a safe provider message.
Exact percentages are displayed only for measurable item counts. Provider
work without a measurable percentage remains indeterminate. Queue wait,
runtime, and total duration are computed from Trigger timestamps; active runs
continue advancing even when Trigger temporarily reports `durationMs: 0`.

## Required environment

Set in the Pindeck Trigger `prod` environment (values in `.env.local` / secret store, not in git):

- `PINDECK_CONVEX_SITE_URL=`
- `PINDECK_ORCHESTRATION_TOKEN=`
- `FAL_KEY=`

Set in self-hosted Convex:

- `TRIGGER_API_URL=`
- `TRIGGER_SECRET_KEY=`
- `PINDECK_ORCHESTRATION_TOKEN=` (same token as Trigger env)
- `PINDECK_TRIGGER_ORCHESTRATION_ENABLED=false` until deployment verification

Never expose these values to the browser or task payloads. Store filled-in values in `.env.local` or your team secret manager; tracked files list names only.

## Bun and CLI commands

Pindeck uses Bun for dependencies and deployed Trigger tasks. The Trigger CLI is invoked via `npx` (see Trigger's [Bun guide](https://trigger.dev/docs/guides/frameworks/bun)).

```bash
bun install --frozen-lockfile
bun run trigger:dev
bun run trigger:deploy
```

Dry-run before production deploy:

```bash
bun run trigger:deploy -- --dry-run
```

Run production deploys from the Linux worker host that runs Trigger workers and can push task images to your registry. Avoid deploying from a mismatched machine where the supervisor cannot pull the built image.

## Deployment and verification

1. Align Trigger platform version with pinned `@trigger.dev/sdk` in `package.json`.
2. Set Trigger and Convex orchestration env vars (see `.env.example`; values in `.env.local`).
3. Keep `PINDECK_TRIGGER_ORCHESTRATION_ENABLED=false` until callbacks are verified.
4. Deploy Convex (`bun run deploy:convex`).
5. Verify unauthenticated `/orchestration/*` probes return `401` (see `scripts/e2e-production-smoke.sh`).
6. Deploy Trigger tasks (`bun run trigger:deploy`) and confirm all task IDs register.
7. Smoke metadata refresh, upload finalize, and external ingest end to end.
8. Enable `PINDECK_TRIGGER_ORCHESTRATION_ENABLED=true` when ready.
9. Keep the legacy scheduler path available for rollback until smokes pass.

## Codex tooling

The official Trigger MCP server is installed in the user Codex configuration,
scoped to this project and self-hosted API. Restart Codex to load it. The
official Trigger skills are installed locally under `.agents/skills/`; their
API references resolve from the pinned `@trigger.dev/sdk` package.
