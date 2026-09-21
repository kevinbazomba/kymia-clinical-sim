// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/tanstack/vite";

// `mcpPlugin` currently compares POSIX and Windows path separators internally,
// which prevents Vite from starting on Windows. The MCP route files it generates
// are committed in `src/routes`, so they remain available locally; regeneration
// still runs in non-Windows build environments.
const mcpPlugins = process.platform === "win32" ? [] : [mcpPlugin()];

export default defineConfig({
  // Build the Nitro server as Vercel Functions for Vercel deployments.
  nitro: { preset: "vercel" },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: mcpPlugins,
  },
});
