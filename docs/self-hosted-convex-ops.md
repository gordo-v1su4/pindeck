# Self-Hosted Convex Ops

Pindeck production uses a self-hosted Convex stack on the Hostinger VPS at
`serving.cloud`. This file is safe to check in: it documents hostnames,
container names, and commands only. Do not add secret values, admin keys,
tokens, webhook URLs, or raw verbose deploy output here.

## Production Targets

| Role | URL |
| --- | --- |
| Convex API | `https://convex.serving.cloud` |
| Convex HTTP actions | `https://convex-site.serving.cloud` |
| Convex dashboard | `https://convex-dashboard.serving.cloud` |

Local and Vercel production deploys should use:

```bash
VITE_CONVEX_URL=https://convex.serving.cloud
VITE_CONVEX_SITE_URL=https://convex-site.serving.cloud
CONVEX_SELF_HOSTED_URL=https://convex.serving.cloud
```

`CONVEX_SELF_HOSTED_ADMIN_KEY` must be present in the local shell or Vercel
environment for deployments, but never commit or print its value.

## SSH Access

Use the existing Hostinger SSH key:

```bash
ssh -i ~/.ssh/hostinger-vps root@serving.cloud
```

Useful containers:

```text
convex-wv5d-backend-1
convex-wv5d-dashboard-1
traefik-7ilq-traefik-1
```

## Health Checks

The canonical runbook lives in the sibling infrastructure repository:

```bash
cd ~/Documents/Github/proxmox-home
./scripts/check-hostinger-convex.sh
```

Expected results:

```text
API           HEAD expected=200        actual=200 OK
HTTP_ACTIONS  POST expected=200 401 404 actual=401 OK
DASHBOARD     HEAD expected=200        actual=200 OK
```

Manual checks from this repo:

```bash
curl -I https://convex.serving.cloud/version
curl -X POST -I https://convex-site.serving.cloud/ingestExternal
curl -I https://convex-dashboard.serving.cloud
```

`/ingestExternal` returning `401` without auth is healthy; it means the HTTP
action host is reachable and the route is protected.

## Logs

Recent Convex backend logs:

```bash
ssh -i ~/.ssh/hostinger-vps root@serving.cloud \
  'docker logs --since 30m convex-wv5d-backend-1 2>&1 | tail -200'
```

Recent Convex warnings/errors:

```bash
ssh -i ~/.ssh/hostinger-vps root@serving.cloud \
  'docker logs --since 30m convex-wv5d-backend-1 2>&1 | grep -Ei "ERROR|WARN|panic|failed|exception|uncaught" | tail -100'
```

Recent Traefik entries related to Convex:

```bash
ssh -i ~/.ssh/hostinger-vps root@serving.cloud \
  'docker logs --since 30m traefik-7ilq-traefik-1 2>&1 | grep -Ei "convex|serving.cloud|error|warn|acme|router" | tail -200'
```

Container health:

```bash
ssh -i ~/.ssh/hostinger-vps root@serving.cloud \
  'docker inspect --format "{{.State.Health.Status}}" convex-wv5d-backend-1'
```

## Convex CLI Checks

Run Convex CLI commands from the Pindeck repo with the self-hosted environment
loaded:

```bash
set -a
source .env.local
set +a
bunx convex run images:libraryAggregations
```

For deploy analysis, avoid `--verbose` unless you are sure output will stay
local and private. Verbose Convex deploy output can include deployment
environment variable values.

Safe-ish dry run:

```bash
set -a
source .env.local
set +a
bunx convex deploy --dry-run --typecheck disable --codegen disable
```

Do not use `--prod` with this self-hosted target; the Convex CLI rejects it for
self-hosted deployments. The production target is selected by
`CONVEX_SELF_HOSTED_URL` and `CONVEX_SELF_HOSTED_ADMIN_KEY`.

## Deployment Notes

Pushing to `main` triggers Vercel. Vercel runs `bun run build`, which runs
`scripts/build.sh`; in Vercel, that wrapper runs:

```bash
bunx convex deploy --cmd 'bun run build:frontend'
```

That is the intended path for updating Convex functions and the frontend from a
single push. There should not be a separate GitHub Actions Convex deployment.

## Backend Container Version Policy

Convex self-hosted does not currently expose separate production/LTS/canary
Docker channels for this stack. Use GitHub release metadata to distinguish
normal releases from prereleases, and treat prerelease tags as test-only unless
there is a specific reason to use one.

The upstream Docker compose example uses
`ghcr.io/get-convex/convex-backend:latest` and
`ghcr.io/get-convex/convex-dashboard:latest`, but also notes that these can be
pinned to a specific revision.

For Pindeck production, treat `latest` as a discovery channel, not as an
automatic upgrade policy:

1. Record the currently running image IDs before any change.
2. Check upstream releases and tags in `get-convex/convex-backend`.
3. Prefer the latest non-prerelease GitHub release unless a release note,
   self-hosted issue, or Discord `#self-hosted` thread says to avoid it.
4. Pin both backend and dashboard images in `/docker/convex-wv5d/docker-compose.yml`
   to the chosen release tag or digest before upgrading.
5. Export Convex data before upgrading.
6. Upgrade during a quiet window, then watch backend logs for migration
   completion lines and errors.
7. Run the health checks in this file and a real Pindeck browser smoke test.

Check current running images:

```bash
ssh -i ~/.ssh/hostinger-vps root@serving.cloud \
  'docker compose -f /docker/convex-wv5d/docker-compose.yml images'
```

Compare local `latest` with the currently published `latest` digest:

```bash
ssh -i ~/.ssh/hostinger-vps root@serving.cloud \
  'docker image inspect ghcr.io/get-convex/convex-backend:latest --format "{{json .RepoDigests}}"'

ssh -i ~/.ssh/hostinger-vps root@serving.cloud \
  'docker manifest inspect ghcr.io/get-convex/convex-backend:latest | jq -r ".manifests[]? | select(.platform.architecture==\"amd64\" and .platform.os==\"linux\") | .digest"'
```

Check compose image tags:

```bash
ssh -i ~/.ssh/hostinger-vps root@serving.cloud \
  'grep -n "image: ghcr.io/get-convex/convex-" /docker/convex-wv5d/docker-compose.yml'
```

Current upstream release check:

```bash
curl -s https://api.github.com/repos/get-convex/convex-backend/releases/latest \
  | jq -r '{tag_name, prerelease, published_at, name}'
```

Review recent releases:

```bash
curl -s 'https://api.github.com/repos/get-convex/convex-backend/releases?per_page=10' \
  | jq -r '.[] | [.tag_name, .prerelease, .published_at, .name] | @tsv'
```

Upgrade when one of these is true:

- A release fixes a self-hosted bug or security issue relevant to Pindeck.
- The Convex CLI/client package needed by this repo expects a newer backend.
- Current backend logs show a warning/error pattern that is fixed upstream.
- We are intentionally doing scheduled maintenance and can export, upgrade, and
  verify in one controlled window.

Do not upgrade only because `latest` moved. A moving tag is not a stability
signal.

Upgrade commands, after choosing and pinning an image:

```bash
set -a
source .env.local
set +a
bunx convex export --path /tmp/pindeck-convex-export.zip

ssh -i ~/.ssh/hostinger-vps root@serving.cloud \
  'docker compose -f /docker/convex-wv5d/docker-compose.yml pull && docker compose -f /docker/convex-wv5d/docker-compose.yml up -d'
```

The official self-hosted upgrade guidance says backend upgrades may run
underlying database migrations. Watch for migration log lines such as
`Executing Migration ...` and `MigrationComplete(...)`; if an in-place upgrade is
not smooth, use the export/import path instead.

## Known Warning Pattern

During deployment, the Hostinger backend logs may show deploy-analyzer warnings
if Convex cannot statically resolve HTTP routes, for example:

```text
WARN isolate::environment::analyze: Failed to resolve http.js:/ingestExternal
```

Treat those as cleanup targets, not automatic outages. Confirm runtime health
with:

```bash
curl -X POST -I https://convex-site.serving.cloud/ingestExternal
bunx convex run images:libraryAggregations
```

If `/ingestExternal` returns `401`, the route is reachable and protected. This
repo keeps `httpRouter()` construction directly in `convex/http.ts` so the HTTP
entrypoint follows the conventional Convex shape. If these warnings persist
despite that shape, compare the local Convex CLI version, the deployed function
version, and the Hostinger backend image digest. Consider a pinned
backend/dashboard upgrade only in a planned maintenance window with an export
and rollback path.
