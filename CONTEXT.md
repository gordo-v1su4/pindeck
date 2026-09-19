# Pindeck context

**Platform map (URLs, flows, deploy):** [docs/architecture/platform-topology.md](docs/architecture/platform-topology.md).

**Homelab mirror:** `proxmox-home/docs/pindeck-platform-topology.md` · **Obsidian:** `hermes-notebook-vault/04-Projects/Pindeck/`.

## Glossary

| Term | Meaning |
| ---- | ------- |
| Library | Active `images` in gallery/table (`status: active`) |
| Pending queue | Discord/Pinterest imports before approve (`status: pending`) |
| Variation | Child image with `parentImageId`; often inherits `sref` |
| Deck | Slide deck in `decks` + `DeckComposer` |
| Orchestration | Trigger tasks → `convex-site` `/orchestration/*` callbacks |

## Code entrypoints

- UI shell: `src/App.tsx`, `src/components/shell/`, `src/components/pd/`
- Backend: `convex/images/`, `convex/http.ts`, `convex/vision.ts`
- Trigger tasks: `src/trigger/` (deploy on **app-vm** only)
- Deploy Convex: `bun run deploy:convex` · Deploy Trigger: `/opt/pindeck` on app-vm as **gordo**
