import { createRoot } from "react-dom/client";
import { ConvexProvider } from "convex/react";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { Theme } from "@radix-ui/themes";
import "@radix-ui/themes/styles.css";
import "./index.css";
import App from "./App";

// Vite config maps CONVEX_URL to VITE_CONVEX_URL if needed (for Convex CLI compatibility)
const convexUrl = import.meta.env.VITE_CONVEX_URL;
if (!convexUrl) {
  throw new Error("Missing CONVEX_URL or VITE_CONVEX_URL environment variable. Please set one in your .env.local file.");
}

// Log the Convex URL being used (for debugging auth issues)
console.log("🌐 Convex URL:", convexUrl);

// Validate URL format and provide helpful error
if (convexUrl.endsWith('.convex.site')) {
  console.warn(
    '⚠️ Warning: URL ends with .convex.site (used for HTTP Actions). ' +
    'For Pindeck production, use the self-hosted client URL: https://convex.serving.cloud'
  );
}

// Create Convex client with skipConvexDeploymentUrlCheck if needed
// Pindeck production is self-hosted at https://convex.serving.cloud. The skip
// only handles accidental HTTP/action URLs so the warning above is visible.
const convex = new ConvexReactClient(convexUrl as string, {
  skipConvexDeploymentUrlCheck: convexUrl.endsWith('.convex.site'),
});

document.documentElement.classList.add("dark");

createRoot(document.getElementById("root")!).render(
  <ConvexProvider client={convex}>
    <ConvexAuthProvider client={convex}>
      <Theme appearance="dark" accentColor="blue" grayColor="slate" radius="small" scaling="100%">
        <App />
      </Theme>
    </ConvexAuthProvider>
  </ConvexProvider>,
);
