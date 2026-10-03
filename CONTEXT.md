# Pindeck context

**Platform map (URLs, flows, deploy):** [docs/architecture/platform-topology.md](docs/architecture/platform-topology.md).

Host-specific runbooks (SSH, VM names, internal DNS) belong in private ops documentation, not in this repository.

## Glossary

| Term | Meaning |
| ---- | ------- |
| Library | Active `images` in gallery/table (`status: active`) |
| Pending queue | Discord/Pinterest imports before approve (`status: pending`) |
| Variation | Child image with `parentImageId`; often inherits `sref` |
| Deck | Slide deck in `decks` + `DeckComposer` |
| Orchestration | Trigger tasks → Convex HTTP `/orchestration/*` callbacks |

## Code entrypoints

- UI shell: `src/App.tsx`, `src/components/shell/`, `src/components/pd/`
- Backend: `convex/images/`, `convex/http.ts`, `convex/vision.ts`
- Trigger tasks: `src/trigger/` (deploy on your worker host)
- Deploy Convex: `bun run deploy:convex` · Deploy Trigger: see `docs/trigger-orchestration.md`
