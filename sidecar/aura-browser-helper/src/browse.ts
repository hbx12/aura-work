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
import {
  assertSafeRemoteUrl,
  fetchSafe,
  resolveHostnameSafe,
  validateUrlForFetch,
} from "./url-guard.js";

async function browseStatic(url: string, extract: string, timeoutMs: number): Promise<{ html: string; title: string }> {
  const resp = await fetchSafe(url, {
    timeoutMs,
    headers: {
      "User-Agent": "Aura-Work-Browser/0.1 (local agent; untrusted fetch)",
      Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
    },
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
}

async function browseChromium(
  backend: BackendInfo,
  projectId: string,
  url: string,
  extract: string,
  timeoutMs: number,
): Promise<{ html: string; title: string }> {
  await validateUrlForFetch(url);
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
      void (async () => {
        try {
          await validateUrlForFetch(request.url());
          await request.continue();
        } catch {
          await request.abort("blockedbyclient");
        }
      })();
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
  await validateUrlForFetch(req.url);
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
  if (extract === "html") {
    return {
      source: { url: req.url, title, fetchedAt },
      text: html,
      links,
      backend: usedBackend,
      durationMs: Date.now() - started,
      truncated: false,
      injectionWarnings: [],
      citation: formatCitation(req.url, title),
    };
  }

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

export { assertSafeRemoteUrl, resolveHostnameSafe, validateUrlForFetch } from "./url-guard.js";
export { isBlockedHostname } from "./url-guard.js";
