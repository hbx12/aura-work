import { lookup } from "node:dns/promises";

export function isBlockedHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host === "::1" || host === "0.0.0.0") return true;
  if (host.endsWith(".localhost") || host.endsWith(".local")) return true;

  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (ipv4) {
    const octets = ipv4.slice(1).map(Number);
    if (octets.some((n) => n < 0 || n > 255)) return true;
    const [a, b] = octets;
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a >= 224
    );
  }

  if (host.includes(":")) {
    return (
      host === "::" ||
      host === "::1" ||
      host.startsWith("fc") ||
      host.startsWith("fd") ||
      host.startsWith("fe8") ||
      host.startsWith("fe9") ||
      host.startsWith("fea") ||
      host.startsWith("feb")
    );
  }

  return false;
}

export function assertSafeRemoteUrl(rawUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error(`Invalid URL: ${rawUrl}`);
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Only http and https URLs are allowed.");
  }
  if (isBlockedHostname(parsed.hostname)) {
    throw new Error("Blocked URL: local, private-network, and link-local targets are not allowed.");
  }
  return parsed;
}

export async function resolveHostnameSafe(hostname: string): Promise<void> {
  if (isBlockedHostname(hostname)) {
    throw new Error("Blocked URL: local, private-network, and link-local targets are not allowed.");
  }
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname) || hostname.includes(":")) {
    return;
  }
  const results = await lookup(hostname, { all: true, verbatim: true });
  for (const entry of results) {
    if (isBlockedHostname(entry.address)) {
      throw new Error("Blocked URL: hostname resolves to a private or local address.");
    }
  }
}

export async function validateUrlForFetch(rawUrl: string): Promise<URL> {
  const parsed = assertSafeRemoteUrl(rawUrl);
  await resolveHostnameSafe(parsed.hostname);
  return parsed;
}

const MAX_REDIRECTS = 5;

export async function fetchSafe(
  rawUrl: string,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<Response> {
  let current = rawUrl;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await validateUrlForFetch(current);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), init.timeoutMs ?? 30_000);
    try {
      const resp = await fetch(current, {
        ...init,
        signal: controller.signal,
        redirect: "manual",
      });
      if (resp.status >= 300 && resp.status < 400) {
        const location = resp.headers.get("location");
        if (!location) throw new Error("Redirect response missing Location header.");
        current = new URL(location, current).href;
        continue;
      }
      return resp;
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error("Too many redirects.");
}
