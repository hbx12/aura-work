import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import { listLocaleFiles, readJson, verifyVmBundleHash, assertRepoFile } from "../helpers/paths.js";

describe("5.1 / infrastructure — build artifacts & bundle", () => {
  it("bundle manifest declares sidecars and VM image", () => {
    const manifest = readJson<{
      version: string;
      sidecars: { id: string }[];
      vmImage: { imageId: string };
    }>("bundle/manifest.json");
    expect(manifest.version).toMatch(/^\d+\.\d+\.\d+(-[\w.]+)?$/);
    expect(manifest.sidecars.length).toBeGreaterThanOrEqual(6);
    expect(manifest.vmImage.imageId).toBe("aura-linux-workspace");
  });

  it("VM image SHA-256 matches bundled manifest (5.1 pass — shell runs in VM)", () => {
    const result = verifyVmBundleHash();
    expect(result.ok, result.message).toBe(true);
  });

  it("Phase 11 i18n ships 25 Weblate locale files", () => {
    const locales = listLocaleFiles();
    expect(locales).toHaveLength(25);
    expect(locales).toContain("ar.json");
    expect(locales).toContain("en.json");
    expect(locales).toContain("fa.json");
    expect(locales).toContain("he.json");
    expect(locales).toContain("uk.json");
    expect(locales).toContain("bn.json");
    expect(locales).toContain("sw.json");
    expect(locales).toContain("el.json");
  });

  it("Tauri bundle config is present for alpha builds", () => {
    const conf = readJson<{
      version: string;
      bundle: { createUpdaterArtifacts?: boolean; resources?: unknown; targets?: unknown };
    }>("apps/desktop/src-tauri/tauri.conf.json");
    expect(conf.version).toMatch(/0\.1\.0(-alpha\.1|-1)?/);
    expect(conf.bundle.resources).toBeTruthy();
    assertRepoFile("bundle/manifest.json");
  });
});

describe("5.2 — local-only provider configuration", () => {
  it("Ollama adapter exists and does not require API key", () => {
    const src = readFileSync(assertRepoFile("sidecar/aura-agent/src/providers/index.ts"), "utf8");
    expect(src).toContain("ollamaAdapter");
    expect(src).toContain('id !== "ollama"');
    expect(src).toContain("127.0.0.1:11434");
  });
});

describe("5.3 / 5.9 / 5.10 — Rust unit test modules present", () => {
  it("permissions module has scheduled profile logic", () => {
    const src = readFileSync(assertRepoFile("apps/desktop/src-tauri/src/permissions.rs"), "utf8");
    expect(src).toContain("profile_allows");
    expect(src).toContain("always_requires");
  });

  it("computer use blocklist module exists", () => {
    const src = readFileSync(assertRepoFile("apps/desktop/src-tauri/src/computer_use.rs"), "utf8");
    expect(src).toContain("is_app_blocked");
    expect(src).toContain("pattern_matches");
  });

  it("shell policy hard-deny tests exist", () => {
    const src = readFileSync(assertRepoFile("apps/desktop/src-tauri/src/shell.rs"), "utf8");
    expect(src).toContain("#[cfg(test)]");
    expect(src).toContain("is_hard_denied");
  });
});
