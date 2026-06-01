import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "sidecar/**/*.test.ts",
      "packages/shared/**/*.test.ts",
    ],
    environment: "node",
  },
});
