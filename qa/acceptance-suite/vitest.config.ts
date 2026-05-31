import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: false,
    environment: "node",
    testTimeout: 60_000,
    hookTimeout: 30_000,
    include: ["src/tests/**/*.test.ts"],
    reporters: ["verbose"],
  },
});
