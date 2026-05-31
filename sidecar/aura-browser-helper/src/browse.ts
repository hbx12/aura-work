import type { BackendInfo } from "./backend.js";
import type { BrowseRequest, BrowseResult } from "./types.js";
import {
  extractLinks,
  extractTitle,
  formatCitation,
  htmlToText,
  sanitizeForModel,
  scanPromptInjection,
  truncateOutput,
} from "./sanitize.js";
import { getOrCreateProfile } from "./profiles.js";

function isBlockedHostname(hostname: string): boolean {
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

function assertSafeRemoteUrl(rawUrl: string): URL {
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

async function browseStatic(url: string, extract: string, timeoutMs: number): Promise<{ html: string; title: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    assertSafeRemoteUrl(url);
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Aura-Work-Browser/0.1 (local agent; untrusted fetch)",
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
      },
      redirect: "error",
    });
    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status} ${resp.statusText}`);
    }
    const html = await resp.text();
    const title = extractTitle(html) || url;
    if (extract === "title") {
      return { html: title, title };
    }
    return { html, title };
  } finally {
    clearTimeout(timer);
  }
}

async function browseChromium(
  backend: BackendInfo,
  projectId: string,
  url: string,
  extract: string,
  timeoutMs: number,
): Promise<{ html: string; title: string }> {
  assertSafeRemoteUrl(url);
  const profile = getOrCreateProfile(projectId);
  const puppeteer = await import("puppeteer-core");
  const browser = await puppeteer.default.launch({
    executablePath: backend.chromePath,
    headless: true,
    userDataDir: profile.profilePath,
    args: ["--disable-dev-shm-usage", "--disable-gpu"],
  });
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(timeoutMs);
    await page.setRequestInterception(true);
    page.on("request", (request) => {
      try {
        assertSafeRemoteUrl(request.url());
        void request.continue();
      } catch {
        void request.abort("blockedbyclient");
      }
    });
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: timeoutMs });
    const title = await page.title();
    if (extract === "title") return { html: title, title };
    return { html: await page.content(), title };
  } finally {
    await browser.close();
  }
}

export async function browsePage(backend: BackendInfo, req: BrowseRequest): Promise<BrowseResult> {
  const started = Date.now();
  const extract = req.extract ?? "text";
  const timeoutMs = req.timeoutMs ?? 30000;
  assertSafeRemoteUrl(req.url);
  getOrCreateProfile(req.projectId);

  let html: string;
  let title: string;
  let usedBackend = backend.id;
  try {
    if (backend.id === "chromium" && backend.chromePath) {
      ({ html, title } = await browseChromium(backend, req.projectId, req.url, extract, timeoutMs));
    } else {
      usedBackend = "static-fetch";
      ({ html, title } = await browseStatic(req.url, extract, timeoutMs));
    }
  } catch (e) {
    if (backend.id === "chromium") {
      usedBackend = "static-fetch";
      ({ html, title } = await browseStatic(req.url, extract, timeoutMs));
    } else {
      throw e;
    }
  }

  const fetchedAt = new Date().toISOString();
  const links = extractLinks(html, req.url);
  let rawText =
    extract === "links"
      ? links.map((l) => `${l.text}: ${l.href}`).join("\n")
      : extract === "title"
        ? title
        : htmlToText(html);

  const injectionWarnings = scanPromptInjection(rawText);
  rawText = sanitizeForModel(rawText, injectionWarnings);
  const { text, truncated } = truncateOutput(rawText);

  return {
    source: { url: req.url, title, fetchedAt },
    text,
    links,
    backend: usedBackend,
    durationMs: Date.now() - started,
    truncated,
    injectionWarnings,
    citation: formatCitation(req.url, title),
  };
}
