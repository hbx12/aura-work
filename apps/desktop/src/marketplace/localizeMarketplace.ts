import type { MarketplaceEntry, MarketplaceLocalizedText } from "@aura-os/shared";

export function marketplaceLocale(isAr?: boolean) {
  return isAr ? "ar" : "en";
}

export function localizedMarketplace(entry: MarketplaceEntry, isAr?: boolean): MarketplaceEntry {
  const locale = marketplaceLocale(isAr);
  const localized: MarketplaceLocalizedText | undefined = entry.localized?.[locale];
  if (!localized) return entry;

  return {
    ...entry,
    name: localized.name ?? entry.name,
    summary: localized.summary ?? entry.summary,
    description: localized.description ?? entry.description,
    setup: localized.setup ?? entry.setup,
    tools: localized.tools ?? entry.tools,
    categories: localized.categories ?? entry.categories,
  };
}

export function mergeMarketplaceEntries(...groups: MarketplaceEntry[][]) {
  const map = new Map<string, MarketplaceEntry>();
  for (const group of groups) {
    for (const entry of group) {
      map.set(entry.id, entry);
    }
  }
  return Array.from(map.values());
}
