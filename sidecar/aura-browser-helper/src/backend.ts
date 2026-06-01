import { existsSync } from "node:fs";
import { platform } from "node:os";
import type { BrowserBackendId } from "./types.js";

export interface BackendInfo {
  id: BrowserBackendId;
  label: string;
  available: boolean;
  chromePath?: string;
  remediation?: string;
}

const CHROME_CANDIDATES: Record<string, string[]> = {
  win32: [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  ],
  darwin: [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
  ],
  linux: [
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/snap/bin/chromium",
  ],
};

function findChrome(): string | undefined {
  const candidates = CHROME_CANDIDATES[platform()] ?? CHROME_CANDIDATES.linux;
  return candidates.find((p) => existsSync(p));
}

export async function detectBackend(): Promise<BackendInfo> {
  const chromePath = findChrome();
  if (chromePath) {
    return {
      id: "chromium",
      label: `Chromium automation (${chromePath.split(/[/\\]/).pop()})`,
      available: true,
      chromePath,
    };
  }
  return {
    id: "static-fetch",
    label: "Static fetch (no Chromium — install Chrome for full automation)",
    available: true,
    remediation:
      "Install Google Chrome or Microsoft Edge for JavaScript-rendered pages. Static fetch works for simple HTML.",
  };
}
