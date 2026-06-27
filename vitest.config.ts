import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Integration tests exercise the pure game engine end-to-end through the action
// protocol. The engine has no browser/runtime deps, so the Node environment is
// enough; `test/setup.ts` shims the single browser API that lib/identity touches.
export default defineConfig({
  resolve: {
    alias: {
      "@game": fileURLToPath(new URL("./game", import.meta.url)),
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./test/setup.ts"],
    include: ["test/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary"],
      // Coverage is scoped to the deterministic engine + identity helpers — the
      // surfaces the integration suite is contractually responsible for.
      include: ["game/**/*.ts", "src/lib/identity.ts"],
      thresholds: { statements: 100, branches: 100, functions: 100, lines: 100 },
    },
  },
});
