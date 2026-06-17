import type { ProviderId } from "@aura-os/shared";

export const PROVIDER_OVERRIDES: Record<ProviderId, string> = {
  openai: `
[Provider: OpenAI]
- Use structured outputs when available.
- Prefer exact tool-call arguments and complete summaries.
- For long explanations, be thorough and organized rather than artificially brief.
`,
  anthropic: `
[Provider: Anthropic Claude]
- Use clear structure, explicit tool discipline, and concise reasoning summaries.
- Do not expose hidden chain-of-thought; summarize decisions and evidence instead.
- Use careful end-to-end implementation plans before acting.
`,
  gemini: `
[Provider: Google Gemini]
- Use explicit schemas and avoid ambiguous prose around JSON.
- Separate instructions, data, and output format clearly.
- Verify that the final response is directly actionable.
`,
  deepseek: `
[Provider: DeepSeek]
- Return ONLY raw JSON when a tool call or structured task response is required.
- Do not wrap JSON in markdown fences.
- Double-check brackets, quotes, arrays, and enum names before responding.
- If unsure, return a valid clarification JSON message instead of malformed tool JSON.
`,
  ollama: `
[Provider: Ollama Local]
- Keep the schema simple and direct.
- Prefer one or two tool calls per step.
- Inspect smaller file ranges and avoid huge multi-file edits in a single step.
`,
  "openai-compatible": `
[Provider: OpenAI-Compatible]
- Adhere strictly to the JSON schemas.
- Do not add commentary outside structured responses.
- Assume compatibility varies; keep tool arguments conservative and valid.
`,
  qwen: `
[Provider: Qwen]
- Stick to JSON format for tool calls.
- Verify brackets and quotes are properly matched.
- Prefer precise implementation details and avoid vague completion claims.
`,
  minimax: `
[Provider: Minimax]
- Output valid JSON structures for tool calls.
- Keep role and tool names exact.
`,
  lmstudio: `
[Provider: LM Studio Local]
- Use direct instructions and simple JSON.
- Prefer incremental inspection and edits.
- If the local model cannot satisfy structured output, return a structured clarification or status message.
`
};

export function getProviderOverride(providerId: string): string {
  const pid = providerId as ProviderId;
  return PROVIDER_OVERRIDES[pid] || "";
}
