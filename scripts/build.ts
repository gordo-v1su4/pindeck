const env = { ...process.env };

if (
  !env.CONVEX_SELF_HOSTED_ADMIN_KEY &&
  env.PINDECK_CONVEX_SELF_HOSTED_ADMIN_KEY
) {
  env.CONVEX_SELF_HOSTED_ADMIN_KEY = env.PINDECK_CONVEX_SELF_HOSTED_ADMIN_KEY;
}

function hasConvexDeployConfig() {
  return Boolean(
    env.CONVEX_DEPLOY_KEY ||
    (env.CONVEX_SELF_HOSTED_URL && env.CONVEX_SELF_HOSTED_ADMIN_KEY),
  );
}

function runBun(args: string[]) {
  const result = Bun.spawnSync([process.execPath, ...args], {
    cwd: process.cwd(),
    env,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });

  if (result.exitCode !== 0) {
    process.exit(result.exitCode);
  }
}

if (env.VERCEL === "1" && hasConvexDeployConfig()) {
  runBun(["run", "check:prod-target"]);
  runBun(["x", "convex", "deploy", "--cmd", "bun run build:frontend"]);
} else if (env.VERCEL === "1") {
  if (env.VERCEL_ENV === "production") {
    console.error(
      "ERROR: production Vercel build is missing Convex deployment configuration.",
    );
    process.exit(1);
  }
  console.log(
    "Preview build: Convex deployment configuration is not present; building frontend only.",
  );
  runBun(["run", "build:frontend"]);
} else {
  runBun(["run", "build:frontend"]);
}
