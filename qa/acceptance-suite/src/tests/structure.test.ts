import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "../../../../");

describe("Sidecar structure validation", () => {
  const sidecars = [
    "aura-agent",
    "aura-vm-helper",
    "aura-browser-helper",
    "aura-plugins-helper",
    "aura-cloud-sync",
    "aura-bridge",
    "aura-computer-use"
  ];

  describe.each(sidecars)("%s", (sidecar) => {
    const sidecarPath = join(ROOT, "sidecar", sidecar);

    it("should have package.json", () => {
      const files = readdirSync(sidecarPath);
      expect(files).toContain("package.json");
    });

    it("should have tsconfig.json", () => {
      const files = readdirSync(sidecarPath);
      expect(files).toContain("tsconfig.json");
    });

    it("should have src directory", () => {
      const files = readdirSync(sidecarPath);
      expect(files).toContain("src");
    });

    it("should have index.ts entry point", () => {
      const srcFiles = readdirSync(join(sidecarPath, "src"));
      expect(srcFiles).toContain("index.ts");
    });

    it("should have valid package.json", () => {
      const pkg = JSON.parse(readFileSync(join(sidecarPath, "package.json"), "utf8"));
      expect(pkg.name).toBeDefined();
      expect(pkg.version).toBeDefined();
      expect(pkg.scripts).toBeDefined();
    });

    it("should have build script", () => {
      const pkg = JSON.parse(readFileSync(join(sidecarPath, "package.json"), "utf8"));
      expect(pkg.scripts.build).toBeDefined();
    });

    it("should have start script", () => {
      const pkg = JSON.parse(readFileSync(join(sidecarPath, "package.json"), "utf8"));
      expect(pkg.scripts.start).toBeDefined();
    });
  });
});

describe("Package structure validation", () => {
  const packages = ["shared", "aura-plugin", "ui", "i18n"];

  describe.each(packages)("%s", (pkg) => {
    const pkgPath = join(ROOT, "packages", pkg);

    it("should have package.json", () => {
      const files = readdirSync(pkgPath);
      expect(files).toContain("package.json");
    });

    it("should have valid package.json", () => {
      const pkgData = JSON.parse(readFileSync(join(pkgPath, "package.json"), "utf8"));
      expect(pkgData.name).toBeDefined();
      expect(pkgData.version).toBeDefined();
    });
  });
});

describe("CLI structure validation", () => {
  it("should have package.json", () => {
    const cliPath = join(ROOT, "cli/aura-cli");
    const files = readdirSync(cliPath);
    expect(files).toContain("package.json");
  });

  it("should have src directory", () => {
    const cliPath = join(ROOT, "cli/aura-cli");
    const files = readdirSync(cliPath);
    expect(files).toContain("src");
  });
});

describe("Server structure validation", () => {
  it("should have package.json", () => {
    const serverPath = join(ROOT, "server/aura-cloud");
    const files = readdirSync(serverPath);
    expect(files).toContain("package.json");
  });

  it("should have src directory", () => {
    const serverPath = join(ROOT, "server/aura-cloud");
    const files = readdirSync(serverPath);
    expect(files).toContain("src");
  });
});

describe("Registry structure validation", () => {
  it("should have marketplace.json", () => {
    const registryPath = join(ROOT, "registry");
    const files = readdirSync(registryPath);
    expect(files).toContain("marketplace.json");
  });

  it("should have schema directory", () => {
    const registryPath = join(ROOT, "registry");
    const files = readdirSync(registryPath);
    expect(files).toContain("schema");
  });

  it("should have skills directory", () => {
    const registryPath = join(ROOT, "registry");
    const files = readdirSync(registryPath);
    expect(files).toContain("skills");
  });
});

describe("Extensions structure validation", () => {
  it("should have Chrome extension", () => {
    const extPath = join(ROOT, "extensions/aura-chrome");
    const files = readdirSync(extPath);
    expect(files).toContain("manifest.json");
  });

  it("should have valid manifest.json", () => {
    const manifest = JSON.parse(readFileSync(join(ROOT, "extensions/aura-chrome/manifest.json"), "utf8"));
    expect(manifest.manifest_version).toBe(3);
    expect(manifest.name).toBe("Aura OS");
  });
});
