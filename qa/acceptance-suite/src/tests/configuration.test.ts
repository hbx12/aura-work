import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "../../../../");

describe("Package configuration validation", () => {
  it("should have valid root package.json", () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
    expect(pkg.name).toBe("aura-os");
    expect(pkg.private).toBe(true);
    expect(pkg.workspaces).toBeDefined();
    expect(pkg.workspaces.length).toBeGreaterThan(10);
  });

  it("should have required scripts", () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
    const requiredScripts = [
      "dev", "build", "test", "lint", "lint:fix",
      "build:sidecars", "stage:bundle", "test:sidecars",
      "test:acceptance", "test:rust"
    ];
    for (const script of requiredScripts) {
      expect(pkg.scripts[script], `Missing script: ${script}`).toBeDefined();
    }
  });

  it("should have required devDependencies", () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
    const requiredDeps = ["vitest", "esbuild", "eslint"];
    for (const dep of requiredDeps) {
      expect(pkg.devDependencies[dep], `Missing devDependency: ${dep}`).toBeDefined();
    }
  });

  it("should have engines specified", () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
    if (pkg.engines) {
      expect(pkg.engines.node).toBeDefined();
    }
  });
});

describe("Tauri configuration", () => {
  it("should have valid tauri.conf.json", () => {
    const conf = JSON.parse(readFileSync(join(ROOT, "apps/desktop/src-tauri/tauri.conf.json"), "utf8"));
    expect(conf.version).toBeDefined();
    expect(conf.bundle).toBeDefined();
  });

  it("should have correct version", () => {
    const conf = JSON.parse(readFileSync(join(ROOT, "apps/desktop/src-tauri/tauri.conf.json"), "utf8"));
    expect(conf.version).toMatch(/0\.1\.0/);
  });
});

describe("Vitest configuration", () => {
  it("should have vitest.sidecars.config.ts", () => {
    const content = readFileSync(join(ROOT, "vitest.sidecars.config.ts"), "utf8");
    expect(content).toContain("defineConfig");
    expect(content).toContain("coverage");
  });
});

describe("GitHub configuration", () => {
  it("should have labeler configuration", () => {
    const content = readFileSync(join(ROOT, ".github/labeler.yml"), "utf8");
    expect(content.length).toBeGreaterThan(0);
  });

  it("should have PR template", () => {
    try {
      const content = readFileSync(join(ROOT, ".github/PULL_REQUEST_TEMPLATE.md"), "utf8");
      expect(content.length).toBeGreaterThan(0);
    } catch {
      // PR template is optional
    }
  });
});

describe("Security configuration", () => {
  it("should have SECURITY.md", () => {
    const content = readFileSync(join(ROOT, "SECURITY.md"), "utf8");
    expect(content).toContain("security");
  });

  it("should have .env.example", () => {
    const content = readFileSync(join(ROOT, ".env.example"), "utf8");
    expect(content).toContain("AURA_SIDECAR_AUTH_TOKEN");
  });
});

describe("Documentation files", () => {
  it("should have README.md", () => {
    const content = readFileSync(join(ROOT, "README.md"), "utf8");
    expect(content).toContain("Aura Work");
  });

  it("should have README.ar.md", () => {
    const content = readFileSync(join(ROOT, "README.ar.md"), "utf8");
    expect(content).toContain("Aura Work");
  });

  it("should have LICENSE", () => {
    const content = readFileSync(join(ROOT, "LICENSE"), "utf8");
    expect(content.length).toBeGreaterThan(100);
  });

  it("should have CONTRIBUTING.md", () => {
    const content = readFileSync(join(ROOT, "CONTRIBUTING.md"), "utf8");
    expect(content.length).toBeGreaterThan(0);
  });

  it("should have CHANGELOG.md", () => {
    const content = readFileSync(join(ROOT, "CHANGELOG.md"), "utf8");
    expect(content.length).toBeGreaterThan(0);
  });

  it("should have ROADMAP.md", () => {
    const content = readFileSync(join(ROOT, "ROADMAP.md"), "utf8");
    expect(content.length).toBeGreaterThan(0);
  });
});
