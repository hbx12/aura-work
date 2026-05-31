import {
  CATALOG,
  RTL_LOCALES,
  SUPPORTED_LOCALES,
  STRICT_LOCALES,
  resolveCatalog,
  type LocaleId,
  type MessageCatalog,
  type MessageKey,
} from "./catalog.js";

export {
  CATALOG,
  RTL_LOCALES,
  SUPPORTED_LOCALES,
  STRICT_LOCALES,
  resolveCatalog,
  type LocaleId,
  type MessageCatalog,
  type MessageKey,
};

const DEFAULT_LOCALE: LocaleId = "en";

/** Map BCP-47 / OS locale tags to supported Aura locales. */
export function normalizeLocaleTag(tag: string | null | undefined): LocaleId {
  if (!tag) return DEFAULT_LOCALE;
  const lower = tag.trim().toLowerCase().replace("_", "-");
  if ((SUPPORTED_LOCALES as { id: string }[]).some((l) => l.id.toLowerCase() === lower)) {
    return lower as LocaleId;
  }
  const base = lower.split("-")[0];
  const match = SUPPORTED_LOCALES.find((l) => l.id.toLowerCase() === lower || l.id.split("-")[0] === base);
  if (match) return match.id;
  if (base === "zh") {
    return lower.includes("tw") || lower.includes("hk") || lower.includes("hant") ? "zh-TW" : "zh-CN";
  }
  return DEFAULT_LOCALE;
}

export function isRtlLocale(locale: LocaleId): boolean {
  return RTL_LOCALES.includes(locale);
}

/** Locales with a complete catalog — no English fallback for missing keys. */
export function createTranslator(locale: LocaleId) {
  const messages = resolveCatalog(locale);
  const english = resolveCatalog(DEFAULT_LOCALE);
  return function t(key: keyof MessageCatalog, params?: Record<string, string>): string {
    let value = messages[key];
    if (value === undefined || value === "") {
      value = STRICT_LOCALES.includes(locale) ? (messages[key] ?? "") : (english[key] ?? String(key));
    }
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        value = value.replace(new RegExp(`\\{${k}\\}`, "g"), v);
      }
    }
    return value;
  };
}

export function detectBrowserLocale(): LocaleId {
  if (typeof navigator === "undefined") return DEFAULT_LOCALE;
  const langs = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const lang of langs) {
    const normalized = normalizeLocaleTag(lang);
    if (normalized !== DEFAULT_LOCALE || lang.toLowerCase().startsWith("en")) {
      return normalized;
    }
  }
  return DEFAULT_LOCALE;
}
