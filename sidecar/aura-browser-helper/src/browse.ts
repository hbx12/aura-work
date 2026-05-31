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

async function browseStatic(url: string, extract: string, timeoutMs: number): Promise<{ html: string; title: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Aura-OS-Browser/0.5 (local agent; untrusted fetch)",
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
      },
      redirect: "follow",
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
  const profile = getOrCreateProfile(projectId);
  const puppeteer = await import("puppeteer-core");
  const browser = await puppeteer.default.launch({
    executablePath: backend.chromePath,
    headless: true,
    userDataDir: profile.profilePath,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
  });
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(timeoutMs);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: timeoutMs });
    const title = await page.title();
    if (extract === "title") {
      return { html: title, title };
    }
    const html = await page.content();
    return { html, title };
  } finally {
    await browser.close();
  }
}

export async function browsePage(backend: BackendInfo, req: BrowseRequest): Promise<BrowseResult> {
  const started = Date.now();
  const extract = req.extract ?? "text";
  const timeoutMs = req.timeoutMs ?? 30000;
  let parsed: URL;
  try {
    parsed = new URL(req.url);
  } catch {
    throw new Error(`Invalid URL: ${req.url}`);
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Only http and https URLs are allowed.");
  }

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
