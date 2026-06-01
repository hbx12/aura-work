import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { MarketplaceEntry } from "./types.js";

const LOCAL_REGISTRY = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../docs/registry.json",
);

function parseEntries(data: { plugins?: MarketplaceEntry[] } | MarketplaceEntry[]): MarketplaceEntry[] {
  return Array.isArray(data) ? data : (data.plugins ?? []);
}

export async function fetchMarketplace(registryUrl?: string): Promise<{
  entries: MarketplaceEntry[];
  source: string;
  fetchedAt: string;
}> {
  const fetchedAt = new Date().toISOString();
  const url = registryUrl || process.env.AURA_PLUGIN_REGISTRY;

  if (url) {
    const resp = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15000),
    });
    if (!resp.ok) {
      throw new Error(`Registry fetch failed: ${resp.status} ${resp.statusText}`);
    }
    const data = (await resp.json()) as { plugins?: MarketplaceEntry[] } | MarketplaceEntry[];
    return { entries: parseEntries(data), source: url, fetchedAt };
  }

  if (existsSync(LOCAL_REGISTRY)) {
    const raw = readFileSync(LOCAL_REGISTRY, "utf8");
    const data = JSON.parse(raw) as { plugins?: MarketplaceEntry[] };
    return {
      entries: parseEntries(data),
      source: LOCAL_REGISTRY,
      fetchedAt,
    };
  }

  throw new Error("No plugin registry configured and local registry.json not found.");
}
