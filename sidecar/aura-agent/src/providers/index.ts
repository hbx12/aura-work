import type { ModelInfo, ProviderId } from "@aura-os/shared";
import type { ProviderAdapter, ProviderCredentials, ChatRequest } from "../types.js";
import { codexChat, codexListModels, codexValidateCredentials, isCodexAccount } from "./codex.js";

const DEFAULT_MODELS: Record<ProviderId, ModelInfo[]> = {
  openai: [
    {
      id: "gpt-4o",
      providerId: "openai",
      displayName: "GPT-4o",
      capabilities: ["text", "vision", "tool-calling"],
    },
    {
      id: "gpt-4o-mini",
      providerId: "openai",
      displayName: "GPT-4o mini",
      capabilities: ["text", "tool-calling"],
    },
  ],
  anthropic: [
    {
      id: "claude-sonnet-4-20250514",
      providerId: "anthropic",
      displayName: "Claude Sonnet 4",
      capabilities: ["text", "vision", "tool-calling"],
    },
    {
      id: "claude-3-5-haiku-20241022",
      providerId: "anthropic",
      displayName: "Claude 3.5 Haiku",
      capabilities: ["text", "tool-calling"],
    },
  ],
  gemini: [
    {
      id: "gemini-2.0-flash",
      providerId: "gemini",
      displayName: "Gemini 2.0 Flash",
      capabilities: ["text", "vision"],
    },
  ],
  deepseek: [
    {
      id: "deepseek-chat",
      providerId: "deepseek",
      displayName: "DeepSeek V3",
      capabilities: ["text", "tool-calling"],
    },
  ],
  ollama: [
    {
      id: "llama3.2",
      providerId: "ollama",
      displayName: "Llama 3.2",
      capabilities: ["text"],
    },
  ],
  "openai-compatible": [],
  minimax: [
    {
      id: "abab6.5s-chat",
      providerId: "minimax",
      displayName: "Minimax abab6.5s",
      capabilities: ["text"],
    },
  ],
  qwen: [
    {
      id: "qwen-plus",
      providerId: "qwen",
      displayName: "Qwen Plus",
      capabilities: ["text"],
    },
  ],
  lmstudio: [],
};

function baseUrl(credentials: ProviderCredentials, fallback: string): string {
  return (credentials.baseUrl ?? fallback).replace(/\/$/, "");
}

function numberValue(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  }
  return undefined;
}

async function openAiListModels(
  credentials: ProviderCredentials,
  fallbackBase: string,
  providerId: ProviderId,
): Promise<ModelInfo[]> {
  const url = `${baseUrl(credentials, fallbackBase)}/models`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${credentials.apiKey ?? ""}` },
  });
  if (!res.ok) throw new Error(`Models request failed (${res.status})`);
  const data = (await res.json()) as { data?: { id: string }[] };
  return (data.data ?? []).map((m) => ({
    id: m.id,
    providerId,
    displayName: m.id,
    capabilities: ["text"],
  }));
}

function openAiAdapter(id: ProviderId, defaultBase: string): ProviderAdapter {
  return {
    id,
    async listModels(credentials: ProviderCredentials) {
      if (id === "openai" && isCodexAccount(credentials)) {
        return codexListModels(credentials);
      }
      if (id === "openai-compatible" && !credentials.baseUrl) {
        return DEFAULT_MODELS["openai-compatible"];
      }
      try {
        return await openAiListModels(credentials, defaultBase, id);
      } catch {
        return DEFAULT_MODELS[id === "openai-compatible" ? "openai" : id] ?? [];
      }
    },
    async validateCredentials(credentials: ProviderCredentials) {
      if (id === "openai" && isCodexAccount(credentials)) {
        return codexValidateCredentials(credentials);
      }
      if (!credentials.apiKey && id !== "ollama" && id !== "lmstudio") {
        return { valid: false, message: "API key is required." };
      }
      try {
        await openAiListModels(credentials, defaultBase, id);
        return { valid: true, message: "Credentials accepted." };
      } catch (e) {
        return { valid: false, message: String(e) };
      }
    },
    async chat(request: ChatRequest, credentials: ProviderCredentials) {
      if (id === "openai" && isCodexAccount(credentials)) {
        return codexChat(request, credentials);
      }
      const url = `${baseUrl(credentials, defaultBase)}/chat/completions`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${credentials.apiKey ?? ""}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: request.model,
          messages: request.messages,
          max_tokens: request.maxOutputTokens ?? 1024,
          temperature: request.temperature ?? 0.7,
        }),
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Chat failed (${res.status}): ${err.slice(0, 200)}`);
      }
      const data = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
        usage?: {
          prompt_tokens?: number;
          completion_tokens?: number;
          prompt_tokens_details?: { cached_tokens?: number };
          cache_read_input_tokens?: number;
          cache_creation_input_tokens?: number;
          cost?: number | string;
          total_cost?: number | string;
          estimated_cost_usd?: number | string;
        };
      };
      const text = data.choices?.[0]?.message?.content ?? "";
      return {
        text,
        usage: {
          inputTokens: data.usage?.prompt_tokens,
          outputTokens: data.usage?.completion_tokens,
          cacheReadTokens:
            data.usage?.prompt_tokens_details?.cached_tokens ??
            data.usage?.cache_read_input_tokens,
          cacheWriteTokens: data.usage?.cache_creation_input_tokens,
          estimatedCostUsd:
            numberValue(data.usage?.estimated_cost_usd) ??
            numberValue(data.usage?.total_cost) ??
            numberValue(data.usage?.cost),
        },
      };
    },
  };
}

const anthropicAdapter: ProviderAdapter = {
  id: "anthropic",
  async listModels(credentials: ProviderCredentials) {
    if (!credentials.apiKey) return DEFAULT_MODELS.anthropic;
    try {
      const res = await fetch("https://api.anthropic.com/v1/models", {
        headers: {
          "x-api-key": credentials.apiKey,
          "anthropic-version": "2023-06-01",
        },
      });
      if (!res.ok) return DEFAULT_MODELS.anthropic;
      const data = (await res.json()) as {
        data?: { id?: string; display_name?: string; displayName?: string; type?: string }[];
      };
      const models = (data.data ?? [])
        .filter((m) => typeof m.id === "string" && m.id.trim())
        .map((m) => ({
          id: m.id!,
          providerId: "anthropic" as ProviderId,
          displayName: m.display_name ?? m.displayName ?? m.id!,
          capabilities: ["text", "tool-calling"] as ModelInfo["capabilities"],
        }));
      return models.length ? models : DEFAULT_MODELS.anthropic;
    } catch {
      return DEFAULT_MODELS.anthropic;
    }
  },
  async validateCredentials(credentials: ProviderCredentials) {
    if (!credentials.apiKey) return { valid: false, message: "API key is required." };
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": credentials.apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 16,
        messages: [{ role: "user", content: "ping" }],
      }),
    });
    if (res.ok || res.status === 400) return { valid: true, message: "Credentials accepted." };
    return { valid: false, message: `Validation failed (${res.status})` };
  },
  async chat(request: ChatRequest, credentials: ProviderCredentials) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": credentials.apiKey ?? "",
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: request.model,
        max_tokens: request.maxOutputTokens ?? 1024,
        messages: request.messages.filter((m: { role: string }) => m.role !== "system"),
        system: request.messages.find((m: { role: string }) => m.role === "system")?.content,
      }),
    });
    if (!res.ok) throw new Error(`Anthropic chat failed (${res.status})`);
    const data = (await res.json()) as {
      content?: { text?: string }[];
      usage?: {
        input_tokens?: number;
        output_tokens?: number;
        cache_read_input_tokens?: number;
        cache_creation_input_tokens?: number;
      };
    };
    const text = data.content?.map((c) => c.text ?? "").join("") ?? "";
    return {
      text,
      usage: {
        inputTokens: data.usage?.input_tokens,
        outputTokens: data.usage?.output_tokens,
        cacheReadTokens: data.usage?.cache_read_input_tokens,
        cacheWriteTokens: data.usage?.cache_creation_input_tokens,
      },
    };
  },
};

const geminiAdapter: ProviderAdapter = {
  id: "gemini",
  async listModels(credentials: ProviderCredentials) {
    if (!credentials.apiKey) return DEFAULT_MODELS.gemini;
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${credentials.apiKey}`;
      const res = await fetch(url);
      if (!res.ok) return DEFAULT_MODELS.gemini;
      const data = (await res.json()) as {
        models?: {
          name?: string;
          baseModelId?: string;
          displayName?: string;
          supportedGenerationMethods?: string[];
        }[];
      };
      const models = (data.models ?? [])
        .filter((m) => (m.supportedGenerationMethods ?? []).includes("generateContent"))
        .map((m) => {
          const id = (m.baseModelId || m.name?.replace(/^models\//, "") || "").trim();
          return id
            ? {
                id,
                providerId: "gemini" as ProviderId,
                displayName: m.displayName ?? id,
                capabilities: ["text", "vision"] as ModelInfo["capabilities"],
              }
            : null;
        })
        .filter((m): m is ModelInfo => Boolean(m));
      return models.length ? models : DEFAULT_MODELS.gemini;
    } catch {
      return DEFAULT_MODELS.gemini;
    }
  },
  async validateCredentials(credentials: ProviderCredentials) {
    if (!credentials.apiKey) return { valid: false, message: "API key is required." };
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${credentials.apiKey}`;
    const res = await fetch(url);
    if (!res.ok) return { valid: false, message: `Validation failed (${res.status})` };
    return { valid: true, message: "Credentials accepted." };
  },
  async chat(request: ChatRequest, credentials: ProviderCredentials) {
    const model = request.model.startsWith("models/") ? request.model : `models/${request.model}`;
    const url = `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${credentials.apiKey ?? ""}`;

    const systemMessages = request.messages.filter((m: { role: string }) => m.role === "system");
    const chatMessages = request.messages.filter((m: { role: string }) => m.role !== "system");

    const systemInstruction = systemMessages.length > 0
      ? { parts: [{ text: systemMessages.map(m => m.content).join("\n\n") }] }
      : undefined;

    const contents: any[] = [];
    for (const m of chatMessages) {
      const role = m.role === "assistant" ? "model" : "user";
      const last = contents[contents.length - 1];
      if (last && last.role === role) {
        last.parts[0].text += "\n\n" + m.content;
      } else {
        contents.push({
          role,
          parts: [{ text: m.content }],
        });
      }
    }

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        ...(systemInstruction ? { systemInstruction } : {}),
      }),
    });
    if (!res.ok) throw new Error(`Gemini chat failed (${res.status})`);
    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
      usageMetadata?: {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
        cachedContentTokenCount?: number;
      };
    };
    const text =
      data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    return {
      text,
      usage: {
        inputTokens: data.usageMetadata?.promptTokenCount,
        outputTokens: data.usageMetadata?.candidatesTokenCount,
        cacheReadTokens: data.usageMetadata?.cachedContentTokenCount,
      },
    };
  },
};

const ollamaAdapter: ProviderAdapter = {
  id: "ollama",
  async listModels(credentials: ProviderCredentials) {
    const root = baseUrl(credentials, "http://127.0.0.1:11434");
    try {
      const res = await fetch(`${root}/api/tags`);
      if (!res.ok) return DEFAULT_MODELS.ollama;
      const data = (await res.json()) as { models?: { name: string }[] };
      return (data.models ?? []).map((m) => ({
        id: m.name.split(":")[0] ?? m.name,
        providerId: "ollama" as ProviderId,
        displayName: m.name,
        capabilities: ["text"],
      }));
    } catch {
      return DEFAULT_MODELS.ollama;
    }
  },
  async validateCredentials(credentials: ProviderCredentials) {
    const root = baseUrl(credentials, "http://127.0.0.1:11434");
    try {
      const res = await fetch(`${root}/api/tags`);
      if (!res.ok) return { valid: false, message: "Ollama is not reachable." };
      return { valid: true, message: "Ollama is running locally." };
    } catch {
      return { valid: false, message: "Ollama is not running on this device." };
    }
  },
  async chat(request: ChatRequest, credentials: ProviderCredentials) {
    const root = baseUrl(credentials, "http://127.0.0.1:11434");
    const res = await fetch(`${root}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: request.model,
        messages: request.messages,
        stream: false,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Ollama chat failed (${res.status}): ${err.slice(0, 200)}`);
    }
    const data = (await res.json()) as {
      message?: { content?: string };
      prompt_eval_count?: number;
      eval_count?: number;
    };
    return {
      text: data.message?.content ?? "",
      usage: {
        inputTokens: data.prompt_eval_count,
        outputTokens: data.eval_count,
      },
    };
  },
};

const adapters: Record<ProviderId, ProviderAdapter> = {
  openai: openAiAdapter("openai", "https://api.openai.com/v1"),
  anthropic: anthropicAdapter,
  gemini: geminiAdapter,
  deepseek: openAiAdapter("deepseek", "https://api.deepseek.com/v1"),
  ollama: ollamaAdapter,
  "openai-compatible": openAiAdapter("openai-compatible", "http://127.0.0.1:8080/v1"),
  minimax: openAiAdapter("minimax", "https://api.minimax.chat/v1"),
  qwen: openAiAdapter("qwen", "https://dashscope.aliyuncs.com/compatible-mode/v1"),
  lmstudio: openAiAdapter("lmstudio", "http://127.0.0.1:1234/v1"),
};

export function getAdapter(id: ProviderId): ProviderAdapter {
  return adapters[id];
}

export { DEFAULT_MODELS };
