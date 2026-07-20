import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", ".next", "proofs", "tests/e2e"],
    coverage: {
      reporter: ["text", "html"],
    },
  },
});
