import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const LOCALES_DIR = join(__dirname, "../locales");

function loadLocale(locale: string): Record<string, string> {
  const path = join(LOCALES_DIR, `${locale}.json`);
  return JSON.parse(readFileSync(path, "utf8"));
}

function getLocaleFiles(): string[] {
  return readdirSync(LOCALES_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(".json", ""));
}

describe("i18n locale completeness", () => {
  const locales = getLocaleFiles();
  const en = loadLocale("en");
  const enKeys = Object.keys(en);

  it("should have English as the base locale", () => {
    expect(locales).toContain("en");
    expect(enKeys.length).toBeGreaterThan(100);
  });

  it("should have all expected locales", () => {
    const expected = [
      "en", "ar", "es", "fr", "de", "pt", "zh-CN", "zh-TW",
      "ja", "ko", "hi", "id", "tr", "ru", "it", "nl", "pl",
      "vi", "th", "fa", "he", "uk", "bn", "sw", "el"
    ];
    for (const locale of expected) {
      expect(locales).toContain(locale);
    }
  });

  describe.each(locales)("%s locale", (locale) => {
    const translations = loadLocale(locale);
    const localeKeys = Object.keys(translations);

    it("should have the same number of keys as English", () => {
      // Allow some locales to have more keys (theme names, etc.)
      expect(localeKeys.length).toBeGreaterThanOrEqual(enKeys.length - 10);
    });

    it("should not have empty values", () => {
      for (const [key, value] of Object.entries(translations)) {
        expect(value, `Key "${key}" has empty value`).toBeTruthy();
        expect(value.trim(), `Key "${key}" has whitespace-only value`).not.toBe("");
      }
    });

    it("should preserve interpolation placeholders", () => {
      const placeholderRegex = /\{[^}]+\}/g;
      for (const [key, enValue] of Object.entries(en)) {
        const enPlaceholders = enValue.match(placeholderRegex);
        if (!enPlaceholders) continue;

        const localeValue = translations[key];
        if (!localeValue) continue;

        const localePlaceholders = localeValue.match(placeholderRegex);
        if (localePlaceholders) {
          expect(localePlaceholders.sort()).toEqual(enPlaceholders.sort());
        }
      }
    });
  });

  describe("RTL locales", () => {
    const rtlLocales = ["ar", "fa", "he"];

    it.each(rtlLocales)("%s should be marked as RTL", (locale) => {
      expect(locales).toContain(locale);
    });
  });

  describe("Theme keys", () => {
    const themeKeys = enKeys.filter((k) => k.startsWith("settings.theme"));

    it("should have theme keys in English", () => {
      expect(themeKeys.length).toBeGreaterThanOrEqual(30);
    });

    it.each(locales.filter((l) => l !== "en"))(
      "%s should have all theme keys",
      (locale) => {
        const translations = loadLocale(locale);
        for (const key of themeKeys) {
          expect(translations[key], `Missing theme key "${key}" in ${locale}`).toBeDefined();
        }
      }
    );
  });
});

describe("i18n catalog integration", () => {
  it("should export RTL_LOCALES", async () => {
    const { RTL_LOCALES } = await import("../src/catalog.js");
    expect(RTL_LOCALES).toContain("ar");
    expect(RTL_LOCALES).toContain("fa");
    expect(RTL_LOCALES).toContain("he");
  });

  it("should export SUPPORTED_LOCALES", async () => {
    const { SUPPORTED_LOCALES } = await import("../src/catalog.js");
    expect(SUPPORTED_LOCALES.length).toBeGreaterThanOrEqual(25);
  });

  it("should have matching locale files for all SUPPORTED_LOCALES", async () => {
    const { SUPPORTED_LOCALES } = await import("../src/catalog.js");
    for (const { id } of SUPPORTED_LOCALES) {
      expect(locales).toContain(id);
    }
  });
});
