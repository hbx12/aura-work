import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const DOCS_DIR = join(__dirname, "../../docs");
const SCRIPTS_DIR = join(__dirname, "../../scripts");

describe("Documentation completeness", () => {
  it("should have troubleshooting guide", () => {
    const files = readdirSync(DOCS_DIR);
    expect(files).toContain("troubleshooting.md");
  });

  it("should have self-hosting guide", () => {
    const files = readdirSync(DOCS_DIR);
    expect(files).toContain("self-hosting.md");
  });

  it("should have development guide", () => {
    const files = readdirSync(DOCS_DIR);
    expect(files).toContain("development.md");
  });

  it("should have architecture overview", () => {
    const files = readdirSync(DOCS_DIR);
    expect(files).toContain("architecture-overview.md");
  });

  it("should have API reference", () => {
    const files = readdirSync(DOCS_DIR);
    expect(files).toContain("api-reference.md");
  });

  it("should have marketplace guide", () => {
    const files = readdirSync(DOCS_DIR);
    expect(files).toContain("marketplace-guide.md");
  });

  it("should have contributing guide", () => {
    const files = readdirSync(DOCS_DIR);
    expect(files).toContain("contributing-guide.md");
  });
});

describe("Scripts completeness", () => {
  it("should have version checker script", () => {
    const files = readdirSync(SCRIPTS_DIR);
    expect(files).toContain("check-versions.mjs");
  });

  it("should have marketplace validator script", () => {
    const files = readdirSync(SCRIPTS_DIR);
    expect(files).toContain("validate-marketplace.mjs");
  });

  it("should have security audit script", () => {
    const files = readdirSync(SCRIPTS_DIR);
    expect(files).toContain("security-audit.mjs");
  });

  it("should have i18n validator script", () => {
    const files = readdirSync(SCRIPTS_DIR);
    expect(files).toContain("validate-i18n.mjs");
  });

  it("should have changelog generator script", () => {
    const files = readdirSync(SCRIPTS_DIR);
    expect(files).toContain("generate-changelog.mjs");
  });
});

describe("Configuration files", () => {
  it("should have .env.example", () => {
    const files = readdirSync(join(__dirname, "../.."));
    expect(files).toContain(".env.example");
  });

  it("should have eslint config", () => {
    const files = readdirSync(join(__dirname, "../.."));
    expect(files).toContain("eslint.config.mjs");
  });

  it("should have tsconfig.json", () => {
    const files = readdirSync(join(__dirname, "../.."));
    expect(files).toContain("tsconfig.json");
  });

  it("should have .prettierrc.json", () => {
    const files = readdirSync(join(__dirname, "../.."));
    expect(files).toContain(".prettierrc.json");
  });
});

describe("CI/CD configuration", () => {
  it("should have CI workflow", () => {
    const workflowsDir = join(__dirname, "../../.github/workflows");
    const files = readdirSync(workflowsDir);
    expect(files).toContain("ci.yml");
  });

  it("should have security workflow", () => {
    const workflowsDir = join(__dirname, "../../.github/workflows");
    const files = readdirSync(workflowsDir);
    expect(files).toContain("security.yml");
  });

  it("should have labeler workflow", () => {
    const workflowsDir = join(__dirname, "../../.github/workflows");
    const files = readdirSync(workflowsDir);
    expect(files).toContain("labeler.yml");
  });
});
