import { createRoot } from "react-dom/client";
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
const convex = new ConvexReactClient(convexUrl as string);

createRoot(document.getElementById("root")!).render(
  <ConvexAuthProvider client={convex}>
    <Theme appearance="dark" grayColor="slate" radius="large" scaling="100%">
      <App />
    </Theme>
  </ConvexAuthProvider>,
);
