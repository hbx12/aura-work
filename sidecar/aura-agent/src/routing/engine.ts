import type { ProviderId, RoutingPolicy } from "@aura-os/shared";
import type { PricingRow, ProviderConfigRow, RouteRequestBody, RouteResponseBody } from "../types.js";
import { DEFAULT_MODELS } from "../providers/index.js";

const QUALITY_ORDER: Record<ProviderId, string[]> = {
  "aura-cloud": ["aura-coder", "aura-premium", "aura-fast"],
  anthropic: ["claude-sonnet-4-20250514", "claude-3-5-haiku-20241022"],
  openai: ["gpt-4o", "gpt-4o-mini"],
  gemini: ["gemini-2.0-flash", "gemini-1.5-pro"],
  deepseek: ["deepseek-chat", "deepseek-reasoner"],
  ollama: ["llama3.2", "llama3.1"],
  "openai-compatible": [],
  minimax: ["abab6.5s-chat", "abab6.5g-chat"],
  qwen: ["qwen-plus", "qwen-max", "qwen-turbo"],
  lmstudio: [],
};

function modelCost(pricing: PricingRow[], providerId: string, modelId: string): number {
  const row = pricing.find((p) => p.providerId === providerId && p.modelId === modelId);
  const input = row?.inputPerMillion ?? 999;
  const output = row?.outputPerMillion ?? 999;
  return input + output;
}

function pickModel(
  providerId: ProviderId,
  config: ProviderConfigRow | undefined,
  pricing: PricingRow[],
  policy: RoutingPolicy,
): string {
  if (config?.manualModel) return config.manualModel;
  if (config?.defaultModel) return config.defaultModel;
  const preferred = QUALITY_ORDER[providerId] ?? [];
  if (policy === "cost-first") {
    const candidates = pricing
      .filter((p) => p.providerId === providerId)
      .sort(
        (a, b) =>
          (a.inputPerMillion ?? 999) +
          (a.outputPerMillion ?? 999) -
          ((b.inputPerMillion ?? 999) + (b.outputPerMillion ?? 999)),
      );
    if (candidates[0]) return candidates[0].modelId;
  }
  if (preferred[0]) return preferred[0];
  return DEFAULT_MODELS[providerId][0]?.id ?? "default";
}

function providerPriority(policy: RoutingPolicy): ProviderId[] {
  switch (policy) {
    case "local-only":
      return ["ollama", "lmstudio"];
    case "privacy-first":
      return ["ollama", "lmstudio", "openai-compatible", "deepseek", "gemini", "openai", "anthropic", "qwen", "minimax", "aura-cloud"];
    case "cost-first":
      return ["deepseek", "gemini", "openai", "anthropic", "qwen", "minimax", "aura-cloud", "ollama", "lmstudio", "openai-compatible"];
    case "manual":
    case "quality-first":
    default:
      return ["aura-cloud", "anthropic", "openai", "gemini", "deepseek", "qwen", "minimax", "ollama", "lmstudio", "openai-compatible"];
  }
}

export function routeRequest(body: RouteRequestBody): RouteResponseBody {
  const policy = (body.policy || "quality-first") as RoutingPolicy;
  const allowed = new Set(body.context.allowedProviders);
  const failed = body.context.failedProvider ?? null;
  const configs = new Map(body.configs.map((c) => [c.providerId, c]));

  let order = providerPriority(policy).filter((p) => allowed.has(p));
  if (policy !== "local-only" && failed) {
    order = order.filter((p) => p !== failed);
  }

  if (order.length === 0) {
    throw new Error("No enabled providers available for routing.");
  }

  const primary = order[0]!;
  const modelId = pickModel(primary, configs.get(primary), body.pricing, policy);
  const requiresApproval = Boolean(failed && primary !== failed);

  return {
    providerId: primary,
    modelId,
    reason:
      policy === "local-only"
        ? "Local-only policy — routed to Ollama."
        : requiresApproval
          ? `Provider fallback from ${failed} to ${primary} requires approval.`
          : `${policy} policy — selected ${primary}/${modelId}.`,
    requiresApproval,
    fallbackFrom: requiresApproval ? failed : null,
  };
}

export function nextFallback(
  body: RouteRequestBody,
  failedProvider: ProviderId,
): RouteResponseBody {
  return routeRequest({
    ...body,
    context: { ...body.context, failedProvider },
  });
}
