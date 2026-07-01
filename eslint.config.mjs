import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  // Global ignores
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/bundle/**",
      "**/coverage/**",
      "**/*.js",
      "**/*.mjs",
      "**/*.cjs",
      "apps/desktop/src-tauri/**",
    ],
  },
  // Base JS rules
  js.configs.recommended,
  // TypeScript rules
  ...tseslint.configs.recommended,
  // Project-specific overrides
  {
    rules: {
      // Allow unused vars if prefixed with _
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // Allow explicit any as warning (not error) for alpha stage
      "@typescript-eslint/no-explicit-any": "warn",
      // Allow empty interfaces (common in plugin/sidecar patterns)
      "@typescript-eslint/no-empty-object-type": "warn",
      // Allow require imports (some sidecar configs use them)
      "@typescript-eslint/no-require-imports": "warn",
    },
  },
);
