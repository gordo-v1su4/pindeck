const env = { ...process.env };

// Map the existing canonical BWS records to the public names Vite consumes.
if (env.PINDECK_CONVEX_API_URL) {
  env.VITE_CONVEX_URL = env.PINDECK_CONVEX_API_URL;
}
if (env.PINDECK_CONVEX_SITE_URL) {
  env.VITE_CONVEX_SITE_URL = env.PINDECK_CONVEX_SITE_URL;
}

// Backend releases are explicit: bun run deploy:convex.
const result = Bun.spawnSync([process.execPath, "run", "build:frontend"], {
  cwd: process.cwd(),
  env,
  stdin: "inherit",
  stdout: "inherit",
  stderr: "inherit",
});

process.exit(result.exitCode);
