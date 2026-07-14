# Trigger.dev Orchestration

Pindeck uses the V1SU4 self-hosted Trigger.dev control plane at
`https://trigger.v1su4.dev` and keeps a project separate from other workloads.

- Trigger project: `Pindeck`
- Project ref: `proj_znbdggczxwkeviflncnx`
- Dashboard: `https://trigger.v1su4.dev/orgs/v1su4-91d9/projects/pindeck-gT25`
- Platform, CLI, SDK, and build packages: `4.5.3`
- Task runtime: Bun (experimental), deployed Bun `1.3.3`

The self-hosted platform is pinned to `v4.5.3`, so Pindeck must not upgrade its
Trigger CLI or `@trigger.dev/*` packages independently. Upgrade the platform
images, CLI, SDK, and build package together.

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
smoke on VM100.

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
error, and update time for correlation with the Trigger dashboard. Every
callback includes its Trigger run ID and dispatch ID. Convex rejects a stale
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

Set in the Pindeck Trigger `prod` environment:

- `PINDECK_CONVEX_SITE_URL=https://convex-site.serving.cloud`
- `PINDECK_ORCHESTRATION_TOKEN=<private random token>`
- `FAL_KEY=<private FAL credential>`

Set in self-hosted Convex:

- `TRIGGER_API_URL=https://trigger.v1su4.dev`
- `TRIGGER_SECRET_KEY=<Pindeck production project key>`
- `PINDECK_ORCHESTRATION_TOKEN=<same private random token>`
- `PINDECK_TRIGGER_ORCHESTRATION_ENABLED=false` until deployment verification

Never expose these values to the browser or task payloads.

The durable BWS records live in project `hermes_keys`:

- `PINDECK_TRIGGER_API_URL`
- `PINDECK_TRIGGER_PROJECT_REF`
- `PINDECK_TRIGGER_PLATFORM_VERSION`
- `PINDECK_CONVEX_API_URL`
- `PINDECK_CONVEX_SITE_URL`
- `PINDECK_ORCHESTRATION_TOKEN`
- `PINDECK_TRIGGER_SECRET_KEY`
- `PINDECK_TRIGGER_ORCHESTRATION_ENABLED`
- `PINDECK_FAL_KEY`

Live Convex and Trigger environment values are runtime truth; BWS is the
durable secret/configuration source. Tracked files document names and endpoints
only.

## Bun and CLI commands

Pindeck uses Bun for dependencies and its deployed Trigger tasks. Trigger's
official [Bun guide](https://trigger.dev/docs/guides/frameworks/bun) says the
Trigger CLI itself does not support Bun, so `npx` is the one documented
exception to this repository's Bun package-execution policy. Do not use
`bunx --bun` for Trigger CLI commands.

```bash
bun install --frozen-lockfile
bun run trigger:dev
bun run trigger:deploy
```

VM100 pins host Bun `1.3.3` to match the deployed task runtime and uses the
current Node 24 LTS only for the Trigger CLI's required `npx` entrypoint. A
deployment dry-run must succeed on VM100 before production deployment:

```bash
bun run trigger:deploy -- --dry-run
```

Production deploys run from the Pindeck checkout on VM100 Linux. The script
logs into VM100's loopback-only registry and uses Trigger CLI 4.5.3's
`--local-build` flow, then pushes the emitted version tag into that registry,
so the task image is built by the same Linux Docker host that runs the Trigger
supervisor. Do not deploy from Docker Desktop: a Windows local
build can register and activate a version while leaving its image on the wrong
machine, after which VM100 dequeues runs but fails with `No such image`.
The Trigger personal access token is stored in BWS as
`TRIGGER_SELFHOSTED_PAT` and synced to the mode-`600` VM100 deployment env.
Registry credentials remain in the Trigger stack environment and are mirrored
in BWS as `TRIGGER_VM100_REGISTRY_USERNAME` and
`TRIGGER_VM100_REGISTRY_PASSWORD` for recovery and cross-checking.

Trigger CLI 4.5.3 prints the Bun experimental-runtime warning to stdout even
with `env get --raw`. Scripts comparing a value must select the final output
line; treating the entire stdout stream as the value creates a false mismatch.

## Deployment and verification

Current production state (2026-07-14):

- Convex callbacks/schema are deployed; all eight unauthenticated callback
  probes return `401` rather than `404`, including variation prepare, persist,
  and complete.
- Trigger deployment `20260714.1` / `srp5iee7` was built on VM100 Linux and
  exposes all six task IDs. The dashboard worker inventory is runtime truth.
- Metadata refresh, upload finalization, `removeMany`, external ingest, and
  media repair passed production end-to-end smokes. The successful media-repair
  run used the configured `medium-1x` allocation (1 vCPU / 2 GB RAM).
- `main` includes the complete orchestration integration and Trigger 4.5.3
  alignment at commit `eb43c53`;
  the matching Vercel production deployment completed successfully.
- The orchestration feature flag is `true`, and the live Convex Trigger API key
  and callback token match their BWS pointers.
- A one-image Discord production smoke completed through
  `pindeck-generate-variations` (`run_cmrjr6jvl000a3jt6034qxaef`): FAL returned
  one requested/one generated variation. The generated child persisted to
  RustFS with all three derivatives, then `pindeck-image-refresh`
  (`run_cmrjr789p000c3jt69ubu6fcg`) completed metadata and palette refresh.
- A two-item browser generation completed through parent run
  `run_cmrjv95bb000e3fn1anjwr7f0` and serialized child runs
  `run_cmrjv96z0000g3fn1c5o32q2m` and
  `run_cmrjv9wlv000j3fn1yr67a8y6`. Both generated children persisted to
  RustFS, returned real image reads, and appeared under the parent in Work
  Activity.

1. Confirm the self-hosted platform image is `v4.5.3` and the Pindeck CLI/SDK
   packages are `4.5.3`.
2. Confirm the three Trigger production environment variable names exist.
3. Keep the Convex feature flag `false`.
4. Deploy Convex callbacks and schema.
5. Verify every unauthenticated `/orchestration/*` callback returns `401`.
6. Run the Trigger deployment and confirm all six task IDs are registered.
7. Trigger one selected metadata refresh and verify Trigger run, callback,
   image metadata, and Convex orchestration state reach `completed`.
8. Enable `PINDECK_TRIGGER_ORCHESTRATION_ENABLED=true`.
9. Verify one direct upload and one external ingest end to end, including the
   original, preview, three derivatives, palette, metadata, and terminal run.
10. Keep the legacy flag rollback available until the production checks pass.

## Codex tooling

The official Trigger MCP server is installed in the user Codex configuration,
scoped to this project and self-hosted API. Restart Codex to load it. The
official Trigger skills are installed locally under `.agents/skills/`; their
API references resolve from the pinned `@trigger.dev/sdk` package.
