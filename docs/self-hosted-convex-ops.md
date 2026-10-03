# Self-Hosted Convex Ops

Patterns for **Pindeck on self-hosted Convex**. Platform roles: [`docs/architecture/platform-topology.md`](architecture/platform-topology.md). Do not put deployment URLs or secrets in this file.

Set Convex URLs and admin keys in **`.env.local`** (git-ignored). See `.env.example` for variable names.

```bash
VITE_CONVEX_URL=
VITE_CONVEX_SITE_URL=
CONVEX_SELF_HOSTED_URL=
PINDECK_CONVEX_SELF_HOSTED_ADMIN_KEY=
```

Never commit or print admin keys.

## Health checks (Pindeck repo)

```bash
./scripts/check-pindeck-convex.sh
```

Expected pattern from the script: API reachable, HTTP actions return `401` on protected routes without auth, dashboard reachable.

Manual probes (substitute your configured HTTP site URL):

```bash
curl -I "$VITE_CONVEX_URL/version"
curl -X POST -I "${VITE_CONVEX_SITE_URL}/ingestExternal"
```

`/ingestExternal` returning `401` without a Bearer token is healthy.

## Logs and containers

On the machine that runs your Convex Docker stack, inspect backend and reverse-proxy logs with your usual SSH or host tooling. Container names depend on your Compose project name (often something like `*-convex-backend-1`).

Keep host-specific compose paths, SSH users, and volume names in private ops notes, not in this repository.

## Convex CLI checks

From the Pindeck repo with env loaded from `.env.local`:

```bash
set -a
source .env.local
set +a
bunx convex run images:libraryAggregations
```

Safe dry run:

```bash
bunx convex deploy --dry-run --typecheck disable --codegen disable
```

Do not use `--prod` with self-hosted targets. Production is selected by `CONVEX_SELF_HOSTED_URL` and admin key env vars.

## Deployment notes

Pushing to `main` can trigger Vercel. When deploy secrets are configured, the build wrapper may run `bunx convex deploy` before the frontend build. There should not be a separate GitHub Actions Convex deployment unless your team adds one.

## Backend image upgrades

Self-hosted Convex runs as Docker images (backend + dashboard). Upgrade policy:

1. Export data before major upgrades (`bunx convex export`).
2. Pin image tags or digests in your Compose file rather than blindly tracking `latest`.
3. Prefer upstream non-prerelease releases unless you have a documented reason otherwise.
4. After upgrade, run `./scripts/check-pindeck-convex.sh` and smoke-test [pindeck.dev](https://pindeck.dev).

Pin-specific compose paths and image digests belong in private runbooks.

## Known warning patterns

Deploy logs may warn when HTTP route handlers are imported from modules other than `convex/http.ts`. Routes still work; the analyzer cannot always map source positions to `http.js`.

Pindeck registers routes in `convex/http.ts` and imports handlers from `convex/images.ts`, `convex/vision.ts`, and `@convex-dev/auth`. Treat isolated warnings as noise unless paired with deploy failure or runtime errors.

Related route list (for debugging only):

- `/ingestExternal`, `/discordQueue`, `/discordModerate`, orchestration under `/orchestration/*`
- `/smartAnalyzeImage` (Bearer auth)
