import type { ProviderId } from "@aura-os/shared";

export const PROVIDER_OVERRIDES: Record<ProviderId, string> = {
  openai: `
[Provider: OpenAI] Use structured outputs when available. Ensure tool calls use precise parameters.
`,
  anthropic: `
[Provider: Anthropic Claude] Leverage rich markdown structure and clear chain-of-thought inside tags when planning. Be highly precise.
`,
  gemini: `
[Provider: Google Gemini] Focus on explicit schema guidelines. Clearly separate role instructions from raw data block parameters.
`,
  deepseek: `
[Provider: DeepSeek] CRITICAL: You must return ONLY raw JSON, with no explanation or prose outside the JSON structure. Double check JSON syntax to avoid parsing failures.
`,
  ollama: `
[Provider: Ollama Local] Rely on direct, explicit instructions. Do not assume high capacity for nested planning.
`,
  "openai-compatible": `
[Provider: OpenAI-Compatible] Adhere strictly to the JSON schemas. Minimize trailing commentary.
`,
  qwen: `
[Provider: Qwen] Strictly stick to JSON format for tool calls. Verify brackets and quotes are properly matched.
`,
  minimax: `
[Provider: Minimax] Output valid JSON structures for tool calls.
`,
  lmstudio: `
[Provider: LM Studio Local] Rely on direct instructions. Ensure tool call JSON is simple and clean.
`
};

export function getProviderOverride(providerId: string): string {
  const pid = providerId as ProviderId;
  return PROVIDER_OVERRIDES[pid] || "";
}
