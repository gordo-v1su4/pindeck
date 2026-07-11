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
