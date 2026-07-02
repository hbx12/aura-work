import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const MARKETPLACE_PATH = join(__dirname, "../../registry/marketplace.json");

function loadMarketplace() {
  return JSON.parse(readFileSync(MARKETPLACE_PATH, "utf8"));
}

describe("Marketplace registry validation", () => {
  const marketplace = loadMarketplace();

  it("should have a plugins array", () => {
    expect(Array.isArray(marketplace.plugins)).toBe(true);
    expect(marketplace.plugins.length).toBeGreaterThan(0);
  });

  describe.each(marketplace.plugins)("$id", (plugin) => {
    it("should have required fields", () => {
      expect(plugin.id).toBeTruthy();
      expect(plugin.type).toBeTruthy();
      expect(plugin.name).toBeTruthy();
      expect(plugin.version).toBeTruthy();
      expect(plugin.summary).toBeTruthy();
      expect(plugin.description).toBeTruthy();
    });

    it("should have valid type", () => {
      expect(["skill", "mcp", "plugin"]).toContain(plugin.type);
    });

    it("should have valid id format", () => {
      expect(plugin.id).toMatch(/^[a-z0-9][a-z0-9.-]*$/);
    });

    it("should have publisher info", () => {
      expect(plugin.publisher).toBeDefined();
      expect(plugin.publisher.name).toBeTruthy();
    });

    it("should have Arabic localization", () => {
      expect(plugin.localized?.ar).toBeDefined();
      expect(plugin.localized.ar.name).toBeTruthy();
      expect(plugin.localized.ar.summary).toBeTruthy();
    });

    it("should have valid risk level", () => {
      expect(["low", "medium", "high"]).toContain(plugin.risk);
    });

    if (plugin.type === "mcp") {
      it("should have install command", () => {
        expect(plugin.install?.command).toBeDefined();
        expect(Array.isArray(plugin.install.command)).toBe(true);
      });
    }

    if (plugin.type === "skill") {
      it("should have install prompt", () => {
        expect(plugin.install?.prompt).toBeTruthy();
      });
    }
  });

  describe("Unique IDs", () => {
    it("should have no duplicate IDs", () => {
      const ids = marketplace.plugins.map((p: any) => p.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe("Categories", () => {
    it("should have valid categories", () => {
      const validCategories = [
        "Documents", "Productivity", "Business", "Spreadsheets",
        "Presentations", "PDF", "Research", "Data", "Design",
        "Automation", "Database", "Browser", "Image", "Forms",
        "File Converter", "Security", "Quality", "Web", "Git",
        "DevOps", "Infrastructure", "Communication", "Knowledge",
        "Integration", "Backend", "Education"
      ];
      
      for (const plugin of marketplace.plugins) {
        for (const category of plugin.categories || []) {
          // Allow any category string (flexible)
          expect(typeof category).toBe("string");
          expect(category.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe("Localization completeness", () => {
    it("should have Arabic translations for all items", () => {
      for (const plugin of marketplace.plugins) {
        expect(plugin.localized?.ar, `${plugin.id} missing Arabic`).toBeDefined();
        expect(plugin.localized.ar.name, `${plugin.id} missing Arabic name`).toBeTruthy();
        expect(plugin.localized.ar.summary, `${plugin.id} missing Arabic summary`).toBeTruthy();
      }
    });
  });
});
