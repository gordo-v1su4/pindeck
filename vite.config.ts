import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');
  
  // Support both CONVEX_URL (Convex CLI convention) and VITE_CONVEX_URL (Vite convention)
  // Check both .env files (via loadEnv) and process environment variables (for CI/CD)
  // Priority: VITE_CONVEX_URL > CONVEX_URL, and process.env overrides .env files
  const convexUrl = 
    process.env.VITE_CONVEX_URL || 
    process.env.CONVEX_URL || 
    env.VITE_CONVEX_URL || 
    env.CONVEX_URL;

  return {
  plugins: [
    react(),
    // The code below enables dev tools like taking screenshots of your site
    // while it is being developed on chef.convex.dev.
    // Feel free to remove this code if you're no longer developing your app with Chef.
    mode === "development"
      ? {
          name: "inject-chef-dev",
          transform(code: string, id: string) {
            if (id.includes("main.tsx")) {
              return {
                code: `${code}

/* Added by Vite plugin inject-chef-dev */
window.addEventListener('message', async (message) => {
  if (message.source !== window.parent) return;
  if (message.data.type !== 'chefPreviewRequest') return;

  const worker = await import('https://chef.convex.dev/scripts/worker.bundled.mjs');
  await worker.respondToMessage(message);
});
            `,
                map: null,
              };
            }
            return null;
          },
        }
      : null,
    // End of code for taking screenshots on chef.convex.dev.
  ].filter(Boolean),
  define: {
    // Expose CONVEX_URL as VITE_CONVEX_URL if it exists (for Convex CLI compatibility)
    // This allows using either CONVEX_URL or VITE_CONVEX_URL in .env.local
    'import.meta.env.VITE_CONVEX_URL': JSON.stringify(convexUrl || ''),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "dist",
    sourcemap: mode === "development",
    minify: mode === "production",
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
          convex: ["convex/react", "@convex-dev/auth/react"],
          ui: ["@radix-ui/themes", "@radix-ui/react-icons"],
        },
      },
    },
  },
  server: {
    port: 3000,
    host: true,
    strictPort: true, // Exit if port is already in use
  },
  preview: {
    port: 3000,
    host: true,
    strictPort: true, // Exit if port is already in use
  },
  };
});
