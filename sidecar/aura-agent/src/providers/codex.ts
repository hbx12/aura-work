import type { ModelInfo } from "@aura-os/shared";
import type { ChatRequest, ProviderCredentials } from "../types.js";
import { extractAccountIdFromToken, refreshCodexAccessToken } from "./codex-oauth.js";

const CODEX_BASE = "https://chatgpt.com/backend-api/codex";
const CODEX_API = `${CODEX_BASE}/responses`;
const MODELS_DEV_URL = "https://models.dev/api.json";
/** Must match the upstream account API client version expected by the service. */
const CLIENT_VERSION = "1.0.0";

/** ChatGPT subscription model allow-list. */
const ALLOWED_MODELS = new Set([
  "gpt-5.5",
  "gpt-5.2",
  "gpt-5.3-codex",
  "gpt-5.3-codex-spark",
  "gpt-5.4",
  "gpt-5.4-mini",
]);

export interface CodexSession {
  credentials: ProviderCredentials;
  changed: boolean;
}

let modelsDevCache: { fetchedAt: number; catalog: ModelsDevCatalog } | null = null;
const MODELS_DEV_TTL_MS = 60 * 60 * 1000;

interface ModelsDevModel {
  name?: string;
  id?: string;
  api?: { id?: string };
  limit?: { context?: number; output?: number };
}

type ModelsDevCatalog = Record<string, ModelsDevModel>;

export function isCodexAccount(credentials: ProviderCredentials): boolean {
  return credentials.authMode === "codex-account" || credentials.authMode === "chatgpt";
}

function isAllowedCodexModel(id: string): boolean {
  if (ALLOWED_MODELS.has(id)) return true;
  const match = id.match(/^gpt-(\d+\.\d+)/);
  return match ? parseFloat(match[1]) > 5.4 : false;
}

function codexHeaders(credentials: ProviderCredentials): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${credentials.apiKey ?? ""}`,
    "Content-Type": "application/json",
    "User-Agent": `codex_cli_rs/${CLIENT_VERSION}`,
    Accept: "application/json",
    originator: "codex_cli_rs",
  };
  if (credentials.accountId) {
    headers["ChatGPT-Account-Id"] = credentials.accountId;
  }
  return headers;
}

export async function prepareCodexSession(credentials: ProviderCredentials): Promise<CodexSession> {
  let creds = { ...credentials };
  let changed = false;

  if (creds.refreshToken?.trim()) {
    try {
      const refreshed = await refreshCodexAccessToken(creds.refreshToken);
      creds = {
        ...creds,
        apiKey: refreshed.accessToken,
        refreshToken: refreshed.refreshToken,
        accountId: refreshed.accountId ?? creds.accountId,
      };
      changed = true;
    } catch {
      /* keep existing access token */
    }
  }

  if (!creds.accountId?.trim() && creds.apiKey?.trim()) {
    const accountId = extractAccountIdFromToken(creds.apiKey);
    if (accountId) {
      creds.accountId = accountId;
      changed = true;
    }
  }

  return { credentials: creds, changed };
}

async function fetchModelsDevCatalog(): Promise<ModelsDevCatalog> {
  const now = Date.now();
  if (modelsDevCache && now - modelsDevCache.fetchedAt < MODELS_DEV_TTL_MS) {
    return modelsDevCache.catalog;
  }

  const res = await fetch(MODELS_DEV_URL, { signal: AbortSignal.timeout(12_000) });
  if (!res.ok) {
    throw new Error(`Failed to fetch model catalog (${res.status})`);
  }

  const data = (await res.json()) as { openai?: { models?: ModelsDevCatalog } };
  const catalog = data.openai?.models ?? {};
  modelsDevCache = { fetchedAt: now, catalog };
  return catalog;
}

function modelsFromCatalog(catalog: ModelsDevCatalog): ModelInfo[] {
  const models: ModelInfo[] = [];
  for (const [modelKey, model] of Object.entries(catalog)) {
    const apiId = model.api?.id ?? model.id ?? modelKey;
    if (!isAllowedCodexModel(apiId)) continue;
    models.push({
      id: apiId,
      providerId: "openai",
      displayName: model.name ?? apiId,
      contextWindow: model.limit?.context,
      maxOutputTokens: model.limit?.output,
      capabilities: ["text", "tool-calling"],
    });
  }
  models.sort((a, b) => b.id.localeCompare(a.id, undefined, { numeric: true }));
  return models;
}

function codexUrl(path: string): string {
  const url = new URL(`${CODEX_BASE}/${path.replace(/^\//, "")}`);
  url.searchParams.set("client_version", CLIENT_VERSION);
  return url.toString();
}

async function verifyCodexToken(credentials: ProviderCredentials): Promise<void> {
  const res = await fetch(codexUrl("models"), { headers: codexHeaders(credentials) });
  if (res.status === 401 || res.status === 403) {
    throw new Error(`ChatGPT token rejected (${res.status}). Sign in again.`);
  }
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`ChatGPT account check failed (${res.status}): ${body.slice(0, 160)}`);
  }
}

export async function codexListModels(credentials: ProviderCredentials): Promise<ModelInfo[]> {
  const session = await prepareCodexSession(credentials);
  await verifyCodexToken(session.credentials);

  const catalog = await fetchModelsDevCatalog();
  const models = modelsFromCatalog(catalog);
  if (models.length === 0) {
    throw new Error("No ChatGPT subscription models found in catalog.");
  }
  return models;
}

export async function codexListModelsWithSession(credentials: ProviderCredentials): Promise<{
  models: ModelInfo[];
  updatedCredentials?: ProviderCredentials;
}> {
  const session = await prepareCodexSession(credentials);
  const models = await codexListModels(session.credentials);
  return {
    models,
    updatedCredentials: session.changed ? session.credentials : undefined,
  };
}

export async function codexValidateCredentials(credentials: ProviderCredentials) {
  if (!credentials.apiKey?.trim()) {
    return { valid: false, message: "ChatGPT access token missing.", updatedCredentials: undefined };
  }
  try {
    const { models, updatedCredentials } = await codexListModelsWithSession(credentials);
    const accountId = updatedCredentials?.accountId ?? credentials.accountId;
    return {
      valid: true,
      message: accountId
        ? `ChatGPT connected — ${models.length} model(s) available.`
        : `Token accepted — ${models.length} model(s).`,
      updatedCredentials,
    };
  } catch (e) {
    return { valid: false, message: String(e), updatedCredentials: undefined };
  }
}

function parseSseText(raw: string): string {
  let text = "";
  for (const line of raw.split("\n")) {
    if (!line.startsWith("data:")) continue;
    const payload = line.slice(5).trim();
    if (!payload || payload === "[DONE]") continue;
    try {
      const evt = JSON.parse(payload) as Record<string, unknown>;
      if (typeof evt.delta === "string") text += evt.delta;
      if (typeof evt.text === "string") text += evt.text;
      const response = evt.response as { output?: { content?: { text?: string }[] }[] } | undefined;
      const output = response?.output ?? (evt.output as typeof response extends undefined ? never : unknown);
      if (Array.isArray(output)) {
        for (const item of output) {
          const content = (item as { content?: { text?: string }[] }).content;
          if (Array.isArray(content)) {
            for (const c of content) {
              if (c.text) text += c.text;
            }
          }
        }
      }
      const type = evt.type as string | undefined;
      if (type?.includes("output_text") && typeof evt.delta === "string") {
        text += evt.delta;
      }
    } catch {
      /* ignore malformed chunks */
    }
  }
  return text;
}

function buildCodexInstructions(messages: ChatRequest["messages"]): string {
  const system = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n\n")
    .trim();
  if (system) return system;
  return `You are Aura Work, an autonomous coding agent.
NEVER paste full file contents in chat — use write_file tool JSON instead.
Keep conversational messages short (1-3 sentences).`;
}

export async function codexChat(request: ChatRequest, credentials: ProviderCredentials) {
  const session = await prepareCodexSession(credentials);
  const creds = session.credentials;
  const model = request.model || "gpt-5.5";
  const instructions = buildCodexInstructions(request.messages);
  const input = request.messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: [{ type: "input_text", text: m.content }],
    }));

  const res = await fetch(codexUrl("responses"), {
    method: "POST",
    headers: {
      ...codexHeaders(creds),
      Accept: "text/event-stream",
    },
    body: JSON.stringify({
      model,
      instructions,
      store: false,
      stream: true,
      input,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`ChatGPT request failed (${res.status}): ${err.slice(0, 300)}`);
  }

  if (request.onChunk && res.body) {
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let raw = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      raw += decoder.decode(value, { stream: true });
      const partial = parseSseText(raw);
      if (partial) request.onChunk(partial);
    }
    const text = parseSseText(raw);
    return {
      text: text || raw.slice(0, 2000),
      usage: {},
    };
  }

  const raw = await res.text();
  const text = parseSseText(raw);
  return {
    text: text || raw.slice(0, 2000),
    usage: {},
  };
}
