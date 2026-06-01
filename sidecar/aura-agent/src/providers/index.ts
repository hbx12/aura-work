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
};

function baseUrl(credentials: ProviderCredentials, fallback: string): string {
  return (credentials.baseUrl ?? fallback).replace(/\/$/, "");
}

async function openAiListModels(
  credentials: ProviderCredentials,
  fallbackBase: string,
): Promise<ModelInfo[]> {
  const url = `${baseUrl(credentials, fallbackBase)}/models`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${credentials.apiKey ?? ""}` },
  });
  if (!res.ok) throw new Error(`Models request failed (${res.status})`);
  const data = (await res.json()) as { data?: { id: string }[] };
  return (data.data ?? []).slice(0, 20).map((m) => ({
    id: m.id,
    providerId: "openai" as ProviderId,
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
        return await openAiListModels(credentials, defaultBase);
      } catch {
        return DEFAULT_MODELS[id === "openai-compatible" ? "openai" : id] ?? [];
      }
    },
    async validateCredentials(credentials: ProviderCredentials) {
      if (id === "openai" && isCodexAccount(credentials)) {
        return codexValidateCredentials(credentials);
      }
      if (!credentials.apiKey && id !== "ollama") {
        return { valid: false, message: "API key is required." };
      }
      try {
        await openAiListModels(credentials, defaultBase);
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
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      };
      const text = data.choices?.[0]?.message?.content ?? "";
      return {
        text,
        usage: {
          inputTokens: data.usage?.prompt_tokens,
          outputTokens: data.usage?.completion_tokens,
        },
      };
    },
  };
}

const anthropicAdapter: ProviderAdapter = {
  id: "anthropic",
  async listModels() {
    return DEFAULT_MODELS.anthropic;
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
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    const text = data.content?.map((c) => c.text ?? "").join("") ?? "";
    return {
      text,
      usage: {
        inputTokens: data.usage?.input_tokens,
        outputTokens: data.usage?.output_tokens,
      },
    };
  },
};

const geminiAdapter: ProviderAdapter = {
  id: "gemini",
  async listModels() {
    return DEFAULT_MODELS.gemini;
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
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: request.messages.map((m: { role: string; content: string }) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
      }),
    });
    if (!res.ok) throw new Error(`Gemini chat failed (${res.status})`);
    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
      usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
    };
    const text =
      data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    return {
      text,
      usage: {
        inputTokens: data.usageMetadata?.promptTokenCount,
        outputTokens: data.usageMetadata?.candidatesTokenCount,
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
};

export function getAdapter(id: ProviderId): ProviderAdapter {
  return adapters[id];
}

export { DEFAULT_MODELS };
