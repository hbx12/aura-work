import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const MARKETPLACE_PATH = join(__dirname, "marketplace.json");

function loadMarketplace() {
  return JSON.parse(readFileSync(MARKETPLACE_PATH, "utf8"));
}

describe("Marketplace comprehensive validation", () => {
  const marketplace = loadMarketplace();
  const items = marketplace.plugins || [];

  it("should have 50+ marketplace items", () => {
    expect(items.length).toBeGreaterThanOrEqual(50);
  });

  it("should have no duplicate IDs", () => {
    const ids = items.map((i) => i.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  describe.each(items)("$id", (item) => {
    it("should have valid type", () => {
      expect(["skill", "mcp", "plugin"]).toContain(item.type);
    });

    it("should have valid risk level", () => {
      expect(["low", "medium", "high"]).toContain(item.risk);
    });

    it("should have Arabic localization", () => {
      expect(item.localized?.ar).toBeDefined();
      expect(item.localized.ar.name).toBeTruthy();
      expect(item.localized.ar.summary).toBeTruthy();
    });

    it("should have publisher info", () => {
      expect(item.publisher).toBeDefined();
      expect(item.publisher.name).toBeTruthy();
    });

    if (item.type === "mcp") {
      it("should have install command", () => {
        expect(item.install?.command).toBeDefined();
        expect(Array.isArray(item.install.command)).toBe(true);
      });
    }

    if (item.type === "skill") {
      it("should have install prompt", () => {
        expect(item.install?.prompt).toBeTruthy();
      });
    }
  });

  describe("Categories", () => {
    it("should have diverse categories", () => {
      const allCategories = new Set();
      for (const item of items) {
        for (const cat of item.categories || []) {
          allCategories.add(cat);
        }
      }
      expect(allCategories.size).toBeGreaterThanOrEqual(15);
    });
  });

  describe("Tags", () => {
    it("should have tags for all items", () => {
      for (const item of items) {
        expect(item.tags).toBeDefined();
        expect(Array.isArray(item.tags)).toBe(true);
        expect(item.tags.length).toBeGreaterThan(0);
      }
    });
  });

  describe("Localization completeness", () => {
    it("should have Arabic translations for all items", () => {
      const missingArabic = items.filter((i) => !i.localized?.ar);
      expect(missingArabic).toHaveLength(0);
    });
  });
});
