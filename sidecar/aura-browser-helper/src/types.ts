export type BrowserBackendId = "chromium" | "static-fetch" | "none";

export type BrowserState = "stopped" | "starting" | "running" | "unavailable";

export interface BrowserProfile {
  projectId: string;
  profilePath: string;
  createdAt: string;
  lastUsedAt?: string;
}

export interface BrowserStatus {
  state: BrowserState;
  backend: BrowserBackendId;
  backendLabel: string;
  profiles: BrowserProfile[];
  startedAt?: string;
  lastError?: string;
  remediation?: string;
  running: boolean;
}

export interface BrowseRequest {
  projectId: string;
  url: string;
  extract?: "text" | "links" | "title" | "html";
  timeoutMs?: number;
}

export interface WebSource {
  url: string;
  title: string;
  fetchedAt: string;
}

export interface BrowseResult {
  source: WebSource;
  text: string;
  links: { href: string; text: string }[];
  backend: BrowserBackendId;
  durationMs: number;
  truncated: boolean;
  injectionWarnings: string[];
  citation: string;
}

export interface ProfileRequest {
  projectId: string;
}
