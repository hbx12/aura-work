import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "sidecar/**/*.test.ts",
      "packages/shared/**/*.test.ts",
    ],
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "json", "html"],
      include: [
        "sidecar/**/*.ts",
        "packages/shared/**/*.ts",
      ],
      exclude: [
        "**/*.test.ts",
        "**/*.spec.ts",
        "**/node_modules/**",
      ],
    },
  },
});
