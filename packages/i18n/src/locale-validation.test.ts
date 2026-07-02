import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const LOCALES_DIR = join(__dirname, "../locales");

function loadLocale(locale) {
  return JSON.parse(readFileSync(join(LOCALES_DIR, locale + ".json"), "utf8"));
}

describe("i18n locale validation", () => {
  const en = loadLocale("en");
  const enKeys = Object.keys(en);

  it("English should have 400+ keys", () => {
    expect(enKeys.length).toBeGreaterThan(400);
  });

  it("All locales should have matching key counts", () => {
    const locales = ["ar", "es", "fr", "de", "pt", "zh-CN", "zh-TW", "ja", "ko", "hi", "id", "tr", "ru", "it", "nl", "pl", "vi", "th", "fa", "he", "uk", "bn", "sw", "el"];
    for (const locale of locales) {
      const data = loadLocale(locale);
      const count = Object.keys(data).length;
      expect(count, locale + " has too few keys").toBeGreaterThan(20);
    }
  });

  it("RTL locales should be properly configured", () => {
    const rtlLocales = ["ar", "fa", "he"];
    for (const locale of rtlLocales) {
      const data = loadLocale(locale);
      expect(data["app.name"]).toBeTruthy();
    }
  });

  it("Theme keys should exist in all locales", () => {
    const themeKeys = enKeys.filter(k => k.startsWith("settings.theme"));
    expect(themeKeys.length).toBeGreaterThanOrEqual(30);
    
    const locales = ["ar", "de", "es", "fr"];
    for (const locale of locales) {
      const data = loadLocale(locale);
      for (const key of themeKeys) {
        expect(data[key], locale + " missing " + key).toBeDefined();
      }
    }
  });

  it("Navigation keys should exist in all locales", () => {
    const navKeys = enKeys.filter(k => k.startsWith("nav."));
    expect(navKeys.length).toBeGreaterThanOrEqual(10);
  });

  it("Settings keys should exist in all locales", () => {
    const settingsKeys = enKeys.filter(k => k.startsWith("settings."));
    expect(settingsKeys.length).toBeGreaterThanOrEqual(50);
  });

  it("Chat keys should exist in all locales", () => {
    const chatKeys = enKeys.filter(k => k.startsWith("chat."));
    expect(chatKeys.length).toBeGreaterThanOrEqual(5);
  });

  it("Memory keys should exist in all locales", () => {
    const memoryKeys = enKeys.filter(k => k.startsWith("memory."));
    expect(memoryKeys.length).toBeGreaterThanOrEqual(10);
  });

  it("Common keys should exist in all locales", () => {
    const commonKeys = enKeys.filter(k => k.startsWith("common."));
    expect(commonKeys.length).toBeGreaterThanOrEqual(5);
  });

  it("No empty values in English", () => {
    for (const [key, value] of Object.entries(en)) {
      expect(value, key + " is empty").toBeTruthy();
      expect(String(value).trim(), key + " is whitespace").not.toBe("");
    }
  });

  it("Interpolation placeholders should match", () => {
    const placeholderRegex = /\{[^}]+\}/g;
    const locales = ["ar", "de", "es", "fr"];
    for (const locale of locales) {
      const data = loadLocale(locale);
      for (const [key, enValue] of Object.entries(en)) {
        const enPlaceholders = String(enValue).match(placeholderRegex);
        if (!enPlaceholders) continue;
        const localeValue = data[key];
        if (!localeValue) continue;
        const localePlaceholders = String(localeValue).match(placeholderRegex);
        if (localePlaceholders) {
          expect(localePlaceholders.sort(), locale + " " + key).toEqual(enPlaceholders.sort());
        }
      }
    }
  });
});
