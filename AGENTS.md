# Pindeck Agent Instructions

## Package Manager

- Use Bun project-wide.
- Prefer `bun install`, `bun run <script>`, and `bunx <package>` for package execution.
- Do not introduce `npm`, `npx`, `yarn`, or `pnpm` commands unless a specific upstream tool cannot run through Bun; document the exception inline when that happens.
- Keep deployment commands aligned with Bun as well, including Vercel build commands and local scripts.
