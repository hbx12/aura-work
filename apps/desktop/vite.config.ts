import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@aura-os/ui": path.resolve(__dirname, "../../packages/ui/src"),
      "@aura-os/shared": path.resolve(__dirname, "../../packages/shared/src"),
      "@aura-os/i18n": path.resolve(__dirname, "../../packages/i18n/src"),
    },
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    // WebView2 on Windows resolves localhost to 127.0.0.1 — bind IPv4 explicitly.
    host: host || "127.0.0.1",
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
});
