import { lookup } from "node:dns/promises";

function stripIpv6Brackets(hostname: string): string {
  return hostname.toLowerCase().replace(/^\[|\]$/g, "").split("%")[0];
}

function parseIpv4(hostname: string): number[] | null {
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(hostname);
  if (!match) return null;

  const octets = match.slice(1).map(Number);
  if (octets.some((octet) => octet < 0 || octet > 255)) return null;

  return octets;
}

function isBlockedIpv4(octets: number[]): boolean {
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

function expandIpv6(hostname: string): number[] | null {
  let host = stripIpv6Brackets(hostname);

  if (host.includes(".")) {
    const lastColon = host.lastIndexOf(":");
    if (lastColon === -1) return null;

    const ipv4 = parseIpv4(host.slice(lastColon + 1));
    if (!ipv4) return null;

    const high = ((ipv4[0] << 8) | ipv4[1]).toString(16);
    const low = ((ipv4[2] << 8) | ipv4[3]).toString(16);
    host = `${host.slice(0, lastColon)}:${high}:${low}`;
  }

  const halves = host.split("::");
  if (halves.length > 2) return null;

  const left = halves[0] ? halves[0].split(":") : [];
  const right = halves.length === 2 && halves[1] ? halves[1].split(":") : [];

  if (halves.length === 1 && left.length !== 8) return null;

  const missing = 8 - left.length - right.length;
  if (missing < 0 || (halves.length === 2 && missing < 1)) return null;

  const parts = [...left, ...Array(missing).fill("0"), ...right];
  if (parts.length !== 8) return null;

  const parsed = parts.map((part) => {
    if (!/^[0-9a-f]{1,4}$/i.test(part)) return Number.NaN;
    return Number.parseInt(part, 16);
  });

  return parsed.some(Number.isNaN) ? null : parsed;
}

function isBlockedIpv6(hostname: string): boolean {
  const groups = expandIpv6(hostname);

  // Fail closed for malformed IPv6-like hostnames.
  if (!groups) return true;

  const [first] = groups;

  const isUnspecified = groups.every((group) => group === 0);
  const isLoopback =
    groups.slice(0, 7).every((group) => group === 0) && groups[7] === 1;

  const isUniqueLocal = (first & 0xfe00) === 0xfc00;
  const isLinkLocal = (first & 0xffc0) === 0xfe80;
  const isDeprecatedSiteLocal = (first & 0xffc0) === 0xfec0;
  const isMulticast = (first & 0xff00) === 0xff00;

  const isIpv4Mapped =
    groups.slice(0, 5).every((group) => group === 0) &&
    groups[5] === 0xffff;

  if (isIpv4Mapped) {
    const embeddedIpv4 = [
      groups[6] >> 8,
      groups[6] & 0xff,
      groups[7] >> 8,
      groups[7] & 0xff,
    ];

    return isBlockedIpv4(embeddedIpv4);
  }

  return (
    isUnspecified ||
    isLoopback ||
    isUniqueLocal ||
    isLinkLocal ||
    isDeprecatedSiteLocal ||
    isMulticast
  );
}

export function isBlockedHostname(hostname: string): boolean {
  const host = stripIpv6Brackets(hostname);

  if (host === "localhost" || host === "0.0.0.0") return true;
  if (host.endsWith(".localhost") || host.endsWith(".local")) return true;

  const ipv4 = parseIpv4(host);
  if (ipv4) return isBlockedIpv4(ipv4);

  if (host.includes(":")) return isBlockedIpv6(host);

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
    throw new Error(
      "Blocked URL: local, private-network, and link-local targets are not allowed.",
    );
  }

  return parsed;
}

export async function resolveHostnameSafe(hostname: string): Promise<void> {
  if (isBlockedHostname(hostname)) {
    throw new Error(
      "Blocked URL: local, private-network, and link-local targets are not allowed.",
    );
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

        if (!location) {
          throw new Error("Redirect response missing Location header.");
        }

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