# Trigger.dev Orchestration

Pindeck uses the V1SU4 self-hosted Trigger.dev control plane at
`https://trigger.v1su4.dev`, but it must have a separate Trigger.dev project
from Project Stack Structure.

## Current first path

The first migrated workflow is image metadata refresh:

```text
Pindeck UI mutation
  -> tiny Convex dispatch action
  -> Trigger task pindeck-image-refresh
  -> protected Convex /orchestration/image-refresh callback
  -> existing palette extraction
  -> existing OpenRouter VLM metadata analysis
  -> Convex image status/result
```

The existing Convex scheduler path remains the default. The Trigger path is
used only when `PINDECK_TRIGGER_ORCHESTRATION_ENABLED=true` in the self-hosted
Convex environment.

## Queues

- `pindeck-analysis`: concurrency `2`
- `pindeck-media`: concurrency `2`
- `pindeck-generation`: concurrency `1`

Do not share these queues with Stack Structure. Pindeck needs independent
concurrency, retry, idempotency, and deployment history.

## Required secrets

Set these in the Pindeck Trigger production environment:

- `PINDECK_CONVEX_SITE_URL=https://convex-site.serving.cloud`
- `PINDECK_ORCHESTRATION_TOKEN=<private random token>`

Set these in self-hosted Convex:

- `TRIGGER_API_URL=https://trigger.v1su4.dev`
- `TRIGGER_SECRET_KEY=<Pindeck production project key>`
- `PINDECK_ORCHESTRATION_TOKEN=<same private random token>`
- `PINDECK_TRIGGER_ORCHESTRATION_ENABLED=false` initially

The browser must never receive any of these secret values.

## Deployment gate

Do not deploy this task or enable dispatch while `pve-node0` is failing memory
integrity tests. The code path is intentionally prepared but disabled until the
host passes offline Memtest86+, online `memtester`, and a large image hash/pull
verification.

After the hardware gate passes:

1. Create the `Pindeck` project in the V1SU4 Trigger.dev organization.
2. Put its project ref in local `TRIGGER_PROJECT_REF`.
3. Configure the production secrets above.
4. Run `bun run trigger:deploy`.
5. Confirm an unauthenticated callback returns `401`:

   ```bash
   curl -i -X POST https://convex-site.serving.cloud/orchestration/image-refresh
   ```

6. Trigger one manually selected image refresh and verify palette, metadata,
   terminal status, and idempotent replay in the Trigger.dev UI.
7. Set `PINDECK_TRIGGER_ORCHESTRATION_ENABLED=true` in Convex.
8. Run one UI refresh and verify the exact Trigger run before migrating media
   repair, external ingest, or FAL variation generation.

Never enable both the old heavy-work scheduler path and a second Trigger
dispatcher for the same request. The feature flag selects exactly one path.
Repeated identical refresh clicks are deduplicated for five minutes; later
explicit refreshes create a new run. A dispatch failure marks the image failed
instead of leaving it indefinitely in the processing state.
