import { readFileSync, existsSync } from "node:fs";
import { lookup } from "node:dns/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { MarketplaceEntry } from "./types.js";

const LOCAL_REGISTRY = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../registry/marketplace.json",
);
const MAX_REGISTRY_BYTES = 512 * 1024;
const MAX_REDIRECTS = 5;

function parseEntries(data: { plugins?: MarketplaceEntry[] } | MarketplaceEntry[]): MarketplaceEntry[] {
  return Array.isArray(data) ? data : (data.plugins ?? []);
}

function parseIpv4(hostname: string): number[] | null {
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(hostname);
  if (!match) return null;
  const octets = match.slice(1).map(Number);
  if (octets.some((octet) => octet < 0 || octet > 255)) return null;
  return octets;
}

function isBlockedIpv4(octets: number[]): boolean {
  const [a, b, c] = octets;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0 && c === 0) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

function isBlockedRegistryHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.+$/g, "");
  if (host === "localhost" || host === "0.0.0.0" || host.endsWith(".localhost") || host.endsWith(".local")) {
    return true;
  }
  const ipv4 = parseIpv4(host);
  if (ipv4) return isBlockedIpv4(ipv4);
  if (host.includes(":")) {
    return true;
  }
  return false;
}

async function validateRegistryUrl(rawUrl: string): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("Invalid plugin registry URL.");
  }

  if (parsed.protocol !== "https:") {
    throw new Error("Plugin registry URL must use https.");
  }
  if (isBlockedRegistryHostname(parsed.hostname)) {
    throw new Error("Plugin registry URL cannot target local or private networks.");
  }

  const results = await lookup(parsed.hostname, { all: true, verbatim: true });
  for (const entry of results) {
    if (isBlockedRegistryHostname(entry.address)) {
      throw new Error("Plugin registry hostname resolves to a local or private address.");
    }
  }

  return parsed;
}

async function readRegistryJson(resp: Response): Promise<{ plugins?: MarketplaceEntry[] } | MarketplaceEntry[]> {
  const contentLength = Number(resp.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_REGISTRY_BYTES) {
    throw new Error("Plugin registry response is too large.");
  }
  const text = await resp.text();
  if (Buffer.byteLength(text, "utf8") > MAX_REGISTRY_BYTES) {
    throw new Error("Plugin registry response is too large.");
  }
  return JSON.parse(text) as { plugins?: MarketplaceEntry[] } | MarketplaceEntry[];
}

async function fetchRemoteRegistry(rawUrl: string): Promise<{
  entries: MarketplaceEntry[];
  source: string;
}> {
  let current = rawUrl;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    await validateRegistryUrl(current);
    const resp = await fetch(current, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15000),
      redirect: "manual",
    });

    if (resp.status >= 300 && resp.status < 400) {
      const location = resp.headers.get("location");
      if (!location) throw new Error("Registry redirect missing Location header.");
      current = new URL(location, current).href;
      continue;
    }

    if (!resp.ok) {
      throw new Error(`Registry fetch failed: ${resp.status} ${resp.statusText}`);
    }
    const data = await readRegistryJson(resp);
    return { entries: parseEntries(data), source: current };
  }
  throw new Error("Plugin registry redirected too many times.");
}

export async function fetchMarketplace(registryUrl?: string): Promise<{
  entries: MarketplaceEntry[];
  source: string;
  fetchedAt: string;
}> {
  const fetchedAt = new Date().toISOString();
  const url = registryUrl || process.env.AURA_PLUGIN_REGISTRY;

  if (url) {
    const registry = await fetchRemoteRegistry(url);
    return { ...registry, fetchedAt };
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
